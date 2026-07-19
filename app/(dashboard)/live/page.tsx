import { envelopeById, extractionMeta } from "@/lib/data";
import { sourceLabel } from "@/lib/format";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LiveExtractPanel } from "@/components/LiveExtractPanel";

export default function LivePage() {
  const options = Object.values(envelopeById)
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .map((e) => ({
      id: e.envelope_id,
      label: `${e.account_name} · ${sourceLabel(e.source)} · ${e.timestamp.slice(0, 10)}`,
    }));

  return (
    <div>
      <Breadcrumb items={[{ label: "Live extract" }]} />
      <h1 className="text-2xl font-bold">Live extraction</h1>
      <p className="text-muted text-sm mt-1 mb-6 max-w-2xl">
        The dashboard is precomputed for instant load. This proves the extraction is real: pick any
        conversation and run the agent on it live. In production the identical function runs on a
        ~5-minute batch as new Gong calls, emails, and Slack threads land.
      </p>
      <LiveExtractPanel options={options} mode={extractionMeta.mode} />
    </div>
  );
}
