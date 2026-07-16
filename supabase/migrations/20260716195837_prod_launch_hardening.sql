-- Production-launch hardening (internal deployment):
-- 1. Server-side signup gate — DSource is invite-only. New auth.users rows are
--    rejected unless the email is @dsource.ai or present in signup_allowlist.
--    The signup page shows a friendly invite-only message client-side; this
--    trigger is the enforcement (client gates are bypassable against the
--    public GoTrue endpoint). To invite someone:
--      insert into public.signup_allowlist (email) values ('person@example.com');
--    Note: admin-API-created users pass through the same trigger, so allowlist
--    an email before provisioning it.
-- 2. Drop contact_messages — the help-center form became a mailto: link; the
--    table (0 rows) and its public-insert policy are unused and the policy
--    trips the rls_policy_always_true advisor.
-- 3. Cover the FK indexes flagged by the performance advisor on real access
--    paths (renders listed by project/room) plus the remaining FK gaps.

-- 1. Signup allowlist
create table if not exists public.signup_allowlist (
  email text primary key check (email = lower(email)),
  note text,
  added_at timestamptz not null default now()
);

-- RLS with no policies: readable/writable only via service role (dashboard,
-- SQL editor, or a future admin surface).
alter table public.signup_allowlist enable row level security;

insert into public.signup_allowlist (email, note)
values ('udayatejas2004@gmail.com', 'owner')
on conflict (email) do nothing;

create or replace function public.enforce_signup_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(split_part(new.email, '@', 2)) = 'dsource.ai'
     or exists (
       select 1 from public.signup_allowlist a
       where a.email = lower(new.email)
     ) then
    return new;
  end if;
  raise exception 'signup not allowed';
end;
$$;

revoke execute on function public.enforce_signup_allowlist() from public, anon, authenticated;

drop trigger if exists enforce_signup_allowlist on auth.users;
create trigger enforce_signup_allowlist
  before insert on auth.users
  for each row execute function public.enforce_signup_allowlist();

-- 2. Remove the unused contact surface
drop policy if exists "Allow public inserts" on public.contact_messages;
drop table if exists public.contact_messages;

-- 3. FK indexes
create index if not exists visualizer_renders_project_idx on public.visualizer_renders (project_id);
create index if not exists visualizer_renders_room_idx on public.visualizer_renders (room_id);
create index if not exists admin_audit_admin_idx on public.admin_audit (admin_id);
create index if not exists generated_designs_generation_event_idx on public.generated_designs (generation_event_id);
create index if not exists visualizer_projects_cover_render_idx on public.visualizer_projects (cover_render_id);
