"use client";

import { motion } from "motion/react";
import { IconChevronRight, IconExternalLink, IconChevronLeft, IconEye } from "@tabler/icons-react";
import { useState } from "react";
import Link from "next/link";
import { cn, fmt$, tierColor, matchColor } from "@/lib/utils";
import { loadApplications } from "@/lib/applications";
import type { PortfolioOrg } from "@/lib/types";

interface DashboardViewProps {
  org: PortfolioOrg;
  onBack: () => void;
}

function ringColor(key: string) {
  if (key === "financial") return "#6366f1";   // indigo-500
  if (key === "compliance") return "#3b82f6";  // blue-500
  return "#f59e0b";                            // amber-500
}

function barGradient(key: string) {
  if (key === "financial") return "from-indigo-500 to-indigo-400";
  if (key === "compliance") return "from-blue-500 to-blue-400";
  return "from-amber-500 to-amber-400";
}

function ScoreRing({
  score,
  size = 64,
  stroke = 5,
  color,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  color: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="block -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-100 dark:text-neutral-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
          className="fill-gray-800 dark:fill-neutral-200"
          style={{ fontSize: size * 0.3, fontWeight: 700 }}
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="text-[10px] font-medium text-gray-500 dark:text-neutral-500">{label}</span>
      )}
    </div>
  );
}

