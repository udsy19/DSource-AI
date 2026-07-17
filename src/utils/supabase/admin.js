import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/utils/env";

/**
 * Service-role Supabase client for privileged, server-only operations
 * (e.g. granting roles via app_metadata). NEVER import this into client code:
 * the service-role key bypasses Row Level Security. The env getters enforce
 * this — they throw in the browser and when the vars are unset.
 */
export function createAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
