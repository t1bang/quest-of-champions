-- The public entry point the site calls for arcade actions (join, earn, buy, boards, comments).
-- Runs last because it needs bba_private.arcade from the earlier migrations.
revoke all on function bba_private.arcade(text, jsonb, text) from public;
grant execute on function bba_private.arcade(text, jsonb, text) to anon, authenticated;
create or replace function public.bba_arcade(p_action text, p_body jsonb default '{}', p_game text default null) returns jsonb
language sql set search_path to '' as $$select bba_private.arcade(p_action,p_body,p_game);$$;
revoke all on function public.bba_arcade(text, jsonb, text) from public;
grant execute on function public.bba_arcade(text, jsonb, text) to anon, authenticated, service_role;
