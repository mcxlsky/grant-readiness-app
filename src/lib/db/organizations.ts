import { supabase } from "./client";
import type { DbOrganization } from "./types";
import type { AnalysisData } from "../types";

export async function listOrganizations(): Promise<DbOrganization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrganization(id: string): Promise<DbOrganization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrganizationByEin(ein: number): Promise<DbOrganization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("ein", ein)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createOrganization(org: {
  ein: number;
  strein: string;
  name: string;
  city?: string;
  state?: string;
  ntee_code?: string;
}): Promise<DbOrganization> {
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      ein: org.ein,
      strein: org.strein,
      name: org.name,
      city: org.city ?? "",
      state: org.state ?? "",
      ntee_code: org.ntee_code ?? "",
      stage: "intake",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrganizationAnalysis(
  id: string,
  analysisData: AnalysisData
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({
      analysis_data: analysisData as unknown as Record<string, unknown>,
      stage: "assessed",
      analyzed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function updateOrganizationStage(
  id: string,
  stage: DbOrganization["stage"]
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({ stage })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
