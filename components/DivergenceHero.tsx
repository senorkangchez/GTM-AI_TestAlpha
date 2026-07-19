import type { Divergence } from "@/lib/types";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red-500/50 bg-red-500/10",
  high: "border-red-500/40 bg-red-500/5",
  elevated: "border-amber-500/40 bg-amber-500/5",
  none: "border-border bg-surface",
};

/** The loudest element on the page: CRM stage vs the field signal. */
export function DivergenceHero({
  divergence,
  accountName,
  dealAmount,
}: {
  divergence: Divergence;
  accountName?: string;
  dealAmount?: string;
}) {
  if (!divergence.flagged) {
    return (
      <div className="card p-5">
        <div className="text-sm text-muted">CRM vs field</div>
        <p className="mt-1 text-lg font-medium text-green-600 dark:text-green-400">
          Aligned — the field agrees with the CRM stage.
        </p>
        <p className="mt-1 text-sm text-muted">
          Signal {divergence.signalTotal} vs {divergence.crmStage} implied {divergence.crmImpliedScore}.
        </p>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border p-5 ${SEVERITY_STYLE[divergence.severity]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
          Divergence · {divergence.severity}
        </span>
        {dealAmount && <span className="text-sm font-medium">{dealAmount}</span>}
      </div>
      <p className="mt-2 text-xl font-semibold leading-snug">
        {accountName ? `${accountName}: ` : ""}CRM says{" "}
        <span className="text-foreground">{divergence.crmStage}</span>, the field says{" "}
        <span className="text-red-600 dark:text-red-400">soft ({divergence.signalTotal})</span>.
      </p>
      <p className="mt-1 text-sm text-muted">
        A {divergence.crmStage} deal implies a health of ~{divergence.crmImpliedScore}; the field signal is{" "}
        {divergence.signalTotal} — a {divergence.gap}-point gap.
      </p>
      {divergence.reasonChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {divergence.reasonChips.map((chip, i) => (
            <span
              key={i}
              className="rounded-full border border-red-500/30 bg-surface px-2.5 py-1 text-xs text-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
