-- Daily quests and lobby bosses.
-- Three quests a day (picked from a pool by the date), each paid once; a bonus for finishing all three.
-- Two bosses with health shared by every player: one per day and a stronger one per week (Monday to Sunday).
-- Each time a boss falls it returns a level stronger; a player who dealt enough damage is paid once per period.
-- The day turns over at midnight America/Chicago.
create table if not exists bba_private.quest_days (
  pid text not null, day date not null, done jsonb not null default '[]'::jsonb, bonus boolean not null default false,
  primary key (pid, day));
create table if not exists bba_private.bosses (
  kind text not null check (kind in ('daily','weekly')), period date not null, level integer not null default 1,
  hp integer not null, hp_max integer not null, kills integer not null default 0, last_ko timestamptz,
  primary key (kind, period));
create table if not exists bba_private.boss_hits (
  kind text not null, period date not null, pid text not null, dmg integer not null default 0, hits integer not null default 0,
  last_at timestamptz not null default now(), claimed boolean not null default false,
  primary key (kind, period, pid));
alter table bba_private.quest_days enable row level security;
alter table bba_private.bosses enable row level security;
alter table bba_private.boss_hits enable row level security;
revoke all on bba_private.quest_days, bba_private.bosses, bba_private.boss_hits from anon, authenticated;

create or replace function bba_private.boss_json(k text, per date, who text) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  with base as (select case when k = 'daily' then 3000 else 20000 end hp),
  b as (select * from bba_private.bosses where kind = k and period = per),
  h as (select * from bba_private.boss_hits where kind = k and period = per and pid = who)
  select jsonb_build_object(
    'period', per, 'hp', coalesce((select hp from b), (select hp from base)), 'max', coalesce((select hp_max from b), (select hp from base)),
    'level', coalesce((select level from b), 1), 'kills', coalesce((select kills from b), 0),
    'mine', coalesce((select dmg from h), 0), 'claimed', coalesce((select claimed from h), false),
    'need', case when k = 'daily' then 150 else 600 end, 'reward', case when k = 'daily' then 15 else 60 end,
    'fighters', (select count(*) from bba_private.boss_hits x where x.kind = k and x.period = per and x.dmg > 0),
    'top', coalesce((select jsonb_agg(t) from (select p.name, x.dmg from bba_private.boss_hits x join bba_private.players p on p.pid = x.pid
                     where x.kind = k and x.period = per and x.dmg > 0 order by x.dmg desc limit 5) t), '[]'::jsonb));
$fn$;
revoke all on function bba_private.boss_json(text, date, text) from public, anon, authenticated;

create or replace function bba_private.daily(a text, b jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
#variable_conflict use_column
declare p bba_private.players; tz text := 'America/Chicago'; d date; w date; per date; k text; qid text; gain integer := 0; ko boolean := false;
  pool text[] := array['q-hits','q-bot','q-boss','q-blast','q-combo','q-jump','q-x10','q-emote','q-play','q-open2','q-mini','q-trailer','q-dodge'];
  todays text[]; q bba_private.quest_days; bs bba_private.bosses; bh bba_private.boss_hits; dmg integer; allow integer; base integer; need integer; reward integer;
begin
  d := (now() at time zone tz)::date; w := date_trunc('week', d::timestamp)::date;
  p := bba_private.authorized_player(b);
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
    if k is null or k not in ('daily', 'weekly') then raise exception 'Unknown boss'; end if;
    per := case when k = 'daily' then d else w end; base := case when k = 'daily' then 3000 else 20000 end;
    insert into bba_private.bosses(kind, period, hp, hp_max) values (k, per, base, base) on conflict do nothing;
    insert into bba_private.boss_hits(kind, period, pid, last_at) values (k, per, p.pid, now() - interval '5 seconds') on conflict do nothing;
    select * into bh from bba_private.boss_hits where kind = k and period = per and pid = p.pid for update;
    if a = 'hit' then
      begin dmg := greatest(0, least(3000, floor((b->>'dmg')::numeric)::integer)); exception when others then dmg := 0; end;
      -- nobody can report more than 200 damage a second (the strongest fully upgraded player lands well under that)
      allow := least(dmg, ceil(200 * least(15, greatest(0, extract(epoch from now() - bh.last_at))))::integer);
      if allow > 0 then
        update bba_private.boss_hits set dmg = dmg + allow, hits = hits + 1, last_at = now() where kind = k and period = per and pid = p.pid;
        update bba_private.bosses set hp = hp - allow where kind = k and period = per returning * into bs;
        if bs.hp <= 0 then
          ko := true;
          update bba_private.bosses set kills = kills + 1, level = level + 1, last_ko = now(),
            hp_max = least(base * 5, round(base * power(case when k = 'daily' then 1.5 else 1.25 end, kills + 1))::integer),
            hp = least(base * 5, round(base * power(case when k = 'daily' then 1.5 else 1.25 end, kills + 1))::integer)
          where kind = k and period = per;
        end if;
      end if;
    else
      select * into bs from bba_private.bosses where kind = k and period = per;
      need := case when k = 'daily' then 150 else 600 end; reward := case when k = 'daily' then 15 else 60 end;
      if bs.kills < 1 then raise exception 'Beat the boss first'; end if;
      if bh.dmg < need then raise exception 'Deal more damage to earn this reward'; end if;
      if not bh.claimed then
        update bba_private.boss_hits set claimed = true where kind = k and period = per and pid = p.pid;
        gain := reward;
      end if;
    end if;
  elsif a <> 'state' then
    raise exception 'Unknown action';
  end if;

  if gain > 0 then update bba_private.players set tokens = tokens + gain, earned = earned + gain where pid = p.pid returning * into p; end if;
  select * into q from bba_private.quest_days where pid = p.pid and day = d;
  return jsonb_build_object('day', d, 'week', w, 'gained', gain, 'ko', ko, 'tokens', p.tokens, 'earned', p.earned,
    'secs_left', floor(extract(epoch from ((d + 1)::timestamp - (now() at time zone tz))))::integer,
    'quests', jsonb_build_object('ids', to_jsonb(todays), 'done', coalesce(q.done, '[]'::jsonb), 'bonus', coalesce(q.bonus, false), 'reward', 5, 'bonus_reward', 10),
    'bosses', jsonb_build_object('daily', bba_private.boss_json('daily', d, p.pid), 'weekly', bba_private.boss_json('weekly', w, p.pid)));
end $fn$;
revoke all on function bba_private.daily(text, jsonb) from public;
grant execute on function bba_private.daily(text, jsonb) to anon, authenticated;

create or replace function public.bba_daily(p_action text, p_body jsonb default '{}'::jsonb) returns jsonb
language sql set search_path = '' as $fn$ select bba_private.daily(p_action, p_body) $fn$;
revoke all on function public.bba_daily(text, jsonb) from public;
grant execute on function public.bba_daily(text, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
