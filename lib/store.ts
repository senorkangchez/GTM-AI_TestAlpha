// The in-memory "shadow DB" — the derived model built once and memoized. Server
// components read from these selectors; scoring/rollup/routing run at build/server
// time, never in the client bundle.
import type { AccountModel, GroupRollup, RoutingDecision, WinPlay } from "./types";
import {
  buildAccounts,
  buildTerritories,
  buildDistricts,
  changeFeed,
  extractionMeta,
  envelopeById,
} from "./data";
import { routeAllSignals } from "./router";

interface Store {
  accounts: AccountModel[];
  territories: GroupRollup[];
  districts: GroupRollup[];
  feed: ReturnType<typeof changeFeed>;
  routing: RoutingDecision[];
  winPlays: WinPlay[];
  loggedOnly: number;
}

let cached: Store | null = null;

function build(): Store {
  const accounts = buildAccounts();
  const territories = buildTerritories(accounts);
  const districts = buildDistricts(accounts);
  const { decisions, winPlays, loggedOnly } = routeAllSignals(accounts);
  return {
    accounts,
    territories,
    districts,
    feed: changeFeed(accounts),
    routing: decisions,
    winPlays,
    loggedOnly,
  };
}

function store(): Store {
  cached ??= build();
  return cached;
}

// ---- Selectors -------------------------------------------------------------

export const getMeta = () => extractionMeta;
export const getEnvelope = (id: string) => envelopeById[id];

export const listAccounts = () => store().accounts;
export const getAccount = (id: string) => store().accounts.find((a) => a.account_id === id);

export const listTerritories = () => store().territories;
export const getTerritory = (id: string) => store().territories.find((t) => t.id === id);

export const listDistricts = () => store().districts;
export const getDistrict = (id: string) => store().districts.find((d) => d.id === id);

export const accountsInTerritory = (territory: string) =>
  store().accounts.filter((a) => a.territory === territory);
export const accountsInDistrict = (district: string) =>
  store().accounts.filter((a) => a.district === district);

export const getChangeFeed = () => store().feed;
export const getRouting = () => store().routing;
export const getWinPlays = () => store().winPlays;
export const getLoggedOnly = () => store().loggedOnly;
export const routingForAccount = (id: string) =>
  store().routing.filter((r) => r.account_id === id);
