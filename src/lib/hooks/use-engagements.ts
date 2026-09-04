"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DbEngagementWithOrg,
  EngagementStage,
  EngagementOutcome,
} from "../db/types";
import {
  listEngagements,
  createEngagement,
  updateEngagementStage,
  updateEngagementOutcome,
  updateEngagementNotes,
  deleteEngagement,
  engagementExists,
} from "../db/engagements";

export function useEngagements(filters?: {
  orgId?: string;
  stage?: EngagementStage;
  stages?: EngagementStage[];
}) {
  const [engagements, setEngagements] = useState<DbEngagementWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listEngagements(filters);
      setEngagements(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load engagements");
    } finally {
      setLoading(false);
    }
  }, [filters?.orgId, filters?.stage, filters?.stages?.join(",")]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEngagement = useCallback(
    async (engagement: {
      org_id: string;
      opportunity_id?: string;
      funder_name: string;
      opportunity_name: string;
      stage?: EngagementStage;
      deadline?: string;
      match_pct?: number;
      fits?: string[];
      blockers?: string[];
      amount_requested?: number;
      notes?: string;
    }) => {
      try {
        // Check for duplicates
        if (engagement.opportunity_id) {
          const exists = await engagementExists(
            engagement.org_id,
            engagement.opportunity_id
          );
          if (exists) return null;
        }
        const created = await createEngagement(engagement);
        await refresh();
        return created;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create engagement");
        return null;
      }
    },
    [refresh]
  );

  const moveStage = useCallback(
    async (id: string, stage: EngagementStage) => {
      try {
        await updateEngagementStage(id, stage);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update stage");
      }
    },
    [refresh]
  );

  const setOutcome = useCallback(
    async (id: string, outcome: EngagementOutcome) => {
      try {
        await updateEngagementOutcome(id, outcome);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update outcome");
      }
    },
    [refresh]
  );

  const setNotes = useCallback(
    async (id: string, notes: string) => {
      try {
        await updateEngagementNotes(id, notes);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update notes");
      }
    },
    [refresh]
  );

  const removeEngagement = useCallback(
    async (id: string) => {
      try {
        await deleteEngagement(id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete engagement");
      }
    },
    [refresh]
  );

  return {
    engagements,
    loading,
    error,
    refresh,
    addEngagement,
    moveStage,
    setOutcome,
    setNotes,
    removeEngagement,
  };
}
