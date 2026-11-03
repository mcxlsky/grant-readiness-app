"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";

type SlideDef = { label: string; className: string; content: ReactNode };

function interpolate(p: number, input: number[], output: number[]) {
  if (p <= input[0]) return output[0];
  for (let i = 1; i < input.length; i++) {
    if (p <= input[i]) {
      const t = (p - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + t * (output[i] - output[i - 1]);
    }
  }
  return output[output.length - 1];
}

type MarkPos = { top: number; left: number; size: number };

// The hero asterisk stays pinned where the hero placed it, and becomes the
// back-to-top control once you scroll past the hero.
function BrandMark() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [pos, setPos] = useState<MarkPos | null>(null);
  const posRef = useRef<MarkPos | null>(null);
  const [pastHero, setPastHero] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const [turns, setTurns] = useState(0);
  const sectionRef = useRef(0);
  const lastSectionRef = useRef(0);
  const mountedAtRef = useRef(0);

  useLayoutEffect(() => {
    const slot = document.getElementById("hero-mark-slot");
    const frame = slot?.closest("[data-fade-frame]");
    if (!slot || !frame) return;
    lastSectionRef.current =
      frame.querySelectorAll(":scope > section").length - 1;
    mountedAtRef.current = performance.now();
    const measure = () => {
      const s = slot.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      const next = { top: s.top - f.top, left: s.left - f.left, size: s.width };
      posRef.current = next;
      setPos(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot.parentElement ?? slot);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useMotionValueEvent(scrollY, "change", (y) => {
    setPastHero(y > window.innerHeight * 0.5);
    const mark = posRef.current;
    const footerTop = document
      .querySelector("footer")
      ?.getBoundingClientRect().top;
    setOverFooter(
      !!mark && footerTop !== undefined && footerTop < mark.top + mark.size,
    );
    // Slides swap at the midpoint between viewport-height scroll steps.
    const section = Math.min(
      Math.max(Math.round(y / window.innerHeight), 0),
      lastSectionRef.current,
    );
    if (section !== sectionRef.current) {
      const step = section - sectionRef.current;
      sectionRef.current = section;
      // Skip the browser's scroll restoration right after load.
      const settled = performance.now() - mountedAtRef.current > 800;
      if (!prefersReducedMotion && settled) setTurns((t) => t + step);
    }
  });

  if (!pos) return null;

  const interactive = pastHero && !overFooter;

  return (
    <motion.button
      type="button"
      aria-label="Back to top"
      tabIndex={interactive ? 0 : -1}
      aria-hidden={!interactive}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        })
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: overFooter ? 0 : 1 }}
      transition={{ duration: overFooter ? 0.2 : 0.5 }}
      style={{ top: pos.top, left: pos.left, width: pos.size }}
      className={`fixed z-50 aspect-[90/88] rounded-full text-plum-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current ${interactive ? "" : "pointer-events-none"}`}
    >
      <motion.span
        aria-hidden="true"
        // Whole petals of the seven-petal mark, so each twist lands on the same shape.
        animate={{ rotate: turns * 4 * (360 / 7) }}
        transition={{ type: "spring", stiffness: 90, damping: 9 }}
        className="brand-drift block size-full [mask:url('/brand/logo-mark.svg')_center/contain_no-repeat]"
      />
    </motion.button>
  );
}

function Slide({
  progress,
  index,
  count,
  slide,
}: {
  progress: MotionValue<number>;
  index: number;
  count: number;
  slide: SlideDef;
}) {
  const step = 1 / (count - 1);
  const center = index * step;
  const isFirst = index === 0;
  const isLast = index === count - 1;
  const input = isFirst
    ? [0, center + 0.3 * step, center + 0.5 * step]
    : isLast
      ? [center - 0.5 * step, center - 0.3 * step, 1]
      : [
          center - 0.5 * step,
          center - 0.3 * step,
          center + 0.3 * step,
          center + 0.5 * step,
        ];
  const output = isFirst ? [1, 1, 0] : isLast ? [0, 1, 1] : [0, 1, 1, 0];
  // A function transform keeps Motion off its native scroll-timeline path,
  // which computed the wrong opacity for the first slide.
  const opacity = useTransform(progress, (p) => interpolate(p, input, output));
  // Hidden slides must not take clicks or keyboard focus.
  const visibility = useTransform(opacity, (o) =>
    o < 0.01 ? "hidden" : "visible",
  );

  return (
    <motion.section
      aria-label={slide.label}
      style={{ opacity, visibility }}
      className={`absolute inset-0 ${slide.className}`}
    >
      {slide.content}
    </motion.section>
  );
}

function FooterLayer({
  progress,
  children,
}: {
  progress: MotionValue<number>;
  children: ReactNode;
}) {
  // Time-based so the fade stays slow however fast you scroll to the end.
  const [shown, setShown] = useState(false);
  useMotionValueEvent(progress, "change", (p) => setShown(p > 0.95));
  return (
    <motion.div
      initial={false}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={{ duration: shown ? 1.2 : 0.3, ease: "easeOut" }}
      className={`absolute inset-x-0 bottom-0 z-10 ${shown ? "" : "pointer-events-none"}`}
      inert={!shown}
    >
      {children}
    </motion.div>
  );
}

