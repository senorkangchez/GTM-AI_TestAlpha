import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { HeatmapGrid } from "@/components/HeatmapGrid";
import { density, getHeatmaps, heatmapView } from "@/lib/analytics";
import type { HeatmapGridKey } from "@/lib/types";

const labels: Record<HeatmapGridKey, string> = { product_competitor: "Product × competitor", campaign_segment: "Campaign × segment", product_campaign: "Product × campaign" };

export default async function HeatmapPage({ searchParams }: { searchParams: Promise<{ grid?: string; scope?: string }> }) {
  const params = await searchParams;
  const heatmaps = getHeatmaps();
  const grid: HeatmapGridKey = params.grid === "campaign_segment" || params.grid === "product_campaign" ? params.grid : "product_competitor";
  const scope = params.scope && heatmaps.views[params.scope] ? params.scope : "All";
  const view = heatmapView(scope)!;
  const axes = heatmaps.axes[grid];
  const readout = density(scope, grid);
  const scopes = Object.keys(heatmaps.views);
  return <div><Breadcrumb items={[{ label: "Macro heatmap" }]} /><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold">Macro rate views</h1><p className="mt-1 text-sm text-muted">Rates are suppressed when fewer than {heatmaps.min_n} closed opportunities support a cell.</p></div><Link href="/digest" className="text-sm underline">Back to digest</Link></div><form className="mt-6 flex flex-wrap gap-3"><label className="text-sm">View<select name="grid" defaultValue={grid} className="ml-2 rounded border border-border bg-surface p-2"><option value="product_competitor">{labels.product_competitor}</option><option value="campaign_segment">{labels.campaign_segment}</option><option value="product_campaign">{labels.product_campaign}</option></select></label><label className="text-sm">Scope<select name="scope" defaultValue={scope} className="ml-2 rounded border border-border bg-surface p-2">{scopes.map((s) => <option key={s}>{s}</option>)}</select></label><button className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">Apply</button></form><div className={`mt-5 rounded-lg border p-3 text-sm ${readout.pct < 40 ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-surface"}`}>{readout.dense} of {readout.total} cells have enough volume ({readout.pct}%). {readout.pct < 40 ? "This breakdown outruns the available data; use a coarser scope." : "The current scope supports this breakdown."}</div><div className="mt-5 card p-3"><HeatmapGrid grid={grid} scope={scope} view={view} rows={axes.rows} cols={axes.cols} /></div></div>;
}

