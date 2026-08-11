import groundTruthJson from "@/fixtures/ground_truth.json";
import type { Opp, Signal } from "./types";
import { allSignals } from "./data";
import { campaignConversion } from "./analytics";

export type FanOutLane = "Product" | "Marketing" | "Sales";

export interface FanOutAction {
  lane: FanOutLane;
  destination: string;
  mode: "would auto-fire" | "routed for the owning team";
  action: string;
  rationale: string;
}

export interface FanOut {
  signal: Signal;
  account: Opp;
  pattern: string;
  actions: FanOutAction[];
}

const opps = groundTruthJson as Opp[];
const byAccount = Object.fromEntries(opps.map((o) => [o.account_id, o]));

function signalCount(feature: string, segment: string) {
  return allSignals.filter(
    (s) => s.signal_type === "feature_request" && s.entity === feature && byAccount[s.account_id]?.segment === segment,
  ).length;
}

/** Deterministic, read-only recommendations. No action mutates a source system. */
export function buildFanOuts(limit = 12): FanOut[] {
  const featureSignals = allSignals
    .filter((s) => s.signal_type === "feature_request")
    .filter((s) => byAccount[s.account_id])
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const signalRate = campaignConversion("signal").rate;
  const manualRate = campaignConversion("manual").rate;

  return featureSignals.slice(0, limit).map((signal) => {
    const account = byAccount[signal.account_id];
    const feature = signal.entity ?? "requested capability";
    const competitor = account.competitor ?? "the current alternative";
    const segmentCount = signalCount(feature, account.segment);
    const productCount = allSignals.filter(
      (s) => s.signal_type === "feature_request" && s.entity === feature,
    ).length;
    return {
      signal,
      account,
      pattern: `${feature} is recurring in ${account.segment} (${segmentCount} cited request${segmentCount === 1 ? "" : "s"} in the conversation sample).`,
      actions: [
        {
          lane: "Product",
          destination: "Product prioritization",
          mode: "routed for the owning team",
          action: `Log ${feature} as a product request`,
          rationale: `${productCount} evidence-backed request${productCount === 1 ? "" : "s"} across the field; ranked from signal frequency and pipeline context.`,
        },
        {
          lane: "Marketing",
          destination: "Marketo nurture",
          mode: "routed for the owning team",
          action: `Recommend the ${competitor} displacement / ${feature} nurture track`,
          rationale: `Signal-triggered enrollments convert at ${signalRate}% versus ${manualRate}% for manual sends in the synthetic book.`,
        },
        {
          lane: "Sales",
          destination: "Rep play library",
          mode: "would auto-fire",
          action: `Surface the winning migration play for ${account.account}`,
          rationale: `The same competitor pattern has a proven zero-downtime migration story that can be reused by the owning rep.`,
        },
      ],
    };
  });
}

