// ---------------------------------------------------------------------------
// The analytics book: 600 structured opportunities. NO LLM, NO scoring engine —
// pure aggregation. This is what the macro views (KPIs, heatmaps, break-outs,
// digest) roll up from. Only the ~30 has_conversations opps also flow through the
// scored-account path in lib/data.ts; here we use ALL 600 for rate analysis.
// ---------------------------------------------------------------------------
import groundTruthJson from "@/fixtures/ground_truth.json";
import campaignsJson from "@/fixtures/campaigns.json";
import heatmapsJson from "@/fixtures/heatmaps.json";
import type {
  CampaignsFile,
  Heatmaps,
  HeatmapGridKey,
  HeatmapView,
  Opp,
  Segment,
  Team,
} from "./types";
import { slugify } from "./geo";

const opps = groundTruthJson as Opp[];
const campaigns = campaignsJson as CampaignsFile;
const heatmaps = heatmapsJson as unknown as Heatmaps;

export const SLACK_FEATURE = "native Slack integration";

export function allOpps(): Opp[] {
  return opps;
}

// opp_id -> the campaign NAMES it was enrolled in (mirrors heatmaps.py so
// oppsInCell matches the precomputed grids exactly). Default ["no campaign"].
const campaignName = Object.fromEntries(campaigns.campaigns.map((c) => [c.campaign_id, c.name]));
const oppCampaigns: Record<string, string[]> = {};
for (const e of campaigns.enrollments) {
  (oppCampaigns[e.opp_id] ??= []).push(campaignName[e.campaign_id]);
}
function campaignsFor(opp: Opp): string[] {
  const s = oppCampaigns[opp.opp_id];
  return s && s.length ? Array.from(new Set(s)).sort() : ["no campaign"];
}

// ---- Win rate primitives ---------------------------------------------------

const MIN_N = heatmaps.min_n ?? 5;

export function winRate(rows: Opp[]): { rate: number | null; n: number; won: number } {
  const closed = rows.filter((o) => o.outcome === "won" || o.outcome === "lost");
  const won = closed.filter((o) => o.outcome === "won").length;
  const n = closed.length;
  return { rate: n >= MIN_N ? Math.round((100 * won) / n) : null, n, won };
}

// ---- Geo macro (used by lib/data.ts to fill GroupRollup macro fields) ------

export function macroForTerritory(territorySlug: string) {
  const rows = opps.filter((o) => slugify(o.territory) === territorySlug);
  return { oppCount: rows.length, winRate: winRate(rows).rate, pipeline: sumPipeline(rows) };
}
export function macroForDistrict(districtSlug: string) {
  const rows = opps.filter((o) => slugify(o.district) === districtSlug);
  return { oppCount: rows.length, winRate: winRate(rows).rate, pipeline: sumPipeline(rows) };
}
function sumPipeline(rows: Opp[]): number {
  return rows.reduce((a, o) => a + o.deal_amount, 0);
}

// ---- Break-outs ------------------------------------------------------------

export function byTeam<T>(fn: (rows: Opp[]) => T): { team: Team; value: T }[] {
  const teams: Team[] = ["West", "East", "Central"];
  return teams.map((team) => ({ team, value: fn(opps.filter((o) => o.team === team)) }));
}
export function bySegment<T>(fn: (rows: Opp[]) => T): { segment: Segment; value: T }[] {
  const segs: Segment[] = ["mid-market", "enterprise", "smb"];
  return segs.map((segment) => ({ segment, value: fn(opps.filter((o) => o.segment === segment)) }));
}

/** Feature-request frequency across the book (derived, not stored). */
export function featureRequestCounts(rows: Opp[] = opps): { feature: string; count: number }[] {
  const m = new Map<string, number>();
  for (const o of rows) for (const f of o.feature_requests) m.set(f, (m.get(f) ?? 0) + 1);
  return [...m.entries()].map(([feature, count]) => ({ feature, count })).sort((a, b) => b.count - a.count);
}

/** Competitor mention frequency (from structured `competitor`, book-wide). */
export function competitorCounts(rows: Opp[] = opps): { competitor: string; count: number }[] {
  const m = new Map<string, number>();
  for (const o of rows) if (o.competitor) m.set(o.competitor, (m.get(o.competitor) ?? 0) + 1);
  return [...m.entries()].map(([competitor, count]) => ({ competitor, count })).sort((a, b) => b.count - a.count);
}

