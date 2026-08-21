import { NextRequest, NextResponse } from "next/server";

const BASE = "https://projects.propublica.org/nonprofits/api/v2";
const HEADERS = {
  "User-Agent": "GrantReadinessPrototype/0.1 (research/demo use)",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const state = (params.get("state") || "").trim().toUpperCase();

  if (!q) {
    return NextResponse.json(
      { error: "Enter an organization name to search." },
      { status: 400 }
    );
  }

  const url = new URL(`${BASE}/search.json`);
  url.searchParams.set("q", q);
  if (state) url.searchParams.set("state[id]", state);

  try {
    const resp = await fetch(url.toString(), { headers: HEADERS });
    if (!resp.ok) throw new Error(`ProPublica returned ${resp.status}`);
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Search failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 502 }
    );
  }
}
