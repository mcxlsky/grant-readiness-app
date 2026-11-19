"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconFileUpload } from "@tabler/icons-react";
import { getConsultantSession, onConsultantSignedOut, type Consultant } from "@/lib/admin-session";
import { isAuthConfigured } from "@/lib/auth/config";
import { AVAILABILITY_LABELS, importCatalog, loadCatalog, type CatalogFunder } from "@/lib/catalog/db";
import { buildCatalog, type CatalogPreview, type ImportWarning } from "@/lib/catalog/import";
import { useTheme } from "@/lib/theme";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const primaryCls =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600";
const quietCls =
  "inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800";
const cardCls = "rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
const thCls = "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-neutral-400";
const tdCls = "px-4 py-3 align-top text-sm text-gray-700 dark:text-neutral-300";
const alertCls = "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const nextDeadline = (dates: (string | null)[]) => dates.filter((d): d is string => Boolean(d)).sort()[0] ?? null;

export default function CatalogPage() {
  useTheme();
  const router = useRouter();
  const [consultant, setConsultant] = useState<Consultant | null>(null);

  useEffect(() => {
    let active = true;
    getConsultantSession().then((current) => {
      if (!active) return;
      if (current) setConsultant(current);
      else router.replace("/admin?error=check_failed");
    });
    const unsubscribe = onConsultantSignedOut(() => window.location.assign("/admin"));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-5xl">
        <a
          href="/dashboard"
          className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white"
        >
          <IconArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to dashboard
        </a>
        {consultant ? (
          <Catalog consultant={consultant} />
        ) : (
          <p role="status" className="mt-8 text-sm text-gray-500 dark:text-neutral-400">
            Loading your catalog…
          </p>
        )}
      </div>
    </div>
  );
}

function Catalog({ consultant }: { consultant: Consultant }) {
  const [funders, setFunders] = useState<CatalogFunder[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "offline">(isAuthConfigured ? "loading" : "offline");
  const [notice, setNotice] = useState<string | null>(null);
  const isAdmin = consultant.role === "admin";

  const refresh = useCallback(async () => {
    if (!isAuthConfigured) return;
    const result = await loadCatalog(consultant.firmId);
    if (!result) return setStatus("failed");
    setFunders(result);
    setStatus("ready");
  }, [consultant.firmId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <div className="mt-6">
        <h1 className="font-display text-3xl font-medium tracking-tight text-gray-900 dark:text-white">Grant catalog</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          {consultant.firmName}
          {status === "ready" && ` · ${funders.length} ${funders.length === 1 ? "funder" : "funders"}`}
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {notice && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {notice}
          </p>
        )}

        {isAdmin && (
          <Importer
            firmId={consultant.firmId}
            onImported={async (message) => {
              setNotice(message);
              await refresh();
            }}
          />
        )}

        {status === "loading" && (
          <p role="status" className="text-sm text-gray-500 dark:text-neutral-400">
            Loading your catalog…
          </p>
        )}
        {status === "failed" && (
          <p role="alert" className={alertCls}>
            We couldn&apos;t load your catalog. Refresh the page, or try again in a few minutes.
          </p>
        )}
        {status === "offline" && (
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Dev mode: the saved catalog needs Supabase, which isn&apos;t configured on this machine. You can still preview an import.
          </p>
        )}
        {status === "ready" && <FunderList funders={funders} isAdmin={isAdmin} />}
      </div>
    </>
  );
}

function Importer({ firmId, onImported }: { firmId: string; onImported: (message: string) => Promise<void> }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CatalogPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
  };

  const handleFile = async (file: File | undefined) => {
    reset();
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      return setError("Choose a .csv file. In Excel or Google Sheets, use File → Download (or Save As) → CSV.");
    }
    if (file.size > MAX_FILE_BYTES) return setError("That file is over 5 MB. Split it into smaller files and import each one.");
    const result = buildCatalog(await file.text());
    if (result.missingColumns.length) {
      return setError(`We couldn't find a column for the funder's name. Add a column headed "Funder" or "Foundation", then try again.`);
    }
    if (!result.funders.length) return setError("That file has no funder rows.");
    setFileName(file.name);
    setPreview(result);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError(null);
    const result = await importCatalog(firmId, preview.funders);
    setImporting(false);
    if (!result.ok) {
      return setError(
        result.error === "not_admin"
          ? "Only firm admins can import funders."
          : "The import didn't save, and nothing was changed. Try again in a few minutes."
      );
    }
    reset();
    await onImported(
      `Imported ${result.fundersAdded} new and updated ${result.fundersUpdated} existing funders, with ${result.programsAdded + result.programsUpdated} programs.`
    );
  };

  const programCount = preview?.funders.reduce((sum, f) => sum + f.programs.length, 0) ?? 0;
  const withDeadline = preview?.funders.filter((f) => f.programs.some((p) => p.next_deadline)).length ?? 0;

  return (
    <section aria-labelledby="import-heading" className={`${cardCls} space-y-4 p-5`}>
      <div>
        <h2 id="import-heading" className="text-base font-semibold text-gray-900 dark:text-white">
          Import from a spreadsheet
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-neutral-300">
          Upload a CSV with a funder name column. Website, type, focus areas, service area, programs, deadlines and amounts are used when
          present. You&apos;ll see a preview before anything is saved, and importing again updates funders instead of duplicating them.
        </p>
      </div>

      {error && (
        <p role="alert" className={alertCls}>
          {error}
        </p>
      )}

      {!preview && (
        <label className={`${primaryCls} cursor-pointer focus-within:ring-2 focus-within:ring-brand-sky/40`}>
          <IconFileUpload aria-hidden="true" className="h-4 w-4" />
          Choose CSV file
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      )}

      {preview && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-neutral-300">
            <span className="font-medium text-gray-900 dark:text-white">{fileName}</span>: {preview.rowsRead} rows.
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Funders" value={preview.funders.length} />
            <Stat label="Programs" value={programCount} />
            <Stat label="Duplicate rows merged" value={preview.rowsMerged} />
            <Stat label="With a next deadline" value={withDeadline} />
          </dl>

          {preview.rowsWithEmail > 0 && (
            <p className="text-sm text-gray-600 dark:text-neutral-300">
              {preview.rowsWithEmail} rows include email addresses. Contacts and notes are only visible to your firm.
            </p>
          )}

          <Warnings warnings={preview.warnings} />

          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-neutral-800">
            <table className="w-full min-w-[640px]">
              <caption className="sr-only">Funders that will be imported</caption>
              <thead className="bg-gray-50 dark:bg-neutral-950">
                <tr>
                  <th scope="col" className={thCls}>Funder</th>
                  <th scope="col" className={thCls}>Type</th>
                  <th scope="col" className={thCls}>Availability</th>
                  <th scope="col" className={thCls}>Deadline</th>
                  <th scope="col" className={thCls}>Next (estimated)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {preview.funders.slice(0, 25).map((funder) => (
                  <tr key={funder.name_key}>
                    <td className={tdCls}>
                      <span className="font-medium text-gray-900 dark:text-white">{funder.name}</span>
                      {funder.aliases.length > 0 && (
                        <span className="block text-xs text-gray-500 dark:text-neutral-400">Merged from {funder.aliases.length} spellings</span>
                      )}
                    </td>
                    <td className={tdCls}>{funder.type}</td>
                    <td className={tdCls}>{AVAILABILITY_LABELS[funder.availability]}</td>
                    <td className={tdCls}>{funder.programs.map((p) => p.deadline).join("; ")}</td>
                    <td className={tdCls}>{formatDate(nextDeadline(funder.programs.map((p) => p.next_deadline)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.funders.length > 25 && (
            <p className="text-xs text-gray-500 dark:text-neutral-400">Showing 25 of {preview.funders.length} funders.</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleImport} disabled={importing || !isAuthConfigured} className={primaryCls}>
              {importing ? "Importing…" : `Import ${preview.funders.length} funders`}
            </button>
            <button type="button" onClick={reset} disabled={importing} className={quietCls}>
              Cancel
            </button>
            {!isAuthConfigured && (
              <span className="text-sm text-gray-500 dark:text-neutral-400">Importing needs Supabase configured.</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-neutral-950">
      <dt className="text-xs text-gray-500 dark:text-neutral-400">{label}</dt>
      <dd className="text-lg font-semibold text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

function Warnings({ warnings }: { warnings: ImportWarning[] }) {
  const duplicates = warnings.filter((w) => w.kind === "possible_duplicate");
  const other = warnings.filter((w) => w.kind !== "possible_duplicate");
  if (!warnings.length) return null;

  return (
    <div className="space-y-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      {other.map((w, i) => (
        <p key={i}>
          {w.kind === "large_amount"
            ? `${w.funder}: skipped an amount of $${w.amount.toLocaleString()}, which looks like a typo.`
            : w.kind === "skipped_row"
              ? `Row ${w.row} was skipped: ${w.reason}.`
              : null}
        </p>
      ))}
      {duplicates.length > 0 && (
        <details>
          <summary className="cursor-pointer font-medium">
            {duplicates.length} groups of names that might be the same funder
          </summary>
          <p className="mt-2">These import as separate funders. If any are the same, give them one name in your spreadsheet and import again.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {duplicates.map((w, i) => (
              <li key={i}>{w.kind === "possible_duplicate" && w.names.join(" · ")}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function FunderList({ funders, isAdmin }: { funders: CatalogFunder[]; isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return funders;
    return funders.filter((f) => {
      const text = [f.name, f.type, ...f.service_areas, ...f.programs.map((p) => p.program)].join(" ").toLowerCase();
      return terms.every((t) => text.includes(t));
    });
  }, [funders, query]);

  if (!funders.length) {
    return (
      <p className={`${cardCls} p-5 text-sm text-gray-600 dark:text-neutral-300`}>
        {isAdmin ? "No funders yet. Import a spreadsheet to start your catalog." : "No funders yet. A firm admin can import them."}
      </p>
    );
  }

  return (
    <section aria-labelledby="funders-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="funders-heading" className="text-sm font-semibold text-gray-900 dark:text-white">
          Funders
        </h2>
        <label className="w-full sm:w-72">
          <span className="sr-only">Search funders</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, area or program"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-brand-sky-deep focus:ring-1 focus:ring-brand-sky/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </label>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[720px]">
          <caption className="sr-only">Your firm&apos;s funders</caption>
          <thead className="bg-gray-50 dark:bg-neutral-950">
            <tr>
              <th scope="col" className={thCls}>Funder</th>
              <th scope="col" className={thCls}>Type</th>
              <th scope="col" className={thCls}>Service area</th>
              <th scope="col" className={thCls}>Availability</th>
              <th scope="col" className={thCls}>Programs</th>
              <th scope="col" className={thCls}>Next deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
            {shown.map((funder) => (
              <tr key={funder.id}>
                <td className={tdCls}>
                  {funder.url ? (
                    <a href={funder.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-800 hover:text-indigo-900 dark:text-indigo-400">
                      {funder.name}
                    </a>
                  ) : (
                    <span className="font-medium text-gray-900 dark:text-white">{funder.name}</span>
                  )}
                </td>
                <td className={tdCls}>{funder.type}</td>
                <td className={tdCls}>{funder.service_areas.slice(0, 3).join("; ") || "—"}</td>
                <td className={tdCls}>{AVAILABILITY_LABELS[funder.availability]}</td>
                <td className={tdCls}>{funder.programs.length}</td>
                <td className={tdCls}>{formatDate(nextDeadline(funder.programs.map((p) => p.next_deadline)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 dark:text-neutral-400">No funders match that search.</p>}
      </div>
    </section>
  );
}
