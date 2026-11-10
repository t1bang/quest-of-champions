-- Big Bang Arcade adds isolated tables; existing T1 game tables remain untouched.
create schema if not exists bba_private;
revoke all on schema bba_private from public;
grant usage on schema bba_private to anon, authenticated;
create function bba_private.is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from t1_private.control_owners where user_id=auth.uid());
$$;
revoke all on function bba_private.is_owner() from public;
grant execute on function bba_private.is_owner() to anon,authenticated;
create function public.bba_is_owner() returns boolean language sql stable security invoker set search_path='' as $$select bba_private.is_owner();$$;
revoke all on function public.bba_is_owner() from public;
grant execute on function public.bba_is_owner() to anon,authenticated;

create table public.bba_content(id text primary key check(id in ('draft','published')),revision integer not null default 1,content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<250000),updated_at timestamptz not null default now());
alter table public.bba_content enable row level security;
revoke all on public.bba_content from anon,authenticated;
grant select on public.bba_content to anon,authenticated;
create policy bba_content_read on public.bba_content for select to anon,authenticated using(id='published' or (select bba_private.is_owner()));
create table public.bba_content_history(revision integer primary key,content jsonb not null,created_at timestamptz not null default now(),created_by uuid);
alter table public.bba_content_history enable row level security;
revoke all on public.bba_content_history from anon,authenticated;
grant select on public.bba_content_history to authenticated;
create policy bba_history_owner on public.bba_content_history for select to authenticated using((select bba_private.is_owner()));
create function bba_private.save_content(p_content jsonb,p_expected integer,p_publish boolean) returns jsonb language plpgsql security definer set search_path='' as $$
 declare current_revision integer; next_revision integer; g jsonb; slots text[]:=array[]::text[]; slot text;
 begin
 if not bba_private.is_owner() then raise exception 'Owner access required' using errcode='42501';end if;
 select revision into current_revision from public.bba_content where id='draft' for update;
 if current_revision is distinct from p_expected then raise exception 'The draft changed in another window. Reload before saving.' using errcode='40001';end if;
 if jsonb_typeof(p_content->'games') is distinct from 'array' or jsonb_typeof(p_content->'prizes') is distinct from 'array' or jsonb_typeof(p_content->'wall') is distinct from 'object' then raise exception 'Invalid arcade layout';end if;
 if jsonb_array_length(p_content->'games')>40 or jsonb_array_length(p_content->'prizes')>60 then raise exception 'Layout limit exceeded';end if;
 for g in select value from jsonb_array_elements(p_content->'games') loop
  if coalesce(g->>'id','') !~ '^[a-z][a-z0-9-]{1,47}$' or coalesce(g->>'room','') not in ('main','lab','lounge','gallery') or (g->>'slot')::int not between 0 and 11 then raise exception 'Invalid cabinet';end if;
  slot:=(g->>'room')||':'||(g->>'slot');if g->>'status'<>'hidden' then if slot=any(slots) then raise exception 'Cabinet slots overlap';end if;slots:=array_append(slots,slot);end if;
 end loop;
 next_revision:=current_revision+1;
 update public.bba_content set content=p_content,revision=next_revision,updated_at=now() where id='draft';
 if p_publish then
  insert into public.bba_content_history(revision,content,created_by) select revision,content,auth.uid() from public.bba_content where id='published' on conflict do nothing;
  update public.bba_content set content=p_content,revision=next_revision,updated_at=now() where id='published';
 end if;
 return jsonb_build_object('revision',next_revision,'published',p_publish);
 end;$$;
revoke all on function bba_private.save_content(jsonb,integer,boolean) from public;
grant execute on function bba_private.save_content(jsonb,integer,boolean) to authenticated;
create function public.bba_save_content(p_content jsonb,p_expected integer,p_publish boolean default false) returns jsonb language sql security invoker set search_path='' as $$select bba_private.save_content(p_content,p_expected,p_publish);$$;
revoke all on function public.bba_save_content(jsonb,integer,boolean) from public;
grant execute on function public.bba_save_content(jsonb,integer,boolean) to authenticated;

