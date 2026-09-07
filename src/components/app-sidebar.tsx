"use client";

import { cn } from "@/lib/utils";
import {
  IconCoin,
  IconWorldSearch,
  IconNote,
  IconCircleCheck,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPencil,
  IconSend,
  IconInbox,
  IconTargetArrow,
} from "@tabler/icons-react";
import type { View, InboxFilter } from "@/app/dashboard/page";
import type { PipelineStage } from "@/lib/types";

interface AppSidebarProps {
  counts: Record<View, number | undefined>;
  stageCounts?: Record<PipelineStage, number>;
  view: View;
  activeStage?: PipelineStage | null;
  onSwitchView: (v: View) => void;
  onSelectStage?: (stage: PipelineStage | null) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  inboxFilter?: InboxFilter;
  inboxCounts?: Record<InboxFilter, number>;
  onSelectInboxFilter?: (filter: InboxFilter) => void;
}

export function AppSidebar({
  stageCounts,
  view,
  activeStage,
  onSwitchView,
  onSelectStage,
  collapsed = false,
  onToggleCollapse,
  inboxFilter = "all",
  inboxCounts,
  onSelectInboxFilter,
}: AppSidebarProps) {
  const items: {
    key: string;
    label: string;
    icon: typeof IconCoin;
    count?: number;
    active: boolean;
    onClick: () => void;
  }[] = [
    {
      key: "inbox",
      label: "Inbox",
      icon: IconInbox,
      count: inboxCounts?.ready,
      active: view === "orgs",
      onClick: () => { onSwitchView("orgs"); onSelectInboxFilter?.("ready"); },
    },
    {
      key: "grants",
      label: "Grants",
      icon: IconCoin,
      active: view === "grants",
      onClick: () => onSwitchView("grants"),
    },
    {
      key: "prospecting",
      label: "Prospecting",
      icon: IconWorldSearch,
      count: stageCounts?.prospecting,
      active: view === "pipeline" && activeStage === "prospecting",
      onClick: () => { onSwitchView("pipeline"); onSelectStage?.("prospecting"); },
    },
    {
      key: "writing",
      label: "Writing",
      icon: IconPencil,
      count: stageCounts?.writing,
      active: view === "pipeline" && activeStage === "writing",
      onClick: () => { onSwitchView("pipeline"); onSelectStage?.("writing"); },
    },
    {
      key: "submitted",
      label: "Submitted",
      icon: IconSend,
      count: stageCounts?.submitted,
      active: view === "pipeline" && activeStage === "submitted",
      onClick: () => { onSwitchView("pipeline"); onSelectStage?.("submitted"); },
    },
  ];

  const topItems = items.filter((i) => i.key === "inbox" || i.key === "grants");
  const pipelineItems = items.filter((i) => i.key !== "inbox" && i.key !== "grants");

  const renderItem = (item: (typeof items)[number]) => {
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        onClick={item.onClick}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex w-full items-center rounded-lg py-2 text-[13px] transition-colors",
          collapsed ? "justify-center px-0" : "gap-2.5 px-3",
          item.active
            ? "bg-gray-100 font-medium text-gray-900 dark:bg-neutral-800 dark:text-white"
            : "text-gray-600 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {(item.count ?? 0) > 0 && (
              <span
                className={cn(
                  "min-w-[14px] rounded-full px-1 py-0.5 text-center text-[9px] font-semibold leading-none",
                  item.active
                    ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                    : "bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-500"
                )}
              >
                {item.count}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className={cn("space-y-0.5 pt-6", collapsed ? "px-1" : "px-2")}>
        {topItems.map(renderItem)}
      </div>

      {/* Pipeline stages */}
      <div className={cn("space-y-0.5", collapsed ? "px-1" : "px-2")}>
        {pipelineItems.map(renderItem)}
      </div>

      <div className="flex-1" />

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <div className={cn("border-t border-gray-200 dark:border-neutral-800", collapsed ? "px-1 py-2" : "px-2 py-2")}>
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center rounded-lg py-2 text-[13px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300",
              collapsed ? "justify-center px-0" : "gap-2.5 px-3"
            )}
          >
            {collapsed ? (
              <IconLayoutSidebarLeftExpand className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <IconLayoutSidebarLeftCollapse className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Bottom tab bar for mobile ── */

const MOBILE_ITEMS: { key: View; label: string; icon: typeof IconInbox }[] = [
  { key: "orgs", label: "Inbox", icon: IconInbox },
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
            </div>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
