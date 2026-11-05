import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

type CookieToSet = { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] };

/**
 * Supabase client for middleware and route handlers. Pass every response you
 * return through `withCookies` so refreshed or cleared session cookies reach
 * the browser. Only call this when auth is configured.
 */
export function createRequestClient(request: NextRequest) {
  const pendingCookies: CookieToSet[] = [];
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        for (const { name, value, options } of cookies) {
          request.cookies.set(name, value);
          pendingCookies.push({ name, value, options });
        }
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  const withCookies = <T extends NextResponse>(response: T): T => {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    for (const [key, value] of Object.entries(pendingHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  };

  return { supabase, withCookies };
}
