import { listAllLandings } from "@/lib/store";
import { Breadcrumb } from "@/components/Breadcrumb";
import { QueueClient } from "@/components/QueueClient";

export default function QueuePage() {
  const rows = listAllLandings();
  return (
    <div>
      <Breadcrumb items={[{ label: "Approval queue" }]} />
      <h1 className="text-2xl font-bold">Approval queue</h1>
      <p className="text-muted text-sm mt-1 mb-6 max-w-2xl">
        Every suggested CRM update across all accounts, for the ops/SFDC team to review in bulk.
        Nothing auto-writes — a human accepts or rejects each one, and every decision is labeled
        training data that feeds the extraction eval. Accept = status flip + &quot;would sync to
        SFDC ✓&quot;; no real API is called in this demo.
      </p>
      <QueueClient rows={rows} />
    </div>
  );
}
