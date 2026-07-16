-- ============================================================================
-- Migration 0003: admin control plane — role, RLS carve-outs, capture tables,
-- storage buckets.
--
-- Adds a first-class `admin` role, an is_admin() function used by RLS to grant
-- admins read/write across all users' data, revocation columns on profiles, and
-- the data-capture layer (AI events, generated designs, uploads, activity,
-- admin audit) that the admin dashboard reads. Applied to the DSource-AI project.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Admin role: widen the profiles role CHECK and add revocation columns
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'vendor', 'admin'));

alter table public.profiles
  add column if not exists banned        boolean not null default false,
  add column if not exists banned_reason text,
  add column if not exists banned_at     timestamptz,
  add column if not exists last_seen_at  timestamptz;

-- ---------------------------------------------------------------------------
-- 2. is_admin(): true when the JWT's app_metadata role is 'admin'.
--    Used by RLS policies below. app_metadata is service-role-only, so this
--    cannot be spoofed by a user. (The app layer also honors an ADMIN_EMAILS
--    break-glass allowlist, enforced separately via requireAdmin.)
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER: the function only reads the caller's own request JWT, so it
-- needs no elevated rights, and invoker avoids the definer-executable advisory.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'user_type') = 'admin', false);
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Admin carve-outs on existing owner-scoped tables (added as separate
--    permissive policies — they OR with the existing owner policies).
-- ---------------------------------------------------------------------------
-- profiles: admins can read and update every profile (needed for ban/role UI).
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- scraped_product_list: admins can read / update / delete every product.
drop policy if exists "products_admin_select" on public.scraped_product_list;
create policy "products_admin_select" on public.scraped_product_list
  for select using (public.is_admin());

drop policy if exists "products_admin_update" on public.scraped_product_list;
create policy "products_admin_update" on public.scraped_product_list
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.scraped_product_list;
create policy "products_admin_delete" on public.scraped_product_list
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Capture tables. Each: owner inserts/reads own rows; admins read all;
--    admins may update/delete (moderation). RLS enabled on every table.
-- ---------------------------------------------------------------------------

-- 4a. AI generation events (one row per /api/generate-image call)
create table if not exists public.ai_generation_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  model           text,
  prompt          text,
  enhanced_prompt text,
  space_type      text,
  style           text,
  lighting        text,
  color_palette   text,
  input_image_path text,
  status          text not null default 'success',
  error_code      text,
  latency_ms      integer,
  input_tokens    integer,
  output_tokens   integer,
  ip              inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

-- 4b. AI analysis events (one row per /api/analyze-image call)
create table if not exists public.ai_analysis_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  model              text,
  input_image_path   text,
  is_interior        boolean,
  space_type         text,
  overall_confidence numeric,
  detected_categories jsonb,
  summary            text,
  status             text not null default 'success',
  error_code         text,
  latency_ms         integer,
  input_tokens       integer,
  ip                 inet,
  user_agent         text,
  created_at         timestamptz not null default now()
);

-- 4c. Generated designs (every AI image produced — the retrievable gallery)
create table if not exists public.generated_designs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  generation_event_id uuid references public.ai_generation_events (id) on delete set null,
  storage_path        text not null,
  thumbnail_path      text,
  prompt              text,
  source_image_path   text,
  width               integer,
  height              integer,
  is_deleted          boolean not null default false,
  created_at          timestamptz not null default now()
);

-- 4d. Room uploads (every uploaded source photo)
create table if not exists public.room_uploads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type    text,
  size_bytes   integer,
  source       text,
  created_at   timestamptz not null default now()
);

-- 4e. Activity events (generic per-user history)
create table if not exists public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  event_type  text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  ip          inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- 4f. Admin audit (every privileged admin action)
create table if not exists public.admin_audit (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references auth.users (id) on delete set null,
  action         text not null,
  target_user_id uuid,
  target_type    text,
  target_id      text,
  before         jsonb,
  after          jsonb,
  created_at     timestamptz not null default now()
);

-- Indexes for the dashboard's per-user + recency queries.
create index if not exists ai_generation_events_user_time_idx on public.ai_generation_events (user_id, created_at desc);
create index if not exists ai_analysis_events_user_time_idx   on public.ai_analysis_events (user_id, created_at desc);
create index if not exists generated_designs_user_time_idx    on public.generated_designs (user_id, created_at desc);
create index if not exists room_uploads_user_time_idx         on public.room_uploads (user_id, created_at desc);
create index if not exists activity_events_user_time_idx      on public.activity_events (user_id, created_at desc);
create index if not exists activity_events_type_time_idx      on public.activity_events (event_type, created_at desc);
create index if not exists admin_audit_time_idx               on public.admin_audit (created_at desc);

-- RLS: owner insert/select own; admin select all; admin update/delete.
do $$
declare t text;
begin
  foreach t in array array[
    'ai_generation_events','ai_analysis_events','generated_designs',
    'room_uploads','activity_events'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', t);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert to authenticated with check (user_id = auth.uid());', t);
    execute format('drop policy if exists "%1$s_select_own_or_admin" on public.%1$s;', t);
    execute format('create policy "%1$s_select_own_or_admin" on public.%1$s for select to authenticated using (user_id = auth.uid() or public.is_admin());', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$s;', t);
    execute format('create policy "%1$s_admin_write" on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin());', t);
    execute format('drop policy if exists "%1$s_admin_delete" on public.%1$s;', t);
    execute format('create policy "%1$s_admin_delete" on public.%1$s for delete to authenticated using (public.is_admin());', t);
  end loop;
end $$;

-- admin_audit: admin-only insert + read; no update/delete (append-only).
alter table public.admin_audit enable row level security;
drop policy if exists "admin_audit_admin_insert" on public.admin_audit;
create policy "admin_audit_admin_insert" on public.admin_audit
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admin_audit_admin_select" on public.admin_audit;
create policy "admin_audit_admin_select" on public.admin_audit
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Storage buckets for captured images (private) + owner/admin policies.
--    Path convention: "{user_id}/{filename}".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('room-uploads', 'room-uploads', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('generated-designs', 'generated-designs', false)
  on conflict (id) do nothing;

drop policy if exists "capture_upload_own" on storage.objects;
create policy "capture_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('room-uploads', 'generated-designs')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "capture_read_own_or_admin" on storage.objects;
create policy "capture_read_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('room-uploads', 'generated-designs')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "capture_admin_delete" on storage.objects;
create policy "capture_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('room-uploads', 'generated-designs') and public.is_admin()
  );
