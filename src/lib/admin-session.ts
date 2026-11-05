import { createBrowserClient } from "@supabase/ssr";
import { DEV_SESSION_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured, isDevAuthMode } from "./auth/config";
import { checkConsultant, type Consultant } from "./auth/consultant";

export type { Consultant };

const DEV_CONSULTANT: Consultant = { name: "Dev Consultant", email: "dev@localhost" };

// createBrowserClient reuses a single instance in the browser. Only call this when auth is configured.
const getClient = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** The signed-in consultant, or null if there is no session or the check fails. */
export async function getConsultantSession(): Promise<Consultant | null> {
  if (isDevAuthMode) {
    return document.cookie.includes(`${DEV_SESSION_COOKIE}=`) ? DEV_CONSULTANT : null;
  }
  if (!isAuthConfigured) return null;

  const supabase = getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const check = await checkConsultant(supabase, user);
  return check.status === "allowed" ? check.consultant : null;
}

// Supabase's answers when an email has no account. Reported as a success so the
// form doesn't reveal who is on the team.
const UNKNOWN_EMAIL_CODES = new Set(["otp_disabled", "signup_disabled", "user_not_found"]);

export type MagicLinkResult = "sent" | "rate_limited" | "failed";

/** Emails a sign-in link. Accounts are never created here; see docs/consultant-auth.md. */
export async function requestMagicLink(email: string): Promise<MagicLinkResult> {
  const { error } = await getClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}/admin/callback`,
    },
  });

  if (!error || UNKNOWN_EMAIL_CODES.has(error.code ?? "")) return "sent";
  return error.status === 429 ? "rate_limited" : "failed";
}

/** Returns false if Supabase couldn't be reached, in which case the session is still active. */
export async function signOutConsultant(): Promise<boolean> {
  if (isDevAuthMode) {
    document.cookie = `${DEV_SESSION_COOKIE}=; path=/; max-age=0`;
    return true;
  }
  if (!isAuthConfigured) return true;

  const { error } = await getClient().auth.signOut();
  return !error;
}

/** Calls back when the session ends elsewhere, such as another tab or a revoked token. */
export function onConsultantSignedOut(callback: () => void): () => void {
  if (!isAuthConfigured) return () => {};

  const {
    data: { subscription },
  } = getClient().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") callback();
  });
  return () => subscription.unsubscribe();
}

export function startDevSession() {
  if (isDevAuthMode) document.cookie = `${DEV_SESSION_COOKIE}=1; path=/; SameSite=Lax`;
}
