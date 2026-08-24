import type { GrantApplication, AppStatus, UploadedFile } from "./types";

const STORAGE_KEY = "rsg_applications";
const DOCS_PREFIX = "rsg_docs_";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadApplications(): GrantApplication[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveApplications(apps: GrantApplication[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

/** Strip HTML/script tags from a string to prevent stored XSS */
function sanitize(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/** Recursively sanitize all string values in an object */
function sanitizeData<T extends Record<string, unknown>>(data: T): T {
  const clean = { ...data };
  for (const key of Object.keys(clean)) {
    const val = clean[key];
    if (typeof val === "string") {
      (clean as Record<string, unknown>)[key] = sanitize(val);
    } else if (Array.isArray(val)) {
      (clean as Record<string, unknown>)[key] = val.map((item) =>
        typeof item === "string" ? sanitize(item) : item
      );
    }
  }
  return clean;
}

export function submitApplication(
  data: Omit<GrantApplication, "id" | "status" | "submittedAt" | "updatedAt" | "notes">
): GrantApplication {
  const apps = loadApplications();
  const app: GrantApplication = {
    ...sanitizeData(data as Record<string, unknown>) as typeof data,
    id: genId(),
    status: "new",
    submittedAt: Date.now(),
    updatedAt: Date.now(),
    notes: "",
  };
  apps.unshift(app);
  saveApplications(apps);
  return app;
}

export function updateApplicationStatus(id: string, status: AppStatus): void {
  const apps = loadApplications();
  const app = apps.find((a) => a.id === id);
  if (!app) return;
  app.status = status;
  app.updatedAt = Date.now();
  saveApplications(apps);
}

export function updateApplicationNotes(id: string, notes: string): void {
  const apps = loadApplications();
  const app = apps.find((a) => a.id === id);
  if (!app) return;
  app.notes = sanitize(notes);
  app.updatedAt = Date.now();
  saveApplications(apps);
}

export function markApplicationViewed(id: string): void {
  const apps = loadApplications();
  const app = apps.find((a) => a.id === id);
  if (!app) return;
  app.lastViewedAt = Date.now();
  saveApplications(apps);
}

export function deleteApplication(id: string): void {
  const apps = loadApplications().filter((a) => a.id !== id);
  saveApplications(apps);
  deleteApplicationDocuments(id);
}

export function getApplication(id: string): GrantApplication | null {
  return loadApplications().find((a) => a.id === id) || null;
}

/* ── Document storage (separate keys to avoid bloating the app array) ── */

export function saveApplicationDocuments(appId: string, docs: UploadedFile[]): void {
  try {
    localStorage.setItem(DOCS_PREFIX + appId, JSON.stringify(docs));
  } catch (e) {
    console.error("Failed to save documents — storage may be full", e);
    throw new Error("Storage full. Please remove some files and try again.");
  }
}

export function loadApplicationDocuments(appId: string): UploadedFile[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DOCS_PREFIX + appId) || "[]");
  } catch {
    return [];
  }
}

export function deleteApplicationDocuments(appId: string): void {
  localStorage.removeItem(DOCS_PREFIX + appId);
}
