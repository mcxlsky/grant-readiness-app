"use client";

import { useState, useEffect } from "react";
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
} from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loadApplications } from "@/lib/applications";
import { loadPortfolio } from "@/lib/portfolio";
import type { GrantApplication, AppStatus, PortfolioOrg } from "@/lib/types";
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

/* ── Upcoming milestones by status ─────────────────────── */

interface Milestone {
  title: string;
  description: string;
  done: boolean;
  current?: boolean;
}

function getMilestones(status: AppStatus): Milestone[] {
  switch (status) {
    case "new":
      return [
        { title: "Application review", description: "Your consultant will review your intake form.", current: true, done: false },
        { title: "Kickoff call", description: "Meet your consultant and discuss your goals.", done: false },
        { title: "Readiness assessment", description: "Identify what your organization needs to be grant-ready.", done: false },
      ];
    case "reviewing":
      return [
        { title: "Application review", description: "Your consultant is reviewing your intake form.", current: true, done: false },
        { title: "Kickoff call", description: "Meet your consultant and discuss your goals.", done: false },
        { title: "Readiness assessment", description: "Identify what your organization needs to be grant-ready.", done: false },
      ];
    case "info_needed":
      return [
        { title: "Provide additional info", description: "Your consultant needs more details before proceeding.", current: true, done: false },
        { title: "Kickoff call", description: "Meet your consultant and discuss your goals.", done: false },
        { title: "Readiness assessment", description: "Identify what your organization needs to be grant-ready.", done: false },
      ];
    case "approved":
      return [
        { title: "Kickoff call", description: "Meet your consultant and map out your readiness plan.", current: true, done: false },
        { title: "Readiness assessment", description: "Review your organization's capacity, financials, and compliance.", done: false },
        { title: "Capacity building", description: "Address gaps before pursuing grant opportunities.", done: false },
      ];
    case "declined":
      return [
        { title: "Review feedback", description: "Check your email for details about the decision.", current: true, done: false },
      ];
    default:
      return [];
  }
}

/* ── Sidebar nav items ────────────────────────────────── */

type PortalView = "overview" | "documents" | "messages" | "help";

