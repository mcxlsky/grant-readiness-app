"use client";

import { useState, useEffect, useCallback } from "react";
import type { DbOrganization } from "../db/types";
import {
  listOrganizations,
  createOrganization,
  updateOrganizationAnalysis,
  updateOrganizationStage,
  deleteOrganization,
  getOrganizationByEin,
} from "../db/organizations";
import type { AnalysisData, OrgSearchResult } from "../types";

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<DbOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listOrganizations();
      setOrganizations(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addOrg = useCallback(
    async (org: OrgSearchResult): Promise<DbOrganization | null> => {
      try {
        // Check if already exists
        const existing = await getOrganizationByEin(org.ein);
        if (existing) return existing;

        const created = await createOrganization({
          ein: org.ein,
          strein: org.strein || String(org.ein),
          name: org.name,
          city: org.city || "",
          state: org.state || "",
          ntee_code: org.ntee_code || "",
        });
        await refresh();
        return created;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add organization");
        return null;
      }
    },
    [refresh]
  );

  const removeOrg = useCallback(
    async (id: string) => {
      try {
        await deleteOrganization(id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove organization");
      }
    },
    [refresh]
  );

  const saveAnalysis = useCallback(
    async (id: string, data: AnalysisData) => {
      try {
        await updateOrganizationAnalysis(id, data);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save analysis");
      }
    },
    [refresh]
  );

  const setStage = useCallback(
    async (id: string, stage: DbOrganization["stage"]) => {
      try {
        await updateOrganizationStage(id, stage);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update stage");
      }
    },
    [refresh]
  );

  return {
    organizations,
    loading,
    error,
    refresh,
    addOrg,
    removeOrg,
    saveAnalysis,
    setStage,
  };
}
