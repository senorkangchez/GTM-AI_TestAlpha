// Test factories for building synthetic Signals / AccountModels.
import type { AccountModel, MeddpiccField, Signal, SignalType } from "../types";
import { AS_OF } from "../format";
import { scoreAccount, computeDivergence } from "../scoring";

export function daysAgo(n: number): string {
  return new Date(new Date(AS_OF).getTime() - n * 86_400_000).toISOString();
}

let counter = 0;
export function sig(p: {
  type: SignalType;
  field?: MeddpiccField | null;
  entity?: string | null;
  value?: string;
  quote?: string;
  confidence?: number;
  ageDays?: number;
}): Signal {
  counter += 1;
  return {
    signal_id: `test-${counter}`,
    envelope_id: `env-${counter}`,
    account_id: "acc_test",
    opp_id: "opp_test",
    source: "gong_call",
    signal_type: p.type,
    field: p.field ?? null,
    entity: p.entity ?? null,
    value: p.value ?? "",
    evidence_quote: p.quote ?? "evidence",
    confidence: p.confidence ?? 0.9,
    timestamp: daysAgo(p.ageDays ?? 3),
  };
}

/** A fully-evidenced, fresh, uncontested account -> healthy. */
export function healthySignals(): Signal[] {
  const fields: MeddpiccField[] = [
    "identify_pain",
    "metrics",
    "champion",
    "competition",
    "decision_criteria",
    "economic_buyer",
    "decision_process",
    "paper_process",
  ];
  return [
    ...fields.map((f) => sig({ type: "meddpicc", field: f, ageDays: 3, confidence: 0.9 })),
    sig({ type: "win_play", ageDays: 5, confidence: 0.9, value: "migration story won it" }),
    sig({ type: "engagement", ageDays: 3, confidence: 0.9, value: "a lot of momentum, team is excited" }),
  ];
}

/** Northwind-like: soft front-half, no back-half EB/process, Zendesk rising, champion quiet. */
export function atRiskSignals(): Signal[] {
  return [
    sig({ type: "meddpicc", field: "identify_pain", ageDays: 30, confidence: 0.9 }),
    sig({ type: "meddpicc", field: "metrics", ageDays: 30, confidence: 0.85 }),
    sig({ type: "meddpicc", field: "champion", ageDays: 32, confidence: 0.85 }),
    sig({ type: "meddpicc", field: "decision_criteria", ageDays: 20, confidence: 0.7 }),
    sig({ type: "competitor", entity: "Zendesk", ageDays: 32, confidence: 0.9 }),
    sig({ type: "competitor", entity: "Zendesk", ageDays: 20, confidence: 0.9 }),
    sig({ type: "competitor", entity: "Zendesk", ageDays: 8, confidence: 0.9 }),
    sig({ type: "engagement", ageDays: 32, confidence: 0.8, value: "less responsive, losing air cover" }),
    sig({ type: "engagement", ageDays: 20, confidence: 0.8, value: "things have gotten quieter internally" }),
    sig({ type: "objection", ageDays: 20, confidence: 0.85, value: "leaning their way, serious look at Zendesk" }),
    sig({ type: "objection", ageDays: 8, confidence: 0.85, value: "Zendesk is cheaper pushback" }),
  ];
}

export function makeAccount(
  account_id: string,
  account_name: string,
  crm_stage: string,
  deal_amount: number,
  signals: Signal[],
  territory = "west-enterprise",
  district = "west",
): AccountModel {
  const score = scoreAccount(signals);
  return {
    account_id,
    account_name,
    opp_id: "opp_" + account_id,
    crm_stage,
    deal_amount,
    territory,
    district,
    signals,
    score,
    scorePrior: score,
    divergence: computeDivergence(score, crm_stage),
    rubric: null,
    processDivergence: null,
  };
}
