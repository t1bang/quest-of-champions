-- Lobby bosses now spawn at random: 5 to 8 times a day, 20 minutes each, between 9 AM and 11 PM Central,
-- at a random spot. The weekly boss shows up during one of the day's windows; its health carries over all week.
-- Beating a boss pays tokens and rolls one loot drop by rarity: common, uncommon, rare, legendary, exotic.
-- A drop is bonus tokens, an avatar item, a special move or an upgrade; a drop the player already owns pays tokens instead.

alter table bba_private.bosses drop constraint if exists bosses_kind_check;
alter table bba_private.bosses add constraint bosses_kind_check check (kind ~ '^(weekly|daily|s[0-9])$');

create or replace function bba_private.h(t text) returns integer language sql immutable set search_path = '' as
$fn$ select ('x' || substr(md5(t), 1, 7))::bit(28)::integer $fn$;

-- The day's spawn windows. Everything comes from the date, so every player and the alert job agree.
create or replace function bba_private.boss_windows(d date)
returns table(day date, idx integer, starts timestamptz, ends timestamptz, spot integer, big boolean)
language sql stable set search_path = '' as $fn$
  with n as (select 5 + bba_private.h(d::text || 'n') % 4 as n),
  s as (select i, (840 / n.n) as slot, n.n from n, generate_series(0, (select n - 1 from n)) i),
  w as (select i, ((d::timestamp + make_interval(mins => 540 + i * slot + bba_private.h(d::text || 's' || i) % (slot - 20))) at time zone 'America/Chicago') as starts, n from s)
  select d, i, starts, starts + interval '20 minutes', bba_private.h(d::text || 'p' || i) % 4, i = bba_private.h(d::text || 'w') % n from w order by i;
$fn$;

-- An admin can call a boss out on demand (from the hub). It uses spawn number 9 so it never collides with the day's own spawns.
create table if not exists bba_private.boss_force (id integer primary key default 1 check (id = 1), until timestamptz not null, spot integer not null default 0, big boolean not null default false, note text);
alter table bba_private.boss_force enable row level security;
revoke all on bba_private.boss_force from anon, authenticated;

create or replace function bba_private.boss_clock() returns jsonb language plpgsql stable set search_path = '' as $fn$
declare d date := (now() at time zone 'America/Chicago')::date; cur record; nxt record; bignxt record; f bba_private.boss_force;
begin
  select * into cur from bba_private.boss_windows(d) w where now() >= w.starts and now() < w.ends limit 1;
  select * into f from bba_private.boss_force where until > now();
  if cur.idx is null and f.until is not null then
    select 9 as idx, f.spot as spot, f.big as big, f.until as ends into cur;
  end if;
  select * into nxt from (select * from bba_private.boss_windows(d) union all select * from bba_private.boss_windows(d + 1)) w where w.starts > now() order by w.starts limit 1;
  select * into bignxt from (select * from bba_private.boss_windows(d) union all select * from bba_private.boss_windows(d + 1) union all select * from bba_private.boss_windows(d + 2)) w where w.big and w.starts > now() order by w.starts limit 1;
  return jsonb_build_object('active', cur.idx is not null, 'idx', cur.idx, 'spot', cur.spot, 'big', coalesce(cur.big, false),
    'ends_in', case when cur.idx is null then 0 else floor(extract(epoch from cur.ends - now()))::integer end,
    'next_in', floor(extract(epoch from nxt.starts - now()))::integer, 'next_idx', nxt.idx, 'next_spot', nxt.spot, 'next_big', nxt.big,
    'big_next_in', floor(extract(epoch from bignxt.starts - now()))::integer,
    'today', (select count(*) from bba_private.boss_windows(d)));
end $fn$;

create or replace function bba_private.boss_json(k text, per date, who text) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  with base as (select case when k = 'weekly' then 20000 else 3000 end hp),
  b as (select * from bba_private.bosses where kind = k and period = per),
  h as (select * from bba_private.boss_hits where kind = k and period = per and pid = who)
  select jsonb_build_object(
    'period', per, 'hp', coalesce((select hp from b), (select hp from base)), 'max', coalesce((select hp_max from b), (select hp from base)),
    'level', coalesce((select level from b), 1), 'kills', coalesce((select kills from b), 0),
    'mine', coalesce((select dmg from h), 0), 'claimed', coalesce((select claimed from h), false),
    'need', case when k = 'weekly' then 600 else 150 end, 'reward', case when k = 'weekly' then 50 else 10 end,
    'fighters', (select count(*) from bba_private.boss_hits x where x.kind = k and x.period = per and x.dmg > 0),
    'top', coalesce((select jsonb_agg(t) from (select p.name, x.dmg from bba_private.boss_hits x join bba_private.players p on p.pid = x.pid
                     where x.kind = k and x.period = per and x.dmg > 0 order by x.dmg desc limit 5) t), '[]'::jsonb));
