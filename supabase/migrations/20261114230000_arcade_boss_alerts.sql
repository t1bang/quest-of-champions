-- Boss alerts: opt-in browser notifications when a boss spawns.
-- AFTER RUNNING THIS FILE, one row must be set by hand (kept out of this public repo): the notification signing keys and scheduler secret.
--   insert into bba_private.push_keys(id, public, private, secret) values (1, 'VAPID PUBLIC KEY', 'VAPID PRIVATE KEY', '48 HEX CHARACTERS');
create extension if not exists pg_net;
create table if not exists bba_private.push_keys (id integer primary key default 1 check (id = 1), public text not null, private text not null, secret text not null);
create table if not exists bba_private.push_subs (endpoint text primary key, p256dh text not null, auth text not null, pid text, created_at timestamptz not null default now());
create table if not exists bba_private.push_outbox (id bigserial primary key, at timestamptz not null default now(), title text not null, body text not null, url text not null default 'https://bigbangarcade.com/', tag text not null default 'boss', taken_at timestamptz);
create table if not exists bba_private.boss_notified (day date not null, idx integer not null, at timestamptz not null default now(), primary key (day, idx));
alter table bba_private.push_keys enable row level security; alter table bba_private.push_subs enable row level security;
alter table bba_private.push_outbox enable row level security; alter table bba_private.boss_notified enable row level security;
revoke all on bba_private.push_keys, bba_private.push_subs, bba_private.push_outbox, bba_private.boss_notified from anon, authenticated;

-- Runs every minute. When a boss has just come out and nobody has been told yet, queue one message and wake the sender.
create or replace function bba_private.push_tick() returns void language plpgsql security definer set search_path = '' as $fn$
declare clk jsonb := bba_private.boss_clock(); d date := (now() at time zone 'America/Chicago')::date; i integer; n integer; k bba_private.push_keys;
  names text[] := array['OVERHEAT','GLITCH','STATIC','TILT','LAG SPIKE','BUG','CRASH','BLUE SCREEN','FIRMWARE','TURBO'];
begin
  if (clk->>'active')::boolean is not true then return; end if;
  i := (clk->>'idx')::integer;
  insert into bba_private.boss_notified(day, idx) values (d, i) on conflict do nothing;
  if not found then return; end if;
  n := ((d - date '1970-01-01') * 3 + i) % 10;
  insert into bba_private.push_outbox(title, body, url) values (
    '👾 ' || names[n + 1] || ' just spawned in Big Bang Arcade',
    case when (clk->>'big')::boolean then 'THE BIG CRUNCH is out too. ' else '' end || 'You have ' || greatest(1, (clk->>'ends_in')::integer / 60) || ' minutes. Beat it for tokens and a loot drop.',
    'https://bigbangarcade.com/?boss=1');
  select * into k from bba_private.push_keys where id = 1;
  if k.secret is not null and exists (select 1 from bba_private.push_subs) then
    perform net.http_post(url := 'https://bigbangarcade.com/api/push', body := jsonb_build_object('secret', k.secret), headers := '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds := 9000);
  end if;
end $fn$;
revoke all on function bba_private.push_tick() from public, anon, authenticated;

create or replace function bba_private.push(a text, b jsonb) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare p bba_private.players; k bba_private.push_keys; note bba_private.push_outbox; ep text := b->>'endpoint';
begin
  if a in ('sub', 'unsub') then
    p := bba_private.authorized_player(b);
    if ep is null or length(ep) > 600 or ep !~ '^https://([a-z0-9-]+\.)*(googleapis\.com|mozilla\.com|windows\.com|apple\.com|mozaws\.net)/' then raise exception 'That browser is not supported for alerts'; end if;
    if a = 'unsub' then delete from bba_private.push_subs where endpoint = ep; return jsonb_build_object('ok', true, 'on', false); end if;
    if coalesce(b->>'p256dh', '') !~ '^[A-Za-z0-9_-]{60,120}$' or coalesce(b->>'auth', '') !~ '^[A-Za-z0-9_-]{16,40}$' then raise exception 'Bad alert keys'; end if;
    if (select count(*) from bba_private.push_subs where pid = p.pid) >= 8 then delete from bba_private.push_subs where endpoint = (select endpoint from bba_private.push_subs where pid = p.pid order by created_at limit 1); end if;
    insert into bba_private.push_subs(endpoint, p256dh, auth, pid) values (ep, b->>'p256dh', b->>'auth', p.pid)
      on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, pid = excluded.pid;
    return jsonb_build_object('ok', true, 'on', true);
  end if;
  select * into k from bba_private.push_keys where id = 1;
  if k.secret is null or b->>'secret' is null or b->>'secret' <> k.secret then raise exception 'not allowed' using errcode = '42501'; end if;
  if a = 'job' then
    update bba_private.push_outbox set taken_at = now() where id = (select id from bba_private.push_outbox where taken_at is null and at > now() - interval '15 minutes' order by id limit 1) returning * into note;
    if note.id is null then return jsonb_build_object('note', null); end if;
    return jsonb_build_object('public', k.public, 'private', k.private, 'note', jsonb_build_object('title', note.title, 'body', note.body, 'url', note.url, 'tag', note.tag),
      'subs', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)) from (select * from bba_private.push_subs order by created_at limit 2000) s), '[]'::jsonb));
  elsif a = 'report' then
    delete from bba_private.push_subs where endpoint in (select jsonb_array_elements_text(coalesce(b->'dead', '[]'::jsonb)));
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'Unknown action';
end $fn$;
revoke all on function bba_private.push(text, jsonb) from public;
grant execute on function bba_private.push(text, jsonb) to anon, authenticated;
create or replace function public.bba_push(p_action text, p_body jsonb default '{}'::jsonb) returns jsonb
language sql set search_path = '' as $fn$ select bba_private.push(p_action, p_body) $fn$;
revoke all on function public.bba_push(text, jsonb) from public;
grant execute on function public.bba_push(text, jsonb) to anon, authenticated;

-- An admin-called boss also sends the alert.
create or replace function public.hub_boss(p_key text, p_minutes integer default 20, p_big boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare d date := (now() at time zone 'America/Chicago')::date; m integer := greatest(1, least(coalesce(p_minutes, 20), 60));
begin
  if p_key is null or not exists (select 1 from bba_private.hub_keys k where k.hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from bba_private.boss_hits where kind = 's9' and period = d; delete from bba_private.bosses where kind = 's9' and period = d; delete from bba_private.boss_notified where day = d and idx = 9;
  insert into bba_private.boss_force(id, until, spot, big, note) values (1, now() + make_interval(mins => m), floor(random() * 4)::integer, coalesce(p_big, false), 'hub')
    on conflict (id) do update set until = excluded.until, spot = excluded.spot, big = excluded.big, note = excluded.note;
  perform bba_private.push_tick();
  return bba_private.boss_clock();
end $fn$;

select cron.unschedule(jobid) from cron.job where jobname = 'bba-boss-alerts';
select cron.schedule('bba-boss-alerts', '* * * * *', $$select bba_private.push_tick()$$);
notify pgrst, 'reload schema';
