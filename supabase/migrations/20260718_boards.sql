-- The Pinning Table: freeform mood boards + their pinned items.
-- Apply in the Supabase SQL editor (or `supabase db push`) before using
-- boards. The app degrades gracefully ("sketch mode", nothing saved) until
-- this is applied. Covers reuse the existing private visualizer-renders
-- bucket (see 20260714_visualizer_renders.sql for its policies).

create table if not exists public.visualizer_boards (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  -- Plain uuid on purpose: the projects table ships in a parallel migration
  -- and may not exist yet, so no foreign key here.
  project_id uuid,
  name text not null default 'Untitled board',
  aspect text not null default '4:3',
  palette jsonb,
  -- Storage path of the board cover inside the visualizer-renders bucket.
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visualizer_boards_created_by_updated_at_idx
  on public.visualizer_boards (created_by, updated_at desc);

create table if not exists public.visualizer_board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.visualizer_boards (id) on delete cascade,
  kind text not null check (kind in ('product', 'swatch', 'text', 'image')),
  -- Live catalog reference (scraped_product_list.id) for kind = 'product'.
  product_id bigint,
  image_url text,
  -- Normalized 0..1 coordinates (center) and width; height is null for
  -- natural-aspect items (images size themselves).
  x float8 not null default 0.5,
  y float8 not null default 0.5,
  w float8 not null default 0.25,
  h float8,
  rotation float8 not null default 0,
  z int not null default 0,
  caption text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visualizer_board_items_board_id_z_idx
  on public.visualizer_board_items (board_id, z);

-- RLS: boards are owner-only; items inherit access through their board.

alter table public.visualizer_boards enable row level security;

drop policy if exists "own boards select" on public.visualizer_boards;
create policy "own boards select" on public.visualizer_boards
  for select using (auth.uid() = created_by);

drop policy if exists "own boards insert" on public.visualizer_boards;
create policy "own boards insert" on public.visualizer_boards
  for insert with check (auth.uid() = created_by);

drop policy if exists "own boards update" on public.visualizer_boards;
create policy "own boards update" on public.visualizer_boards
  for update using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "own boards delete" on public.visualizer_boards;
create policy "own boards delete" on public.visualizer_boards
  for delete using (auth.uid() = created_by);

alter table public.visualizer_board_items enable row level security;

drop policy if exists "own board items select" on public.visualizer_board_items;
create policy "own board items select" on public.visualizer_board_items
  for select using (
    exists (
      select 1 from public.visualizer_boards b
      where b.id = board_id and b.created_by = auth.uid()
    )
  );

drop policy if exists "own board items insert" on public.visualizer_board_items;
create policy "own board items insert" on public.visualizer_board_items
  for insert with check (
    exists (
      select 1 from public.visualizer_boards b
      where b.id = board_id and b.created_by = auth.uid()
    )
  );

drop policy if exists "own board items update" on public.visualizer_board_items;
create policy "own board items update" on public.visualizer_board_items
  for update using (
    exists (
      select 1 from public.visualizer_boards b
      where b.id = board_id and b.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.visualizer_boards b
      where b.id = board_id and b.created_by = auth.uid()
    )
  );

drop policy if exists "own board items delete" on public.visualizer_board_items;
create policy "own board items delete" on public.visualizer_board_items
  for delete using (
    exists (
      select 1 from public.visualizer_boards b
      where b.id = board_id and b.created_by = auth.uid()
    )
  );
