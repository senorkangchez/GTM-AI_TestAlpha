import { describe, it, expect } from "vitest";
import { decay, scoreAccount, DECAY_FLOOR } from "../scoring";
import { bandOf } from "../format";
import { healthySignals, atRiskSignals, sig } from "./helpers";

describe("decay", () => {
  it("gives full credit inside the grace window, then decays", () => {
    expect(decay(0)).toBe(1);
    expect(decay(14)).toBe(1); // grace window
    expect(decay(14 + 45)).toBeCloseTo(0.5, 2); // one half-life past grace
    expect(decay(20)).toBeLessThan(1);
  });
  it("floors at DECAY_FLOOR for very old evidence", () => {
    expect(decay(400)).toBe(DECAY_FLOOR);
  });
});

describe("band thresholds", () => {
  it("maps totals to bands at the named boundaries", () => {
    expect(bandOf(54)).toBe("at_risk");
    expect(bandOf(55)).toBe("watch");
    expect(bandOf(74)).toBe("watch");
    expect(bandOf(75)).toBe("healthy");
  });
});

describe("scoreAccount", () => {
  it("scores a fully-evidenced fresh account as healthy", () => {
    const s = scoreAccount(healthySignals());
    expect(s.total).toBeGreaterThanOrEqual(75);
    expect(s.band).toBe("healthy");
    expect(s.drivers.every((d) => d.contribution >= 0)).toBe(true);
  });

  it("scores a Northwind-like account as at_risk", () => {
    const s = scoreAccount(atRiskSignals());
    expect(s.total).toBeLessThan(55);
    expect(s.band).toBe("at_risk");
    // MEDDPICC and momentum should be the loudest negatives.
    const meddpicc = s.drivers.find((d) => d.label === "MEDDPICC completeness")!;
    const momentum = s.drivers.find((d) => d.label === "Deal momentum")!;
    expect(meddpicc.contribution).toBeLessThan(0);
    expect(momentum.contribution).toBeLessThan(0);
    expect(meddpicc.reason).toMatch(/economic buyer|paper process|decision process/);
  });

  it("total equals 50 + sum of driver contributions (within rounding)", () => {
    const s = scoreAccount(atRiskSignals());
    const sum = 50 + s.drivers.reduce((a, d) => a + d.contribution, 0);
    expect(Math.abs(sum - s.total)).toBeLessThanOrEqual(2);
  });

  it("returns a neutral-ish score for an empty signal set", () => {
    const s = scoreAccount([]);
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
  });

  it("penalizes stale evidence relative to fresh evidence", () => {
    const fresh = scoreAccount([sig({ type: "meddpicc", field: "champion", ageDays: 1 })]);
    const stale = scoreAccount([sig({ type: "meddpicc", field: "champion", ageDays: 60 })]);
    expect(fresh.total).toBeGreaterThan(stale.total);
  });
});
