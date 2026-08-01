// Drift guard for the analytics book. heatmaps.json is precomputed by
// scripts/heatmaps.py from ground_truth.json; if someone edits ground_truth and
// forgets to re-run heatmaps.py, the dashboard would silently render stale
// win-rates. This recomputes cell `n` (closed-deal counts) directly from the 600
// opps and asserts they match the committed grid — so the mismatch THROWS instead.
import { describe, it, expect } from "vitest";
import { getHeatmaps, oppsInCell } from "../analytics";
import type { HeatmapGridKey } from "../types";

const heatmaps = getHeatmaps();

function closedN(rows: { outcome: string }[]): number {
  return rows.filter((o) => o.outcome === "won" || o.outcome === "lost").length;
}

describe("heatmap fixture is consistent with ground_truth (no drift)", () => {
  const grids: HeatmapGridKey[] = ["product_competitor", "campaign_segment", "product_campaign"];

  for (const scope of Object.keys(heatmaps.views)) {
    for (const grid of grids) {
      const cells = heatmaps.views[scope][grid];
      it(`${scope} / ${grid}: recomputed n matches committed cells`, () => {
        for (const [key, cell] of Object.entries(cells)) {
          const [row, col] = key.split("|");
          const recomputed = closedN(oppsInCell(grid, scope, row, col));
          expect(recomputed, `cell ${scope} ${grid} ${key}`).toBe(cell.n);
        }
      });
    }
  }
});
