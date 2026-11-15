-- Time played, kept on the player profile (guest nickname or account): seconds per Central-time day and game.
-- No detail of what was done; that stays in the optional activity tables. The arcade sends a running count every
-- couple of minutes. Owners read it in the hub (hub_profile_time, hub_player).
create table if not exists bba_private.play_time (
  pid text not null references bba_private.players(pid) on delete cascade,
  day date not null, game text not null,
  secs integer not null default 0 check (secs >= 0),
  updated_at timestamptz not null default now(),
  primary key (pid, day, game)
);
create index if not exists play_time_day on bba_private.play_time(day);
alter table bba_private.play_time enable row level security;
revoke all on bba_private.play_time from anon, authenticated;

-- 'add': body { pid, key (guests) or a signed-in session, games: { <game>: seconds } }. 'get': the player's own totals.
create or replace function public.bba_playtime(p_action text, p_body jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare p bba_private.players; d date := (now() at time zone 'America/Chicago')::date;
  k text; v integer; room integer; quota integer; added integer := 0; since timestamptz;
begin
  p := bba_private.authorized_player(coalesce(p_body, '{}'::jsonb));
  if p_action = 'add' then
    -- never more than a day in a day, never more than 20 minutes at once, and no faster than the clock runs
    select 86400 - coalesce(sum(secs), 0) into room from bba_private.play_time where pid = p.pid and day = d;
    select max(updated_at) into since from bba_private.play_time where pid = p.pid;
    quota := least(1200, room, coalesce(ceil(extract(epoch from now() - since) * 1.1)::int + 30, 1200));
    for k, v in select key, floor(value::numeric)::int from jsonb_each_text(coalesce(p_body->'games', '{}'::jsonb))
      where key ~ '^[a-z0-9_-]{2,24}$' and value ~ '^[0-9]{1,6}(\.[0-9]+)?$' limit 12 loop
      v := least(v, quota); continue when v <= 0;
      insert into bba_private.play_time as t (pid, day, game, secs) values (p.pid, d, k, v)
        on conflict (pid, day, game) do update set secs = t.secs + excluded.secs, updated_at = now();
      quota := quota - v; added := added + v;
    end loop;
    return jsonb_build_object('ok', true, 'added', added);
  elsif p_action = 'get' then
    return jsonb_build_object(
      'total_secs', (select coalesce(sum(secs), 0) from bba_private.play_time where pid = p.pid),
      'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'game', game, 'secs', secs) order by day desc, game)
        from bba_private.play_time where pid = p.pid), '[]'::jsonb));
  end if;
  raise exception 'Unknown action' using errcode = '22023';
end $fn$;
revoke all on function public.bba_playtime(text, jsonb) from public;
grant execute on function public.bba_playtime(text, jsonb) to anon, authenticated;

-- Hub: one row per profile with time played and a few more counts. Joined to the profile list by short id + name.
create or replace function public.hub_profile_time(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare today date := (now() at time zone 'America/Chicago')::date;
begin
  if p_key is null or not exists (select 1 from bba_private.hub_keys k where k.hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(x) from (
    select right(p.pid, 4) id, p.name, p.streak, p.last_daily,
      coalesce(t.secs, 0) secs, coalesce(t.secs7, 0) secs7, coalesce(t.secs_today, 0) secs_today, coalesce(t.days, 0) days, t.last_day last_played,
      (select g.game from bba_private.play_time g where g.pid = p.pid group by g.game order by sum(g.secs) desc limit 1) top_game,
      (select count(*) from bba_private.redemptions r where r.pid = p.pid) prizes,
      (select coalesce(sum(u.cents), 0) from bba_private.purchases u where u.pid = p.pid) spent_cents,
      (select coalesce(sum(b.dmg), 0) from bba_private.boss_hits b where b.pid = p.pid) boss_dmg,
      (select count(*) from bba_private.loot_log l where l.pid = p.pid) loot,
      (select count(*) from bba_private.feedback f where f.pid = p.pid) feedback,
      jsonb_array_length(case when jsonb_typeof(p.closet) = 'array' then p.closet else '[]'::jsonb end) items
    from bba_private.players p
    left join (select pid, sum(secs) secs, sum(secs) filter (where day > today - 7) secs7, sum(secs) filter (where day = today) secs_today,
                 count(distinct day) days, max(day) last_day from bba_private.play_time group by pid) t on t.pid = p.pid
  ) x), '[]'::jsonb);
end $fn$;
revoke all on function public.hub_profile_time(text) from public;
grant execute on function public.hub_profile_time(text) to anon, authenticated;

-- Hub: one profile opened up: time by game and by day, scores, boss fights, loot, prizes and purchases.
create or replace function public.hub_player(p_key text, p_id text, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare who text; today date := (now() at time zone 'America/Chicago')::date;
begin
  if p_key is null or not exists (select 1 from bba_private.hub_keys k where k.hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select pid into who from bba_private.players where right(pid, 4) = p_id and name = p_name limit 1;
  if who is null then return null; end if;
  return jsonb_build_object(
    'games', coalesce((select jsonb_agg(x order by x.secs desc) from (select game, sum(secs) secs, count(distinct day) days, max(day) last_day from bba_private.play_time where pid = who group by game) x), '[]'::jsonb),
    'days', coalesce((select jsonb_agg(x order by x.day) from (select day, sum(secs) secs from bba_private.play_time where pid = who and day > today - 30 group by day) x), '[]'::jsonb),
    'scores', coalesce((select jsonb_agg(x order by x.score desc) from (select s.game, s.score,
        (select count(*) + 1 from bba_private.scores o where o.game = s.game and o.score > s.score) place from bba_private.scores s where s.pid = who) x), '[]'::jsonb),
    'bosses', coalesce((select jsonb_agg(x order by x.last_at desc) from (select kind, period, dmg, hits, last_at, claimed from bba_private.boss_hits where pid = who order by last_at desc limit 20) x), '[]'::jsonb),
    'loot', coalesce((select jsonb_agg(to_jsonb(l) - 'pid' - 'id' order by l.at desc) from (select * from bba_private.loot_log where pid = who order by at desc limit 20) l), '[]'::jsonb),
    'prizes', coalesce((select jsonb_agg(x order by x.created_at desc) from (select prize, cost, created_at, fulfilled_at from bba_private.redemptions where pid = who) x), '[]'::jsonb),
    'purchases', coalesce((select jsonb_agg(x order by x.created_at desc) from (select tokens, cents, created_at from bba_private.purchases where pid = who) x), '[]'::jsonb),
    'sharing', (select analytics_opt_in from bba_private.players where pid = who));
end $fn$;
revoke all on function public.hub_player(text, text, text) from public;
grant execute on function public.hub_player(text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
