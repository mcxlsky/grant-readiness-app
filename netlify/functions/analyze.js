/**
 * Netlify Function: /api/analyze
 * Full pipeline: fetch org from ProPublica, scan website, score readiness,
 * match funders, and generate a strategic plan.
 */
const cheerio = require("cheerio");

const PP_BASE = "https://projects.propublica.org/nonprofits/api/v2";
const PP_HEADERS = { "User-Agent": "GrantReadinessPrototype/0.1 (research/demo use)" };
const SCAN_UA = "Mozilla/5.0 (compatible; GrantReadinessPrototype/0.1; +research/demo use)";
const TIMEOUT_MS = 12_000;
const MAX_SUBPAGES = 3;
const CURRENT_YEAR = new Date().getFullYear();

/* ── ProPublica ─────────────────────────────────────────────── */

async function getOrg(ein) {
  const clean = String(ein).replace(/-/g, "").trim();
  const resp = await fetch(`${PP_BASE}/organizations/${clean}.json`, { headers: PP_HEADERS });
  if (!resp.ok) throw new Error(`ProPublica returned ${resp.status}`);
  return resp.json();
}

/* ── Website scanner ────────────────────────────────────────── */

const SIGNAL_KEYWORDS = {
  donate: ["donate", "give now", "support us", "make a gift", "ways to give", "donation"],
  board_staff: ["board of directors", "our board", "leadership", "our team", "staff", "meet the team", "who we are"],
  contact: ["contact us", "contact", "get in touch"],
  annual_report: ["annual report", "financials", "form 990", "990", "guidestar", "candid", "charity navigator", "transparency"],
  mission: ["our mission", "mission statement", "about us", "what we do"],
};

const SIGNAL_LABELS = {
  donate: "Has a clear way to donate or give online",
  board_staff: "Publishes board, leadership, or staff information",
  contact: "Has a contact page or visible contact info",
  annual_report: "Shares financials, an annual report, or 990/transparency info",
  mission: "States mission or 'about us' clearly",
};

