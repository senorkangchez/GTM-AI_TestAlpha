import { describe, it, expect } from "vitest";
import { scoreAccount, computeDivergence, CRM_IMPLIED } from "../scoring";
import { healthySignals, atRiskSignals } from "./helpers";

describe("computeDivergence", () => {
  it("flags a Commit deal whose signal is soft (the Northwind hero)", () => {
    const s = scoreAccount(atRiskSignals());
    const d = computeDivergence(s, "Commit");
    expect(d.flagged).toBe(true);
    expect(d.code).toBe("signal_soft_vs_crm");
    expect(d.severity).toBe("critical"); // gap >= 40
    expect(d.crmImpliedScore).toBe(CRM_IMPLIED.Commit);
    expect(d.reasonChips.length).toBeGreaterThan(0);
  });

  it("does not flag a healthy deal at Commit", () => {
    const s = scoreAccount(healthySignals());
    const d = computeDivergence(s, "Commit");
    expect(d.flagged).toBe(false);
  });

  it("does not flag a soft signal at an early stage (low implied bar)", () => {
    const s = scoreAccount(atRiskSignals());
    const d = computeDivergence(s, "Discovery");
    // Discovery implies only 35, so a low signal score is not a divergence.
    expect(d.flagged).toBe(false);
  });

  it("gap is crmImplied minus signal total", () => {
    const s = scoreAccount(atRiskSignals());
    const d = computeDivergence(s, "Negotiation");
    expect(d.gap).toBe(CRM_IMPLIED.Negotiation - s.total);
  });
});
