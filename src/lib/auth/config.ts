export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when consultant sign-in can run against Supabase. */
export const isAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Local development without Supabase: /admin offers a labeled bypass.
 * NODE_ENV is "production" in every `next build`, so deployed sites missing
 * their env vars show a "not available" message and stay locked instead.
 */
export const isDevAuthMode = !isAuthConfigured && process.env.NODE_ENV === "development";

export const DEV_SESSION_COOKIE = "rr_dev_consultant";
