import { NextResponse, type NextRequest } from "next/server";
import { DEV_SESSION_COOKIE, isAuthConfigured, isDevAuthMode } from "@/lib/auth/config";
import { checkConsultant } from "@/lib/auth/consultant";
import { createRequestClient } from "@/lib/auth/server";

/** Keeps /dashboard consultants-only and sends signed-in consultants past /admin. */
export async function middleware(request: NextRequest) {
  const onDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!isAuthConfigured) {
    const devSignedIn = isDevAuthMode && request.cookies.has(DEV_SESSION_COOKIE);
    if (onDashboard && !devSignedIn) return redirect("/admin");
    if (!onDashboard && devSignedIn) return redirect("/dashboard");
    return NextResponse.next();
  }

  const { supabase, withCookies } = createRequestClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const check = user ? await checkConsultant(supabase, user) : null;

  if (onDashboard) {
    if (!check) return withCookies(redirect("/admin"));
    if (check.status === "denied") {
      await supabase.auth.signOut({ scope: "local" });
      return withCookies(redirect("/admin?error=not_authorized"));
    }
    if (check.status === "error") return withCookies(redirect("/admin?error=check_failed"));
  } else if (check?.status === "allowed" && !request.nextUrl.searchParams.has("error")) {
    // An ?error stays on /admin, so a failed check can't bounce between the two pages.
    return withCookies(redirect("/dashboard"));
  }

  return withCookies(NextResponse.next({ request }));
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin"],
};
