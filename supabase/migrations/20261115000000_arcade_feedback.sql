-- Bartender feedback: players tell the bartender what they think, by text or a short voice note.
-- Every message is saved here and emailed to the arcade admin by the website the moment it arrives.
create table if not exists bba_private.feedback (
  id bigserial primary key, at timestamptz not null default now(), pid text not null, name text not null, about text not null default 'arcade',
  body text not null default '', transcript text not null default '', secs integer not null default 0, mime text, audio text, emailed boolean not null default false);
alter table bba_private.feedback enable row level security;
revoke all on bba_private.feedback from anon, authenticated;

create or replace function bba_private.feedback(a text, b jsonb) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare p bba_private.players; fid bigint; txt text; tr text; ab text; au text; mm text;
begin
  p := bba_private.authorized_player(b);
  if a = 'save' then
    txt := left(trim(coalesce(b->>'text', '')), 2000); tr := left(trim(coalesce(b->>'transcript', '')), 2000);
    ab := left(regexp_replace(coalesce(b->>'about', 'arcade'), '[^A-Za-z0-9 _-]', '', 'g'), 40); if ab = '' then ab := 'arcade'; end if;
    au := b->>'audio'; mm := b->>'mime';
    if au is not null and (length(au) > 1400000 or au !~ '^[A-Za-z0-9+/=]+$' or coalesce(mm, '') !~ '^audio/(webm|mp4|ogg|mpeg|wav)') then raise exception 'That recording could not be used'; end if;
    if txt = '' and tr = '' and au is null then raise exception 'Say or type something first'; end if;
    if (select count(*) from bba_private.feedback where pid = p.pid and at > now() - interval '1 hour') >= 6 then raise exception 'The bartender has plenty from you for now. Try again in a bit.'; end if;
    insert into bba_private.feedback(pid, name, about, body, transcript, secs, mime, audio)
      values (p.pid, p.name, ab, txt, tr, greatest(0, least(120, coalesce((b->>'secs')::integer, 0))), case when au is null then null else left(mm, 40) end, au) returning id into fid;
    return jsonb_build_object('id', fid, 'name', p.name, 'linked', p.user_id is not null, 'earned', p.earned, 'about', ab, 'text', txt, 'transcript', tr);
  elsif a = 'sent' then
    update bba_private.feedback set emailed = true where id = (b->>'id')::bigint and pid = p.pid;
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'Unknown action';
end $fn$;
revoke all on function bba_private.feedback(text, jsonb) from public;
grant execute on function bba_private.feedback(text, jsonb) to anon, authenticated;
create or replace function public.bba_feedback(p_action text, p_body jsonb default '{}'::jsonb) returns jsonb
language sql set search_path = '' as $fn$ select bba_private.feedback(p_action, p_body) $fn$;
revoke all on function public.bba_feedback(text, jsonb) from public;
grant execute on function public.bba_feedback(text, jsonb) to anon, authenticated;

-- Hub: the feedback list (newest first), or one message with its recording when p_id is given.
create or replace function public.hub_feedback(p_key text, p_id bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
begin
  if p_key is null or not exists (select 1 from bba_private.hub_keys k where k.hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_id is not null then return (select jsonb_build_object('id', id, 'mime', mime, 'audio', audio) from bba_private.feedback where id = p_id); end if;
  return coalesce((select jsonb_agg(x) from (select id, at, name, about, body, transcript, secs, audio is not null as voice, emailed from bba_private.feedback order by id desc limit 200) x), '[]'::jsonb);
end $fn$;
revoke all on function public.hub_feedback(text, bigint) from public;
grant execute on function public.hub_feedback(text, bigint) to anon, authenticated;
notify pgrst, 'reload schema';
