// ---------------------------------------------------------------------------
// Deterministic router. NOT an agent. Candidate destinations -> scored urgency ->
// guardrails -> reason-coded decision. Destinations map to the real stack
// (Slack / Outreach / Marketo / Salesforce / #product / play library).
//
// Every decision carries a reason_code and requires_approval flag. The
// alert-fatigue governor caps how many escalations a recipient gets.
// ---------------------------------------------------------------------------
import type { AccountModel, Destination, RoutingDecision, Signal, WinPlay } from "./types";
import { allSignals, envelopeById } from "./data";
import { clamp, round, currency } from "./format";

const COMPETITORS = ["Zendesk", "ServiceNow", "Zoho", "HubSpot", "Intercom"];

// Thresholds (visible on purpose).
export const CLUSTER_THRESHOLD = 4; // competitor deals in-segment to fire a PMM/Marketo play
export const GOLDEN_ROUTE_MIN = 3; // wins citing a play before it may propagate
const CLUSTER_SATURATION = 6;
const LOAD_SATURATION = 5;
const LEADERSHIP_ESCALATION_CAP = 1; // alert-fatigue governor

const STAGE_LEVERAGE: Record<string, number> = {
  Discovery: 0.2,
  Evaluation: 0.4,
  Proposal: 0.6,
  Negotiation: 0.8,
  Commit: 1.0,
};

function urgency(p: {
  confidence: number;
  cluster: number;
  dealNorm: number;
  stage: string;
  load: number;
}): number {
  return round(
    clamp(
      0.3 * p.confidence +
        0.3 * Math.min(p.cluster / CLUSTER_SATURATION, 1) +
        0.15 * p.dealNorm +
        0.15 * (STAGE_LEVERAGE[p.stage] ?? 0.3) -
        0.3 * Math.min(p.load / LOAD_SATURATION, 1),
    ),
    2,
  );
}

// ---- Win plays / golden routes ---------------------------------------------

/** Competitor named on the same envelope as a win_play. */
function competitorForEnvelope(envId: string): string | null {
  const c = allSignals.find((s) => s.envelope_id === envId && s.signal_type === "competitor");
  if (c?.entity) return c.entity;
  const env = envelopeById[envId];
  return env ? (COMPETITORS.find((n) => env.raw_text.includes(n)) ?? null) : null;
}

export function buildWinPlays(accounts: AccountModel[]): WinPlay[] {
  const openByCompetitor = new Map<string, { account_id: string; account_name: string }[]>();
  for (const a of accounts) {
    const comp = a.signals.find((s) => s.signal_type === "competitor")?.entity;
    if (!comp) continue;
    // "open" = a live pipeline deal that is not itself a win source
    const hasWin = a.signals.some((s) => s.signal_type === "win_play");
    if (hasWin) continue;
    const list = openByCompetitor.get(comp) ?? [];
    list.push({ account_id: a.account_id, account_name: a.account_name });
    openByCompetitor.set(comp, list);
  }

  const wins = allSignals.filter((s) => s.signal_type === "win_play");
  const byCompetitor = new Map<string, Signal[]>();
  for (const w of wins) {
    const comp = competitorForEnvelope(w.envelope_id);
    if (!comp) continue;
    byCompetitor.set(comp, [...(byCompetitor.get(comp) ?? []), w]);
  }

  const plays: WinPlay[] = [];
  for (const [competitor, sigs] of byCompetitor) {
    const sources = Array.from(new Set(sigs.map((s) => s.account_id)));
    const winCount = sources.length;
    plays.push({
      play_id: `play_${competitor.toLowerCase()}`,
      competitor,
      summary: sigs[0].evidence_quote,
      source_account_ids: sources,
      evidence_quotes: Array.from(new Set(sigs.map((s) => s.evidence_quote))),
      win_count: winCount,
      status: winCount >= GOLDEN_ROUTE_MIN ? "golden" : "emerging",
      propagate_to: openByCompetitor.get(competitor) ?? [],
      requires_approval: true,
    });
  }
  return plays.sort((a, b) => b.win_count - a.win_count);
}

// ---- The routing pass ------------------------------------------------------

