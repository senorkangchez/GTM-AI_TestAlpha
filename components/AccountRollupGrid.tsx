import Link from "next/link";
import type { AccountModel } from "@/lib/types";
import { BAND_HEX, currency } from "@/lib/format";
import { BandPill } from "./Band";

export function AccountRollupGrid({ accounts }: { accounts: AccountModel[] }) {
  const sorted = accounts.slice().sort((a, b) => a.score.total - b.score.total);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sorted.map((a) => (
        <Link
          key={a.account_id}
          href={`/account/${a.account_id}`}
          className="card p-4 hover:border-accent transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{a.account_name}</div>
              <div className="text-xs text-muted">
                {a.crm_stage} · {currency(a.deal_amount)}
              </div>
            </div>
            <div
              className="shrink-0 text-2xl font-bold tabular-nums"
              style={{ color: BAND_HEX[a.score.band] }}
            >
              {a.score.total}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <BandPill band={a.score.band} />
            {a.divergence.flagged && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                ⚠ diverges (gap {a.divergence.gap})
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
