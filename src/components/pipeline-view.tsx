"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconTargetArrow,
  IconSearch,
  IconWorldSearch,
  IconPencil,
  IconSend,
  IconPlus,
  IconTrash,
  IconNote,
  IconCheck,
  IconX,
  IconExternalLink,
} from "@tabler/icons-react";
import { cn, fmt$ } from "@/lib/utils";
import {
  addPitchedGrant,
  removePitchedGrant,
  updatePitchedGrantStatus,
  updatePitchedGrantAnswers,
  updatePitchedGrantReviewStatus,
} from "@/lib/portfolio";
import { searchGrants, GRANT_DATABASE } from "@/lib/grant-database";
import type { GrantListing } from "@/lib/grant-database";
import type { PortfolioOrg, PipelineStage, PitchedGrant, GrantMatch, GrantStatus, GrantApplication } from "@/lib/types";
import { PIPELINE_ORG_STAGES, GRANT_STATUS_META } from "@/lib/types";

interface PipelineViewProps {
  pipelineOrgs: PortfolioOrg[];
  activeStage?: PipelineStage | null;
  onSelectOrg: (ein: number) => void;
  onSelectStage?: (stage: PipelineStage | null) => void;
  onRefresh: () => void;
  applications?: GrantApplication[];
}

const STAGE_META: Record<PipelineStage, { icon: typeof IconTargetArrow; color: string }> = {
  prospecting: { icon: IconWorldSearch, color: "text-blue-600 dark:text-blue-400" },
  writing: { icon: IconPencil, color: "text-amber-600 dark:text-amber-400" },
  submitted: { icon: IconSend, color: "text-emerald-600 dark:text-emerald-400" },
};

const STAGE_KEYS: PipelineStage[] = ["prospecting", "writing", "submitted"];

