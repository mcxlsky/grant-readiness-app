"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconExternalLink,
  IconChevronDown,
  IconUpload,
  IconFile,
  IconX,
  IconRocket,
  IconAlertCircle,
  IconPlus,
} from "@tabler/icons-react";
import { submitApplication, saveApplicationDocuments } from "@/lib/applications";
import {
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  ACCEPTED_EXTENSIONS,
  ACCEPTED_TYPES,
  DOCUMENT_CATEGORIES,
  processFileUpload,
  formatFileSize,
  getTotalUploadSize,
} from "@/lib/file-utils";
import type { UploadedFile } from "@/lib/types";
import Link from "next/link";

/* ── Constants ─────────────────────────────────────────── */

const SUPPORT_TYPES = [
  "Grant Research",
  "Grant Eligibility Assessment",
  "Grant Writing",
  "Grant Review & Editing",
  "Funding Strategy",
  "Corporate & Foundation Funding",
  "Government Grants",
];

const NONPROFIT_STATUSES = [
  "501(c)(3) approved",
  "Application pending",
  "Not yet incorporated",
  "Fiscal sponsor",
];

const BUDGET_RANGES = [
  "Under $100,000",
  "$100,000 – $500,000",
  "$500,000 – $1,000,000",
  "$1,000,000 – $5,000,000",
  "Over $5,000,000",
];

const SERVED_UNITS = ["people", "families", "organizations", "students", "youth"];

const REFERRAL_OPTIONS = [
  "Web search",
  "Referral from another organization",
  "Conference or event",
  "Social media",
  "Newsletter / email",
  "Other",
];

const PROGRAM_AREA_SUGGESTIONS = [
  "Education",
  "Health & Wellness",
  "Environment",
  "Housing",
  "Youth Development",
  "Arts & Culture",
  "Social Services",
  "Workforce Development",
  "Community Development",
  "Food Security",
  "Mental Health",
  "Criminal Justice",
];

const GEO_SUGGESTIONS = [
  // Scopes
  "Nationwide",
  "Northeast US",
  "Southeast US",
  "Midwest US",
  "Southwest US",
  "West Coast",
  "Rural communities",
  "Urban areas",
  // States & territories
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
  "Puerto Rico",
  // Major cities
  "New York City, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL",
  "San Francisco, CA", "Charlotte, NC", "Indianapolis, IN",
  "Seattle, WA", "Denver, CO", "Washington, DC", "Nashville, TN",
  "Oklahoma City, OK", "El Paso, TX", "Boston, MA", "Portland, OR",
  "Las Vegas, NV", "Memphis, TN", "Louisville, KY", "Baltimore, MD",
  "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ", "Fresno, CA",
  "Sacramento, CA", "Mesa, AZ", "Kansas City, MO", "Atlanta, GA",
  "Omaha, NE", "Raleigh, NC", "Miami, FL", "Cleveland, OH",
  "Tampa, FL", "New Orleans, LA", "Minneapolis, MN", "Detroit, MI",
  "St. Louis, MO", "Pittsburgh, PA", "Cincinnati, OH",
];

const STEPS = [
  { key: "services", label: "Services" },
  { key: "organization", label: "Organization" },
  { key: "contact", label: "Contact" },
  { key: "project", label: "Project" },
  { key: "extras", label: "Documents" },
] as const;

/* ── Formatting helpers ────────────────────────────────── */

/** Format EIN as XX-XXXXXXX (digits only, auto-hyphen) */
function formatEIN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/** Format phone as (XXX) XXX-XXXX */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Format currency as $X,XXX */
function formatCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return `$${num.toLocaleString("en-US")}`;
}

