import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured } from "./config";
import { checkConsultant, type Consultant } from "./consultant";
import { createRequestClient } from "./server";

type RequestClient = ReturnType<typeof createRequestClient>;

export type FirmAdminContext = RequestClient & { admin: Consultant };

export const teamError = (status: number, error: string) => NextResponse.json({ error }, { status });

/** The signed-in firm admin for an API route, or the response to send instead. */
export async function requireFirmAdmin(request: NextRequest): Promise<FirmAdminContext | NextResponse> {
  if (!isAuthConfigured) return teamError(503, "not_configured");

  const client = createRequestClient(request);
  const {
    data: { user },
  } = await client.supabase.auth.getUser();
  if (!user) return client.withCookies(teamError(401, "signed_out"));

  const check = await checkConsultant(client.supabase, user);
  if (check.status === "error") return client.withCookies(teamError(503, "failed"));
  if (check.status === "denied" || check.consultant.role !== "admin") {
    return client.withCookies(teamError(403, "not_admin"));
  }

  return { ...client, admin: check.consultant };
}
