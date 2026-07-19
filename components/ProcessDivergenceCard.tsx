import type { ProcessDivergence } from "@/lib/types";

/** Second divergence lens: leadership's rubric expectation vs field reality. */
export function ProcessDivergenceCard({ pd }: { pd: ProcessDivergence }) {
  if (!pd.flagged) {
    return (
      <div className="card p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Process check</div>
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">{pd.reason}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
        Process divergence · {pd.surveyName}
      </div>
      <p className="mt-1 text-sm font-medium">{pd.reason}</p>
      <ul className="mt-2 space-y-1">
        {pd.missing.map((m, i) => (
          <li key={i} className="text-sm text-muted flex items-start gap-2">
            <span className="text-red-500">✗</span>
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
