-- Hub: time played, in hours and minutes. Read-only over the anonymous hub events (random browser IDs, no names),
-- plus named totals for account players who switched activity sharing on. Owner key required, as for hub_stats.
create or replace function public.hub_playtime(p_key text, p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare d integer := greatest(1, least(coalesce(p_days, 30), 365)); since timestamptz; tz text := 'America/Chicago'; r jsonb;
begin
  if p_key is null or not exists (select 1 from bba_private.hub_keys k where k.hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  since := now() - make_interval(days => d);
  with ev as (select * from bba_private.hub_events where at >= since and secs > 0),
  per as (select vid, sum(secs) secs, count(distinct sid) sessions, count(distinct (at at time zone tz)::date) days, max(at) last_at, min(device) device from ev group by vid),
  ses as (select sid, vid, min(game) game, sum(secs) secs, min(at) started from ev group by sid, vid)
  select jsonb_build_object(
    'days', d,
    'total_secs', (select coalesce(sum(secs), 0) from per),
    'people', (select count(*) from per),
    'sessions', (select count(*) from ses),
    'avg_person_secs', (select coalesce(round(avg(secs)), 0) from per),
    'median_person_secs', (select coalesce(round(percentile_cont(0.5) within group (order by secs)), 0) from per),
    'avg_session_secs', (select coalesce(round(avg(secs)), 0) from ses),
    'longest_session_secs', (select coalesce(max(secs), 0) from ses),
    'buckets', (select jsonb_build_object('under1', count(*) filter (where secs < 60), 'm1_5', count(*) filter (where secs >= 60 and secs < 300),
        'm5_15', count(*) filter (where secs >= 300 and secs < 900), 'm15_60', count(*) filter (where secs >= 900 and secs < 3600), 'h1', count(*) filter (where secs >= 3600)) from per),
    'games', coalesce((select jsonb_agg(x order by x.secs desc) from (
        select game, sum(secs) secs, count(distinct vid) people, round(sum(secs)::numeric / greatest(1, count(distinct vid))) avg_secs from ev group by game) x), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(x) from (
        select right(p.vid, 4) who, p.secs, p.sessions, p.days, p.last_at, p.device,
               (select g.game from ev g where g.vid = p.vid group by g.game order by sum(g.secs) desc limit 1) top_game
        from per p order by p.secs desc limit 25) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(x order by x.day) from (
        select (at at time zone tz)::date as day, sum(secs) secs, count(distinct vid) people from ev group by 1) x), '[]'::jsonb),
    'named', coalesce((select jsonb_agg(x) from (
        select pl.name, sum(gr.active_seconds) secs, count(*) runs, max(gr.last_seen_at) last_at
        from bba_private.game_runs gr join bba_private.players pl on pl.pid = gr.pid
        where gr.started_at >= since group by pl.name having sum(gr.active_seconds) > 0 order by 2 desc limit 25) x), '[]'::jsonb)
  ) into r;
  return r;
end $fn$;
revoke all on function public.hub_playtime(text, integer) from public;
grant execute on function public.hub_playtime(text, integer) to anon, authenticated;
notify pgrst, 'reload schema';
