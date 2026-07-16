create schema if not exists extensions;
create extension if not exists vector schema extensions;

alter table public.visualizer_board_items
  add column if not exists embedding vector(768);

create table if not exists public.board_embeddings (
  board_id uuid primary key
    references public.visualizer_boards (id) on delete cascade,
  embedding vector(768) not null,
  item_count int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists board_embeddings_embedding_idx
  on public.board_embeddings
  using hnsw (embedding vector_cosine_ops);

create table if not exists public.user_taste_vectors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  embedding vector(768) not null,
  mass double precision not null default 1,
  sample_count int not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text,
  event_type text not null check (
    event_type in (
      'feed_load', 'impression', 'dwell', 'click', 'close_up',
      'save', 'unsave', 'hide', 'object_select', 'match_view',
      'match_click', 'search', 'taste_pick'
    )
  ),
  product_id bigint,
  item_key text,
  board_id uuid,
  position int,
  candidate_source text,
  similarity double precision,
  dwell_ms int,
  query text,
  crop jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feed_events_user_created_idx
  on public.feed_events (user_id, created_at desc);
create index if not exists feed_events_type_created_idx
  on public.feed_events (event_type, created_at desc);
create index if not exists feed_events_product_idx
  on public.feed_events (product_id)
  where product_id is not null;

alter table public.board_embeddings enable row level security;

drop policy if exists "own board embeddings select" on public.board_embeddings;
create policy "own board embeddings select" on public.board_embeddings
  for select using (
    exists (
      select 1 from public.visualizer_boards b
      where b.id = board_id and b.created_by = auth.uid()
    )
  );

alter table public.user_taste_vectors enable row level security;

drop policy if exists "own taste vector select" on public.user_taste_vectors;
create policy "own taste vector select" on public.user_taste_vectors
  for select using (auth.uid() = user_id);

alter table public.feed_events enable row level security;

drop policy if exists "own feed events insert" on public.feed_events;
create policy "own feed events insert" on public.feed_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "own feed events select" on public.feed_events;
create policy "own feed events select" on public.feed_events
  for select using (auth.uid() = user_id);

create table if not exists public.inspiration_items (
  id bigint generated always as identity primary key,
  source text not null default 'material_bank',
  source_id text not null,
  title text,
  brand text,
  category text,
  image_url text not null,
  price_inr numeric,
  price_unit text,
  supplier_domain text,
  source_url text,
  tags text[],
  embedding vector(768),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists inspiration_items_embedding_idx
  on public.inspiration_items
  using hnsw (embedding vector_cosine_ops);

create index if not exists inspiration_items_category_idx
  on public.inspiration_items (category)
  where is_active;

alter table public.inspiration_items enable row level security;

drop policy if exists "inspiration read for authed" on public.inspiration_items;
create policy "inspiration read for authed" on public.inspiration_items
  for select using (auth.uid() is not null);

create or replace function public.match_inspiration(
  query_embedding vector(768),
  match_count int default 24,
  exclude_ids bigint[] default '{}',
  filter_category text default null
)
returns table (
  id bigint,
  source text,
  source_id text,
  title text,
  brand text,
  category text,
  image_url text,
  price_inr numeric,
  price_unit text,
  supplier_domain text,
  source_url text,
  similarity double precision
)
language sql
stable
set search_path = extensions
as $$
  select
    p.id,
    p.source,
    p.source_id,
    p.title,
    p.brand,
    p.category,
    p.image_url,
    p.price_inr,
    p.price_unit,
    p.supplier_domain,
    p.source_url,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.inspiration_items p
  where p.embedding is not null
    and p.is_active
    and not (p.id = any (exclude_ids))
    and (
      filter_category is null
      or p.category ilike '%' || filter_category || '%'
    )
  order by p.embedding <=> query_embedding
  limit least(match_count, 100);
$$;

create or replace view public.product_save_counts
with (security_invoker = true) as
  select
    coalesce(product_id::text, item_key) as item_ref,
    count(*)::bigint as saves
  from public.feed_events
  where event_type = 'save'
    and (product_id is not null or item_key is not null)
  group by 1;
