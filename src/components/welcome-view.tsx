"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import type { PortfolioOrg } from "@/lib/types";

interface WelcomeViewProps {
  hasOrgs: boolean;
  onOpenSearch: () => void;
  portfolio?: PortfolioOrg[];
  onSelectOrg?: (ein: number) => void;
}

function getOrgDomain(org: PortfolioOrg): string | null {
  const url = org.analysisData?.websiteUrl || org.analysisData?.siteScan?.url;
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function OrgLogo({ org }: { org: PortfolioOrg }) {
  const [failed, setFailed] = useState(false);
  const domain = getOrgDomain(org);

  if (!domain || failed) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
        {org.name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={`/api/logo?domain=${domain}`}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5 dark:bg-neutral-800"
      onError={() => setFailed(true)}
    />
  );
}

function ScoreCircle({ score }: { score: number | null }) {
  const size = 36;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score != null ? Math.min(score, 100) / 100 : 0;
  const offset = circumference * (1 - pct);

  const color =
    score == null
      ? "text-gray-300 dark:text-neutral-600"
      : score >= 80
      ? "text-emerald-500 dark:text-emerald-400"
      : score >= 60
      ? "text-amber-500 dark:text-amber-400"
      : "text-red-400 dark:text-red-400";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-100 dark:stroke-neutral-800"
        />
        {/* Progress ring */}
        {score != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`stroke-current ${color}`}
          />
        )}
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold ${
          score != null ? color : "text-gray-300 dark:text-neutral-600"
        }`}
      >
        {score != null ? score : "—"}
      </span>
    </div>
  );
}

export function WelcomeView({
  hasOrgs,
  onOpenSearch,
  portfolio = [],
  onSelectOrg,
}: WelcomeViewProps) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const filtered = useMemo(
    () =>
      q
        ? portfolio.filter(
            (o) =>
              o.name.toLowerCase().includes(q) ||
              (o.city && o.city.toLowerCase().includes(q)) ||
              (o.state && o.state.toLowerCase().includes(q))
          )
        : portfolio,
    [portfolio, q]
  );

  if (!hasOrgs) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Welcome to Ready Set Grants
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-neutral-500">
          Search for nonprofits, assess their grant readiness, and track them
          through your pipeline.
        </p>
        <button
          onClick={onOpenSearch}
          className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <IconPlus className="h-4 w-4" />
          Add Organization
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Search bar */}
      <div className="mb-4 flex items-center border-b border-gray-300 pb-1.5 dark:border-neutral-700">
        <IconSearch className="mr-2.5 h-4 w-4 shrink-0 text-gray-400 dark:text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search orgs"
          className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 outline-none dark:text-neutral-200 dark:placeholder:text-neutral-500"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="ml-2 shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Org list */}
      {filtered.length === 0 && q ? (
        <div className="py-8 text-center text-sm text-gray-400 dark:text-neutral-600">
          No matches for &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Add org card */}
          <button
            onClick={onOpenSearch}
            className="flex w-full items-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white/60 px-4 py-3 text-sm font-medium text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-indigo-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
              <IconPlus className="h-4 w-4" />
            </div>
            Add new
          </button>

          {filtered.map((org, i) => (
            <motion.div
              key={org.ein}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => onSelectOrg?.(org.ein)}
              className="group flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <OrgLogo org={org} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-800 dark:text-neutral-200">
                  {org.name}
                </div>
                <div className="truncate text-xs text-gray-400 dark:text-neutral-500">
                  {org.city}
                  {org.city && org.state ? ", " : ""}
                  {org.state}
                </div>
              </div>
              <ScoreCircle score={org.analysisData?.readiness.overall ?? null} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
