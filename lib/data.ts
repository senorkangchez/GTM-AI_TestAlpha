// Composes the derived model the UI consumes, from the committed fixtures.
// Pure + deterministic: extraction is precomputed, scoring/rollup/divergence run
// here at build/server time. No LLM, no per-request cost.
//
// v3 split: ground_truth.json is now the 600-opp analytics book. Only the ~30 rows
// with has_conversations get a scored AccountModel (they alone have envelopes /
// signals / touches). Geography is read from the opp (slugified), not a separate
// enrichment file. The full 600-opp macro rollup lives in lib/analytics.ts.
import envelopesJson from "@/fixtures/envelopes.json";
import signalsJson from "@/fixtures/signals.precomputed.json";
import groundTruthJson from "@/fixtures/ground_truth.json";
import metaJson from "@/fixtures/signals.meta.json";
import touchesJson from "@/fixtures/touches.json";
import type { AccountModel, GroupRollup, Opp, Signal, SignalEnvelope, Touch } from "./types";
import { scoreAccount, computeDivergence } from "./scoring";
import { scoreProgression } from "./progression";
import { computeRubric, computeProcessDivergence } from "./rubric";
import { buildGroupRollup } from "./rollup";
import { slugify, geoTitle, listTerritorySlugs, listDistrictSlugs } from "./geo";
import { macroForTerritory, macroForDistrict } from "./analytics";
import { AS_OF } from "./format";

const PRIOR = new Date(new Date(AS_OF).getTime() - 7 * 86_400_000).toISOString();

const envelopes = envelopesJson as SignalEnvelope[];
const signals = signalsJson as Signal[];

/** All validated signals, including those from historical won accounts (win-wires). */
export const allSignals = signals;

const touches = touchesJson as Touch[];
export const allTouches = touches;
function touchesForAccount(accountId: string): Touch[] {
  return touches.filter((t) => t.account_id === accountId);
}

const allOpps = groundTruthJson as Opp[];
// Only these get a scored account model — they have conversations to extract from.
const conversationOpps = allOpps.filter((o) => o.has_conversations);

export interface ExtractionMeta {
  mode: "live" | "mock";
  model: string;
  envelopes: number;
  signals: number;
  by_type: Record<string, number>;
  envelopes_with_zero_signals: number;
}
export const extractionMeta = metaJson as ExtractionMeta;

export const envelopeById: Record<string, SignalEnvelope> = Object.fromEntries(
  envelopes.map((e) => [e.envelope_id, e]),
);

function signalsForAccount(accountId: string): Signal[] {
  return signals.filter((s) => s.account_id === accountId);
}

/** Build the ~30 scored account models (has_conversations opps only). */
export function buildAccounts(): AccountModel[] {
  return conversationOpps.map((o) => {
    const accSignals = signalsForAccount(o.account_id);
    const score = scoreAccount(accSignals, AS_OF);
    const scorePrior = scoreAccount(accSignals, PRIOR);
    const rubric = computeRubric(o.account_id, accSignals);
    const accTouches = touchesForAccount(o.account_id);
    return {
      account_id: o.account_id,
      account_name: o.account,
      opp_id: o.opp_id,
      crm_stage: o.crm_stage,
      deal_amount: o.deal_amount,
      territory: slugify(o.territory),
      district: slugify(o.district),
      segment: o.segment,
      team: o.team,
      signals: accSignals,
      touches: accTouches,
      score,
      scorePrior,
      progression: scoreProgression(accTouches, AS_OF),
      divergence: computeDivergence(score, o.crm_stage),
      rubric,
      processDivergence: computeProcessDivergence(rubric, o.crm_stage),
    };
  });
}

/** Territory rollups. Iterate the derived geo registry (superset), assign scored
 *  accounts by slug, and merge the full-book macro numbers so a territory with 0
 *  scored accounts still shows real opp count / win-rate / pipeline. */
export function buildTerritories(accounts: AccountModel[]): GroupRollup[] {
  return listTerritorySlugs().map((slug) => {
    const accts = accounts.filter((a) => a.territory === slug);
    const base = buildGroupRollup(slug, geoTitle(slug), "territory", accts);
    return { ...base, ...macroForTerritory(slug) };
  });
}

export function buildDistricts(accounts: AccountModel[]): GroupRollup[] {
  return listDistrictSlugs().map((slug) => {
    const accts = accounts.filter((a) => a.district === slug);
    const base = buildGroupRollup(slug, geoTitle(slug), "district", accts);
    return { ...base, ...macroForDistrict(slug) };
  });
}

/** Recent signals as change-feed rows (newest first). */
export function changeFeed(accounts: AccountModel[], limit = 60) {
  const byId = Object.fromEntries(accounts.map((a) => [a.account_id, a]));
  return signals
    .filter((s) => byId[s.account_id]) // only scored accounts
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit)
    .map((s) => ({
      signal: s,
      account_name: byId[s.account_id].account_name,
      source: s.source,
    }));
}
