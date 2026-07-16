-- Folios: every home/client is a project; renders can be filed into a
-- project under a room label. Unfiled renders stay on the studio floor
-- (the existing history strip). Zero migration for existing data — the new
-- render columns are nullable, and the app degrades gracefully (empty
-- folios, hidden actions) until this is applied.

create table if not exists public.visualizer_projects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  client_name text,
  address text,
  cover_render_id uuid references public.visualizer_renders (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visualizer_project_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.visualizer_projects (id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

-- Filing metadata on renders. All nullable/defaulted: existing rows need
-- no backfill and keep behaving exactly as before.
alter table public.visualizer_renders
  add column if not exists project_id uuid references public.visualizer_projects (id) on delete set null,
  add column if not exists room_id uuid references public.visualizer_project_rooms (id) on delete set null,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists visualizer_renders_owner_project_created_idx
  on public.visualizer_renders (created_by, project_id, created_at desc);

create index if not exists visualizer_renders_favorites_idx
  on public.visualizer_renders (created_by, created_at desc)
  where is_favorite;

create index if not exists visualizer_projects_owner_status_updated_idx
  on public.visualizer_projects (created_by, status, updated_at desc);

create index if not exists visualizer_project_rooms_project_idx
  on public.visualizer_project_rooms (project_id, sort_order);

alter table public.visualizer_projects enable row level security;
alter table public.visualizer_project_rooms enable row level security;

drop policy if exists "own projects select" on public.visualizer_projects;
create policy "own projects select" on public.visualizer_projects
  for select using (auth.uid() = created_by);

drop policy if exists "own projects insert" on public.visualizer_projects;
create policy "own projects insert" on public.visualizer_projects
  for insert with check (auth.uid() = created_by);

drop policy if exists "own projects update" on public.visualizer_projects;
create policy "own projects update" on public.visualizer_projects
  for update using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "own projects delete" on public.visualizer_projects;
create policy "own projects delete" on public.visualizer_projects
  for delete using (auth.uid() = created_by);

-- Rooms are owned through their parent project.
drop policy if exists "own project rooms select" on public.visualizer_project_rooms;
create policy "own project rooms select" on public.visualizer_project_rooms
  for select using (
    exists (
      select 1 from public.visualizer_projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  );

drop policy if exists "own project rooms insert" on public.visualizer_project_rooms;
create policy "own project rooms insert" on public.visualizer_project_rooms
  for insert with check (
    exists (
      select 1 from public.visualizer_projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  );

drop policy if exists "own project rooms update" on public.visualizer_project_rooms;
create policy "own project rooms update" on public.visualizer_project_rooms
  for update using (
    exists (
      select 1 from public.visualizer_projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.visualizer_projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  );

drop policy if exists "own project rooms delete" on public.visualizer_project_rooms;
create policy "own project rooms delete" on public.visualizer_project_rooms
  for delete using (
    exists (
      select 1 from public.visualizer_projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  );

-- The original renders migration only created select/insert/delete policies;
-- filing (project_id/room_id), favorites, and archive need owner updates.
drop policy if exists "own renders update" on public.visualizer_renders;
create policy "own renders update" on public.visualizer_renders
  for update using (auth.uid() = created_by)
  with check (auth.uid() = created_by);
