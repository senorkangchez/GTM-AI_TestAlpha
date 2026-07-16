// Small pure formatting/derivation helpers shared across UI + engines.
import type { Band } from "./types";

/** The demo's "now". All recency/decay is measured against this. */
export const AS_OF = "2026-07-16T00:00:00";

export function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function clamp(n: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Whole days between an ISO timestamp and asOf (default AS_OF). Never negative. */
export function ageInDays(iso: string, asOf: string = AS_OF): number {
  const t = new Date(iso).getTime();
  const now = new Date(asOf).getTime();
  return Math.max(0, (now - t) / 86_400_000);
}

export function bandOf(total: number): Band {
  if (total < 55) return "at_risk";
  if (total < 75) return "watch";
  return "healthy";
}

/** Semantic band colors — used consistently everywhere (rings, chips, bars). */
export const BAND_HEX: Record<Band, string> = {
  at_risk: "#dc2626", // red-600
  watch: "#d97706", // amber-600
  healthy: "#16a34a", // green-600
};

export const BAND_LABEL: Record<Band, string> = {
  at_risk: "At risk",
  watch: "Watch",
  healthy: "Healthy",
};

/** Tailwind utility bundles per band for text/bg/border/ring. */
export const BAND_CLASSES: Record<Band, { text: string; bg: string; border: string; soft: string }> = {
  at_risk: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-600",
    border: "border-red-500/40",
    soft: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  watch: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500",
    border: "border-amber-500/40",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  healthy: {
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-600",
    border: "border-green-500/40",
    soft: "bg-green-500/10 text-green-700 dark:text-green-300",
  },
};

export function currency(n: number): string {
  if (n >= 1_000_000) return `$${round(n / 1_000_000, 2)}M`;
  if (n >= 1_000) return `$${round(n / 1_000)}k`;
  return `$${round(n)}`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

const SOURCE_LABELS: Record<string, string> = {
  gong_call: "Gong call",
  gong_email: "Gong email",
  slack: "Slack",
  salesforce: "Salesforce",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
