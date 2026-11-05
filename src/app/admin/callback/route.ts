import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured } from "@/lib/auth/config";
import { checkConsultant } from "@/lib/auth/consultant";
import { createRequestClient } from "@/lib/auth/server";

/** Magic links land here: trade the one-time code for a session, then check the allowlist. */
export async function GET(request: NextRequest) {
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const code = request.nextUrl.searchParams.get("code");
  if (!isAuthConfigured || !code) return redirect("/admin?error=link_invalid");

  const { supabase, withCookies } = createRequestClient(request);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return withCookies(redirect("/admin?error=link_invalid"));

  const check = await checkConsultant(supabase, data.user);
  if (check.status === "allowed") return withCookies(redirect("/dashboard"));

  await supabase.auth.signOut({ scope: "local" });
  const reason = check.status === "denied" ? "not_authorized" : "check_failed";
  return withCookies(redirect(`/admin?error=${reason}`));
}
