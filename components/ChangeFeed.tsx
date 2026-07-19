import Link from "next/link";
import type { Signal, Source } from "@/lib/types";
import { sourceLabel } from "@/lib/format";

const SOURCE_STYLE: Record<Source, string> = {
  gong_call: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  gong_email: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  slack: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  salesforce: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

const TYPE_LABEL: Record<string, string> = {
  meddpicc: "MEDDPICC",
  competitor: "Competitor",
  objection: "Objection",
  win_play: "Win play",
  engagement: "Engagement",
};

export function ChangeFeed({
  rows,
  showAccount = true,
}: {
  rows: { signal: Signal; account_name: string; source: Source }[];
  showAccount?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const s = row.signal;
        return (
          <li key={s.signal_id} className="py-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className={`rounded border px-1.5 py-0.5 font-medium ${SOURCE_STYLE[row.source]}`}>
                {sourceLabel(row.source)}
              </span>
              <span className="text-muted">{TYPE_LABEL[s.signal_type] ?? s.signal_type}</span>
              {s.field && <span className="text-muted">· {s.field.replace(/_/g, " ")}</span>}
              {s.entity && <span className="text-muted">· {s.entity}</span>}
              {showAccount && (
                <Link
                  href={`/account/${s.account_id}`}
                  className="ml-auto text-muted hover:text-foreground"
                >
                  {row.account_name}
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm">{s.value}</p>
            {/* the verbatim evidence quote — the anti-hallucination anchor, shown to the user */}
            <blockquote className="mt-1 border-l-2 border-border pl-3 text-sm text-muted italic">
              “{s.evidence_quote}”
            </blockquote>
          </li>
        );
      })}
    </ul>
  );
}
