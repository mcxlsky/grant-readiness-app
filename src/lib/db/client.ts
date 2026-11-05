import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when Supabase env vars are configured */
export const isSupabaseConfigured = Boolean(url && key);

/** Supabase client — only initialized when env vars are present */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? // Anonymous data access. Sign-in lives in lib/auth, so this client keeps no session of its own.
    createClient(url, key, {
      auth: { storageKey: "rr-data", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : (new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === "from") return () => new Proxy({}, { get: () => () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }) });
        return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
      },
    }) as SupabaseClient);
