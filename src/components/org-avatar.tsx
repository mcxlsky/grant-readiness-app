"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { PortfolioOrg } from "@/lib/types";

interface OrgAvatarProps {
  org: PortfolioOrg;
  size?: "sm" | "md";
}

/**
 * Tries Clearbit Logo API (high-res brand logos) first.
 * Falls back to the first-letter avatar if the image fails to load.
 */
export function OrgAvatar({ org, size = "md" }: OrgAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const domain = useMemo(() => {
    const url = org.analysisData?.websiteUrl || org.analysisData?.siteScan?.url;
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }, [org.analysisData]);

  const handleError = useCallback(() => setImgFailed(true), []);

  const px = size === "sm" ? 24 : 36;
  const sizeClasses = size === "sm" ? "h-6 w-6" : "h-9 w-9";

  if (!domain || imgFailed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-gray-100 font-bold text-gray-500 dark:bg-neutral-800 dark:text-neutral-400",
          sizeClasses,
          size === "sm" ? "text-[10px]" : "text-xs"
        )}
      >
        {org.name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={`/api/logo?domain=${domain}`}
      alt=""
      width={px}
      height={px}
      className={cn(
        "shrink-0 rounded-lg bg-white object-contain p-0.5 dark:bg-neutral-800",
        sizeClasses
      )}
      onError={handleError}
    />
  );
}
