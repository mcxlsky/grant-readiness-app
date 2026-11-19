/**
 * Turns a firm's funder spreadsheet (exported as CSV) into a clean catalog:
 * one funder per real-world funder, with its programs, typical deadlines and
 * amounts. Pure functions with no imports, so this runs in the browser and can be
 * checked against real files with plain Node.
 */

export type FunderType =
  | "Foundation"
  | "Community Foundation"
  | "Corporate"
  | "Federal"
  | "State"
  | "Government"
  | "Prize"
  | "Network"
  | "Other";

export type Availability = "open" | "rolling" | "upcoming" | "invitation_only" | "closed" | "unclear";

export type ProgramDraft = {
  program: string;
  program_key: string;
  focus: string[];
  amount_min: number;
  amount_max: number;
  deadline: string;
  next_deadline: string | null;
  deadline_estimated: boolean;
  url: string | null;
  source: string;
};

export type FunderDraft = {
  name: string;
  name_key: string;
  type: FunderType;
  url: string | null;
  ein: number | null;
  focus_areas: string[];
  service_areas: string[];
  availability: Availability;
  how_to_apply: string;
  contact: string;
  notes: string;
  source: string;
  programs: ProgramDraft[];
  /** How many spreadsheet rows were merged into this funder. */
  rowCount: number;
  /** The different spellings found, when more than one. */
  aliases: string[];
};

export type ImportWarning =
  | { kind: "possible_duplicate"; names: string[] }
  | { kind: "large_amount"; funder: string; amount: number }
  | { kind: "skipped_row"; row: number; reason: string };

export type CatalogPreview = {
  funders: FunderDraft[];
  warnings: ImportWarning[];
  rowsRead: number;
  rowsMerged: number;
  rowsWithEmail: number;
  missingColumns: string[];
};

// ── CSV ──────────────────────────────────────────────────────

/** RFC 4180 CSV: quoted fields may contain commas, quotes ("") and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

// ── Columns ──────────────────────────────────────────────────

const COLUMNS = {
  name: ["foundation", "funder", "funder name", "organization", "name"],
  type: ["grant type", "funder type", "type"],
  deadline: ["typical deadline(s)", "typical deadlines", "deadline(s)", "deadlines", "deadline"],
  url: ["website / portal", "website", "portal", "url"],
  focus: ["focus areas", "focus area", "focus"],
  contact: ["point of contact", "contact", "contacts"],
  area: ["service area (states/counties/countries)", "service area", "service areas", "geography", "region"],
  program: ["program(s) funded", "programs funded", "programs", "program"],
  amount: ["amount requested", "amount", "amounts", "grant size"],
  status: ["status"],
  howToApply: ["how to apply", "application process", "notes"],
  ein: ["ein", "tax id"],
} as const;

type ColumnKey = keyof typeof COLUMNS;
const REQUIRED: ColumnKey[] = ["name"];

function mapColumns(header: string[]) {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const index = {} as Record<ColumnKey, number>;
  for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
    index[key] = normalized.findIndex((h) => (COLUMNS[key] as readonly string[]).includes(h));
  }
  const missing = REQUIRED.filter((key) => index[key] < 0).map((key) => COLUMNS[key][0]);
  return { index, missing };
}

// ── Names ────────────────────────────────────────────────────

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Tidies spacing and fixes misspellings of "Foundation" ("Founadtion", "Foudnation"). */
export function cleanName(raw: string) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      return lower !== "foundation" && lower.length >= 8 && lower.startsWith("fou") && editDistance(lower, "foundation") <= 2
        ? "Foundation"
        : word;
    })
    .join(" ");
}

const NAME_FILLER = new Set(["the", "foundation", "fund", "inc", "charitable", "trust", "for", "of", "and", "co", "llc"]);

