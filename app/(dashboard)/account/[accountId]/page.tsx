import { notFound } from "next/navigation";
import { getAccount, routingForAccount, listAccounts } from "@/lib/store";
import { orgTitle } from "@/lib/org";
import { currency } from "@/lib/format";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ScoreRing } from "@/components/ScoreRing";
import { DriverBars } from "@/components/DriverBars";
import { DivergenceHero } from "@/components/DivergenceHero";
import { ChangeFeed } from "@/components/ChangeFeed";
import { DestinationBadge } from "@/components/RoutingTable";

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
          { label: orgTitle(account.district), href: `/district/${account.district}` },
          { label: orgTitle(account.territory), href: `/territory/${account.territory}` },
          { label: account.account_name },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{account.account_name}</h1>
          <p className="text-muted text-sm mt-1">
            CRM stage {account.crm_stage} · {currency(account.deal_amount)} · {account.signals.length} signals
          </p>
        </div>
        <ScoreRing score={account.score} prior={account.scorePrior} />
      </div>

      <div className="mb-6">
        <DivergenceHero divergence={account.divergence} dealAmount={currency(account.deal_amount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">Score drivers</h2>
          <div className="card p-4">
            <DriverBars drivers={account.score.drivers} />
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">Routing decisions</h2>
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
                  {d.requires_approval && (
                    <span className="text-xs rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                      draft · needs approval
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">{d.reason_code}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

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
