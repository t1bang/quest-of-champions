-- Big Bang Arcade: a one-time token bonus for making a free account.
-- A guest who signs in (and so has a player linked to a verified sign-in) gets 50 tokens, once per account.
-- The browser calls public.bba_account_bonus() with the signed-in session; asking again gives nothing.
alter table bba_private.players add column if not exists account_bonus_at timestamptz;

create or replace function bba_private.account_bonus() returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare p bba_private.players; uid uuid := auth.uid(); gain constant integer := 50;
begin
  if uid is null or not exists (select 1 from auth.users where id = uid and not is_anonymous) then
    raise exception 'A verified account is required' using errcode = '28000';
  end if;
  select * into p from bba_private.players where user_id = uid for update;
  if p.pid is null then raise exception 'Finish account setup first'; end if;
  if p.account_bonus_at is not null then
    return jsonb_build_object('player', bba_private.player_public(p), 'gained', 0);
  end if;
  update bba_private.players set tokens = tokens + gain, earned = earned + gain, account_bonus_at = now()
    where pid = p.pid returning * into p;
  return jsonb_build_object('player', bba_private.player_public(p), 'gained', gain);
end $fn$;
revoke all on function bba_private.account_bonus() from public, anon;
grant execute on function bba_private.account_bonus() to authenticated;

create or replace function public.bba_account_bonus() returns jsonb
language sql set search_path = '' as $fn$ select bba_private.account_bonus() $fn$;
revoke all on function public.bba_account_bonus() from public, anon;
grant execute on function public.bba_account_bonus() to authenticated;
notify pgrst, 'reload schema';