$fn$;
revoke all on function bba_private.boss_json(text, date, text) from public, anon, authenticated;

-- ---------- loot ----------
-- Items that only drop from bosses (never sold): kept in avatar_items so they can be worn, switched off so they cannot be bought.
insert into bba_private.avatar_items(id, name, slot, cost, active) values
  ('loot-visor', 'Glitch Visor', 'eyes', 300, false), ('loot-halo', 'Neon Halo', 'hat', 500, false), ('loot-gloves', 'Crunch Gauntlets', 'hand', 500, false),
  ('loot-jacket', 'Boss Slayer Jacket', 'shirt', 900, false), ('loot-chain', 'Supernova Chain', 'chain', 900, false)
on conflict (id) do nothing;

create table if not exists bba_private.loot_table (item text primary key, rarity text not null check (rarity in ('common','uncommon','rare','legendary','exotic')), weight integer not null default 10, tokens integer not null default 0);
create table if not exists bba_private.loot_log (id bigserial primary key, at timestamptz not null default now(), pid text not null, boss text not null, rarity text not null, item text not null, tokens integer not null default 0, dupe boolean not null default false);
alter table bba_private.loot_table enable row level security; alter table bba_private.loot_log enable row level security;
revoke all on bba_private.loot_table, bba_private.loot_log from anon, authenticated;
insert into bba_private.loot_table(item, rarity, weight, tokens) values
  ('tokens-5', 'common', 10, 5), ('tokens-8', 'common', 6, 8),
  ('tokens-15', 'uncommon', 10, 15), ('beanie', 'uncommon', 6, 0), ('cap', 'uncommon', 6, 0), ('pants-camo', 'uncommon', 6, 0), ('pants-red', 'uncommon', 6, 0), ('shades', 'uncommon', 6, 0),
  ('tokens-30', 'rare', 6, 30), ('hoodie', 'rare', 6, 0), ('jersey', 'rare', 6, 0), ('boots', 'rare', 6, 0), ('suit', 'rare', 4, 0), ('mic', 'rare', 4, 0), ('record', 'rare', 4, 0),
  ('move-uppercut', 'rare', 6, 0), ('move-tornado', 'rare', 5, 0), ('move-dash', 'rare', 5, 0), ('loot-visor', 'rare', 8, 0),
  ('tokens-60', 'legendary', 4, 60), ('up-power-2', 'legendary', 6, 0), ('up-speed-2', 'legendary', 6, 0), ('up-blast-2', 'legendary', 6, 0), ('move-slam', 'legendary', 5, 0), ('move-wave', 'legendary', 4, 0),
  ('chain', 'legendary', 4, 0), ('fangs', 'legendary', 4, 0), ('ring', 'legendary', 4, 0), ('loot-halo', 'legendary', 8, 0), ('loot-gloves', 'legendary', 8, 0),
  ('tokens-150', 'exotic', 3, 150), ('move-meteor', 'exotic', 5, 0), ('crown', 'exotic', 5, 0), ('belt', 'exotic', 5, 0), ('up-power-3', 'exotic', 4, 0), ('up-speed-3', 'exotic', 4, 0), ('up-blast-3', 'exotic', 4, 0),
  ('loot-jacket', 'exotic', 8, 0), ('loot-chain', 'exotic', 8, 0)
on conflict (item) do nothing;

