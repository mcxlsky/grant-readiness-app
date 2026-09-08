"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconSearch,
  IconCheck,
  IconClock,
  IconMail,
  IconInfoCircle,
  IconX,
  IconCircleDot,
  IconFileText,
  IconLayoutDashboard,
  IconListCheck,
  IconFolder,
  IconMessageCircle,
  IconHelpCircle,
  IconUser,
  IconLogout,
  IconTargetArrow,
  IconSend,
  IconMessageDots,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { loadApplications, loadApplicationDocuments } from "@/lib/applications";
import { loadPortfolio, updatePitchedGrantReviewStatus, updatePitchedGrantReviewComments } from "@/lib/portfolio";
import { GRANT_DATABASE } from "@/lib/grant-database";
import { cn, fmt$ } from "@/lib/utils";
import { formatFileSize, DOCUMENT_CATEGORIES } from "@/lib/file-utils";
import type { GrantApplication, AppStatus, PortfolioOrg, UploadedFile, PitchedGrant, ReviewStatus } from "@/lib/types";
import { PaywallModal } from "@/components/paywall-modal";
import { updateOrgStage } from "@/lib/portfolio";
import { IconArrowRight, IconSparkles } from "@tabler/icons-react";
import { Suspense } from "react";

/* ── Status config ─────────────────────────────────────── */

interface StatusInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof IconCheck;
  description: string;
}

const STATUS_MAP: Record<AppStatus, StatusInfo> = {
  new: {
    label: "Submitted",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-500/10",
    borderColor: "border-indigo-200 dark:border-indigo-500/20",
    icon: IconMail,
    description: "Your application has been received and is in queue for review.",
  },
  pending: {
    label: "Processing",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    borderColor: "border-blue-200 dark:border-blue-500/20",
    icon: IconClock,
    description: "Your application is being processed.",
  },
  reviewing: {
    label: "Under Review",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    borderColor: "border-amber-200 dark:border-amber-500/20",
    icon: IconClock,
    description: "A grant consultant is currently reviewing your application.",
  },
  info_needed: {
    label: "Information Requested",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    borderColor: "border-purple-200 dark:border-purple-500/20",
    icon: IconInfoCircle,
    description: "We need additional information. Please check your email for details.",
  },
  approved: {
    label: "Accepted",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    borderColor: "border-emerald-200 dark:border-emerald-500/20",
    icon: IconCheck,
    description: "Your organization has been accepted into the grant readiness program.",
  },
  declined: {
    label: "Not Selected",
    color: "text-gray-500 dark:text-neutral-400",
    bgColor: "bg-gray-100 dark:bg-neutral-800",
    borderColor: "border-gray-200 dark:border-neutral-700",
    icon: IconX,
    description: "Your application was not selected at this time.",
  },
};

/* ── Upcoming milestones — derived from org state ────── */

interface Milestone {
  title: string;
  description: string;
  done: boolean;
  current?: boolean;
}

function getMilestones(org: PortfolioOrg | null): Milestone[] {
  const hasScore = !!org?.analysisData?.readiness;
  const readiness = org?.analysisData?.readiness;
  const isReady = readiness && (readiness.tier === "Grant-Ready" || readiness.tier === "Strong");
  const hasGaps = readiness && readiness.gaps.length > 0;
  const inPipeline = org && (org.stage === "prospecting" || org.stage === "writing" || org.stage === "submitted");
  const hasSubmitted = org?.pitchedGrants?.some((g) => g.status === "submitted" || g.status === "awarded");

  return [
    {
      title: "Readiness assessment",
      description: hasScore
        ? `Score: ${readiness!.overall}/100 — ${readiness!.tier}`
        : "Automated analysis of your financials, compliance, and digital presence.",
      done: hasScore,
    },
    {
      title: "Address gaps",
      description: hasGaps && !isReady
        ? `${readiness!.gaps.length} items to resolve before you're grant-ready.`
        : "Resolve any compliance or capacity issues flagged in the assessment.",
      done: isReady ?? false,
      current: hasScore && !isReady,
    },
    {
      title: "Unlock grant writing",
      description: inPipeline
        ? "Your consultant is actively prospecting and writing on your behalf."
        : "Start working with a consultant to find and pursue grant opportunities.",
      done: !!inPipeline,
      current: (isReady && !inPipeline) ?? false,
    },
    {
      title: "Submit proposals",
      description: "Your consultant drafts proposals for your review and approval.",
      done: !!hasSubmitted,
      current: !!inPipeline && !hasSubmitted,
    },
  ];
}

