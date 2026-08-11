import { describe, expect, it } from "vitest";
import { buildFanOuts } from "../fanout";

describe("read-only fan-out", () => {
  it("emits product, marketing, and sales lanes from cited feature signals", () => {
    const item = buildFanOuts(1)[0];
    expect(item).toBeDefined();
    expect(item.signal.evidence_quote).toContain(item.signal.entity);
    expect(item.actions.map((a) => a.lane)).toEqual(["Product", "Marketing", "Sales"]);
    expect(item.actions.every((a) => a.mode)).toBe(true);
  });
});