-- One roll. Returns what dropped; the caller adds the tokens. Changes the player's closet when an item drops.
create or replace function bba_private.loot_roll(who text, boss text, big boolean) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
#variable_conflict use_column
declare r double precision := random(); rar text; it bba_private.loot_table; own jsonb; nm text; tok integer := 0; dupe boolean := false; got text;
begin
  rar := case when big then (case when r < 0.08 then 'exotic' when r < 0.30 then 'legendary' when r < 0.65 then 'rare' else 'uncommon' end)
              else (case when r < 0.02 then 'exotic' when r < 0.10 then 'legendary' when r < 0.30 then 'rare' when r < 0.60 then 'uncommon' else 'common' end) end;
  select * into it from bba_private.loot_table where rarity = rar order by -ln(greatest(random(), 1e-9)) / weight limit 1;
  select closet into own from bba_private.players where pid = who for update;
  got := it.item;
  if it.tokens > 0 then tok := it.tokens; nm := it.tokens || ' bonus tokens';
  else
    if got ~ '^up-[a-z]+-3$' and not (own ? replace(got, '-3', '-2')) then got := replace(got, '-3', '-2'); end if;   -- level 3 needs level 2 first
    select name into nm from bba_private.avatar_items where id = got;
    if own ? got then dupe := true; tok := case rar when 'uncommon' then 10 when 'rare' then 25 when 'legendary' then 50 else 100 end;
    else update bba_private.players set closet = closet || to_jsonb(got) where pid = who; end if;
  end if;
  insert into bba_private.loot_log(pid, boss, rarity, item, tokens, dupe) values (who, boss, rar, got, tok, dupe);
  return jsonb_build_object('rarity', rar, 'item', case when it.tokens > 0 then null else got end, 'name', nm, 'tokens', tok, 'dupe', dupe);
end $fn$;
revoke all on function bba_private.loot_roll(text, text, boolean) from public, anon, authenticated;

