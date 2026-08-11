import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FanOutCard } from "@/components/FanOutCard";
import { buildFanOuts } from "@/lib/fanout";
import { campaignConversion, featureRequestCounts, waterfall } from "@/lib/analytics";
import { allSignals } from "@/lib/data";

function Kpi({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return <Link href={href} className="card block p-4 hover:border-accent"><p className="text-xs uppercase tracking-wide text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted">{note}</p></Link>;
}

export default function DigestPage() {
  const top = featureRequestCounts()[0];
  const signal = campaignConversion("signal");
  const manual = campaignConversion("manual");
  const flow = waterfall();
  const fanouts = buildFanOuts(3);
  return <div>
    <Breadcrumb items={[{ label: "Digest" }]} />
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">GTM Signal Engine · VP digest</p><h1 className="mt-1 text-3xl font-bold">What&apos;s working / not working</h1><p className="mt-2 max-w-2xl text-sm text-muted">One field signal becomes golden data and a coordinated recommendation for product, marketing, and sales. Every finding is read-only and evidence-backed.</p></div><Link href="/action" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">Open fan-out feed →</Link></div>
    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Top requested feature" value={`${top?.count ?? 0}`} note={`${top?.feature ?? "No feature yet"} · product signal`} href="/heatmap?grid=product_competitor" /><Kpi label="Signal-triggered nurture" value={`${signal.rate}%`} note={`${signal.converted}/${signal.n} converted · vs ${manual.rate}% manual`} href="/heatmap?grid=campaign_segment" /><Kpi label="Zendesk win rate" value={`${flow.zendesk.rate ?? "—"}%`} note={`${flow.zendesk.n} closed opportunities`} href="/heatmap?grid=product_competitor" /><Kpi label="Evidence-backed signals" value={`${allSignals.length}`} note="Gong, email, Slack + structured touches" href="/action" /></section>
    <section className="mt-8 grid gap-4 lg:grid-cols-2"><div className="card p-5"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Working · VP ABM</p><h2 className="mt-2 text-xl font-semibold">Signal-triggered nurture outperforms batch</h2><p className="mt-2 text-sm text-muted">The engine identifies intent in the field and routes a recommended campaign motion while the opportunity is actionable.</p><p className="mt-4 text-3xl font-semibold">{signal.rate - manual.rate} pts <span className="text-sm font-normal text-muted">conversion lift</span></p><Link href="/heatmap?grid=campaign_segment" className="mt-4 inline-block text-sm underline">See campaign × segment →</Link></div><div className="card p-5"><p className="text-xs font-semibold uppercase tracking-wide text-red-600">Not working · VP Sales Engineering</p><h2 className="mt-2 text-xl font-semibold">One weak competitor column</h2><p className="mt-2 text-sm text-muted">Deals facing Zendesk underperform across product lines; the recurring gap is visible in the cited feature requests.</p><p className="mt-4 text-3xl font-semibold">{flow.zendesk.rate ?? "—"}% <span className="text-sm font-normal text-muted">win rate</span></p><Link href="/heatmap?grid=product_competitor" className="mt-4 inline-block text-sm underline">Inspect the heatmap →</Link></div></section>
    <section className="mt-8"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">The money shot</h2><p className="text-sm text-muted">A single cited signal fans out into three department recommendations.</p></div><Link href="/action" className="text-sm underline">View all →</Link></div><div className="mt-3 grid gap-4">{fanouts.map((item) => <FanOutCard key={item.signal.signal_id} item={item} />)}</div></section>
  </div>;
}

