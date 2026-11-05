import type { SupabaseClient, User } from "@supabase/supabase-js";

export type FirmRole = "admin" | "consultant";

export const ROLE_LABELS: Record<FirmRole, string> = { admin: "Admin", consultant: "Consultant" };

export type Consultant = {
  userId: string;
  name: string;
  email: string;
  role: FirmRole;
  firmId: string;
  firmName: string;
};

export type ConsultantCheck =
  | { status: "allowed"; consultant: Consultant }
  | { status: "denied" }
  | { status: "error" };

/** Looks the signed-in user up in their firm. Works on server and client. */
export async function checkConsultant(supabase: SupabaseClient, user: User): Promise<ConsultantCheck> {
  if (!user.email_confirmed_at) return { status: "denied" };

  const { data, error } = await supabase
    .from("firm_members")
    .select("name, email, role, firm_id, firms(name)")
    .eq("user_id", user.id)
    .maybeSingle<{
      name: string;
      email: string;
      role: FirmRole;
      firm_id: string;
      firms: { name: string } | null;
    }>();

  if (error) return { status: "error" };
  if (!data) return { status: "denied" };

  return {
    status: "allowed",
    consultant: {
      userId: user.id,
      name: data.name,
      email: data.email,
      role: data.role,
      firmId: data.firm_id,
      firmName: data.firms?.name ?? "",
    },
  };
}
