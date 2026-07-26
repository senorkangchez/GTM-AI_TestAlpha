import { notFound } from "next/navigation";
import Link from "next/link";
import { getAccount, routingForAccount, listAccounts, getLanding } from "@/lib/store";
import { orgTitle } from "@/lib/org";
import { currency } from "@/lib/format";
import { Breadcrumb } from "@/components/Breadcrumb";
import { TwoDials } from "@/components/TwoDials";
import { LandingPanel } from "@/components/LandingPanel";
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

  const landing = getLanding(accountId);
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{account.account_name}</h1>
        <p className="text-muted text-sm mt-1">
          CRM stage {account.crm_stage} · {currency(account.deal_amount)} · {account.signals.length}{" "}
          signals · {account.touches.length} touches
        </p>
      </div>

      {/* B1 — Landing panel: the receipt (data -> field). The point of the page. */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted mb-3">
          How the field populated this account — reviewable, evidence-backed
        </h2>
        <LandingPanel rows={landing} />
        <p className="mt-2 text-xs text-muted">
          Nothing auto-writes to the CRM. Each row is a suggestion a human accepts or rejects; an
          accept flips status and would sync to Salesforce.
        </p>
      </section>

      {/* B2 — two dials, allowed to disagree */}
      <section className="mb-6">
        <TwoDials progression={account.progression} health={account.score} />
      </section>

      {/* B3 — divergence, now explained by the dials above */}
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

      <Link href="/queue" className="mt-8 inline-block text-sm text-accent hover:underline">
        → Review all pending suggestions in the ops queue
      </Link>
    </div>
  );
}
