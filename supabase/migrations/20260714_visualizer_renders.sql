-- AI Visualizer render history: metadata table + private storage bucket.
-- Apply in the Supabase SQL editor (or `supabase db push`) before using
-- render history. The app degrades gracefully (no history, notice shown)
-- until this is applied.

create table if not exists public.visualizer_renders (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  mode text not null default 'render',
  model text not null,
  prompt text,
  composed_prompt text not null,
  params jsonb not null default '{}'::jsonb,
  image_path text not null,
  adherence jsonb,
  is_public boolean not null default false
);

create index if not exists visualizer_renders_created_by_created_at_idx
  on public.visualizer_renders (created_by, created_at desc);

alter table public.visualizer_renders enable row level security;

drop policy if exists "own renders select" on public.visualizer_renders;
create policy "own renders select" on public.visualizer_renders
  for select using (auth.uid() = created_by);

drop policy if exists "own renders insert" on public.visualizer_renders;
create policy "own renders insert" on public.visualizer_renders
  for insert with check (auth.uid() = created_by);

drop policy if exists "own renders delete" on public.visualizer_renders;
create policy "own renders delete" on public.visualizer_renders
  for delete using (auth.uid() = created_by);

-- Private bucket; objects live under {user_id}/{render_id}.{ext}
insert into storage.buckets (id, name, public)
values ('visualizer-renders', 'visualizer-renders', false)
on conflict (id) do nothing;

drop policy if exists "own render objects select" on storage.objects;
create policy "own render objects select" on storage.objects
  for select using (
    bucket_id = 'visualizer-renders'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own render objects insert" on storage.objects;
create policy "own render objects insert" on storage.objects
  for insert with check (
    bucket_id = 'visualizer-renders'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own render objects delete" on storage.objects;
create policy "own render objects delete" on storage.objects
  for delete using (
    bucket_id = 'visualizer-renders'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
