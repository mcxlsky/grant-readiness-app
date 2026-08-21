import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy logo images for org avatars.
 * Tries Clearbit Logo API first, then Google Favicons, then returns a 404.
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
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];

  for (const url of sources) {
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "ReadySetGrants/1.0" },
      });

      if (!resp.ok) continue;

      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;

      const buffer = await resp.arrayBuffer();

      // Skip tiny responses (likely placeholder/error images)
      if (buffer.byteLength < 100) continue;

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
