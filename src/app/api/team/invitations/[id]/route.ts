import { NextResponse, type NextRequest } from "next/server";
import { isInvitingConfigured, sendInviteEmail } from "@/lib/auth/admin";
import { requireFirmAdmin, teamError } from "@/lib/auth/firm-admin";

const INVITATION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

/** Resends an open invitation and restarts its expiry. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireFirmAdmin(request);
  if (context instanceof NextResponse) return context;
  const { supabase, withCookies } = context;
  const fail = (status: number, error: string) => withCookies(teamError(status, error));

  if (!isInvitingConfigured) return fail(503, "not_configured");

  const { id } = await params;
  // Row level security limits this to open invitations in the admin's own firm.
  const { data, error } = await supabase
    .from("firm_invitations")
    .update({ expires_at: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString() })
    .eq("id", id)
    .select("email")
    .maybeSingle();
  if (error) return fail(500, "failed");
  if (!data) return fail(404, "not_found");

  const sent = await sendInviteEmail(data.email, new URL("/admin/callback", request.url).toString());
  if (sent !== "sent") return fail(sent === "rate_limited" ? 429 : 502, sent);

  return withCookies(NextResponse.json({ ok: true }));
}
