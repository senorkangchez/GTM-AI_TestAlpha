import type { Driver } from "@/lib/types";
import { signed } from "@/lib/format";

/** Signed driver contributions off a 50 baseline, with one-line reasons. */
export function DriverBars({ drivers }: { drivers: Driver[] }) {
  const max = Math.max(12, ...drivers.map((d) => Math.abs(d.contribution)));
  return (
    <div className="space-y-3">
      {drivers.map((d) => {
        const pct = (Math.abs(d.contribution) / max) * 50; // half-width per side
        const positive = d.contribution >= 0;
        return (
          <div key={d.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{d.label}</span>
              <span className={positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {signed(d.contribution)}
              </span>
            </div>
            {/* diverging bar around a center baseline */}
            <div className="relative mt-1 h-2 rounded bg-border/60">
              <div className="absolute left-1/2 top-0 h-2 w-px bg-muted/50" />
              <div
                className={"absolute top-0 h-2 rounded " + (positive ? "bg-green-500" : "bg-red-500")}
                style={
                  positive
                    ? { left: "50%", width: `${pct}%` }
                    : { right: "50%", width: `${pct}%` }
                }
              />
            </div>
            <p className="mt-1 text-xs text-muted">{d.reason}</p>
          </div>
        );
      })}
    </div>
  );
}
