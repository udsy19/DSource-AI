-- ============================================================================
-- Migration 0001: scraped_product_list (vendor product catalog)
--
-- Applied to the DSource-AI Supabase project (bojnqensefigniidkblx) on
-- 2026-07-14. Security advisors report 0 issues after apply.
--
-- Schema is derived directly from the app's write paths so it matches exactly:
--   - src/app/api/vendor/upload/route.js  (CSV upsert, onConflict "product_id")
--   - src/app/api/products/route.js       (POST insert)
--   - src/app/api/products/[id]/route.js  (GET/PATCH/DELETE; is_active toggle)
--   - src/utils/product-normalize.js      (types: arrays vs text vs number)
--
-- Access model matches the code (every query is `.eq("created_by", user.id)`):
-- owners read their own rows; only vendors may write their own rows. A public
-- catalog would need an additional public-read policy + route changes.
-- ============================================================================

create table if not exists public.scraped_product_list (
  id            bigint generated always as identity primary key,
  product_id    bigint not null unique, -- business key; CSV upsert conflict target
  product_material_depot_variant_handle text,
  product_name  text not null,
  brand_name    text,
  category_name text,
  color         text,
  color_code    text,
  color_family  text,
  sub_category  text[],
  series_name   text,
  description   text,
  application   text[],
  thickness     text, -- stored as text (sanitizeString), not numeric
  size          text, -- stored as text
  tags          text[],
  image_url     text,
  is_active     boolean not null default true,
  created_by    uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Access-pattern indexes: every query filters by created_by; the detail page
-- groups related items by series_name; get-products filters by category_name.
create index if not exists scraped_product_list_created_by_idx
  on public.scraped_product_list (created_by);
create index if not exists scraped_product_list_created_by_series_idx
  on public.scraped_product_list (created_by, series_name);
create index if not exists scraped_product_list_created_by_category_idx
  on public.scraped_product_list (created_by, category_name);

-- Keep updated_at current on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists set_scraped_product_list_updated_at on public.scraped_product_list;
create trigger set_scraped_product_list_updated_at
  before update on public.scraped_product_list
  for each row
  execute function public.set_updated_at();

-- RLS: a user may read only their own rows; only vendors may write their own
-- rows. The role check reads app_metadata.user_type from the JWT (service-role
-- controlled), matching the app-layer requireVendor() guard.
alter table public.scraped_product_list enable row level security;

drop policy if exists "products_select_own" on public.scraped_product_list;
create policy "products_select_own"
  on public.scraped_product_list
  for select
  using (created_by = auth.uid());

drop policy if exists "products_insert_vendor" on public.scraped_product_list;
create policy "products_insert_vendor"
  on public.scraped_product_list
  for insert
  with check (
    created_by = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'vendor'
  );

drop policy if exists "products_update_vendor" on public.scraped_product_list;
create policy "products_update_vendor"
  on public.scraped_product_list
  for update
  using (
    created_by = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'vendor'
  )
  with check (
    created_by = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'vendor'
  );

drop policy if exists "products_delete_vendor" on public.scraped_product_list;
create policy "products_delete_vendor"
  on public.scraped_product_list
  for delete
  using (
    created_by = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'vendor'
  );
