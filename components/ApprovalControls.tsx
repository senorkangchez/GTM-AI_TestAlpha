"use client";

import { useApprovals, statusOf } from "@/lib/approvals";

/** Accept/Reject for one suggested landing. Approve = status flip + "would sync"
 *  badge; it never calls a real CRM. Shared state via localStorage (see lib/approvals). */
export function ApprovalControls({ rowKey }: { rowKey: string }) {
  const [map, set] = useApprovals();
  const status = statusOf(map, rowKey);

  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
          Approved · would sync to SFDC ✓
        </span>
        <button onClick={() => set(rowKey, "pending")} className="text-xs text-muted hover:text-foreground underline">
          undo
        </button>
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
          Rejected
        </span>
        <button onClick={() => set(rowKey, "pending")} className="text-xs text-muted hover:text-foreground underline">
          undo
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={() => set(rowKey, "approved")}
        className="rounded-md border border-green-500/50 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-500/20"
      >
        Accept
      </button>
      <button
        onClick={() => set(rowKey, "rejected")}
        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
      >
        Reject
      </button>
    </span>
  );
}
