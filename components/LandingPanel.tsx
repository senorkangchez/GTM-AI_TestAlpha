import type { LandingRow, Source } from "@/lib/types";
import { sourceLabel } from "@/lib/format";
import { FIELD_LABEL } from "@/lib/landing";
import { ApprovalControls } from "./ApprovalControls";

const SOURCE_STYLE: Record<Source, string> = {
  gong_call: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  gong_email: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  slack: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  salesforce: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

/** The receipt: how each MEDDPICC field got populated from a conversation.
 *  Source → extracted field → verbatim evidence + Accept/Reject. Absent fields greyed. */
export function LandingPanel({ rows }: { rows: LandingRow[] }) {
  return (
    <div className="card divide-y divide-border">
      <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium text-muted">
        <div className="col-span-3">Source conversation</div>
        <div className="col-span-3">Extracted field</div>
        <div className="col-span-6">Evidence &amp; action</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.key}
          className={`grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 ${r.present ? "" : "opacity-55"}`}
        >
          <div className="md:col-span-3">
            {r.present && r.source ? (
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded border px-1.5 py-0.5 font-medium ${SOURCE_STYLE[r.source]}`}>
                  {sourceLabel(r.source)}
                </span>
                <span className="text-muted">{r.timestamp?.slice(0, 10)}</span>
              </div>
            ) : (
              <span className="text-xs text-muted">— no source —</span>
            )}
          </div>

          <div className="md:col-span-3">
            <div className="text-sm font-medium">{FIELD_LABEL[r.field]}</div>
            <div className="text-xs text-muted">
              {r.present ? `→ ${r.suggested_value}` : "not yet evidenced"}
            </div>
          </div>

          <div className="md:col-span-6">
            {r.present ? (
              <>
                <blockquote className="border-l-2 border-border pl-3 text-sm italic">
                  “{r.evidence_quote}”
                </blockquote>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-muted">confidence {r.confidence.toFixed(2)}</span>
                  <ApprovalControls rowKey={r.key} />
                </div>
              </>
            ) : (
              <span className="text-sm text-muted">
                Absence is signal — nothing in the field evidences this yet.
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
