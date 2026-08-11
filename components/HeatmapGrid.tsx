import Link from "next/link";
import type { HeatmapCell, HeatmapGridKey, HeatmapView } from "@/lib/types";
import { oppsInCell } from "@/lib/analytics";

function tone(cell: HeatmapCell) {
  if (cell.rate === null) return "bg-background text-muted";
  if (cell.rate < 40) return "bg-red-500/15 text-red-700 dark:text-red-300";
  if (cell.rate < 60) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
}

export function HeatmapGrid({ grid, scope, view, rows, cols }: { grid: HeatmapGridKey; scope: string; view: HeatmapView; rows: string[]; cols: string[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead><tr className="bg-background text-left text-xs text-muted"><th className="p-3">{grid === "campaign_segment" ? "Campaign" : "Product"}</th>{cols.map((col) => <th key={col} className="p-3">{col}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row} className="border-t border-border"><th className="p-3 text-left font-medium">{row}</th>{cols.map((col) => {
            const cell = view[grid][`${row}|${col}`] ?? { rate: null, n: 0, gap_losses: 0 };
            const deals = oppsInCell(grid, scope, row, col);
            return <td key={col} className="p-2 align-top"><div className={`min-h-24 rounded-lg p-3 ${tone(cell)}`}>
              <div className="text-2xl font-semibold tabular-nums">{cell.rate === null ? "—" : `${cell.rate}%`}</div>
              <div className="mt-1 text-xs">n={cell.n}{cell.gap_losses ? ` · ${cell.gap_losses} gap-cited losses` : ""}</div>
              {deals.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{deals.slice(0, 4).map((deal) => <Link key={deal.opp_id} href={`/account/${deal.account_id}`} className="text-[11px] underline">{deal.account}</Link>)}</div>}
            </div></td>;
          })}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

