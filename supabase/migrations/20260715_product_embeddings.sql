-- Reverse material search: CLIP embeddings on the product catalog + a
-- cosine nearest-neighbor RPC. Apply in the Supabase SQL editor, then run
-- `node scripts/backfill-embeddings.mjs` to embed existing products.
-- Embeddings are CLIP ViT-L/14 (768 dims) via Replicate andreasjansson/clip-features —
-- the SAME model must embed catalog images and query crops.

create extension if not exists vector;

alter table public.scraped_product_list
  add column if not exists embedding vector(768);

-- HNSW cosine index; builds incrementally, fine to create before backfill.
create index if not exists scraped_product_list_embedding_idx
  on public.scraped_product_list
  using hnsw (embedding vector_cosine_ops);

-- Nearest-neighbor match scoped to the calling user's own catalog.
-- ids are returned as text to stay agnostic of the table's numeric types.
create or replace function public.match_products(
  query_embedding vector(768),
  match_count int default 8,
  filter_category text default null
)
returns table (
  id text,
  product_id text,
  product_name text,
  brand_name text,
  category_name text,
  color text,
  color_family text,
  series_name text,
  image_url text,
  similarity double precision
)
language sql
stable
as $$
  select
    p.id::text,
    p.product_id::text,
    p.product_name,
    p.brand_name,
    p.category_name,
    p.color,
    p.color_family,
    p.series_name,
    p.image_url,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.scraped_product_list p
  where p.embedding is not null
    and p.created_by = auth.uid()
    and (
      filter_category is null
      or p.category_name ilike '%' || filter_category || '%'
    )
  order by p.embedding <=> query_embedding
  limit least(match_count, 20);
$$;