async function fetchPage(url) {
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

function findLink($, baseUrl, keywords, sameDomain) {
  let found = null;
  $("a[href]").each((_, el) => {
    if (found) return;
    const label = $(el).text().toLowerCase().trim();
    if (keywords.some((kw) => label.includes(kw))) {
      try {
        const href = new URL($(el).attr("href"), baseUrl).toString();
        if (new URL(href).hostname === sameDomain) found = href;
      } catch { /* ignore bad URLs */ }
    }
  });
  return found;
}

async function scanWebsite(url) {
  const result = {
    url,
    reachable: false,
    error: null,
    title: null,
    meta_description: null,
    signals: Object.fromEntries(Object.keys(SIGNAL_KEYWORDS).map((k) => [k, false])),
    footer_year: null,
    word_count: 0,
    pages_checked: [],
    low_content_warning: false,
  };

  if (!url) { result.error = "no_url_provided"; return result; }
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  let page;
  try { page = await fetchPage(url); } catch (e) {
    result.error = `${e.name}: ${e.message}`;
    return result;
  }

  result.reachable = true;
  result.url = page.url;
  result.pages_checked.push(page.url);
  const sameDomain = new URL(page.url).hostname;

  const $ = cheerio.load(page.text);
  const text = $.root().text().replace(/\s+/g, " ").toLowerCase();
  result.word_count = text.split(/\s+/).filter(Boolean).length;

  const titleTag = $("title").first().text().trim();
  result.title = titleTag || null;
  const metaDesc = $('meta[name="description"]').attr("content");
  result.meta_description = metaDesc ? metaDesc.trim() : null;

  if (result.word_count < 60) result.low_content_warning = true;

  const linkTexts = $("a").map((_, el) => $(el).text().toLowerCase()).get().join(" ");
  const haystack = text + " " + linkTexts;

  for (const [signal, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
    result.signals[signal] = keywords.some((kw) => haystack.includes(kw));
  }

  const yearMatches = text.slice(-3000).match(/20[1-3]\d/g);
  if (yearMatches) result.footer_year = Math.max(...yearMatches.map(Number));

  // Follow sub-pages
  const missing = Object.keys(SIGNAL_KEYWORDS).filter((k) => !result.signals[k]);
  let fetched = 0;
  for (const signal of missing) {
    if (fetched >= MAX_SUBPAGES) break;
    const link = findLink($, page.url, SIGNAL_KEYWORDS[signal], sameDomain);
    if (!link || result.pages_checked.includes(link)) continue;
    try {
      const sub = await fetchPage(link);
      fetched++;
      result.pages_checked.push(sub.url);
      const $sub = cheerio.load(sub.text);
      const subText = $sub.root().text().replace(/\s+/g, " ").toLowerCase();
      const subLinks = $sub("a").map((_, el) => $sub(el).text().toLowerCase()).get().join(" ");
      const subHay = subText + " " + subLinks;
      for (const [sig, kws] of Object.entries(SIGNAL_KEYWORDS)) {
        if (!result.signals[sig] && kws.some((kw) => subHay.includes(kw))) {
          result.signals[sig] = true;
        }
      }
    } catch { /* skip unreachable subpage */ }
  }

  return result;
}

/* ── Scoring engine ─────────────────────────────────────────── */

const WEIGHTS = { financial: 0.35, compliance: 0.25, digital: 0.40 };

function latestFiling(orgJson) {
  const filings = orgJson.filings_with_data || [];
  if (!filings.length) return null;
  return filings.slice().sort((a, b) => (b.tax_prd_yr || 0) - (a.tax_prd_yr || 0))[0];
}

function scoreFinancialHealth(orgJson) {
  const filing = latestFiling(orgJson);
  const checks = [];
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

function scoreFilingCompliance(orgJson) {
  const checks = [];
  let points = 0;
  const org = orgJson.organization || {};
  const withData = orgJson.filings_with_data || [];
  const withoutData = orgJson.filings_without_data || [];
  const allYears = [...new Set([...withData, ...withoutData].map((f) => f.tax_prd_yr).filter(Boolean))].sort((a, b) => a - b);

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

function scoreDigitalHousekeeping(siteScan) {
  const checks = [];
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

  const weightMap = { donate: 20, board_staff: 20, contact: 15, annual_report: 15, mission: 15 };
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

function computeReadiness(orgJson, siteScan) {
  const fin = scoreFinancialHealth(orgJson);
  const comp = scoreFilingCompliance(orgJson);
  const dig = scoreDigitalHousekeeping(siteScan);

  const overall = fin.score * WEIGHTS.financial + comp.score * WEIGHTS.compliance + dig.score * WEIGHTS.digital;

  let tier;
  if (overall >= 80) tier = "Grant-Ready";
  else if (overall >= 65) tier = "Ready with Gaps";
  else if (overall >= 40) tier = "Needs Work";
  else tier = "Not Ready";

  const gaps = [];
  for (const section of [fin, comp, dig]) {
    for (const [label, passed] of section.checks) {
      if (!passed) gaps.push(label);
    }
  }

  return { overall: Math.round(overall * 10) / 10, tier, financial: fin, compliance: comp, digital: dig, gaps, weights: WEIGHTS };
}

/* ── Funder matching ────────────────────────────────────────── */

const FUNDER_SEED_LIST = [
  { name: "The Wallace Foundation", focus: "Education, arts participation, youth development", ntee_prefixes: ["A", "B"], url: "https://www.wallacefoundation.org" },
  { name: "Robert Wood Johnson Foundation", focus: "Health and health equity", ntee_prefixes: ["E", "F", "G"], url: "https://www.rwjf.org" },
  { name: "The Kresge Foundation", focus: "Community development, human services, education", ntee_prefixes: ["P", "S", "L", "B"], url: "https://kresge.org" },
  { name: "Doris Duke Foundation", focus: "Arts, environment, medical research", ntee_prefixes: ["A", "C", "H"], url: "https://www.dorisduke.org" },
  { name: "Wilburforce Foundation", focus: "Environmental conservation", ntee_prefixes: ["C", "D"], url: "https://wilburforce.org" },
  { name: "PetSmart Charities", focus: "Animal welfare", ntee_prefixes: ["D"], url: "https://www.petsmartcharities.org" },
  { name: "United Way (local chapters)", focus: "Human services, community support", ntee_prefixes: ["P", "S"], url: "https://www.unitedway.org" },
  { name: "National Endowment for the Arts", focus: "Arts & culture", ntee_prefixes: ["A"], url: "https://www.arts.gov" },
  { name: "Surdna Foundation", focus: "Community, environment, arts, youth justice", ntee_prefixes: ["C", "S", "A", "I"], url: "https://surdna.org" },
  { name: "The Libra Foundation", focus: "Human rights, environmental and economic justice", ntee_prefixes: ["R", "C", "S"], url: "https://www.librafoundation.org" },
  { name: "Local/regional community foundation", focus: "General purpose — search by county/city name", ntee_prefixes: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), url: "https://www.cof.org/community-foundation-locator" },
];

function matchFunders(nteeCode, limit = 5) {
  const prefix = (nteeCode || "").charAt(0).toUpperCase();
  let matches = FUNDER_SEED_LIST.filter((f) => f.ntee_prefixes.includes(prefix));
  if (!matches.length) matches = FUNDER_SEED_LIST.slice(0, limit);
  return matches.slice(0, limit);
}

/* ── Plan generator ─────────────────────────────────────────── */

const INTROS = {
  "Grant-Ready": "{name} shows strong fundamentals across financial health, IRS filing compliance, and public-facing transparency. This is a good time to actively pursue funder outreach.",
  "Ready with Gaps": "{name} has a workable foundation but carries specific gaps that should be closed before or alongside outreach — funders and reviewers will notice them.",
  "Needs Work": "{name} is not yet positioned to compete for competitive grants. The priority right now is fixing foundational issues, not funder outreach.",
  "Not Ready": "{name} has significant foundational gaps. Reaching out to funders before addressing these risks burning the relationship before it starts.",
};

const NEXT_STEPS = {
  ready: [
    "Weeks 1-2: Close any quick-fix housekeeping gaps below (website, contact info, board/staff page).",
    "Weeks 2-4: Draft tailored outreach to the funders below, referencing specific program fit.",
    "Ongoing: Track outreach and responses; re-run this assessment quarterly.",
  ],
  not_ready: [
    "Weeks 1-4: Resolve the foundational gaps below before any funder outreach.",
    "Month 2: Re-run this assessment to confirm readiness before approaching funders.",
    "In parallel: consider a readiness-focused consulting engagement to close gaps faster.",
  ],
};

function generatePlan(orgName, readiness, funders) {
  const { tier, overall, gaps, financial, compliance, digital } = readiness;
  const lines = [];
  lines.push(INTROS[tier].replace("{name}", orgName));
  lines.push("");
  lines.push(`Overall readiness score: ${overall}/100  (${tier})`);
  lines.push(`  Financial health: ${financial.score}/100   Filing compliance: ${compliance.score}/100   Digital housekeeping: ${digital.score}/100`);
  lines.push("");
  lines.push("Top priorities, in order:");
  const priorities = gaps.length ? gaps.slice(0, 6) : ["No major gaps detected — maintain current practices."];
  priorities.forEach((g, i) => lines.push(`  ${i + 1}. ${g}`));
  lines.push("");
  lines.push("Suggested next steps:");
  const key = ["Grant-Ready", "Ready with Gaps"].includes(tier) ? "ready" : "not_ready";
  NEXT_STEPS[key].forEach((s) => lines.push(`  - ${s}`));
  lines.push("");
  lines.push("Illustrative funder starter list (cause-area match — placeholder for a full funder database):");
  funders.forEach((f) => lines.push(`  - ${f.name} — ${f.focus}`));
  return lines.join("\n");
}

/* ── Handler ────────────────────────────────────────────────── */

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const ein = params.ein;
  const websiteUrl = (params.website || "").trim();

  if (!ein) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Missing ein parameter" }) };
  }

  try {
    const orgJson = await getOrg(ein);
    const siteScan = websiteUrl ? await scanWebsite(websiteUrl) : null;
    const readiness = computeReadiness(orgJson, siteScan);
    const org = orgJson.organization || {};
    const funders = matchFunders(org.ntee_code);
    const planText = generatePlan(org.name || "This organization", readiness, funders);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org, readiness, funders, planText, siteScan, websiteUrl }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Analysis failed: ${err.message}` }),
    };
  }
};
