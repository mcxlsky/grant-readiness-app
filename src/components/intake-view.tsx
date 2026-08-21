"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { IconAnalyze, IconChevronLeft } from "@tabler/icons-react";
import type { PortfolioOrg, AnalysisData } from "@/lib/types";

interface IntakeViewProps {
  org: PortfolioOrg;
  onAnalysisComplete: (ein: number, data: AnalysisData) => void;
  onBack: () => void;
}

export function IntakeView({ org, onAnalysisComplete, onBack }: IntakeViewProps) {
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = `/api/analyze?ein=${org.ein}${website ? `&website=${encodeURIComponent(website)}` : ""}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      onAnalysisComplete(org.ein, data);
    } catch (err) {
      setError(
        "Analysis failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400"
      >
        <IconChevronLeft className="h-3.5 w-3.5" />
        Organizations
      </button>

      {/* Org header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {org.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
          EIN {org.strein} · {org.city}
          {org.city && org.state ? ", " : ""}
          {org.state}
          {org.ntee_code ? ` · NTEE ${org.ntee_code}` : ""}
        </p>
      </div>

      {/* Analyze card */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
          <IconAnalyze className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Run Grant Readiness Assessment
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-neutral-400">
          We&apos;ll pull live IRS 990 data and scan the org&apos;s website for
          grant-readiness signals.
        </p>

        {error && (
          <div className="mx-auto mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleAnalyze}
          className="mx-auto mt-6 flex max-w-md gap-2"
        >
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website URL (recommended)"
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? <span className="spinner" /> : "Analyze"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
