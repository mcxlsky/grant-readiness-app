"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconBuilding,
  IconInbox,
  IconCoin,
  IconTargetArrow,
  IconSearch,
  IconNote,
  IconSend,
  IconChevronDown,
} from "@tabler/icons-react";
import type { View } from "@/app/dashboard/page";
import type { EngagementStage } from "@/lib/db/types";

/** Stage sub-items under Pipeline */
const PIPELINE_SUB_ITEMS: {
  stage: EngagementStage;
  label: string;
  icon: typeof IconTargetArrow;
  description: string;
}[] = [
  {
    stage: "prospect",
    label: "Prospect",
    icon: IconTargetArrow,
    description: "Opportunities on your radar",
  },
  {
    stage: "researching",
    label: "Researching",
    icon: IconSearch,
    description: "Gathering requirements & fit",
  },
  {
    stage: "writing",
    label: "Writing",
    icon: IconNote,
    description: "Drafting LOI or proposal",
  },
  {
    stage: "submitted",
    label: "Submitted",
    icon: IconSend,
    description: "Applications sent, awaiting decision",
  },
];

interface AppSidebarProps {
  counts: Record<View, number | undefined>;
  stageCounts?: Record<EngagementStage, number>;
  view: View;
  activeStage?: EngagementStage | null;
  onSwitchView: (v: View) => void;
  onSelectStage?: (stage: EngagementStage | null) => void;
}

const NAV_ITEMS: { key: View; label: string; icon: typeof IconBuilding }[] = [
  { key: "inbox", label: "Inbox", icon: IconInbox },
  { key: "orgs", label: "Orgs", icon: IconBuilding },
  { key: "grants", label: "Grants", icon: IconCoin },
];

export function AppSidebar({
  counts,
  stageCounts,
  view,
  activeStage,
  onSwitchView,
  onSelectStage,
}: AppSidebarProps) {
  const [pipelineExpanded, setPipelineExpanded] = useState(view === "pipeline");
  const isPipelineActive = view === "pipeline";

  const handlePipelineClick = () => {
    if (isPipelineActive) {
      // Toggle expand/collapse when already on pipeline
      setPipelineExpanded(!pipelineExpanded);
    } else {
      // Switch to pipeline and show all stages
      onSwitchView("pipeline");
      onSelectStage?.(null);
      setPipelineExpanded(true);
    }
  };

  const handleStageClick = (stage: EngagementStage) => {
    if (view !== "pipeline") {
      onSwitchView("pipeline");
    }
    onSelectStage?.(activeStage === stage ? null : stage);
    setPipelineExpanded(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Nav items */}
      <div className="px-2 pt-6">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onSwitchView(item.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-gray-100 font-medium text-gray-900 dark:bg-neutral-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {count != null && (
                <span
                  className={cn(
                    "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none",
                    active
                      ? "bg-gray-200 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300"
                      : "bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-500"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Pipeline section with sub-items */}
        <div className="mt-1">
          <button
            onClick={handlePipelineClick}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
              isPipelineActive && !activeStage
                ? "bg-gray-100 font-medium text-gray-900 dark:bg-neutral-800 dark:text-white"
                : isPipelineActive
                  ? "font-medium text-gray-700 dark:text-neutral-300"
                  : "text-gray-600 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            )}
          >
            <IconTargetArrow className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Pipeline</span>
            {counts.pipeline != null && (
              <span
                className={cn(
                  "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none",
                  isPipelineActive
                    ? "bg-gray-200 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300"
                    : "bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-500"
                )}
              >
                {counts.pipeline}
              </span>
            )}
            <IconChevronDown
              className={cn(
                "h-3 w-3 shrink-0 text-gray-400 transition-transform dark:text-neutral-500",
                pipelineExpanded && "rotate-180"
              )}
            />
          </button>

          {/* Sub-items */}
          {pipelineExpanded && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3 dark:border-neutral-700">
              {PIPELINE_SUB_ITEMS.map(({ stage, label, icon: StageIcon }) => {
                const isActive = isPipelineActive && activeStage === stage;
                const count = stageCounts?.[stage] ?? 0;
                return (
                  <button
                    key={stage}
                    onClick={() => handleStageClick(stage)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors",
                      isActive
                        ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-neutral-500 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
                    )}
                  >
                    <StageIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "min-w-[14px] rounded-full px-1 py-0.5 text-center text-[9px] font-semibold leading-none",
                          isActive
                            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                            : "bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-500"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />
    </div>
  );
}

/* ── Bottom tab bar for mobile ── */

const MOBILE_ITEMS: { key: View; label: string; icon: typeof IconBuilding }[] = [
  { key: "inbox", label: "Inbox", icon: IconInbox },
  { key: "orgs", label: "Orgs", icon: IconBuilding },
  { key: "grants", label: "Grants", icon: IconCoin },
  { key: "pipeline", label: "Pipeline", icon: IconTargetArrow },
];

export function MobileTabBar({
  view,
  onSwitchView,
  counts,
}: {
  view: View;
  onSwitchView: (v: View) => void;
  counts: Record<View, number | undefined>;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200 bg-white/95 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95 md:hidden">
      {MOBILE_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = view === item.key;
        // Only show badge on Inbox
        const count = item.key === "inbox" && counts.inbox ? counts.inbox : undefined;
        return (
          <button
            key={item.key}
            onClick={() => onSwitchView(item.key)}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              active
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-400 dark:text-neutral-500"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {count != null && (
                <span className="absolute -right-2.5 -top-1.5 min-w-[14px] rounded-full bg-indigo-500 px-1 py-0.5 text-center text-[8px] font-bold leading-none text-white">
                  {count}
                </span>
              )}
            </div>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
