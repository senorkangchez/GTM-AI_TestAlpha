import { describe, it, expect } from "vitest";
import { scoreProgression } from "../progression";
import { buildAccounts } from "../data";
import type { Touch, TouchChannel, TouchDirection } from "../types";
import { daysAgo } from "./helpers";

let n = 0;
function touch(channel: TouchChannel, direction: TouchDirection, ageDays: number): Touch {
  n += 1;
  return {
    touch_id: `t${n}`,
    account_id: "acc_test",
    opp_id: "opp_test",
    channel,
    direction,
    timestamp: daysAgo(ageDays),
    summary: "x",
  };
}

describe("scoreProgression", () => {
  it("is 0 / Early with no activity", () => {
    const p = scoreProgression([]);
    expect(p.progression).toBe(0);
    expect(p.label).toBe("Early");
  });

  it("rates a deep, recent, two-way deal Advanced", () => {
    const p = scoreProgression([
      touch("marketo", "inbound", 35),
      touch("outreach", "inbound", 25),
      touch("email", "inbound", 10),
      touch("gong_call", "inbound", 4),
      touch("gong_call", "inbound", 2),
    ]);
    expect(p.label).toBe("Advanced");
    expect(p.progression).toBeGreaterThanOrEqual(70);
  });

  it("keeps a deep-but-quiet deal high on progression (far along) — reciprocity only dampens", () => {
    const quiet = scoreProgression([
      touch("marketo", "outbound", 38),
      touch("outreach", "outbound", 30),
      touch("email", "outbound", 20),
      touch("gong_call", "outbound", 6),
      touch("gong_call", "outbound", 3),
    ]);
    const lively = scoreProgression([
      touch("marketo", "inbound", 38),
      touch("outreach", "inbound", 30),
      touch("email", "inbound", 20),
      touch("gong_call", "inbound", 6),
      touch("gong_call", "inbound", 3),
    ]);
    expect(quiet.progression).toBeGreaterThan(45); // still far along (depth)
    expect(quiet.progression).toBeLessThan(lively.progression); // reciprocity guardrail
  });

  it("cannot be gamed by blasting shallow one-way volume", () => {
    const spam = scoreProgression(
      Array.from({ length: 20 }, (_, i) => touch(i % 2 ? "marketo" : "outreach", "outbound", (i % 14) + 1)),
    );
    expect(spam.label).toBe("Early"); // no funnel depth -> capped low
    expect(spam.progression).toBeLessThan(45);
  });

  it("Northwind: high progression but low health (the two dials disagree)", () => {
    const nw = buildAccounts().find((a) => a.account_id === "acc_northwind")!;
    expect(nw.progression.progression).toBeGreaterThanOrEqual(55); // far along (Commit)
    expect(nw.score.total).toBeLessThan(45); // but unhealthy
    expect(nw.progression.progression - nw.score.total).toBeGreaterThan(20); // visible gap
  });
});
