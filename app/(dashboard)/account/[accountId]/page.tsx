import { notFound } from "next/navigation";
import { getAccount, routingForAccount, listAccounts } from "@/lib/store";
import { geoTitle } from "@/lib/geo";
import { currency } from "@/lib/format";
import { Breadcrumb } from "@/components/Breadcrumb";
import { TwoDials } from "@/components/TwoDials";
import { DriverBars } from "@/components/DriverBars";
import { DivergenceHero } from "@/components/DivergenceHero";
import { ChangeFeed } from "@/components/ChangeFeed";
import { DestinationBadge } from "@/components/RoutingTable";
import { RubricScorecard } from "@/components/RubricScorecard";
import { ProcessDivergenceCard } from "@/components/ProcessDivergenceCard";

export function generateStaticParams() {
  return listAccounts().map((a) => ({ accountId: a.account_id }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const account = getAccount(accountId);
  if (!account) notFound();

  const routing = routingForAccount(accountId);
  const feedRows = account.signals
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .map((s) => ({ signal: s, account_name: account.account_name, source: s.source }));

  return (
    <div>
      <Breadcrumb
        items={[
          { label: geoTitle(account.district), href: `/district/${account.district}` },
          { label: geoTitle(account.territory), href: `/territory/${account.territory}` },
          { label: account.account_name },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{account.account_name}</h1>
        <p className="text-muted text-sm mt-1">
          CRM stage {account.crm_stage} · {currency(account.deal_amount)} · {account.segment} ·{" "}
          {account.team} team · {account.signals.length} signals · {account.touches.length} touches
        </p>
        <p className="text-xs text-muted mt-1">
          Read-only field context — what the conversations say about this deal. Every line below
          traces to a verbatim quote from Gong / email / Slack.
        </p>
      </div>

      {/* Two dials, allowed to disagree */}
      <section className="mb-6">
        <TwoDials progression={account.progression} health={account.score} />
      </section>

      {/* Divergence, explained by the dials above */}
      <div className="mb-8">
        <DivergenceHero divergence={account.divergence} dealAmount={currency(account.deal_amount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">Health drivers</h2>
          <div className="card p-4">
            <DriverBars drivers={account.score.drivers} />
          </div>
          <h2 className="text-sm font-semibold text-muted mb-3 mt-6">Progression drivers</h2>
          <div className="card p-4">
            <DriverBars drivers={account.progression.drivers} />
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">Where the field routed this deal</h2>
          <div className="card p-4 space-y-3">
            {routing.length === 0 && (
              <p className="text-sm text-muted">No actions routed — signals logged only.</p>
            )}
            {routing.map((d) => (
              <div key={d.signal_id} className="text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <DestinationBadge destination={d.destination} />
                  {d.secondary.map((s) => (
                    <DestinationBadge key={s} destination={s} muted />
                  ))}
                  <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted">
                    {d.requires_approval ? "routed for the owning team" : "would auto-fire"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{d.reason_code}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {account.rubric && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted mb-3">
            Leadership rubric — graded from the field, zero rep data entry
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RubricScorecard rubric={account.rubric} />
            {account.processDivergence && (
              <div>
                <ProcessDivergenceCard pd={account.processDivergence} />
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted mb-3">
          Field evidence — every signal, with its verbatim quote
        </h2>
        <div className="card p-4">
          <ChangeFeed rows={feedRows} showAccount={false} />
        </div>
      </section>
    </div>
  );
}
