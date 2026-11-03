"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";

const HeroBackground = dynamic(
  () => import("@/components/hero-background"),
  { ssr: false }
);

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setReady(true);
  }, []);

  const fade = prefersReducedMotion ? {} : { opacity: 0, y: 20 };
  const fadeX = prefersReducedMotion ? {} : { opacity: 0, x: 20 };
  const visible = { opacity: 1, y: 0, x: 0 };

  const handleGetStarted = () => {
    router.push("/get-started");
  };

  const handleAdmin = () => {
    localStorage.setItem(
      "rsg_admin",
      JSON.stringify({ name: "Admin", signedInAt: Date.now() })
    );
    router.push("/dashboard");
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-cream-50">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative flex flex-col justify-center overflow-hidden bg-cream-100 px-6 py-20 md:min-h-screen md:px-24">
        {/* WebGL particle network */}
        <div className="pointer-events-none absolute inset-0 z-0 hidden sm:block" aria-hidden="true">
          <Suspense fallback={null}>
            <HeroBackground />
          </Suspense>
        </div>

        <motion.div
          initial={fade}
          animate={visible}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-3xl"
        >
          {/* Logo mark */}
          <img
            src="/brand/logo-mark.svg"
            alt=""
            className="mb-4 h-16 w-16 md:h-20 md:w-20"
          />

          {/* Brand wordmark */}
          <h1 className="font-display text-5xl font-medium tracking-tight text-plum-900 md:text-7xl lg:text-8xl">
            rév{" "}
            <span className="italic">&amp;</span>
            <br />
            ready
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-relaxed text-plum-500 md:text-xl">
            We help nonprofits build the strategy, systems, and stories they
            need to win grants — from research and eligibility through writing
            and submission.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4">
            <button
              onClick={handleGetStarted}
              className="rounded-2xl border-4 border-brand-orange-border bg-brand-orange px-6 py-3 text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] md:px-8 md:py-4 md:text-xl"
            >
              Start an assessment →
            </button>
            <button
              onClick={handleAdmin}
              className="rounded-2xl border-4 border-plum-300 bg-plum-400 px-6 py-3 text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] md:px-8 md:py-4 md:text-xl"
            >
              Continue with an existing app →
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Feature: Grant Readiness ──────────────────── */}
      <section className="bg-cream-100 px-6 py-20 md:px-24 md:py-32">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row md:gap-20">
          {/* Image placeholder */}
          <div className="h-64 w-full shrink-0 rounded-2xl bg-gradient-to-b from-cream-200 to-cream-100 md:h-[400px] md:w-[420px]" />

          {/* Text content */}
          <motion.div
            initial={fadeX}
            whileInView={visible}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start gap-6"
          >
            <span className="rounded-lg bg-plum-50 px-4 py-2 text-sm font-medium text-plum-600 md:text-base">
              End-to-End Grant Support
            </span>
            <h2 className="font-display text-4xl font-medium tracking-tight text-plum-600 md:text-5xl">
              Grant funding starts
              <br />
              with readiness.
            </h2>
            <p className="max-w-md text-base leading-relaxed text-neutral-600 md:text-lg">
              We provide end-to-end grant support — from finding the right
              opportunity to submitting a winning proposal.
            </p>
            <button
              onClick={handleGetStarted}
              className="text-lg font-semibold text-plum-400 transition-colors hover:text-plum-600"
            >
              Get Started →
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Center statement ──────────────────────────── */}
      <section className="flex flex-col items-center justify-center bg-cream-100 px-6 py-24 md:py-40">
        <motion.div
          initial={fade}
          whileInView={visible}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Floral ornament */}
          <div className="flex items-center gap-2">
            <img
              src="/brand/floral-right.svg"
              alt=""
              className="h-12 w-28 rotate-180 opacity-80 md:h-16 md:w-36"
            />
            <img
              src="/brand/floral-left.svg"
              alt=""
              className="h-12 w-28 opacity-80 md:h-16 md:w-36"
            />
          </div>
          <h2 className="max-w-2xl text-center font-display text-4xl font-medium tracking-tight text-plum-800 md:text-5xl lg:text-6xl">
            Your nonprofit&apos;s grant strategy, simplified.
          </h2>
        </motion.div>
      </section>

      {/* ── Feature: Consulting upsell ────────────────── */}
      <section className="bg-cream-100 px-6 py-20 md:px-24 md:py-32">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row md:gap-20">
          {/* Image placeholder */}
          <div className="h-64 w-full shrink-0 rounded-2xl bg-gradient-to-b from-cream-200 to-cream-100 md:h-[400px] md:w-[420px]" />

          {/* Text content */}
          <motion.div
            initial={fadeX}
            whileInView={visible}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start gap-6"
          >
            <span className="rounded-lg bg-plum-50 px-4 py-2 text-sm font-medium text-plum-600 md:text-base">
              End-to-End Grant Support
            </span>
            <h2 className="font-display text-4xl font-medium tracking-tight text-plum-600 md:text-5xl">
              Need a broader
              <br />
              fundraising strategy?
            </h2>
            <p className="max-w-md text-base leading-relaxed text-neutral-600 md:text-lg">
              Ready Set Grants is a Rev Noir Consulting product. For customized
              development strategy, infrastructure, and ongoing consulting,
              explore Rev Noir Consulting.
            </p>
            <a
              href="https://revnoirconsulting.com"
              className="text-lg font-semibold text-plum-400 transition-colors hover:text-plum-600"
            >
              Get in Touch →
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="bg-plum-700 px-6 py-20 md:px-10 md:py-32">
        <div className="mx-auto max-w-7xl">
          {/* Large brand wordmark */}
          <div className="mb-16 flex flex-col gap-2">
            <img
              src="/brand/logo-mark-light.svg"
              alt=""
              className="mb-2 h-20 w-20 md:h-28 md:w-28"
            />
            <p className="font-display text-6xl font-medium tracking-tight text-plum-900 md:text-8xl lg:text-9xl">
              rév <span className="italic">&amp;</span>
              <br />
              ready
            </p>
          </div>

          {/* Legal + social row */}
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-6 text-sm text-plum-100/60 md:text-base">
              <span>&copy; 2026 Rev &amp; Ready All rights reserved.</span>
              <a href="#" className="transition-colors hover:text-plum-100">
                Privacy Policy
              </a>
              <a href="#" className="transition-colors hover:text-plum-100">
                Terms of Service
              </a>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-plum-100/60 transition-colors hover:text-plum-100"
                aria-label="Facebook"
              >
                <IconBrandFacebook className="h-7 w-7" />
              </a>
              <a
                href="#"
                className="text-plum-100/60 transition-colors hover:text-plum-100"
                aria-label="Instagram"
              >
                <IconBrandInstagram className="h-7 w-7" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