export function DashboardView({ org, onBack }: DashboardViewProps) {
  const data = org.analysisData!;
  const { org: orgData, readiness, grantMatches, actionItems, siteScan, websiteUrl } = data;
  const color = tierColor(readiness.tier);
  const eligible = grantMatches.filter((m) => m.eligible);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Find matching application for "View as applicant" link
  const matchingApp = (() => {
    const apps = loadApplications();
    return apps.find((a) => parseInt(a.ein.replace(/\D/g, ""), 10) === org.ein) || null;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400"
      >
        <IconChevronLeft className="h-3.5 w-3.5" />
        Organizations
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {orgData.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
          EIN {String(orgData.ein)} · {orgData.city || ""},{" "}
          {orgData.state || ""}
          {orgData.ntee_code ? ` · NTEE ${orgData.ntee_code}` : ""}
          {orgData.ruling_date
            ? ` · Since ${String(orgData.ruling_date).slice(0, 4)}`
            : ""}
        </p>

        {/* Seeking amount + applicant view link */}
        <div className="mt-3 flex items-center gap-4">
          {matchingApp?.amountRequested && (
            <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
              Seeking {matchingApp.amountRequested}
            </span>
          )}
          {matchingApp && (
            <Link
              href={`/portal?ref=${matchingApp.id}`}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
            >
              <IconEye className="h-3.5 w-3.5" />
              View as applicant
            </Link>
          )}
        </div>
      </div>

      {/* Readiness + Action Items */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Readiness rings */}
        <div className="grid grid-cols-4 gap-2 px-5 pt-5 pb-2">
          <ScoreRing score={readiness.overall} size={64} stroke={5} color={color} label={readiness.tier} />
          <ScoreRing score={readiness.financial.score} size={64} stroke={5} color={ringColor("financial")} label="Financial" />
          <ScoreRing score={readiness.compliance.score} size={64} stroke={5} color={ringColor("compliance")} label="Compliance" />
          <ScoreRing score={readiness.digital.score} size={64} stroke={5} color={ringColor("digital")} label="Digital" />
        </div>

        {/* Action items */}
        {actionItems.length > 0 && (
          <div className="mx-5 mt-4 border-t border-gray-100 pt-3 dark:border-neutral-800">
            <div className="space-y-0">
              {actionItems.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-b-0 dark:border-neutral-800"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: ringColor(a.category.toLowerCase()) }}
                  />
                  <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">
                    {a.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Readiness details toggle */}
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="flex w-full items-center justify-between px-5 py-3"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600">
            {detailsOpen ? "Hide details" : "Show check details"}
          </span>
          <IconChevronRight
            className={cn(
              "h-3.5 w-3.5 text-gray-400 transition-transform dark:text-neutral-600",
              detailsOpen && "rotate-90"
            )}
          />
        </button>

        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-gray-200 p-5 dark:border-neutral-800"
          >
            {(
              [
                ["Financial Health", readiness.financial, "financial"],
                ["Filing Compliance", readiness.compliance, "compliance"],
                ["Digital Housekeeping", readiness.digital, "digital"],
              ] as const
            ).map(([title, section, key], idx) => (
              <div
                key={key}
                className={cn(
                  "pb-5",
                  idx < 2 && "mb-5 border-b border-gray-100 dark:border-neutral-800"
                )}
              >
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-neutral-300">{title}</span>
                  <span className="tabular-nums text-gray-500 dark:text-neutral-500">
                    {section.score}/100
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                  <div
                    className={cn(
                      "bar-fill-animated h-full rounded-full bg-gradient-to-r",
                      barGradient(key)
                    )}
                    style={{ width: `${section.score}%` }}
                  />
                </div>
                <ul className="space-y-0">
                  {section.checks.map(([label, passed, weight], i) => {
                    const cls = passed
                      ? "text-emerald-600 dark:text-emerald-400"
                      : weight === 0 && !passed
                      ? "text-gray-300 dark:text-neutral-600"
                      : "text-red-500 dark:text-red-400";
                    const icon = passed ? "✓" : weight === 0 && !passed ? "•" : "✕";
                    return (
                      <li
                        key={i}
                        className="flex items-start gap-2 border-b border-gray-50 py-2 text-sm last:border-b-0 dark:border-neutral-800/50"
                      >
                        <span className={cn("shrink-0 font-bold", cls)}>
                          {icon}
                        </span>
                        <span className="text-gray-600 dark:text-neutral-400">{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {!websiteUrl && (
              <p className="mt-2 text-xs text-gray-400 dark:text-neutral-600">
                No website URL was provided — digital score reflects that gap
                alone.
              </p>
            )}
            {websiteUrl && siteScan && siteScan.pages_checked?.length > 0 && (
              <p className="mt-2 text-xs text-gray-400 dark:text-neutral-600">
                Scanned: {siteScan.pages_checked.join(", ")}
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Grant opportunities */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
              Grant Opportunities
            </h2>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {eligible.length} match{eligible.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
        <p className="mb-4 text-xs text-gray-400 dark:text-neutral-600">
          Matched by cause area. Sorted by compatibility with your organization.
        </p>

        {grantMatches.length === 0 ? (
          <p className="py-4 text-sm text-gray-500 dark:text-neutral-500">
            No matching funders found for this cause area.
          </p>
        ) : (
          <div className="space-y-3">
            {grantMatches.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 dark:border-neutral-800 dark:hover:border-neutral-700",
                  !m.eligible && "opacity-60"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
                      {m.name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">
                      {m.type} · {m.focus}
                    </div>
                  </div>
                  {m.match_pct > 0 ? (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                      style={{ background: matchColor(m.match_pct) }}
                    >
                      {m.match_pct}%
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400 dark:bg-neutral-800 dark:text-neutral-500">
                      Manual
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-y border-gray-100 py-2.5 text-xs dark:border-neutral-800">
                  <span className="text-gray-500 dark:text-neutral-500">
                    Grant range:{" "}
                    <span className="text-gray-700 dark:text-neutral-300">
                      {fmt$(m.grant_range[0])} – {fmt$(m.grant_range[1])}
                    </span>
                  </span>
                  <span className="text-gray-500 dark:text-neutral-500">
                    Avg award:{" "}
                    <span className="text-gray-700 dark:text-neutral-300">{fmt$(m.avg_grant)}</span>
                  </span>
                  <span className="text-gray-500 dark:text-neutral-500">
                    Deadline:{" "}
                    <span className="text-gray-700 dark:text-neutral-300">{m.deadline}</span>
                  </span>
                </div>

                {/* Fits */}
                {m.fits.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.fits.map((f, j) => (
                      <span
                        key={j}
                        className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      >
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Blockers */}
                {m.blockers.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.blockers.map((b, j) => (
                      <span
                        key={j}
                        className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 dark:bg-red-500/10 dark:text-red-400"
                      >
                        ✕ {b}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {new URL(m.url).hostname}
                    <IconExternalLink className="h-3 w-3" />
                  </a>
                  {!m.eligible && (
                    <span className="text-amber-600 dark:text-amber-500">
                      May not meet requirements
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </motion.div>
  );
}
