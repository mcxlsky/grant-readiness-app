import { PortfolioOrg, Stage, AnalysisData, OrgSearchResult, PitchedGrant, GrantStatus, PipelineStage, ReviewStatus } from "./types";

const STORAGE_KEY = "rsg_portfolio";

/* ── Auto-stage computation ───────────────────────────────── */

/** Derive org pipeline stage from its pitched grants' statuses */
function recomputePipelineStage(org: PortfolioOrg): void {
  // Only touch orgs that are already in the pipeline
  const pipelineStages: Stage[] = ["prospecting", "writing", "submitted"];
  if (!pipelineStages.includes(org.stage)) return;

  const grants = org.pitchedGrants ?? [];
  if (grants.length === 0) {
    org.stage = "prospecting";
    return;
  }

  // Writing takes priority — any grant being drafted means org is in writing mode
  const hasWriting = grants.some((g) => g.status === "writing");
  if (hasWriting) {
    org.stage = "writing";
    return;
  }

  // Submitted / terminal — at least one grant is out the door
  const hasSubmittedOrTerminal = grants.some(
    (g) => g.status === "submitted" || g.status === "awarded" || g.status === "declined"
  );
  if (hasSubmittedOrTerminal) {
    org.stage = "submitted";
    return;
  }

  // All grants still in prospect or researching — stays in prospecting
  org.stage = "prospecting";
}

/* ── Core CRUD ────────────────────────────────────────────── */

export function loadPortfolio(): PortfolioOrg[] {
  if (typeof window === "undefined") return [];
  try {
    const portfolio: PortfolioOrg[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Ensure pipeline stages are consistent with pitched grant statuses
    let dirty = false;
    for (const org of portfolio) {
      const before = org.stage;
      recomputePipelineStage(org);
      if (org.stage !== before) dirty = true;
    }
    if (dirty) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
    }
    return portfolio;
  } catch {
    return [];
  }
}

export function savePortfolio(portfolio: PortfolioOrg[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

export function addOrg(org: OrgSearchResult): boolean {
  const portfolio = loadPortfolio();
  if (portfolio.find((o) => o.ein === org.ein)) return false;
  portfolio.push({
    ein: org.ein,
    strein: org.strein || String(org.ein),
    name: org.name,
    city: org.city || "",
    state: org.state || "",
    ntee_code: org.ntee_code || "",
    stage: "intake",
    addedAt: Date.now(),
    analysisData: null,
  });
  savePortfolio(portfolio);
  return true;
}

export function removeOrg(ein: number): void {
  const portfolio = loadPortfolio().filter((o) => o.ein !== ein);
  savePortfolio(portfolio);
}

export function updateOrgAnalysis(ein: number, data: AnalysisData): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org) return;
  org.analysisData = data;
  org.stage = "assessed";
  org.analyzedAt = Date.now();
  savePortfolio(portfolio);
}

export function updateOrgStage(ein: number, stage: Stage): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org) return;
  org.stage = stage;
  savePortfolio(portfolio);
}

export function addGrantToOrg(ein: number, grant: import("./types").GrantMatch): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.analysisData) return;
  org.analysisData.grantMatches.push(grant);
  savePortfolio(portfolio);
}

export function removeGrantFromOrg(ein: number, index: number): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.analysisData) return;
  org.analysisData.grantMatches.splice(index, 1);
  savePortfolio(portfolio);
}

export function getOrg(ein: number): PortfolioOrg | null {
  return loadPortfolio().find((o) => o.ein === ein) || null;
}

/* ── Pitched grant helpers ──────────────────────────────── */

export function addPitchedGrant(ein: number, grant: PitchedGrant): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org) return;
  if (!org.pitchedGrants) org.pitchedGrants = [];
  org.pitchedGrants.push(grant);
  recomputePipelineStage(org);
  savePortfolio(portfolio);
}

export function removePitchedGrant(ein: number, grantId: string): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.pitchedGrants) return;
  org.pitchedGrants = org.pitchedGrants.filter((g) => g.id !== grantId);
  recomputePipelineStage(org);
  savePortfolio(portfolio);
}

export function updatePitchedGrantStatus(ein: number, grantId: string, status: GrantStatus): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.pitchedGrants) return;
  const grant = org.pitchedGrants.find((g) => g.id === grantId);
  if (grant) grant.status = status;
  recomputePipelineStage(org);
  savePortfolio(portfolio);
}

export function updatePitchedGrantNotes(ein: number, grantId: string, notes: string): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.pitchedGrants) return;
  const grant = org.pitchedGrants.find((g) => g.id === grantId);
  if (grant) grant.notes = notes;
  savePortfolio(portfolio);
}

export function updatePitchedGrantAnswers(ein: number, grantId: string, answers: Record<number, string>): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.pitchedGrants) return;
  const grant = org.pitchedGrants.find((g) => g.id === grantId);
  if (grant) grant.answers = answers;
  savePortfolio(portfolio);
}

export function updatePitchedGrantReviewStatus(ein: number, grantId: string, reviewStatus: ReviewStatus): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.pitchedGrants) return;
  const grant = org.pitchedGrants.find((g) => g.id === grantId);
  if (grant) grant.reviewStatus = reviewStatus;
  savePortfolio(portfolio);
}

export function updatePitchedGrantReviewComments(ein: number, grantId: string, comments: Record<number, string>): void {
  const portfolio = loadPortfolio();
  const org = portfolio.find((o) => o.ein === ein);
  if (!org?.pitchedGrants) return;
  const grant = org.pitchedGrants.find((g) => g.id === grantId);
  if (grant) grant.reviewComments = comments;
  savePortfolio(portfolio);
}
