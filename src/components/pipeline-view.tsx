"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconArrowRight,
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
  onMoveStage: (id: string, stage: EngagementStage) => void;
  onDelete: (id: string) => void;
  onSelectOrg: (orgId: string) => void;
}

const STAGE_META: Record<
  EngagementStage,
  { icon: typeof IconTargetArrow; color: string; bgColor: string }
> = {
  prospect: {
    icon: IconTargetArrow,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  researching: {
    icon: IconSearch,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
  },
  writing: {
    icon: IconNote,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
  },
  submitted: {
    icon: IconSend,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  awarded: {
    icon: IconClipboardCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-500/10",
  },
  reporting: {
    icon: IconCalendar,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-500/10",
  },
  closed: {
    icon: IconEye,
    color: "text-gray-500 dark:text-neutral-500",
    bgColor: "bg-gray-50 dark:bg-neutral-800",
  },
};

export function PipelineView({
  engagements,
  loading,
  onMoveStage,
  onDelete,
  onSelectOrg,
}: PipelineViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group engagements by stage
  const byStage = useMemo(() => {
    const map = new Map<EngagementStage, DbEngagementWithOrg[]>();
    for (const stage of PIPELINE_STAGES) {
      map.set(stage, []);
    }
    for (const eng of engagements) {
      const bucket = map.get(eng.stage as EngagementStage);
      if (bucket) bucket.push(eng);
    }
    return map;
  }, [engagements]);

  const totalValue = useMemo(
    () =>
      engagements.reduce(
        (sum, e) => sum + (e.amount_requested ? Number(e.amount_requested) : 0),
        0
      ),
    [engagements]
  );

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Pipeline
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
          Track grant opportunities from prospect to submission.
        </p>
      </div>

      {/* Summary stats */}
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

      {/* Pipeline total */}
      {totalValue > 0 && (
        <div className="mb-5 text-xs text-gray-400 dark:text-neutral-600">
          Pipeline total: {fmt$(totalValue)} across {engagements.length} engagement
          {engagements.length !== 1 ? "s" : ""}
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

      {/* Stage columns */}
      {PIPELINE_STAGES.map((stage) => {
        const items = byStage.get(stage) ?? [];
        if (items.length === 0) return null;

        const meta = STAGE_META[stage];
        const Icon = meta.icon;
        const label = ENGAGEMENT_STAGES.find((s) => s.key === stage)?.label ?? stage;
        const stageIdx = PIPELINE_STAGES.indexOf(stage);
        const nextStage = stageIdx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[stageIdx + 1] : null;

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
                          {eng.deadline && (
                            <span className="hidden text-[11px] text-gray-400 dark:text-neutral-600 sm:block">
                              {eng.deadline}
                            </span>
                          )}
                          {eng.match_pct > 0 && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              {eng.match_pct}%
                            </span>
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
                              {/* Fits & blockers */}
                              {(eng.fits.length > 0 || eng.blockers.length > 0) && (
                                <div className="mb-3 flex flex-wrap gap-1.5">
                                  {eng.fits.map((f, j) => (
                                    <span
                                      key={`f-${j}`}
                                      className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    >
                                      {f}
                                    </span>
                                  ))}
                                  {eng.blockers.map((b, j) => (
                                    <span
                                      key={`b-${j}`}
                                      className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 dark:bg-red-500/10 dark:text-red-400"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Notes */}
                              {eng.notes && (
                                <p className="mb-3 text-xs text-gray-500 dark:text-neutral-400">
                                  {eng.notes}
                                </p>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap items-center gap-2">
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
