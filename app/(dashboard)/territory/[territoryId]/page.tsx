import { notFound } from "next/navigation";
import Link from "next/link";
import { getTerritory, accountsInTerritory, getChangeFeed, listTerritories } from "@/lib/store";
import { districtOfTerritory, orgTitle } from "@/lib/org";
import { currency } from "@/lib/format";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ScoreRing } from "@/components/ScoreRing";
import { DriverBars } from "@/components/DriverBars";
import { DivergenceHero } from "@/components/DivergenceHero";
import { AccountRollupGrid } from "@/components/AccountRollupGrid";
import { ChangeFeed } from "@/components/ChangeFeed";

export function generateStaticParams() {
  return listTerritories().map((t) => ({ territoryId: t.id }));
}

export default async function TerritoryPage({
  params,
}: {
  params: Promise<{ territoryId: string }>;
}) {
  const { territoryId } = await params;
  const territory = getTerritory(territoryId);
  if (!territory) notFound();

  const accounts = accountsInTerritory(territoryId);
  const district = districtOfTerritory(territoryId);
  const flagged = accounts
    .filter((a) => a.divergence.flagged)
    .sort((a, b) => b.divergence.gap - a.divergence.gap);
  const hero = flagged[0];
  const feed = getChangeFeed().filter((r) =>
    accounts.some((a) => a.account_id === r.signal.account_id),
  );

  return (
    <div>
      <Breadcrumb
        items={[
          { label: district ? orgTitle(district) : "District", href: district ? `/district/${district}` : undefined },
          { label: territory.name },
          { label: `${accounts.length} accounts` },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{territory.name}</h1>
          <p className="text-muted text-sm mt-1">
            {currency(territory.dealValue)} pipeline ·{" "}
            <span className="text-red-600 dark:text-red-400 font-medium">
              {currency(territory.divergingPipeline)} diverging
            </span>{" "}
            across {territory.flaggedAccounts.length} deals
          </p>
        </div>
        <ScoreRing score={territory.score} />
      </div>

      {/* Divergence hero — the loudest element */}
      {hero ? (
        <Link href={`/account/${hero.account_id}`} className="block mb-6">
          <DivergenceHero
            divergence={hero.divergence}
            accountName={hero.account_name}
            dealAmount={currency(hero.deal_amount)}
          />
        </Link>
      ) : (
        <div className="card p-5 mb-6">
          <div className="text-sm text-muted">CRM vs field</div>
          <p className="mt-1 text-lg font-medium text-green-600 dark:text-green-400">
            No divergence in this territory — the field agrees with the CRM.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted mb-3">Accounts</h2>
          <AccountRollupGrid accounts={accounts} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">What moves the territory score</h2>
          <div className="card p-4">
            <DriverBars drivers={territory.score.drivers} />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted mb-3">
          Change feed — signals with verbatim evidence
        </h2>
        <div className="card p-4">
          <ChangeFeed rows={feed.slice(0, 20)} />
        </div>
      </section>
    </div>
  );
}
