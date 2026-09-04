"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  IconBuilding,
  IconInbox,
  IconCoin,
  IconTargetArrow,
} from "@tabler/icons-react";
import type { View } from "@/app/dashboard/page";

interface AppSidebarProps {
  counts: Record<View, number | undefined>;
  view: View;
  onSwitchView: (v: View) => void;
}

const NAV_ITEMS: { key: View; label: string; icon: typeof IconBuilding }[] = [
  { key: "inbox", label: "Inbox", icon: IconInbox },
  { key: "orgs", label: "Orgs", icon: IconBuilding },
  { key: "grants", label: "Grants", icon: IconCoin },
  { key: "pipeline", label: "Pipeline", icon: IconTargetArrow },
];

export function AppSidebar({
  counts,
  view,
  onSwitchView,
}: AppSidebarProps) {
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
      </div>

      <div className="flex-1" />
    </div>
  );
}

/* ── Bottom tab bar for mobile ── */

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
      {NAV_ITEMS.map((item) => {
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
