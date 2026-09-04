import { supabase } from "./client";
import type {
  DbGrantEngagement,
  DbEngagementWithOrg,
  EngagementStage,
  EngagementOutcome,
} from "./types";

/** List all engagements, optionally filtered by org or stage */
export async function listEngagements(filters?: {
  orgId?: string;
  stage?: EngagementStage;
  stages?: EngagementStage[];
}): Promise<DbEngagementWithOrg[]> {
  let q = supabase
    .from("grant_engagements")
    .select("*, organization:organizations(name, ein, strein)")
    .order("updated_at", { ascending: false });

  if (filters?.orgId) {
    q = q.eq("org_id", filters.orgId);
  }
  if (filters?.stage) {
    q = q.eq("stage", filters.stage);
  }
  if (filters?.stages?.length) {
    q = q.in("stage", filters.stages);
  }

  const { data, error } = await q;
  // Gracefully return empty when table doesn't exist yet
  if (error) {
    console.warn("Supabase grant_engagements unavailable:", error.message);
    return [];
  }
  return (data ?? []) as DbEngagementWithOrg[];
}

/** Get a single engagement */
export async function getEngagement(
  id: string
): Promise<DbEngagementWithOrg | null> {
  const { data, error } = await supabase
    .from("grant_engagements")
    .select("*, organization:organizations(name, ein, strein)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as DbEngagementWithOrg | null;
}

/** Create a new engagement (typically from prospecting) */
export async function createEngagement(engagement: {
  org_id: string;
  opportunity_id?: string;
  funder_name: string;
  opportunity_name: string;
  stage?: EngagementStage;
  deadline?: string;
  match_pct?: number;
  fits?: string[];
  blockers?: string[];
  amount_requested?: number;
  notes?: string;
}): Promise<DbGrantEngagement> {
  const { data, error } = await supabase
    .from("grant_engagements")
    .insert({
      org_id: engagement.org_id,
      opportunity_id: engagement.opportunity_id ?? null,
      funder_name: engagement.funder_name,
      opportunity_name: engagement.opportunity_name,
      stage: engagement.stage ?? "prospect",
      deadline: engagement.deadline ?? null,
      match_pct: engagement.match_pct ?? 0,
      fits: engagement.fits ?? [],
      blockers: engagement.blockers ?? [],
      amount_requested: engagement.amount_requested ?? null,
      notes: engagement.notes ?? "",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Move an engagement to a new stage */
export async function updateEngagementStage(
  id: string,
  stage: EngagementStage
): Promise<void> {
  const updates: Record<string, unknown> = { stage };

  // Set timestamp fields based on stage transition
  if (stage === "submitted") {
    updates.submitted_at = new Date().toISOString();
  } else if (stage === "awarded") {
    updates.awarded_at = new Date().toISOString();
    updates.outcome = "approved";
  } else if (stage === "closed") {
    updates.closed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("grant_engagements")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

/** Update engagement outcome */
export async function updateEngagementOutcome(
  id: string,
  outcome: EngagementOutcome
): Promise<void> {
  const { error } = await supabase
    .from("grant_engagements")
    .update({ outcome })
    .eq("id", id);
  if (error) throw error;
}

/** Update engagement notes */
export async function updateEngagementNotes(
  id: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from("grant_engagements")
    .update({ notes })
    .eq("id", id);
  if (error) throw error;
}

/** Delete an engagement */
export async function deleteEngagement(id: string): Promise<void> {
  const { error } = await supabase
    .from("grant_engagements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Check if an engagement already exists for this org + opportunity */
export async function engagementExists(
  orgId: string,
  opportunityId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("grant_engagements")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("opportunity_id", opportunityId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