-- Storage creates/replaces objects through its API; policies only allow the two existing owners.
create policy bba_bucket_create on storage.buckets for insert to authenticated with check(id='bba-assets' and (select bba_private.is_owner()));
create policy bba_bucket_read on storage.buckets for select to authenticated using(id='bba-assets' and (select bba_private.is_owner()));
create policy bba_assets_insert on storage.objects for insert to authenticated with check(bucket_id='bba-assets' and (select bba_private.is_owner()) and storage.extension(name) in ('png','jpg','jpeg','webp','glb'));
create policy bba_assets_read on storage.objects for select to authenticated using(bucket_id='bba-assets' and (select bba_private.is_owner()));
create policy bba_assets_update on storage.objects for update to authenticated using(bucket_id='bba-assets' and (select bba_private.is_owner())) with check(bucket_id='bba-assets' and (select bba_private.is_owner()));
create policy bba_assets_delete on storage.objects for delete to authenticated using(bucket_id='bba-assets' and (select bba_private.is_owner()));

create table bba_private.players(pid text primary key,kh text not null,name text not null,tokens integer not null default 0 check(tokens>=0),earned integer not null default 0,closet jsonb not null default '[]',badge text not null default '',day date not null default current_date,did jsonb not null default '{}',last_comment timestamptz);
create table bba_private.scores(pid text not null references bba_private.players,game text not null,score bigint not null,primary key(pid,game));
create index bba_scores_rank on bba_private.scores(game,score desc);
create table bba_private.comments(id bigint generated always as identity primary key,pid text not null references bba_private.players,game text not null,body text not null,created_at timestamptz not null default now());
create index bba_comments_recent on bba_private.comments(game,created_at desc);
alter table bba_private.players enable row level security;alter table bba_private.scores enable row level security;alter table bba_private.comments enable row level security;
revoke all on all tables in schema bba_private from public,anon,authenticated;
create function bba_private.player_public(p bba_private.players) returns jsonb language sql immutable security invoker set search_path='' as $$select jsonb_build_object('name',p.name,'tokens',p.tokens,'earned',p.earned,'closet',p.closet,'badge',p.badge,'claims','[]'::jsonb);$$;
revoke all on function bba_private.player_public(bba_private.players) from public;

create function bba_private.arcade(p_action text,p_body jsonb,p_game text) returns jsonb language plpgsql security definer set search_path='' as $$
 #variable_conflict use_column
 declare p bba_private.players; c jsonb; prize jsonb; item jsonb; pid text; k text; nam text; gid text; why text; tag text; gain integer:=0; scr bigint; prior bigint:=0; msg text; result jsonb; badge_icon text;
 begin
 select content into c from public.bba_content where id='published';
 gid:=coalesce(p_body->>'game',p_game);
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
 if coalesce(p_body->>'pid','') !~ '^[a-f0-9]{16}$' or coalesce(p_body->>'key','') !~ '^[a-f0-9]{32}$' then raise exception 'Sign in first' using errcode='28000';end if;
 select * into p from bba_private.players where players.pid=p_body->>'pid' for update;
 if p.pid is null or p.kh<>encode(extensions.digest(p_body->>'key','sha256'),'hex') then raise exception 'Sign in first' using errcode='28000';end if;
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
 end;$$;
revoke all on function bba_private.arcade(text,jsonb,text) from public;
grant execute on function bba_private.arcade(text,jsonb,text) to anon,authenticated;
create function public.bba_arcade(p_action text,p_body jsonb default '{}',p_game text default null) returns jsonb language sql security invoker set search_path='' as $$select bba_private.arcade(p_action,p_body,p_game);$$;
revoke all on function public.bba_arcade(text,jsonb,text) from public;
grant execute on function public.bba_arcade(text,jsonb,text) to anon,authenticated;

