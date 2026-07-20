import { getMeta, listAccounts, listDistricts, getWinPlays } from "@/lib/store";
import { currency } from "@/lib/format";
import { Breadcrumb } from "@/components/Breadcrumb";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-foreground/90 space-y-2">{children}</div>
    </section>
  );
}

export default function HowItWorks() {
  const meta = getMeta();
  const accounts = listAccounts();
  const diverging = accounts.filter((a) => a.divergence.flagged);
  const divergingPipeline = listDistricts().reduce((s, d) => s + d.divergingPipeline, 0);
  const golden = getWinPlays().find((p) => p.status === "golden");

  return (
    <div className="max-w-3xl">
      <Breadcrumb items={[{ label: "How it works" }]} />
      <h1 className="text-2xl font-bold">How it works</h1>
      <p className="mt-2 text-muted">
        A system of intelligence that sits <strong>beside</strong> the CRM — not another place to
        update. Its product isn&apos;t a score; it&apos;s the <strong>disagreement</strong> between
        what the field says and what the CRM claims, with a traceable reason for every number.
      </p>

      <Section title="The flow">
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 text-xs leading-5">
{`  Gong calls / emails / Slack        (buy: capture)
            │
            ▼
  [ EXTRACTION AGENT ]  ← the one LLM      (build)
   raw text → typed, evidence-quoted signals
            │
            ▼
  ┌───────────────┬───────────────┬──────────────┐
  ▼               ▼               ▼              ▼   (deterministic)
 SCORING       DIVERGENCE       ROUTER        RUBRIC
 + drivers   CRM vs field   reason-coded   leadership
                              decisions      grade
            │
            ▼
  Slack · Outreach · Marketo · Salesforce · #product · play library  (buy: act)`}
        </pre>
      </Section>

      <Section title="One agent, everything else deterministic">
        <p>
          Exactly one component is an LLM: extraction. Scoring, divergence, routing, and rollups are
          plain, unit-tested functions — auditable, cheap, and reproducible. That&apos;s a
          deliberate engineering choice, not a limitation: the parts that decide who gets alerted and
          why should be legible, not a black box.
        </p>
      </Section>

      <Section title="Buy vs build">
        <p>
          <strong>Buy</strong> everything that already exists — Gong (capture), Salesforce (record),
          Outreach (engagement), Marketo (marketing), Clay (enrichment), Slack (comms). <strong>Build</strong>{" "}
          only the middle layer none of them provide: cross-source reasoning that turns {meta.signals}{" "}
          signals across {accounts.length} accounts into &quot;Salesforce says Commit, the field says
          at-risk, here&apos;s the verbatim proof.&quot; Gong summarizes one call; it can&apos;t reason
          across a whole account.
        </p>
      </Section>

      <Section title="The honest demo split">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Data:</strong> fully synthetic (a seeded generator that plants a hidden answer
            key, then hides it in natural conversations).
          </li>
          <li>
            <strong>Extraction:</strong> runs against a real LLM (Anthropic Haiku). Current mode:{" "}
            <strong>{meta.mode}</strong>
            {meta.mode === "mock"
              ? " — a deterministic stand-in with the identical evidence-quote guardrail; add an API key and re-run precompute to switch to live."
              : " — live."}
          </li>
          <li>
            <strong>Everything downstream:</strong> deterministic code, precomputed and statically
            rendered, so the dashboard loads instantly at zero per-request cost.
          </li>
        </ul>
      </Section>

      <Section title="Divergence is the product">
        <p>
          The signal score never reads the CRM stage — so when they disagree, it means something.
          Right now {diverging.length} deals diverge, {currency(divergingPipeline)} of pipeline where
          the CRM stage is ahead of the field. The loudest: a Commit-stage deal the field scores
          at-risk, with no economic buyer and a competitor rising.
        </p>
      </Section>

      <Section title="Lift win rates for everyone">
        <p>
          When a play wins repeatedly against the same competitor, it becomes a golden route.{" "}
          {golden
            ? `${golden.win_count} wins vs ${golden.competitor} promoted the migration-story play; one approval pushes it to ${golden.propagate_to.length} open ${golden.competitor} deals.`
            : "The play library propagates the winning talk track rep-to-rep."}{" "}
          One rep&apos;s win reaches every rep who can use it — automatically.
        </p>
      </Section>

      <Section title="Triggers &amp; real-time">
        <p>
          Production runs on a ~5-minute batch as new conversations land — a deliberate cost/latency
          trade-off. GTM latency tolerance is minutes, not seconds: a Commit deal rots over days, and
          batch delivers the insight while it&apos;s fully actionable at a fraction of event-streaming
          cost. The <strong>Live extract</strong> tab proves the extraction is real — it runs the
          identical function on demand.
        </p>
      </Section>

      <Section title="Failure modes we designed for">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Hallucination</strong> → every signal must quote the transcript verbatim, checked in code; unquotable signals are dropped.</li>
          <li><strong>Alert fatigue</strong> → clustering + a recipient-load governor cap escalations; single mentions are logged, not routed.</li>
          <li><strong>Divergence false-positives</strong> → flags require confidence + cited evidence; the reasons are always shown.</li>
          <li><strong>Staleness</strong> → recency decay; old evidence counts for less.</li>
          <li><strong>Cross-source conflict</strong> → newest evidence wins on a contested field.</li>
          <li><strong>Black-box distrust</strong> → every score driver and routing decision carries a human-readable reason code.</li>
        </ul>
      </Section>

      <Section title="What this grows into (roadmap, not built)">
        <ul className="list-disc pl-5 space-y-1">
          <li>Synthesis agent — LLM drafts battlecard updates from a cluster (a second, reviewed LLM surface).</li>
          <li>Digest agent — weekly leadership summary.</li>
          <li>Self-serve rubric authoring UI for leadership.</li>
          <li>Event-driven (webhook) triggers; embeddings-based retrieval at scale; territory/role access control.</li>
        </ul>
      </Section>
    </div>
  );
}
