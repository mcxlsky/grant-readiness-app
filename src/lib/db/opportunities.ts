import { supabase } from "./client";
import type { DbOpportunityWithFunder } from "./types";
import { GRANT_DATABASE, searchGrants } from "../grant-database";

/**
 * Map a static GrantListing to the DbOpportunityWithFunder shape.
 * Used as a fallback when Supabase tables don't exist yet.
 */
function staticFallback(filters?: {
  type?: string;
  query?: string;
}): DbOpportunityWithFunder[] {
  let results = filters?.query ? searchGrants(filters.query) : [...GRANT_DATABASE];

  if (filters?.type && filters.type !== "All") {
    results = results.filter((g) => g.type === filters.type);
  }

  return results.map((g) => ({
    id: g.id,
    funder_id: "",
    program: g.program,
    description: g.description,
    focus: g.focus,
    amount_min: g.amount_range[0],
    amount_max: g.amount_range[1],
    deadline: g.deadline,
    url: g.url,
    source: g.source,
    eligibility: g.eligibility,
    type: g.type,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    funder: { name: g.funder, url: g.url, type: g.type },
  }));
}

/** List active grant opportunities, joined with funder name.
 *  Falls back to static GRANT_DATABASE when Supabase is unavailable. */
export async function listOpportunities(filters?: {
  type?: string;
  query?: string;
}): Promise<DbOpportunityWithFunder[]> {
  try {
    let q = supabase
      .from("grant_opportunities")
      .select("*, funder:funders(name, url, type)")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (filters?.type && filters.type !== "All") {
      q = q.eq("type", filters.type);
    }

    const { data, error } = await q;

    // Fall back to static data if Supabase errors (table doesn't exist, etc.)
    if (error) {
      console.warn("Supabase grant_opportunities unavailable, using static data:", error.message);
      return staticFallback(filters);
    }

    let results = (data ?? []) as DbOpportunityWithFunder[];

    // If Supabase returned nothing (empty table), fall back to static
    if (results.length === 0) {
      return staticFallback(filters);
    }

    // Client-side text search (matches the existing searchGrants behavior)
    if (filters?.query?.trim()) {
      const terms = filters.query.toLowerCase().split(/\s+/);
      results = results.filter((g) => {
        const funderName = g.funder?.name ?? "";
        const text = [funderName, g.program, ...g.focus, g.description, g.type]
          .join(" ")
          .toLowerCase();
        return terms.every((t) => text.includes(t));
      });
    }

    return results;
  } catch {
    // Network error or other failure — use static data
    return staticFallback(filters);
  }
}

/** Get a single opportunity by ID */
export async function getOpportunity(
  id: string
): Promise<DbOpportunityWithFunder | null> {
  const { data, error } = await supabase
    .from("grant_opportunities")
    .select("*, funder:funders(name, url, type)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as DbOpportunityWithFunder | null;
}
