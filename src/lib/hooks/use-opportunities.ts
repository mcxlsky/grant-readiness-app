"use client";

import { useState, useEffect, useCallback } from "react";
import type { DbOpportunityWithFunder } from "../db/types";
import { listOpportunities } from "../db/opportunities";

export function useOpportunities(filters?: {
  type?: string;
  query?: string;
}) {
  const [opportunities, setOpportunities] = useState<DbOpportunityWithFunder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listOpportunities(filters);
      setOpportunities(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, [filters?.type, filters?.query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { opportunities, loading, error, refresh };
}