/* ── Sidebar nav items ────────────────────────────────── */

type PortalView = "programs" | "org" | "documents" | "help";

const NAV_ITEMS: { id: PortalView; label: string; icon: typeof IconLayoutDashboard }[] = [
  { id: "programs", label: "Programs", icon: IconTargetArrow },
  { id: "org", label: "Organization", icon: IconLayoutDashboard },
];

/* ── Wrapper for Suspense (useSearchParams requires it) ── */

export default function PortalPage() {
  return (
    <Suspense>
      <PortalContent />
    </Suspense>
  );
}

/* ── Main portal component ────────────────────────────── */

function PortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [allApps, setAllApps] = useState<GrantApplication[]>([]);
  const [activeAppIdx, setActiveAppIdx] = useState(0);
  const [org, setOrg] = useState<PortfolioOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<PortalView>("programs");

  const mainRef = useRef<HTMLElement>(null);

  // Paywall + profile dropdown state
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Fallback lookup state
  const [email, setEmail] = useState("");
  const [showLookup, setShowLookup] = useState(false);

  const app = allApps[activeAppIdx] ?? null;

  // Look up the portfolio org matching this application
  const resolveOrg = (application: GrantApplication) => {
    const portfolio = loadPortfolio();
    const einNum = parseInt(application.ein.replace(/\D/g, ""), 10);
    return portfolio.find((o) => o.ein === einNum) || null;
  };

  useEffect(() => {
    const apps = loadApplications();
    const ref = searchParams.get("ref");
    const emailParam = searchParams.get("email");

    if (ref) {
      const found = apps.find((a) => a.id === ref);
      if (found) {
        setAllApps([found]);
        setOrg(resolveOrg(found));
      } else {
        setNotFound(true);
      }
    } else if (emailParam) {
      const matched = apps.filter(
        (a) => a.contactEmail.toLowerCase() === emailParam.toLowerCase()
      );
      if (matched.length > 0) {
        setAllApps(matched);
        setOrg(resolveOrg(matched[0]));
      } else {
        setNotFound(true);
      }
    } else {
      setShowLookup(true);
    }
    setLoading(false);
  }, [searchParams]);

  // Update org when switching between apps
  useEffect(() => {
    if (app) setOrg(resolveOrg(app));
  }, [activeAppIdx]);

  // Scroll content to top on tab/program switch
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [view, activeAppIdx]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const apps = loadApplications();
    const matched = apps.filter(
      (a) => a.contactEmail.toLowerCase() === email.trim().toLowerCase()
    );
    if (matched.length > 0) {
      setAllApps(matched);
      setActiveAppIdx(0);
      setShowLookup(false);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  };

  const handleSignOut = () => {
    router.push("/?choose=1");
  };

  if (loading) return null;

  /* ── Lookup / not-found gates ─────────────── */
  if (!app) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 dark:bg-neutral-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 flex flex-col items-center">
            <div className="mb-3 h-8 w-10 rounded-tl-xl rounded-tr-sm rounded-br-xl rounded-bl-sm bg-indigo-500" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Applicant Portal
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
              Track your application and see what comes next
            </p>
          </div>

          {notFound ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <IconCircleDot className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-neutral-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                Application not found
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
                We couldn&apos;t find an application with that email address.
              </p>
              <div className="mt-5 flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    setNotFound(false);
                    setShowLookup(true);
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Try a different email
                </button>
                <Link
                  href="/get-started"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  <IconFileText className="h-4 w-4" />
                  Start Your Assessment
                </Link>
              </div>
            </div>
          ) : showLookup ? (
            <>
              <form onSubmit={handleLookup} className="mb-6">
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-neutral-400">
                  Enter the email address from your application
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.org"
                      required
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                  >
                    Go
                  </button>
                </div>
              </form>
              <div className="text-center">
                <p className="text-xs text-gray-400 dark:text-neutral-600">
                  Don&apos;t have an application yet?{" "}
                  <Link href="/get-started" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    Get started
                  </Link>
                </p>
              </div>
            </>
          ) : null}
        </motion.div>
      </div>
    );
  }

  /* ── Dashboard layout ─────────────────────── */
  const info = STATUS_MAP[app.status];
  const StatusIcon = info.icon;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 dark:bg-neutral-950">
      {/* Top nav */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:px-6">
        <a href="/?choose=1" className="flex items-center gap-2">
          <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-indigo-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Ready Set Grants
          </span>
        </a>
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right md:block">
            <div className="text-xs font-medium text-gray-800 dark:text-neutral-200">
              {app.contactName}
            </div>
            <div className="text-[10px] leading-tight text-gray-400 dark:text-neutral-500">
              {app.orgName}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-colors hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            >
              <IconUser className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <button
                      onClick={() => { setView("documents"); setProfileOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <IconFolder className="h-4 w-4 text-gray-400 dark:text-neutral-500" />
                      Documents
                    </button>
                    <button
                      onClick={() => { setView("help"); setProfileOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <IconHelpCircle className="h-4 w-4 text-gray-400 dark:text-neutral-500" />
                      Help &amp; FAQ
                    </button>
                    <div className="mx-3 my-1 border-t border-gray-100 dark:border-neutral-800" />
                    <button
                      onClick={() => { handleSignOut(); setProfileOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <IconLogout className="h-4 w-4 text-gray-400 dark:text-neutral-500" />
                      Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop */}
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:flex">
          <div className="flex-1 px-3 py-4">
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                      active
                        ? "bg-gray-100 font-medium text-gray-900 dark:bg-neutral-800 dark:text-white"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="border-t border-gray-200 px-3 py-3 dark:border-neutral-800">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-gray-400 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <IconLayoutDashboard className="h-3.5 w-3.5" />
              Admin view
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main ref={mainRef} className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-[720px] flex-1 px-6 pt-8 pb-8 md:px-10">
            {/* Program sub-tabs — only when multiple applications on Programs view */}
            {allApps.length > 1 && view === "programs" && (
              <div className="mb-6 flex gap-1.5 overflow-x-auto">
                {allApps.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setActiveAppIdx(i)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                      i === activeAppIdx
                        ? "bg-indigo-600 text-white dark:bg-indigo-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                    )}
                  >
                    {a.projectTitle}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${view}-${activeAppIdx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {view === "programs" && <ProgramsPanel app={app} org={org} onRefreshOrg={() => setOrg(resolveOrg(app))} />}
                {view === "org" && <OrgPanel app={app} org={org} onUnlock={() => setPaywallOpen(true)} />}
                {view === "documents" && <DocumentsPanel app={app} />}
                {view === "help" && <HelpPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="flex shrink-0 items-center justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <React.Fragment key={item.id}>
              <button
                onClick={() => setView(item.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-400 dark:text-neutral-500"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
              {/* Add program button between the two tabs */}
              {idx === 0 && (
                <Link
                  href="/get-started"
                  className="flex flex-col items-center justify-center py-1.5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                    <IconPlus className="h-5 w-5" />
                  </span>
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Paywall modal */}
      {app && org?.analysisData?.readiness && (
        <PaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          onConfirm={() => {
            setPaywallOpen(false);
            // Move org to prospecting stage
            updateOrgStage(org.ein, "prospecting");
            setOrg(resolveOrg(app));
          }}
          orgName={app.orgName}
          score={org.analysisData.readiness.overall}
        />
      )}
    </div>
  );
}

/* ── Programs panel — per-program grant activity ─────── */

function ProgramsPanel({ app, org, onRefreshOrg }: { app: GrantApplication; org: PortfolioOrg | null; onRefreshOrg: () => void }) {
  const [reviewingGrant, setReviewingGrant] = useState<PitchedGrant | null>(null);
  const inPipeline = org && (org.stage === "prospecting" || org.stage === "writing" || org.stage === "submitted");
  const pitched = org?.pitchedGrants ?? [];

  // Pipeline grants
  const activeGrants = pitched.filter((g) => g.status !== "declined");
  const visibleGrants = pitched.filter((g) =>
    g.status === "writing" || g.status === "submitted" || g.status === "awarded" || g.status === "declined"
  );

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        {app.projectTitle}
      </h1>
      <p className="mb-5 text-sm text-gray-500 dark:text-neutral-500">
        {app.amountRequested} · {app.projectTimeline}
      </p>

      {!inPipeline ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <IconTargetArrow className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-neutral-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">
            Not yet in the pipeline
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
            Check the Organization tab to see your readiness score and unlock grant writing.
          </p>
        </div>
      ) : (
        <>
          {/* Status line */}
          {activeGrants.length > 0 ? (() => {
            const parts: string[] = [];
            const prospCount = pitched.filter((g) => g.status === "prospect" || g.status === "researching").length;
            const writeCount = pitched.filter((g) => g.status === "writing").length;
            const subCount = pitched.filter((g) => g.status === "submitted" || g.status === "awarded").length;
            if (prospCount > 0) parts.push(`researching ${prospCount}`);
            if (writeCount > 0) parts.push(`writing ${writeCount}`);
            if (subCount > 0) parts.push(`${subCount} submitted`);
            return (
              <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
                Your consultant is {parts.length > 0 ? parts.join(", ") : "getting started"} — {activeGrants.length} grant{activeGrants.length !== 1 ? "s" : ""} total.
              </p>
            );
          })() : (
            <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
              Your consultant is researching grant opportunities for this program.
            </p>
          )}

          {/* Grant cards — detailed view with review actions */}
          {visibleGrants.length > 0 ? (
            <div className="space-y-3">
              {visibleGrants
                .sort((a, b) => {
                  const attnScore = (g: PitchedGrant) =>
                    g.reviewStatus === "in_review" ? 0 : g.reviewStatus === "changes_requested" ? 1 : 10;
                  const statusScore: Record<string, number> = { writing: 0, submitted: 1, awarded: 2, declined: 3 };
                  const d = attnScore(a) - attnScore(b);
                  return d !== 0 ? d : (statusScore[a.status] ?? 0) - (statusScore[b.status] ?? 0);
                })
                .map((g) => {
                  const reviewLabel = getReviewLabel(g.reviewStatus);
                  return (
                    <div
                      key={g.id}
                      className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">{g.funderName}</div>
                          <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">{g.grantName}</div>
                        </div>
                        {reviewLabel && (
                          <span className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${reviewLabel.classes}`}>
                            {reviewLabel.icon}
                            {reviewLabel.text}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {g.matchPct > 0 && (
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums ${
                            g.matchPct >= 85
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : g.matchPct >= 70
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}>
                            {g.matchPct}% fit
                          </span>
                        )}
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {fmt$(g.avgGrant)} avg
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-400">
                          Due {g.deadline}
                        </span>
                      </div>

                      {/* Review CTA */}
                      {g.reviewStatus === "in_review" && (
                        <button
                          onClick={() => setReviewingGrant(g)}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        >
                          Review Draft Answers
                        </button>
                      )}
                      {g.reviewStatus === "approved" && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                          <IconCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            You approved these answers. Your consultant will submit the application.
                          </span>
                        </div>
                      )}
                      {g.reviewStatus === "changes_requested" && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-500/20 dark:bg-orange-500/5">
                          <IconMessageDots className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                            Changes requested — waiting for your consultant to revise.
                          </span>
                        </div>
                      )}
                      {g.status === "submitted" && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                          <IconSend className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Application submitted to the funder.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
              <IconTargetArrow className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-neutral-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">
                No active grants yet
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
                Your consultant is researching opportunities. Grants will appear here once they start drafting.
              </p>
            </div>
          )}

          {/* Review modal */}
          <AnimatePresence>
            {reviewingGrant && org && (
              <ApplicantReviewModal
                grant={reviewingGrant}
                ein={org.ein}
                onClose={() => setReviewingGrant(null)}
                onRefresh={() => {
                  onRefreshOrg();
                  setReviewingGrant(null);
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

/* ── Organization panel — readiness, action items, unlock ── */

function OrgPanel({ app, org, onUnlock }: { app: GrantApplication; org: PortfolioOrg | null; onUnlock: () => void }) {
  const readiness = org?.analysisData?.readiness;
  const isReady = readiness && (readiness.tier === "Grant-Ready" || readiness.tier === "Strong");
  const inPipeline = org && (org.stage === "prospecting" || org.stage === "writing" || org.stage === "submitted");

  // Derive action items from failing readiness checks
  const actionItems: { title: string; category: string; priority: "high" | "medium" | "low" }[] = [];
  if (org?.analysisData) {
    const { readiness: r, actionItems: consultantItems } = org.analysisData;
    for (const item of consultantItems) {
      actionItems.push({ title: item.action, category: item.category, priority: item.priority });
    }
    if (actionItems.length === 0) {
      for (const section of [
        { name: "Financial", data: r.financial },
        { name: "Compliance", data: r.compliance },
        { name: "Digital Presence", data: r.digital },
      ]) {
        for (const [label, pass] of section.data.checks) {
          if (!pass) actionItems.push({ title: label, category: section.name, priority: "medium" });
        }
      }
    }
  }

  const milestones = getMilestones(org);

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        {app.orgName}
      </h1>
      <p className="mb-5 text-sm text-gray-500 dark:text-neutral-500">
        {org?.analysisData?.org.city}, {org?.analysisData?.org.state} · EIN {app.ein}
      </p>

      {/* Readiness score */}
      {readiness && (() => {
        const pct = readiness.overall;
        const tierColor = isReady
          ? "text-emerald-600 dark:text-emerald-400"
          : pct >= 50
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";
        const ringColor = isReady
          ? "stroke-emerald-500"
          : pct >= 50
          ? "stroke-amber-500"
          : "stroke-red-500";
        const sections = [
          { label: "Financial", score: readiness.financial.score },
          { label: "Compliance", score: readiness.compliance.score },
          { label: "Digital Presence", score: readiness.digital.score },
        ];
        return (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" strokeWidth="6"
                    className="stroke-gray-100 dark:stroke-neutral-800" />
                  <circle cx="36" cy="36" r="30" fill="none" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 188.5} 188.5`}
                    className={ringColor} />
                </svg>
                <span className="absolute text-lg font-bold text-gray-900 dark:text-white">{pct}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${tierColor}`}>{readiness.tier}</div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">Grant Readiness Score</div>
                <div className="mt-3 space-y-1.5">
                  {sections.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-24 text-[10px] font-medium text-gray-400 dark:text-neutral-500">{s.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                        <div
                          className={`h-full rounded-full ${s.score >= 70 ? "bg-emerald-500" : s.score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[10px] font-medium text-gray-400 dark:text-neutral-500">{s.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unlock CTA — shown when Grant-Ready but not yet in pipeline */}
      {isReady && !inPipeline && (
        <button
          onClick={onUnlock}
          className="mb-6 flex w-full items-center gap-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 text-left transition-colors hover:border-indigo-300 hover:from-indigo-100 hover:to-violet-100 dark:border-indigo-800/50 dark:from-indigo-500/10 dark:to-violet-500/10 dark:hover:border-indigo-700/50 dark:hover:from-indigo-500/15 dark:hover:to-violet-500/15"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500">
            <IconSparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Ready to start winning grants?</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">Unlock grant prospecting, proposal support, and pipeline management.</div>
          </div>
          <IconArrowRight className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
        </button>
      )}

      {/* Pipeline status — shown when already in pipeline */}
      {inPipeline && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <IconCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Active in the grant pipeline
          </span>
        </div>
      )}

      {/* Action items */}
      {actionItems.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
            Action Items
          </h3>
          <div className="space-y-2">
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/50">
                <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${
                  item.priority === "high"
                    ? "border-red-400 dark:border-red-500"
                    : item.priority === "medium"
                    ? "border-amber-400 dark:border-amber-500"
                    : "border-gray-300 dark:border-neutral-600"
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800 dark:text-neutral-200">{item.title}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-gray-400 dark:text-neutral-500">{item.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Progress
        </h3>
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                m.done
                  ? "bg-emerald-100 dark:bg-emerald-500/20"
                  : m.current
                  ? "border-2 border-indigo-400 dark:border-indigo-500"
                  : "border-2 border-gray-200 dark:border-neutral-700"
              )}>
                {m.done && <IconCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-sm font-medium",
                  m.done ? "text-gray-400 line-through dark:text-neutral-500" : "text-gray-800 dark:text-neutral-200"
                )}>
                  {m.title}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-400 dark:text-neutral-500">{m.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Documents panel (placeholder) ────────────────────── */

function DocumentsPanel({ app }: { app: GrantApplication }) {
  const uploadedDocs: UploadedFile[] = loadApplicationDocuments(app.id);

  const requiredDocs = app.status === "approved"
    ? [
        { label: "IRS Determination Letter (501(c)(3))", category: "irs_letter" },
        { label: "Most recent audited financials", category: "990" },
        { label: "Board of Directors list", category: "other" },
        { label: "Organizational budget", category: "budget" },
      ]
    : [];

  const handleDownload = (doc: UploadedFile) => {
    const a = document.createElement("a");
    a.href = doc.data;
    a.download = doc.name;
    a.click();
  };

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        Documents
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-neutral-500">
        Assessment documents and uploaded files.
      </p>

      {/* Intake form (always present) */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Submitted
        </h3>
        <div className="flex items-center gap-3 rounded-lg py-2">
          <IconFileText className="h-4 w-4 text-emerald-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800 dark:text-neutral-200">Grant Readiness Assessment</div>
            <div className="text-xs text-gray-400 dark:text-neutral-500">
              {new Date(app.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            Submitted
          </span>
        </div>
      </div>

      {/* Uploaded documents */}
      {uploadedDocs.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
            Uploaded Documents
          </h3>
          <div className="space-y-2">
            {uploadedDocs.map((doc) => {
              const cat = DOCUMENT_CATEGORIES.find((c) => c.value === doc.category);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/50"
                >
                  <IconFileText className="h-4 w-4 shrink-0 text-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-800 dark:text-neutral-200">
                      {doc.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>·</span>
                      <span>{cat?.label || doc.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="shrink-0 rounded px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                  >
                    Download
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Required documents */}
      {requiredDocs.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
            Required for Assessment
          </h3>
          <div className="space-y-2">
            {requiredDocs.map((doc, i) => {
              const uploaded = uploadedDocs.some((u) => u.category === doc.category);
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg py-2">
                  {uploaded ? (
                    <IconCheck className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-neutral-600" />
                  )}
                  <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">{doc.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    uploaded
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}>
                    {uploaded ? "Uploaded" : "Needed"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : uploadedDocs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <IconFolder className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-neutral-600" />
          <p className="text-sm text-gray-400 dark:text-neutral-500">
            No additional documents required at this stage.
          </p>
        </div>
      ) : null}
    </>
  );
}

/* ── Messages panel (placeholder) ─────────────────────── */

function MessagesPanel() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        Messages
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-neutral-500">
        Communication from the Ready Set Grants team.
      </p>

      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-10 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
        <IconMessageCircle className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-neutral-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">
          No messages yet
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
          You will be notified by email when there are updates. In-app messaging is coming soon.
        </p>
      </div>
    </>
  );
}

function getReviewLabel(rs?: ReviewStatus) {
  if (!rs || rs === "draft") return null;
  switch (rs) {
    case "in_review":
      return { text: "Needs Your Review", classes: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400", icon: null };
    case "changes_requested":
      return { text: "Changes Sent", classes: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400", icon: null };
    case "approved":
      return { text: "Approved", classes: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", icon: <IconCheck className="h-3 w-3" /> };
    case "submitted":
      return { text: "Submitted", classes: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", icon: <IconSend className="h-3 w-3" /> };
    default:
      return null;
  }
}

/* ── Applicant Review Modal — approve or request changes ── */

function ApplicantReviewModal({
  grant,
  ein,
  onClose,
  onRefresh,
}: {
  grant: PitchedGrant;
  ein: number;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [comments, setComments] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<"review" | "commenting">("review");

  const questions = GRANT_DATABASE.find((db) => db.funder === grant.funderName)?.applicationQuestions ?? [];
  const answers = grant.answers ?? {};

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const hasComments = Object.values(comments).some((c) => c.trim().length > 0);

  const handleApprove = () => {
    updatePitchedGrantReviewStatus(ein, grant.id, "approved");
    onRefresh();
  };

  const handleRequestChanges = () => {
    if (mode === "review") {
      setMode("commenting");
      return;
    }
    // Save comments and update status
    updatePitchedGrantReviewComments(ein, grant.id, comments);
    updatePitchedGrantReviewStatus(ein, grant.id, "changes_requested");
    onRefresh();
  };

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
              Review Draft Answers
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-neutral-500">
              {grant.funderName} · {grant.grantName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {mode === "commenting" && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-500/20 dark:bg-orange-500/5">
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
              Add comments on the answers you want changed, then submit.
            </span>
          </div>
        )}

        {/* Questions and answers */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
              <div className="mb-2 flex items-start gap-2 text-xs font-medium text-gray-700 dark:text-neutral-300">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {i + 1}
                </span>
                {q}
              </div>
              <div className="rounded-md bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-700 dark:bg-neutral-900 dark:text-neutral-300">
                {(answers[i] ?? "").trim() || (
                  <span className="italic text-gray-300 dark:text-neutral-600">No answer yet</span>
                )}
              </div>
              {/* Comment input — visible in commenting mode */}
              {mode === "commenting" && (
                <div className="mt-2">
                  <textarea
                    value={comments[i] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [i]: e.target.value }))}
                    placeholder="Add a comment on this answer (optional)…"
                    rows={2}
                    className="w-full rounded-lg border border-orange-200 bg-orange-50/30 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-orange-500/20 dark:bg-orange-500/5 dark:text-neutral-300 dark:placeholder-neutral-500 dark:focus:border-orange-500/40 dark:focus:ring-orange-500/10"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="mr-auto rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={handleRequestChanges}
            disabled={mode === "commenting" && !hasComments}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "commenting" && !hasComments
                ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-600"
                : "border border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/10"
            }`}
          >
            <IconMessageDots className="h-3 w-3" />
            {mode === "commenting" ? "Submit Changes" : "Request Changes"}
          </button>
          {mode === "review" && (
            <button
              onClick={handleApprove}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <IconCheck className="h-3 w-3" /> Approve
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Help panel ───────────────────────────────────────── */

function HelpPanel() {
  const faqs = [
    {
      q: "How long does the review process take?",
      a: "Most applications are reviewed within 3-5 business days. More complex applications may take 1-2 weeks.",
    },
    {
      q: "What happens after I'm accepted?",
      a: "You'll receive a welcome email with next steps. A grant consultant will be assigned to your organization and will schedule an initial assessment call.",
    },
    {
      q: "Can I update my application?",
      a: "Contact our team at support@readysetgrants.org to request changes to your submitted application.",
    },
    {
      q: "What documents will I need?",
      a: "Accepted organizations typically need their IRS determination letter, recent financials, board list, and organizational budget.",
    },
  ];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        Help
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-neutral-500">
        Frequently asked questions and support.
      </p>

      <div className="mb-6 space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
              {faq.q}
            </div>
            <div className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">
              {faq.a}
            </div>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Contact Support
        </h3>
        <p className="text-sm text-gray-600 dark:text-neutral-400">
          Need help with something else? Reach out to our team.
        </p>
        <a
          href="mailto:support@readysetgrants.org"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <IconMail className="h-4 w-4" />
          Email Support
        </a>
      </div>
    </>
  );
}
