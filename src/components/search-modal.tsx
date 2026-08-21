"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconSearch, IconPlus, IconCheck, IconFilter } from "@tabler/icons-react";
import type { OrgSearchResult, PortfolioOrg } from "@/lib/types";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (org: OrgSearchResult) => void;
  portfolio: PortfolioOrg[];
}

type Mode = "form" | "search";

export function SearchModal({ open, onClose, onAdd, portfolio }: SearchModalProps) {
  const [mode, setMode] = useState<Mode>("form");

  // Form state
  const [orgName, setOrgName] = useState("");
  const [ein, setEin] = useState("");
  const [city, setCity] = useState("");
  const [formState, setFormState] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [mission, setMission] = useState("");

  // Search state
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState("");
  const [results, setResults] = useState<OrgSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const resetForm = () => {
    setOrgName("");
    setEin("");
    setCity("");
    setFormState("");
    setWebsite("");
    setContactName("");
    setContactEmail("");
    setMission("");
  };

  const resetSearch = () => {
    setQuery("");
    setSearchState("");
    setResults([]);
    setError(null);
    setSearched(false);
  };

  const handleClose = () => {
    resetForm();
    resetSearch();
    setMode("form");
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    const einNum = ein ? parseInt(ein.replace(/\D/g, ""), 10) : Date.now();
    const strein = ein || `MANUAL-${einNum}`;

    onAdd({
      ein: einNum,
      strein,
      name: orgName.trim(),
      city: city.trim(),
      state: formState,
      ntee_code: "",
    });
    handleClose();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const url = `/api/search?q=${encodeURIComponent(query.trim())}${searchState ? `&state=${encodeURIComponent(searchState.trim().toUpperCase())}` : ""}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setResults(data.organizations || []);
    } catch (err) {
      setError("Search failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const isAdded = (einNum: number) => portfolio.some((o) => o.ein === einNum);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-[10vh] backdrop-blur-sm dark:bg-black/60"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex max-h-[75vh] w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            {/* Tab header */}
            <div className="flex border-b border-gray-200 dark:border-neutral-800">
              <button
                onClick={() => setMode("form")}
                className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
                  mode === "form"
                    ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setMode("search")}
                className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
                  mode === "search"
                    ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                Search IRS Records
              </button>
            </div>

            {mode === "form" ? (
              /* ── Manual entry form ── */
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Community Builders Alliance"
                      className={inputClass}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                        EIN
                      </label>
                      <input
                        type="text"
                        value={ein}
                        onChange={(e) => setEin(e.target.value)}
                        placeholder="XX-XXXXXXX"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                        Website
                      </label>
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                        State
                      </label>
                      <select
                        value={formState}
                        onChange={(e) => setFormState(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Primary contact"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="email@org.com"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                      Mission Statement
                    </label>
                    <textarea
                      value={mission}
                      onChange={(e) => setMission(e.target.value)}
                      placeholder="Brief description of the organization's mission..."
                      rows={3}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!orgName.trim()}
                    className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Add Organization
                  </button>
                </div>
              </form>
            ) : (
              /* ── IRS Search ── */
              <>
                <div className="border-b border-gray-200 p-5 dark:border-neutral-800">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder='Search by name, e.g. "Teach For America"'
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500"
                        autoFocus
                      />
                    </div>
                    <div className="relative">
                      <IconFilter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
                      <select
                        value={searchState}
                        onChange={(e) => setSearchState(e.target.value)}
                        className="h-full w-[5.5rem] appearance-none rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-7 pr-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                      >
                        <option value="">State</option>
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {loading ? <span className="spinner" /> : "Search"}
                    </button>
                  </form>
                  <p className="mt-2 text-[11px] text-gray-400 dark:text-neutral-500">
                    Searches live IRS/ProPublica records. State filter is optional.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {!error && searched && results.length === 0 && !loading && (
                    <p className="py-4 text-center text-sm text-gray-400 dark:text-neutral-500">
                      No matches found. Try a broader search term.
                    </p>
                  )}

                  <div className="space-y-2">
                    {results.map((org) => {
                      const added = isAdded(org.ein);
                      return (
                        <div
                          key={org.ein}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {org.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-400 dark:text-neutral-500">
                              EIN {org.strein} · {org.city}, {org.state}
                              {org.ntee_code ? ` · NTEE ${org.ntee_code}` : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => !added && onAdd(org)}
                            disabled={added}
                            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              added
                                ? "bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-500"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                            }`}
                          >
                            {added ? (
                              <>
                                <IconCheck className="h-3 w-3" /> Added
                              </>
                            ) : (
                              <>
                                <IconPlus className="h-3 w-3" /> Add
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