const STATUS_COLORS: Record<GrantStatus, { bg: string; text: string }> = {
  prospect: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  researching: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  writing: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  submitted: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  awarded: { bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-700 dark:text-green-400" },
  declined: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400" },
};

function OrgAvatar({ org }: { org: PortfolioOrg }) {
  const [failed, setFailed] = useState(false);
  const domain = (() => {
    const url = org.analysisData?.websiteUrl || org.analysisData?.siteScan?.url;
    if (!url) return null;
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
  })();

  if (!domain || failed) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
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
      className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-gray-200 dark:bg-neutral-800 dark:ring-neutral-700"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Grant search / add panel ────────────────────────────── */

function GrantSearchModal({
  orgName,
  suggestedMatches,
  alreadyPitched,
  onAddFromMatch,
  onAddFromDb,
  onClose,
}: {
  orgName: string;
  suggestedMatches: GrantMatch[];
  alreadyPitched: Set<string>;
  onAddFromMatch: (g: GrantMatch) => void;
  onAddFromDb: (g: GrantListing) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Federal" | "Foundation" | "Corporate">("All");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const allDb = useMemo(() => GRANT_DATABASE, []);

  // Show all grants when no query, filtered by type; search results when query is typed
  const dbResults = useMemo(() => {
    const base = query.trim() ? searchGrants(query.trim()) : allDb;
    const filtered = typeFilter === "All" ? base : base.filter((g) => g.type === typeFilter);
    return filtered.slice(0, 12);
  }, [query, typeFilter, allDb]);

  const availableSuggested = suggestedMatches.filter((g) => !alreadyPitched.has(g.name));

  // Show suggested matches only when no query and no type filter
  const showSuggested = !query.trim() && typeFilter === "All";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Add Grant</h2>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-neutral-500">for {orgName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Type filter chips + search */}
        <div className="border-b border-gray-100 px-5 py-3 dark:border-neutral-800">
          <div className="mb-2.5 flex items-center gap-1.5">
            {(["All", "Federal", "Foundation", "Corporate"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  typeFilter === t
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                    : "border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus-within:border-indigo-500/50 dark:focus-within:ring-indigo-500/10">
            <IconSearch className="h-4 w-4 shrink-0 text-gray-400 dark:text-neutral-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by funder, program, focus area…"
              className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none dark:text-neutral-200 dark:placeholder:text-neutral-500"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 dark:text-neutral-500">
                <IconX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
          {/* Suggested matches — shown at top when no query and no type filter */}
          {showSuggested && availableSuggested.length > 0 && (
            <>
              <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-600">
                Suggested matches
              </div>
              {availableSuggested.map((g, i) => (
                <ModalGrantCard
                  key={`suggested-${i}`}
                  funderName={g.name}
                  program=""
                  description=""
                  type={g.type as "Federal" | "Foundation" | "Corporate" | "State"}
                  amountMin={g.avg_grant}
                  amountMax={g.avg_grant}
                  deadline={g.deadline}
                  eligibility={[]}
                  focus={[]}
                  funderUrl={null}
                  source=""
                  already={false}
                  onAdd={() => onAddFromMatch(g)}
                />
              ))}
              <div className="px-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-600">
                All grants
              </div>
            </>
          )}

          {/* Grant database results */}
          {dbResults.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-neutral-500">
              {query.trim()
                ? <>No grants found for &ldquo;{query}&rdquo;</>
                : "No grants match this filter."}
            </div>
          ) : (
            dbResults.map((g) => {
              const already = alreadyPitched.has(g.funder);
              return (
                <ModalGrantCard
                  key={g.id}
                  funderName={g.funder}
                  program={g.program}
                  description={g.description}
                  type={g.type}
                  amountMin={g.amount_range[0]}
                  amountMax={g.amount_range[1]}
                  deadline={g.deadline}
                  eligibility={g.eligibility}
                  focus={g.focus}
                  funderUrl={g.url || null}
                  source={g.source}
                  already={already}
                  onAdd={() => onAddFromDb(g)}
                />
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Grant card for search modal ─────────────────────────── */

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Federal: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400" },
  Corporate: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
  Foundation: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-400" },
  State: { bg: "bg-teal-50 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-400" },
};

function ModalGrantCard({
  funderName,
  program,
  description,
  type,
  amountMin,
  amountMax,
  deadline,
  eligibility,
  focus,
  funderUrl,
  source,
  already,
  onAdd,
}: {
  funderName: string;
  program: string;
  description: string;
  type: string;
  amountMin: number;
  amountMax: number;
  deadline: string;
  eligibility: string[];
  focus: string[];
  funderUrl: string | null;
  source: string;
  already: boolean;
  onAdd: () => void;
}) {
  const typeColor = TYPE_COLORS[type] ?? TYPE_COLORS.Foundation;

  return (
    <div className={cn(
      "rounded-xl border border-gray-200 bg-white p-4 transition-colors dark:border-neutral-800 dark:bg-neutral-900",
      already && "opacity-50"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
            {funderName}
          </div>
          {program && (
            <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
              {program}
            </div>
          )}
        </div>
        <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", typeColor.bg, typeColor.text)}>
          {type}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-neutral-400">
          {description}
        </p>
      )}

      {/* Details row */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-y border-gray-100 py-2.5 text-xs dark:border-neutral-800">
        <span className="text-gray-500 dark:text-neutral-500">
          Amount:{" "}
          <span className="text-gray-700 dark:text-neutral-300">
            {amountMin === amountMax ? fmt$(amountMin) : `${fmt$(amountMin)} – ${fmt$(amountMax)}`}
          </span>
        </span>
        <span className="text-gray-500 dark:text-neutral-500">
          Deadline:{" "}
          <span className="text-gray-700 dark:text-neutral-300">{deadline}</span>
        </span>
        {eligibility.length > 0 && (
          <span className="text-gray-500 dark:text-neutral-500">
            Eligibility:{" "}
            <span className="text-gray-700 dark:text-neutral-300">{eligibility.join(", ")}</span>
          </span>
        )}
      </div>

      {/* Focus tags */}
      {focus.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {focus.map((f) => (
            <span key={f} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-400">
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {funderUrl && (
            <a
              href={funderUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {(() => { try { return new URL(funderUrl).hostname; } catch { return funderUrl; } })()}
              <IconExternalLink className="h-3 w-3" />
            </a>
          )}
          {source && (
            <span className="text-[11px] text-gray-400 dark:text-neutral-500">
              via {source}
            </span>
          )}
        </div>
        <button
          onClick={onAdd}
          disabled={already}
          className={cn(
            "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            already
              ? "cursor-default text-green-600 dark:text-green-400"
              : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          )}
        >
          {already ? (
            <><IconCheck className="h-3.5 w-3.5" /> Added</>
          ) : (
            <><IconPlus className="h-3.5 w-3.5" /> Add</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Pitched grant row ───────────────────────────────────── */

/** Next status in the pipeline flow — only for clear, actionable transitions.
 *  The card data (match %, amount, deadline) IS the evaluation —
 *  the consultant reads the signals and decides: write or trash. */
const NEXT_STATUS: Partial<Record<GrantStatus, { next: GrantStatus; label: string }>> = {
  prospect: { next: "writing", label: "→" },
  researching: { next: "writing", label: "→" },
  // writing → submitted: intentionally omitted — the work must be done first
  submitted: { next: "awarded", label: "Mark Awarded" },
};

function PitchedGrantRow({
  grant,
  ein,
  onRefresh,
  applicationQuestions,
  projectTitle,
}: {
  grant: PitchedGrant;
  ein: number;
  onRefresh: () => void;
  applicationQuestions?: string[];
  projectTitle?: string;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const colors = STATUS_COLORS[grant.status];
  const statusMeta = GRANT_STATUS_META.find((s) => s.key === grant.status);

  const handleRemove = () => {
    removePitchedGrant(ein, grant.id);
    onRefresh();
  };

  const isTerminal = grant.status === "awarded" || grant.status === "declined";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header: funder name + status label (hidden when obvious from context) */}
      <div className="flex items-start justify-between gap-1.5">
        <span className="min-w-0 truncate text-xs font-semibold text-gray-800 dark:text-neutral-200">
          {grant.funderName}
        </span>
        {grant.status !== "prospect" && grant.status !== "writing" && (
          <span className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold",
            colors.bg, colors.text
          )}>
            {statusMeta?.label}
          </span>
        )}
      </div>

      {/* Program name */}
      <div className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-neutral-500">
        {grant.grantName}
      </div>

      {/* Evaluation signals + remove */}
      <div className="mt-2 flex items-center gap-2">
        {grant.matchPct > 0 && (
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums",
            grant.matchPct >= 85
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : grant.matchPct >= 70
                ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400"
          )}>
            {grant.matchPct}% fit
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-700 dark:bg-neutral-800 dark:text-neutral-300">
          {fmt$(grant.avgGrant)} grant
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-400">
          Due {grant.deadline}
        </span>
        {!isTerminal && (
          <button
            onClick={handleRemove}
            className="ml-auto rounded-md p-0.5 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:text-neutral-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <IconTrash className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Writing workspace — open Q&A modal */}
      {grant.status === "writing" && applicationQuestions && applicationQuestions.length > 0 && (() => {
        const answeredCount = applicationQuestions.filter((_, i) => (grant.answers?.[i] ?? "").trim().length > 0).length;
        const allAnswered = answeredCount === applicationQuestions.length;
        const rs = grant.reviewStatus;
        const canSendForReview = allAnswered && (!rs || rs === "draft");

        return (
          <>
            <button
              onClick={() => setDraftOpen(true)}
              className={cn(
                "mt-2.5 flex w-full items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                rs === "changes_requested"
                  ? "border-orange-300 bg-orange-50/50 hover:bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/5 dark:hover:bg-orange-500/10"
                  : "border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
              )}
            >
              <IconNote className={cn(
                "h-3.5 w-3.5 shrink-0",
                rs === "changes_requested" ? "text-orange-600 dark:text-orange-400" : "text-amber-600 dark:text-amber-400"
              )} />
              <span className={cn(
                "flex-1 text-left text-[11px] font-medium",
                rs === "changes_requested" ? "text-orange-700 dark:text-orange-400" : "text-amber-700 dark:text-amber-400"
              )}>
                {rs === "changes_requested" ? "Review Changes" : "Draft Answers"}
              </span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                rs === "changes_requested"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
              )}>
                {answeredCount}/{applicationQuestions.length}
              </span>
            </button>

            {/* Review status badges */}
            {rs && rs !== "draft" && (
              <div className="mt-2 flex items-center gap-2">
                {rs === "in_review" && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <IconSend className="h-3 w-3" /> In Review
                  </span>
                )}
                {rs === "changes_requested" && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                    Changes Requested
                  </span>
                )}
                {rs === "approved" && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <IconCheck className="h-3 w-3" /> Approved
                  </span>
                )}
              </div>
            )}

            {/* Send for Review CTA — appears when all answers drafted */}
            {canSendForReview && (
              <button
                onClick={() => {
                  updatePitchedGrantReviewStatus(ein, grant.id, "in_review");
                  onRefresh();
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <IconSend className="h-3 w-3" /> Send for Review
              </button>
            )}

            <AnimatePresence>
              {draftOpen && (
                <DraftAnswersModal
                  grant={grant}
                  ein={ein}
                  questions={applicationQuestions}
                  projectTitle={projectTitle}
                  onClose={() => setDraftOpen(false)}
                  onRefresh={onRefresh}
                />
              )}
            </AnimatePresence>
          </>
        );
      })()}

      {/* Terminal status label */}
      {isTerminal && (
        <div className="mt-2">
          <span className="text-[10px] text-gray-400 dark:text-neutral-500">
            {grant.status === "awarded" ? "✓ Awarded" : "✗ Declined"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Draft Answers modal ───────────────────────────────── */

function DraftAnswersModal({
  grant,
  ein,
  questions,
  projectTitle,
  onClose,
  onRefresh,
}: {
  grant: PitchedGrant;
  ein: number;
  questions: string[];
  projectTitle?: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>(
    () => grant.answers ?? {}
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSave = () => {
    updatePitchedGrantAnswers(ein, grant.id, answers);
    onRefresh();
    onClose();
  };

  const answeredCount = questions.filter((_, i) => (answers[i] ?? "").trim().length > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[5vh] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-neutral-800">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
              {grant.funderName}
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-neutral-500">
              {grant.grantName}
              {projectTitle && <> · Project: {projectTitle}</>}
            </p>
          </div>
          <div className="ml-3 flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              {answeredCount}/{questions.length}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Review status banner */}
        {grant.reviewStatus === "changes_requested" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-500/20 dark:bg-orange-500/5">
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
              The applicant requested changes — see their comments below.
            </span>
          </div>
        )}
        {grant.reviewStatus === "in_review" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-500/20 dark:bg-blue-500/5">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Waiting for applicant review.
            </span>
          </div>
        )}
        {grant.reviewStatus === "approved" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Applicant approved these answers.
            </span>
          </div>
        )}

        {/* Questions */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {questions.map((q, i) => {
            const comment = grant.reviewComments?.[i];
            return (
              <div key={i}>
                <label className="mb-1.5 flex items-start gap-2 text-xs font-medium text-gray-700 dark:text-neutral-300">
                  <span className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                    comment
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  )}>
                    {i + 1}
                  </span>
                  {q}
                </label>
                <textarea
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                  placeholder="Write your answer…"
                  rows={3}
                  className={cn(
                    "w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors dark:bg-neutral-800 dark:text-neutral-300 dark:placeholder-neutral-500",
                    comment
                      ? "border-orange-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-orange-500/30 dark:focus:border-orange-500/50 dark:focus:ring-orange-500/10"
                      : "border-gray-200 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:focus:border-amber-500/50 dark:focus:ring-amber-500/10"
                  )}
                />
                {/* Applicant comment on this answer */}
                {comment && (
                  <div className="mt-1.5 flex items-start gap-2 rounded-md border border-orange-100 bg-orange-50/60 px-3 py-2 dark:border-orange-500/10 dark:bg-orange-500/5">
                    <span className="mt-0.5 text-[10px] font-semibold text-orange-500 dark:text-orange-400">💬</span>
                    <p className="text-xs leading-relaxed text-orange-700 dark:text-orange-400">
                      {comment}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          {grant.reviewStatus === "changes_requested" ? (
            <button
              onClick={() => {
                updatePitchedGrantAnswers(ein, grant.id, answers);
                updatePitchedGrantReviewStatus(ein, grant.id, "in_review");
                onRefresh();
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <IconSend className="h-3 w-3" /> Save & Resubmit
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Save Answers
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main pipeline view ──────────────────────────────────── */

export function PipelineView({
  pipelineOrgs,
  activeStage,
  onSelectOrg,
  onSelectStage,
  onRefresh,
  applications = [],
}: PipelineViewProps) {
  const [searchOpenEin, setSearchOpenEin] = useState<number | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Map EIN → application for project data lookup
  const appByEin = useMemo(() => {
    const map = new Map<number, GrantApplication>();
    for (const a of applications) {
      const ein = parseInt(a.ein.replace(/\D/g, ""), 10);
      if (!isNaN(ein)) map.set(ein, a);
    }
    return map;
  }, [applications]);

  const byStage = useMemo(() => {
    const map = new Map<PipelineStage, PortfolioOrg[]>();
    for (const key of STAGE_KEYS) map.set(key, []);
    for (const org of pipelineOrgs) {
      const bucket = map.get(org.stage as PipelineStage);
      if (bucket) bucket.push(org);
    }
    return map;
  }, [pipelineOrgs]);

  const visibleStages = activeStage ? [activeStage] : STAGE_KEYS;
  const currentStageInfo = activeStage ? PIPELINE_ORG_STAGES.find((s) => s.key === activeStage) : null;

  const handleAddFromMatch = (ein: number, match: GrantMatch) => {
    const pitched: PitchedGrant = {
      id: `pg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      grantName: match.focus,
      funderName: match.name,
      type: match.type,
      matchPct: match.match_pct,
      status: "prospect",
      deadline: match.deadline,
      avgGrant: match.avg_grant,
      grantRange: match.grant_range,
      notes: "",
      addedAt: Date.now(),
      url: match.url,
    };
    addPitchedGrant(ein, pitched);
    onRefresh();
  };

  const handleAddFromDb = (ein: number, listing: GrantListing) => {
    const pitched: PitchedGrant = {
      id: `pg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      grantName: listing.program,
      funderName: listing.funder,
      type: listing.type,
      matchPct: 0,
      status: "prospect",
      deadline: listing.deadline,
      avgGrant: (listing.amount_range[0] + listing.amount_range[1]) / 2,
      grantRange: listing.amount_range,
      notes: "",
      addedAt: Date.now(),
      url: listing.url,
    };
    addPitchedGrant(ein, pitched);
    onRefresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header — stage title on desktop, sub-nav tabs on mobile */}
      <div className="relative mb-3">
        {/* Desktop: just the stage label (sidebar handles navigation) */}
        <h2 className="hidden text-sm font-semibold text-gray-900 dark:text-white md:block">
          {currentStageInfo?.label ?? "Pipeline"}
        </h2>
        {/* Mobile: pill sub-nav for stage switching */}
        {onSelectStage && (
          <div className="flex items-center gap-1 md:hidden">
            {STAGE_KEYS.map((stage) => {
              const meta = STAGE_META[stage];
              const Icon = meta.icon;
              const label = PIPELINE_ORG_STAGES.find((s) => s.key === stage)?.label ?? stage;
              const count = (byStage.get(stage) ?? []).length;
              const isActive = activeStage === stage;
              return (
                <button
                  key={stage}
                  onClick={() => onSelectStage(isActive ? null : stage)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      "min-w-[14px] rounded-full px-1 text-center text-[9px] font-bold leading-relaxed",
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-gray-200 text-gray-500 dark:bg-neutral-700 dark:text-neutral-500"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pipelineOrgs.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-neutral-800">
            <IconTargetArrow className="h-6 w-6 text-gray-400 dark:text-neutral-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No organizations in the pipeline
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            When an organization reaches Grant-Ready, click &ldquo;Start Prospecting&rdquo; to move them here.
          </p>
        </div>
      )}

      {visibleStages.map((stage) => {
        const items = byStage.get(stage) ?? [];
        if (items.length === 0 && activeStage) {
          return (
            <div key={stage} className="py-12 text-center text-sm text-gray-400 dark:text-neutral-500">
              No organizations in this stage.
            </div>
          );
        }
        if (items.length === 0) return null;

        const meta = STAGE_META[stage];
        const Icon = meta.icon;
        const label = PIPELINE_ORG_STAGES.find((s) => s.key === stage)?.label ?? stage;

        return (
          <div key={stage} className="mb-6">
            {!activeStage && (
              <div className="mb-3 hidden items-center gap-2 md:flex">
                <Icon className={cn("h-4 w-4", meta.color)} />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">{label}</h2>
              </div>
            )}

            <div className="space-y-3">
              {items.map((org) => {
                const pitched = org.pitchedGrants ?? [];
                const matches = org.analysisData?.grantMatches ?? [];
                const pitchedNames = new Set(pitched.map((p) => p.funderName));
                const isSearchOpen = searchOpenEin === org.ein;
                // Top eligible matches not yet pitched or dismissed — shown as quick-add suggestions
                const suggestions = matches
                  .filter((m) => m.eligible && !pitchedNames.has(m.name) && !dismissedSuggestions.has(`${org.ein}:${m.name}`))
                  .slice(0, 3);

                const app = appByEin.get(org.ein);

                // Derive org-level next-step CTA from the most advanced grant
                const STATUS_RANK: Record<GrantStatus, number> = {
                  prospect: 0, researching: 1, writing: 2, submitted: 3, awarded: 4, declined: 4,
                };
                const advancedGrant = pitched.length > 0
                  ? pitched.reduce((best, g) => STATUS_RANK[g.status] > STATUS_RANK[best.status] ? g : best, pitched[0])
                  : null;
                // Show "Mark Submitted" when writing grant is approved by applicant
                const approvedWritingGrant = advancedGrant?.status === "writing" && advancedGrant.reviewStatus === "approved"
                  ? advancedGrant : null;
                const orgNextAction = approvedWritingGrant
                  ? { next: "submitted" as GrantStatus, label: "Mark Submitted" }
                  : (advancedGrant ? NEXT_STATUS[advancedGrant.status] : null);

                const handleOrgAdvance = () => {
                  if (!advancedGrant || !orgNextAction) return;
                  if (approvedWritingGrant) {
                    // Also set review status to submitted
                    updatePitchedGrantReviewStatus(org.ein, advancedGrant.id, "submitted");
                  }
                  updatePitchedGrantStatus(org.ein, advancedGrant.id, orgNextAction.next);
                  onRefresh();
                };

                return (
                  <div
                    key={org.ein}
                    className="rounded-xl border border-gray-200 bg-white transition-colors dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    {/* Org header */}
                    <div className="flex w-full items-center gap-3 p-4">
                      <OrgAvatar org={org} />
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => onSelectOrg(org.ein)}
                          className="truncate text-sm font-semibold text-gray-800 hover:text-indigo-600 dark:text-neutral-200 dark:hover:text-indigo-400"
                        >
                          {org.name}
                        </button>
                        {app?.projectTitle && (
                          <div className="truncate text-[11px] text-gray-500 dark:text-neutral-500">
                            {app.projectTitle}
                          </div>
                        )}
                      </div>
                      {orgNextAction && (
                        <button
                          onClick={handleOrgAdvance}
                          className={cn(
                            "flex shrink-0 items-center justify-center rounded-md font-medium text-white shadow-sm transition-colors",
                            orgNextAction.label === "→"
                              ? "h-8 w-8 bg-indigo-600 text-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                              : "gap-1 bg-indigo-600 px-3 py-1.5 text-[11px] hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                          )}
                        >
                          {orgNextAction.label}
                        </button>
                      )}
                    </div>

                    {/* Pitched grants + ghost suggestions */}
                    {(pitched.length > 0 || (stage === "prospecting" && suggestions.length > 0)) ? (
                      <div className="space-y-2 px-4 pb-4">
                        {pitched.map((g) => (
                          <PitchedGrantRow
                            key={g.id}
                            grant={g}
                            ein={org.ein}
                            onRefresh={onRefresh}
                            applicationQuestions={GRANT_DATABASE.find((db) => db.funder === g.funderName)?.applicationQuestions}
                            projectTitle={app?.projectTitle}
                          />
                        ))}
                        {/* Ghost cards — suggested matches as faded previews */}
                        {stage === "prospecting" && !isSearchOpen && suggestions.map((m) => (
                          <div
                            key={`ghost-${m.name}`}
                            className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 opacity-60 transition-opacity hover:opacity-90 dark:border-neutral-700 dark:bg-neutral-800/30"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="min-w-0 truncate text-xs font-semibold text-gray-500 dark:text-neutral-400">
                                {m.name}
                              </span>
                              <button
                                onClick={() => handleAddFromMatch(org.ein, m)}
                                className="flex shrink-0 items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-medium text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                              >
                                <IconPlus className="h-2.5 w-2.5" />
                                Add
                              </button>
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-neutral-500">
                              {m.focus}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              {m.match_pct > 0 && (
                                <span className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums",
                                  m.match_pct >= 85
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    : m.match_pct >= 70
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                      : "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-500"
                                )}>
                                  {m.match_pct}% fit
                                </span>
                              )}
                              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                                {fmt$(m.avg_grant)} grant
                              </span>
                              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-400 dark:bg-neutral-800 dark:text-neutral-500">
                                Due {m.deadline}
                              </span>
                              <button
                                onClick={() => setDismissedSuggestions((prev) => new Set(prev).add(`${org.ein}:${m.name}`))}
                                className="ml-auto rounded-md p-0.5 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:text-neutral-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              >
                                <IconTrash className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Add grant button — prospecting only */}
                    {stage === "prospecting" && !isSearchOpen && (
                      <div className="px-4 pb-3">
                        <button
                          onClick={() => setSearchOpenEin(org.ein)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-2 text-[11px] font-medium text-gray-400 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5 dark:hover:text-indigo-400"
                        >
                          <IconPlus className="h-3 w-3" />
                          Add grant
                        </button>
                      </div>
                    )}

                    {/* Search modal */}
                    <AnimatePresence>
                      {isSearchOpen && (
                        <GrantSearchModal
                          orgName={org.name}
                          suggestedMatches={matches}
                          alreadyPitched={pitchedNames}
                          onAddFromMatch={(g) => handleAddFromMatch(org.ein, g)}
                          onAddFromDb={(g) => handleAddFromDb(org.ein, g)}
                          onClose={() => setSearchOpenEin(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
