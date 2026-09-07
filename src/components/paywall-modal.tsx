"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconX,
  IconCircleCheck,
  IconTargetArrow,
  IconFileText,
  IconChartBar,
  IconShieldCheck,
  IconArrowRight,
  IconLoader2,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orgName: string;
  score: number;
}

const VALUE_PROPS = [
  {
    icon: IconTargetArrow,
    title: "Grant Prospecting",
    description: "Expert matching with federal, foundation, and corporate funders aligned to your mission.",
  },
  {
    icon: IconFileText,
    title: "Proposal Support",
    description: "Guided drafts, budget templates, and narrative frameworks tailored to each opportunity.",
  },
  {
    icon: IconChartBar,
    title: "Pipeline Management",
    description: "Track every opportunity from prospect to submission with deadlines and status updates.",
  },
  {
    icon: IconShieldCheck,
    title: "Compliance Review",
    description: "Pre-submission checks to make sure your application meets all funder requirements.",
  },
];

export function PaywallModal({ open, onClose, onConfirm, orgName, score }: PaywallModalProps) {
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    setProcessing(true);
    // Simulate payment processing (MVP — real Stripe integration later)
    await new Promise((r) => setTimeout(r, 1500));
    setProcessing(false);
    onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="fixed inset-x-4 top-[5%] z-[101] mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:inset-x-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <IconX className="h-4 w-4" />
            </button>

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <IconCircleCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {orgName} is Grant-Ready
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
                  Readiness score: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{score}/100</span>
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
                  Unlock professional grant prospecting and management to start winning funding.
                </p>
              </div>

              {/* Value props */}
              <div className="mb-6 space-y-3">
                {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                      <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-neutral-200">
                        {title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-neutral-500">
                        {description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing placeholder */}
              <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-800/50 dark:bg-indigo-500/5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">$299</span>
                    <span className="ml-1 text-sm text-gray-500 dark:text-neutral-500">/engagement</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    Most popular
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
                  One-time fee per organization. Includes prospecting, proposal support, and pipeline access.
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={handleConfirm}
                disabled={processing}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors",
                  processing
                    ? "cursor-not-allowed bg-indigo-400 dark:bg-indigo-600"
                    : "bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                )}
              >
                {processing ? (
                  <>
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    Start Prospecting
                    <IconArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-neutral-600">
                This is a prototype. No real payment will be processed.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
