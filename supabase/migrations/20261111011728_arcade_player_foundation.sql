-- Additive foundation: existing IDs, tokens, closets and scores remain intact.
alter table bba_private.players add column user_id uuid unique references auth.users(id) on delete set null;
alter table bba_private.players add column avatar jsonb not null default '{}';
alter table bba_private.players add column analytics_opt_in boolean not null default false;
alter table bba_private.players add column adult_confirmed_at timestamptz;
alter table bba_private.players add column preferences_at timestamptz;

create table bba_private.game_saves (
  pid text not null references bba_private.players(pid) on delete cascade,
  game text not null, data jsonb not null, revision integer not null default 1,
  updated_at timestamptz not null default now(), primary key(pid,game),
  check (jsonb_typeof(data)='object' and octet_length(data::text)<=65536)
);
create table bba_private.game_runs (
  id uuid primary key, pid text not null references bba_private.players(pid) on delete cascade,
  game text not null, started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(), ended_at timestamptz,
  active_seconds integer not null default 0, event_count integer not null default 0,
  build text not null default 'unknown', outcome text not null default 'open'
);
create index game_runs_player_time on bba_private.game_runs(pid,started_at desc);
create index game_runs_time on bba_private.game_runs(started_at);
create table bba_private.game_events (
  id uuid primary key, run_id uuid not null references bba_private.game_runs(id) on delete cascade,
  kind text not null, stage smallint, score bigint, detail text,
  received_at timestamptz not null default now()
);
create index game_events_run on bba_private.game_events(run_id,received_at);
create table bba_private.lobbies (
  code text primary key, host_pid text not null references bba_private.players(pid) on delete cascade,
  game text not null, created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '24 hours'
);
create index lobbies_host on bba_private.lobbies(host_pid);
create table bba_private.lobby_members (
  code text not null references bba_private.lobbies(code) on delete cascade,
  pid text not null references bba_private.players(pid) on delete cascade,
  last_seen_at timestamptz not null default now(), primary key(code,pid)
);
create index lobby_members_player on bba_private.lobby_members(pid);
alter table bba_private.game_saves enable row level security;
alter table bba_private.game_runs enable row level security;
alter table bba_private.game_events enable row level security;
alter table bba_private.lobbies enable row level security;
alter table bba_private.lobby_members enable row level security;
revoke all on bba_private.game_saves,bba_private.game_runs,bba_private.game_events,bba_private.lobbies,bba_private.lobby_members from anon,authenticated;

-- Only this internal boundary resolves identity. A linked account no longer accepts
-- its old guest secret. Auth.uid comes from the JWT verified by Supabase's gateway.
create or replace function bba_private.authorized_player(b jsonb)
returns bba_private.players language plpgsql security definer set search_path='' as $$
declare p bba_private.players;
begin
  if auth.uid() is not null then
    select * into p from bba_private.players where user_id=auth.uid() for update;
  elsif coalesce(b->>'pid','') ~ '^[a-f0-9]{16}$' and coalesce(b->>'key','') ~ '^[a-f0-9]{32}$' then
    select * into p from bba_private.players where pid=b->>'pid' and user_id is null
      and kh=encode(extensions.digest(b->>'key','sha256'),'hex') for update;
  end if;
  if p.pid is null then raise exception 'Sign in first' using errcode='28000'; end if;
  return p;
end; $$;
revoke all on function bba_private.authorized_player(jsonb) from public,anon,authenticated;

create or replace function bba_private.player_public(p bba_private.players)
returns jsonb language sql immutable set search_path='' as $$
select jsonb_build_object('name',p.name,'tokens',p.tokens,'earned',p.earned,'closet',p.closet,
  'badge',p.badge,'claims','[]'::jsonb,'avatar',p.avatar,'linked',p.user_id is not null,
  'analytics',p.analytics_opt_in,'adult',p.adult_confirmed_at is not null);
