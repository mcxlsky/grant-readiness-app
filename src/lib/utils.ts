import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt$(n: number): string {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
  return "$" + n;
}

export function tierColor(tier: string): string {
  if (tier === "Grant-Ready") return "#22c55e";
  if (tier === "Ready with Gaps") return "#818cf8";
  if (tier === "Needs Work") return "#f59e0b";
  return "#ef4444";
}

export function matchColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#818cf8";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}
