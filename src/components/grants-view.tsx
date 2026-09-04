"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconSearch,
  IconExternalLink,
  IconDatabaseSearch,
  IconBookmark,
  IconBookmarkFilled,
  IconFilter,
  IconChevronDown,
  IconPlus,
  IconCheck,
  IconTargetArrow,
} from "@tabler/icons-react";
import { cn, fmt$ } from "@/lib/utils";
import type { DbOpportunityWithFunder, DbOrganization } from "@/lib/db/types";
import { listOpportunities } from "@/lib/db/opportunities";
import { createEngagement, engagementExists } from "@/lib/db/engagements";

interface GrantsViewProps {
  organizations: DbOrganization[];
  onSelectOrg: (orgId: string) => void;
  onRefresh: () => void;
  /** Callback when a grant is tracked as a pipeline engagement */
  onEngagementCreated?: () => void;
}

type Tab = "find" | "tracked";
type GrantType = "All" | "Federal" | "Foundation" | "Corporate" | "State";

export function GrantsView({
  organizations,
  onSelectOrg,
  onRefresh,
  onEngagementCreated,
}: GrantsViewProps) {
  const [tab, setTab] = useState<Tab>("find");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<GrantType>("All");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [dbResults, setDbResults] = useState<DbOpportunityWithFunder[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which grants were just added: key = `${opportunityId}-${orgId}`
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  // Which grant is showing the org-picker
  const [assigningGrant, setAssigningGrant] = useState<string | null>(null);

  const analyzedOrgs = useMemo(
    () => organizations.filter((o) => o.analysis_data),
    [organizations]
  );

  // Fetch opportunities from Supabase
  useEffect(() => {
    let cancelled = false;
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        const data = await listOpportunities({
          type: typeFilter !== "All" ? typeFilter : undefined,
          query: query || undefined,
        });
        if (!cancelled) {
          setDbResults(data);
        }
      } catch {
        // Silently handle — the UI shows empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOpportunities();
    return () => { cancelled = true; };
  }, [query, typeFilter]);

  const handleTrackGrant = useCallback(
    async (listing: DbOpportunityWithFunder, org: DbOrganization) => {
      const funderName = listing.funder?.name ?? "Unknown Funder";
      try {
        // Check if already exists
        const exists = await engagementExists(org.id, listing.id);
        if (exists) {
          const key = `${listing.id}-${org.id}`;
          setJustAdded((prev) => new Set(prev).add(key));
          setAssigningGrant(null);
          return;
        }

        // Try to find match quality data from org's analysis
        let matchPct = 0;
        let fits: string[] = [];
        let blockers: string[] = [];
        const analysis = org.analysis_data;
        if (analysis?.grantMatches) {
          // Match on funder name + program name
          const match = analysis.grantMatches.find(
            (gm) =>
              gm.name.toLowerCase() === funderName.toLowerCase() ||
              gm.focus.toLowerCase() === listing.program.toLowerCase()
          );
          if (match) {
            matchPct = match.match_pct ?? 0;
            fits = match.fits ?? [];
            blockers = match.blockers ?? [];
          }
        }

        await createEngagement({
          org_id: org.id,
          opportunity_id: listing.id,
          funder_name: funderName,
          opportunity_name: `${funderName} — ${listing.program}`,
          stage: "prospect",
          deadline: listing.deadline,
          amount_requested: listing.amount_max > 0 ? listing.amount_max : undefined,
          match_pct: matchPct,
          fits,
          blockers,
        });

        const key = `${listing.id}-${org.id}`;
        setJustAdded((prev) => new Set(prev).add(key));
        setAssigningGrant(null);
        onRefresh();
        onEngagementCreated?.();
      } catch {
        // Handle error silently for now
      }
    },
    [onRefresh, onEngagementCreated]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Grants
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
          Search grant databases and track opportunities for your organizations.
        </p>
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by funder, focus area, keyword…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
          />
        </div>

        {/* Type filter */}
        <div className="relative">
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <IconFilter className="h-3.5 w-3.5" />
            {typeFilter}
            <IconChevronDown className="h-3.5 w-3.5" />
          </button>
          {showTypeDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowTypeDropdown(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                {(
                  ["All", "Federal", "Foundation", "Corporate"] as const
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTypeFilter(t);
                      setShowTypeDropdown(false);
                    }}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-sm transition-colors",
                      typeFilter === t
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-xs text-gray-400 dark:text-neutral-600">
          {loading ? "Loading…" : `${dbResults.length} result${dbResults.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Source attribution */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400 dark:text-neutral-600">
        <span>Sources:</span>
        {["Grants.gov", "Foundation Directory Online", "Corporate Giving Database"].map(
          (s) => (
            <span
              key={s}
              className="text-gray-500 dark:text-neutral-500"
            >
              {s}
            </span>
          )
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {dbResults.map((listing, i) => (
          <GrantDatabaseCard
            key={listing.id}
            listing={listing}
            index={i}
            analyzedOrgs={analyzedOrgs}
            allOrgs={organizations}
            assigningGrant={assigningGrant}
            justAdded={justAdded}
            onAssign={setAssigningGrant}
            onTrack={handleTrackGrant}
          />
        ))}
        {!loading && dbResults.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-neutral-500">
            No grants match your search. Try broadening your keywords.
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────── */
/* Grant database card                                     */
/* ────────────────────────────────────────────────────── */

function GrantDatabaseCard({
  listing,
  index,
  analyzedOrgs,
  allOrgs,
  assigningGrant,
  justAdded,
  onAssign,
  onTrack,
}: {
  listing: DbOpportunityWithFunder;
  index: number;
  analyzedOrgs: DbOrganization[];
  allOrgs: DbOrganization[];
  assigningGrant: string | null;
  justAdded: Set<string>;
  onAssign: (id: string | null) => void;
  onTrack: (listing: DbOpportunityWithFunder, org: DbOrganization) => void;
}) {
  const isAssigning = assigningGrant === listing.id;
  const funderName = listing.funder?.name ?? "Unknown Funder";
  const funderUrl = listing.funder?.url ?? listing.url ?? "";
  const orgsToShow = allOrgs.length > 0 ? allOrgs : analyzedOrgs;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {/* Track button */}
          <div className="relative shrink-0 pt-0.5">
            {orgsToShow.length > 0 ? (
              <button
                onClick={() => onAssign(isAssigning ? null : listing.id)}
                className="rounded-md p-1 text-gray-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-neutral-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                title="Track for organization"
              >
                <IconTargetArrow className="h-4 w-4" />
              </button>
            ) : (
              <div className="p-1 text-gray-200 dark:text-neutral-700">
                <IconTargetArrow className="h-4 w-4" />
              </div>
            )}

            {/* Org picker dropdown */}
            <AnimatePresence>
              {isAssigning && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => onAssign(null)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                      Track for organization
                    </div>
                    {orgsToShow.map((org) => {
                      const key = `${listing.id}-${org.id}`;
                      const added = justAdded.has(key);
                      return (
                        <button
                          key={org.id}
                          onClick={() => !added && onTrack(listing, org)}
                          disabled={added}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                            added
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          )}
                        >
                          {added ? (
                            <IconCheck className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <IconPlus className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-neutral-500" />
                          )}
                          <span className="truncate">{org.name}</span>
                          {added && (
                            <span className="ml-auto text-[10px]">Tracked</span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
              {funderName}
            </div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
              {listing.program}
            </div>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            listing.type === "Federal"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
              : listing.type === "Corporate"
                ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                : "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
          )}
        >
          {listing.type}
        </span>
      </div>

      {/* Description */}
      <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-neutral-400">
        {listing.description}
      </p>

      {/* Details row */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-y border-gray-100 py-2.5 text-xs dark:border-neutral-800">
        <span className="text-gray-500 dark:text-neutral-500">
          Amount:{" "}
          <span className="text-gray-700 dark:text-neutral-300">
            {listing.amount_min === listing.amount_max
              ? fmt$(listing.amount_min)
              : `${fmt$(listing.amount_min)} – ${fmt$(listing.amount_max)}`}
          </span>
        </span>
        <span className="text-gray-500 dark:text-neutral-500">
          Deadline:{" "}
          <span className="text-gray-700 dark:text-neutral-300">
            {listing.deadline}
          </span>
        </span>
        <span className="text-gray-500 dark:text-neutral-500">
          Eligibility:{" "}
          <span className="text-gray-700 dark:text-neutral-300">
            {listing.eligibility.join(", ")}
          </span>
        </span>
      </div>

      {/* Focus tags */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {listing.focus.map((f) => (
          <span
            key={f}
            className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-400"
          >
            {f}
          </span>
        ))}
      </div>

      {/* Footer: source */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        {funderUrl && (
          <a
            href={funderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {new URL(funderUrl).hostname}
            <IconExternalLink className="h-3 w-3" />
          </a>
        )}
        <span className="text-[11px] text-gray-400 dark:text-neutral-500">
          via {listing.source}
        </span>
      </div>
    </motion.div>
  );
}
