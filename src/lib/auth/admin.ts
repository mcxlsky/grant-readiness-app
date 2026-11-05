import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "./config";

// Server only. Without a NEXT_PUBLIC_ prefix this never reaches the browser.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isInvitingConfigured = isAuthConfigured && Boolean(SERVICE_ROLE_KEY);

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

const serviceClient = () => createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: NO_SESSION });

/** The firm an address already belongs to, across all firms. Admins can only see their own. */
export async function findFirmForEmail(email: string): Promise<{ firmId: string | null } | { error: true }> {
  const { data, error } = await serviceClient()
    .from("firm_members")
    .select("firm_id")
    .eq("email", email)
    .maybeSingle();
  return error ? { error: true } : { firmId: data?.firm_id ?? null };
}

export type InviteEmailResult = "sent" | "rate_limited" | "failed";

/**
 * Emails an invitation link. Supabase refuses to invite an address that already has a
 * confirmed account, such as someone removed earlier, so they get a sign-in link instead.
 * Either link ends at /admin/callback, which accepts the open invitation.
 */
export async function sendInviteEmail(email: string, redirectTo: string): Promise<InviteEmailResult> {
  const { error } = await serviceClient().auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!error) return "sent";

  if (error.code === "email_exists") {
    const anonymous = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { ...NO_SESSION, flowType: "implicit" } });
    const { error: linkError } = await anonymous.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    });
    if (!linkError) return "sent";
    return linkError.status === 429 ? "rate_limited" : "failed";
  }

  return error.status === 429 ? "rate_limited" : "failed";
}
