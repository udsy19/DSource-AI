import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/utils/env";

export const createClient = () =>
  createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
