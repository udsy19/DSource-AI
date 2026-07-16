-- Material Finder: search history.
--
-- WHAT IS DELIBERATELY NOT HERE: the offers.
--
-- We persist the INPUT and the RESOLVED IDENTITY only, never the seller list.
-- That is a licensing constraint, not an oversight:
--
--   * Shopify's Global Catalog terms say "Don't cache or re-use images" and
--     "Don't cache search results"; catalog images must render in real time.
--   * Amazon's affiliate licence bars storing or caching product images at all
--     (link only, <=24h), and bars "aggregating, analyzing, extracting, or
--     repurposing" the content — a plain-language bar on building an index.
--
-- So re-opening a saved search re-runs the fan-out live. If you are about to
-- add an `offers` table here to make that faster, read those terms first.
--
-- The identity itself is ours to keep: a GTIN is a fact about a product, not
-- anyone's copyrighted content.

create table if not exists public.finder_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Exactly one of these is set; the check below enforces it.
  input_type text not null check (input_type in ('url', 'image')),
  input_url text,

  -- Storage path of the query image, if the search started from a photo.
  -- The object itself is deleted right after the search — a user's photo of
  -- their own room is not ours to keep — so this is a record of what was
  -- searched, not a live pointer.
  image_path text,

  -- The resolved product: title, brand, gtin, mpn, asin, findability, note.
  identity jsonb,

  -- 'identifier' | 'branded' | 'generic'. Denormalized out of `identity`
  -- because it is the one field worth querying: it tells us what share of real
  -- searches had anything exact to match on, which is the single most useful
  -- number for deciding where to take this feature next.
  findability text check (findability in ('identifier', 'branded', 'generic')),

  created_at timestamptz not null default now(),

  constraint finder_searches_input_present check (
    (input_type = 'url' and input_url is not null)
    or (input_type = 'image')
  )
);

create index if not exists finder_searches_user_created_idx
  on public.finder_searches (user_id, created_at desc);

alter table public.finder_searches enable row level security;

create policy "Users read their own searches"
  on public.finder_searches for select
  using (auth.uid() = user_id);

create policy "Users create their own searches"
  on public.finder_searches for insert
  with check (auth.uid() = user_id);

create policy "Users delete their own searches"
  on public.finder_searches for delete
  using (auth.uid() = user_id);