create or replace function bba_private.daily(a text, b jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
#variable_conflict use_column
declare p bba_private.players; tz text := 'America/Chicago'; d date; w date; per date; k text; kk text; qid text; gain integer := 0; ko boolean := false; loot jsonb; clk jsonb; ci integer;
  pool text[] := array['q-hits','q-bot','q-boss','q-blast','q-combo','q-jump','q-x10','q-emote','q-play','q-open2','q-mini','q-trailer','q-dodge'];
  todays text[]; q bba_private.quest_days; bs bba_private.bosses; bh bba_private.boss_hits; dmg integer; allow integer; base integer; need integer; reward integer; sj jsonb; wj jsonb;
begin
  d := (now() at time zone tz)::date; w := date_trunc('week', d::timestamp)::date;
  p := bba_private.authorized_player(b);
  clk := bba_private.boss_clock();
  select array_agg(x) into todays from (select x from unnest(pool) x order by md5(d::text || x) limit 3) s;

  if a = 'quest' then
    qid := b->>'id';
    if qid is null or not (qid = any(todays)) then raise exception 'That quest is not on today''s list'; end if;
    insert into bba_private.quest_days(pid, day) values (p.pid, d) on conflict do nothing;
    select * into q from bba_private.quest_days where pid = p.pid and day = d for update;
    if not (q.done ? qid) then
      gain := 5; q.done := q.done || to_jsonb(qid);
      if jsonb_array_length(q.done) >= 3 and not q.bonus then q.bonus := true; gain := gain + 10; end if;
      update bba_private.quest_days set done = q.done, bonus = q.bonus where pid = p.pid and day = d;
    end if;

  elsif a in ('hit', 'claim') then
    k := b->>'boss';
    if k is null or k not in ('spawn', 'weekly') then raise exception 'Unknown boss'; end if;
    if k = 'weekly' then kk := 'weekly'; per := w; base := 20000;
    else
      begin ci := coalesce((b->>'idx')::integer, (clk->>'idx')::integer); exception when others then ci := null; end;
      if a = 'hit' then ci := (clk->>'idx')::integer; end if;        -- you can only hit the boss that is out right now
      if ci is null or ci < 0 or ci > 9 then ci := null; end if;
      kk := 's' || ci; per := d; base := 3000;
    end if;
    if a = 'hit' and ((clk->>'active')::boolean is not true or (k = 'weekly' and (clk->>'big')::boolean is not true)) then kk := null; end if;   -- no boss out
    if kk is not null then
      insert into bba_private.bosses(kind, period, hp, hp_max) values (kk, per, base, base) on conflict do nothing;
      insert into bba_private.boss_hits(kind, period, pid, last_at) values (kk, per, p.pid, now() - interval '5 seconds') on conflict do nothing;
      select * into bh from bba_private.boss_hits where kind = kk and period = per and pid = p.pid for update;
      if a = 'hit' then
        begin dmg := greatest(0, least(3000, floor((b->>'dmg')::numeric)::integer)); exception when others then dmg := 0; end;
        allow := least(dmg, ceil(200 * least(15, greatest(0, extract(epoch from now() - bh.last_at))))::integer);   -- at most 200 damage a second from one player
        if allow > 0 then
          update bba_private.boss_hits set dmg = dmg + allow, hits = hits + 1, last_at = now() where kind = kk and period = per and pid = p.pid;
          update bba_private.bosses set hp = hp - allow where kind = kk and period = per returning * into bs;
          if bs.hp <= 0 then
            ko := true;
            update bba_private.bosses set kills = kills + 1, level = level + 1, last_ko = now(),
              hp_max = least(base * 5, round(base * power(case when kk = 'weekly' then 1.25 else 1.5 end, kills + 1))::integer),
              hp = least(base * 5, round(base * power(case when kk = 'weekly' then 1.25 else 1.5 end, kills + 1))::integer)
            where kind = kk and period = per;
          end if;
        end if;
      else
        select * into bs from bba_private.bosses where kind = kk and period = per;
        need := case when kk = 'weekly' then 600 else 150 end; reward := case when kk = 'weekly' then 50 else 10 end;
        if bs.kills < 1 then raise exception 'Beat the boss first'; end if;
        if bh.dmg < need then raise exception 'Deal more damage to earn this reward'; end if;
        if not bh.claimed then
          update bba_private.boss_hits set claimed = true where kind = kk and period = per and pid = p.pid;
          loot := bba_private.loot_roll(p.pid, kk, kk = 'weekly');
          gain := reward + coalesce((loot->>'tokens')::integer, 0);
        end if;
      end if;
    end if;
  elsif a <> 'state' then
    raise exception 'Unknown action';
  end if;

  if gain > 0 then update bba_private.players set tokens = tokens + gain, earned = earned + gain where pid = p.pid; end if;
  select * into p from bba_private.players where pid = p.pid;
  select * into q from bba_private.quest_days where pid = p.pid and day = d;
  ci := coalesce((clk->>'idx')::integer, (b->>'idx')::integer);
  sj := case when ci is null then jsonb_build_object('hp', 0, 'max', 3000, 'level', 1, 'kills', 0, 'mine', 0, 'claimed', false, 'need', 150, 'reward', 10, 'fighters', 0, 'top', '[]'::jsonb)
             else bba_private.boss_json('s' || ci, d, p.pid) end
        || jsonb_build_object('active', (clk->>'active')::boolean, 'idx', ci, 'spot', clk->'spot', 'ends_in', clk->'ends_in', 'next_in', clk->'next_in', 'next_idx', clk->'next_idx', 'next_spot', clk->'next_spot', 'today', clk->'today');
  wj := bba_private.boss_json('weekly', w, p.pid) || jsonb_build_object('active', (clk->>'active')::boolean and (clk->>'big')::boolean, 'ends_in', clk->'ends_in', 'next_in', clk->'big_next_in');
  return jsonb_build_object('day', d, 'week', w, 'gained', gain, 'ko', ko, 'loot', loot, 'tokens', p.tokens, 'earned', p.earned, 'closet', p.closet,
    'secs_left', floor(extract(epoch from ((d + 1)::timestamp - (now() at time zone tz))))::integer,
    'quests', jsonb_build_object('ids', to_jsonb(todays), 'done', coalesce(q.done, '[]'::jsonb), 'bonus', coalesce(q.bonus, false), 'reward', 5, 'bonus_reward', 10),
    'bosses', jsonb_build_object('spawn', sj, 'weekly', wj));
end $fn$;
revoke all on function bba_private.daily(text, jsonb) from public;
grant execute on function bba_private.daily(text, jsonb) to anon, authenticated;

-- Hub admins: call a boss out right now for a number of minutes (1 to 60). p_big also brings the weekly boss.
create or replace function public.hub_boss(p_key text, p_minutes integer default 20, p_big boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare d date := (now() at time zone 'America/Chicago')::date; m integer := greatest(1, least(coalesce(p_minutes, 20), 60));
begin
  if p_key is null or not exists (select 1 from bba_private.hub_keys k where k.hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from bba_private.boss_hits where kind = 's9' and period = d; delete from bba_private.bosses where kind = 's9' and period = d;
  insert into bba_private.boss_force(id, until, spot, big, note) values (1, now() + make_interval(mins => m), floor(random() * 4)::integer, coalesce(p_big, false), 'hub')
    on conflict (id) do update set until = excluded.until, spot = excluded.spot, big = excluded.big, note = excluded.note;
  return bba_private.boss_clock();
end $fn$;
revoke all on function public.hub_boss(text, integer, boolean) from public;
grant execute on function public.hub_boss(text, integer, boolean) to anon, authenticated;
notify pgrst, 'reload schema';
