"use client";

import { useState } from "react";
import type { Signal, SignalEnvelope } from "@/lib/types";
import { sourceLabel } from "@/lib/format";

interface Option {
  id: string;
  label: string;
}
interface Result {
  envelope: SignalEnvelope;
  signals: Signal[];
  mode: string;
  error?: string;
}

export function LiveExtractPanel({ options, mode }: { options: Option[]; mode: string }) {
  const [selected, setSelected] = useState(options[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ envelope_id: selected }),
      });
      setResult(await res.json());
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[220px]">
          <span className="block text-xs text-muted mb-1">Pick a conversation</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Extracting…" : "Simulate: a new call just landed →"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Runs the {mode === "live" ? "real Anthropic" : "extraction"} agent on ONE conversation, live —
        the exact function production runs on each batch tick. Every signal must quote the transcript
        verbatim or it&apos;s dropped.
      </p>

      {result && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-semibold text-muted mb-2">
              Raw conversation ({sourceLabel(result.envelope.source)})
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-background p-3 text-xs whitespace-pre-wrap">
              {result.envelope.raw_text}
            </pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted mb-2">
              Extracted signals ({result.signals.length}) · mode: {result.mode}
            </div>
            {result.signals.length === 0 ? (
              <p className="text-sm text-muted">No signals — correctly rejected as noise.</p>
            ) : (
              <ul className="space-y-3">
                {result.signals.map((s) => (
                  <li key={s.signal_id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span className="font-medium text-foreground">{s.signal_type}</span>
                      {s.field && <span>· {s.field.replace(/_/g, " ")}</span>}
                      {s.entity && <span>· {s.entity}</span>}
                      <span className="ml-auto">conf {s.confidence.toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-sm">{s.value}</p>
                    <blockquote className="mt-1 border-l-2 border-border pl-3 text-xs text-muted italic">
                      “{s.evidence_quote}”
                    </blockquote>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