const NAV_ITEMS: { id: PortalView; label: string; icon: typeof IconLayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: IconLayoutDashboard },
  { id: "documents", label: "Documents", icon: IconFolder },
  { id: "messages", label: "Messages", icon: IconMessageCircle },
  { id: "help", label: "Help", icon: IconHelpCircle },
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
  const [app, setApp] = useState<GrantApplication | null>(null);
  const [org, setOrg] = useState<PortfolioOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [view, setView] = useState<PortalView>("overview");

  // Fallback lookup state
  const [email, setEmail] = useState("");
  const [showLookup, setShowLookup] = useState(false);

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
        setApp(found);
        setOrg(resolveOrg(found));
      } else {
        setNotFound(true);
      }
    } else if (emailParam) {
      const found = apps.find(
        (a) => a.contactEmail.toLowerCase() === emailParam.toLowerCase()
      );
      if (found) {
        setApp(found);
        setOrg(resolveOrg(found));
      } else {
        setNotFound(true);
      }
    } else {
      setShowLookup(true);
    }
    setLoading(false);
  }, [searchParams]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const apps = loadApplications();
    const found = apps.find(
      (a) => a.contactEmail.toLowerCase() === email.trim().toLowerCase()
    );
    if (found) {
      setApp(found);
      setShowLookup(false);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
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
                  href="/apply"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  <IconFileText className="h-4 w-4" />
                  Submit an Application
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
                  <Link href="/apply" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    Apply now
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <IconUser className="h-4 w-4" />
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
        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <div className="mx-auto w-full max-w-[720px] flex-1 px-6 pt-8 pb-8 md:px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {view === "overview" && <OverviewPanel app={app} org={org} onNavigate={setView} />}
                {view === "documents" && <DocumentsPanel app={app} />}
                {view === "messages" && <MessagesPanel />}
                {view === "help" && <HelpPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="flex shrink-0 items-center justify-around border-t border-gray-200 bg-white py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 ${
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-400 dark:text-neutral-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Overview panel ───────────────────────────────────── */

function OverviewPanel({ app, org }: { app: GrantApplication; org: PortfolioOrg | null; onNavigate: (v: PortalView) => void }) {
  const milestones = getMilestones(app.status);

  // Derive action items from failing readiness checks
  const actionItems: { title: string; category: string; priority: "high" | "medium" | "low" }[] = [];

  if (org?.analysisData) {
    const { readiness, actionItems: consultantItems } = org.analysisData;

    // Add consultant-defined action items (from the analysis)
    for (const item of consultantItems) {
      actionItems.push({
        title: item.action,
        category: item.category,
        priority: item.priority,
      });
    }

    // If no consultant items, derive from failing readiness checks
    if (actionItems.length === 0) {
      const sections = [
        { name: "Financial", data: readiness.financial },
        { name: "Compliance", data: readiness.compliance },
        { name: "Digital Presence", data: readiness.digital },
      ];
      for (const section of sections) {
        for (const [label, pass] of section.data.checks) {
          if (!pass) {
            actionItems.push({
              title: label,
              category: section.name,
              priority: "medium",
            });
          }
        }
      }
    }
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        Welcome back, {app.contactName.split(" ")[0]}
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-neutral-500">
        Here&apos;s where things stand with {app.orgName}.
      </p>

      {/* Action items — lead with these when they exist */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Action Items
        </h3>
        {actionItems.length > 0 ? (
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
        ) : (
          <div className="flex flex-col items-center py-3 text-center">
            <IconListCheck className="mb-2 h-5 w-5 text-gray-200 dark:text-neutral-700" />
            <p className="text-sm text-gray-400 dark:text-neutral-500">
              No action items yet
            </p>
            <p className="mt-0.5 text-xs text-gray-300 dark:text-neutral-600">
              Your consultant will assign tasks here as you work through the program.
            </p>
          </div>
        )}
      </div>

      {/* What's next — upcoming milestones */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          What&apos;s Next
        </h3>
        <div className="space-y-0">
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    m.done
                      ? "border-emerald-500 bg-emerald-500"
                      : m.current
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
                  }`}
                >
                  {m.done ? (
                    <IconCheck className="h-3.5 w-3.5 text-white" />
                  ) : m.current ? (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-neutral-700" />
                  )}
                </div>
                {i < milestones.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 ${
                      m.done
                        ? "bg-emerald-500"
                        : "bg-gray-200 dark:bg-neutral-700"
                    }`}
                    style={{ minHeight: 32 }}
                  />
                )}
              </div>
              <div className="pb-6">
                <div
                  className={`text-sm font-medium ${
                    m.done || m.current
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-neutral-600"
                  }`}
                >
                  {m.title}
                </div>
                <div
                  className={`mt-0.5 text-xs ${
                    m.done || m.current
                      ? "text-gray-500 dark:text-neutral-400"
                      : "text-gray-300 dark:text-neutral-700"
                  }`}
                >
                  {m.description}
                </div>
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
  const documents = [
    { name: "Program Intake Form", status: "submitted", date: app.submittedAt },
  ];

  const requiredDocs = app.status === "approved"
    ? [
        "IRS Determination Letter (501(c)(3))",
        "Most recent audited financials",
        "Board of Directors list",
        "Organizational budget",
      ]
    : [];

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
        Documents
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-neutral-500">
        Application documents and required uploads.
      </p>

      {/* Submitted documents */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
          Submitted
        </h3>
        {documents.map((doc, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg py-2"
          >
            <IconFileText className="h-4 w-4 text-emerald-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800 dark:text-neutral-200">{doc.name}</div>
              <div className="text-xs text-gray-400 dark:text-neutral-500">
                {new Date(doc.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              Submitted
            </span>
          </div>
        ))}
      </div>

      {/* Required documents */}
      {requiredDocs.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
            Required for Assessment
          </h3>
          <div className="space-y-2">
            {requiredDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg py-2">
                <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-neutral-600" />
                <span className="flex-1 text-sm text-gray-700 dark:text-neutral-300">{doc}</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  Needed
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400 dark:text-neutral-500">
            Document upload will be available soon. Your consultant will request these during your kickoff call.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <IconFolder className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-neutral-600" />
          <p className="text-sm text-gray-400 dark:text-neutral-500">
            No additional documents required at this stage.
          </p>
        </div>
      )}
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
