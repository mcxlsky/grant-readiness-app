"use client";

import { motion } from "motion/react";
import {
  IconChevronRight,
  IconExternalLink,
  IconChevronLeft,
  IconArrowRight,
  IconAlertTriangle,
  IconLock,
  IconMail,
  IconPhone,
  IconBriefcase,
  IconCalendar,
  IconUsers,
  IconCoin,
} from "@tabler/icons-react";
import { useState } from "react";
import { cn, fmt$ } from "@/lib/utils";
import { loadApplications } from "@/lib/applications";
import type { PortfolioOrg } from "@/lib/types";
import { INBOX_STAGES } from "@/lib/types";

interface DashboardViewProps {
  org: PortfolioOrg;
  /** Label for the back breadcrumb (e.g. "Inbox", "Prospecting", "Active") */
  backLabel?: string;
  onBack: () => void;
  /** Called when a grant-ready org clicks through the score gate to start prospecting */
  onStartProspecting?: (ein: number) => void;
}

function ringColor(key: string) {
  if (key === "financial") return "#6366f1";
  if (key === "compliance") return "#3b82f6";
  return "#f59e0b";
}

function barGradient(key: string) {
  if (key === "financial") return "from-indigo-500 to-indigo-400";
  if (key === "compliance") return "from-blue-500 to-blue-400";
  return "from-amber-500 to-amber-400";
}

function ScoreRing({
  score,
  size = 48,
  stroke = 4,
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
    <div className="flex flex-col items-center gap-0.5">
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
        <span className="text-[9px] font-medium text-gray-500 dark:text-neutral-500">{label}</span>
      )}
    </div>
  );
}

function OrgLogo({ org: o }: { org: PortfolioOrg }) {
  const [failed, setFailed] = useState(false);
  const domain = (() => {
    const url = o.analysisData?.websiteUrl || o.analysisData?.siteScan?.url;
    if (!url) return null;
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
  })();

  if (!domain || failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
        {o.name.charAt(0)}
      </div>
    );
  }
  return (
    <img
      src={`/api/logo?domain=${domain}`}
      alt=""
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-gray-200 dark:bg-neutral-800 dark:ring-neutral-700"
      onError={() => setFailed(true)}
    />
  );
}

