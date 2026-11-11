-- Live arcade stats for every visitor: how many people are in the arcade, which games are being
-- played right now, and how many times each game has been launched.
-- Launch counts are totals only. A visit is a random code made fresh on each page load and removed
-- after ten minutes of silence. Names appear only for players who already have an online profile.
create table bba_private.plays (
  day date not null default current_date, game text not null, launches integer not null default 0,
  primary key (day, game)
);
create table bba_private.presence (
  sid text primary key, pid text references bba_private.players(pid) on delete cascade,
  game text, seen timestamptz not null default now()
);
create index presence_seen on bba_private.presence (seen);
alter table bba_private.plays enable row level security;
alter table bba_private.presence enable row level security;
revoke all on bba_private.plays, bba_private.presence from anon, authenticated;

create function bba_private.live(a text, b jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare v_sid text := b->>'sid'; gid text := nullif(b->>'game',''); p bba_private.players; prev bba_private.presence;
begin
  if a = 'pulse' then
    if v_sid is null or v_sid !~ '^[a-z0-9]{4,24}$' then raise exception 'Invalid visit'; end if;
    if gid is not null and not exists(select 1 from public.bba_content c, jsonb_array_elements(c.content->'games') g
      where c.id='published' and g->>'id'=gid and g->>'status'<>'hidden') then raise exception 'Unknown game'; end if;
    if coalesce(b->>'pid','') <> '' then
      begin p := bba_private.authorized_player(b); exception when others then p := null; end;
    end if;
    delete from bba_private.presence where seen < now() - interval '10 minutes';
    select * into prev from bba_private.presence s where s.sid = v_sid;
    insert into bba_private.presence(sid, pid, game, seen) values (v_sid, p.pid, gid, now())
      on conflict (sid) do update set pid = excluded.pid, game = excluded.game, seen = now();
    -- one launch is counted each time a visit moves into a game it was not already in
    if gid is not null and (prev.sid is null or prev.game is distinct from gid) then
      insert into bba_private.plays(day, game, launches) values (current_date, gid, 1)
        on conflict (day, game) do update set launches = bba_private.plays.launches + 1;
    end if;
  elsif a <> 'live' then raise exception 'Unknown live action'; end if;
  return jsonb_build_object(
    'online', (select count(*) from bba_private.presence where seen > now() - interval '90 seconds'),
    'now', coalesce((select jsonb_object_agg(game, n) from (select game, count(*) n from bba_private.presence
      where game is not null and seen > now() - interval '90 seconds' group by game) q), '{}'),
    'names', coalesce((select jsonb_agg(q) from (select pl.name, s.game from bba_private.presence s
      join bba_private.players pl on pl.pid = s.pid where s.seen > now() - interval '90 seconds' order by s.seen desc limit 30) q), '[]'),
    'today', coalesce((select jsonb_object_agg(game, launches) from bba_private.plays where day = current_date), '{}'),
    'week', coalesce((select jsonb_object_agg(game, n) from (select game, sum(launches) n from bba_private.plays
      where day > current_date - 7 group by game) q), '{}'),
    'all', coalesce((select jsonb_object_agg(game, n) from (select game, sum(launches) n from bba_private.plays group by game) q), '{}'));
end; $$;
revoke all on function bba_private.live(text, jsonb) from public;
grant execute on function bba_private.live(text, jsonb) to anon, authenticated;
create function public.bba_live(p_action text, p_body jsonb default '{}') returns jsonb
language sql security invoker set search_path to '' as $$select bba_private.live(p_action, p_body);$$;
revoke all on function public.bba_live(text, jsonb) from public;
grant execute on function public.bba_live(text, jsonb) to anon, authenticated, service_role;
