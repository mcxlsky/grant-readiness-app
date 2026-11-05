import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isAuthConfigured } from "@/lib/auth/config";
import { checkConsultant } from "@/lib/auth/consultant";
import { createRequestClient } from "@/lib/auth/server";

// token_hash links work in any browser, which invitations need. See docs/consultant-auth.md.
const LINK_TYPES = new Set<EmailOtpType>(["email", "magiclink", "invite"]);

/** Sign-in and invitation links land here: start a session, accept any invitation, then check access. */
export async function GET(request: NextRequest) {
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!isAuthConfigured) return redirect("/admin?error=link_invalid");

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { supabase, withCookies } = createRequestClient(request);

  let result;
  if (code) {
    result = await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type && LINK_TYPES.has(type)) {
    result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  } else {
    return redirect("/admin?error=link_invalid");
  }

  const user = result.data.user;
  if (result.error || !user) return withCookies(redirect("/admin?error=link_invalid"));

  const { error: acceptError } = await supabase.rpc("accept_firm_invitation");
  const check = acceptError ? ({ status: "error" } as const) : await checkConsultant(supabase, user);
  if (check.status === "allowed") return withCookies(redirect("/dashboard"));

  await supabase.auth.signOut({ scope: "local" });
  const reason = check.status === "denied" ? "not_authorized" : "check_failed";
  return withCookies(redirect(`/admin?error=${reason}`));
}
