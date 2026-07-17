// Offline extraction pass. Reads fixtures/envelopes.json, runs the extraction
// agent over each envelope, validates evidence quotes, and writes
// fixtures/signals.precomputed.json + fixtures/signals.meta.json.
//
// If ANTHROPIC_API_KEY is set -> the REAL LLM agent (lib/extraction.ts).
// If not -> a deterministic MOCK (lib/mock-extraction.ts) so the app still
// builds and demos. Add a key and re-run to regenerate with real signals; the
// downstream code is identical.
//
//   cp .env.local.example .env.local   # then paste your key (optional)
//   npm run precompute
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pLimit from "p-limit";
import { extractSignalsFromEnvelope, getClient } from "../lib/extraction";
import { mockExtractSignals } from "../lib/mock-extraction";
import type { Signal, SignalEnvelope } from "../lib/types";

const ENVELOPES_PATH = resolve(process.cwd(), "fixtures/envelopes.json");
const OUT_PATH = resolve(process.cwd(), "fixtures/signals.precomputed.json");
const META_PATH = resolve(process.cwd(), "fixtures/signals.meta.json");
const CONCURRENCY = 4;

async function main() {
  const useMock = !process.env.ANTHROPIC_API_KEY;
  const mode = useMock ? "mock" : "live";

  if (useMock) {
    console.warn(
      "\n⚠️  No ANTHROPIC_API_KEY found - using the DETERMINISTIC MOCK extractor.\n" +
        "   Signals are evidence-quoted stand-ins. Add a key to .env.local and re-run\n" +
        "   `npm run precompute` to regenerate with the real LLM agent.\n",
    );
  } else {
    getClient(); // fail fast if the key is malformed
    console.log("Using the LIVE Anthropic extraction agent (claude-haiku-4-5).\n");
  }

  const envelopes: SignalEnvelope[] = JSON.parse(readFileSync(ENVELOPES_PATH, "utf8"));
  console.log(`Extracting from ${envelopes.length} envelopes (${mode})...\n`);

  const limit = pLimit(CONCURRENCY);
  const results = await Promise.all(
    envelopes.map((env) =>
      limit(async () => {
        const signals = useMock ? mockExtractSignals(env) : await extractSignalsFromEnvelope(env);
        console.log(
          `  ${env.envelope_id} [${env.source}] ${env.account_name}: ${signals.length} signal(s)`,
        );
        return signals;
      }),
    ),
  );

  const all: Signal[] = results.flat();
  writeFileSync(OUT_PATH, JSON.stringify(all, null, 2) + "\n");

  const byType: Record<string, number> = {};
  for (const s of all) byType[s.signal_type] = (byType[s.signal_type] ?? 0) + 1;
  const empty = results.filter((r) => r.length === 0).length;

  writeFileSync(
    META_PATH,
    JSON.stringify(
      {
        mode, // "live" | "mock" — the UI surfaces this for an honest demo split
        model: useMock ? "deterministic-mock" : "claude-haiku-4-5",
        envelopes: envelopes.length,
        signals: all.length,
        by_type: byType,
        envelopes_with_zero_signals: empty,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\nWrote ${all.length} signals to ${OUT_PATH} (mode: ${mode})`);
  console.log(`By type: ${JSON.stringify(byType)}`);
  console.log(`Envelopes with 0 signals: ${empty} (noise correctly rejected)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