/** The same key for the same funder however it's written: "W. O'Neil", "The W O'Neil Foundation". */
export function nameKey(name: string) {
  const words = cleanName(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const kept = words.filter((w) => !NAME_FILLER.has(w));
  return (kept.length ? kept : words).join(" ");
}

export const programKey = (program: string) => program.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ── Field rules ──────────────────────────────────────────────

export function funderType(raw: string): FunderType {
  const value = raw.toLowerCase();
  if (value.includes("community")) return "Community Foundation";
  if (value.includes("corporate")) return "Corporate";
  if (value.includes("federal")) return "Federal";
  if (value.includes("government") || value.includes("public")) return "Government";
  if (value.includes("state")) return "State";
  if (value.includes("prize") || value.includes("award")) return "Prize";
  if (value.includes("network")) return "Network";
  if (value.includes("fou")) return "Foundation";
  return "Other";
}

const splitList = (raw: string) =>
  raw
    .split(/[;\n]/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

function uniqueCaseless(values: string[]) {
  const seen = new Map<string, string>();
  for (const value of values) if (!seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  return [...seen.values()];
}

// Groups the free-text focus labels into a short list for matching. First match wins.
const FOCUS_CATEGORIES: [RegExp, string][] = [
  [/mental health/i, "Mental Health"],
  [/stem|technolog|internet|digital/i, "STEM & Technology"],
  [/health|ncd|hiv|cancer|diabetes|nursing|medical|\bwash\b/i, "Health"],
  [/educat|scholar|literacy|teacher|school|textbook/i, "Education"],
  [/workforce|employment|\bjobs?\b/i, "Workforce Development"],
  [/general operating|^general$/i, "General Operating"],
  [/international|global|humanitarian/i, "International Development"],
  [/community development|economic|financ/i, "Community & Economic Development"],
  [/food|nutrition|hunger|agricultur|soil/i, "Food & Nutrition"],
  [/emergency|disaster|relief|covid|rebuild/i, "Emergency Relief"],
  [/\barts?\b|culture|media/i, "Arts & Culture"],
  [/capital|facilit/i, "Capital & Facilities"],
  [/women|girls/i, "Women & Girls"],
  [/youth|child|adolescen|athletic/i, "Youth"],
  [/advocacy|social impact|justice|collaboration|entrepreneur/i, "Advocacy & Social Impact"],
  [/ministry|catholic|faith/i, "Faith-Based"],
  [/transport/i, "Transportation"],
  [/sustainab|energy|water|environment/i, "Environment"],
];

export function focusCategories(labels: string[]) {
  const categories = new Set<string>();
  for (const label of labels) {
    const match = FOCUS_CATEGORIES.find(([pattern]) => pattern.test(label));
    categories.add(match ? match[1] : "Other");
    // Global health is both health and international work.
    if (/global health/i.test(label)) categories.add("International Development");
  }
  return [...categories];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type MonthDay = { month: number; day: number | null };

/** Every month and day a deadline cell mentions, from "11/01/2024" or "March 1" or "Annual - November". */
export function deadlineDates(raw: string): MonthDay[] {
  const found: MonthDay[] = [];
  for (const [, m, d] of raw.matchAll(/\b(\d{1,2})\/(\d{1,2})\/\d{2,4}\b/g)) {
    found.push({ month: Number(m) - 1, day: Number(d) });
  }
  const named = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s+(\d{1,2})(?!\d|\/))?/gi;
  for (const [, month, day] of raw.matchAll(named)) {
    found.push({ month: MONTHS.indexOf(month.toLowerCase()), day: day ? Number(day) : null });
  }
  const unique = new Map(found.filter((d) => d.month >= 0).map((d) => [`${d.month}-${d.day}`, d]));
  return [...unique.values()].sort((a, b) => a.month - b.month || (a.day ?? 0) - (b.day ?? 0));
}

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** The next time any of these dates comes round, counting from today. */
export function nextOccurrence(dates: MonthDay[], today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let best: Date | null = null;
  for (const { month, day } of dates) {
    if (day === null) continue;
    let candidate = new Date(start.getFullYear(), month, day);
    if (candidate < start) candidate = new Date(start.getFullYear() + 1, month, day);
    if (!best || candidate < best) best = candidate;
  }
  return best ? isoDate(best) : null;
}

/** A readable cycle, like "Typically Mar 1, Jul 1, Nov 1", or the cleaned original wording. */
export function describeDeadline(raw: string, dates: MonthDay[]) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (/rolling/i.test(text) && dates.length === 0) return "Rolling";
  if (/invit/i.test(text) && dates.length === 0) return "By invitation";
  if (dates.length === 0) return text || "Unknown";
  const months = new Set(dates.map((d) => d.month));
  if (months.size >= 8) return "Several times a year";
  const labels = uniqueCaseless(dates.map((d) => (d.day ? `${MONTH_NAMES[d.month]} ${d.day}` : MONTH_NAMES[d.month])));
  return /rolling/i.test(text) ? `Rolling; typically ${labels.join(", ")}` : `Typically ${labels.join(", ")}`;
}

export function availability(cells: string[]): Availability {
  const text = cells.join(" ").toLowerCase();
  if (/not currently funding|not funding|spending down|declining/.test(text)) return "closed";
  if (/invitation|invite only|invite-only|by invitation/.test(text)) return "invitation_only";
  if (/rolling/.test(text)) return "rolling";
  return "unclear";
}

/** Dollar amounts in a cell: "10000; 27000", "$50,000–$300,000", "~$10,000", "$1.5 million". */
export function amounts(raw: string) {
  const values: number[] = [];
  for (const [, digits, unit] of raw.matchAll(/\$?\s?(\d[\d,]*(?:\.\d+)?)\s*(million|m\b|k\b)?/gi)) {
    let value = Number(digits.replace(/,/g, ""));
    if (unit && /^m/i.test(unit)) value *= 1_000_000;
    if (unit && /^k/i.test(unit)) value *= 1_000;
    if (value >= 100) values.push(Math.round(value));
  }
  return values;
}

const PLACEHOLDER_PROGRAMS = new Set(["", "n/a", "na", "tbd", "general", "loi", "invite only", "grant application"]);

function programName(raw: string) {
  const parts = uniqueCaseless(splitList(raw.replace(/\s*\/\s*/g, " / ")));
  const meaningful = parts.filter((p) => !PLACEHOLDER_PROGRAMS.has(p.toLowerCase()));
  return meaningful.length ? meaningful.join("; ") : "General support";
}

const LARGE_AMOUNT = 10_000_000;

// ── Building the catalog ─────────────────────────────────────

/** Reads a funder spreadsheet's CSV text into a preview of the catalog it would create. */
export function buildCatalog(csvText: string, today = new Date()): CatalogPreview {
  const [header = [], ...body] = parseCsv(csvText);
  const { index, missing } = mapColumns(header);
  const preview: CatalogPreview = { funders: [], warnings: [], rowsRead: body.length, rowsMerged: 0, rowsWithEmail: 0, missingColumns: missing };
  if (missing.length) return preview;

  const cell = (row: string[], key: ColumnKey) => (index[key] >= 0 ? (row[index[key]] ?? "").trim() : "");
  const byKey = new Map<string, { names: string[]; rows: string[][] }>();

  body.forEach((row, i) => {
    const name = cleanName(cell(row, "name"));
    if (!name) {
      preview.warnings.push({ kind: "skipped_row", row: i + 2, reason: "no funder name" });
      return;
    }
    if (/@/.test(cell(row, "contact") + cell(row, "howToApply"))) preview.rowsWithEmail++;
    const key = nameKey(name);
    const group = byKey.get(key) ?? { names: [], rows: [] };
    group.names.push(name);
    group.rows.push(row);
    byKey.set(key, group);
  });

  for (const [key, group] of byKey) {
    const { rows } = group;
    const names = uniqueCaseless(group.names);
    preview.rowsMerged += rows.length - 1;

    const types = rows.map((r) => funderType(cell(r, "type")));
    const focusAreas = uniqueCaseless(rows.flatMap((r) => splitList(cell(r, "focus"))));
    const statuses = uniqueCaseless(rows.map((r) => cell(r, "status")).filter(Boolean));
    const einDigits = rows.map((r) => cell(r, "ein").replace(/\D/g, "")).find((d) => d.length === 9);
    const url = rows.map((r) => cell(r, "url")).find((u) => /^https?:\/\//i.test(u)) ?? null;

    // One program per distinct "Program(s) Funded" value, merging rows that repeat it.
    const programs = new Map<string, { name: string; rows: string[][] }>();
    for (const row of rows) {
      const name = programName(cell(row, "program"));
      const pKey = programKey(name);
      const entry = programs.get(pKey) ?? { name, rows: [] };
      entry.rows.push(row);
      programs.set(pKey, entry);
    }

    const funder: FunderDraft = {
      name: names.reduce((a, b) => (b.length > a.length ? b : a)),
      name_key: key,
      type: types.find((t) => t !== "Other") ?? "Other",
      url,
      ein: einDigits ? Number(einDigits) : null,
      focus_areas: focusAreas,
      service_areas: uniqueCaseless(rows.flatMap((r) => splitList(cell(r, "area")))),
      availability: availability(rows.flatMap((r) => [cell(r, "deadline"), cell(r, "status"), cell(r, "program")])),
      how_to_apply: uniqueCaseless(rows.map((r) => cell(r, "howToApply")).filter(Boolean)).join("\n\n"),
      contact: uniqueCaseless(rows.map((r) => cell(r, "contact")).filter(Boolean)).join("; "),
      notes: statuses.length ? `Status in imported sheet: ${statuses.join("; ")}` : "",
      source: "import",
      programs: [],
      rowCount: rows.length,
      aliases: names.length > 1 ? names : [],
    };

    for (const [pKey, entry] of programs) {
      const deadlineText = uniqueCaseless(entry.rows.map((r) => cell(r, "deadline")).filter(Boolean)).join("; ");
      const dates = deadlineDates(deadlineText);
      let values = entry.rows.flatMap((r) => amounts(cell(r, "amount")));
      for (const value of values.filter((v) => v > LARGE_AMOUNT)) {
        preview.warnings.push({ kind: "large_amount", funder: funder.name, amount: value });
      }
      values = values.filter((v) => v <= LARGE_AMOUNT);
      const next = nextOccurrence(dates, today);

      funder.programs.push({
        program: entry.name,
        program_key: pKey,
        focus: focusCategories(uniqueCaseless(entry.rows.flatMap((r) => splitList(cell(r, "focus"))))),
        amount_min: values.length ? Math.min(...values) : 0,
        amount_max: values.length ? Math.max(...values) : 0,
        deadline: describeDeadline(deadlineText, dates),
        next_deadline: next,
        deadline_estimated: next !== null,
        url,
        source: "import",
      });
    }

    preview.funders.push(funder);
  }

  preview.funders.sort((a, b) => a.name.localeCompare(b.name));
  preview.warnings.push(...possibleDuplicates(preview.funders));
  return preview;
}

/** Funders whose names suggest the same organisation, for a person to check. Never merged automatically. */
function possibleDuplicates(funders: FunderDraft[]): ImportWarning[] {
  const tokens = funders.map((f) => ({
    name: f.name,
    words: new Set(f.name_key.split(" ").filter((w) => w.length >= 3)),
    // "S&P Global" keeps only "global" above, so judge one-word names by their full key.
    oneWord: !f.name_key.includes(" "),
  }));
  const parent = tokens.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));

  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const [small, large] = tokens[i].words.size <= tokens[j].words.size ? [tokens[i], tokens[j]] : [tokens[j], tokens[i]];
      if (small.words.size === 0) continue;
      const contained = [...small.words].every((w) => large.words.has(w));
      // Two-word or longer names only, so "M&T Bank" doesn't pull in every "Bank".
      if (contained && small.words.size >= 2) parent[find(i)] = find(j);
      // A one-word name like "Cafritz" or "Raskob" inside a longer one. Not a shared word like "Global".
      else if (contained && small.oneWord && [...small.words][0].length >= 6) parent[find(i)] = find(j);
    }
  }

  const groups = new Map<number, string[]>();
  tokens.forEach((t, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), t.name]));
  return [...groups.values()].filter((names) => names.length > 1).map((names) => ({ kind: "possible_duplicate", names }));
}
