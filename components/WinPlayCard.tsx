import Link from "next/link";
import type { WinPlay } from "@/lib/types";

/** The golden-route moment: one rep's winning play, propagated to open deals. */
export function WinPlayCard({ play }: { play: WinPlay }) {
  const golden = play.status === "golden";
  return (
    <div
      className={
        "rounded-xl border p-5 " +
        (golden ? "border-indigo-500/50 bg-indigo-500/5" : "border-border bg-surface")
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          {golden ? "Golden route" : "Emerging play"} · vs {play.competitor}
        </span>
        <span className="text-xs rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-indigo-700 dark:text-indigo-300">
          {play.win_count} win{play.win_count === 1 ? "" : "s"}
        </span>
      </div>

      <blockquote className="mt-3 border-l-2 border-indigo-500/40 pl-3 text-sm italic">
        “{play.summary}”
      </blockquote>

      {golden ? (
        <div className="mt-4">
          <div className="text-sm font-medium">
            Propagate to {play.propagate_to.length} open {play.competitor} deals
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {play.propagate_to.map((p) => (
              <Link
                key={p.account_id}
                href={`/account/${p.account_id}`}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs hover:border-accent"
              >
                {p.account_name}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              disabled
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white opacity-90 cursor-not-allowed"
              title="Draft — requires PMM/enablement approval (demo)"
            >
              Approve &amp; push to deal owners
            </button>
            <span className="text-xs text-muted">
              Draft only — requires approval. Pushes a battlecard to each deal owner (Slack + Outreach).
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Pattern not yet met ({play.win_count} of 3 wins). Captured; will propose propagation once a
          pattern is confirmed.
        </p>
      )}
    </div>
  );
}
