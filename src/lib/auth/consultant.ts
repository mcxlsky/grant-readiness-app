import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Consultant = { name: string; email: string };

export type ConsultantCheck =
  | { status: "allowed"; consultant: Consultant }
  | { status: "denied" }
  | { status: "error" };

/** Looks the signed-in user up in the consultants allowlist. Works on server and client. */
export async function checkConsultant(supabase: SupabaseClient, user: User): Promise<ConsultantCheck> {
  const email = user.email?.toLowerCase();
  if (!email || !user.email_confirmed_at) return { status: "denied" };

  const { data, error } = await supabase
    .from("consultants")
    .select("name, email")
    .eq("email", email)
    .maybeSingle();

  if (error) return { status: "error" };
  return data ? { status: "allowed", consultant: data } : { status: "denied" };
}
