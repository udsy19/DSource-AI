-- is_admin only reads the caller's own JWT, so SECURITY INVOKER is correct and
-- avoids the definer-executable advisory. Still callable by authenticated (RLS
-- policies evaluate it as the querying role).
create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'user_type') = 'admin', false);
$$;