$$;

create or replace function bba_private.player_system(a text,b jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p bba_private.players; uid uuid:=auth.uid(); gid text:=b->>'game'; nam text;
  saved bba_private.game_saves; run bba_private.game_runs; room bba_private.lobbies;
  result jsonb; ev jsonb; n integer:=0; delta integer; rid uuid; invite_code text; newpid text;
begin
  if octet_length(b::text)>131072 then raise exception 'Request too large'; end if;
  if a='dashboard' then
    if uid is null or not bba_private.is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
    select jsonb_build_object(
      'players',(select count(*) from bba_private.players),
      'linked',(select count(*) from bba_private.players where user_id is not null),
      'opted_in',(select count(*) from bba_private.players where analytics_opt_in),
      'saves',(select count(*) from bba_private.game_saves),
      'lobbies',(select count(*) from bba_private.lobbies where expires_at>now()),
      'games',coalesce((select jsonb_agg(q) from (
        select game,count(*) as launches,count(distinct pid) as players,
          sum(active_seconds) as active_seconds,count(*) filter(where ended_at is not null) as closed
        from bba_private.game_runs where started_at>now()-interval '30 days' group by game order by count(*) desc)q),'[]'),
      'events',coalesce((select jsonb_agg(q) from (
        select r.game,e.kind,e.stage,count(*) as total from bba_private.game_events e
        join bba_private.game_runs r on r.id=e.run_id where e.received_at>now()-interval '30 days'
        group by r.game,e.kind,e.stage order by count(*) desc limit 100)q),'[]')
    ) into result;
    return result;
  end if;
  if a='account' then
    if uid is null or not exists(select 1 from auth.users where id=uid and not is_anonymous) then
      raise exception 'A verified account is required' using errcode='28000';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
    select * into p from bba_private.players where user_id=uid for update;
    if p.pid is null then
      if b->>'adult' is distinct from 'true' then raise exception 'Adult account setup is required'; end if;
      -- Explicit claim: never match accounts by name, email, or editable metadata.
      if b->>'claim_guest'='true' then
        select * into p from bba_private.players where pid=b->>'pid' and user_id is null
          and kh=encode(extensions.digest(coalesce(b->>'key',''),'sha256'),'hex') for update;
        if p.pid is null then raise exception 'That guest profile could not be linked'; end if;
        update bba_private.players set user_id=uid,kh=encode(extensions.gen_random_bytes(32),'hex'),
          adult_confirmed_at=now(),preferences_at=now() where pid=p.pid returning * into p;
      else
        nam:=left(trim(regexp_replace(coalesce(b->>'name','Player'),'[^A-Za-z0-9 _-]','','g')),16);
        if length(nam)<2 then raise exception 'Choose a nickname of 2–16 characters'; end if;
        newpid:=encode(extensions.gen_random_bytes(8),'hex');
        insert into bba_private.players(pid,kh,name,user_id,adult_confirmed_at,preferences_at)
          values(newpid,encode(extensions.gen_random_bytes(32),'hex'),nam,uid,now(),now()) returning * into p;
      end if;
    end if;
    return jsonb_build_object('pid',p.pid,'player',bba_private.player_public(p),'owner',bba_private.is_owner());
  end if;
  p:=bba_private.authorized_player(b);
  if a='avatar' then
    result:='{}';
    for nam,n in select * from (values('skin',4),('hair',4),('hc',5),('shirt',7),('shades',1))v(k,m) loop
      result:=result||jsonb_build_object(nam,greatest(0,least(n,coalesce((b->'av'->>nam)::int,0))));
    end loop;
    update bba_private.players set avatar=result where pid=p.pid returning * into p;
    return jsonb_build_object('player',bba_private.player_public(p));
  end if;
  if uid is null or p.adult_confirmed_at is null then raise exception 'Connect an adult account for this feature' using errcode='42501'; end if;
  if a='preferences' then
    update bba_private.players set analytics_opt_in=coalesce(b->>'analytics'='true',false),preferences_at=now()
      where pid=p.pid returning * into p;
    if not p.analytics_opt_in then delete from bba_private.game_runs where pid=p.pid; end if;
    return jsonb_build_object('player',bba_private.player_public(p));
  elsif a='export' then
    return jsonb_build_object('profile',bba_private.player_public(p),
      'saves',coalesce((select jsonb_agg(to_jsonb(s)-'pid') from bba_private.game_saves s where pid=p.pid),'[]'),
      'scores',coalesce((select jsonb_agg(jsonb_build_object('game',game,'score',score)) from bba_private.scores where pid=p.pid),'[]'),
      'runs',coalesce((select jsonb_agg(to_jsonb(r)-'pid') from bba_private.game_runs r where pid=p.pid),'[]'),
      'events',coalesce((select jsonb_agg(to_jsonb(e)) from bba_private.game_events e join bba_private.game_runs r on r.id=e.run_id where r.pid=p.pid),'[]'));
  elsif a='erase_activity' then
    delete from bba_private.game_runs where pid=p.pid;
    update bba_private.players set analytics_opt_in=false,preferences_at=now() where pid=p.pid returning * into p;
    return jsonb_build_object('player',bba_private.player_public(p));
  end if;
  if a like 'save_%' or a='run_start' or a='lobby_create' then
    if not exists(select 1 from public.bba_content c,jsonb_array_elements(c.content->'games') g
      where c.id='published' and g->>'id'=gid and g->>'status'<>'hidden') then raise exception 'Unknown game'; end if;
  end if;
  if a='save_get' then
    select * into saved from bba_private.game_saves where pid=p.pid and game=gid;
    return jsonb_build_object('save',case when saved.pid is null then null else to_jsonb(saved)-'pid' end);
  elsif a='save_put' then
    if gid<>'blankman' then raise exception 'Cloud saves are not enabled for this game yet'; end if;
    if jsonb_typeof(b->'data') is distinct from 'object' or octet_length((b->'data')::text)>65536 then raise exception 'Invalid save'; end if;
    if jsonb_typeof(b->'data'->'cleared') is distinct from 'array'
      or coalesce((b->'data'->>'stage')::int,-1) not between 0 and 7
      or coalesce((b->'data'->>'unlocked')::int,-1) not between 0 and 7
      or coalesce((b->'data'->>'score')::bigint,-1) not between 0 and 1000000000
      or coalesce((b->'data'->>'best')::bigint,-1) not between 0 and 1000000000 then raise exception 'Invalid Blankman save'; end if;
    if jsonb_array_length(b->'data'->'cleared')>8 or exists(select 1 from jsonb_array_elements(b->'data'->'cleared')v where (v::text)::int not between 0 and 7) then raise exception 'Invalid stages'; end if;
    b:=jsonb_set(b,'{data}',jsonb_build_object('stage',(b->'data'->>'stage')::int,'unlocked',(b->'data'->>'unlocked')::int,
      'score',(b->'data'->>'score')::bigint,'best',(b->'data'->>'best')::bigint,'cleared',b->'data'->'cleared'));
    select * into saved from bba_private.game_saves where pid=p.pid and game=gid for update;
    if coalesce(saved.revision,0) is distinct from (b->>'revision')::integer then raise exception 'Cloud save changed. Reload before saving.' using errcode='40001'; end if;
    insert into bba_private.game_saves(pid,game,data,revision) values(p.pid,gid,b->'data',1)
      on conflict(pid,game) do update set data=excluded.data,revision=game_saves.revision+1,updated_at=now()
      returning * into saved;
    return jsonb_build_object('save',to_jsonb(saved)-'pid');
  elsif a='run_start' then
    if not p.analytics_opt_in then return jsonb_build_object('disabled',true); end if;
    rid:=(b->>'id')::uuid;
    select * into run from bba_private.game_runs where id=rid;
    if run.id is not null then
      if run.pid<>p.pid or run.game<>gid then raise exception 'Run belongs to another player' using errcode='42501'; end if;
      return jsonb_build_object('id',run.id);
    end if;
    if (select count(*) from bba_private.game_runs where pid=p.pid and started_at>now()-interval '1 day')>=100 then raise exception 'Daily session limit reached'; end if;
    insert into bba_private.game_runs(id,pid,game,build) values(rid,p.pid,gid,left(regexp_replace(coalesce(b->>'build','unknown'),'[^A-Za-z0-9._-]','','g'),32));
    return jsonb_build_object('id',rid);
  elsif a='run_events' or a='run_end' then
    if not p.analytics_opt_in then return jsonb_build_object('disabled',true); end if;
    select * into run from bba_private.game_runs where id=(b->>'id')::uuid and pid=p.pid for update;
    if run.id is null then raise exception 'Unknown run' using errcode='42501'; end if;
    if run.ended_at is not null then return jsonb_build_object('ok',true); end if;
    if run.started_at<now()-interval '8 hours' then raise exception 'Run expired'; end if;
    if a='run_events' then
      if jsonb_typeof(b->'events') is distinct from 'array' or jsonb_array_length(b->'events')>30 then raise exception 'Event batch too large'; end if;
      if (select count(*) from bba_private.game_events where run_id=run.id and received_at>now()-interval '1 minute')+jsonb_array_length(b->'events')>120
        or run.event_count+jsonb_array_length(b->'events')>2000 then raise exception 'Event limit reached'; end if;
      for ev in select value from jsonb_array_elements(b->'events') loop
        if coalesce(ev->>'kind','') not in ('game_ready','level_start','level_complete','game_over','victory','pause','resume','equipment_change','assist','death','score_reported','load_failed') then raise exception 'Unsupported event'; end if;
        if ev->>'detail' is not null and ev->>'detail' not in ('playing','paused','intro','clear','victory','gameover','base','armor','cloak','fists','plunger','nunchucks','story','arcade') then raise exception 'Unsupported detail'; end if;
        insert into bba_private.game_events(id,run_id,kind,stage,score,detail)
          values((ev->>'id')::uuid,run.id,ev->>'kind',case when ev ? 'stage' then greatest(0,least(99,(ev->>'stage')::int)) end,case when ev ? 'score' then greatest(0,least(1000000000,(ev->>'score')::bigint)) end,ev->>'detail')
          on conflict(id) do nothing;
        get diagnostics delta=row_count; n:=n+delta;
      end loop;
    end if;
    delta:=case when b->>'active'='true' then greatest(0,least(30,floor(extract(epoch from(now()-run.last_seen_at)))::int)) else 0 end;
    update bba_private.game_runs set active_seconds=active_seconds+delta,event_count=event_count+n,last_seen_at=now(),
      ended_at=case when a='run_end' then now() else null end,outcome=case when a='run_end' then 'closed' else outcome end where id=run.id;
    return jsonb_build_object('ok',true,'accepted',n);
  elsif a='lobby_create' then
    if (select count(*) from bba_private.lobbies where host_pid=p.pid and expires_at>now())>=3 then raise exception 'You already have three open lobbies'; end if;
    invite_code:=upper(encode(extensions.gen_random_bytes(6),'hex'));
    insert into bba_private.lobbies(code,host_pid,game) values(invite_code,p.pid,gid) returning * into room;
    insert into bba_private.lobby_members(code,pid) values(invite_code,p.pid);
  elsif a in ('lobby_join','lobby_get','lobby_leave') then
    invite_code:=upper(coalesce(b->>'code',''));
    select * into room from bba_private.lobbies where lobbies.code=invite_code and expires_at>now() for update;
    if room.code is null then raise exception 'Lobby is unavailable or expired'; end if;
    if a='lobby_join' then
      if not exists(select 1 from bba_private.lobby_members m where m.code=room.code and m.pid=p.pid)
        and (select count(*) from bba_private.lobby_members m where m.code=room.code and last_seen_at>now()-interval '2 minutes')>=8 then raise exception 'Lobby is full'; end if;
      delete from bba_private.lobby_members m where m.code=room.code and last_seen_at<now()-interval '2 minutes';
      insert into bba_private.lobby_members(code,pid) values(room.code,p.pid) on conflict(code,pid) do update set last_seen_at=now();
    elsif a='lobby_leave' then
      delete from bba_private.lobby_members m where m.code=room.code and m.pid=p.pid;
      if room.host_pid=p.pid then delete from bba_private.lobbies l where l.code=room.code; end if;
      return jsonb_build_object('ok',true);
    elsif not exists(select 1 from bba_private.lobby_members m where m.code=room.code and m.pid=p.pid) then raise exception 'Join the lobby first' using errcode='42501';
    else update bba_private.lobby_members m set last_seen_at=now() where m.code=room.code and m.pid=p.pid;
    end if;
  else raise exception 'Unknown player action'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('name',q.name,'host',q.pid=room.host_pid)),'[]') into result
    from bba_private.lobby_members m join bba_private.players q on q.pid=m.pid where m.code=room.code and m.last_seen_at>now()-interval '2 minutes';
  return jsonb_build_object('code',room.code,'game',room.game,'expires',room.expires_at,'members',result);
