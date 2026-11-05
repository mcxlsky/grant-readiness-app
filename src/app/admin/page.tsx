"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { requestMagicLink, startDevSession } from "@/lib/admin-session";
import { isAuthConfigured, isDevAuthMode } from "@/lib/auth/config";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-sky-deep focus:ring-1 focus:ring-brand-sky/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

const buttonCls =
  "flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600";

const cardCls =
  "space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900";

const ERROR_MESSAGES: Record<string, string> = {
  not_authorized: "That email isn't on the consultant team. Ask a team admin to add you.",
  link_invalid: "That sign-in link has expired or was opened in a different browser. Request a new one.",
  check_failed: "We couldn't confirm your access. Request a new link, or try again in a few minutes.",
  rate_limited: "Too many sign-in requests. Wait a minute, then try again.",
  failed: "We couldn't send the link. Check your connection and try again.",
};

export default function AdminSignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-6 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="block h-9 w-9 bg-indigo-700 [mask:url('/brand/logo-mark.svg')_center/contain_no-repeat] dark:bg-plum-100"
            />
            <span
              aria-hidden="true"
              className="block aspect-[473/319] w-16 bg-indigo-700 [mask:url('/brand/wordmark.svg')_center/contain_no-repeat] dark:bg-plum-100"
            />
            <span className="sr-only">Rev &amp; Ready</span>
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
            Consultant sign in
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            For the Rev &amp; Ready team
          </p>
        </div>

        {isAuthConfigured ? <MagicLinkForm /> : isDevAuthMode ? <DevModeCard /> : <NotConfiguredCard />}

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-neutral-400">
          Looking for your application?{" "}
          <Link href="/portal" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            Go to the applicant portal
          </Link>
        </p>
      </div>
    </div>
  );
}

function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Read here rather than with useSearchParams, which would need a Suspense boundary to build.
  useEffect(() => {
    setErrorKey(new URLSearchParams(window.location.search).get("error"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;

    setSending(true);
    setErrorKey(null);
    const result = await requestMagicLink(address);
    setSending(false);

    if (result === "sent") setSentTo(address);
    else setErrorKey(result);
  };

  if (sentTo) {
    return (
      <div role="status" className={cardCls}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Check your email</h2>
        <p className="text-sm text-gray-600 dark:text-neutral-300">
          If <span className="font-medium break-all">{sentTo}</span> is on the Rev &amp; Ready team, a sign-in link is
          on its way. Open it in this browser.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.link_invalid) : null;

  return (
    <form onSubmit={handleSubmit} className={cardCls}>
      {errorMessage && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </p>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">Work email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@revnoirconsulting.com"
          className={inputCls}
        />
      </label>
      <button type="submit" disabled={sending} className={buttonCls}>
        {sending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}

function DevModeCard() {
  return (
    <div className={cardCls}>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <span className="font-semibold">Dev mode.</span> Supabase isn&apos;t configured, so sign-in is turned off on
        this machine. Deployed sites never offer this.
      </p>
      <button
        type="button"
        onClick={() => {
          startDevSession();
          // A full load so the middleware sees the new cookie.
          window.location.assign("/dashboard");
        }}
        className={buttonCls}
      >
        Continue as Dev Consultant
      </button>
    </div>
  );
}

function NotConfiguredCard() {
  return (
    <div role="status" className={cardCls}>
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sign-in isn&apos;t available</h2>
      <p className="text-sm text-gray-600 dark:text-neutral-300">
        This site is missing its Supabase settings, so consultants can&apos;t sign in yet. Applicants aren&apos;t
        affected.
      </p>
    </div>
  );
}