/** Validate email loosely */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate URL loosely */
function isValidUrl(url: string): boolean {
  if (!url) return true; // optional
  try {
    const withProto = url.match(/^https?:\/\//) ? url : `https://${url}`;
    new URL(withProto);
    return true;
  } catch {
    return false;
  }
}

/** Validate year */
function isValidYear(year: string): boolean {
  if (!year) return true; // optional
  const n = parseInt(year, 10);
  return /^\d{4}$/.test(year) && n >= 1800 && n <= new Date().getFullYear();
}

/* ── Validation per step ───────────────────────────────── */

type Errors = Record<string, string>;

interface FormState {
  supportTypes: string[];
  orgName: string;
  ein: string;
  website: string;
  missionStatement: string;
  annualBudget: string;
  nonprofitStatus: string;
  yearFounded: string;
  numberServed: string;
  numberServedUnit: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactTitle: string;
  projectTitle: string;
  projectDescription: string;
  amountRequested: string;
  projectTimeline: string;
  targetPopulation: string;
  expectedOutcomes: string;
  grantFunderName: string;
  grantName: string;
  grantDeadline: string;
  grantFundingAmount: string;
  grantUrl: string;
  referralSource: string;
}

function validateStep(
  stepKey: string,
  form: FormState,
  programTags: string[],
  geoTags: string[]
): Errors {
  const errs: Errors = {};

  if (stepKey === "services") {
    if (form.supportTypes.length === 0)
      errs.supportTypes = "Select at least one service";
  }

  if (stepKey === "organization") {
    if (!form.orgName.trim()) errs.orgName = "Organization name is required";
    if (!form.nonprofitStatus) errs.nonprofitStatus = "Select your nonprofit status";
    if (!form.missionStatement.trim()) errs.missionStatement = "Mission statement is required";
    if (!form.annualBudget) errs.annualBudget = "Select a budget range";
    if (form.ein && form.ein.replace(/\D/g, "").length !== 9)
      errs.ein = "EIN must be 9 digits (XX-XXXXXXX)";
    if (form.website && !isValidUrl(form.website))
      errs.website = "Enter a valid URL";
    if (form.yearFounded && !isValidYear(form.yearFounded)) {
      const yr = parseInt(form.yearFounded, 10);
      errs.yearFounded = yr > new Date().getFullYear()
        ? "Year can't be in the future"
        : "Enter a valid 4-digit year";
    }
  }

  if (stepKey === "contact") {
    if (!form.contactName.trim()) errs.contactName = "Name is required";
    if (!form.contactEmail.trim()) errs.contactEmail = "Email is required";
    else if (!isValidEmail(form.contactEmail))
      errs.contactEmail = "Enter a valid email address";
  }

  if (stepKey === "project") {
    if (!form.projectTitle.trim()) errs.projectTitle = "Project title is required";
    if (!form.projectDescription.trim()) errs.projectDescription = "Project description is required";
    if (!form.amountRequested.trim()) errs.amountRequested = "Funding amount is required";
  }

  return errs;
}

/* ── Shared UI components ──────────────────────────────── */

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}

