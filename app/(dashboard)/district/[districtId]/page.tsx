import { notFound } from "next/navigation";
import Link from "next/link";
import { getDistrict, accountsInDistrict, listTerritories, listDistricts } from "@/lib/store";
import { districtOfTerritory } from "@/lib/geo";
import { currency } from "@/lib/format";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ScoreRing } from "@/components/ScoreRing";
import { DriverBars } from "@/components/DriverBars";
import { AccountRollupGrid } from "@/components/AccountRollupGrid";
import { BandPill } from "@/components/Band";
import { BAND_HEX } from "@/lib/format";

export function generateStaticParams() {
  return listDistricts().map((d) => ({ districtId: d.id }));
}

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ districtId: string }>;
}) {
  const { districtId } = await params;
  const district = getDistrict(districtId);
  if (!district) notFound();

  const territories = listTerritories().filter((t) => districtOfTerritory(t.id) === districtId);
  const accounts = accountsInDistrict(districtId);
  const flagged = accounts
    .filter((a) => a.divergence.flagged)
    .sort((a, b) => b.divergence.gap - a.divergence.gap);

  return (
    <div>
      <Breadcrumb items={[{ label: district.name }, { label: `${accounts.length} accounts` }]} />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{district.name}</h1>
          <p className="text-muted text-sm mt-1">
            {district.oppCount} opps · {currency(district.pipeline)} pipeline ·{" "}
            {district.winRate !== null ? `${district.winRate}% win rate` : "win rate n<5"}
            {district.flaggedAccounts.length > 0 && (
              <>
                {" · "}
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {currency(district.divergingPipeline)} diverging
                </span>{" "}
                across {district.flaggedAccounts.length} scored deals
              </>
            )}
          </p>
        </div>
        <ScoreRing score={district.score} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted mb-3">Territories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {territories.map((t) => (
              <Link key={t.id} href={`/territory/${t.id}`} className="card p-4 hover:border-accent transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {t.oppCount} opps · {currency(t.pipeline)} ·{" "}
                      {t.winRate !== null ? `${t.winRate}% win` : "win n<5"}
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: BAND_HEX[t.score.band] }}>
                    {t.score.total}
                  </div>
                </div>
                <div className="mt-3">
                  <BandPill band={t.score.band} />
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3">What moves the district score</h2>
          <div className="card p-4">
            <DriverBars drivers={district.score.drivers} />
          </div>
        </section>
      </div>

      {flagged.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted mb-3">
            Diverging deals — CRM stage ahead of the field
          </h2>
          <AccountRollupGrid accounts={flagged} />
        </section>
      )}
    </div>
  );
}
