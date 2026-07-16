import { describe, it, expect } from "vitest";
import { rollupScore, buildGroupRollup } from "../rollup";
import { healthySignals, atRiskSignals, makeAccount } from "./helpers";

describe("rollups", () => {
  const a = makeAccount("acc_a", "Alpha", "Commit", 480000, atRiskSignals());
  const b = makeAccount("acc_b", "Bravo", "Evaluation", 220000, healthySignals());
  const c = makeAccount("acc_c", "Charlie", "Proposal", 150000, healthySignals(), "west-commercial");
  const d = makeAccount("acc_d", "Delta", "Discovery", 300000, atRiskSignals(), "west-commercial");

  it("is dollar-weighted, not a simple average", () => {
    const rolled = rollupScore([
      { score: a.score, dealValue: a.deal_amount },
      { score: b.score, dealValue: b.deal_amount },
    ]);
    // a ($480k, low) dominates b ($220k, high) -> weighted mean below the midpoint
    const simpleAvg = (a.score.score01 + b.score.score01) / 2;
    expect(rolled.components.meddpicc01).toBeLessThan(
      (a.score.components.meddpicc01 + b.score.components.meddpicc01) / 2 + 0.01,
    );
    // weighted toward the larger, lower-scoring deal
    expect(rolled.score01).toBeLessThan(simpleAvg);
  });

  it("district-from-accounts equals district-from-territories (associativity)", () => {
    const enterprise = buildGroupRollup("west-enterprise", "Enterprise", "territory", [a, b]);
    const commercial = buildGroupRollup("west-commercial", "Commercial", "territory", [c, d]);

    const districtFromTerritories = rollupScore([
      { score: enterprise.score, dealValue: enterprise.dealValue },
      { score: commercial.score, dealValue: commercial.dealValue },
    ]);
    const districtFromAccounts = rollupScore(
      [a, b, c, d].map((x) => ({ score: x.score, dealValue: x.deal_amount })),
    );

    (["meddpicc01", "competitive01", "engagement01", "momentum01"] as const).forEach((k) => {
      expect(districtFromTerritories.components[k]).toBeCloseTo(
        districtFromAccounts.components[k],
        6,
      );
    });
    expect(districtFromTerritories.total).toBe(districtFromAccounts.total);
  });

  it("sums diverging pipeline from flagged accounts only", () => {
    const grp = buildGroupRollup("west", "West", "district", [a, b, c, d]);
    // a (Commit, at_risk) and d (Discovery) — only Commit-vs-soft flags; b/c healthy
    const flaggedValue = [a, b, c, d]
      .filter((x) => x.divergence.flagged)
      .reduce((s, x) => s + x.deal_amount, 0);
    expect(grp.divergingPipeline).toBe(flaggedValue);
    expect(grp.divergingPipeline).toBeGreaterThan(0); // account a diverges
    expect(grp.flaggedAccounts[0].account_id).toBe("acc_a"); // largest gap first
  });
});