function FadeStack({
  slides,
  footer,
}: {
  slides: SlideDef[];
  footer?: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  // The track starts one screen down, so progress runs 0→1 across the slides.
  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start end", "end end"],
  });

  return (
    <div className="relative bg-cream-100">
      <div data-fade-frame className="sticky top-0 h-screen overflow-hidden">
        <img
          src="/brand/palm-leaf-upright.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/2 w-[280px] -translate-y-1/2 -scale-x-100 opacity-20 md:-right-10 md:w-[440px] lg:right-0 lg:w-[560px]"
        />
        {slides.map((slide, i) => (
          <Slide
            key={slide.label}
            progress={scrollYProgress}
            index={i}
            count={slides.length}
            slide={slide}
          />
        ))}
        {footer && (
          <FooterLayer progress={scrollYProgress}>{footer}</FooterLayer>
        )}
      </div>
      <div ref={track} style={{ height: `${(slides.length - 1) * 100}vh` }} />
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setReady(true);
  }, []);

  const fade = prefersReducedMotion ? {} : { opacity: 0 };
  const visible = { opacity: 1 };

  const handleGetStarted = () => {
    router.push("/get-started");
  };

  const handleAdmin = () => {
    localStorage.setItem(
      "rsg_admin",
      JSON.stringify({ name: "Admin", signedInAt: Date.now() }),
    );
    router.push("/dashboard");
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-cream-50">
      <FadeStack
        slides={[
          {
            label: "Introduction",
            className: "flex flex-col justify-center px-6 md:px-24",
            content: (
              <>
                <motion.div
                  initial={fade}
                  animate={visible}
                  transition={{ duration: 0.5 }}
                  className="relative z-10 max-w-3xl"
                >
                  <span
                    id="hero-mark-slot"
                    aria-hidden="true"
                    className="mb-4 block aspect-[90/88] w-16 md:w-20"
                  />

                  <h1>
                    <span className="sr-only">rév &amp; ready</span>
                    <span
                      aria-hidden="true"
                      className="brand-drift block aspect-[473/319] w-56 [mask:url('/brand/wordmark.svg')_center/contain_no-repeat] md:w-80 lg:w-[420px]"
                    />
                  </h1>

                  <p className="mt-8 max-w-lg text-lg leading-relaxed text-plum-500 md:text-xl">
                    We help nonprofits build the strategy, systems, and stories
                    they need to win grants — from research and eligibility
                    through writing and submission.
                  </p>

                  <div className="mt-10 flex flex-col items-start gap-3">
                    <button
                      type="button"
                      onClick={handleGetStarted}
                      className="btn-sheen rounded-[10px] border-2 border-brand-orange-border bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white transition-shadow duration-200 hover:shadow-[0_4px_10px_-3px_rgba(0,0,0,0.35)] motion-safe:transition-[box-shadow,transform] motion-safe:active:scale-[0.98] md:px-6 md:py-3 md:text-base"
                    >
                      Start an assessment
                    </button>
                    <button
                      type="button"
                      onClick={handleAdmin}
                      className="py-2 text-sm font-semibold text-plum-400 transition-colors hover:text-plum-600 md:text-base"
                    >
                      Continue with an existing app{" "}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </motion.div>
              </>
            ),
          },
          {
            label: "Grant readiness",
            className: "flex items-center px-6 md:px-24",
            content: (
              <>
                <div className="mx-auto w-full max-w-6xl">
                  {/* Text content */}
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
                      We provide end-to-end grant support — from finding the
                      right opportunity to submitting a winning proposal.
                    </p>
                    <button
                      onClick={handleGetStarted}
                      className="py-2 text-sm font-semibold text-plum-400 transition-colors hover:text-plum-600 md:text-base"
                    >
                      Get Started <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </>
            ),
          },
          {
            label: "Consulting",
            className: "flex items-center px-6 md:px-24",
            content: (
              <>
                <div className="mx-auto w-full max-w-6xl">
                  {/* Text content */}
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
                      Ready Set Grants is a Rev Noir Consulting product. For
                      customized development strategy, infrastructure, and
                      ongoing consulting, explore Rev Noir Consulting.
                    </p>
                    <a
                      href="https://revnoirconsulting.com"
                      className="py-2 text-sm font-semibold text-plum-400 transition-colors hover:text-plum-600 md:text-base"
                    >
                      Get in Touch <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
              </>
            ),
          },
        ]}
        footer={
          <footer className="bg-cream-200 px-6 py-5 md:px-10 md:py-6">
            <div className="mx-auto flex max-w-7xl items-center gap-4 md:gap-10">
              <span
                aria-hidden="true"
                className="block aspect-[473/319] w-12 shrink-0 bg-plum-900 [mask:url('/brand/wordmark.svg')_center/contain_no-repeat] md:w-16"
              />
              <div className="flex min-w-0 flex-1 items-center justify-end gap-x-4 whitespace-nowrap text-xs text-plum-500 sm:gap-x-6 md:text-sm">
                <span>
                  &copy; 2026
                  <span className="hidden sm:inline">
                    {" "}
                    Rev &amp; Ready. All rights reserved.
                  </span>
                </span>
                <a href="#" className="transition-colors hover:text-plum-700">
                  Privacy<span className="hidden sm:inline"> Policy</span>
                </a>
                <a href="#" className="transition-colors hover:text-plum-700">
                  Terms<span className="hidden sm:inline"> of Service</span>
                </a>
              </div>
              <div className="flex shrink-0 items-center gap-4 md:gap-5">
                <a
                  href="#"
                  className="text-plum-500 transition-colors hover:text-plum-700"
                  aria-label="Facebook"
                >
                  <IconBrandFacebook className="h-5 w-5 md:h-6 md:w-6" />
                </a>
                <a
                  href="#"
                  className="text-plum-500 transition-colors hover:text-plum-700"
                  aria-label="Instagram"
                >
                  <IconBrandInstagram className="h-5 w-5 md:h-6 md:w-6" />
                </a>
              </div>
            </div>
          </footer>
        }
      />

      <BrandMark />
    </div>
  );
}
