import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const isConfigured = Boolean(url && key);

export const supabase: SupabaseClient = isConfigured
  ? createClient(url, key)
  : (new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === "from") return () => new Proxy({}, { get: () => () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }) });
        return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
      },
    }) as SupabaseClient);