export function DashboardView({ org, backLabel, onBack, onStartProspecting }: DashboardViewProps) {
  const data = org.analysisData!;
  const { org: orgData, readiness, grantMatches, actionItems, siteScan, websiteUrl } = data;
  const eligible = grantMatches.filter((m) => m.eligible);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Find matching application to pull rich profile data
  const matchingApp = (() => {
    const apps = loadApplications();
    return apps.find((a) => parseInt(a.ein.replace(/\D/g, ""), 10) === org.ein) || null;
  })();

  const locationStr = [orgData.city, orgData.state].filter(Boolean).join(", ");
  const isInbox = (INBOX_STAGES as string[]).includes(org.stage);
  const canProspect = isInbox && readiness.overall >= 65;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400"
      >
        <IconChevronLeft className="h-3.5 w-3.5" />
        {backLabel ?? "Inbox"}
      </button>

      {/* Compact header — logo + name lockup, CTA or score on right */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <OrgLogo org={org} />
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              {orgData.name}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-neutral-500">
              {locationStr && <span>{locationStr}</span>}
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  {websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                  <IconExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {matchingApp?.contactName && (
                <span className="flex items-center gap-1">
                  <IconMail className="h-2.5 w-2.5" />
                  {matchingApp.contactName}
                </span>
              )}
              {orgData.ntee_code && <span>NTEE {orgData.ntee_code}</span>}
            </div>
          </div>
        </div>

        {/* Right side — CTA for inbox grant-ready, score lock for below threshold, score ring for pipeline */}
        {canProspect ? (
          <button
            onClick={() => onStartProspecting?.(org.ein)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Move to Prospecting
            <IconArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : isInbox ? (
          <div className="flex shrink-0 items-center gap-2">
            <IconLock className="h-4 w-4 text-gray-400 dark:text-neutral-500" />
            <span className="text-xs font-medium text-gray-400 dark:text-neutral-500">
              Score {readiness.overall}/65
            </span>
          </div>
        ) : (
          <ScoreRing
            score={readiness.overall}
            size={48}
            stroke={4}
            color={readiness.overall >= 80 ? "#10b981" : readiness.overall >= 65 ? "#f59e0b" : "#ef4444"}
            label="Readiness"
          />
        )}
      </div>

      {/* Readiness action items — compact inline bar */}
      {actionItems.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-start gap-2">
            <IconAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <div className="flex-1 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-medium">{actionItems.length} action item{actionItems.length !== 1 ? "s" : ""}:</span>{" "}
              {actionItems.map((a) => a.action).join(" · ")}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Project info — thread from intake */}
        {matchingApp?.projectTitle && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <IconBriefcase className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                  {matchingApp.projectTitle}
                </h2>
                {matchingApp.amountRequested && (
                  <span className="text-[11px] text-gray-500 dark:text-neutral-500">
                    Requesting {matchingApp.amountRequested}
                  </span>
                )}
              </div>
            </div>

            {matchingApp.projectDescription && (
              <p className="mb-3 text-xs leading-relaxed text-gray-600 dark:text-neutral-400">
                {matchingApp.projectDescription}
              </p>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 pt-3 text-xs dark:border-neutral-800">
              {matchingApp.targetPopulation && (
                <div className="flex items-start gap-1.5">
                  <IconUsers className="mt-0.5 h-3 w-3 shrink-0 text-gray-400 dark:text-neutral-600" />
                  <div>
                    <span className="text-gray-400 dark:text-neutral-600">Target: </span>
                    <span className="text-gray-700 dark:text-neutral-300">{matchingApp.targetPopulation}</span>
                  </div>
                </div>
              )}
              {matchingApp.projectTimeline && (
                <div className="flex items-start gap-1.5">
                  <IconCalendar className="mt-0.5 h-3 w-3 shrink-0 text-gray-400 dark:text-neutral-600" />
                  <div>
                    <span className="text-gray-400 dark:text-neutral-600">Timeline: </span>
                    <span className="text-gray-700 dark:text-neutral-300">{matchingApp.projectTimeline}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grant opportunities — PRIMARY CONTENT */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
                        {m.name}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">
                        {m.type} · {m.focus}
                      </div>
                    </div>
                  </div>

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

        {/* Collapsible org details */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex w-full items-center justify-between px-5 py-3"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
              Organization Details & Readiness
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
              {/* Contact */}
              {matchingApp && (
                <div className="mb-5 flex items-center gap-3 pb-5 border-b border-gray-100 dark:border-neutral-800">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {matchingApp.contactName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {matchingApp.contactName}
                      {matchingApp.contactTitle && (
                        <span className="ml-1.5 font-normal text-gray-500 dark:text-neutral-500">
                          {matchingApp.contactTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <a
                        href={`mailto:${matchingApp.contactEmail}`}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        <IconMail className="h-3 w-3" />
                        {matchingApp.contactEmail}
                      </a>
                      {matchingApp.contactPhone && (
                        <a
                          href={`tel:${matchingApp.contactPhone}`}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                          <IconPhone className="h-3 w-3" />
                          {matchingApp.contactPhone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Org info grid */}
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-400 dark:text-neutral-600">EIN</dt>
                  <dd className="font-medium text-gray-800 dark:text-neutral-200">{String(orgData.ein)}</dd>
                </div>
                {matchingApp?.annualBudget && (
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-neutral-600">Annual Budget</dt>
                    <dd className="font-medium text-gray-800 dark:text-neutral-200">{matchingApp.annualBudget}</dd>
                  </div>
                )}
                {matchingApp?.programAreas && (
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-neutral-600">Program Areas</dt>
                    <dd className="font-medium text-gray-800 dark:text-neutral-200">{matchingApp.programAreas}</dd>
                  </div>
                )}
                {orgData.ruling_date && (
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-neutral-600">Since</dt>
                    <dd className="font-medium text-gray-800 dark:text-neutral-200">{String(orgData.ruling_date).slice(0, 4)}</dd>
                  </div>
                )}
                {matchingApp?.numberServed && (
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-neutral-600">Number Served</dt>
                    <dd className="font-medium text-gray-800 dark:text-neutral-200">{matchingApp.numberServed}</dd>
                  </div>
                )}
              </dl>

              {matchingApp?.missionStatement && (
                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-neutral-800">
                  <dt className="mb-1 text-xs text-gray-400 dark:text-neutral-600">Mission Statement</dt>
                  <dd className="text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
                    {matchingApp.missionStatement}
                  </dd>
                </div>
              )}

              {/* Readiness breakdown */}
              <div className="mt-5 border-t border-gray-100 pt-5 dark:border-neutral-800">
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
                    No website URL was provided — digital score reflects that gap alone.
                  </p>
                )}
                {websiteUrl && siteScan && siteScan.pages_checked?.length > 0 && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-neutral-600">
                    Scanned: {siteScan.pages_checked.join(", ")}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
