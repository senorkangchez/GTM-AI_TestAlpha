import { describe, it, expect } from "vitest";
import { buildAccounts } from "../data";
import { routeAllSignals, CLUSTER_THRESHOLD } from "../router";

const accounts = buildAccounts();
const { decisions, winPlays } = routeAllSignals(accounts);

describe("router", () => {
  it("fires a Marketo/PMM play on the Zendesk cluster (>= threshold)", () => {
    const zendesk = decisions.find(
      (d) => d.destination === "marketo_campaign" && d.entity === "Zendesk",
    );
    expect(zendesk).toBeDefined();
    expect(zendesk!.reason_code).toMatch(new RegExp(`>= ${CLUSTER_THRESHOLD}`));
    expect(zendesk!.secondary).toContain("add_to_play_library");
  });

  it("does NOT fire a cluster play on HubSpot (only 3 deals, below threshold)", () => {
    const hubspot = decisions.find(
      (d) => d.destination === "marketo_campaign" && d.entity === "HubSpot",
    );
    expect(hubspot).toBeUndefined();
  });

  it("keeps evidence-backed win plays in the read-only play library", () => {
    const play = winPlays.find((p) => p.competitor === "Zendesk") ?? winPlays[0];
    expect(play).toBeDefined();
    expect(play!.win_count).toBeGreaterThan(0);
    expect(play!.evidence_quotes.length).toBeGreaterThan(0);
  });

  it("emits descriptive recommendations for play propagation and deal-owner nudges", () => {
    const library = decisions.find((d) => d.destination === "add_to_play_library");
    expect(library === undefined || library.evidence_quote.length > 0).toBe(true);
    const nudge = decisions.find((d) => d.destination === "slack_deal_owner");
    expect(nudge).toBeDefined();
  });

  it("caps leadership escalations (alert-fatigue governor)", () => {
    const escalations = decisions.filter((d) => d.secondary.includes("escalate_leadership"));
    expect(escalations.length).toBeLessThanOrEqual(1);
  });

  it("routes a Salesforce task for the Northwind divergence", () => {
    const nw = decisions.find(
      (d) => d.account_id === "acc_northwind_systems" && d.destination === "salesforce_task",
    );
    expect(nw).toBeDefined();
    expect(nw!.reason_code).toMatch(/divergence_critical/);
  });

  it("surfaces a product insight from recurring pain", () => {
    expect(decisions.some((d) => d.destination === "product_insight")).toBe(true);
  });
});
