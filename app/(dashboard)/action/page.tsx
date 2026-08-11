import { Breadcrumb } from "@/components/Breadcrumb";
import { FanOutCard } from "@/components/FanOutCard";
import { buildFanOuts } from "@/lib/fanout";

export default function ActionPage() {
  const items = buildFanOuts();
  return <div><Breadcrumb items={[{ label: "Fan-out" }]} /><h1 className="text-2xl font-bold">Signal → coordinated action</h1><p className="mt-2 max-w-3xl text-sm text-muted">Deterministic pattern recognition connects a source conversation to product, marketing, and sales recommendations. Mode chips describe autonomy; this demo never writes to CRM or triggers an external system.</p><div className="mt-6 grid gap-4">{items.map((item) => <FanOutCard key={item.signal.signal_id} item={item} />)}</div></div>;
}

