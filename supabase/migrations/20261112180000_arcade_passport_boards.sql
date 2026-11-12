-- Arcade passport (Nov 12 2026): one arcade-wide level, leaderboards that carry each player's level and avatar,
-- Cruizin IA registered as a game, and the anonymous activity hub. Applied to big-bang-arcade on Nov 12 2026.

-- Leaderboards: 'all' = arcade rank (tokens ever earned, any game); otherwise best score in one game.
-- level = 1 + floor(sqrt(earned / 20)), the same formula the site uses.
create or replace function public.bba_boards(p_game text default 'all') returns jsonb language sql stable security definer set search_path = '' as $fn$
 select case when p_game is null or p_game = 'all' then
   (select coalesce(jsonb_agg(q), '[]'::jsonb) from (select p.name, p.badge, p.earned as score, (1 + floor(sqrt(p.earned / 20.0)))::int as level, p.avatar, (p.user_id is not null) as linked,
       (select count(*) from bba_private.scores s where s.pid = p.pid) as games from bba_private.players p where p.earned > 0 order by p.earned desc, p.name limit 50) q)
 else
   (select coalesce(jsonb_agg(q), '[]'::jsonb) from (select p.name, p.badge, s.score, (1 + floor(sqrt(p.earned / 20.0)))::int as level, p.avatar, (p.user_id is not null) as linked
       from bba_private.scores s join bba_private.players p using (pid) where s.game = p_game order by s.score desc, p.name limit 50) q)
 end $fn$;
revoke all on function public.bba_boards(text) from public;
grant execute on function public.bba_boards(text) to anon, authenticated;

-- Cruizin IA joins the published game list so its scores and play tokens are accepted.
update public.bba_content set content = jsonb_set(content, '{games}', (content->'games') ||
  '{"id":"cruizin","title":"Cruizin IA","genre":"Racing","color":"#ff7a1a","trim":"#ff7a1a","room":"main","slot":5,"status":"playable","play":"https://cruizin.chucksi.com/","art":"assets/cruizin-cover.jpg","cab":"","poster":"","trailer":"","shots":["assets/cruizin-cover.jpg"],"blurb":"Cedar Rapids in 3D. Race I-380, then free roam downtown: missions, fishing, boats and more."}'::jsonb), updated_at = now()
where not exists (select 1 from jsonb_array_elements(content->'games') g where g->>'id' = 'cruizin');

-- Activity hub: anonymous play counts for every game (random browser id, no names, no IP addresses).
-- The owner key is stored only as a SHA-256 hash in bba_private.hub_keys; add one with
--   insert into bba_private.hub_keys(hash,label) values (encode(sha256(convert_to('YOUR KEY','UTF8')),'hex'),'label');

create table if not exists bba_private.hub_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  game text not null, kind text not null, vid text not null, sid text not null,
  secs integer not null default 0, device text, ref text, build text
);
create index if not exists hub_events_at on bba_private.hub_events (at desc);
create index if not exists hub_events_game_at on bba_private.hub_events (game, at desc);
create index if not exists hub_events_vid on bba_private.hub_events (vid, at desc);
alter table bba_private.hub_events enable row level security;
create table if not exists bba_private.hub_keys (hash text primary key, label text, added_at timestamptz default now());
alter table bba_private.hub_keys enable row level security;

create or replace function public.hub_track(p_game text, p_kind text, p_vid text, p_sid text, p_secs integer default 0, p_device text default null, p_ref text default null, p_build text default null)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,24}$' or p_kind is null or p_kind !~ '^[a-z0-9_:.-]{2,40}$'
     or p_vid is null or p_vid !~ '^[A-Za-z0-9_-]{8,40}$' or p_sid is null or p_sid !~ '^[A-Za-z0-9_-]{8,40}$' then return; end if;
  if (select count(*) from bba_private.hub_events e where e.vid = p_vid and e.at > now() - interval '1 hour') > 400 then return; end if;
  insert into bba_private.hub_events(game, kind, vid, sid, secs, device, ref, build)
  values (p_game, p_kind, p_vid, p_sid, greatest(0, least(coalesce(p_secs,0), 120)), left(p_device, 12), left(p_ref, 60), left(p_build, 24));
