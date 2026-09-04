/**
 * Database row types — mirror the Supabase schema.
 * These are the "wire" shapes; UI components may use mapped versions.
 */

import type { AnalysisData } from "../types";

/* ── Lifecycle stages ────────────────────────────────────── */

export type EngagementStage =
  | "prospect"      // just tracking the opportunity
  | "researching"   // gathering requirements
  | "writing"       // drafting LOI / proposal
  | "submitted"     // application sent
  | "awarded"       // grant won (Phase 3)
  | "reporting"     // post-award management (Phase 3)
  | "closed";       // completed or withdrawn

export type EngagementOutcome =
  | "pending"
  | "approved"
  | "declined"
  | "withdrawn";

export const ENGAGEMENT_STAGES: { key: EngagementStage; label: string }[] = [
  { key: "prospect", label: "Prospect" },
  { key: "researching", label: "Researching" },
  { key: "writing", label: "Writing" },
  { key: "submitted", label: "Submitted" },
  { key: "awarded", label: "Awarded" },
  { key: "reporting", label: "Reporting" },
  { key: "closed", label: "Closed" },
];

/** Stages shown in the active pipeline (Phase 0 + 1) */
export const PIPELINE_STAGES: EngagementStage[] = [
  "prospect",
  "researching",
  "writing",
  "submitted",
];

/* ── Row types ───────────────────────────────────────────── */

export interface DbOrganization {
  id: string;
  ein: number;
  strein: string;
  name: string;
  city: string;
  state: string;
  ntee_code: string;
  stage: "intake" | "assessed" | "fixing" | "ready";
  added_at: string;
  analyzed_at: string | null;
  analysis_data: AnalysisData | null;
  created_at: string;
  updated_at: string;
}

export interface DbFunder {
  id: string;
  name: string;
  url: string | null;
  type: "Federal" | "Foundation" | "Corporate" | "State" | "Community Foundation";
  created_at: string;
}

export interface DbGrantOpportunity {
  id: string;
  funder_id: string;
  program: string;
  description: string;
  focus: string[];
  amount_min: number;
  amount_max: number;
  deadline: string;
  url: string | null;
  source: string;
  eligibility: string[];
  type: "Federal" | "Foundation" | "Corporate" | "State";
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Opportunity joined with its funder name */
export interface DbOpportunityWithFunder extends DbGrantOpportunity {
  funder: Pick<DbFunder, "name" | "url" | "type"> | null;
}

export interface DbGrantEngagement {
  id: string;
  org_id: string;
  opportunity_id: string | null;
  funder_name: string;
  opportunity_name: string;
  stage: EngagementStage;
  outcome: EngagementOutcome;
  amount_requested: number | null;
  amount_awarded: number | null;
  deadline: string | null;
  submitted_at: string | null;
  awarded_at: string | null;
  closed_at: string | null;
  match_pct: number;
  fits: string[];
  blockers: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Engagement joined with org name for display */
export interface DbEngagementWithOrg extends DbGrantEngagement {
  organization: Pick<DbOrganization, "name" | "ein" | "strein"> | null;
}

export interface DbApplication {
  id: string;
  status: "new" | "reviewing" | "approved" | "declined" | "info_needed";
  submitted_at: string;
  updated_at: string;
  last_viewed_at: string | null;
  notes: string;
  org_name: string;
  ein: string;
  website: string;
  mission_statement: string;
  annual_budget: string;
  program_areas: string;
  support_types: string[] | null;
  nonprofit_status: string | null;
  year_founded: string | null;
  number_served: string | null;
  geographic_area: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_title: string;
  project_title: string;
  project_description: string;
  amount_requested: string;
  project_timeline: string;
  target_population: string;
  expected_outcomes: string | null;
  grant_funder_name: string | null;
  grant_name: string | null;
  grant_deadline: string | null;
  grant_funding_amount: string | null;
  grant_url: string | null;
  referral_source: string;
  created_at: string;
}
