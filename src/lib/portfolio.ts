import { PortfolioOrg, Stage, AnalysisData, OrgSearchResult } from "./types";

const STORAGE_KEY = "rsg_portfolio";

export function loadPortfolio(): PortfolioOrg[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
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
