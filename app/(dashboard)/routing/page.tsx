import { getRouting, getWinPlays, getLoggedOnly, getMeta } from "@/lib/store";
import { RoutingTable } from "@/components/RoutingTable";
import { WinPlayCard } from "@/components/WinPlayCard";
import { Breadcrumb } from "@/components/Breadcrumb";

function Preview({
  system,
  tone,
  children,
}: {
  system: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className={`text-xs font-semibold ${tone}`}>{system}</div>
      <div className="mt-2 text-sm">{children}</div>
      <div className="mt-2 text-[11px] text-muted">Preview · no real write in this demo</div>
    </div>
  );
}

export default function RoutingPage() {
  const decisions = getRouting();
  const winPlays = getWinPlays();
  const meta = getMeta();
  const loggedOnly = getLoggedOnly();
  const routed = decisions.length;

  const golden = winPlays.filter((p) => p.status === "golden");
  const pick = (dest: string) => decisions.find((d) => d.destination === dest);
  const slack = pick("slack_deal_owner");
  const outreach = decisions.find((d) => d.secondary.includes("outreach_task")) ?? slack;
  const marketo = pick("marketo_campaign");
  const sfdc = pick("salesforce_task");
  const product = pick("product_insight");

  return (
    <div>
      <Breadcrumb items={[{ label: "Routing" }]} />
      <h1 className="text-2xl font-bold">Routing &amp; activity</h1>
      <p className="text-muted text-sm mt-1">
        Signals aggregate into patterns and route to whoever can act — with a reason code on every
        decision. {routed} routed · {loggedOnly} logged-only ({meta.signals} signals total; single
        mentions and noise are suppressed).
      </p>

      {/* Golden-route propagation — the "lift win rates for everyone" moment */}
      {golden.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted mb-3">
            Golden route — one rep&apos;s win, propagated to every open deal
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {golden.map((p) => (
              <WinPlayCard key={p.play_id} play={p} />
            ))}
          </div>
        </section>
      )}

      {/* Styled system-of-action previews */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted mb-3">Where the intelligence lands</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {slack && (
            <Preview system="Slack → deal owner" tone="text-emerald-600 dark:text-emerald-400">
              <span className="font-medium">#deal-{slack.account_name.split(" ")[0].toLowerCase()}</span>{" "}
              — heads up: {slack.entity} is active in a {slack.reason_code.includes("Commit") ? "Commit" : "late-stage"} deal. Worth a
              touch this week.
            </Preview>
          )}
          {outreach && (
            <Preview system="Outreach task" tone="text-orange-600 dark:text-orange-400">
              Task created for {outreach.account_name}: sequence a competitive-differentiation touch.
            </Preview>
          )}
          {marketo && (
            <Preview system="Marketo campaign" tone="text-violet-600 dark:text-violet-400">
              Trigger competitive play — audience: {marketo.account_name}. {marketo.reason_code}
            </Preview>
          )}
          {sfdc && (
            <Preview system="Salesforce task" tone="text-sky-600 dark:text-sky-400">
              Task on {sfdc.account_name}: review CRM-vs-field divergence. Reads stage; writes a task
              only — never overwrites a field.
            </Preview>
          )}
          {product && (
            <Preview system="#product / Productboard" tone="text-pink-600 dark:text-pink-400">
              {product.account_name} raising the same gap. {product.reason_code}
            </Preview>
          )}
          <Preview system="Play library" tone="text-indigo-600 dark:text-indigo-400">
            Self-updating battlecard: the migration story that beats Zendesk, drafted from reps&apos;
            own words.
          </Preview>
        </div>
      </section>

      {/* Full reason-coded decision log */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted mb-3">
          Reason-coded decisions ({routed})
        </h2>
        <div className="card p-4">
          <RoutingTable decisions={decisions} />
        </div>
      </section>
    </div>
  );
}
