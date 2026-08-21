import type { GrantApplication, AppStatus } from "./types";

const STORAGE_KEY = "rsg_applications";

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

export function submitApplication(
  data: Omit<GrantApplication, "id" | "status" | "submittedAt" | "updatedAt" | "notes">
): GrantApplication {
  const apps = loadApplications();
  const app: GrantApplication = {
    ...data,
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
  app.notes = notes;
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
}

export function getApplication(id: string): GrantApplication | null {
  return loadApplications().find((a) => a.id === id) || null;
}
