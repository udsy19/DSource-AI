-- Migration: Enable Row Level Security on scraped_product_list
--
-- REVIEW REQUIRED — DO NOT AUTO-APPLY.
-- This migration is authored for manual review only. Apply it deliberately via
-- the Supabase SQL editor or the Supabase CLI after review. It is NOT applied
-- automatically by the application or any CI step.
--
-- Model:
--   * Every row is owned by the user referenced in created_by.
--   * A user may only see/act on their own rows (created_by = auth.uid()).
--   * Writes (INSERT/UPDATE/DELETE) are additionally restricted to accounts that
--     carry the vendor role in app_metadata. app_metadata is only settable with
--     the service-role key, so it is trustworthy for authorization; user_metadata
--     is user-controlled and must never be trusted.

alter table public.scraped_product_list enable row level security;

-- SELECT: owners can read their own rows.
create policy "scraped_product_list_select_own"
  on public.scraped_product_list
  for select
  using (created_by = auth.uid());

-- INSERT: only vendors, and only rows they own.
create policy "scraped_product_list_insert_vendor_own"
  on public.scraped_product_list
  for insert
  with check (
    created_by = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'vendor'
  );

-- UPDATE: only vendors, and only their own rows (both before and after change).
create policy "scraped_product_list_update_vendor_own"
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

-- DELETE: only vendors, and only their own rows.
create policy "scraped_product_list_delete_vendor_own"
  on public.scraped_product_list
  for delete
  using (
    created_by = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'vendor'
  );
