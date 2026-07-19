// The ONE live LLM surface. POST { envelope_id } -> extract ONE conversation.
// One conversation per request (Vercel Hobby timeout). Real Anthropic call when
// ANTHROPIC_API_KEY is set; deterministic mock otherwise (same guardrail).
import { NextResponse } from "next/server";
import { envelopeById } from "@/lib/data";
import { extractSignalsFromEnvelope } from "@/lib/extraction";
import { mockExtractSignals } from "@/lib/mock-extraction";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let envelope_id: string | undefined;
  try {
    ({ envelope_id } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const env = envelope_id ? envelopeById[envelope_id] : undefined;
  if (!env) return NextResponse.json({ error: "unknown envelope_id" }, { status: 404 });

  const useMock = !process.env.ANTHROPIC_API_KEY;
  try {
    const signals = useMock
      ? mockExtractSignals(env)
      : await extractSignalsFromEnvelope(env);
    return NextResponse.json({ envelope: env, signals, mode: useMock ? "mock" : "live" });
  } catch (err) {
    console.error("live extract failed:", err);
    return NextResponse.json({ envelope: env, signals: [], mode: useMock ? "mock" : "live", error: "extraction failed" });
  }
}
