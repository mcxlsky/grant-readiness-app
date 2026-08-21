"use client";

import { useState, useMemo, useCallback } from "react";
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
} from "@tabler/icons-react";
import { cn, fmt$ } from "@/lib/utils";
import { searchGrants, type GrantListing } from "@/lib/grant-database";
import { addGrantToOrg } from "@/lib/portfolio";
import type { GrantMatch, PortfolioOrg } from "@/lib/types";

interface GrantWithOrg extends GrantMatch {
  orgName: string;
  orgEin: number;
}

interface GrantsViewProps {
  grants: GrantWithOrg[];
  portfolio: PortfolioOrg[];
  onSelectOrg: (ein: number) => void;
  onRefresh: () => void;
}

type Tab = "find" | "tracked";
type GrantType = "All" | "Federal" | "Foundation" | "Corporate" | "State";


export function GrantsView({
  grants,
  portfolio,
  onSelectOrg,
  onRefresh,
}: GrantsViewProps) {
  const [tab, setTab] = useState<Tab>("find");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<GrantType>("All");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  // Track which grants were just added: key = `${grantId}-${orgEin}`
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  // Which grant is showing the org-picker
  const [assigningGrant, setAssigningGrant] = useState<string | null>(null);

  const analyzedOrgs = useMemo(
    () => portfolio.filter((o) => o.analysisData),
    [portfolio]
  );

  // ── Find Grants tab ────────────────────────────────
  const dbResults = useMemo(() => {
    let results = searchGrants(query);
    if (typeFilter !== "All") {
      results = results.filter((g) => g.type === typeFilter);
    }
    return results;
  }, [query, typeFilter]);

  // ── Tracked tab — same as the old grants view ──────
  const trackedSorted = useMemo(() => {
    return [...grants].sort((a, b) => b.avg_grant - a.avg_grant);
  }, [grants]);

  const handleAddGrant = useCallback(
    (listing: GrantListing, org: PortfolioOrg) => {
      const match: GrantMatch = {
        name: `${listing.funder} — ${listing.program}`,
        focus: listing.focus.join(", "),
        url: listing.url,
        type: listing.type,
        avg_grant: Math.round(
          (listing.amount_range[0] + listing.amount_range[1]) / 2
        ),
        grant_range: listing.amount_range,
        deadline: listing.deadline,
        match_pct: 0,
        fits: [],
        blockers: [],
        eligible: true,
        requires: listing.eligibility,
      };
      addGrantToOrg(org.ein, match);
      const key = `${listing.id}-${org.ein}`;
      setJustAdded((prev) => new Set(prev).add(key));
      setAssigningGrant(null);
      onRefresh();
    },
    [onRefresh]
  );

  const uniqueFunders = new Set(grants.map((g) => g.name));

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

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 border-b border-gray-200 dark:border-neutral-800">
        {(
          [
            ["find", "Find Grants", IconDatabaseSearch],
            ["tracked", "Tracked", IconBookmark],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors",
              tab === key
                ? "border-indigo-500 text-gray-900 dark:text-white"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === "tracked" && grants.length > 0 && (
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-400">
                {grants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Find Grants ──────────────────────────── */}
      {tab === "find" && (
        <motion.div
          key="find"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
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
              {dbResults.length} result{dbResults.length !== 1 ? "s" : ""}
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
                assigningGrant={assigningGrant}
                justAdded={justAdded}
                onAssign={setAssigningGrant}
                onAdd={handleAddGrant}
              />
            ))}
            {dbResults.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-neutral-500">
                No grants match your search. Try broadening your keywords.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Tracked Grants ───────────────────────── */}
      {tab === "tracked" && (
        <motion.div
          key="tracked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {grants.length === 0 ? (
            <div className="pt-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-neutral-800">
                <IconBookmark className="h-6 w-6 text-gray-400 dark:text-neutral-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                No tracked grants yet
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
                Use the Find Grants tab to search and add grants to your
                organizations.
              </p>
              <button
                onClick={() => setTab("find")}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Find Grants
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-xs text-gray-400 dark:text-neutral-600">
                {uniqueFunders.size} funders across{" "}
                {new Set(grants.map((g) => g.orgName)).size} organizations ·{" "}
                {grants.length} total
              </p>
              <div className="space-y-3">
                {trackedSorted.map((g, i) => (
                  <motion.div
                    key={`${g.orgEin}-${g.name}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className={cn(
                      "rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700",
                      !g.eligible && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
                          {g.name}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">
                          {g.type} · {g.focus}
                        </div>
                      </div>
                      <IconBookmarkFilled className="h-4 w-4 shrink-0 text-indigo-500" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-y border-gray-100 py-2.5 text-xs dark:border-neutral-800">
                      <span className="text-gray-500 dark:text-neutral-500">
                        Range:{" "}
                        <span className="text-gray-700 dark:text-neutral-300">
                          {fmt$(g.grant_range[0])} – {fmt$(g.grant_range[1])}
                        </span>
                      </span>
                      <span className="text-gray-500 dark:text-neutral-500">
                        Avg:{" "}
                        <span className="text-gray-700 dark:text-neutral-300">
                          {fmt$(g.avg_grant)}
                        </span>
                      </span>
                      <span className="text-gray-500 dark:text-neutral-500">
                        Deadline:{" "}
                        <span className="text-gray-700 dark:text-neutral-300">
                          {g.deadline}
                        </span>
                      </span>
                      {g.match_pct > 0 && (
                        <span className="text-gray-500 dark:text-neutral-500">
                          Match:{" "}
                          <span className="text-gray-700 dark:text-neutral-300">
                            {g.match_pct}%
                          </span>
                        </span>
                      )}
                      {g.match_pct === 0 && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                          Manual
                        </span>
                      )}
                    </div>

                    {/* Fits & blockers */}
                    {(g.fits.length > 0 || g.blockers.length > 0) && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {g.fits.map((f, j) => (
                          <span
                            key={`f-${j}`}
                            className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          >
                            {f}
                          </span>
                        ))}
                        {g.blockers.map((b, j) => (
                          <span
                            key={`b-${j}`}
                            className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 dark:bg-red-500/10 dark:text-red-400"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <a
                        href={g.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {new URL(g.url).hostname}
                        <IconExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => onSelectOrg(g.orgEin)}
                        className="text-gray-400 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                      >
                        {g.orgName}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────── */
/* Grant database card (Find Grants tab)                  */
/* ────────────────────────────────────────────────────── */

function GrantDatabaseCard({
  listing,
  index,
  analyzedOrgs,
  assigningGrant,
  justAdded,
  onAssign,
  onAdd,
}: {
  listing: GrantListing;
  index: number;
  analyzedOrgs: PortfolioOrg[];
  assigningGrant: string | null;
  justAdded: Set<string>;
  onAssign: (id: string | null) => void;
  onAdd: (listing: GrantListing, org: PortfolioOrg) => void;
}) {
  const isAssigning = assigningGrant === listing.id;

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
          {/* Bookmark button */}
          <div className="relative shrink-0 pt-0.5">
            {analyzedOrgs.length > 0 ? (
              <button
                onClick={() => onAssign(isAssigning ? null : listing.id)}
                className="rounded-md p-1 text-gray-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-neutral-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                title="Track for organization"
              >
                <IconBookmark className="h-4 w-4" />
              </button>
            ) : (
              <div className="p-1 text-gray-200 dark:text-neutral-700">
                <IconBookmark className="h-4 w-4" />
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
                      Add to organization
                    </div>
                    {analyzedOrgs.map((org) => {
                      const key = `${listing.id}-${org.ein}`;
                      const added = justAdded.has(key);
                      return (
                        <button
                          key={org.ein}
                          onClick={() => !added && onAdd(listing, org)}
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
                            <span className="ml-auto text-[10px]">Added</span>
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
              {listing.funder}
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
            {listing.amount_range[0] === listing.amount_range[1]
              ? fmt$(listing.amount_range[0])
              : `${fmt$(listing.amount_range[0])} – ${fmt$(listing.amount_range[1])}`}
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
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {new URL(listing.url).hostname}
          <IconExternalLink className="h-3 w-3" />
        </a>
        <span className="text-[11px] text-gray-400 dark:text-neutral-500">
          via {listing.source}
        </span>
      </div>
    </motion.div>
  );
}
