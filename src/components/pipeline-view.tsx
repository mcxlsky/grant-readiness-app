"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconArrowRight,
  IconArrowLeft,
  IconTrash,
  IconChevronRight,
  IconNote,
  IconCalendar,
  IconExternalLink,
  IconTargetArrow,
  IconEye,
  IconSearch,
  IconClipboardCheck,
  IconSend,
  IconCurrencyDollar,
  IconPercentage,
  IconClock,
  IconCheck,
  IconX,
  IconFilter,
  IconSortDescending,
} from "@tabler/icons-react";
import { cn, fmt$ } from "@/lib/utils";
import type {
  DbEngagementWithOrg,
  EngagementStage,
} from "@/lib/db/types";
import { PIPELINE_STAGES, ENGAGEMENT_STAGES } from "@/lib/db/types";

interface PipelineViewProps {
  engagements: DbEngagementWithOrg[];
  loading: boolean;
  activeStage?: EngagementStage | null;
  onMoveStage: (id: string, stage: EngagementStage) => void;
  onDelete: (id: string) => void;
  onSelectOrg: (orgId: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
}

const STAGE_META: Record<
  EngagementStage,
  { icon: typeof IconTargetArrow; color: string; bgColor: string; borderColor: string }
> = {
  prospect: {
    icon: IconTargetArrow,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  researching: {
    icon: IconSearch,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
    borderColor: "border-violet-200 dark:border-violet-800",
  },
  writing: {
    icon: IconNote,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  submitted: {
    icon: IconSend,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  awarded: {
    icon: IconClipboardCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-500/10",
    borderColor: "border-green-200 dark:border-green-800",
  },
  reporting: {
    icon: IconCalendar,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-500/10",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  closed: {
    icon: IconEye,
    color: "text-gray-500 dark:text-neutral-500",
    bgColor: "bg-gray-50 dark:bg-neutral-800",
    borderColor: "border-gray-300 dark:border-neutral-700",
  },
};

type SortKey = "updated" | "deadline" | "amount" | "match";

export function PipelineView({
  engagements,
  loading,
  activeStage,
  onMoveStage,
  onDelete,
  onSelectOrg,
  onUpdateNotes,
}: PipelineViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("updated");
  const [showControls, setShowControls] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when editing
  useEffect(() => {
    if (editingNotesId && notesRef.current) {
      notesRef.current.focus();
      notesRef.current.setSelectionRange(
        notesRef.current.value.length,
        notesRef.current.value.length
      );
    }
  }, [editingNotesId]);

  // Get unique orgs for filter
  const orgOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const eng of engagements) {
      if (eng.organization) {
        seen.set(eng.org_id, eng.organization.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [engagements]);

  // Filter & sort
  const filteredEngagements = useMemo(() => {
    let result = engagements;

    // Filter by stage (from sidebar)
    if (activeStage) {
      result = result.filter((e) => e.stage === activeStage);
    }

    // Filter by org
    if (filterOrg !== "all") {
      result = result.filter((e) => e.org_id === filterOrg);
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "deadline":
          // Rolling/undated goes last
          const da = a.deadline && a.deadline !== "Rolling" ? a.deadline : "zzzz";
          const db = b.deadline && b.deadline !== "Rolling" ? b.deadline : "zzzz";
          return da.localeCompare(db);
        case "amount":
          return (Number(b.amount_requested) || 0) - (Number(a.amount_requested) || 0);
        case "match":
          return (b.match_pct || 0) - (a.match_pct || 0);
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [engagements, activeStage, filterOrg, sortBy]);

  // Group by stage
  const byStage = useMemo(() => {
    const map = new Map<EngagementStage, DbEngagementWithOrg[]>();
    for (const stage of PIPELINE_STAGES) {
      map.set(stage, []);
    }
    for (const eng of filteredEngagements) {
      const bucket = map.get(eng.stage as EngagementStage);
      if (bucket) bucket.push(eng);
    }
    return map;
  }, [filteredEngagements]);

  const totalValue = useMemo(
    () =>
      filteredEngagements.reduce(
        (sum, e) => sum + (e.amount_requested ? Number(e.amount_requested) : 0),
        0
      ),
    [filteredEngagements]
  );

  const handleStartEditNotes = (eng: DbEngagementWithOrg) => {
    setEditingNotesId(eng.id);
    setNotesValue(eng.notes || "");
  };

  const handleSaveNotes = () => {
    if (editingNotesId && onUpdateNotes) {
      onUpdateNotes(editingNotesId, notesValue);
    }
    setEditingNotesId(null);
    setNotesValue("");
  };

  const handleCancelNotes = () => {
    setEditingNotesId(null);
    setNotesValue("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {activeStage
              ? ENGAGEMENT_STAGES.find((s) => s.key === activeStage)?.label ?? "Pipeline"
              : "Pipeline"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            {activeStage === "prospect" && "Opportunities on your radar — assess fit before diving in."}
            {activeStage === "researching" && "Gathering requirements, deadlines, and eligibility details."}
            {activeStage === "writing" && "Drafting LOIs, proposals, and supporting documents."}
            {activeStage === "submitted" && "Applications sent — awaiting funder decisions."}
            {!activeStage && "Track grant opportunities from prospect to submission."}
          </p>
        </div>
        {engagements.length > 0 && (
          <button
            onClick={() => setShowControls(!showControls)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              showControls
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <IconFilter className="h-3.5 w-3.5" />
            Filter / Sort
          </button>
        )}
      </div>

      {/* Filter & sort controls */}
      <AnimatePresence>
        {showControls && engagements.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
              {/* Org filter */}
              {orgOptions.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                    Org
                  </span>
                  <select
                    value={filterOrg}
                    onChange={(e) => setFilterOrg(e.target.value)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    <option value="all">All organizations</option>
                    {orgOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                  Sort
                </span>
                <div className="flex gap-1">
                  {(
                    [
                      { key: "updated", label: "Recent" },
                      { key: "deadline", label: "Deadline" },
                      { key: "amount", label: "Amount" },
                      { key: "match", label: "Match %" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                        sortBy === key
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                          : "text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary stats — show only when viewing all stages */}
      {!activeStage && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => {
            const meta = STAGE_META[stage];
            const items = byStage.get(stage) ?? [];
            const label = ENGAGEMENT_STAGES.find((s) => s.key === stage)?.label ?? stage;
            const Icon = meta.icon;
            return (
              <div
                key={stage}
                className="rounded-xl border border-gray-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("rounded-lg p-1.5", meta.bgColor)}>
                    <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-neutral-500">
                    {label}
                  </span>
                </div>
                <div className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {items.length}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stage progress bar when viewing a specific stage */}
      {activeStage && (
        <div className="mb-6 flex items-center gap-1">
          {PIPELINE_STAGES.map((stage, i) => {
            const meta = STAGE_META[stage];
            const isActive = stage === activeStage;
            const isPast = PIPELINE_STAGES.indexOf(stage) < PIPELINE_STAGES.indexOf(activeStage);
            return (
              <div key={stage} className="flex flex-1 items-center gap-1">
                <div
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    isActive
                      ? "bg-indigo-500"
                      : isPast
                        ? "bg-indigo-200 dark:bg-indigo-800"
                        : "bg-gray-200 dark:bg-neutral-700"
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Pipeline total */}
      {totalValue > 0 && (
        <div className="mb-5 text-xs text-gray-400 dark:text-neutral-600">
          Pipeline total: {fmt$(totalValue)} across {filteredEngagements.length} engagement
          {filteredEngagements.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Empty state */}
      {engagements.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-neutral-800">
            <IconTargetArrow className="h-6 w-6 text-gray-400 dark:text-neutral-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No engagements yet
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            Use the Grants tab to search and track opportunities for your
            organizations.
          </p>
        </div>
      )}

      {/* Filtered empty */}
      {engagements.length > 0 && filteredEngagements.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-neutral-500">
          No engagements match your filter.
        </div>
      )}

      {/* Stage columns */}
      {PIPELINE_STAGES.map((stage) => {
        const items = byStage.get(stage) ?? [];
        if (items.length === 0) return null;

        const meta = STAGE_META[stage];
        const Icon = meta.icon;
        const label = ENGAGEMENT_STAGES.find((s) => s.key === stage)?.label ?? stage;
        const stageIdx = PIPELINE_STAGES.indexOf(stage);
        const nextStage = stageIdx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[stageIdx + 1] : null;
        const prevStage = stageIdx > 0 ? PIPELINE_STAGES[stageIdx - 1] : null;

        return (
          <div key={stage} className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Icon className={cn("h-4 w-4", meta.color)} />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">
                {label}
              </h2>
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-neutral-800 dark:text-neutral-500">
                {items.length}
              </span>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {items.map((eng) => {
                  const isExpanded = expandedId === eng.id;
                  const isEditingNotes = editingNotesId === eng.id;
                  const createdDate = new Date(eng.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <motion.div
                      key={eng.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                    >
                      {/* Card header */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : eng.id)}
                        className="flex w-full items-center gap-3 p-4 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
                            {eng.funder_name}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">
                            {eng.opportunity_name}
                          </div>
                          {eng.organization && (
                            <div className="mt-1 text-[11px] text-gray-400 dark:text-neutral-600">
                              {eng.organization.name}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {eng.deadline && eng.deadline !== "Rolling" && (
                            <span className="hidden items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-neutral-800 dark:text-neutral-500 sm:flex">
                              <IconCalendar className="h-2.5 w-2.5" />
                              {eng.deadline}
                            </span>
                          )}
                          {eng.deadline === "Rolling" && (
                            <span className="hidden text-[11px] text-gray-400 dark:text-neutral-600 sm:block">
                              Rolling
                            </span>
                          )}
                          {eng.match_pct > 0 && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              {eng.match_pct}%
                            </span>
                          )}
                          {eng.notes && !isExpanded && (
                            <IconNote className="h-3 w-3 text-gray-300 dark:text-neutral-600" />
                          )}
                          <IconChevronRight
                            className={cn(
                              "h-3.5 w-3.5 text-gray-400 transition-transform dark:text-neutral-600",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </div>
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-neutral-800">
                              {/* Meta row: amount, deadline, match, added date */}
                              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                                {eng.amount_requested && (
                                  <span className="flex items-center gap-1 text-gray-500 dark:text-neutral-400">
                                    <IconCurrencyDollar className="h-3 w-3" />
                                    <span className="font-medium text-gray-700 dark:text-neutral-300">
                                      {fmt$(Number(eng.amount_requested))}
                                    </span>
                                    requested
                                  </span>
                                )}
                                {eng.deadline && (
                                  <span className="flex items-center gap-1 text-gray-500 dark:text-neutral-400">
                                    <IconCalendar className="h-3 w-3" />
                                    Deadline: {eng.deadline}
                                  </span>
                                )}
                                {eng.match_pct > 0 && (
                                  <span className="flex items-center gap-1 text-gray-500 dark:text-neutral-400">
                                    <IconPercentage className="h-3 w-3" />
                                    Match: {eng.match_pct}%
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-gray-400 dark:text-neutral-500">
                                  <IconClock className="h-3 w-3" />
                                  Added {createdDate}
                                </span>
                              </div>

                              {/* Stage timestamps */}
                              {(eng.submitted_at || eng.awarded_at || eng.closed_at) && (
                                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 dark:text-neutral-500">
                                  {eng.submitted_at && (
                                    <span>
                                      Submitted{" "}
                                      {new Date(eng.submitted_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                  {eng.awarded_at && (
                                    <span>
                                      Awarded{" "}
                                      {new Date(eng.awarded_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                  {eng.closed_at && (
                                    <span>
                                      Closed{" "}
                                      {new Date(eng.closed_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Fits & blockers */}
                              {(eng.fits.length > 0 || eng.blockers.length > 0) && (
                                <div className="mb-3 flex flex-wrap gap-1.5">
                                  {eng.fits.map((f, j) => (
                                    <span
                                      key={`f-${j}`}
                                      className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    >
                                      ✓ {f}
                                    </span>
                                  ))}
                                  {eng.blockers.map((b, j) => (
                                    <span
                                      key={`b-${j}`}
                                      className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 dark:bg-red-500/10 dark:text-red-400"
                                    >
                                      ✕ {b}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Notes */}
                              {isEditingNotes ? (
                                <div className="mb-3">
                                  <textarea
                                    ref={notesRef}
                                    value={notesValue}
                                    onChange={(e) => setNotesValue(e.target.value)}
                                    placeholder="Add research notes, key contacts, requirements…"
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:placeholder-neutral-500 dark:focus:border-indigo-500 dark:focus:bg-neutral-900 dark:focus:ring-indigo-900/30"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        handleSaveNotes();
                                      }
                                      if (e.key === "Escape") {
                                        handleCancelNotes();
                                      }
                                    }}
                                  />
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <button
                                      onClick={handleSaveNotes}
                                      className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-indigo-700"
                                    >
                                      <IconCheck className="h-3 w-3" />
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelNotes}
                                      className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                                    >
                                      Cancel
                                    </button>
                                    <span className="ml-auto text-[10px] text-gray-300 dark:text-neutral-600">
                                      ⌘Enter to save · Esc to cancel
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-3">
                                  {eng.notes ? (
                                    <button
                                      onClick={() => handleStartEditNotes(eng)}
                                      className="group w-full text-left"
                                    >
                                      <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600 transition-colors group-hover:bg-gray-100 dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-neutral-750">
                                        {eng.notes}
                                        <span className="ml-2 text-[10px] text-gray-300 group-hover:text-gray-400 dark:text-neutral-600 dark:group-hover:text-neutral-500">
                                          click to edit
                                        </span>
                                      </p>
                                    </button>
                                  ) : onUpdateNotes ? (
                                    <button
                                      onClick={() => handleStartEditNotes(eng)}
                                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-[11px] text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-500 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-400"
                                    >
                                      <IconNote className="h-3 w-3" />
                                      Add notes…
                                    </button>
                                  ) : null}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap items-center gap-2">
                                {prevStage && (
                                  <button
                                    onClick={() => onMoveStage(eng.id, prevStage)}
                                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                                  >
                                    <IconArrowLeft className="h-3 w-3" />
                                    Back to{" "}
                                    {ENGAGEMENT_STAGES.find((s) => s.key === prevStage)?.label}
                                  </button>
                                )}
                                {nextStage && (
                                  <button
                                    onClick={() => onMoveStage(eng.id, nextStage)}
                                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
                                  >
                                    Move to{" "}
                                    {ENGAGEMENT_STAGES.find((s) => s.key === nextStage)?.label}
                                    <IconArrowRight className="h-3 w-3" />
                                  </button>
                                )}

                                {eng.organization && (
                                  <button
                                    onClick={() => onSelectOrg(eng.org_id)}
                                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                                  >
                                    <IconExternalLink className="h-3 w-3" />
                                    View org
                                  </button>
                                )}

                                <button
                                  onClick={() => onDelete(eng.id)}
                                  className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-neutral-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                >
                                  <IconTrash className="h-3 w-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
