"use client";

import { useState } from "react";
import Link from "next/link";
import type { LandingRow } from "@/lib/types";
import { useApprovals, statusOf } from "@/lib/approvals";
import { FIELD_LABEL } from "@/lib/landing";
import { ApprovalControls } from "./ApprovalControls";

export function QueueClient({ rows }: { rows: LandingRow[] }) {
  const [map] = useApprovals();
  const [pendingOnly, setPendingOnly] = useState(true);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) counts[statusOf(map, r.key)] += 1;

  const visible = rows.filter((r) => (pendingOnly ? statusOf(map, r.key) === "pending" : true));
  const byAccount = new Map<string, LandingRow[]>();
  for (const r of visible) byAccount.set(r.account_name, [...(byAccount.get(r.account_name) ?? []), r]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <span className="text-amber-600 dark:text-amber-400 font-medium">{counts.pending} pending</span>
        <span className="text-green-600 dark:text-green-400">{counts.approved} approved</span>
        <span className="text-red-600 dark:text-red-400">{counts.rejected} rejected</span>
        <label className="ml-auto flex items-center gap-2 text-muted">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          pending only
        </label>
      </div>

      {byAccount.size === 0 ? (
        <p className="text-sm text-muted">Nothing to review — all suggestions have been actioned.</p>
      ) : (
        <div className="space-y-6">
          {[...byAccount.entries()].map(([accountName, accRows]) => (
            <div key={accountName} className="card">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <Link href={`/account/${accRows[0].account_id}`} className="font-medium hover:underline">
                  {accountName}
                </Link>
                <span className="text-xs text-muted">{accRows.length} suggestion(s)</span>
              </div>
              <ul className="divide-y divide-border">
                {accRows.map((r) => (
                  <li key={r.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3">
                    <div className="md:col-span-3">
                      <div className="text-sm font-medium">{FIELD_LABEL[r.field]}</div>
                      <div className="text-xs text-muted">→ {r.suggested_value} · conf {r.confidence.toFixed(2)}</div>
                    </div>
                    <div className="md:col-span-6">
                      <blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted">
                        “{r.evidence_quote}”
                      </blockquote>
                    </div>
                    <div className="md:col-span-3 md:text-right">
                      <ApprovalControls rowKey={r.key} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
