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

export type Stage = "intake" | "assessed" | "fixing" | "ready";

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
}

export const STAGES: { key: Stage; label: string }[] = [
  { key: "intake", label: "Intake" },
  { key: "assessed", label: "Assessing" },
  { key: "fixing", label: "Building" },
  { key: "ready", label: "Grant-Ready" },
];

export const STAGE_LABEL: Record<Stage, string> = {
  intake: "Intake",
  assessed: "Assessing",
  fixing: "Building",
  ready: "Grant-Ready",
};

/* ── Grant Application (applicant-facing form) ────────── */

export type AppStatus = "new" | "reviewing" | "approved" | "declined" | "info_needed";

export const APP_STATUSES: { key: AppStatus; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#6366f1" },
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
