"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconUser, IconUsers, IconSun, IconMoon, IconLogout } from "@tabler/icons-react";
import type { Theme } from "@/lib/theme";
import { signOutConsultant } from "@/lib/admin-session";
import { ROLE_LABELS, type FirmRole } from "@/lib/auth/consultant";

interface ProfileDropdownProps {
  theme: Theme;
  onToggleTheme: () => void;
  adminName?: string;
  adminEmail?: string;
  firmName?: string;
  role?: FirmRole;
}

export function ProfileDropdown({ theme, onToggleTheme, adminName = "Admin", adminEmail, firmName, role }: ProfileDropdownProps) {
  const subtitle = [firmName, role && ROLE_LABELS[role]].filter(Boolean).join(" · ") || "Grant Consultant";
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutFailed(false);
    if (await signOutConsultant()) {
      // A full load drops the dashboard from memory and goes back through the middleware.
      window.location.assign("/admin");
      return;
    }
    setSigningOut(false);
    setSignOutFailed(true);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200/70 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
          <IconUser className="h-4 w-4" />
        </div>
        <div className="hidden text-left md:block">
          <div className="text-xs font-medium text-gray-800 dark:text-neutral-200">{adminName}</div>
          <div className="max-w-40 truncate text-[10px] leading-tight text-gray-400 dark:text-neutral-500">{subtitle}</div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-lg border border-gray-200/70 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="border-b border-gray-100 px-3 py-2.5 dark:border-neutral-700">
              <div className="text-xs font-semibold text-gray-800 dark:text-neutral-200">
                {adminName}
              </div>
              <div className="truncate text-[11px] text-gray-400 dark:text-neutral-500" title={adminEmail}>
                {adminEmail ?? "Grant Consultant"}
              </div>
            </div>
            <div className="py-1">
              {role === "admin" && (
                <a
                  href="/dashboard/team"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
                >
                  <IconUsers className="h-3.5 w-3.5" />
                  Team
                </a>
              )}
              <button
                onClick={() => {
                  onToggleTheme();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
              >
                {theme === "dark" ? (
                  <IconSun className="h-3.5 w-3.5" />
                ) : (
                  <IconMoon className="h-3.5 w-3.5" />
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
              >
                <IconLogout className="h-3.5 w-3.5" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
              {signOutFailed && (
                <p role="alert" className="px-3 pb-2 text-[11px] leading-snug text-red-700 dark:text-red-300">
                  Couldn&apos;t sign out. Check your connection and try again.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
