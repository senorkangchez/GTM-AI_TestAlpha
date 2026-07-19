import Link from "next/link";
import type { Destination, RoutingDecision } from "@/lib/types";

export const DESTINATION_META: Record<Destination, { label: string; cls: string }> = {
  log_only: { label: "Log only", cls: "border-border bg-surface text-muted" },
  slack_deal_owner: {
    label: "Slack → deal owner",
    cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  outreach_task: {
    label: "Outreach task",
    cls: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  marketo_campaign: {
    label: "Marketo campaign",
    cls: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  salesforce_task: {
    label: "Salesforce task",
    cls: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  product_insight: {
    label: "#product insight",
    cls: "border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  add_to_play_library: {
    label: "Play library",
    cls: "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  escalate_leadership: {
    label: "Leadership",
    cls: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

export function DestinationBadge({
  destination,
  muted = false,
}: {
  destination: Destination;
  muted?: boolean;
}) {
  const m = DESTINATION_META[destination];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${m.cls} ${muted ? "opacity-70" : ""}`}
    >
      {m.label}
    </span>
  );
}

export function RoutingTable({ decisions }: { decisions: RoutingDecision[] }) {
  return (
    <ul className="divide-y divide-border">
      {decisions.map((d) => (
        <li key={d.signal_id} className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <DestinationBadge destination={d.destination} />
            {d.secondary.map((s) => (
              <DestinationBadge key={s} destination={s} muted />
            ))}
            {d.requires_approval && (
              <span className="text-xs rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                draft · needs approval
              </span>
            )}
            <span className="ml-auto text-xs text-muted tabular-nums">urgency {d.urgency}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            {d.account_id ? (
              <Link href={`/account/${d.account_id}`} className="font-medium hover:underline">
                {d.account_name}
              </Link>
            ) : (
              <span className="font-medium">{d.account_name}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted font-mono">{d.reason_code}</p>
          {d.evidence_quote && (
            <blockquote className="mt-1 border-l-2 border-border pl-3 text-sm text-muted italic">
              “{d.evidence_quote}”
            </blockquote>
          )}
        </li>
      ))}
    </ul>
  );
}
