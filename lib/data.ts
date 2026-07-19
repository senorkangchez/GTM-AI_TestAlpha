// Composes the derived model the UI consumes, from the committed fixtures.
// Pure + deterministic: extraction is precomputed, scoring/rollup/divergence run
// here at build/server time. No LLM, no per-request cost.
import envelopesJson from "@/fixtures/envelopes.json";
import signalsJson from "@/fixtures/signals.precomputed.json";
import groundTruthJson from "@/fixtures/ground_truth.json";
import metaJson from "@/fixtures/signals.meta.json";
import type { AccountModel, GroupRollup, Signal, SignalEnvelope } from "./types";
import { scoreAccount, computeDivergence } from "./scoring";
import { computeRubric, computeProcessDivergence } from "./rubric";
import { buildGroupRollup } from "./rollup";
import { getEnrichment, buildOrgTree, orgTitle } from "./org";
import { AS_OF } from "./format";

const PRIOR = new Date(new Date(AS_OF).getTime() - 7 * 86_400_000).toISOString();

const envelopes = envelopesJson as SignalEnvelope[];
const signals = signalsJson as Signal[];

/** All validated signals, including those from historical won accounts (win-wires). */
export const allSignals = signals;

interface GroundTruth {
  account: string;
  account_id: string;
  opp_id: string;
  crm_stage: string;
  competitor: string | null;
  trajectory: string;
  has_win_play: boolean;
}
const groundTruth = groundTruthJson as GroundTruth[];

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

/** Build the 12 scored account models. */
export function buildAccounts(): AccountModel[] {
  return groundTruth.map((g) => {
    const accSignals = signalsForAccount(g.account_id);
    const enr = getEnrichment(g.account_id);
    const score = scoreAccount(accSignals, AS_OF);
    const scorePrior = scoreAccount(accSignals, PRIOR);
    const rubric = computeRubric(g.account_id, accSignals);
    return {
      account_id: g.account_id,
      account_name: g.account,
      opp_id: g.opp_id,
      crm_stage: g.crm_stage,
      deal_amount: enr?.deal_amount ?? 0,
      territory: enr?.territory ?? "unassigned",
      district: enr?.district ?? "unassigned",
      signals: accSignals,
      score,
      scorePrior,
      divergence: computeDivergence(score, g.crm_stage),
      rubric,
      processDivergence: computeProcessDivergence(rubric, g.crm_stage),
    };
  });
}

export function buildTerritories(accounts: AccountModel[]): GroupRollup[] {
  const tree = buildOrgTree();
  const out: GroupRollup[] = [];
  for (const territories of Object.values(tree)) {
    for (const territory of Object.keys(territories)) {
      const accts = accounts.filter((a) => a.territory === territory);
      out.push(buildGroupRollup(territory, orgTitle(territory), "territory", accts));
    }
  }
  return out;
}

export function buildDistricts(accounts: AccountModel[]): GroupRollup[] {
  const tree = buildOrgTree();
  return Object.keys(tree).map((district) => {
    const accts = accounts.filter((a) => a.district === district);
    return buildGroupRollup(district, orgTitle(district), "district", accts);
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