// ---- Campaign conversion (VP-ABM) ------------------------------------------

export function campaignConversion(triggeredBy: "signal" | "manual"): { rate: number; n: number; converted: number } {
  const rows = campaigns.enrollments.filter((e) => e.triggered_by === triggeredBy);
  const converted = rows.filter((e) => e.converted).length;
  return { rate: rows.length ? Math.round((100 * converted) / rows.length) : 0, n: rows.length, converted };
}

export function conversionByCampaign(): { campaign_id: string; name: string; rate: number; n: number }[] {
  return campaigns.campaigns.map((c) => {
    const rows = campaigns.enrollments.filter((e) => e.campaign_id === c.campaign_id);
    const converted = rows.filter((e) => e.converted).length;
    return { campaign_id: c.campaign_id, name: c.name, rate: rows.length ? Math.round((100 * converted) / rows.length) : 0, n: rows.length };
  });
}

// ---- Stratified signal_treated lift (VP credibility) -----------------------
// The confound: treatment is TARGETED at hard deals, so the naive number is biased.
// A stratified read is the honest one.

function isContested(o: Opp): boolean {
  return o.competitor === "Zendesk" || o.feature_requests.length > 0;
}

export function treatmentLift() {
  const closed = opps.filter((o) => o.outcome === "won" || o.outcome === "lost");
  const band = (contested: boolean) => {
    const rows = closed.filter((o) => isContested(o) === contested);
    const treated = winRate(rows.filter((o) => o.signal_treated));
    const untreated = winRate(rows.filter((o) => !o.signal_treated));
    return { treated, untreated };
  };
  const naiveT = winRate(closed.filter((o) => o.signal_treated));
  const naiveU = winRate(closed.filter((o) => !o.signal_treated));
  return {
    contested: band(true),
    easy: band(false),
    naive: { treated: naiveT, untreated: naiveU }, // confounded — footnote only
  };
}

// ---- Win-rate waterfall (deck hero, computed from the book) -----------------

export function waterfall() {
  const closed = opps.filter((o) => o.outcome === "won" || o.outcome === "lost");
  const base = closed.filter((o) => o.competitor !== "Zendesk");
  const zdk = closed.filter((o) => o.competitor === "Zendesk");
  const zdkGap = zdk.filter((o) => o.feature_requests.includes(SLACK_FEATURE));
  return {
    baseline: winRate(base),
    zendesk: winRate(zdk),
    zendeskGap: winRate(zdkGap),
  };
}

// ---- Heatmaps (precomputed) ------------------------------------------------

export function getHeatmaps(): Heatmaps {
  return heatmaps;
}

export function heatmapScopes(): string[] {
  return Object.keys(heatmaps.views);
}

export function heatmapView(scope: string): HeatmapView | undefined {
  return heatmaps.views[scope];
}

/** N of M cells with n>=MIN_N, and the percentage — the honesty readout. */
export function density(scope: string, grid: HeatmapGridKey): { dense: number; total: number; pct: number } {
  const cells = heatmaps.views[scope]?.[grid] ?? {};
  const vals = Object.values(cells);
  const dense = vals.filter((c) => c.rate !== null).length;
  const total = vals.length;
  return { dense, total, pct: total ? Math.round((100 * dense) / total) : 0 };
}

/** The deals behind a heatmap cell — recomputed live, since heatmaps.json carries
 *  no deal ids. Mirrors heatmaps.py's row_key/col_key so it matches the grid. */
export function oppsInCell(grid: HeatmapGridKey, scope: string, row: string, col: string): Opp[] {
  const inScope = opps.filter((o) => scope === "All" || o.district === scope || o.territory === scope);
  return inScope.filter((o) => {
    if (grid === "product_competitor")
      return o.product_lines.includes(row) && (o.competitor ?? "no competitor") === col;
    if (grid === "campaign_segment") return campaignsFor(o).includes(row) && o.segment === col;
    // product_campaign
    return o.product_lines.includes(row) && campaignsFor(o).includes(col);
  });
}