function Field({ label, required, children, hint, error }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <IconAlertCircle className="h-3 w-3" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500";

function inputClsErr(error?: string) {
  return `${inputCls} ${error ? "border-red-400 dark:border-red-500" : "border-gray-300 dark:border-neutral-700"}`;
}

const selectCls =
  "w-full appearance-none rounded-lg border bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:bg-neutral-800 dark:text-white";

function selectClsErr(error?: string) {
  return `${selectCls} ${error ? "border-red-400 dark:border-red-500" : "border-gray-300 dark:border-neutral-700"}`;
}

const textareaCls =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500 resize-y";

function textareaClsErr(error?: string) {
  return `${textareaCls} ${error ? "border-red-400 dark:border-red-500" : "border-gray-300 dark:border-neutral-700"}`;
}

/* ── Tag input component ───────────────────────────────── */

function TagInput({
  tags,
  onAdd,
  onRemove,
  suggestions,
  placeholder,
  label,
  hint,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  suggestions?: string[];
  placeholder?: string;
  label: string;
  hint?: string;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = suggestions?.filter(
    (s) =>
      !tags.includes(s) &&
      s.toLowerCase().includes(input.toLowerCase())
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
      }
      setInput("");
      setShowSuggestions(false);
    },
    [tags, onAdd]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">
        {label}
      </span>
      <div
        className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-2 transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag);
              }}
              className="rounded-sm p-0.5 transition-colors hover:bg-indigo-100 hover:text-indigo-900 dark:hover:bg-indigo-500/20"
            >
              <IconX className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow suggestion click
            setTimeout(() => setShowSuggestions(false), 150);
            if (input.trim()) addTag(input);
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : "Add more"}
          className="min-w-[100px] flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-neutral-500"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filtered && filtered.length > 0 && (
        <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          {filtered.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // prevent blur
              onClick={() => addTag(s)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <IconPlus className="h-3 w-3 text-gray-400 dark:text-neutral-500" />
              {s}
            </button>
          ))}
        </div>
      )}

      {hint && (
        <span className="mt-1 block text-xs text-gray-400 dark:text-neutral-500">
          {hint}
        </span>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */

export default function GetStartedPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showGrantSection, setShowGrantSection] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rfpInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    supportTypes: [],
    orgName: "",
    ein: "",
    website: "",
    missionStatement: "",
    annualBudget: "",
    nonprofitStatus: "",
    yearFounded: "",
    numberServed: "",
    numberServedUnit: "people",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactTitle: "",
    projectTitle: "",
    projectDescription: "",
    amountRequested: "",
    projectTimeline: "",
    targetPopulation: "",
    expectedOutcomes: "",
    grantFunderName: "",
    grantName: "",
    grantDeadline: "",
    grantFundingAmount: "",
    grantUrl: "",
    referralSource: "",
  });

  const [programTags, setProgramTags] = useState<string[]>([]);
  const [geoTags, setGeoTags] = useState<string[]>([]);
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [grantRfpFile, setGrantRfpFile] = useState<UploadedFile | null>(null);
  const [docCategory, setDocCategory] = useState("other");

  /* ── Setters ────────────────────────────────── */

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      let value = e.target.value;

      // Auto-format specific fields
      if (key === "ein") value = formatEIN(value);
      if (key === "contactPhone") value = formatPhone(value);
      if (key === "amountRequested" || key === "grantFundingAmount")
        value = formatCurrency(value);
      if (key === "yearFounded") {
        value = value.replace(/\D/g, "").slice(0, 4);
        if (value.length === 4) {
          const yr = parseInt(value, 10);
          if (yr > new Date().getFullYear()) {
            setForm((f) => ({ ...f, [key]: value }));
            setErrors((prev) => ({ ...prev, yearFounded: "Year can't be in the future" }));
            return;
          }
        }
      }

      setForm((f) => ({ ...f, [key]: value }));
      // Clear error on change
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
    };

  const toggleSupport = (type: string) => {
    setForm((f) => ({
      ...f,
      supportTypes: f.supportTypes.includes(type)
        ? f.supportTypes.filter((t) => t !== type)
        : [...f.supportTypes, type],
    }));
    if (errors.supportTypes) setErrors((prev) => ({ ...prev, supportTypes: "" }));
  };

  /* ── Navigation ─────────────────────────────── */

  const isLastStep = step === STEPS.length - 1;

  const goNext = () => {
    if (isLastStep) return;
    const stepErrors = validateStep(STEPS[step].key, form, programTags, geoTags);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setDirection(1);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (step === 0) return;
    setErrors({});
    setDirection(-1);
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── File handling ──────────────────────────── */

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setFileError(null);

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" is not a supported file type. Use PDF, DOC, DOCX, PNG, or JPG.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" is too large (${formatFileSize(file.size)}). Maximum is 2 MB per file.`);
        continue;
      }
      if (getTotalUploadSize(documents) + file.size > MAX_TOTAL_SIZE) {
        setFileError("Total upload size limit (10 MB) reached. Remove some files to add more.");
        break;
      }
      try {
        const uploaded = await processFileUpload(file, docCategory);
        setDocuments((prev) => [...prev, uploaded]);
      } catch {
        setFileError(`Failed to read "${file.name}". Please try again.`);
      }
    }
    e.target.value = "";
  };

  const handleRfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError(`"${file.name}" is not a supported file type.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`"${file.name}" is too large. Maximum is 2 MB.`);
      return;
    }
    try {
      const uploaded = await processFileUpload(file, "grant_guidelines");
      setGrantRfpFile(uploaded);
    } catch {
      setFileError(`Failed to read "${file.name}".`);
    }
    e.target.value = "";
  };

  const removeDocument = (id: string) =>
    setDocuments((prev) => prev.filter((d) => d.id !== id));

  /* ── Submit ─────────────────────────────────── */

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const { numberServedUnit: _unit, ...formData } = form;
    const app = submitApplication({
      ...formData,
      numberServed: form.numberServed
        ? `${form.numberServed} ${form.numberServedUnit}`
        : "",
      programAreas: programTags.join(", "),
      geographicArea: geoTags.join(", "),
      grantRfpFile: grantRfpFile || undefined,
      documents: [],
    });

    if (documents.length > 0) {
      try {
        saveApplicationDocuments(app.id, documents);
      } catch {
        /* quota exceeded */
      }
    }

    setLoading(false);
    setSubmitted(true);
  };

  /* ── Reset form ─────────────────────────────── */

  const resetForm = () => {
    setSubmitted(false);
    setStep(0);
    setDirection(1);
    setErrors({});
    setForm({
      supportTypes: [],
      orgName: "",
      ein: "",
      website: "",
      missionStatement: "",
      annualBudget: "",
      nonprofitStatus: "",
      yearFounded: "",
      numberServed: "",
      numberServedUnit: "people",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactTitle: "",
      projectTitle: "",
      projectDescription: "",
      amountRequested: "",
      projectTimeline: "",
      targetPopulation: "",
      expectedOutcomes: "",
      grantFunderName: "",
      grantName: "",
      grantDeadline: "",
      grantFundingAmount: "",
      grantUrl: "",
      referralSource: "",
    });
    setProgramTags([]);
    setGeoTags([]);
    setDocuments([]);
    setGrantRfpFile(null);
    setShowGrantSection(false);
    setFileError(null);
  };

  /* ── Success view ───────────────────────────── */

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
            You&apos;re All Set!
          </h1>
          <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-neutral-400">
            Thank you for starting your grant readiness assessment. Our team will
            review your information and reach out to{" "}
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
            Track Your Progress
          </Link>
          <button
            onClick={resetForm}
            className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <IconArrowLeft className="h-4 w-4" />
            Submit Another Assessment
          </button>
        </div>
      </div>
    );
  }

  /* ── Step content ────────────────────────────── */

  const currentStep = STEPS[step].key;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-neutral-950">
      {/* ── Top bar ─────────────────────────────── */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-5 shrink-0 rounded-tl-md rounded-tr-sm rounded-br-md rounded-bl-sm bg-indigo-500" />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                Ready Set Grants
              </span>
            </div>
          </Link>
          <span className="text-xs text-gray-400 dark:text-neutral-500">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mx-auto max-w-2xl px-6 pb-3">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800"
              >
                <motion.div
                  className="h-full rounded-full bg-indigo-500"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step content ────────────────────────── */}
      <div className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-10 md:py-14">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {currentStep === "services" && (
                <StepServices
                  supportTypes={form.supportTypes}
                  onToggle={toggleSupport}
                  error={errors.supportTypes}
                />
              )}

              {currentStep === "organization" && (
                <StepOrganization
                  form={form}
                  set={set}
                  errors={errors}
                  programTags={programTags}
                  onAddProgram={(t) => setProgramTags((p) => [...p, t])}
                  onRemoveProgram={(t) => setProgramTags((p) => p.filter((x) => x !== t))}
                  geoTags={geoTags}
                  onAddGeo={(t) => setGeoTags((p) => [...p, t])}
                  onRemoveGeo={(t) => setGeoTags((p) => p.filter((x) => x !== t))}
                />
              )}

              {currentStep === "contact" && (
                <StepContact form={form} set={set} errors={errors} />
              )}

              {currentStep === "project" && (
                <StepProject form={form} set={set} errors={errors} />
              )}

              {currentStep === "extras" && (
                <StepExtras
                  form={form}
                  set={set}
                  showGrantSection={showGrantSection}
                  setShowGrantSection={setShowGrantSection}
                  grantRfpFile={grantRfpFile}
                  setGrantRfpFile={setGrantRfpFile}
                  rfpInputRef={rfpInputRef}
                  handleRfpUpload={handleRfpUpload}
                  documents={documents}
                  docCategory={docCategory}
                  setDocCategory={setDocCategory}
                  fileInputRef={fileInputRef}
                  handleFileUpload={handleFileUpload}
                  removeDocument={removeDocument}
                  fileError={fileError}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom nav ──────────────────────────── */}
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <IconArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <IconRocket className="h-4 w-4" />
              )}
              Start Your Grant Assessment
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Continue
              <IconArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step components
   ═══════════════════════════════════════════════════════ */

