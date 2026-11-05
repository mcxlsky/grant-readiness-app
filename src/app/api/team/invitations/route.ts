import { NextResponse, type NextRequest } from "next/server";
import { findFirmForEmail, isInvitingConfigured, sendInviteEmail } from "@/lib/auth/admin";
import { ROLE_LABELS, type FirmRole } from "@/lib/auth/consultant";
import { requireFirmAdmin, teamError } from "@/lib/auth/firm-admin";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invites someone to the signed-in admin's firm. */
export async function POST(request: NextRequest) {
  const context = await requireFirmAdmin(request);
  if (context instanceof NextResponse) return context;
  const { supabase, withCookies, admin } = context;
  const fail = (status: number, error: string) => withCookies(teamError(status, error));

  if (!isInvitingConfigured) return fail(503, "not_configured");

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const role = body?.role as FirmRole;
  const validRole = typeof role === "string" && Object.hasOwn(ROLE_LABELS, role);
  if (!EMAIL.test(email) || email.length > 254 || !name || name.length > 120 || !validRole) {
    return fail(400, "invalid");
  }

  const existing = await findFirmForEmail(email);
  if ("error" in existing) return fail(503, "failed");
  if (existing.firmId) return fail(409, existing.firmId === admin.firmId ? "already_member" : "other_firm");

  // Runs as the admin, so row level security confirms they can invite to this firm.
  const { data: invitation, error } = await supabase
    .from("firm_invitations")
    .insert({ firm_id: admin.firmId, email, name, role })
    .select("id")
    .single();
  if (error) return fail(error.code === "23505" ? 409 : 500, error.code === "23505" ? "already_invited" : "failed");

  const sent = await sendInviteEmail(email, new URL("/admin/callback", request.url).toString());
  if (sent !== "sent") {
    // Nothing reached them, so leave no invitation that looks sent.
    await supabase.from("firm_invitations").delete().eq("id", invitation.id);
    return fail(sent === "rate_limited" ? 429 : 502, sent);
  }

  return withCookies(NextResponse.json({ ok: true }));
}
