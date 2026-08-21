import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PP_BASE = "https://projects.propublica.org/nonprofits/api/v2";
const PP_HEADERS = {
  "User-Agent": "GrantReadinessPrototype/0.1 (research/demo use)",
};
const SCAN_UA =
  "Mozilla/5.0 (compatible; GrantReadinessPrototype/0.1; +research/demo use)";
const TIMEOUT_MS = 12_000;
const MAX_SUBPAGES = 3;
const CURRENT_YEAR = new Date().getFullYear();

/* ── ProPublica ─────────────────────────────────────────── */

async function getOrg(ein: string) {
  const clean = ein.replace(/-/g, "").trim();
  const resp = await fetch(`${PP_BASE}/organizations/${clean}.json`, {
    headers: PP_HEADERS,
  });
  if (!resp.ok) throw new Error(`ProPublica returned ${resp.status}`);
  return resp.json();
}

/* ── Website scanner ────────────────────────────────────── */

const SIGNAL_KEYWORDS: Record<string, string[]> = {
  donate: ["donate", "give now", "support us", "make a gift", "ways to give", "donation"],
  board_staff: ["board of directors", "our board", "leadership", "our team", "staff", "meet the team", "who we are"],
  contact: ["contact us", "contact", "get in touch"],
  annual_report: ["annual report", "financials", "form 990", "990", "guidestar", "candid", "charity navigator", "transparency"],
  mission: ["our mission", "mission statement", "about us", "what we do"],
};

const SIGNAL_LABELS: Record<string, string> = {
  donate: "Has a clear way to donate or give online",
  board_staff: "Publishes board, leadership, or staff information",
  contact: "Has a contact page or visible contact info",
  annual_report: "Shares financials, an annual report, or 990/transparency info",
  mission: "States mission or 'about us' clearly",
};

async function fetchPage(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": SCAN_UA },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`${resp.status}`);
    const text = await resp.text();
    return { url: resp.url, text };
  } finally {
    clearTimeout(timer);
  }
}

