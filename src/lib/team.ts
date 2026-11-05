import { getAuthClient } from "./admin-session";
import type { FirmRole } from "./auth/consultant";

export type TeamMember = { user_id: string; email: string; name: string; role: FirmRole };
export type TeamInvitation = { id: string; email: string; name: string; role: FirmRole; expires_at: string };

export async function loadTeam(firmId: string): Promise<{ members: TeamMember[]; invitations: TeamInvitation[] } | null> {
  const supabase = getAuthClient();
  const [members, invitations] = await Promise.all([
    supabase.from("firm_members").select("user_id, email, name, role").eq("firm_id", firmId).order("created_at"),
    supabase
      .from("firm_invitations")
      .select("id, email, name, role, expires_at")
      .eq("firm_id", firmId)
      .is("accepted_at", null)
      .order("created_at"),
  ]);
  if (members.error || invitations.error) return null;
  return { members: members.data, invitations: invitations.data };
}

export type TeamChangeResult = "ok" | "last_admin" | "failed";

// Row level security returns no rows rather than an error when a change isn't allowed.
function changeResult(error: { message: string } | null, rows: unknown[] | null): TeamChangeResult {
  if (error) return error.message.includes("last_firm_admin") ? "last_admin" : "failed";
  return rows?.length ? "ok" : "failed";
}

export async function setMemberRole(firmId: string, userId: string, role: FirmRole): Promise<TeamChangeResult> {
  const { data, error } = await getAuthClient()
    .from("firm_members")
    .update({ role })
    .eq("firm_id", firmId)
    .eq("user_id", userId)
    .select("user_id");
  return changeResult(error, data);
}

export async function removeMember(firmId: string, userId: string): Promise<TeamChangeResult> {
  const { data, error } = await getAuthClient()
    .from("firm_members")
    .delete()
    .eq("firm_id", firmId)
    .eq("user_id", userId)
    .select("user_id");
  return changeResult(error, data);
}

export async function cancelInvitation(id: string): Promise<TeamChangeResult> {
  const { data, error } = await getAuthClient().from("firm_invitations").delete().eq("id", id).select("id");
  return changeResult(error, data);
}

/** Returns null on success, or an error key from the API. */
async function postInvitation(path: string, body?: object): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.ok) return null;
    const result = await response.json().catch(() => null);
    return typeof result?.error === "string" ? result.error : "failed";
  } catch {
    return "failed";
  }
}

export const sendInvitation = (invitation: { email: string; name: string; role: FirmRole }) =>
  postInvitation("/api/team/invitations", invitation);

export const resendInvitation = (id: string) => postInvitation(`/api/team/invitations/${encodeURIComponent(id)}`);
