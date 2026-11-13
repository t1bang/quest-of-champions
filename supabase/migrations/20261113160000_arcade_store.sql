-- Arcade store: sign-in-only welcome bonus, real prizes for tokens, and tokens bought with real money.
--
-- AFTER RUNNING THIS FILE, two values must be set by hand (they are kept out of this public repo):
--   1. The ticket link players receive when they redeem the tickets prize:
--        update bba_private.real_prizes set link='THE EVENTBRITE LINK WITH THE FREE CODE' where id='real-tickets';
--   2. The server secret that lets the website credit bought tokens. Use the same value as the
--      ARCADE_SERVER_SECRET environment variable in Vercel:
--        insert into bba_private.secrets(name,hash) values('server',encode(extensions.digest('THE SECRET','sha256'),'hex'))
--          on conflict(name) do update set hash=excluded.hash;

alter table bba_private.players add column if not exists streak integer not null default 0;
alter table bba_private.players add column if not exists last_daily date;
alter table bba_private.players add column if not exists welcomed boolean not null default false;

-- Real prizes. kind 'ship' = merch we send out; kind 'ticket' = a link the player receives (one per player).
create table if not exists bba_private.real_prizes (
  id text primary key, name text not null, cost integer not null check (cost > 0),
  kind text not null default 'ship' check (kind in ('ship','ticket')), link text, active boolean not null default true
);
insert into bba_private.real_prizes(id,name,cost,kind) values
  ('real-tickets','Stevie Stone GOAT Talk Tour Tickets',500,'ticket'),
  ('real-tone-tee','Tone Da Boss T-Shirt',500,'ship'),
  ('real-hoodie','T1 Hoodie',1000,'ship'),
  ('real-hat','T1 Hat',45,'ship'),
  ('real-stickers','Sticker Pack',15,'ship')
on conflict(id) do update set name=excluded.name,cost=excluded.cost,kind=excluded.kind;

create table if not exists bba_private.redemptions (
  id bigint generated always as identity primary key,
  pid text not null references bba_private.players(pid), prize text not null references bba_private.real_prizes(id),
  cost integer not null, code text not null unique, email text, created_at timestamptz not null default now(), fulfilled_at timestamptz
);
create index if not exists bba_redemptions_pid on bba_private.redemptions(pid);

-- Tokens bought with real money. ref is the payment processor's capture id, so a payment is never credited twice.
create table if not exists bba_private.purchases (
  ref text primary key, pid text not null references bba_private.players(pid),
  tokens integer not null check (tokens > 0), cents integer not null, created_at timestamptz not null default now()
);
create table if not exists bba_private.secrets (name text primary key, hash text not null);
alter table bba_private.real_prizes enable row level security;
alter table bba_private.redemptions enable row level security;
alter table bba_private.purchases enable row level security;
alter table bba_private.secrets enable row level security;

-- Called only by the website's payment endpoint, which proves itself with the server secret.
-- Bought tokens are spendable but do not count as "earned" (levels and the top-earners board).
create or replace function public.bba_credit_tokens(p_secret text, p_pid text, p_tokens integer, p_ref text, p_cents integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ok boolean; n integer; bal integer;
begin
  select exists(select 1 from bba_private.secrets where name='server' and hash=encode(extensions.digest(coalesce(p_secret,''),'sha256'),'hex')) into ok;
  if not ok then raise exception 'Not allowed' using errcode='28000'; end if;
  if p_tokens is null or p_tokens<1 or p_tokens>10000 or coalesce(p_ref,'')='' then raise exception 'Bad purchase'; end if;
  insert into bba_private.purchases(ref,pid,tokens,cents) values(p_ref,p_pid,p_tokens,p_cents) on conflict(ref) do nothing;
  get diagnostics n = row_count;
  if n=1 then update bba_private.players set tokens=tokens+p_tokens where pid=p_pid; end if;
  select tokens into bal from bba_private.players where pid=p_pid;
  return jsonb_build_object('credited',n=1,'tokens',bal);
end; $$;
revoke all on function public.bba_credit_tokens(text,text,integer,text,integer) from public;
grant execute on function public.bba_credit_tokens(text,text,integer,text,integer) to anon, authenticated;

CREATE OR REPLACE FUNCTION bba_private.arcade(p_action text, p_body jsonb, p_game text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 #variable_conflict use_column
 declare p bba_private.players; rp bba_private.real_prizes; bonus integer:=0; claim_code text; mail text; claims jsonb; extra jsonb:='{}'; c jsonb; prize jsonb; item jsonb; pid text; k text; nam text; gid text; why text; tag text; gain integer:=0; scr bigint; prior bigint:=0; msg text; result jsonb; badge_icon text;
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
 -- Welcome bonus: 25 tokens, once, for players who have signed in (linked an account).
 if p.user_id is not null and not p.welcomed then p.welcomed:=true;bonus:=25;p.tokens:=p.tokens+bonus;p.earned:=p.earned+bonus;end if;
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
 elsif p_action='buy' and exists(select 1 from bba_private.real_prizes where id=p_body->>'id' and active) then
  -- Real prizes: signed-in players only. Tokens are spent, a claim code is issued and the server emails it.
  select * into rp from bba_private.real_prizes where id=p_body->>'id' and active;
  if p.user_id is null then raise exception 'Sign in to redeem real prizes';end if;
  if rp.kind='ticket' and exists(select 1 from bba_private.redemptions r where r.pid=p.pid and r.prize=rp.id) then raise exception 'You already claimed these tickets';end if;
  if p.tokens<rp.cost then raise exception 'Not enough tokens yet';end if;
  select email into mail from auth.users where id=p.user_id;
  claim_code:='BBA-'||upper(encode(extensions.gen_random_bytes(4),'hex'));
  p.tokens:=p.tokens-rp.cost;
  insert into bba_private.redemptions(pid,prize,cost,code,email)values(p.pid,rp.id,rp.cost,claim_code,mail);
  extra:=jsonb_build_object('code',claim_code,'email',mail,'prize',jsonb_build_object('id',rp.id,'name',rp.name,'kind',rp.kind,'link',rp.link));
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
 update bba_private.players set tokens=p.tokens,earned=p.earned,closet=p.closet,badge=p.badge,day=p.day,did=p.did,last_comment=p.last_comment,streak=p.streak,last_daily=p.last_daily,welcomed=p.welcomed where players.pid=p.pid;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.prize,'code',r.code,'name',q.name,'kind',q.kind,'link',q.link,'ts',(extract(epoch from r.created_at)*1000)::bigint) order by r.created_at),'[]')
  into claims from bba_private.redemptions r join bba_private.real_prizes q on q.id=r.prize where r.pid=p.pid;
 return jsonb_build_object('player',bba_private.player_public(p)||jsonb_build_object('claims',claims),'gained',gain+bonus,'welcome',bonus,'streak',p.streak,'ok',true)||extra;
 end;$function$;
