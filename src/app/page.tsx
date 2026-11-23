"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";

// Full-height sections that scroll normally. data-snap-point turns on page
// scroll snapping (see globals.css), and each section snaps to its top.
function Section({
  id,
  label,
  className = "",
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      data-snap-point
      className={`relative flex min-h-screen snap-start ${className}`}
    >
      {children}
    </section>
  );
}

const NAV_LINKS = [
  { id: "readiness", label: "Readiness" },
  { id: "consulting", label: "Consulting" },
];

// Fixed bar over the sections. The small lockup appears once the hero's own
// lockup has scrolled away, and takes you back to the top.
function TopNav({
  active,
  onGetStarted,
}: {
  active: string;
  onGetStarted: () => void;
}) {
  const pastHero = active !== "top";
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gray-50/80 backdrop-blur-sm">
      <nav
        aria-label="Sections"
        className="mx-auto flex h-14 items-center gap-6 px-6 md:h-16 md:px-24"
      >
        <a
          href="#top"
          aria-label="Rev & Ready, back to top"
          tabIndex={pastHero ? 0 : -1}
          aria-hidden={!pastHero}
          className={`flex items-center gap-2 rounded-md transition-opacity duration-300 ${pastHero ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <span
            aria-hidden="true"
            className="brand-drift block aspect-[90/88] w-7 [mask:url('/brand/logo-mark.svg')_center/contain_no-repeat]"
          />
          <span
            aria-hidden="true"
            className="brand-drift block aspect-[473/319] w-12 [mask:url('/brand/wordmark.svg')_center/contain_no-repeat]"
          />
        </a>
        <div className="ml-auto flex items-center gap-5 md:gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              aria-current={active === link.id ? "location" : undefined}
              className={`py-2 text-sm font-medium transition-colors md:text-[15px] ${active === link.id ? "text-plum-900" : "text-plum-400 hover:text-plum-700"}`}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onGetStarted}
            className="btn-sheen hidden rounded-[8px] border-2 border-brand-red-border bg-brand-red px-3.5 py-1.5 text-sm font-semibold text-white transition-shadow duration-200 hover:shadow-[0_4px_10px_-3px_rgba(0,0,0,0.35)] sm:block"
          >
            Start an assessment
          </button>
        </div>
      </nav>
    </header>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const [active, setActive] = useState("top");

  useEffect(() => {
    setReady(true);
  }, []);

  // The section filling most of the screen is the current one.
  useEffect(() => {
    if (!ready) return;
    const sections = document.querySelectorAll("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { threshold: 0.6 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [ready]);

  const fade = prefersReducedMotion ? {} : { opacity: 0 };
  const visible = { opacity: 1 };

  const handleGetStarted = () => {
    router.push("/get-started");
  };

  const handleExistingApp = () => {
    router.push("/portal");
  };

  if (!ready) return null;

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Background layers stay put while the sections scroll past. */}
      <div aria-hidden="true" className="dot-grid pointer-events-none fixed inset-0" />
      <img
        src="/brand/palm-leaf-upright.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed -right-24 top-1/2 w-[280px] -translate-y-1/2 -scale-x-100 opacity-20 md:-right-10 md:w-[440px] lg:right-0 lg:w-[560px]"
      />

      <TopNav active={active} onGetStarted={handleGetStarted} />

      <Section
        id="top"
        label="Introduction"
        className="flex-col justify-center px-6 md:px-24"
      >
        <motion.div
          initial={fade}
          animate={visible}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-3xl"
        >
          <span
            aria-hidden="true"
            className="brand-drift mb-4 block aspect-[90/88] w-16 [mask:url('/brand/logo-mark.svg')_center/contain_no-repeat] md:w-20"
          />

          <h1>
            <span className="sr-only">rév &amp; ready</span>
            <span
              aria-hidden="true"
              className="brand-drift block aspect-[473/319] w-56 [mask:url('/brand/wordmark.svg')_center/contain_no-repeat] md:w-80 lg:w-[420px]"
            />
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-relaxed text-plum-500 md:text-xl">
            We help nonprofits build the strategy, systems, and stories they
            need to win grants — from research and eligibility through writing
            and submission.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3">
            <button
              type="button"
              onClick={handleGetStarted}
              className="btn-sheen rounded-[10px] border-2 border-brand-red-border bg-brand-red px-5 py-2.5 text-sm font-semibold text-white transition-shadow duration-200 hover:shadow-[0_4px_10px_-3px_rgba(0,0,0,0.35)] motion-safe:transition-[box-shadow,transform] motion-safe:active:scale-[0.98] md:px-6 md:py-3 md:text-base"
            >
              Start an assessment
            </button>
            <button
              type="button"
              onClick={handleExistingApp}
              className="py-2 text-sm font-semibold text-plum-400 transition-colors hover:text-plum-600 md:text-base"
            >
              Continue with an existing app <span aria-hidden="true">→</span>
            </button>
          </div>
        </motion.div>
      </Section>

      <Section id="readiness" label="Grant readiness" className="items-center px-6 md:px-24">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col items-start gap-6">
            <span className="-mb-3 rounded-md bg-plum-50 px-3 py-1 text-xs font-medium text-plum-600 md:text-sm">
              End-to-End Grant Support
            </span>
            <h2 className="text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-plum-600 md:text-6xl">
              Grant funding starts
              <br />
              with readiness.
            </h2>
            <p className="max-w-md text-base leading-relaxed text-neutral-600 md:text-lg">
              We provide end-to-end grant support — from finding the right
              opportunity to submitting a winning proposal.
            </p>
            <button
              type="button"
              onClick={handleGetStarted}
              className="py-2 text-sm font-semibold text-plum-400 transition-colors hover:text-plum-600 md:text-base"
            >
              Get Started <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </Section>

      <Section id="consulting" label="Consulting" className="items-center px-6 md:px-24">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col items-start gap-6">
            <span className="-mb-3 rounded-md bg-plum-50 px-3 py-1 text-xs font-medium text-plum-600 md:text-sm">
              Custom Development Strategy
            </span>
            <h2 className="text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-plum-600 md:text-6xl">
              Need a broader
              <br />
              fundraising strategy?
            </h2>
            <p className="max-w-md text-base leading-relaxed text-neutral-600 md:text-lg">
              Rev &amp; Ready is a Rev Noir Consulting product. For customized
              development strategy, infrastructure, and ongoing consulting,
              explore Rev Noir Consulting.
            </p>
            <a
              href="https://revnoirconsulting.com"
              className="py-2 text-sm font-semibold text-plum-400 transition-colors hover:text-plum-600 md:text-base"
            >
              Get in Touch <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {/* Laid over the bottom edge so the content centers like the other sections. */}
        <footer className="absolute inset-x-0 bottom-0 border-t border-gray-200/70 bg-[#f1eee8] px-6 py-4 md:px-24 md:py-5">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 whitespace-nowrap text-xs text-plum-500 md:text-sm">
            <span>
              &copy; 2026 Rev &amp; Ready
              <span className="hidden sm:inline">. All rights reserved.</span>
            </span>
            <div className="flex items-center gap-4 sm:gap-6">
              <a href="#" className="transition-colors hover:text-plum-700">
                Privacy<span className="hidden sm:inline"> Policy</span>
              </a>
              <a href="#" className="transition-colors hover:text-plum-700">
                Terms<span className="hidden sm:inline"> of Service</span>
              </a>
              <a
                href="#"
                className="transition-colors hover:text-plum-700"
                aria-label="Facebook"
              >
                <IconBrandFacebook className="h-[18px] w-[18px] md:h-5 md:w-5" />
              </a>
              <a
                href="#"
                className="transition-colors hover:text-plum-700"
                aria-label="Instagram"
              >
                <IconBrandInstagram className="h-[18px] w-[18px] md:h-5 md:w-5" />
              </a>
            </div>
          </div>
        </footer>
      </Section>

    </div>
  );
}
