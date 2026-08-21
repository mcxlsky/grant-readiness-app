"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  IconLayoutDashboard,
  IconFileText,
  IconArrowRight,
} from "@tabler/icons-react";

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If navigated here intentionally (logo click), show the role chooser
    const params = new URLSearchParams(window.location.search);
    if (params.get("choose")) {
      setReady(true);
      return;
    }
    // If already signed in and not explicitly signed out, redirect
    const admin = localStorage.getItem("rsg_admin");
    if (admin) {
      try {
        const parsed = JSON.parse(admin);
        if (parsed.signedInAt && !parsed.signedOut) {
          router.replace("/dashboard");
          return;
        }
      } catch { /* fall through to landing */ }
    }
    setReady(true);
  }, [router]);

  const handleAdmin = () => {
    localStorage.setItem(
      "rsg_admin",
      JSON.stringify({ name: "Admin", signedInAt: Date.now() })
    );
    router.push("/dashboard");
  };

  const handleApplicant = () => {
    router.push("/portal");
  };

  if (!ready) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="h-7 w-8 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-indigo-500" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Ready Set Grants
          </span>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          <button
            onClick={handleAdmin}
            className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-indigo-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-500"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <IconLayoutDashboard className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Grant Consultant
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">
                Manage your portfolio, assess readiness, and source grants
              </div>
            </div>
            <IconArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-indigo-500 dark:text-neutral-600" />
          </button>

          <button
            onClick={handleApplicant}
            className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-indigo-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-500"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <IconFileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Applicant
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">
                Submit a grant application or check your status
              </div>
            </div>
            <IconArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-indigo-500 dark:text-neutral-600" />
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400 dark:text-neutral-600">
          Working prototype · Not a finished product
        </p>
      </motion.div>
    </div>
  );
}
