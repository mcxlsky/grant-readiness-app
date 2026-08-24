"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconMail,
  IconPhone,
  IconExternalLink,
  IconArrowLeft,
  IconTrash,
  IconCopy,
  IconCircleDot,
  IconCheck,
  IconFileText,
} from "@tabler/icons-react";

import {
  updateApplicationStatus,
  updateApplicationNotes,
  deleteApplication,
  markApplicationViewed,
  loadApplicationDocuments,
} from "@/lib/applications";
import { APP_STATUSES } from "@/lib/types";
import { formatFileSize, DOCUMENT_CATEGORIES } from "@/lib/file-utils";
import type { GrantApplication, AppStatus } from "@/lib/types";

interface ApplicationsViewProps {
  applications: GrantApplication[];
  onRefresh: () => void;
  onAcceptOrg?: (app: GrantApplication) => void;
}

function statusStyle(status: AppStatus) {
  const s = APP_STATUSES.find((a) => a.key === status);
  return s || APP_STATUSES[0];
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function ApplicationsView({ applications, onRefresh, onAcceptOrg }: ApplicationsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? applications.find((a) => a.id === selectedId) || null : null;

  const newCount = applications.filter((a) => a.status === "new").length;

  const handleOpen = (app: GrantApplication) => {
    if (app.status === "new") {
      updateApplicationStatus(app.id, "reviewing");
    }
    markApplicationViewed(app.id);
    onRefresh();
    setSelectedId(app.id);
  };

  if (selected) {
    return (
      <ApplicationDetail
        app={selected}
        onBack={() => setSelectedId(null)}
        onRefresh={onRefresh}
        onAcceptOrg={onAcceptOrg}
      />
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Applications
          </h1>
          {newCount > 0 && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {newCount} new
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
          Grant applications submitted by organizations. Review and manage them here.
        </p>
      </div>

      {/* Application list */}
      {applications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <IconCircleDot className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-neutral-600" />
          <p className="text-sm text-gray-500 dark:text-neutral-500">
            No applications yet. Share the application link with organizations.
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-neutral-600">
            Assessment form: <span className="font-mono text-indigo-600 dark:text-indigo-400">/get-started</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => {
            const st = statusStyle(app.status);
            return (
              <motion.div
                key={app.id}
                layout
                onClick={() => handleOpen(app)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {app.orgName}
                      {app.status === "new" && (
                        <span className="shrink-0 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          New
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-gray-400 dark:text-neutral-500">
                      {relativeTime(app.submittedAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400 dark:text-neutral-500">
                    {app.amountRequested && <span>{app.amountRequested}</span>}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
                    {app.projectTitle}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Link to share */}
      {applications.length > 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
          <p className="text-xs text-gray-500 dark:text-neutral-500">
            Share the application form with applicants:{" "}
            <CopyableLink />
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ── Copyable link helper ────────────────────────────── */
function CopyableLink() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const url = `${window.location.origin}/get-started`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 font-mono text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
    >
      /get-started
      {copied ? (
        <IconCheck className="h-3 w-3 text-emerald-500" />
      ) : (
        <IconCopy className="h-3 w-3" />
      )}
    </button>
  );
}

/* ── Application detail view ─────────────────────────── */
interface DetailProps {
  app: GrantApplication;
  onBack: () => void;
  onRefresh: () => void;
  onAcceptOrg?: (app: GrantApplication) => void;
}

function generateAcceptEmail(app: GrantApplication): string {
  const confirmLink = `${typeof window !== "undefined" ? window.location.origin : ""}/portal?ref=${app.id}`;

  return `Hi ${app.contactName.split(" ")[0]},

Thank you for submitting your application for ${app.orgName}. We're pleased to let you know that your organization has been accepted into our grant readiness program.

To get started, please confirm your participation and complete your onboarding profile by clicking the link below:

${confirmLink}

This link will walk you through a few quick steps so we can begin assessing your grant readiness and matching you with relevant opportunities.

If you have any questions in the meantime, feel free to reply to this email.

Best regards,
Ready Set Grants Team`;
}

function ApplicationDetail({ app, onBack, onRefresh, onAcceptOrg }: DetailProps) {
  const [notes, setNotes] = useState(app.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailBody, setEmailBody] = useState("");

  const handleStatusChange = (status: AppStatus) => {
    updateApplicationStatus(app.id, status);
    onRefresh();
  };

  const handleAcceptClick = () => {
    setEmailBody(generateAcceptEmail(app));
    setShowEmailPreview(true);
  };

  const handleSendAndAccept = () => {
    // In production this would actually send the email.
    // onAcceptOrg handles status update + adding to portfolio + navigating to orgs.
    onAcceptOrg?.(app);
  };

  const handleSaveNotes = () => {
    updateApplicationNotes(app.id, notes);
    onRefresh();
  };

  const handleDelete = () => {
    deleteApplication(app.id);
    onRefresh();
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back + header */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300"
      >
        <IconArrowLeft className="h-4 w-4" />
        All Applications
      </button>

      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {app.orgName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            Submitted {new Date(app.submittedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!showEmailPreview && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(app.status === "reviewing" || app.status === "new") && (
            <>
              <button
                onClick={handleAcceptClick}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                <IconCheck className="h-3.5 w-3.5" />
                Accept
              </button>
              <button
                onClick={() => handleStatusChange("info_needed")}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <IconMail className="h-3.5 w-3.5" />
                Request Info
              </button>
              <button
                onClick={() => handleStatusChange("declined")}
                className="rounded-lg px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
              >
                Decline
              </button>
            </>
          )}
          {app.status === "info_needed" && (
            <>
              <button
                onClick={() => handleStatusChange("reviewing")}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Back to Review
              </button>
              <button
                onClick={handleAcceptClick}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                <IconCheck className="h-3.5 w-3.5" />
                Accept
              </button>
              <button
                onClick={() => handleStatusChange("declined")}
                className="rounded-lg px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
              >
                Decline
              </button>
            </>
          )}
          {app.status === "declined" && (
            <button
              onClick={() => handleStatusChange("reviewing")}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Reopen
            </button>
          )}
          {app.status === "approved" && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Accepted and added to your organizations
            </span>
          )}
        </div>
      )}

      {/* Email preview */}
      {showEmailPreview && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-neutral-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
              Email Preview
            </div>
          </div>
          <div className="space-y-2 px-5 py-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-500 dark:text-neutral-500">To:</span>
              <span className="text-gray-800 dark:text-neutral-200">
                {app.contactName} &lt;{app.contactEmail}&gt;
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-500 dark:text-neutral-500">Subject:</span>
              <span className="text-gray-800 dark:text-neutral-200">
                Welcome to Ready Set Grants - {app.orgName}
              </span>
            </div>
          </div>
          <div className="border-t border-gray-100 px-5 py-4 dark:border-neutral-800">
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-neutral-800">
            <button
              onClick={() => setShowEmailPreview(false)}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSendAndAccept}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <IconMail className="h-3.5 w-3.5" />
              Send & Add to Orgs
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Services requested */}
        {app.supportTypes && app.supportTypes.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
              Services Requested
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {app.supportTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
            Primary Contact
          </h2>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {app.contactName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {app.contactName}
              </div>
              {app.contactTitle && (
                <div className="text-xs text-gray-500 dark:text-neutral-500">
                  {app.contactTitle}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <a
                  href={`mailto:${app.contactEmail}`}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  <IconMail className="h-3 w-3" />
                  {app.contactEmail}
                </a>
                {app.contactPhone && (
                  <a
                    href={`tel:${app.contactPhone}`}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    <IconPhone className="h-3 w-3" />
                    {app.contactPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Organization info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
            Organization
          </h2>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            {app.ein && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">EIN</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.ein}</dd>
              </div>
            )}
            {app.annualBudget && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Annual Budget</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.annualBudget}</dd>
              </div>
            )}
            {app.website && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Website</dt>
                <dd>
                  <a
                    href={app.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    {app.website.replace(/^https?:\/\//, "")}
                    <IconExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}
            {app.programAreas && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Program Areas</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.programAreas}</dd>
              </div>
            )}
            {app.nonprofitStatus && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">501(c)(3) Status</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.nonprofitStatus}</dd>
              </div>
            )}
            {app.yearFounded && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Year Founded</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.yearFounded}</dd>
              </div>
            )}
            {app.numberServed && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Number Served</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.numberServed}</dd>
              </div>
            )}
            {app.geographicArea && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Geographic Area</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.geographicArea}</dd>
              </div>
            )}
          </dl>
          {app.missionStatement && (
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-neutral-800">
              <dt className="mb-1 text-xs text-gray-400 dark:text-neutral-600">Mission Statement</dt>
              <dd className="text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
                {app.missionStatement}
              </dd>
            </div>
          )}
        </div>

        {/* Project details */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
            Project: {app.projectTitle}
          </h2>
          <dl className="mb-4 grid gap-3 text-sm md:grid-cols-3">
            {app.amountRequested && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Amount Requested</dt>
                <dd className="text-lg font-bold text-gray-900 dark:text-white">{app.amountRequested}</dd>
              </div>
            )}
            {app.projectTimeline && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Timeline</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.projectTimeline}</dd>
              </div>
            )}
            {app.targetPopulation && (
              <div>
                <dt className="text-xs text-gray-400 dark:text-neutral-600">Target Population</dt>
                <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.targetPopulation}</dd>
              </div>
            )}
          </dl>
          <div className="border-t border-gray-100 pt-4 dark:border-neutral-800">
            <dt className="mb-1 text-xs text-gray-400 dark:text-neutral-600">Description</dt>
            <dd className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
              {app.projectDescription}
            </dd>
          </div>
          {app.expectedOutcomes && (
            <div className="border-t border-gray-100 pt-4 dark:border-neutral-800">
              <dt className="mb-1 text-xs text-gray-400 dark:text-neutral-600">Expected Outcomes</dt>
              <dd className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
                {app.expectedOutcomes}
              </dd>
            </div>
          )}
        </div>

        {/* Specific grant */}
        {(app.grantFunderName || app.grantName) && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
              Specific Grant
            </h2>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              {app.grantFunderName && (
                <div>
                  <dt className="text-xs text-gray-400 dark:text-neutral-600">Funder</dt>
                  <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.grantFunderName}</dd>
                </div>
              )}
              {app.grantName && (
                <div>
                  <dt className="text-xs text-gray-400 dark:text-neutral-600">Grant Name</dt>
                  <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.grantName}</dd>
                </div>
              )}
              {app.grantDeadline && (
                <div>
                  <dt className="text-xs text-gray-400 dark:text-neutral-600">Deadline</dt>
                  <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.grantDeadline}</dd>
                </div>
              )}
              {app.grantFundingAmount && (
                <div>
                  <dt className="text-xs text-gray-400 dark:text-neutral-600">Funding Amount</dt>
                  <dd className="font-medium text-gray-800 dark:text-neutral-200">{app.grantFundingAmount}</dd>
                </div>
              )}
              {app.grantUrl && (
                <div className="md:col-span-2">
                  <dt className="text-xs text-gray-400 dark:text-neutral-600">Grant URL</dt>
                  <dd>
                    <a
                      href={app.grantUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                      {app.grantUrl.replace(/^https?:\/\//, "")}
                      <IconExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Uploaded documents */}
        <DocumentsCard appId={app.id} />

        {/* Consultant notes */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
            Consultant Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes about this application..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
          />
          {notes !== app.notes && (
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSaveNotes}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Save Notes
              </button>
            </div>
          )}
        </div>

        {/* Referral + meta */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/50">
          <span className="text-xs text-gray-400 dark:text-neutral-600">
            Referral: {app.referralSource || "Not specified"}
          </span>
          <AnimatePresence>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-500 dark:text-neutral-600"
              >
                <IconTrash className="h-3 w-3" />
                Delete
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-red-500">Confirm?</span>
                <button
                  onClick={handleDelete}
                  className="rounded bg-red-500 px-2 py-0.5 text-[11px] font-medium text-white"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[11px] text-gray-500 dark:text-neutral-500"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Documents card (admin detail) ─────────────────────── */

function DocumentsCard({ appId }: { appId: string }) {
  const docs = loadApplicationDocuments(appId);
  if (docs.length === 0) return null;

  const handleDownload = (doc: { data: string; name: string }) => {
    const a = document.createElement("a");
    a.href = doc.data;
    a.download = doc.name;
    a.click();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
        Documents ({docs.length})
      </h2>
      <div className="space-y-2">
        {docs.map((doc) => {
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
  );
}
