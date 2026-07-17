// ---------------------------------------------------------------------------
// Deterministic MOCK extractor — a stand-in for the LLM when no ANTHROPIC_API_KEY
// is present. It pattern-matches the transcript templates and emits RawSignals,
// then runs them through the SAME validateSignals guardrail as the real path, so
// every mock signal still carries a verbatim substring of raw_text.
//
// This is NOT the product. The real extraction agent (lib/extraction.ts) is the
// one that must be live. Add a key and re-run `npm run precompute` to replace
// these mock signals with real ones — the downstream code is identical.
// ---------------------------------------------------------------------------
import type { RawSignal, Signal, SignalEnvelope } from "./types";
import { validateSignals } from "./extraction";

const COMPETITORS = ["Zendesk", "ServiceNow", "Zoho", "HubSpot", "Intercom"];

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[0] : null;
}

function mockRawSignals(env: SignalEnvelope): RawSignal[] {
  const t = env.raw_text;
  const out: RawSignal[] = [];
  const add = (s: RawSignal) => out.push(s);

  // --- Front-half MEDDPICC + competition (surface on calls) ---
  const pain = firstMatch(
    t,
    /The core issue hasn't changed - .+?\. It's the thing keeping me up at night\./,
  );
  if (pain)
    add({
      signal_type: "meddpicc",
      field: "identify_pain",
      value: "Buyer states the core operational pain.",
      evidence_quote: pain,
      confidence: 0.9,
    });

  const metrics = firstMatch(
    t,
    /If we could .+?, my CFO's model puts that at .+?\. That's the number I'd be measured on\./,
  );
  if (metrics)
    add({
      signal_type: "meddpicc",
      field: "metrics",
      value: "Buyer quantifies the outcome they are measured on.",
      evidence_quote: metrics,
      confidence: 0.88,
    });

  const champion = firstMatch(
    t,
    /.+? is clearly our champion here, actively selling this internally on our behalf\./,
  );
  if (champion)
    add({
      signal_type: "meddpicc",
      field: "champion",
      value: "An internal champion is selling on the rep's behalf.",
      evidence_quote: champion,
      confidence: 0.85,
    });

  // Standard competitor mention
  const compStd = t.match(/We are also evaluating (.+?), just so you know the landscape\./);
  if (compStd)
    add({
      signal_type: "competitor",
      entity: compStd[1],
      value: `Buyer is also evaluating ${compStd[1]}.`,
      evidence_quote: compStd[0],
      confidence: 0.92,
    });

  // Escalating competitor (rotting)
  const compEsc = t.match(
    /I'll be honest, (.+?) has been pushing hard\. A few folks on my team are leaning their way, so we're taking a serious look at .+?\./,
  );
  if (compEsc) {
    add({
      signal_type: "competitor",
      entity: compEsc[1],
      value: `${compEsc[1]} is pushing hard and gaining ground with the buyer's team.`,
      evidence_quote: compEsc[0],
      confidence: 0.95,
    });
    add({
      signal_type: "objection",
      value: "Buyer's team is leaning toward the competitor.",
      evidence_quote: compEsc[0],
      confidence: 0.85,
    });
  }

  // --- Engagement cues ---
  const cooling = firstMatch(
    t,
    /.+? has been our champion but is noticeably less responsive this call; may be losing air cover\./,
  );
  if (cooling)
    add({
      signal_type: "engagement",
      value: "Champion has gone quiet; may be losing air cover.",
      evidence_quote: cooling,
      confidence: 0.85,
    });

  const quieter = firstMatch(t, /things have gotten quieter internally on this\./);
  if (quieter)
    add({
      signal_type: "engagement",
      value: "Buyer says things have gone quiet internally.",
      evidence_quote: quieter,
      confidence: 0.8,
    });

  const momentum = firstMatch(t, /a lot of momentum this week, the team is excited about this\./);
  if (momentum)
    add({
      signal_type: "engagement",
      value: "Positive momentum; the team is excited.",
      evidence_quote: momentum,
      confidence: 0.85,
    });

  const engaged = firstMatch(t, /Busy, but good\. Happy to dig in\./);
  if (engaged)
    add({
      signal_type: "engagement",
      value: "Buyer is engaged and willing to dig in.",
      evidence_quote: engaged,
      confidence: 0.6,
    });

  // --- Back-half MEDDPICC (surface in emails) ---
  const eb = firstMatch(
    t,
    /ultimately this needs .+?, our CFO, to approve the spend - she holds the budget for anything over 100k/,
  );
  if (eb)
    add({
      signal_type: "meddpicc",
      field: "economic_buyer",
      value: "The CFO holds budget authority for the spend.",
      evidence_quote: eb,
      confidence: 0.9,
    });

  const dp = firstMatch(
    t,
    /my team runs the eval, then it goes to a security review, then finance for final approval\./,
  );
  if (dp)
    add({
      signal_type: "meddpicc",
      field: "decision_process",
      value: "Buyer describes the multi-step decision process.",
      evidence_quote: dp,
      confidence: 0.9,
    });

  const pp = firstMatch(
    t,
    /procurement requires a full legal review and our MSA redlines usually take about three weeks/,
  );
  if (pp)
    add({
      signal_type: "meddpicc",
      field: "paper_process",
      value: "Procurement requires legal review with a ~3 week redline cycle.",
      evidence_quote: pp,
      confidence: 0.9,
    });

  const crRep = firstMatch(t, /you'd mentioned .+? as the things that matter most/);
  if (crRep)
    add({
      signal_type: "meddpicc",
      field: "decision_criteria",
      value: "Decision criteria the buyer cares about most.",
      evidence_quote: crRep,
      confidence: 0.78,
    });
  const crBuyer = firstMatch(t, /yes on requirements - .+? are the deciders\./);
  if (crBuyer)
    add({
      signal_type: "meddpicc",
      field: "decision_criteria",
      value: "Buyer confirms the deciding requirements.",
      evidence_quote: crBuyer,
      confidence: 0.82,
    });

  const quietReply = firstMatch(t, /swamped this week, will circle back\./);
  if (quietReply)
    add({
      signal_type: "engagement",
      value: "Buyer reply is short and non-committal (swamped, will circle back).",
      evidence_quote: quietReply,
      confidence: 0.7,
    });

  // --- Slack ---
  if (env.source === "slack") {
    // Win-wire: migration play
    const line = env.raw_text.split("\n").find((l) => /migration story/.test(l));
    if (line) {
      add({
        signal_type: "win_play",
        value: "Rep won versus the competitor with a zero-downtime migration story.",
        evidence_quote: line,
        confidence: 0.9,
      });
      const comp = COMPETITORS.find((c) => line.includes(c));
      if (comp)
        add({
          signal_type: "competitor",
          entity: comp,
          value: `${comp} was the incumbent that the migration play beat.`,
          evidence_quote: line,
          confidence: 0.85,
        });
    }
    // Deal-help: price pushback
    const push = t.match(
      /anyone hit the '(.+?) is cheaper' pushback on .+?\? losing ground on price there/,
    );
    if (push) {
      add({
        signal_type: "objection",
        value: `Losing ground on price to ${push[1]}.`,
        evidence_quote: push[0],
        confidence: 0.85,
      });
      add({
        signal_type: "competitor",
        entity: push[1],
        value: `${push[1]} is competing on price.`,
        evidence_quote: push[0],
        confidence: 0.85,
      });
    }
  }

  return out;
}

/** Mock equivalent of extractSignalsFromEnvelope — same guardrail, no LLM. */
export function mockExtractSignals(env: SignalEnvelope): Signal[] {
  return validateSignals(mockRawSignals(env), env);
}