insert into public.bba_content(id,content) values ('draft',$seed${"version":1,"games":[{"id":"quest","title":"Quest of Champions","genre":"Action","color":"#ff2a3c","trim":"#ff2a3c","blurb":"Grab the mic, collect the records and fight your way to the ring. The main event.","play":"games/quest-of-champions/","trailer":"","art":"assets/qoc-title.jpg","poster":"assets/qoc-play.jpg","cab":"","shots":["assets/qoc-title.jpg","assets/qoc-play.jpg"],"room":"main","slot":0,"status":"playable"},{"id":"vendetta","title":"T1 Vs.","genre":"Fighting","color":"#ffb400","trim":"#d2142a","blurb":"Settle the score. One on one, round after round.","play":"https://t1game.chucksi.com","trailer":"","art":"assets/cabs/versus-cabinet.jpg","poster":"","cab":"assets/cabs/versus","shots":["assets/cabs/versus-screen.jpg","assets/cabs/versus-cabinet.jpg"],"room":"main","slot":1,"status":"playable"},{"id":"guerilla","title":"Gorilla City 2032","genre":"Open World","color":"#35e06f","trim":"#16a08e","blurb":"The whole city is yours. Go anywhere, run everything.","play":"","trailer":"","art":"assets/cabs/gorilla-cabinet.jpg","poster":"","cab":"assets/cabs/gorilla","shots":["assets/cabs/gorilla-screen.jpg","assets/cabs/gorilla-cabinet.jpg"],"room":"main","slot":2,"status":"coming-soon"},{"id":"gamerboy","title":"GAMEBBOY","genre":"Adventure","color":"#3ea8ff","trim":"#3ea8ff","blurb":"Jump in the handheld and adventure through every level.","play":"","trailer":"","art":"","poster":"","cab":"","shots":[],"room":"main","slot":3,"status":"coming-soon"}],"prizes":[{"id":"beanie","name":"Black Beanie","icon":"🧢","cost":25,"real":false,"category":"Collectible","description":"","visible":true,"shelf":0,"image":"","model":"","scale":1,"rotation":0},{"id":"shades","name":"Red Aviators","icon":"🕶️","cost":30,"real":false,"category":"Collectible","description":"","visible":true,"shelf":1,"image":"","model":"","scale":1,"rotation":0},{"id":"hoodie","name":"T1 Red Hoodie","icon":"🧥","cost":40,"real":false,"category":"Collectible","description":"","visible":true,"shelf":2,"image":"","model":"","scale":1,"rotation":0},{"id":"boots","name":"Champion Boots","icon":"🥾","cost":50,"real":false,"category":"Collectible","description":"","visible":true,"shelf":3,"image":"","model":"","scale":1,"rotation":0},{"id":"mic","name":"Gold Mic","icon":"🎤","cost":60,"real":false,"category":"Collectible","description":"","visible":true,"shelf":4,"image":"","model":"","scale":1,"rotation":0},{"id":"record","name":"Golden Record","icon":"📀","cost":80,"real":false,"category":"Collectible","description":"","visible":true,"shelf":5,"image":"","model":"","scale":1,"rotation":0},{"id":"ring","name":"Champion Ring","icon":"💍","cost":120,"real":false,"category":"Collectible","description":"","visible":true,"shelf":6,"image":"","model":"","scale":1,"rotation":0},{"id":"belt","name":"Title Belt","icon":"🏆","cost":160,"real":false,"category":"Collectible","description":"","visible":true,"shelf":7,"image":"","model":"","scale":1,"rotation":0},{"id":"crown","name":"Arcade Crown","icon":"👑","cost":250,"real":false,"category":"Collectible","description":"","visible":true,"shelf":8,"image":"","model":"","scale":1,"rotation":0},{"id":"real-stickers","name":"Sticker Pack (real)","icon":"✨","cost":500,"real":true,"category":"Collectible","description":"","visible":false,"shelf":0,"image":"","model":"","scale":1,"rotation":0},{"id":"real-tee","name":"T1 Tee (real)","icon":"👕","cost":1500,"real":true,"category":"Collectible","description":"","visible":false,"shelf":1,"image":"","model":"","scale":1,"rotation":0}],"wall":{"title":"THE PRIZE GALLERY","accent":"#f2bd5b","backdrop":"#122b2d","lighting":1,"style":"gallery"}}$seed$::jsonb),('published',$seed${"version":1,"games":[{"id":"quest","title":"Quest of Champions","genre":"Action","color":"#ff2a3c","trim":"#ff2a3c","blurb":"Grab the mic, collect the records and fight your way to the ring. The main event.","play":"games/quest-of-champions/","trailer":"","art":"assets/qoc-title.jpg","poster":"assets/qoc-play.jpg","cab":"","shots":["assets/qoc-title.jpg","assets/qoc-play.jpg"],"room":"main","slot":0,"status":"playable"},{"id":"vendetta","title":"T1 Vs.","genre":"Fighting","color":"#ffb400","trim":"#d2142a","blurb":"Settle the score. One on one, round after round.","play":"https://t1game.chucksi.com","trailer":"","art":"assets/cabs/versus-cabinet.jpg","poster":"","cab":"assets/cabs/versus","shots":["assets/cabs/versus-screen.jpg","assets/cabs/versus-cabinet.jpg"],"room":"main","slot":1,"status":"playable"},{"id":"guerilla","title":"Gorilla City 2032","genre":"Open World","color":"#35e06f","trim":"#16a08e","blurb":"The whole city is yours. Go anywhere, run everything.","play":"","trailer":"","art":"assets/cabs/gorilla-cabinet.jpg","poster":"","cab":"assets/cabs/gorilla","shots":["assets/cabs/gorilla-screen.jpg","assets/cabs/gorilla-cabinet.jpg"],"room":"main","slot":2,"status":"coming-soon"},{"id":"gamerboy","title":"GAMEBBOY","genre":"Adventure","color":"#3ea8ff","trim":"#3ea8ff","blurb":"Jump in the handheld and adventure through every level.","play":"","trailer":"","art":"","poster":"","cab":"","shots":[],"room":"main","slot":3,"status":"coming-soon"}],"prizes":[{"id":"beanie","name":"Black Beanie","icon":"🧢","cost":25,"real":false,"category":"Collectible","description":"","visible":true,"shelf":0,"image":"","model":"","scale":1,"rotation":0},{"id":"shades","name":"Red Aviators","icon":"🕶️","cost":30,"real":false,"category":"Collectible","description":"","visible":true,"shelf":1,"image":"","model":"","scale":1,"rotation":0},{"id":"hoodie","name":"T1 Red Hoodie","icon":"🧥","cost":40,"real":false,"category":"Collectible","description":"","visible":true,"shelf":2,"image":"","model":"","scale":1,"rotation":0},{"id":"boots","name":"Champion Boots","icon":"🥾","cost":50,"real":false,"category":"Collectible","description":"","visible":true,"shelf":3,"image":"","model":"","scale":1,"rotation":0},{"id":"mic","name":"Gold Mic","icon":"🎤","cost":60,"real":false,"category":"Collectible","description":"","visible":true,"shelf":4,"image":"","model":"","scale":1,"rotation":0},{"id":"record","name":"Golden Record","icon":"📀","cost":80,"real":false,"category":"Collectible","description":"","visible":true,"shelf":5,"image":"","model":"","scale":1,"rotation":0},{"id":"ring","name":"Champion Ring","icon":"💍","cost":120,"real":false,"category":"Collectible","description":"","visible":true,"shelf":6,"image":"","model":"","scale":1,"rotation":0},{"id":"belt","name":"Title Belt","icon":"🏆","cost":160,"real":false,"category":"Collectible","description":"","visible":true,"shelf":7,"image":"","model":"","scale":1,"rotation":0},{"id":"crown","name":"Arcade Crown","icon":"👑","cost":250,"real":false,"category":"Collectible","description":"","visible":true,"shelf":8,"image":"","model":"","scale":1,"rotation":0},{"id":"real-stickers","name":"Sticker Pack (real)","icon":"✨","cost":500,"real":true,"category":"Collectible","description":"","visible":false,"shelf":0,"image":"","model":"","scale":1,"rotation":0},{"id":"real-tee","name":"T1 Tee (real)","icon":"👕","cost":1500,"real":true,"category":"Collectible","description":"","visible":false,"shelf":1,"image":"","model":"","scale":1,"rotation":0}],"wall":{"title":"THE PRIZE GALLERY","accent":"#f2bd5b","backdrop":"#122b2d","lighting":1,"style":"gallery"}}$seed$::jsonb);
