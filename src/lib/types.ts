export interface OrgSearchResult {
  ein: number;
  strein: string;
  name: string;
  city: string;
  state: string;
  ntee_code: string;
}

export interface GrantMatch {
  name: string;
  focus: string;
  url: string;
  type: string;
  avg_grant: number;
  grant_range: [number, number];
  deadline: string;
  match_pct: number;
  fits: string[];
  blockers: string[];
  eligible: boolean;
  requires: string[];
}

export interface ActionItem {
  action: string;
  unlocks: number;
  category: string;
  priority: "high" | "medium" | "low";
}

export interface ReadinessSection {
  score: number;
  checks: [string, boolean, number][];
}

export interface Readiness {
  overall: number;
  tier: string;
  financial: ReadinessSection;
  compliance: ReadinessSection;
  digital: ReadinessSection;
  gaps: string[];
  weights: Record<string, number>;
}

export interface SiteScan {
  url: string;
  reachable: boolean;
  error: string | null;
  title: string | null;
  meta_description: string | null;
  signals: Record<string, boolean>;
  footer_year: number | null;
  word_count: number;
  pages_checked: string[];
  low_content_warning: boolean;
}

export interface OrgData {
  ein: number;
  name: string;
  city: string;
  state: string;
  ntee_code: string;
  ruling_date: string | null;
}

export interface AnalysisData {
  org: OrgData;
  readiness: Readiness;
  grantMatches: GrantMatch[];
  actionItems: ActionItem[];
  siteScan: SiteScan | null;
  websiteUrl: string;
}

export type Stage = "intake" | "assessed" | "fixing" | "ready" | "prospecting" | "writing" | "submitted";

/** Stages that live in the free Inbox */
export const INBOX_STAGES: Stage[] = ["intake", "assessed", "fixing", "ready"];

/** Stages that live in the paid Pipeline */
export type PipelineStage = "prospecting" | "writing" | "submitted";
export const PIPELINE_ORG_STAGES: { key: PipelineStage; label: string; description: string }[] = [
  { key: "prospecting", label: "Prospecting", description: "Finding and evaluating grants" },
  { key: "writing", label: "Writing", description: "Drafting grant applications" },
  { key: "submitted", label: "Submitted", description: "Awaiting decisions & outcomes" },
];

/* ── Pitched grants (consultant attaches grants to a pipeline org) ── */

export type GrantStatus = "prospect" | "researching" | "writing" | "submitted" | "awarded" | "declined";

/** Review status tracks the consultant ↔ applicant collaboration on draft answers */
export type ReviewStatus = "draft" | "in_review" | "changes_requested" | "approved" | "submitted";

export const GRANT_STATUS_META: { key: GrantStatus; label: string; color: string }[] = [
  { key: "prospect", label: "Prospect", color: "blue" },
  { key: "researching", label: "Researching", color: "violet" },
  { key: "writing", label: "Writing", color: "amber" },
  { key: "submitted", label: "Submitted", color: "emerald" },
  { key: "awarded", label: "Awarded", color: "green" },
  { key: "declined", label: "Declined", color: "red" },
];

export interface PitchedGrant {
  id: string;
  grantName: string;
  funderName: string;
  type: string;
  matchPct: number;
  status: GrantStatus;
  deadline: string;
  avgGrant: number;
  grantRange: [number, number];
  notes: string;
  addedAt: number;
  url: string;
  /** Draft answers keyed by question index */
  answers?: Record<number, string>;
  /** Tracks consultant ↔ applicant review collaboration */
  reviewStatus?: ReviewStatus;
  /** Applicant comments on specific answers, keyed by question index */
  reviewComments?: Record<number, string>;
}

export interface PortfolioOrg {
  ein: number;
  strein: string;
  name: string;
  city: string;
  state: string;
  ntee_code: string;
  stage: Stage;
  addedAt: number;
  analyzedAt?: number;
  analysisData: AnalysisData | null;
  /** Grants the consultant is pitching/working for this org */
  pitchedGrants?: PitchedGrant[];
}

export const STAGES: { key: Stage; label: string }[] = [
  { key: "intake", label: "Intake" },
  { key: "assessed", label: "Assessing" },
  { key: "fixing", label: "Building" },
  { key: "ready", label: "Grant-Ready" },
  { key: "prospecting", label: "Prospecting" },
  { key: "writing", label: "Writing" },
  { key: "submitted", label: "Submitted" },
];

export const STAGE_LABEL: Record<Stage, string> = {
  intake: "Intake",
  assessed: "Assessing",
  fixing: "Building",
  ready: "Grant-Ready",
  prospecting: "Prospecting",
  writing: "Writing",
  submitted: "Submitted",
};

/* ── Grant Application (applicant-facing form) ────────── */

export type AppStatus = "new" | "pending" | "reviewing" | "approved" | "declined" | "info_needed";

export const APP_STATUSES: { key: AppStatus; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#6366f1" },
  { key: "pending", label: "Pending", color: "#3b82f6" },
  { key: "reviewing", label: "Reviewing", color: "#f59e0b" },
  { key: "info_needed", label: "Info Needed", color: "#8b5cf6" },
  { key: "approved", label: "Approved", color: "#22c55e" },
  { key: "declined", label: "Declined", color: "#ef4444" },
];

/* ── Uploaded file (document / RFP) ─────────────────────── */

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 data-URL
  uploadedAt: number;
  category: string;
}

export interface GrantApplication {
  id: string;
  status: AppStatus;
  submittedAt: number;
  updatedAt: number;
  lastViewedAt?: number;
  notes: string;

  /* Org info */
  orgName: string;
  ein: string;
  website: string;
  missionStatement: string;
  annualBudget: string;
  programAreas: string;

  /* Org info (expanded) */
  supportTypes?: string[];
  nonprofitStatus?: string;
  yearFounded?: string;
  numberServed?: string;
  geographicArea?: string;

  /* Contact */
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactTitle: string;

  /* Project */
  projectTitle: string;
  projectDescription: string;
  amountRequested: string;
  projectTimeline: string;
  targetPopulation: string;
  expectedOutcomes?: string;

  /* Specific grant (optional) */
  grantFunderName?: string;
  grantName?: string;
  grantDeadline?: string;
  grantFundingAmount?: string;
  grantUrl?: string;
  grantRfpFile?: UploadedFile;

  /* Documents */
  documents?: UploadedFile[];

  /* How they found us */
  referralSource: string;
}
