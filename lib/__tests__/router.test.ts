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

  it("promotes the Zendesk migration play to golden (3 wins) and propagates to open deals", () => {
    const zplay = winPlays.find((p) => p.competitor === "Zendesk");
    expect(zplay).toBeDefined();
    expect(zplay!.status).toBe("golden");
    expect(zplay!.win_count).toBeGreaterThanOrEqual(3);
    expect(zplay!.propagate_to.length).toBeGreaterThan(0);
    expect(zplay!.propagate_to.some((p) => p.account_id === "acc_northwind")).toBe(true);
  });

  it("battlecard and leadership destinations require approval; a Slack nudge does not", () => {
    const library = decisions.find((d) => d.destination === "add_to_play_library");
    expect(library?.requires_approval).toBe(true);
    const nudge = decisions.find((d) => d.destination === "slack_deal_owner");
    expect(nudge?.requires_approval).toBe(false);
  });

  it("caps leadership escalations (alert-fatigue governor)", () => {
    const escalations = decisions.filter((d) => d.secondary.includes("escalate_leadership"));
    expect(escalations.length).toBeLessThanOrEqual(1);
  });

  it("routes a Salesforce task for the Northwind divergence", () => {
    const nw = decisions.find(
      (d) => d.account_id === "acc_northwind" && d.destination === "salesforce_task",
    );
    expect(nw).toBeDefined();
    expect(nw!.reason_code).toMatch(/divergence_critical/);
  });

  it("surfaces a product insight from recurring pain", () => {
    expect(decisions.some((d) => d.destination === "product_insight")).toBe(true);
  });
});
