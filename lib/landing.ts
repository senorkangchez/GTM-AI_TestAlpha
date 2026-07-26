// The "landing" receipt: how each MEDDPICC field on an account got populated from
// a conversation — source → extracted field → verbatim evidence. Present fields are
// human-gated suggestions (Accept/Reject); absent fields are shown greyed (absence
// is itself signal). Consumed by the account landing panel and the global queue.
import type { AccountModel, LandingRow, MeddpiccField, Signal } from "./types";

const FIELD_ORDER: MeddpiccField[] = [
  "identify_pain",
  "metrics",
  "champion",
  "competition",
  "decision_criteria",
  "economic_buyer",
  "decision_process",
  "paper_process",
];

export const FIELD_LABEL: Record<MeddpiccField, string> = {
  identify_pain: "Identify pain",
  metrics: "Metrics",
  champion: "Champion",
  competition: "Competition",
  decision_criteria: "Decision criteria",
  economic_buyer: "Economic buyer",
  decision_process: "Decision process",
  paper_process: "Paper process",
};

function establishingSignal(field: MeddpiccField, signals: Signal[]): Signal | null {
  const candidates = signals.filter((s) =>
    field === "competition"
      ? s.signal_type === "competitor" || s.field === "competition"
      : s.signal_type === "meddpicc" && s.field === field,
  );
  if (!candidates.length) return null;
  return candidates.slice().sort((a, b) => b.confidence - a.confidence)[0];
}

export function buildLanding(account: AccountModel): LandingRow[] {
  return FIELD_ORDER.map((field) => {
    const s = establishingSignal(field, account.signals);
    if (!s) {
      return {
        key: `${account.account_id}:${field}`,
        account_id: account.account_id,
        account_name: account.account_name,
        field,
        present: false,
        suggested_value: "not yet evidenced",
        source: null,
        timestamp: null,
        value: "",
        evidence_quote: null,
        confidence: 0,
        envelope_id: null,
      };
    }
    return {
      key: s.signal_id,
      account_id: account.account_id,
      account_name: account.account_name,
      field,
      present: true,
      suggested_value: field === "competition" && s.entity ? s.entity : "evidenced",
      source: s.source,
      timestamp: s.timestamp,
      value: s.value,
      evidence_quote: s.evidence_quote,
      confidence: s.confidence,
      envelope_id: s.envelope_id,
    };
  });
}
