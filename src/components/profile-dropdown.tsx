"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconUser, IconSun, IconMoon, IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { Theme } from "@/lib/theme";

interface ProfileDropdownProps {
  theme: Theme;
  onToggleTheme: () => void;
  adminName?: string;
}

export function ProfileDropdown({ theme, onToggleTheme, adminName = "Admin" }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSignOut = () => {
    localStorage.setItem(
      "rsg_admin",
      JSON.stringify({ signedOut: true })
    );
    router.push("/");
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
          <div className="text-[10px] leading-tight text-gray-400 dark:text-neutral-500">Grant Consultant</div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="border-b border-gray-100 px-3 py-2.5 dark:border-neutral-700">
              <div className="text-xs font-semibold text-gray-800 dark:text-neutral-200">
                {adminName}
              </div>
              <div className="text-[11px] text-gray-400 dark:text-neutral-500">
                Grant Consultant
              </div>
            </div>
            <div className="py-1">
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
                onClick={() => {
                  setOpen(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-700/50"
              >
                <IconLogout className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
