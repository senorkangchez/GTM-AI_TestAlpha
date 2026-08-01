// Geography layer (v3). Replaces the hand-authored org.ts + accounts.json.
// The district -> territory hierarchy is now a PROPERTY of the 600-opp book, so
// we derive it from fixtures/ground_truth.json and expose a bidirectional
// slug <-> label registry (route params must be clean/reversible; the v3
// territory labels contain spaces, e.g. "Mid-Market West").
import groundTruthJson from "@/fixtures/ground_truth.json";
import type { Opp, Segment, Team } from "./types";

const opps = groundTruthJson as Opp[];

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---- Derive the distinct hierarchy from the book --------------------------
const territoryLabels = Array.from(new Set(opps.map((o) => o.territory))).sort();
const districtLabels = Array.from(new Set(opps.map((o) => o.district))).sort();

const terrToDist: Record<string, string> = {};
for (const o of opps) terrToDist[o.territory] = o.district;

// slug <-> label registries (one per level, plus a combined lookup)
const terrSlugToLabel: Record<string, string> = Object.fromEntries(
  territoryLabels.map((l) => [slugify(l), l]),
);
const distSlugToLabel: Record<string, string> = Object.fromEntries(
  districtLabels.map((l) => [slugify(l), l]),
);
const labelToSlug: Record<string, string> = Object.fromEntries(
  [...territoryLabels, ...districtLabels].map((l) => [l, slugify(l)]),
);

// ---- Public API (mirrors the old org.ts surface, but slug-based) ----------

export function geoTitle(slug: string): string {
  return terrSlugToLabel[slug] ?? distSlugToLabel[slug] ?? slug;
}

/** Territory OR district label -> its slug. */
export function geoSlug(label: string): string {
  return labelToSlug[label] ?? slugify(label);
}

export function listTerritorySlugs(): string[] {
  return territoryLabels.map(slugify);
}
export function listDistrictSlugs(): string[] {
  return districtLabels.map(slugify);
}

/** District slug -> its territory slugs. */
export function territoriesInDistrict(districtSlug: string): string[] {
  const districtLabel = distSlugToLabel[districtSlug];
  return territoryLabels.filter((t) => terrToDist[t] === districtLabel).map(slugify);
}

/** Territory slug -> its district slug. */
export function districtOfTerritory(territorySlug: string): string | null {
  const territoryLabel = terrSlugToLabel[territorySlug];
  const districtLabel = territoryLabel ? terrToDist[territoryLabel] : undefined;
  return districtLabel ? slugify(districtLabel) : null;
}

export const SEGMENTS: Segment[] = ["mid-market", "enterprise", "smb"];
export const TEAMS: Team[] = ["West", "East", "Central"];

// The territory that concentrates the calibrated story (Northwind + Globex live in
// Mid-Market West). Kept as a slug; asserted to exist so app/page.tsx never
// redirects into notFound().
export const DEFAULT_TERRITORY = slugify("Mid-Market West");
if (process.env.NODE_ENV !== "production" && !terrSlugToLabel[DEFAULT_TERRITORY]) {
  throw new Error(
    `DEFAULT_TERRITORY "${DEFAULT_TERRITORY}" is not a derived territory slug — ` +
      `available: ${listTerritorySlugs().join(", ")}`,
  );
}
