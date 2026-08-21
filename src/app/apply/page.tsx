"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { IconSend, IconCheck, IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { submitApplication } from "@/lib/applications";
import Link from "next/link";

const BUDGET_RANGES = [
  "Under $100,000",
  "$100,000 – $500,000",
  "$500,000 – $1,000,000",
  "$1,000,000 – $5,000,000",
  "Over $5,000,000",
];

const REFERRAL_OPTIONS = [
  "Web search",
  "Referral from another organization",
  "Conference or event",
  "Social media",
  "Newsletter / email",
  "Other",
];

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function Field({ label, required, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">{hint}</span>
      )}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500";

const selectCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white";

const textareaCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500 resize-y";

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    orgName: "",
    ein: "",
    website: "",
    missionStatement: "",
    annualBudget: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactTitle: "",
    projectTitle: "",
    projectDescription: "",
    amountRequested: "",
    projectTimeline: "",
    targetPopulation: "",
    programAreas: "",
    referralSource: "",
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate brief delay for UX feel
    await new Promise((r) => setTimeout(r, 600));

    submitApplication(form);
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10"
          >
            <IconCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Application Submitted
          </h1>
          <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-neutral-400">
            Thank you for submitting your grant application. Our team will review
            your submission and reach out to{" "}
            <span className="font-medium text-gray-700 dark:text-neutral-300">
              {form.contactEmail}
            </span>{" "}
            with next steps.
          </p>
          <Link
            href={`/portal?email=${encodeURIComponent(form.contactEmail)}`}
            className="mt-8 flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <IconExternalLink className="h-4 w-4" />
            Track Your Application
          </Link>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                orgName: "",
                ein: "",
                website: "",
                missionStatement: "",
                annualBudget: "",
                contactName: "",
                contactEmail: "",
                contactPhone: "",
                contactTitle: "",
                projectTitle: "",
                projectDescription: "",
                amountRequested: "",
                projectTimeline: "",
                targetPopulation: "",
                programAreas: "",
                referralSource: "",
              });
            }}
            className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <IconArrowLeft className="h-4 w-4" />
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-10"
        >
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Back</span>
          </Link>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-indigo-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Ready Set Grants
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Grant Application
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">
            Complete this form to apply for grant funding support. All fields
            marked with <span className="text-red-500">*</span> are required.
            Your information will be reviewed by our grant consultants.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* ── Section 1: Organization ─────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
          >
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
              Organization Information
            </h2>
            <p className="mb-5 text-xs text-gray-400 dark:text-neutral-600">
              Tell us about your nonprofit organization.
            </p>
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <Field label="Organization Name" required>
                <input
                  type="text"
                  value={form.orgName}
                  onChange={set("orgName")}
                  placeholder="e.g. Teach For America"
                  required
                  className={inputCls}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="EIN (Tax ID)" hint="9-digit IRS Employer Identification Number">
                  <input
                    type="text"
                    value={form.ein}
                    onChange={set("ein")}
                    placeholder="XX-XXXXXXX"
                    className={inputCls}
                  />
                </Field>
                <Field label="Website">
                  <input
                    type="url"
                    value={form.website}
                    onChange={set("website")}
                    placeholder="https://example.org"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Mission Statement" required>
                <textarea
                  value={form.missionStatement}
                  onChange={set("missionStatement")}
                  placeholder="Briefly describe your organization's mission and purpose..."
                  rows={3}
                  required
                  className={textareaCls}
                />
              </Field>

              <Field label="Annual Operating Budget" required>
                <select
                  value={form.annualBudget}
                  onChange={set("annualBudget")}
                  required
                  className={selectCls}
                >
                  <option value="">Select budget range</option>
                  {BUDGET_RANGES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Program Areas" hint="e.g. Education, Health, Environment">
                <input
                  type="text"
                  value={form.programAreas}
                  onChange={set("programAreas")}
                  placeholder="Comma-separated program areas"
                  className={inputCls}
                />
              </Field>
            </div>
          </motion.section>

          {/* ── Section 2: Contact ──────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
              Primary Contact
            </h2>
            <p className="mb-5 text-xs text-gray-400 dark:text-neutral-600">
              Who should we reach out to about this application?
            </p>
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full Name" required>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={set("contactName")}
                    placeholder="Jane Doe"
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Title / Role">
                  <input
                    type="text"
                    value={form.contactTitle}
                    onChange={set("contactTitle")}
                    placeholder="Executive Director"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email" required>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={set("contactEmail")}
                    placeholder="jane@example.org"
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={set("contactPhone")}
                    placeholder="(555) 123-4567"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          </motion.section>

          {/* ── Section 3: Project ──────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
              Project Details
            </h2>
            <p className="mb-5 text-xs text-gray-400 dark:text-neutral-600">
              Tell us about the project or program you&apos;re seeking funding for.
            </p>
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <Field label="Project Title" required>
                <input
                  type="text"
                  value={form.projectTitle}
                  onChange={set("projectTitle")}
                  placeholder="e.g. Youth STEM After-School Program"
                  required
                  className={inputCls}
                />
              </Field>

              <Field label="Project Description" required>
                <textarea
                  value={form.projectDescription}
                  onChange={set("projectDescription")}
                  placeholder="Describe the project goals, activities, and expected outcomes..."
                  rows={5}
                  required
                  className={textareaCls}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Amount Requested" required>
                  <input
                    type="text"
                    value={form.amountRequested}
                    onChange={set("amountRequested")}
                    placeholder="$50,000"
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Project Timeline">
                  <input
                    type="text"
                    value={form.projectTimeline}
                    onChange={set("projectTimeline")}
                    placeholder="e.g. 12 months starting Jan 2027"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Target Population" hint="Who will this project serve?">
                <input
                  type="text"
                  value={form.targetPopulation}
                  onChange={set("targetPopulation")}
                  placeholder="e.g. Low-income youth ages 12-18 in rural communities"
                  className={inputCls}
                />
              </Field>
            </div>
          </motion.section>

          {/* ── Section 4: Referral ─────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <Field label="How did you hear about us?">
                <select
                  value={form.referralSource}
                  onChange={set("referralSource")}
                  className={selectCls}
                >
                  <option value="">Select one</option>
                  {REFERRAL_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </motion.section>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <IconSend className="h-4 w-4" />
              )}
              Submit Application
            </button>
          </div>
        </form>

        <footer className="mt-12 border-t border-gray-200 pt-6 text-xs leading-relaxed text-gray-400 dark:border-neutral-800 dark:text-neutral-600">
          Your information is stored locally and will be reviewed by our grant
          consulting team. This is a working prototype — no data is sent to
          external servers beyond what&apos;s needed for IRS record lookups.
        </footer>
      </div>
    </div>
  );
}