function findLink($: cheerio.CheerioAPI, baseUrl: string, keywords: string[], sameDomain: string): string | null {
  let found: string | null = null;
  $("a[href]").each((_, el) => {
    if (found) return;
    const label = $(el).text().toLowerCase().trim();
    if (keywords.some((kw) => label.includes(kw))) {
      try {
        const href = new URL($(el).attr("href")!, baseUrl).toString();
        if (new URL(href).hostname === sameDomain) found = href;
      } catch { /* ignore bad URLs */ }
    }
  });
  return found;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scanWebsite(url: string): Promise<any> {
  const result: Record<string, unknown> = {
    url,
    reachable: false,
    error: null,
    title: null,
    meta_description: null,
    signals: Object.fromEntries(Object.keys(SIGNAL_KEYWORDS).map((k) => [k, false])),
    footer_year: null,
    word_count: 0,
    pages_checked: [] as string[],
    low_content_warning: false,
  };

  if (!url) { result.error = "no_url_provided"; return result; }
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  let page;
  try { page = await fetchPage(url); } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error("Unknown");
    result.error = `${err.name}: ${err.message}`;
    return result;
  }

  result.reachable = true;
  result.url = page.url;
  (result.pages_checked as string[]).push(page.url);
  const sameDomain = new URL(page.url).hostname;

  const $ = cheerio.load(page.text);
  const text = $.root().text().replace(/\s+/g, " ").toLowerCase();
  result.word_count = text.split(/\s+/).filter(Boolean).length;

  const titleTag = $("title").first().text().trim();
  result.title = titleTag || null;
  const metaDesc = $('meta[name="description"]').attr("content");
  result.meta_description = metaDesc ? metaDesc.trim() : null;

  if ((result.word_count as number) < 60) result.low_content_warning = true;

  const linkTexts = $("a").map((_, el) => $(el).text().toLowerCase()).get().join(" ");
  const haystack = text + " " + linkTexts;

  const signals = result.signals as Record<string, boolean>;
  for (const [signal, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
    signals[signal] = keywords.some((kw) => haystack.includes(kw));
  }

  const yearMatches = text.slice(-3000).match(/20[1-3]\d/g);
  if (yearMatches) result.footer_year = Math.max(...yearMatches.map(Number));

  const missing = Object.keys(SIGNAL_KEYWORDS).filter((k) => !signals[k]);
  let fetched = 0;
  for (const signal of missing) {
    if (fetched >= MAX_SUBPAGES) break;
    const link = findLink($, page.url, SIGNAL_KEYWORDS[signal], sameDomain);
    if (!link || (result.pages_checked as string[]).includes(link)) continue;
    try {
      const sub = await fetchPage(link);
      fetched++;
      (result.pages_checked as string[]).push(sub.url);
      const $sub = cheerio.load(sub.text);
      const subText = $sub.root().text().replace(/\s+/g, " ").toLowerCase();
      const subLinks = $sub("a").map((_, el) => $sub(el).text().toLowerCase()).get().join(" ");
      const subHay = subText + " " + subLinks;
      for (const [sig, kws] of Object.entries(SIGNAL_KEYWORDS)) {
        if (!signals[sig] && kws.some((kw) => subHay.includes(kw))) {
          signals[sig] = true;
        }
      }
    } catch { /* skip unreachable subpage */ }
  }

  return result;
}

/* ── Scoring engine ─────────────────────────────────────── */

const WEIGHTS = { financial: 0.35, compliance: 0.25, digital: 0.40 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function latestFiling(orgJson: any) {
  const filings = orgJson.filings_with_data || [];
  if (!filings.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return filings.slice().sort((a: any, b: any) => (b.tax_prd_yr || 0) - (a.tax_prd_yr || 0))[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scoreFinancialHealth(orgJson: any) {
  const filing = latestFiling(orgJson);
  const checks: [string, boolean, number][] = [];
  if (!filing) {
    checks.push(["No detailed financial filing on record (likely a 990-N e-Postcard filer, under $50K revenue, or data not yet processed)", false, 0]);
    return { score: 40, checks };
  }

  const revenue = filing.totrevenue || 0;
  const expenses = filing.totfuncexpns || 0;
  const netAssets = filing.totnetassetend || 0;
  const filingYear = filing.tax_prd_yr;
  let points = 0;

  if (expenses && revenue >= expenses) {
    checks.push(["Revenue covered expenses in the most recent filing", true, 25]);
    points += 25;
  } else if (expenses) {
    const deficitPct = (expenses - revenue) / expenses;
    const ok = deficitPct < 0.10;
    checks.push([`Ran a ${ok ? "modest" : "significant"} deficit in the most recent filing (${Math.round(deficitPct * 100)}% of expenses)`, ok, ok ? 25 : 10]);
    points += ok ? 25 : 10;
  } else {
    checks.push(["Expense data not available to assess deficit/surplus", false, 10]);
    points += 10;
  }

  const monthsReserve = expenses ? netAssets / (expenses / 12) : null;
  if (monthsReserve !== null) {
    if (monthsReserve >= 3) {
      checks.push([`Holds roughly ${monthsReserve.toFixed(1)} months of operating reserve`, true, 30]);
      points += 30;
    } else if (monthsReserve >= 1) {
      checks.push([`Thin operating reserve (~${monthsReserve.toFixed(1)} months of expenses)`, false, 15]);
      points += 15;
    } else if (monthsReserve >= 0) {
      checks.push(["Very low operating reserve (under 1 month of expenses)", false, 5]);
      points += 5;
    } else {
      checks.push(["Negative net assets (liabilities exceed assets)", false, 0]);
    }
  } else {
    checks.push(["Reserve ratio not calculable from available data", false, 10]);
    points += 10;
  }

  const grossFr = filing.grsincfndrsng || 0;
  const netFr = filing.netincfndrsng;
  if (grossFr && netFr != null) {
    const ok = netFr > 0;
    checks.push([`Fundraising activity shows ${ok ? "net-positive" : "net-negative"} results`, ok, ok ? 15 : 5]);
    points += ok ? 15 : 5;
  } else {
    points += 10;
  }

  checks.push([`Most recent detailed filing: FY${filingYear} (revenue $${revenue.toLocaleString()})`, true, 0]);
  return { score: Math.min(Math.round(points), 100), checks };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scoreFilingCompliance(orgJson: any) {
  const checks: [string, boolean, number][] = [];
  let points = 0;
  const org = orgJson.organization || {};
  const withData = orgJson.filings_with_data || [];
  const withoutData = orgJson.filings_without_data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allYears = [...new Set([...withData, ...withoutData].map((f: any) => f.tax_prd_yr).filter(Boolean))].sort((a, b) => a - b) as number[];

  if (allYears.length) {
    const latest = Math.max(...allYears);
    const behind = CURRENT_YEAR - latest;
    if (behind <= 2) {
      checks.push([`Most recent filing on record is FY${latest} — current`, true, 50]);
      points += 50;
    } else if (behind <= 4) {
      checks.push([`Most recent filing on record is FY${latest} — ${behind} years old`, false, 25]);
      points += 25;
    } else {
      checks.push([`Most recent filing on record is FY${latest} — significantly out of date (${behind} years)`, false, 0]);
    }
  } else {
    checks.push(["No IRS filings found on record for this EIN", false, 10]);
    points += 10;
  }

  if (allYears.length >= 2) {
    let gaps = 0;
    for (let i = 1; i < allYears.length; i++) {
      if (allYears[i] - allYears[i - 1] > 1) gaps++;
    }
    if (!gaps) {
      checks.push(["No gaps detected in filing history", true, 30]);
      points += 30;
    } else {
      checks.push([`${gaps} gap(s) detected in filing history`, false, 10]);
      points += 10;
    }
  } else {
    points += 15;
  }

  if (org.ruling_date) {
    checks.push([`IRS tax-exempt status established ${String(org.ruling_date).slice(0, 4)}`, true, 20]);
    points += 20;
  } else {
    checks.push(["No IRS determination date on record", false, 0]);
  }

  return { score: Math.min(Math.round(points), 100), checks };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scoreDigitalHousekeeping(siteScan: any) {
  const checks: [string, boolean, number][] = [];
  if (!siteScan) {
    checks.push(["No website URL was provided for this org", false, 0]);
    return { score: 0, checks };
  }
  if (!siteScan.reachable) {
    checks.push([`Website could not be reached (${siteScan.error || "unknown error"})`, false, 0]);
    return { score: 0, checks };
  }

  let points = 0;
  checks.push(["Website is live and reachable", true, 15]);
  points += 15;

  const weightMap: Record<string, number> = { donate: 20, board_staff: 20, contact: 15, annual_report: 15, mission: 15 };
  for (const [key, weight] of Object.entries(weightMap)) {
    const present = siteScan.signals[key] || false;
    checks.push([SIGNAL_LABELS[key], present, present ? weight : 0]);
    if (present) points += weight;
  }

  if (siteScan.low_content_warning) {
    checks.push(["Site returned very little readable text — may be a JS-only site our scanner can't fully read", false, 0]);
  }

  const year = siteScan.footer_year;
  if (year && year >= CURRENT_YEAR - 1) {
    checks.push([`Site shows recent-year content (${year})`, true, 0]);
  } else if (year) {
    checks.push([`Most recent year visible on site is ${year} — may be stale`, false, 0]);
  }

  return { score: Math.min(Math.round(points), 100), checks };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeReadiness(orgJson: any, siteScan: any) {
  const fin = scoreFinancialHealth(orgJson);
  const comp = scoreFilingCompliance(orgJson);
  const dig = scoreDigitalHousekeeping(siteScan);

  const overall = fin.score * WEIGHTS.financial + comp.score * WEIGHTS.compliance + dig.score * WEIGHTS.digital;

  let tier;
  if (overall >= 80) tier = "Grant-Ready";
  else if (overall >= 65) tier = "Ready with Gaps";
  else if (overall >= 40) tier = "Needs Work";
  else tier = "Not Ready";

  const gaps: string[] = [];
  for (const section of [fin, comp, dig]) {
    for (const [label, passed] of section.checks) {
      if (!passed) gaps.push(label);
    }
  }

  return { overall: Math.round(overall * 10) / 10, tier, financial: fin, compliance: comp, digital: dig, gaps, weights: WEIGHTS };
}

/* ── Funder matching ────────────────────────────────────── */

const FUNDER_SEED_LIST = [
  // ── Education (B) ──────────────────────────────────────
  { name: "Bill & Melinda Gates Foundation", focus: "Education", ntee_prefixes: ["B"], url: "https://www.gatesfoundation.org", avg_grant: 500000, grant_range: [100000, 2000000] as [number, number], min_revenue: 1000000, min_years: 5, requires: ["annual_report", "board_staff", "mission"], deadline: "Rolling", type: "Private Foundation" },
  { name: "The Wallace Foundation", focus: "Education, arts participation, youth development", ntee_prefixes: ["A", "B"], url: "https://www.wallacefoundation.org", avg_grant: 350000, grant_range: [50000, 1000000] as [number, number], min_revenue: 500000, min_years: 5, requires: ["annual_report", "board_staff", "mission"], deadline: "Rolling (invitation-based)", type: "Private Foundation" },
  { name: "Walton Family Foundation", focus: "K-12 Education Reform", ntee_prefixes: ["B"], url: "https://www.waltonfamilyfoundation.org", avg_grant: 350000, grant_range: [50000, 1000000] as [number, number], min_revenue: 250000, min_years: 3, requires: ["annual_report", "mission"], deadline: "March 15", type: "Private Foundation" },
  { name: "Carnegie Corporation of New York", focus: "Education & Equity", ntee_prefixes: ["B"], url: "https://www.carnegie.org", avg_grant: 250000, grant_range: [50000, 750000] as [number, number], min_revenue: 500000, min_years: 5, requires: ["annual_report", "board_staff", "mission"], deadline: "September 1", type: "Private Foundation" },
  { name: "U.S. Dept. of Education — Title IV-A", focus: "Student Support", ntee_prefixes: ["B"], url: "https://www.grants.gov", avg_grant: 200000, grant_range: [25000, 1000000] as [number, number], min_revenue: 100000, min_years: 2, requires: ["annual_report", "mission", "board_staff"], deadline: "June 30", type: "Federal Agency" },
  { name: "W.K. Kellogg Foundation", focus: "Children, families, communities", ntee_prefixes: ["B", "P", "S", "E"], url: "https://www.wkkf.org", avg_grant: 400000, grant_range: [50000, 1500000] as [number, number], min_revenue: 500000, min_years: 5, requires: ["annual_report", "board_staff", "mission", "donate"], deadline: "Rolling", type: "Private Foundation" },
  { name: "Spencer Foundation", focus: "Education research", ntee_prefixes: ["B"], url: "https://www.spencer.org", avg_grant: 50000, grant_range: [10000, 500000] as [number, number], min_revenue: 100000, min_years: 2, requires: ["mission", "annual_report"], deadline: "Annual cycles", type: "Private Foundation" },
  { name: "Jack Kent Cooke Foundation", focus: "Education access for high-achieving, low-income students", ntee_prefixes: ["B"], url: "https://www.jkcf.org", avg_grant: 150000, grant_range: [25000, 500000] as [number, number], min_revenue: 250000, min_years: 3, requires: ["mission", "board_staff"], deadline: "Rolling", type: "Private Foundation" },

  // ── Health (E, F, G) ───────────────────────────────────
  { name: "Robert Wood Johnson Foundation", focus: "Health and health equity", ntee_prefixes: ["E", "F", "G"], url: "https://www.rwjf.org", avg_grant: 500000, grant_range: [50000, 2000000] as [number, number], min_revenue: 1000000, min_years: 5, requires: ["annual_report", "board_staff", "mission"], deadline: "Multiple cycles per year", type: "Private Foundation" },
  { name: "HHS Administration for Community Living", focus: "Aging & disability services", ntee_prefixes: ["E", "F", "P"], url: "https://www.grants.gov", avg_grant: 200000, grant_range: [25000, 500000] as [number, number], min_revenue: 100000, min_years: 2, requires: ["annual_report", "mission"], deadline: "April 1", type: "Federal Agency" },
  { name: "The California Endowment", focus: "Health equity, community health", ntee_prefixes: ["E", "F", "G", "P"], url: "https://www.calendow.org", avg_grant: 300000, grant_range: [50000, 1000000] as [number, number], min_revenue: 500000, min_years: 3, requires: ["annual_report", "mission", "board_staff"], deadline: "Rolling", type: "Private Foundation" },
  { name: "Commonwealth Fund", focus: "Health policy, health care access", ntee_prefixes: ["E", "G"], url: "https://www.commonwealthfund.org", avg_grant: 200000, grant_range: [50000, 500000] as [number, number], min_revenue: 500000, min_years: 5, requires: ["annual_report", "mission"], deadline: "By invitation", type: "Private Foundation" },

  // ── Environment (C, D) ─────────────────────────────────
  { name: "Wilburforce Foundation", focus: "Environmental conservation", ntee_prefixes: ["C", "D"], url: "https://wilburforce.org", avg_grant: 75000, grant_range: [15000, 200000] as [number, number], min_revenue: 100000, min_years: 2, requires: ["mission", "contact"], deadline: "Rolling", type: "Private Foundation" },
  { name: "EPA — Environmental Justice Grants", focus: "Environmental justice", ntee_prefixes: ["C", "D"], url: "https://www.grants.gov", avg_grant: 150000, grant_range: [50000, 300000] as [number, number], min_revenue: 50000, min_years: 2, requires: ["mission", "contact"], deadline: "November 1", type: "Federal Agency" },
  { name: "Patagonia Environmental Grants", focus: "Environmental activism, land & water protection", ntee_prefixes: ["C", "D"], url: "https://www.patagonia.com/actionworks/grants", avg_grant: 15000, grant_range: [5000, 50000] as [number, number], min_revenue: 0, min_years: 1, requires: ["mission"], deadline: "Rolling", type: "Corporate Foundation" },
  { name: "Doris Duke Foundation", focus: "Arts, environment, medical research", ntee_prefixes: ["A", "C", "H"], url: "https://www.dorisduke.org", avg_grant: 300000, grant_range: [50000, 750000] as [number, number], min_revenue: 500000, min_years: 5, requires: ["annual_report", "board_staff"], deadline: "Annual (varies by program)", type: "Private Foundation" },

  // ── Arts & Culture (A) ─────────────────────────────────
  { name: "National Endowment for the Arts", focus: "Arts & culture", ntee_prefixes: ["A"], url: "https://www.arts.gov", avg_grant: 25000, grant_range: [10000, 100000] as [number, number], min_revenue: 0, min_years: 3, requires: ["mission", "annual_report", "board_staff"], deadline: "Feb & Jul annually", type: "Federal Agency" },
  { name: "Kresge Foundation — Arts & Culture", focus: "Arts organizations as community anchors", ntee_prefixes: ["A", "B", "P", "S", "L"], url: "https://kresge.org", avg_grant: 200000, grant_range: [25000, 750000] as [number, number], min_revenue: 250000, min_years: 3, requires: ["annual_report", "mission"], deadline: "February 15", type: "Private Foundation" },
  { name: "Andrew W. Mellon Foundation", focus: "Arts, humanities, higher education", ntee_prefixes: ["A", "B"], url: "https://www.mellon.org", avg_grant: 400000, grant_range: [50000, 2000000] as [number, number], min_revenue: 1000000, min_years: 5, requires: ["annual_report", "board_staff", "mission"], deadline: "By invitation", type: "Private Foundation" },

  // ── Human Services (P, S, L) ───────────────────────────
  { name: "United Way (local chapters)", focus: "Human services, community support", ntee_prefixes: ["P", "S"], url: "https://www.unitedway.org", avg_grant: 35000, grant_range: [5000, 100000] as [number, number], min_revenue: 50000, min_years: 2, requires: ["mission", "board_staff", "contact"], deadline: "Annual (varies by chapter)", type: "Federated Fund" },
  { name: "Bank of America Foundation — Neighborhood Builders", focus: "Community development, economic mobility", ntee_prefixes: ["P", "S", "L"], url: "https://about.bankofamerica.com", avg_grant: 200000, grant_range: [200000, 200000] as [number, number], min_revenue: 250000, min_years: 3, requires: ["annual_report", "board_staff", "mission"], deadline: "Nomination-based", type: "Corporate Foundation" },
  { name: "Ford Foundation", focus: "Civic engagement, justice, democracy", ntee_prefixes: ["R", "S", "P", "I"], url: "https://www.fordfoundation.org", avg_grant: 300000, grant_range: [50000, 500000] as [number, number], min_revenue: 500000, min_years: 5, requires: ["annual_report", "board_staff", "mission"], deadline: "Rolling", type: "Private Foundation" },
  { name: "MacArthur Foundation", focus: "Community safety & justice", ntee_prefixes: ["I", "P", "S", "R"], url: "https://www.macfound.org", avg_grant: 300000, grant_range: [100000, 1000000] as [number, number], min_revenue: 500000, min_years: 5, requires: ["annual_report", "board_staff", "mission"], deadline: "Rolling", type: "Private Foundation" },
  { name: "The Libra Foundation", focus: "Human rights, environmental and economic justice", ntee_prefixes: ["R", "C", "S"], url: "https://www.librafoundation.org", avg_grant: 100000, grant_range: [10000, 300000] as [number, number], min_revenue: 100000, min_years: 2, requires: ["mission"], deadline: "Rolling", type: "Private Foundation" },

  // ── Food & Agriculture ─────────────────────────────────
  { name: "USDA NIFA — Community Food Projects", focus: "Food security, agriculture", ntee_prefixes: ["K", "S"], url: "https://www.grants.gov", avg_grant: 150000, grant_range: [10000, 400000] as [number, number], min_revenue: 50000, min_years: 2, requires: ["mission", "contact"], deadline: "September 15", type: "Federal Agency" },
  { name: "PetSmart Charities", focus: "Animal welfare", ntee_prefixes: ["D"], url: "https://www.petsmartcharities.org", avg_grant: 50000, grant_range: [5000, 500000] as [number, number], min_revenue: 50000, min_years: 2, requires: ["mission", "contact"], deadline: "Quarterly cycles", type: "Corporate Foundation" },

  // ── Technology & Digital Equity ─────────────────────────
  { name: "Google.org — Digital Inclusion", focus: "Digital equity, broadband, tech access", ntee_prefixes: ["B", "S", "P", "U"], url: "https://www.google.org", avg_grant: 250000, grant_range: [50000, 500000] as [number, number], min_revenue: 100000, min_years: 2, requires: ["mission", "contact"], deadline: "October 1", type: "Corporate Foundation" },

  // ── Multi-area / broad ─────────────────────────────────
  { name: "Surdna Foundation", focus: "Community, environment, arts, youth justice", ntee_prefixes: ["C", "S", "A", "I"], url: "https://surdna.org", avg_grant: 150000, grant_range: [25000, 400000] as [number, number], min_revenue: 250000, min_years: 3, requires: ["annual_report", "mission", "board_staff"], deadline: "LOI rolling; full proposals by invitation", type: "Private Foundation" },
  { name: "Meyer Memorial Trust", focus: "Education, environment, housing, community", ntee_prefixes: ["B", "C", "L", "S"], url: "https://mmt.org", avg_grant: 150000, grant_range: [25000, 500000] as [number, number], min_revenue: 200000, min_years: 3, requires: ["annual_report", "board_staff", "mission"], deadline: "Rolling", type: "Private Foundation" },
  { name: "Community Foundation (local)", focus: "General purpose — search by county/city name", ntee_prefixes: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), url: "https://www.cof.org/community-foundation-locator", avg_grant: 15000, grant_range: [1000, 50000] as [number, number], min_revenue: 0, min_years: 1, requires: ["mission", "contact"], deadline: "Varies by community", type: "Community Foundation" },
];

const REQUIRE_LABELS: Record<string, string> = {
  annual_report: "Financial transparency (annual report / 990)",
  board_staff: "Published board or leadership info",
  mission: "Clear mission statement",
  contact: "Contact information",
  donate: "Online giving / donate page",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchFunders(nteeCode: string | null, orgJson: any, readiness: any, siteScan: any) {
  const prefix = (nteeCode || "").charAt(0).toUpperCase();
  const org = orgJson.organization || {};
  const filing = latestFiling(orgJson);
  const revenue = filing ? (filing.totrevenue || 0) : 0;
  const rulingYear = org.ruling_date ? parseInt(String(org.ruling_date).slice(0, 4)) : null;
  const orgAge = rulingYear ? CURRENT_YEAR - rulingYear : 0;
  const signals = siteScan ? (siteScan.signals || {}) : {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  for (const funder of FUNDER_SEED_LIST) {
    if (!funder.ntee_prefixes.includes(prefix)) continue;

    let score = 0;
    const fits: string[] = [];
    const blockers: string[] = [];
    let eligible = true;

    score += 30;
    fits.push("Cause-area match");

    if (revenue >= funder.min_revenue) {
      score += 25;
      fits.push(`Revenue ($${(revenue / 1e6).toFixed(1)}M) meets threshold`);
    } else if (funder.min_revenue > 0) {
      blockers.push(`Minimum revenue $${funder.min_revenue >= 1e6 ? (funder.min_revenue / 1e6).toFixed(1) + "M" : (funder.min_revenue / 1e3) + "K"} (org has $${revenue >= 1e6 ? (revenue / 1e6).toFixed(1) + "M" : Math.round(revenue / 1e3) + "K"})`);
      if (revenue < funder.min_revenue * 0.5) eligible = false;
    }

    if (orgAge >= funder.min_years) {
      score += 15;
      fits.push(`${orgAge} years in operation (min ${funder.min_years})`);
    } else {
      blockers.push(`Requires ${funder.min_years}+ years (org est. ${rulingYear || "unknown"})`);
      if (funder.min_years - orgAge > 2) eligible = false;
    }

    if (readiness.compliance.score >= 70) {
      score += 10;
    } else {
      blockers.push("Filing history has gaps or is out of date");
    }

    const reqPts = Math.floor(20 / Math.max(funder.requires.length, 1));
    for (const req of funder.requires) {
      if (signals[req]) {
        score += reqPts;
      } else if (siteScan) {
        blockers.push(`${REQUIRE_LABELS[req] || req} not found on website`);
      } else {
        blockers.push(`No website provided — can't verify: ${REQUIRE_LABELS[req] || req}`);
      }
    }

    results.push({
      ...funder,
      match_pct: Math.min(score, 100),
      fits,
      blockers,
      eligible,
    });
  }

  results.sort((a, b) => b.match_pct - a.match_pct);
  return results;
}

/* ── Action items ───────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildActionItems(grantMatches: any[], readiness: any, siteScan: any) {
  const signalBlockCounts: Record<string, number> = {};
  for (const m of grantMatches) {
    for (const req of m.requires || []) {
      const signals = siteScan ? (siteScan.signals || {}) : {};
      if (!signals[req]) {
        signalBlockCounts[req] = (signalBlockCounts[req] || 0) + 1;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actions: any[] = [];

  for (const [signal, count] of Object.entries(signalBlockCounts)) {
    actions.push({
      action: `Add ${REQUIRE_LABELS[signal] || signal} to your website`,
      unlocks: count,
      category: "digital",
      priority: count >= 3 ? "high" : count >= 2 ? "medium" : "low",
    });
  }

  if (readiness.compliance.score < 70) {
    actions.push({ action: "Bring IRS filings up to date", unlocks: grantMatches.length, category: "compliance", priority: "high" });
  }
  if (readiness.financial.score < 50) {
    actions.push({ action: "Strengthen financial position (reduce deficit, build reserves)", unlocks: 0, category: "financial", priority: "medium" });
  }
  if (!siteScan) {
    actions.push({ action: "Provide your website URL for a full digital assessment", unlocks: grantMatches.filter((m: { requires: string[] }) => m.requires.length > 0).length, category: "digital", priority: "high" });
  } else if (!siteScan.reachable) {
    actions.push({ action: "Fix website (currently unreachable)", unlocks: grantMatches.filter((m: { requires: string[] }) => m.requires.length > 0).length, category: "digital", priority: "high" });
  }

  const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => pOrder[a.priority] - pOrder[b.priority] || b.unlocks - a.unlocks);

  return actions;
}

/* ── Handler ────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ein = params.get("ein");
  const websiteUrl = (params.get("website") || "").trim();

  if (!ein) {
    return NextResponse.json({ error: "Missing ein parameter" }, { status: 400 });
  }

  try {
    const orgJson = await getOrg(ein);
    const siteScan = websiteUrl ? await scanWebsite(websiteUrl) : null;
    const readiness = computeReadiness(orgJson, siteScan);
    const org = orgJson.organization || {};
    const grantMatches = matchFunders(org.ntee_code, orgJson, readiness, siteScan);
    const actionItems = buildActionItems(grantMatches, readiness, siteScan);

    return NextResponse.json({ org, readiness, grantMatches, actionItems, siteScan, websiteUrl });
  } catch (err) {
    return NextResponse.json(
      { error: `Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 502 }
    );
  }
}
