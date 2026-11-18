import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "../auth/config";

/** True when Supabase env vars are configured */
export const isSupabaseConfigured = isAuthConfigured;

/**
 * Dashboard data client. It shares the consultant's session cookie with lib/auth, so
 * queries run as the signed-in user and pass row level security. Queries only run in
 * the browser; during pre-rendering there are no cookies to read, so this is a stub.
 */
export const supabase: SupabaseClient =
  isSupabaseConfigured && typeof window !== "undefined"
    ? createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : (new Proxy({} as SupabaseClient, {
        get(_, prop) {
          if (prop === "from") return () => new Proxy({}, { get: () => () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }) });
          return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
        },
      }) as SupabaseClient);
