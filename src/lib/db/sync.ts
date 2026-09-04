/**
 * Sync bridge — ensures localStorage orgs exist in Supabase
 * so engagements can reference them via UUID foreign keys.
 *
 * This is a transition layer; once orgs are fully on Supabase
 * this file can be removed.
 */

import { supabase } from "./client";
import type { DbOrganization } from "./types";
import type { PortfolioOrg } from "../types";

/** Cache: EIN → Supabase org UUID (lives for the session) */
const einToId = new Map<number, string>();

/** Ensure all localStorage orgs exist in Supabase, return the EIN→ID map */
export async function syncOrgsToSupabase(
  portfolio: PortfolioOrg[]
): Promise<Map<number, string>> {
  if (portfolio.length === 0) return einToId;

  try {
    // Fetch all existing orgs from Supabase
    const { data: existing, error } = await supabase
      .from("organizations")
      .select("id, ein");

    if (error) {
      console.warn("Could not sync orgs to Supabase:", error.message);
      return einToId;
    }

    // Build a set of EINs already in Supabase
    const existingEins = new Set<number>();
    for (const row of existing ?? []) {
      existingEins.add(row.ein);
      einToId.set(row.ein, row.id);
    }

    // Find orgs that need to be inserted
    const toInsert = portfolio
      .filter((o) => !existingEins.has(o.ein))
      .map((o) => ({
        ein: o.ein,
        strein: o.strein || String(o.ein),
        name: o.name,
        city: o.city || "",
        state: o.state || "",
        ntee_code: o.ntee_code || "",
        stage: o.stage,
        added_at: new Date(o.addedAt).toISOString(),
        analyzed_at: o.analyzedAt
          ? new Date(o.analyzedAt).toISOString()
          : null,
        analysis_data: o.analysisData as unknown as Record<string, unknown> | null,
      }));

    if (toInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("organizations")
        .insert(toInsert)
        .select("id, ein");

      if (insertError) {
        console.warn("Failed to insert orgs:", insertError.message);
      } else {
        for (const row of inserted ?? []) {
          einToId.set(row.ein, row.id);
        }
      }
    }
  } catch (e) {
    console.warn("Org sync failed:", e);
  }

  return einToId;
}

/** Get the Supabase UUID for an org by EIN, syncing it if needed */
export async function getOrgIdByEin(
  ein: number,
  fallbackOrg?: PortfolioOrg
): Promise<string | null> {
  // Check cache first
  if (einToId.has(ein)) return einToId.get(ein)!;

  try {
    // Check Supabase
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("ein", ein)
      .maybeSingle();

    if (error) {
      console.warn("Could not look up org by EIN:", error.message);
      return null;
    }

    if (data) {
      einToId.set(ein, data.id);
      return data.id;
    }

    // Not found — create it if we have the data
    if (fallbackOrg) {
      const { data: created, error: createError } = await supabase
        .from("organizations")
        .insert({
          ein: fallbackOrg.ein,
          strein: fallbackOrg.strein || String(fallbackOrg.ein),
          name: fallbackOrg.name,
          city: fallbackOrg.city || "",
          state: fallbackOrg.state || "",
          ntee_code: fallbackOrg.ntee_code || "",
          stage: fallbackOrg.stage,
          added_at: new Date(fallbackOrg.addedAt).toISOString(),
          analyzed_at: fallbackOrg.analyzedAt
            ? new Date(fallbackOrg.analyzedAt).toISOString()
            : null,
          analysis_data: fallbackOrg.analysisData as unknown as Record<string, unknown> | null,
        })
        .select("id")
        .single();

      if (createError) {
        console.warn("Failed to create org:", createError.message);
        return null;
      }

      einToId.set(ein, created.id);
      return created.id;
    }

    return null;
  } catch {
    return null;
  }
}

/** Get the cached EIN→ID map (must call syncOrgsToSupabase first) */
export function getEinToIdMap(): Map<number, string> {
  return einToId;
}