/* ── Step 1: Services ──────────────────────────────────── */

function StepServices({
  supportTypes,
  onToggle,
  error,
}: {
  supportTypes: string[];
  onToggle: (type: string) => void;
  error?: string;
}) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
        What kind of support are you looking for?
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">
        Select all that apply — you can always change this later.
      </p>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <IconAlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUPPORT_TYPES.map((type) => {
          const selected = supportTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggle(type)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all ${
                selected
                  ? "border-indigo-400 bg-indigo-50 font-medium text-indigo-700 shadow-sm dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  selected
                    ? "border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-500"
                    : "border-gray-300 dark:border-neutral-600"
                }`}
              >
                {selected && <IconCheck className="h-3 w-3 text-white" />}
              </div>
              {type}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Step 2: Organization ──────────────────────────────── */

type SetFn = (
  key: keyof FormState
) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

function StepOrganization({
  form,
  set,
  errors,
  programTags,
  onAddProgram,
  onRemoveProgram,
  geoTags,
  onAddGeo,
  onRemoveGeo,
}: {
  form: FormState;
  set: SetFn;
  errors: Errors;
  programTags: string[];
  onAddProgram: (tag: string) => void;
  onRemoveProgram: (tag: string) => void;
  geoTags: string[];
  onAddGeo: (tag: string) => void;
  onRemoveGeo: (tag: string) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
        Tell us about your organization
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">
        This helps us understand your nonprofit and match you with the right opportunities.
      </p>
      <p className="mt-1.5 text-xs font-medium text-gray-400 dark:text-neutral-500">
        All fields required
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Organization Name" required error={errors.orgName}>
          <input
            type="text"
            value={form.orgName}
            onChange={set("orgName")}
            placeholder="Teach For America"
            className={inputClsErr(errors.orgName)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="501(c)(3) Status" required error={errors.nonprofitStatus}>
            <select
              value={form.nonprofitStatus}
              onChange={set("nonprofitStatus")}
              className={selectClsErr(errors.nonprofitStatus)}
            >
              <option value="">Select status</option>
              {NONPROFIT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Year Founded" error={errors.yearFounded}>
            <input
              type="text"
              inputMode="numeric"
              value={form.yearFounded}
              onChange={set("yearFounded")}
              placeholder="2026"
              className={inputClsErr(errors.yearFounded)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="EIN (Tax ID)" error={errors.ein} hint={errors.ein ? undefined : "9-digit IRS Employer Identification Number"}>
            <input
              type="text"
              inputMode="numeric"
              value={form.ein}
              onChange={set("ein")}
              placeholder="12-3456789"
              className={inputClsErr(errors.ein)}
            />
          </Field>
          <Field label="Website" error={errors.website}>
            <input
              type="url"
              value={form.website}
              onChange={set("website")}
              placeholder="yourorg.org"
              className={inputClsErr(errors.website)}
            />
          </Field>
        </div>

        <Field label="Mission Statement" required error={errors.missionStatement}>
          <textarea
            value={form.missionStatement}
            onChange={set("missionStatement")}
            placeholder="To empower underserved communities through access to quality education and workforce development programs"
            rows={3}
            className={textareaClsErr(errors.missionStatement)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Annual Operating Budget" required error={errors.annualBudget}>
            <select
              value={form.annualBudget}
              onChange={set("annualBudget")}
              className={selectClsErr(errors.annualBudget)}
            >
              <option value="">Select budget range</option>
              {BUDGET_RANGES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Number Served Annually">
            <div className="flex rounded-lg border border-gray-300 transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 dark:border-neutral-700">
              <input
                type="text"
                inputMode="numeric"
                value={form.numberServed}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  set("numberServed")({ ...e, target: { ...e.target, value: v } } as React.ChangeEvent<HTMLInputElement>);
                }}
                placeholder="500"
                className="w-24 shrink-0 rounded-l-lg rounded-r-none border-0 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
              />
              <select
                value={form.numberServedUnit}
                onChange={set("numberServedUnit")}
                className="flex-1 appearance-none rounded-l-none rounded-r-lg border-0 border-l border-gray-300 bg-gray-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat px-3 py-2.5 pr-10 text-sm text-gray-500 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
              >
                {SERVED_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>

        <TagInput
          label="Geographic Area"
          tags={geoTags}
          onAdd={onAddGeo}
          onRemove={onRemoveGeo}
          suggestions={GEO_SUGGESTIONS}
          placeholder="Greater Washington Metro Area"
          hint="Pick a scope or type a specific region"
        />

        <TagInput
          label="Program Areas"
          tags={programTags}
          onAdd={onAddProgram}
          onRemove={onRemoveProgram}
          suggestions={PROGRAM_AREA_SUGGESTIONS}
          placeholder="Education"
          hint="Type your own or pick from suggestions"
        />
      </div>
    </>
  );
}

/* ── Step 3: Contact ───────────────────────────────────── */

function StepContact({ form, set, errors }: { form: FormState; set: SetFn; errors: Errors }) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
        Who should we reach out to?
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">
        Your primary contact for this assessment.
      </p>
      <p className="mt-1.5 text-xs font-medium text-gray-400 dark:text-neutral-500">
        All fields required
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Full Name" required error={errors.contactName}>
          <input
            type="text"
            value={form.contactName}
            onChange={set("contactName")}
            placeholder="Jane Doe"
            className={inputClsErr(errors.contactName)}
          />
        </Field>
        <Field label="Title / Role">
          <input
            type="text"
            value={form.contactTitle}
            onChange={set("contactTitle")}
            placeholder="Executive Director"
            className={inputClsErr()}
          />
        </Field>
        <Field label="Email" required error={errors.contactEmail}>
          <input
            type="email"
            value={form.contactEmail}
            onChange={set("contactEmail")}
            placeholder="jane@example.org"
            className={inputClsErr(errors.contactEmail)}
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={form.contactPhone}
            onChange={set("contactPhone")}
            placeholder="(555) 123-4567"
            className={inputClsErr()}
          />
        </Field>
      </div>
    </>
  );
}

/* ── Step 4: Project ───────────────────────────────────── */

function StepProject({ form, set, errors }: { form: FormState; set: SetFn; errors: Errors }) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
        Tell us about your project
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">
        Describe the project or program you&apos;re seeking funding for.
      </p>
      <p className="mt-1.5 text-xs font-medium text-gray-400 dark:text-neutral-500">
        All fields required
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Project Title" required error={errors.projectTitle}>
          <input
            type="text"
            value={form.projectTitle}
            onChange={set("projectTitle")}
            placeholder="Youth STEM After-School Program"
            className={inputClsErr(errors.projectTitle)}
          />
        </Field>

        <Field label="Project Description" required error={errors.projectDescription}>
          <textarea
            value={form.projectDescription}
            onChange={set("projectDescription")}
            placeholder="A 12-month after-school program providing STEM education to 200 middle-school students in underserved communities"
            rows={4}
            className={textareaClsErr(errors.projectDescription)}
          />
        </Field>

        <Field label="Funding Amount Needed" required error={errors.amountRequested}>
          <input
            type="text"
            inputMode="numeric"
            value={form.amountRequested}
            onChange={set("amountRequested")}
            placeholder="$50,000"
            className={inputClsErr(errors.amountRequested)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project Start">
            <input
              type="date"
              value={form.projectTimeline.split(" to ")[0] || ""}
              onChange={(e) => {
                const end = form.projectTimeline.split(" to ")[1] || "";
                const val = end ? `${e.target.value} to ${end}` : e.target.value;
                set("projectTimeline")({ ...e, target: { ...e.target, value: val } } as React.ChangeEvent<HTMLInputElement>);
              }}
              className={inputClsErr()}
            />
          </Field>
          <Field label="Project End">
            <input
              type="date"
              value={form.projectTimeline.split(" to ")[1] || ""}
              onChange={(e) => {
                const start = form.projectTimeline.split(" to ")[0] || "";
                const val = start ? `${start} to ${e.target.value}` : e.target.value;
                set("projectTimeline")({ ...e, target: { ...e.target, value: val } } as React.ChangeEvent<HTMLInputElement>);
              }}
              className={inputClsErr()}
            />
          </Field>
        </div>

        <Field label="Target Population" hint="Who will this project serve?">
          <input
            type="text"
            value={form.targetPopulation}
            onChange={set("targetPopulation")}
            placeholder="Low-income youth ages 12–18 in rural communities"
            className={inputClsErr()}
          />
        </Field>

        <Field label="Expected Outcomes" hint="What measurable results do you expect?">
          <textarea
            value={form.expectedOutcomes}
            onChange={set("expectedOutcomes")}
            placeholder="90% of participants complete the program; 75% report improved confidence in STEM subjects"
            rows={3}
            className={textareaClsErr()}
          />
        </Field>
      </div>
    </>
  );
}

/* ── Step 5: Extras (grant, docs, referral) ────────────── */

function StepExtras({
  form,
  set,
  showGrantSection,
  setShowGrantSection,
  grantRfpFile,
  setGrantRfpFile,
  rfpInputRef,
  handleRfpUpload,
  documents,
  docCategory,
  setDocCategory,
  fileInputRef,
  handleFileUpload,
  removeDocument,
  fileError,
}: {
  form: FormState;
  set: SetFn;
  showGrantSection: boolean;
  setShowGrantSection: (v: boolean) => void;
  grantRfpFile: UploadedFile | null;
  setGrantRfpFile: (v: UploadedFile | null) => void;
  rfpInputRef: React.RefObject<HTMLInputElement | null>;
  handleRfpUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  documents: UploadedFile[];
  docCategory: string;
  setDocCategory: (v: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeDocument: (id: string) => void;
  fileError: string | null;
}) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
        Almost done — just a few more things
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-neutral-400">
        These are all optional, but help us hit the ground running.
      </p>

      <div className="mt-8 space-y-8">
        {/* Specific grant toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowGrantSection(!showGrantSection)}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-4 text-left transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/50"
          >
            <IconChevronDown
              className={`h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-neutral-500 ${
                showGrantSection ? "rotate-180" : ""
              }`}
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                Have a specific grant in mind?
              </span>
              <span className="ml-2 text-xs text-gray-400 dark:text-neutral-500">
                Optional
              </span>
            </div>
          </button>

          <AnimatePresence>
            {showGrantSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Funder Name">
                      <input type="text" value={form.grantFunderName} onChange={set("grantFunderName")} placeholder="Robert Wood Johnson Foundation" className={inputClsErr()} />
                    </Field>
                    <Field label="Grant Name">
                      <input type="text" value={form.grantName} onChange={set("grantName")} placeholder="Culture of Health Prize" className={inputClsErr()} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Deadline">
                      <input type="date" value={form.grantDeadline} onChange={set("grantDeadline")} className={inputClsErr()} />
                    </Field>
                    <Field label="Funding Amount">
                      <input type="text" value={form.grantFundingAmount} onChange={set("grantFundingAmount")} placeholder="$50,000" className={inputClsErr()} />
                    </Field>
                  </div>
                  <Field label="Grant URL">
                    <input type="url" value={form.grantUrl} onChange={set("grantUrl")} placeholder="https://rwjf.org/grants" className={inputClsErr()} />
                  </Field>
                  {/* RFP Upload */}
                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">
                      Upload RFP / Guidelines
                    </span>
                    {grantRfpFile ? (
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800">
                        <IconFile className="h-4 w-4 shrink-0 text-indigo-500" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-gray-800 dark:text-neutral-200">{grantRfpFile.name}</div>
                          <div className="text-xs text-gray-400 dark:text-neutral-500">{formatFileSize(grantRfpFile.size)}</div>
                        </div>
                        <button type="button" onClick={() => setGrantRfpFile(null)} className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-red-500 dark:text-neutral-500">
                          <IconX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => rfpInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
                      >
                        <IconUpload className="h-4 w-4" />
                        Choose file
                      </button>
                    )}
                    <input ref={rfpInputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleRfpUpload} className="hidden" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Documents */}
        <div>
          <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
            Supporting Documents
          </h2>
          <p className="mb-4 text-xs text-gray-400 dark:text-neutral-500">
            IRS letter, 990, budget, annual report, grant guidelines, or existing proposals.
          </p>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className={selectClsErr()}>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <IconUpload className="h-4 w-4" />
                Upload
              </button>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple onChange={handleFileUpload} className="hidden" />
            </div>

            {fileError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {fileError}
              </div>
            )}

            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === doc.category);
                  return (
                    <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/50">
                      <IconFile className="h-4 w-4 shrink-0 text-indigo-500" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-800 dark:text-neutral-200">{doc.name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>·</span>
                          <span>{cat?.label || doc.category}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeDocument(doc.id)} className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-red-500 dark:text-neutral-500">
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                <div className="text-xs text-gray-400 dark:text-neutral-500">
                  {documents.length} file{documents.length !== 1 ? "s" : ""} · {formatFileSize(getTotalUploadSize(documents))} total
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-5 text-center dark:border-neutral-700 dark:bg-neutral-800/30">
                <IconUpload className="mx-auto mb-1.5 h-5 w-5 text-gray-300 dark:text-neutral-600" />
                <p className="text-xs text-gray-400 dark:text-neutral-500">
                  PDF, DOC, DOCX, PNG, or JPG · 2 MB max per file
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Referral */}
        <Field label="How did you hear about us?">
          <select value={form.referralSource} onChange={set("referralSource")} className={selectClsErr()}>
            <option value="">Select one</option>
            {REFERRAL_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>
    </>
  );
}
