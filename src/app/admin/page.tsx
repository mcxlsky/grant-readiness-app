"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminSession, signInAdmin } from "@/lib/admin-session";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand-sky-deep focus:ring-1 focus:ring-brand-sky/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white";

export default function AdminSignInPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (getAdminSession()) router.replace("/dashboard");
    else setChecked(true);
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    signInAdmin(name.trim(), email.trim());
    router.push("/dashboard");
  };

  if (!checked) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-6 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="block h-9 w-9 bg-plum-900 [mask:url('/brand/logo-mark.svg')_center/contain_no-repeat] dark:bg-plum-100"
            />
            <span
              aria-hidden="true"
              className="block aspect-[473/319] w-16 bg-plum-900 [mask:url('/brand/wordmark.svg')_center/contain_no-repeat] dark:bg-plum-100"
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

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-neutral-300">Name</span>
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Lee"
              className={inputCls}
            />
          </label>
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
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Sign in
          </button>
        </form>

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
