// Org / enrichment layer. Joins the additive accounts.json (deal amount +
// territory + district) onto the stable acc_* account_id. In production this is
// what Clay (enrichment) + Salesforce (deal amount, hierarchy) would supply.
import accountsRaw from "@/fixtures/accounts.json";
import type { Enrichment } from "./types";

type AccountsFile = Record<string, Enrichment | string>;

const accounts = accountsRaw as AccountsFile;

function isEnrichment(v: Enrichment | string): v is Enrichment {
  return typeof v === "object" && v !== null && "deal_amount" in v;
}

const ENRICHMENT: Record<string, Enrichment> = Object.fromEntries(
  Object.entries(accounts).filter(([k, v]) => k !== "_comment" && isEnrichment(v)) as [string, Enrichment][],
);

export function getEnrichment(accountId: string): Enrichment | null {
  return ENRICHMENT[accountId] ?? null;
}

export function listAccountIds(): string[] {
  return Object.keys(ENRICHMENT);
}

const TITLE: Record<string, string> = {
  west: "West District",
  east: "East District",
  "west-enterprise": "West · Enterprise",
  "west-commercial": "West · Commercial",
  "east-enterprise": "East · Enterprise",
  "east-commercial": "East · Commercial",
};

export function orgTitle(id: string): string {
  return TITLE[id] ?? id;
}

/** district -> territories -> accountIds, derived from the enrichment file. */
export function buildOrgTree() {
  const districts: Record<string, Record<string, string[]>> = {};
  for (const [accountId, e] of Object.entries(ENRICHMENT)) {
    districts[e.district] ??= {};
    districts[e.district][e.territory] ??= [];
    districts[e.district][e.territory].push(accountId);
  }
  return districts;
}

export function territoriesInDistrict(district: string): string[] {
  const tree = buildOrgTree();
  return Object.keys(tree[district] ?? {});
}

export function accountIdsInTerritory(territory: string): string[] {
  for (const territories of Object.values(buildOrgTree())) {
    if (territories[territory]) return territories[territory];
  }
  return [];
}

export function accountIdsInDistrict(district: string): string[] {
  const tree = buildOrgTree();
  return Object.values(tree[district] ?? {}).flat();
}

export function districtOfTerritory(territory: string): string | null {
  const tree = buildOrgTree();
  for (const [district, territories] of Object.entries(tree)) {
    if (territories[territory]) return district;
  }
  return null;
}

export function listDistricts(): string[] {
  return Object.keys(buildOrgTree());
}

export function listTerritories(): string[] {
  return Object.values(buildOrgTree()).flatMap((t) => Object.keys(t));
}

/** The default territory the homepage redirects to — the one with the loudest story. */
export const DEFAULT_TERRITORY = "west-enterprise";
