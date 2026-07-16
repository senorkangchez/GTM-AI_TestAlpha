// Dollar-weighted rollups: account -> territory -> district. Same {total, band,
// drivers} shape at every level so the UI drills down uniformly. A weighted mean
// is associative, so district-from-territories == district-from-accounts.
import type { AccountModel, GroupRollup, Scored, ScoreComponents, Driver } from "./types";
import { WEIGHTS } from "./scoring";
import { bandOf, round } from "./format";

interface Weighted {
  score: Scored;
  dealValue: number;
}

const ZERO: ScoreComponents = { meddpicc01: 0, competitive01: 0, engagement01: 0, momentum01: 0 };

/** Dollar-weighted mean of children's components, re-blended into a Scored. */
export function rollupScore(children: Weighted[], label = "accounts"): Scored {
  const totalValue = children.reduce((a, c) => a + c.dealValue, 0) || 1;
  const comp: ScoreComponents = { ...ZERO };
  for (const c of children) {
    const w = c.dealValue / totalValue;
    comp.meddpicc01 += c.score.components.meddpicc01 * w;
    comp.competitive01 += c.score.components.competitive01 * w;
    comp.engagement01 += c.score.components.engagement01 * w;
    comp.momentum01 += c.score.components.momentum01 * w;
  }
  const score01 =
    WEIGHTS.meddpicc * comp.meddpicc01 +
    WEIGHTS.competitive * comp.competitive01 +
    WEIGHTS.engagement * comp.engagement01 +
    WEIGHTS.momentum * comp.momentum01;
  const total = round(100 * score01);
  const contribution = (w: number, s01: number) => round(w * (s01 - 0.5) * 100);
  const drivers: Driver[] = [
    {
      label: "MEDDPICC completeness",
      contribution: contribution(WEIGHTS.meddpicc, comp.meddpicc01),
      reason: `Pipeline-weighted across ${children.length} ${label}`,
    },
    {
      label: "Competitive threat",
      contribution: contribution(WEIGHTS.competitive, comp.competitive01),
      reason: `Pipeline-weighted across ${children.length} ${label}`,
    },
    {
      label: "Engagement trend",
      contribution: contribution(WEIGHTS.engagement, comp.engagement01),
      reason: `Pipeline-weighted across ${children.length} ${label}`,
    },
    {
      label: "Deal momentum",
      contribution: contribution(WEIGHTS.momentum, comp.momentum01),
      reason: `Pipeline-weighted across ${children.length} ${label}`,
    },
  ];
  return { total, score01, band: bandOf(total), drivers, components: comp };
}

export function buildGroupRollup(
  id: string,
  name: string,
  level: "territory" | "district",
  accounts: AccountModel[],
): GroupRollup {
  const dealValue = accounts.reduce((a, x) => a + x.deal_amount, 0);
  const score = rollupScore(
    accounts.map((a) => ({ score: a.score, dealValue: a.deal_amount })),
    "accounts",
  );
  const flagged = accounts.filter((a) => a.divergence.flagged);
  return {
    id,
    name,
    level,
    score,
    dealValue,
    divergingPipeline: flagged.reduce((a, x) => a + x.deal_amount, 0),
    flaggedAccounts: flagged
      .map((a) => ({ account_id: a.account_id, account_name: a.account_name, gap: a.divergence.gap }))
      .sort((a, b) => b.gap - a.gap),
    childIds: accounts.map((a) => a.account_id),
  };
}
