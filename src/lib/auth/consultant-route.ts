import { NextResponse, type NextRequest } from "next/server";
import { DEV_SESSION_COOKIE, isAuthConfigured, isDevAuthMode } from "./config";
import { checkConsultant } from "./consultant";
import { createRequestClient } from "./server";

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

const deny = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Lets only signed-in consultants reach an API route, using the same check as /dashboard. */
export function consultantOnly(handler: RouteHandler): RouteHandler {
  return async (request) => {
    if (!isAuthConfigured) {
      const devSignedIn = isDevAuthMode && request.cookies.has(DEV_SESSION_COOKIE);
      return devSignedIn ? handler(request) : deny(401, "Sign in to continue.");
    }

    const { supabase, withCookies } = createRequestClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return withCookies(deny(401, "Sign in to continue."));

    const check = await checkConsultant(supabase, user);
    if (check.status === "denied") return withCookies(deny(403, "This account doesn't have access."));
    if (check.status === "error") return withCookies(deny(503, "We couldn't confirm your access. Try again in a few minutes."));

    return withCookies(await handler(request));
  };
}