end; $$;
revoke all on function bba_private.player_system(text,jsonb) from public;
grant execute on function bba_private.player_system(text,jsonb) to authenticated,anon;
create function public.bba_player(p_action text,p_body jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select bba_private.player_system(p_action,p_body);$$;
revoke all on function public.bba_player(text,jsonb) from public;
grant execute on function public.bba_player(text,jsonb) to anon,authenticated;

-- Bounded retention applies only to the new optional activity and temporary lobbies.
create extension if not exists pg_cron;
select cron.schedule('bba-player-retention','23 5 * * *',$job$
  delete from bba_private.game_runs where started_at<now()-interval '90 days';
  delete from bba_private.lobbies where expires_at<now();
$job$);
CREATE OR REPLACE FUNCTION bba_private.arcade(p_action text, p_body jsonb, p_game text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 #variable_conflict use_column
 declare p bba_private.players; c jsonb; prize jsonb; item jsonb; pid text; k text; nam text; gid text; why text; tag text; gain integer:=0; scr bigint; prior bigint:=0; msg text; result jsonb; badge_icon text;
 begin
 select content into c from public.bba_content where id='published';
 gid:=coalesce(p_body->>'game',p_game);
 if p_action='avatar' then return bba_private.player_system('avatar',p_body);end if;
 if p_action='join' then
  nam:=left(trim(regexp_replace(coalesce(p_body->>'name',''),'[^A-Za-z0-9 _-]','','g')),16);if length(nam)<2 then raise exception 'Pick a player name (2-16 letters or numbers)';end if;
  pid:=encode(extensions.gen_random_bytes(8),'hex');k:=encode(extensions.gen_random_bytes(16),'hex');
  insert into bba_private.players(pid,kh,name) values(pid,encode(extensions.digest(k,'sha256'),'hex'),nam) returning * into p;
  return jsonb_build_object('pid',pid,'key',k,'player',bba_private.player_public(p));
 end if;
 if p_action='board' then
  if gid='all' or gid is null then
   select coalesce(jsonb_agg(q),'[]') into result from(select name,'' as badge,earned as score from bba_private.players where earned>0 order by earned desc limit 20)q;
  else
   select coalesce(jsonb_agg(q),'[]') into result from(select p.name,'' as badge,s.score from bba_private.scores s join bba_private.players p using(pid) where s.game=gid order by s.score desc limit 20)q;
  end if;return jsonb_build_object('rows',result);
 end if;
 if p_action='comments' then
  select coalesce(jsonb_agg(q),'[]') into result from(select p.name,'' as badge,m.body as text,(extract(epoch from m.created_at)*1000)::bigint as ts from bba_private.comments m join bba_private.players p using(pid) where m.game=gid order by m.created_at desc limit 50)q;
  return jsonb_build_object('rows',result);
 end if;
 p:=bba_private.authorized_player(p_body);
 if p.day<>current_date then p.day:=current_date;p.did:='{}';end if;
 if p_action='earn' then
  why:=p_body->>'why';tag:=why;
  if why in ('play','trailer','score') then
   if not exists(select 1 from jsonb_array_elements(c->'games')g where g->>'id'=gid and g->>'status'<>'hidden') then raise exception 'Unknown game';end if;tag:=why||':'||gid;
  end if;
  if why='score' then
   scr:=greatest(0,least(1000000000,(p_body->>'score')::bigint));
   select score into prior from bba_private.scores where scores.pid=p.pid and game=gid;prior:=coalesce(prior,0);
   -- Only improvements earn score tokens, bounded to 200 per day.
   gain:=greatest(0,least(200-coalesce((p.did->>'scoreTok')::int,0),50,((scr-prior)/100)::int));
   p.did:=jsonb_set(p.did,'{scoreTok}',to_jsonb(coalesce((p.did->>'scoreTok')::int,0)+gain));
   insert into bba_private.scores(pid,game,score)values(p.pid,gid,scr)on conflict(pid,game)do update set score=greatest(bba_private.scores.score,excluded.score);
  elsif not coalesce((p.did->>tag)::boolean,false) then
   gain:=case why when 'daily' then 25 when 'play' then 5 when 'trailer' then 3 when 'song' then 1 else 0 end;
   if gain>0 then p.did:=jsonb_set(p.did,array[tag],'true'::jsonb);end if;
  end if;
  p.tokens:=p.tokens+gain;p.earned:=p.earned+gain;
 elsif p_action='buy' then
  select value into prize from jsonb_array_elements(c->'prizes')where value->>'id'=p_body->>'id';
  if prize is null or coalesce((prize->>'real')::boolean,false) or not coalesce((prize->>'visible')::boolean,true) then raise exception 'That prize is not available';end if;
  if p.closet ? (prize->>'id') then raise exception 'Already in your closet';end if;
  if p.tokens<(prize->>'cost')::int then raise exception 'Not enough tokens yet';end if;
  p.tokens:=p.tokens-(prize->>'cost')::int;p.closet:=p.closet||jsonb_build_array(prize->>'id');
 elsif p_action='badge' then
  if coalesce(p_body->>'id','')<>'' and not (p.closet ? (p_body->>'id')) then raise exception 'Win it first';end if;p.badge:=coalesce(p_body->>'id','');
 elsif p_action='comment' then
  if not exists(select 1 from jsonb_array_elements(c->'games')g where g->>'id'=gid and g->>'status'<>'hidden')then raise exception 'Unknown game';end if;
  if p.last_comment>now()-interval '15 seconds' then raise exception 'Slow down a second';end if;
  msg:=left(trim(regexp_replace(coalesce(p_body->>'text',''),'\s+',' ','g')),280);if msg='' then raise exception 'Write something first';end if;
  insert into bba_private.comments(pid,game,body)values(p.pid,gid,msg);p.last_comment:=now();
 elsif p_action<>'me' then raise exception 'Unknown action';end if;
 update bba_private.players set tokens=p.tokens,earned=p.earned,closet=p.closet,badge=p.badge,day=p.day,did=p.did,last_comment=p.last_comment where players.pid=p.pid;
 return jsonb_build_object('player',bba_private.player_public(p),'gained',gain,'ok',true);
 end;$function$
