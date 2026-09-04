import { supabase } from "./client";
import type { DbApplication } from "./types";

export async function listApplications(): Promise<DbApplication[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getApplication(
  id: string
): Promise<DbApplication | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createApplication(
  app: Omit<DbApplication, "id" | "status" | "submitted_at" | "updated_at" | "last_viewed_at" | "notes" | "created_at">
): Promise<DbApplication> {
  const { data, error } = await supabase
    .from("applications")
    .insert({ ...app, status: "new", notes: "" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateApplicationStatus(
  id: string,
  status: DbApplication["status"]
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function updateApplicationNotes(
  id: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update({ notes })
    .eq("id", id);
  if (error) throw error;
}

export async function markApplicationViewed(id: string): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update({ last_viewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
