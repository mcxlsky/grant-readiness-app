"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  IconArrowRight,
  IconLayoutDashboard,
  IconSearch,
  IconListCheck,
  IconPencil,
  IconFileCheck,
  IconBulb,
  IconBuildingBank,
  IconBuildingCommunity,
  IconRocket,
  IconTarget,
  IconChartBar,
} from "@tabler/icons-react";

const SERVICES = [
  {
    name: "Grant Research",
    description: "Find grants that match your mission, capacity, and goals.",
    icon: IconSearch,
  },
  {
    name: "Eligibility Assessment",
    description: "Know where you stand before you apply — no wasted effort.",
    icon: IconListCheck,
  },
  {
    name: "Grant Writing",
    description: "Compelling proposals that tell your story and win funding.",
    icon: IconPencil,
  },
  {
    name: "Grant Review & Editing",
    description: "Expert eyes on your draft before you hit submit.",
    icon: IconFileCheck,
  },
  {
    name: "Funding Strategy",
    description: "A roadmap for sustainable, diversified revenue.",
    icon: IconBulb,
  },
  {
    name: "Corporate & Foundation",
    description: "Tap into private philanthropy and corporate giving.",
    icon: IconBuildingBank,
  },
  {
    name: "Government Grants",
    description: "Navigate federal, state, and local funding programs.",
    icon: IconBuildingCommunity,
  },
];

const VALUE_PROPS = [
  {
    title: "Strategy First",
    description:
      "We start with your mission and build a funding roadmap — not a one-off proposal.",
    icon: IconTarget,
  },
  {
    title: "Research-Backed",
    description:
      "We identify grants you actually qualify for, so you spend time on the right opportunities.",
    icon: IconSearch,
  },
  {
    title: "Readiness-Focused",
    description:
      "We help you build the organizational capacity that funders look for before you apply.",
    icon: IconChartBar,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("choose")) {
      setReady(true);
      return;
    }
    const admin = localStorage.getItem("rsg_admin");
    if (admin) {
      try {
        const parsed = JSON.parse(admin);
        if (parsed.signedInAt && !parsed.signedOut) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        /* fall through to landing */
      }
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

  const handleGetStarted = () => {
    router.push("/get-started");
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="flex flex-col items-center px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-2xl"
        >
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <div className="h-7 w-8 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-indigo-500" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Ready Set Grants
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-5xl">
            Grant funding starts
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">
              with readiness.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-gray-500 dark:text-neutral-400">
            We help nonprofits build the strategy, systems, and stories they
            need to win grants — from research and eligibility through writing
            and submission.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleGetStarted}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <IconRocket className="h-4 w-4" />
              Start Your Grant Assessment
            </button>
            <button
              onClick={handleAdmin}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <IconLayoutDashboard className="h-4 w-4" />
              I&apos;m a Consultant
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Services ───────────────────────────────────── */}
      <section className="px-6 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mx-auto max-w-4xl"
        >
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              How We Help
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-500">
              End-to-end grant support — from finding the right opportunity to
              submitting a winning proposal.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, i) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.04, duration: 0.3 }}
                  className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-neutral-500">
                    {service.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── Value props ────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-white px-6 py-16 dark:border-neutral-800 dark:bg-neutral-900 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mx-auto max-w-4xl"
        >
          <div className="grid gap-8 md:grid-cols-3">
            {VALUE_PROPS.map((prop) => {
              const Icon = prop.icon;
              return (
                <div key={prop.title} className="text-center md:text-left">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 md:mx-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {prop.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-neutral-500">
                    {prop.description}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── CTA / Role picker ──────────────────────────── */}
      <section className="px-6 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mx-auto max-w-md"
        >
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Ready to get started?
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-neutral-500">
              Tell us about your organization and we&apos;ll match you with the
              right support.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGetStarted}
              className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-indigo-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-500"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <IconRocket className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Get Started
                </div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-neutral-500">
                  Get a free grant readiness assessment for your organization
                </div>
              </div>
              <IconArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-indigo-500 dark:text-neutral-600" />
            </button>

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
          </div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-gray-200 px-6 py-6 text-center dark:border-neutral-800">
        <p className="text-[11px] text-gray-400 dark:text-neutral-600">
          Working prototype · Not a finished product
        </p>
      </footer>
    </div>
  );
}
