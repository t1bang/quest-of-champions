-- Baseline for a brand-new arcade database. Run this first, then the later migrations in date order.
-- It creates everything the later files assume already exists: the private schema, players, scores,
-- comments, the editable arcade content, the owner list and the art bucket.
create schema if not exists bba_private;
grant usage on schema bba_private to anon, authenticated;

-- Arcade owners: accounts allowed to edit content and see the dashboards.
create table bba_private.owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
create table bba_private.players (
  pid text primary key, kh text not null, name text not null,
  tokens integer not null default 0 check (tokens >= 0), earned integer not null default 0,
  closet jsonb not null default '[]', badge text not null default '',
  day date not null default current_date, did jsonb not null default '{}',
  last_comment timestamptz
);
create table bba_private.scores (
  pid text not null references bba_private.players(pid), game text not null, score bigint not null,
  primary key (pid, game)
);
create index bba_scores_rank on bba_private.scores (game, score desc);
create table bba_private.comments (
  id bigint generated always as identity primary key,
  pid text not null references bba_private.players(pid), game text not null, body text not null,
  created_at timestamptz not null default now()
);
create index bba_comments_recent on bba_private.comments (game, created_at desc);
alter table bba_private.owners enable row level security;
alter table bba_private.players enable row level security;
alter table bba_private.scores enable row level security;
alter table bba_private.comments enable row level security;
revoke all on bba_private.owners, bba_private.players, bba_private.scores, bba_private.comments from anon, authenticated;

create or replace function bba_private.is_owner() returns boolean
language sql stable security definer set search_path to '' as $$
  select auth.uid() is not null and exists(select 1 from bba_private.owners where user_id = auth.uid());
$$;
revoke all on function bba_private.is_owner() from public;
grant execute on function bba_private.is_owner() to anon, authenticated;
create or replace function public.bba_is_owner() returns boolean
language sql stable set search_path to '' as $$select bba_private.is_owner();$$;
revoke all on function public.bba_is_owner() from public;
grant execute on function public.bba_is_owner() to anon, authenticated, service_role;

-- Editable arcade content: one draft row and one published row.
create table public.bba_content (
  id text primary key check (id in ('draft', 'published')),
  revision integer not null default 1,
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) < 250000),
  updated_at timestamptz not null default now()
);
create table public.bba_content_history (
  revision integer primary key, content jsonb not null,
  created_at timestamptz not null default now(), created_by uuid
);
alter table public.bba_content enable row level security;
alter table public.bba_content_history enable row level security;
revoke all on public.bba_content, public.bba_content_history from anon, authenticated;
grant select on public.bba_content to anon, authenticated;
grant select on public.bba_content_history to authenticated;
grant all on public.bba_content, public.bba_content_history to service_role;
create policy bba_content_read on public.bba_content for select to anon, authenticated
  using (id = 'published' or (select bba_private.is_owner()));
create policy bba_history_owner on public.bba_content_history for select to authenticated
  using ((select bba_private.is_owner()));

create or replace function bba_private.save_content(p_content jsonb, p_expected integer, p_publish boolean) returns jsonb
language plpgsql security definer set search_path to '' as $$
 declare current_revision integer; next_revision integer; g jsonb; slots text[]:=array[]::text[]; slot text;
 begin
 if not bba_private.is_owner() then raise exception 'Owner access required' using errcode='42501';end if;
 select revision into current_revision from public.bba_content where id='draft' for update;
 if current_revision is distinct from p_expected then raise exception 'The draft changed in another window. Reload before saving.' using errcode='40001';end if;
 if jsonb_typeof(p_content->'games') is distinct from 'array' or jsonb_typeof(p_content->'prizes') is distinct from 'array' or jsonb_typeof(p_content->'wall') is distinct from 'object' then raise exception 'Invalid arcade layout';end if;
 if jsonb_array_length(p_content->'games')>40 or jsonb_array_length(p_content->'prizes')>60 then raise exception 'Layout limit exceeded';end if;
 for g in select value from jsonb_array_elements(p_content->'games') loop
  if coalesce(g->>'id','') !~ '^[a-z][a-z0-9-]{1,47}$' or coalesce(g->>'room','') not in ('main','lab','lounge','gallery') or (g->>'slot')::int not between 0 and 11 then raise exception 'Invalid cabinet';end if;
  slot:=(g->>'room')||':'||(g->>'slot');if g->>'status'<>'hidden' then if slot=any(slots) then raise exception 'Cabinet slots overlap';end if;slots:=array_append(slots,slot);end if;
 end loop;
 next_revision:=current_revision+1;
 update public.bba_content set content=p_content,revision=next_revision,updated_at=now() where id='draft';
 if p_publish then
  insert into public.bba_content_history(revision,content,created_by) select revision,content,auth.uid() from public.bba_content where id='published' on conflict do nothing;
  update public.bba_content set content=p_content,revision=next_revision,updated_at=now() where id='published';
 end if;
 return jsonb_build_object('revision',next_revision,'published',p_publish);
 end;$$;
revoke all on function bba_private.save_content(jsonb, integer, boolean) from public;
grant execute on function bba_private.save_content(jsonb, integer, boolean) to authenticated;
create or replace function public.bba_save_content(p_content jsonb, p_expected integer, p_publish boolean default false) returns jsonb
language sql set search_path to '' as $$select bba_private.save_content(p_content,p_expected,p_publish);$$;
revoke all on function public.bba_save_content(jsonb, integer, boolean) from public;
grant execute on function public.bba_save_content(jsonb, integer, boolean) to anon, authenticated, service_role;

-- Art bucket: public to read by link, owner-only to manage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bba-assets', 'bba-assets', true, 12582912, array['image/png','image/jpeg','image/webp','model/gltf-binary','application/octet-stream'])
on conflict (id) do nothing;
create policy bba_bucket_read on storage.buckets for select to authenticated using (id = 'bba-assets' and (select bba_private.is_owner()));
create policy bba_bucket_create on storage.buckets for insert to authenticated with check (id = 'bba-assets' and (select bba_private.is_owner()));
create policy bba_assets_read on storage.objects for select to authenticated using (bucket_id = 'bba-assets' and (select bba_private.is_owner()));
create policy bba_assets_insert on storage.objects for insert to authenticated with check (bucket_id = 'bba-assets' and (select bba_private.is_owner()) and storage.extension(name) = any (array['png','jpg','jpeg','webp','glb']));
create policy bba_assets_update on storage.objects for update to authenticated using (bucket_id = 'bba-assets' and (select bba_private.is_owner())) with check (bucket_id = 'bba-assets' and (select bba_private.is_owner()));
create policy bba_assets_delete on storage.objects for delete to authenticated using (bucket_id = 'bba-assets' and (select bba_private.is_owner()));
