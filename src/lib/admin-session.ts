const KEY = "rsg_admin";

export type AdminSession = { name: string; email: string; signedInAt: number };

// Prototype-only session kept in localStorage; not real authentication.
export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.name === "string" && parsed.signedInAt ? parsed : null;
  } catch {
    return null;
  }
}

export function signInAdmin(name: string, email: string) {
  const session: AdminSession = { name, email, signedInAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function signOutAdmin() {
  localStorage.removeItem(KEY);
}
