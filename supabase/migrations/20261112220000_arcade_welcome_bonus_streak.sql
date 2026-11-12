-- Welcome bonus and daily streak.
-- * A new player starts with 25 tokens.
-- * The daily reward is 10 tokens x the day of the streak, up to 70 a day from day 7 on.
--   Missing a day starts the streak over at day 1.
alter table bba_private.players add column if not exists streak integer not null default 0;
alter table bba_private.players add column if not exists last_daily date;

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
  -- New players start with a 25-token welcome bonus.
  insert into bba_private.players(pid,kh,name,tokens,earned) values(pid,encode(extensions.digest(k,'sha256'),'hex'),nam,25,25) returning * into p;
  return jsonb_build_object('pid',pid,'key',k,'player',bba_private.player_public(p),'gained',25);
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
   if why='daily' then
    -- Daily streak: 10 tokens on day 1, 20 on day 2 ... 70 from day 7 on. Missing a day starts over.
    if p.last_daily is distinct from current_date then
     p.streak:=case when p.last_daily=current_date-1 then p.streak+1 else 1 end;
     p.last_daily:=current_date; gain:=10*least(p.streak,7);
    end if;
   else
    gain:=case why when 'play' then 5 when 'trailer' then 3 when 'song' then 1 else 0 end;
   end if;
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
 update bba_private.players set tokens=p.tokens,earned=p.earned,closet=p.closet,badge=p.badge,day=p.day,did=p.did,last_comment=p.last_comment,streak=p.streak,last_daily=p.last_daily where players.pid=p.pid;
 return jsonb_build_object('player',bba_private.player_public(p),'gained',gain,'streak',p.streak,'ok',true);
 end;$function$;
