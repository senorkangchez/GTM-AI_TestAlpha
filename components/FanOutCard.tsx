import Link from "next/link";
import type { FanOut } from "@/lib/fanout";

export function FanOutCard({ item }: { item: FanOut }) {
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Signal → coordinated motion</p>
          <h2 className="mt-1 text-lg font-semibold">
            <Link href={`/account/${item.account.account_id}`} className="hover:underline">{item.account.account}</Link>
          </h2>
          <p className="mt-1 text-sm text-muted">{item.pattern}</p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">read-only</span>
      </div>
      <blockquote className="mt-4 border-l-2 border-accent/50 pl-3 text-sm italic text-muted">“{item.signal.evidence_quote}”</blockquote>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {item.actions.map((action) => (
          <div key={action.lane} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide">{action.lane}</span>
              <span className="text-[11px] text-muted">{action.mode}</span>
            </div>
            <p className="mt-2 text-sm font-medium">{action.action}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{action.rationale}</p>
            <p className="mt-3 text-[11px] text-muted">{action.destination}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

