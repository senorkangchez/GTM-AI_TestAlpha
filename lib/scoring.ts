// ---------------------------------------------------------------------------
// Deterministic scoring engine. Pure functions, unit-tested. NOT an LLM.
// Every number that reaches the UI is rounded and carries a legible reason.
//
// The signal score is deliberately CRM-independent (deal momentum never reads
// crm_stage), so the divergence between it and the CRM stage is meaningful.
// ---------------------------------------------------------------------------
import type {
  Divergence,
  DivergenceSeverity,
  Driver,
  MeddpiccField,
  Scored,
  Signal,
} from "./types";
import { AS_OF, ageInDays, bandOf, clamp, round } from "./format";

// ---- Tunable constants (visible on purpose) --------------------------------

export const HALF_LIFE_DAYS = 21;
export const DECAY_FLOOR = 0.1;
export const STALE_CUTOFF_DAYS = 35; // UI label; continuous decay does the real work

/** Back-half MEDDPICC predicts close, so it weighs more. Σ = 11.5. */
export const IMPORTANCE: Record<MeddpiccField, number> = {
  identify_pain: 1.0,
  metrics: 1.0,
  champion: 1.5,
  competition: 1.0,
  decision_criteria: 1.5,
  economic_buyer: 2.0,
  decision_process: 2.0,
  paper_process: 1.5,
};
const IMPORTANCE_TOTAL = Object.values(IMPORTANCE).reduce((a, b) => a + b, 0);
const BACK_HALF: MeddpiccField[] = [
  "economic_buyer",
  "decision_process",
  "paper_process",
  "decision_criteria",
];

export const THREAT_SATURATION = 3.0;
export const ENGAGEMENT_SATURATION = 2.0;
export const MOMENTUM_SATURATION = 2.5;

export const WEIGHTS = {
  meddpicc: 0.45,
  competitive: 0.2,
  engagement: 0.15,
  momentum: 0.2,
} as const;

/** CRM stage -> the signal score that stage implies. Later stage => higher bar. */
export const CRM_IMPLIED: Record<string, number> = {
  Discovery: 35,
  Evaluation: 45,
  Proposal: 60,
  Negotiation: 70,
  Commit: 78,
};

export const DIVERGENCE_MARGIN = 15;

// Keyword polarity for engagement signals (the extraction schema carries no
// explicit polarity; we read it from the evidence, deterministically).
const NEG_ENGAGEMENT = [
  "quiet",
  "less responsive",
  "losing air cover",
  "slammed",
  "swamped",
  "circle back",
  "leaning their way",
  "serious look",
  "gone quiet",
  "stalled",
  "delay",
];
const POS_ENGAGEMENT = ["momentum", "excited", "enthusiastic", "dig in", "great job"];

// ---- Core helpers ----------------------------------------------------------

export function decay(ageDays: number): number {
  return clamp(0.5 ** (ageDays / HALF_LIFE_DAYS), DECAY_FLOOR, 1);
}

function effective(sig: Signal, asOf: string): number {
  return decay(ageInDays(sig.timestamp, asOf)) * clamp(sig.confidence);
}

function engagementPolarity(sig: Signal): number {
  const text = `${sig.value} ${sig.evidence_quote}`.toLowerCase();
  if (NEG_ENGAGEMENT.some((k) => text.includes(k))) return -1;
  if (POS_ENGAGEMENT.some((k) => text.includes(k))) return 1;
  return 0;
}

const MEDDPICC_FIELDS_ORDER: MeddpiccField[] = [
  "identify_pain",
  "metrics",
  "champion",
  "competition",
  "decision_criteria",
  "economic_buyer",
  "decision_process",
  "paper_process",
];

const FIELD_LABEL: Record<MeddpiccField, string> = {
  identify_pain: "pain",
  metrics: "metrics",
  champion: "champion",
  competition: "competition",
  decision_criteria: "decision criteria",
  economic_buyer: "economic buyer",
  decision_process: "decision process",
  paper_process: "paper process",
};

// ---- The scoring function --------------------------------------------------

