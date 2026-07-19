import type { RubricResult } from "@/lib/types";
import { activeSurvey } from "@/lib/rubric";

const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  met: { label: "Met", cls: "text-green-600 dark:text-green-400", icon: "✓" },
  partial: { label: "Partial", cls: "text-amber-600 dark:text-amber-400", icon: "~" },
  missing: { label: "Missing", cls: "text-red-600 dark:text-red-400", icon: "✗" },
};

/** Auto-filled leadership rubric — graded from the field, zero rep data entry. */
export function RubricScorecard({ rubric }: { rubric: RubricResult }) {
  const survey = activeSurvey;
  const q = (id: string) => survey.items.find((i) => i.item_id === id)?.question ?? id;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{survey.name}</div>
          <div className="text-xs text-muted">{survey.author} · auto-graded, no rep data entry</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{rubric.completion}%</div>
          <div className="text-xs text-muted">complete</div>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {rubric.answers.map((a) => {
          const s = STATUS[a.status];
          return (
            <li key={a.item_id} className="text-sm">
              <div className="flex items-start gap-2">
                <span className={`font-bold ${s.cls}`}>{s.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{q(a.item_id)}</span>
                    <span className={`text-xs ${s.cls}`}>{s.label}</span>
                  </div>
                  {a.evidence_quote ? (
                    <blockquote className="mt-1 border-l-2 border-border pl-3 text-xs text-muted italic">
                      “{a.evidence_quote}”
                    </blockquote>
                  ) : (
                    <p className="mt-1 text-xs text-muted">No supporting evidence in the field.</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
