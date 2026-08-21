import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy logo images for org avatars.
 * Tries multiple sources in order of logo quality:
 *   1. Clearbit Logo API (high-res, but may not have all orgs)
 *   2. org's actual /favicon.ico or apple-touch-icon
 *   3. Google Favicons (reliable fallback)
 * Caches successful responses for 7 days.
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "domain param required" }, { status: 400 });
  }

  // Sources to try, in order of quality
  const sources = [
    `https://logo.clearbit.com/${domain}?size=128`,
    `https://${domain}/apple-touch-icon.png`,
    `https://${domain}/apple-touch-icon-precomposed.png`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];

  for (const url of sources) {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "ReadySetGrants/1.0" },
        redirect: "follow",
      });

      if (!resp.ok) continue;

      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;

      const buffer = await resp.arrayBuffer();

      // Skip tiny responses (likely placeholder/error images or 1x1 pixels)
      if (buffer.byteLength < 200) continue;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    } catch {
      // Timeout or network error — try next source
      continue;
    }
  }

  return NextResponse.json({ error: "no logo found" }, { status: 404 });
}