end $fn$;
revoke all on function public.hub_track(text,text,text,text,integer,text,text,text) from public;
grant execute on function public.hub_track(text,text,text,text,integer,text,text,text) to anon, authenticated;

create or replace function public.hub_stats(p_key text, p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare d integer := greatest(1, least(coalesce(p_days, 30), 365)); since timestamptz; tz text := 'America/Chicago'; r jsonb;
begin
  if p_key is null or not exists (select 1 from bba_private.hub_keys k where k.hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  since := now() - make_interval(days => d);
  select jsonb_build_object(
    'now', now(), 'days', d,
    'live', coalesce((select jsonb_agg(x) from (select game, count(distinct vid) people from bba_private.hub_events where at > now() - interval '3 minutes' group by 1 order by 2 desc) x), '[]'::jsonb),
    'totals', (select jsonb_build_object(
        'people_today', count(distinct vid) filter (where kind = 'play' and (at at time zone tz)::date = (now() at time zone tz)::date),
        'people_7d', count(distinct vid) filter (where kind = 'play' and at > now() - interval '7 days'),
        'people', count(distinct vid) filter (where kind = 'play'),
        'visitors', count(distinct vid),
        'sessions', count(distinct sid) filter (where kind = 'play'),
        'minutes', round(coalesce(sum(secs), 0) / 60.0),
        'all_time_people', (select count(distinct vid) from bba_private.hub_events where kind = 'play'),
        'first_event', (select min(at) from bba_private.hub_events))
      from bba_private.hub_events where at >= since),
    'games', coalesce((select jsonb_agg(x order by x.people desc, x.visitors desc) from (
        select e.game, count(distinct e.vid) filter (where e.kind = 'play') people, count(distinct e.vid) visitors,
               count(distinct e.vid) filter (where e.kind = 'play' and f.first_at >= since) new_people,
               count(distinct e.sid) filter (where e.kind = 'play') sessions, round(coalesce(sum(e.secs), 0) / 60.0) minutes, max(e.at) last_at
        from bba_private.hub_events e left join (select vid, game, min(at) first_at from bba_private.hub_events where kind = 'play' group by 1, 2) f on f.vid = e.vid and f.game = e.game
        where e.at >= since group by e.game) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(x order by x.day, x.game) from (
        select (at at time zone tz)::date as day, game, count(distinct vid) filter (where kind = 'play') people, count(distinct vid) visitors, round(coalesce(sum(secs), 0) / 60.0) minutes
        from bba_private.hub_events where at >= since group by 1, 2) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (select coalesce(device, 'unknown') device, count(distinct vid) people from bba_private.hub_events where at >= since and kind = 'play' group by 1 order by 2 desc) x), '[]'::jsonb),
    'refs', coalesce((select jsonb_agg(x) from (select coalesce(nullif(ref, ''), 'direct') ref, count(distinct sid) sessions from bba_private.hub_events where at >= since and kind = 'load' group by 1 order by 2 desc limit 12) x), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(x) from (select game, kind, count(*) total, count(distinct vid) people from bba_private.hub_events where at >= since and kind not in ('load', 'play', 'beat') group by 1, 2 order by 3 desc limit 40) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x) from (select at, game, kind, device, right(vid, 4) who from bba_private.hub_events where kind <> 'beat' order by at desc limit 30) x), '[]'::jsonb),
    'arcade', jsonb_build_object(
        'profiles', (select count(*) from bba_private.players), 'linked', (select count(*) from bba_private.players where user_id is not null),
        'opted_in', (select count(*) from bba_private.players where analytics_opt_in), 'scores', (select count(*) from bba_private.scores),
        'comments', (select count(*) from bba_private.comments), 'saves', (select count(*) from bba_private.game_saves))
  ) into r;
  return r;
end $fn$;
revoke all on function public.hub_stats(text, integer) from public;
grant execute on function public.hub_stats(text, integer) to anon, authenticated;
notify pgrst, 'reload schema';