export function routeAllSignals(accounts: AccountModel[]): {
  decisions: RoutingDecision[];
  winPlays: WinPlay[];
  loggedOnly: number;
} {
  const decisions: RoutingDecision[] = [];
  const maxDeal = Math.max(...accounts.map((a) => a.deal_amount), 1);
  const byId = Object.fromEntries(accounts.map((a) => [a.account_id, a]));

  // Competitor cluster sizes (distinct in-pipeline accounts per competitor).
  // Membership requires the competitor to appear in an actual deal conversation
  // (call/email) — a Slack price-gripe alone doesn't put a vendor in the eval.
  const clusters = new Map<string, Set<string>>();
  for (const a of accounts)
    for (const s of a.signals)
      if (
        s.signal_type === "competitor" &&
        s.entity &&
        (s.source === "gong_call" || s.source === "gong_email")
      ) {
        clusters.set(s.entity, (clusters.get(s.entity) ?? new Set()).add(a.account_id));
      }

  const winPlays = buildWinPlays(accounts);
  let loggedOnly = 0;
  const push = (d: RoutingDecision) => decisions.push(d);

  // A. Golden-route propagation (win plays). Requires approval; pushes to open deals.
  for (const play of winPlays) {
    if (play.status !== "golden") continue;
    push({
      signal_id: play.play_id,
      account_id: play.source_account_ids[0] ?? "",
      account_name: `${play.win_count} wins vs ${play.competitor}`,
      signal_type: "win_play",
      entity: play.competitor,
      destination: "add_to_play_library",
      secondary: ["slack_deal_owner", "outreach_task"],
      requires_approval: true,
      reason_code: `golden_route: ${play.win_count} wins vs ${play.competitor} -> propagate to ${play.propagate_to.length} open deals`,
      urgency: urgency({ confidence: 0.95, cluster: play.win_count, dealNorm: 1, stage: "Negotiation", load: 0 }),
      evidence_quote: play.summary,
    });
  }

  // B. Competitor clusters -> Marketo/PMM + play library (once per competitor).
  for (const [entity, accts] of clusters) {
    if (accts.size < CLUSTER_THRESHOLD) continue;
    const rep = allSignals
      .filter((s) => s.signal_type === "competitor" && s.entity === entity)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0];
    push({
      signal_id: `cluster_${entity.toLowerCase()}`,
      account_id: "",
      account_name: `${accts.size} deals vs ${entity}`,
      signal_type: "competitor",
      entity,
      destination: "marketo_campaign",
      secondary: ["add_to_play_library"],
      requires_approval: true,
      reason_code: `competitor_cluster: ${entity} active in ${accts.size} deals this segment (>= ${CLUSTER_THRESHOLD})`,
      urgency: urgency({ confidence: 0.9, cluster: accts.size, dealNorm: 0.8, stage: "Evaluation", load: 0 }),
      evidence_quote: rep?.evidence_quote ?? "",
    });
  }

  // C. Divergence -> Salesforce task; critical + high-value -> leadership (capped).
  let leadershipEscalations = 0;
  const criticals = accounts
    .filter((a) => a.divergence.flagged && a.divergence.severity !== "elevated")
    .sort((a, b) => b.divergence.gap - a.divergence.gap);
  for (const a of criticals) {
    const dealNorm = a.deal_amount / maxDeal;
    const highValue = a.deal_amount >= 0.5 * maxDeal;
    const canEscalate =
      a.divergence.severity === "critical" && highValue && leadershipEscalations < LEADERSHIP_ESCALATION_CAP;
    const secondary: Destination[] = [];
    if (canEscalate) {
      secondary.push("escalate_leadership");
      leadershipEscalations += 1;
    }
    push({
      signal_id: `divergence_${a.account_id}`,
      account_id: a.account_id,
      account_name: a.account_name,
      signal_type: "engagement",
      entity: null,
      destination: "salesforce_task",
      secondary,
      requires_approval: canEscalate, // leadership escalation is draft-only
      reason_code:
        `divergence_${a.divergence.severity}: CRM ${a.crm_stage} vs signal ${a.divergence.signalTotal} (gap ${a.divergence.gap})` +
        (canEscalate
          ? ` -> escalate ${currency(a.deal_amount)} deal`
          : a.divergence.severity === "critical" && highValue
            ? " (leadership alert suppressed: alert-fatigue cap)"
            : ""),
      urgency: urgency({
        confidence: 0.9,
        cluster: 0,
        dealNorm,
        stage: a.crm_stage,
        load: canEscalate ? 0 : leadershipEscalations,
      }),
      evidence_quote: a.divergence.reasonChips[0] ?? "Signal is soft versus CRM stage.",
    });
  }

  // D. Late-stage competitor -> deal-owner Slack nudge + Outreach task.
  for (const a of accounts) {
    if (a.crm_stage !== "Negotiation" && a.crm_stage !== "Commit") continue;
    const comp = a.signals.find((s) => s.signal_type === "competitor");
    if (!comp?.entity) continue;
    push({
      signal_id: `nudge_${a.account_id}`,
      account_id: a.account_id,
      account_name: a.account_name,
      signal_type: "competitor",
      entity: comp.entity,
      destination: "slack_deal_owner",
      secondary: ["outreach_task"],
      requires_approval: false, // autonomous tier: a nudge to one rep
      reason_code: `late_stage_competitor: ${comp.entity} in a ${a.crm_stage} deal`,
      urgency: urgency({
        confidence: comp.confidence,
        cluster: clusters.get(comp.entity)?.size ?? 1,
        dealNorm: a.deal_amount / maxDeal,
        stage: a.crm_stage,
        load: 1,
      }),
      evidence_quote: comp.evidence_quote,
    });
  }

  // E. Recurring pain across deals -> product insight.
  const painByTheme = new Map<string, Set<string>>();
  const painQuote = new Map<string, string>();
  for (const s of allSignals) {
    if (s.signal_type !== "meddpicc" || s.field !== "identify_pain") continue;
    if (!byId[s.account_id]) continue;
    const theme = s.value.toLowerCase().includes("first-response")
      ? "first-response time visibility"
      : s.evidence_quote;
    painByTheme.set(theme, (painByTheme.get(theme) ?? new Set()).add(s.account_id));
    if (!painQuote.has(theme)) painQuote.set(theme, s.evidence_quote);
  }
  for (const [theme, accts] of painByTheme) {
    if (accts.size < 3) continue;
    push({
      signal_id: `product_${theme.slice(0, 12).replace(/\W+/g, "_")}`,
      account_id: "",
      account_name: `${accts.size} accounts`,
      signal_type: "objection",
      entity: null,
      destination: "product_insight",
      secondary: [],
      requires_approval: true,
      reason_code: `recurring_pain: same gap raised across ${accts.size} accounts -> route to product`,
      urgency: urgency({ confidence: 0.85, cluster: accts.size, dealNorm: 0.5, stage: "Evaluation", load: 0 }),
      evidence_quote: painQuote.get(theme) ?? theme,
    });
  }

  // Everything not routed above is logged (audit trail / noise suppression).
  const routedSignalIds = new Set(decisions.map((d) => d.signal_id));
  loggedOnly = allSignals.filter((s) => !routedSignalIds.has(s.signal_id)).length;

  decisions.sort((a, b) => b.urgency - a.urgency);
  return { decisions, winPlays, loggedOnly };
}
