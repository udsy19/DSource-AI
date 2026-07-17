-- search_path = '' broke <=> resolution after vector moved to the
-- extensions schema; pin to that schema instead (still non-mutable).
alter function public.match_products(extensions.vector, int, text)
  set search_path = extensions;
