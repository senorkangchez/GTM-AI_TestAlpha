// ---------------------------------------------------------------------------
// Progression score — the SECOND dial: "how far along," NOT "how healthy."
// Deterministic, pure. Directional on purpose (not a volume tally):
//   - funnel depth: reward reaching later-stage channels (marketo→outreach→email→call)
//   - recency decay: a touch last week counts far more than one last month
//   - reciprocity: two-way (buyer replied) beats one-way (rep blasted) — the
//     guardrail that kills "spam Outreach to juice the score"
// Kept entirely separate from the §6 health score so the two dials can disagree
// (Northwind: far along AND unhealthy).
// ---------------------------------------------------------------------------
import type { Driver, ProgressionScore, Touch, TouchChannel } from "./types";
import { AS_OF, ageInDays, clamp, round } from "./format";

const FUNNEL: TouchChannel[] = ["marketo", "outreach", "email", "gong_call"];
const CHANNEL_LABEL: Record<TouchChannel, string> = {
  marketo: "marketing nurture",
  outreach: "BDR outreach",
  email: "AE email",
  gong_call: "AE call",
};

const PROG_HALF_LIFE = 21; // recency: touches decay faster than signals — activity is perishable
// Momentum counts ONLY two-way (inbound) engagement — outbound credits funnel
// depth (a channel was reached) but never momentum, so shallow one-way blasting
// can't game the score. This is the reciprocity guardrail.
const MOMENTUM_SATURATION = 2.5;

const WEIGHTS = { depth: 0.6, momentum: 0.4 };

function decayR(ageDays: number): number {
  return clamp(0.5 ** (ageDays / PROG_HALF_LIFE), 0.05, 1);
}

export function scoreProgression(touches: Touch[], asOf: string = AS_OF): ProgressionScore {
  if (touches.length === 0) {
    return {
      progression: 0,
      score01: 0,
      label: "Early",
      drivers: [{ label: "Funnel depth", contribution: 0, reason: "No recorded activity yet" }],
    };
  }

  // Depth: the deepest funnel channel reached.
  const maxIdx = Math.max(...touches.map((t) => FUNNEL.indexOf(t.channel)));
  const depth01 = maxIdx / (FUNNEL.length - 1);
  const deepest = FUNNEL[maxIdx];

  // Momentum: recency-decayed TWO-WAY (inbound) engagement only.
  const momentumRaw = touches
    .filter((t) => t.direction === "inbound")
    .reduce((a, t) => a + decayR(ageInDays(t.timestamp, asOf)), 0);
  const momentum01 = clamp(momentumRaw / MOMENTUM_SATURATION);

  // Reciprocity read: recent two-way vs recent one-way (for the reason string).
  const recent = touches.filter((t) => ageInDays(t.timestamp, asOf) <= 21);
  const recentInbound = recent.filter((t) => t.direction === "inbound").length;
  const daysSinceInbound = touches
    .filter((t) => t.direction === "inbound")
    .reduce((min, t) => Math.min(min, ageInDays(t.timestamp, asOf)), Infinity);

  const score01 = clamp(WEIGHTS.depth * depth01 + WEIGHTS.momentum * momentum01);
  const progression = round(100 * score01);
  const label: ProgressionScore["label"] =
    progression >= 70 ? "Advanced" : progression >= 45 ? "Developing" : "Early";

  const contribution = (w: number, s01: number) => round(w * (s01 - 0.5) * 100);
  const drivers: Driver[] = [
    {
      label: "Funnel depth",
      contribution: contribution(WEIGHTS.depth, depth01),
      reason:
        maxIdx >= 2
          ? `Reached ${CHANNEL_LABEL[deepest]} — AE-led, late funnel`
          : `Only early-funnel touches (${CHANNEL_LABEL[deepest]})`,
    },
    {
      label: "Recent two-way engagement",
      contribution: contribution(WEIGHTS.momentum, momentum01),
      reason:
        recentInbound > 0
          ? `${recentInbound} buyer repl${recentInbound === 1 ? "y" : "ies"} in the last 3 weeks`
          : daysSinceInbound === Infinity
            ? "No buyer replies on record (one-way)"
            : `No buyer reply in ${Math.round(daysSinceInbound)} days — activity is one-way`,
    },
  ];

  return { progression, score01, label, drivers };
}
