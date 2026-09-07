"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconPlus, IconSearch, IconX, IconAdjustmentsHorizontal, IconSortAscending, IconSortDescending, IconCheck } from "@tabler/icons-react";
import type { PortfolioOrg, GrantApplication } from "@/lib/types";

type InboxFilter = "all" | "needs_work" | "ready";
type SortOption = "newest" | "oldest" | "score_desc" | "score_asc" | "name_az";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "score_desc", label: "Score: high to low" },
  { key: "score_asc", label: "Score: low to high" },
  { key: "name_az", label: "Name A–Z" },
];

interface WelcomeViewProps {
  hasOrgs: boolean;
  onOpenSearch: () => void;
  portfolio?: PortfolioOrg[];
  onSelectOrg?: (ein: number) => void;
  /** EINs currently being auto-assessed */
  assessingEins?: Set<number>;
  /** All applications, for pulling submission detail into inbox rows */
  applications?: GrantApplication[];
  /** Active filter from sidebar nav */
  filter?: InboxFilter;
  /** EINs the user has already opened */
  viewedEins?: Set<number>;
  /** Move a grant-ready org into the prospecting pipeline */
  onStartProspecting?: (ein: number) => void;
  /** Decline / remove an org from the inbox */
  onDeclineOrg?: (ein: number) => void;
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

/** Ring color based on readiness score */
function ringColor(score: number | null, assessing: boolean) {
  if (assessing) return "ring-indigo-400 dark:ring-indigo-500";
  if (score == null) return "ring-gray-200 dark:ring-neutral-700";
  if (score >= 80) return "ring-emerald-400 dark:ring-emerald-500";
  if (score >= 65) return "ring-amber-400 dark:ring-amber-500";
  return "ring-gray-400 dark:ring-neutral-500";
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500 text-white";
  if (score >= 65) return "bg-amber-500 text-white";
  return "bg-gray-500 text-white dark:bg-neutral-400";
}

function OrgAvatar({ org, score, assessing }: { org: PortfolioOrg; score: number | null; assessing: boolean }) {
  const [failed, setFailed] = useState(false);
  const domain = getOrgDomain(org);

  const ring = ringColor(score, assessing);

  return (
    <div className="relative shrink-0">
      {assessing ? (
        <div className={`rounded-full ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900 ${ring} animate-pulse`}>
          {renderInner()}
        </div>
      ) : (
        <div className={`rounded-full ring-2 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900 ${ring}`}>
          {renderInner()}
        </div>
      )}
      {/* Score badge overlay */}
      {score != null && !assessing && (
        <span
          className={`absolute -bottom-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none ${scoreColor(score)}`}
        >
          {score}
        </span>
      )}
      {assessing && (
        <span className="absolute -bottom-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500">
          <div className="h-2 w-2 animate-spin rounded-full border border-white/40 border-t-white" />
        </span>
      )}
    </div>
  );

  function renderInner() {
    if (!domain || failed) {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
          {org.name.charAt(0)}
        </div>
      );
    }
    return (
      <img
        src={`/api/logo?domain=${domain}`}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-full bg-white object-contain p-0.5 dark:bg-neutral-800"
        onError={() => setFailed(true)}
      />
    );
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SortDropdown({ sortBy, onSortChange }: { sortBy: SortOption; onSortChange: (s: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  // Compute fixed position from button rect
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        title="Sort"
      >
        <IconAdjustmentsHorizontal className="h-4 w-4" />
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          className="fixed z-[9999] min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          style={{ top: pos.top, right: pos.right }}
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onSortChange(opt.key); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-gray-700 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <IconCheck className={`h-3 w-3 shrink-0 ${sortBy === opt.key ? "text-indigo-500" : "text-transparent"}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function WelcomeView({
  hasOrgs,
  onOpenSearch,
  portfolio = [],
  onSelectOrg,
  assessingEins = new Set(),
  applications = [],
  filter: externalFilter = "all",
  viewedEins = new Set<number>(),
  onStartProspecting,
  onDeclineOrg,
}: WelcomeViewProps) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const q = query.toLowerCase().trim();

  // Build EIN → application lookup
  const appByEin = useMemo(() => {
    const map = new Map<number, GrantApplication>();
    for (const app of applications) {
      const ein = parseInt(app.ein.replace(/\D/g, ""), 10);
      if (!isNaN(ein)) map.set(ein, app);
    }
    return map;
  }, [applications]);

  // Sort by selected option, then filter by search
  const sorted = useMemo(() => {
    const list = [...portfolio].sort((a, b) => {
      switch (sortBy) {
        case "oldest": {
          const aTime = appByEin.get(a.ein)?.submittedAt ?? a.addedAt;
          const bTime = appByEin.get(b.ein)?.submittedAt ?? b.addedAt;
          return aTime - bTime;
        }
        case "score_desc": {
          const aScore = a.analysisData?.readiness.overall ?? -1;
          const bScore = b.analysisData?.readiness.overall ?? -1;
          return bScore - aScore;
        }
        case "score_asc": {
          const aScore = a.analysisData?.readiness.overall ?? -1;
          const bScore = b.analysisData?.readiness.overall ?? -1;
          return aScore - bScore;
        }
        case "name_az":
          return a.name.localeCompare(b.name);
        default: { // newest
          const aTime = appByEin.get(a.ein)?.submittedAt ?? a.addedAt;
          const bTime = appByEin.get(b.ein)?.submittedAt ?? b.addedAt;
          return bTime - aTime;
        }
      }
    });
    if (!q) return list;
    return list.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.city && o.city.toLowerCase().includes(q)) ||
        (o.state && o.state.toLowerCase().includes(q))
    );
  }, [portfolio, q, appByEin, sortBy]);

  // Filter by sidebar selection: binary — grant-ready (≥65) or needs work (<65 / unassessed)
  const filtered = useMemo(() => {
    if (externalFilter === "all") return sorted;
    return sorted.filter((org) => {
      const score = org.analysisData?.readiness.overall ?? null;
      if (externalFilter === "ready") return score != null && score >= 65;
      if (externalFilter === "needs_work") return score == null || score < 65;
      return true;
    });
  }, [sorted, externalFilter]);

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
      {/* Toolbar: search + add */}
      <div className="relative mb-2 flex h-9 items-center gap-1.5">
        <AnimatePresence mode="wait">
          {searchOpen ? (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <IconSearch className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-neutral-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search organizations…"
                autoFocus
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none dark:text-neutral-200 dark:placeholder:text-neutral-500"
              />
              <button
                onClick={() => { setQuery(""); setSearchOpen(false); }}
                className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="toolbar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-1 items-center gap-1.5"
            >
              <h2 className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">
                {externalFilter === "ready"
                  ? "Grant-Ready"
                  : externalFilter === "needs_work"
                    ? "Needs Work"
                    : "Inbox"}
                {(() => {
                  const newCount = filtered.filter((o) => !viewedEins.has(o.ein)).length;
                  return newCount > 0 ? (
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-neutral-500">
                      {newCount} new
                    </span>
                  ) : null;
                })()}
              </h2>
              {/* Sort dropdown */}
              <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                title="Search"
              >
                <IconSearch className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onOpenSearch}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          title="Add organization"
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      {/* Inbox list */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400 dark:text-neutral-600">
          {q
            ? <>No matches for &ldquo;{query}&rdquo;</>
            : "No organizations in this category"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {filtered.map((org, i) => {
            const isAssessing = assessingEins.has(org.ein);
            const app = appByEin.get(org.ein);
            const score = org.analysisData?.readiness.overall ?? null;
            const submittedAt = app?.submittedAt ?? org.addedAt;
            const isUnread = score == null; // pending / unassessed = "unread"

            const location = [org.city, org.state].filter(Boolean).join(", ");

            return (
              <div
                key={org.ein}
                onClick={() => onSelectOrg?.(org.ein)}
                className={`
                  flex cursor-pointer items-center gap-2.5 px-3 py-2.5
                  transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/60
                  ${i > 0 ? "border-t border-gray-100 dark:border-neutral-800/60" : ""}
                  ${isUnread ? "bg-white dark:bg-neutral-900" : "bg-gray-50/40 dark:bg-neutral-900/60"}
                `}
              >
                {/* Avatar with score ring + badge */}
                <OrgAvatar org={org} score={score} assessing={isAssessing} />

                {/* Org name + location chip on line 1, project on line 2 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-[13px] ${
                        isUnread
                          ? "font-semibold text-gray-900 dark:text-white"
                          : "font-medium text-gray-600 dark:text-neutral-400"
                      }`}
                    >
                      {org.name}
                    </span>
                    {location && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {location}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-gray-400 dark:text-neutral-500">
                    {app?.projectTitle
                      ? `${app.projectTitle}${app.amountRequested ? ` · ${app.amountRequested}` : ""}`
                      : "No project added"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-300 dark:text-neutral-600">
                    Submitted {new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>

                {/* Accept / Decline (grant-ready orgs only) */}
                {score != null && score >= 65 && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {onDeclineOrg && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeclineOrg(org.ein); }}
                        className="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="Decline"
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    )}
                    {onStartProspecting && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStartProspecting(org.ein); }}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
