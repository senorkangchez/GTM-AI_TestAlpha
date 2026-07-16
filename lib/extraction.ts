// ---------------------------------------------------------------------------
// The ONE LLM agent: extraction. Shared by scripts/precompute.ts (offline) and
// app/api/extract/route.ts (live), so the prompt + validation can never drift.
//
// Model: claude-haiku-4-5 (cheap/fast; this runs at volume in the real system).
// Confirmed via the claude-api reference: on Haiku 4.5, temperature:0 is valid,
// thinking is omitted (effort would error), cache_control is accepted.
//
// The load-bearing guardrail is enforced in CODE, not trusted to the prompt:
// every signal's evidence_quote must be a verbatim substring of raw_text, else
// the signal is dropped. This is the anti-hallucination anchor.
// ---------------------------------------------------------------------------
import Anthropic from "@anthropic-ai/sdk";
import type {
  MeddpiccField,
  RawSignal,
  Signal,
  SignalEnvelope,
  SignalType,
} from "./types";
import { MEDDPICC_FIELDS } from "./types";

export const EXTRACTION_MODEL = "claude-haiku-4-5";

const SIGNAL_TYPES: SignalType[] = [
  "meddpicc",
  "competitor",
  "objection",
  "win_play",
  "engagement",
];

export const EXTRACTION_SYSTEM_PROMPT = `You are a GTM field-intelligence extraction agent. You read one sales
conversation (a call transcript, an email, or a Slack thread) and extract
structured, evidence-backed signals from it. You do not summarize, advise, or
speculate. You only report what is actually supported by the text.

You extract signals of these types:
- "meddpicc": an element of MEDDPICC is evidenced. Set \`field\` to exactly one of:
  metrics, economic_buyer, decision_criteria, decision_process, paper_process,
  identify_pain, champion, competition.
- "competitor": a competing vendor is named or clearly alluded to. Put the vendor
  in \`entity\`.
- "objection": the buyer raises a concern, blocker, or reason to hesitate.
- "win_play": a rep describes something that worked / advanced the deal (most
  common in Slack win-wire posts and internal notes).
- "engagement": a cue about buyer engagement or sentiment trajectory (going quiet,
  enthusiastic, delaying, looping in more people).

Rules:
1. Every signal MUST include \`evidence_quote\`: a VERBATIM span copied exactly from
   the input text that supports the signal. Do not paraphrase the quote. If you
   cannot find a verbatim span, do not emit the signal.
2. \`value\` is your own concise restatement of the claim (one sentence).
3. \`confidence\` is 0.0-1.0: how strongly the text supports the signal.
4. Extract only what is present. An absence is not a signal. Do not infer an
   economic buyer just because a senior name appears - only if authority is stated
   or clearly implied.
5. A single conversation may yield multiple signals of different types, or none.

Return ONLY a JSON array (no prose, no markdown fences) of objects with keys:
signal_type, field, entity, value, evidence_quote, confidence.
Omit \`field\` (null) unless signal_type is "meddpicc". Omit \`entity\` (null) unless
signal_type is "competitor".

Worked example.
INPUT:
"""
[05:33] Dana Lee: We are also evaluating Zendesk, just so you know the landscape.
[07:02] Rep: Internal note - Dana Lee is clearly our champion here, actively selling this internally on our behalf.
"""
OUTPUT:
[
  {"signal_type":"competitor","field":null,"entity":"Zendesk","value":"The buyer is evaluating Zendesk as a competing vendor.","evidence_quote":"We are also evaluating Zendesk, just so you know the landscape.","confidence":0.95},
  {"signal_type":"meddpicc","field":"champion","entity":null,"value":"Dana Lee is an internal champion selling on the rep's behalf.","evidence_quote":"Dana Lee is clearly our champion here, actively selling this internally on our behalf.","confidence":0.9}
]`;

export function buildUserPrompt(env: SignalEnvelope): string {
  return `SOURCE: ${env.source}
ACCOUNT: ${env.account_name}
PARTICIPANTS: ${env.participants.join(", ")}
TIMESTAMP: ${env.timestamp}

CONVERSATION TEXT:
"""
${env.raw_text}
"""`;
}

/** Defensive parse: strip ```json fences, trim, JSON.parse in try/catch. Never throws. */
export function parseModelJson(text: string): RawSignal[] {
  let cleaned = text.trim();
  // strip a leading ```json / ``` fence and trailing ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // if the model wrapped prose around the array, grab the outermost [...]
  if (!cleaned.startsWith("[")) {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? (parsed as RawSignal[]) : [];
  } catch {
    return [];
  }
}

function clampConfidence(c: unknown): number {
  const n = typeof c === "number" ? c : Number(c);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

/**
 * Turn raw model objects into validated Signals. Drops any signal whose
 * evidence_quote is not a verbatim substring of the source raw_text (the
 * anti-hallucination guardrail), whitelists signal_type/field, and stamps
 * provenance from the envelope.
 */
export function validateSignals(raw: RawSignal[], env: SignalEnvelope): Signal[] {
  const out: Signal[] = [];
  raw.forEach((r, i) => {
    const signal_type = r.signal_type as SignalType;
    if (!SIGNAL_TYPES.includes(signal_type)) return;

    const quote = (r.evidence_quote ?? "").trim();
    // THE guardrail: verbatim substring check, in code.
    if (!quote || !env.raw_text.includes(quote)) return;

    let field: MeddpiccField | null = null;
    if (signal_type === "meddpicc") {
      const f = r.field as MeddpiccField;
      if (!MEDDPICC_FIELDS.includes(f)) return; // meddpicc signal needs a valid field
      field = f;
    }

    const entity =
      signal_type === "competitor" && typeof r.entity === "string" && r.entity.trim()
        ? r.entity.trim()
        : null;

    out.push({
      signal_id: `${env.envelope_id}-${i}`,
      envelope_id: env.envelope_id,
      account_id: env.account_id,
      opp_id: env.opp_id,
      source: env.source,
      signal_type,
      field,
      entity,
      value: typeof r.value === "string" ? r.value : "",
      evidence_quote: quote,
      confidence: clampConfidence(r.confidence),
      timestamp: env.timestamp,
    });
  });
  return out;
}

let cachedClient: Anthropic | null = null;

/** Lazily construct the client so importing this module never requires the key. */
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.local.example).",
    );
  }
  cachedClient ??= new Anthropic();
  return cachedClient;
}

/**
 * The single live call. One envelope -> validated Signal[]. On any API/parse
 * error, returns [] and logs (never crashes the caller).
 */
export async function extractSignalsFromEnvelope(
  env: SignalEnvelope,
  client: Anthropic = getClient(),
): Promise<Signal[]> {
  try {
    const message = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 2048,
      temperature: 0,
      system: [
        {
          type: "text",
          text: EXTRACTION_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildUserPrompt(env) }],
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return validateSignals(parseModelJson(text), env);
  } catch (err) {
    console.error(`extraction failed for ${env.envelope_id}:`, err);
    return [];
  }
}
