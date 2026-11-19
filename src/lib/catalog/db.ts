import { getAuthClient } from "../admin-session";
import type { Availability, FunderDraft, FunderType } from "./import";

export type CatalogFunder = {
  id: string;
  name: string;
  type: FunderType;
  url: string | null;
  availability: Availability;
  service_areas: string[];
  programs: { program: string; deadline: string; next_deadline: string | null; amount_max: number }[];
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  open: "Open",
  rolling: "Rolling",
  upcoming: "Upcoming",
  invitation_only: "By invitation",
  closed: "Not funding",
  unclear: "Not checked",
};

/** The firm's funders with their programs. Row level security limits this to the caller's firm. */
export async function loadCatalog(firmId: string): Promise<CatalogFunder[] | null> {
  const { data, error } = await getAuthClient()
    .from("funders")
    .select("id, name, type, url, availability, service_areas, programs:grant_opportunities(program, deadline, next_deadline, amount_max)")
    .eq("firm_id", firmId)
    .order("name");
  return error ? null : (data as CatalogFunder[]);
}

export type ImportResult =
  | { ok: true; fundersAdded: number; fundersUpdated: number; programsAdded: number; programsUpdated: number }
  | { ok: false; error: "not_admin" | "failed" };

/** Saves the previewed funders in one transaction: all of them or none. */
export async function importCatalog(firmId: string, funders: FunderDraft[]): Promise<ImportResult> {
  // rowCount and aliases only help the preview; the database doesn't store them.
  const catalog = funders.map((funder) => {
    const { rowCount, aliases, ...rest } = funder;
    void rowCount;
    void aliases;
    return rest;
  });
  const { data, error } = await getAuthClient().rpc("import_catalog", { target_firm: firmId, catalog });
  if (error) return { ok: false, error: error.code === "42501" ? "not_admin" : "failed" };
  return {
    ok: true,
    fundersAdded: data.funders_added,
    fundersUpdated: data.funders_updated,
    programsAdded: data.programs_added,
    programsUpdated: data.programs_updated,
  };
}
