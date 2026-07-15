-- ============================================================================
-- Migration 0002: profiles table + role mirror
--
-- REVIEW AND APPLY MANUALLY (Supabase SQL editor / CLI / MCP). Not auto-run.
--
-- Creates public.profiles as a queryable mirror of auth.users, keeps a `role`
-- column in sync with app_metadata.user_type, and auto-creates a profile row
-- for every new signup. The AUTHORITATIVE role remains app_metadata.user_type
-- (set only via the service-role key); this table is defense-in-depth + joins.
-- ============================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'user' check (role in ('user', 'vendor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may read only their own profile. No client writes: the profile is
-- managed by the signup trigger and the service-role admin endpoint.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Auto-create a profile whenever a new auth user is created. security definer so
-- it can write to public.profiles regardless of the caller.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data ->> 'user_type', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for any users that already exist.
insert into public.profiles (id, email, role)
select
  u.id,
  u.email,
  coalesce(u.raw_app_meta_data ->> 'user_type', 'user')
from auth.users u
on conflict (id) do nothing;