export function scoreAccount(signals: Signal[], asOf: string = AS_OF): Scored {
  // Per-field newest effective evidence (a competitor signal also evidences the
  // "competition" MEDDPICC field).
  const fieldEvidence = new Map<MeddpiccField, number>();
  for (const s of signals) {
    let f: MeddpiccField | null = null;
    if (s.signal_type === "meddpicc" && s.field) f = s.field;
    else if (s.signal_type === "competitor") f = "competition";
    if (!f) continue;
    fieldEvidence.set(f, Math.max(fieldEvidence.get(f) ?? 0, effective(s, asOf)));
  }

  // Driver 1 — MEDDPICC completeness (importance-weighted, decayed).
  let meddpiccRaw = 0;
  for (const f of MEDDPICC_FIELDS_ORDER) meddpiccRaw += IMPORTANCE[f] * (fieldEvidence.get(f) ?? 0);
  const meddpicc01 = clamp(meddpiccRaw / IMPORTANCE_TOTAL);
  const presentFields = MEDDPICC_FIELDS_ORDER.filter((f) => (fieldEvidence.get(f) ?? 0) > 0);
  const missing = MEDDPICC_FIELDS_ORDER.filter((f) => !presentFields.includes(f));
  const missingBackHalf = missing.filter((f) => BACK_HALF.includes(f));

  // Driver 2 — competitive threat (inverted).
  const competitorSignals = signals.filter((s) => s.signal_type === "competitor");
  const threatRaw = competitorSignals.reduce((a, s) => a + effective(s, asOf), 0);
  const competitive01 = clamp(1 - Math.min(threatRaw / THREAT_SATURATION, 1));
  const topCompetitor = competitorSignals
    .slice()
    .sort((a, b) => ageInDays(a.timestamp, asOf) - ageInDays(b.timestamp, asOf))[0];
  const compName = topCompetitor?.entity ?? null;
  const compRecencyDays = topCompetitor ? Math.round(ageInDays(topCompetitor.timestamp, asOf)) : null;

  // Driver 3 — engagement trend (going quiet = negative).
  const engagementSignals = signals.filter((s) => s.signal_type === "engagement");
  const engNet = engagementSignals.reduce((a, s) => a + engagementPolarity(s) * effective(s, asOf), 0);
  const engagement01 = clamp(0.5 + engNet / (2 * ENGAGEMENT_SATURATION));

  // Driver 4 — deal momentum (forward motion minus drag). CRM-independent.
  const forward = signals
    .filter(
      (s) =>
        (s.signal_type === "meddpicc" && s.field && BACK_HALF.includes(s.field)) ||
        s.signal_type === "win_play",
    )
    .reduce((a, s) => a + effective(s, asOf), 0);
  const drag =
    signals.filter((s) => s.signal_type === "objection").reduce((a, s) => a + effective(s, asOf), 0) +
    engagementSignals
      .filter((s) => engagementPolarity(s) < 0)
      .reduce((a, s) => a + effective(s, asOf), 0);
  const momentum01 = clamp((forward - drag) / MOMENTUM_SATURATION);

  // Blend.
  const components = { meddpicc01, competitive01, engagement01, momentum01 };
  const score01 =
    WEIGHTS.meddpicc * meddpicc01 +
    WEIGHTS.competitive * competitive01 +
    WEIGHTS.engagement * engagement01 +
    WEIGHTS.momentum * momentum01;
  const total = round(100 * score01);

  // Signed driver contributions off a 50 baseline (total = 50 + Σ contributions).
  const contribution = (w: number, s01: number) => round(w * (s01 - 0.5) * 100);
  const drivers: Driver[] = [
    {
      label: "MEDDPICC completeness",
      contribution: contribution(WEIGHTS.meddpicc, meddpicc01),
      reason:
        `${presentFields.length}/8 elements evidenced` +
        (missingBackHalf.length
          ? `; missing ${missingBackHalf.map((f) => FIELD_LABEL[f]).join(", ")}`
          : missing.length
            ? `; missing ${missing.map((f) => FIELD_LABEL[f]).join(", ")}`
            : ""),
    },
    {
      label: "Competitive threat",
      contribution: contribution(WEIGHTS.competitive, competitive01),
      reason: compName
        ? `${compName} present in ${competitorSignals.length} conversation(s), most recent ${compRecencyDays}d ago`
        : "No active competitor in the field",
    },
    {
      label: "Engagement trend",
      contribution: contribution(WEIGHTS.engagement, engagement01),
      reason:
        engNet < -0.1
          ? "Buyer cooling / champion going quiet"
          : engNet > 0.1
            ? "Positive engagement and momentum"
            : "Engagement steady",
    },
    {
      label: "Deal momentum",
      contribution: contribution(WEIGHTS.momentum, momentum01),
      reason:
        momentum01 >= 0.6
          ? "Back-half MEDDPICC and wins advancing the deal"
          : drag > forward
            ? "Stalled: objections and drag outweigh forward motion"
            : "Limited forward motion",
    },
  ];

  return { total, score01, band: bandOf(total), drivers, components };
}

// ---- Divergence ------------------------------------------------------------

function severityOf(gap: number): DivergenceSeverity {
  if (gap >= 40) return "critical";
  if (gap >= 25) return "high";
  if (gap >= DIVERGENCE_MARGIN) return "elevated";
  return "none";
}

export function computeDivergence(scored: Scored, crmStage: string): Divergence {
  const crmImpliedScore = CRM_IMPLIED[crmStage] ?? 50;
  const gap = crmImpliedScore - scored.total;
  const flagged = gap >= DIVERGENCE_MARGIN;

  // Reason chips = the negative-contribution drivers, largest magnitude first.
  const reasonChips = scored.drivers
    .filter((d) => d.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .map((d) => d.reason);

  let code: Divergence["code"] = null;
  if (flagged) code = "signal_soft_vs_crm";
  else if (scored.total - crmImpliedScore >= 20) code = "signal_hot_vs_crm";

  return {
    flagged,
    code,
    crmStage,
    crmImpliedScore,
    signalTotal: scored.total,
    gap,
    severity: severityOf(gap),
    reasonChips,
  };
}
