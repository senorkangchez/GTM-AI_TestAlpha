// Offline extraction pass. Reads fixtures/envelopes.json, runs the ONE LLM
// agent over each envelope, validates evidence quotes, and writes
// fixtures/signals.precomputed.json. Run once (needs ANTHROPIC_API_KEY); the
// committed output is what the dashboard loads. NOT part of the Vercel build.
//
//   cp .env.local.example .env.local   # then paste your key
//   npm run precompute
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pLimit from "p-limit";
import { extractSignalsFromEnvelope, getClient } from "../lib/extraction";
import type { Signal, SignalEnvelope } from "../lib/types";

const ENVELOPES_PATH = resolve(process.cwd(), "fixtures/envelopes.json");
const OUT_PATH = resolve(process.cwd(), "fixtures/signals.precomputed.json");
const CONCURRENCY = 4;

async function main() {
  // Fail fast with a friendly message if the key is missing.
  getClient();

  const envelopes: SignalEnvelope[] = JSON.parse(readFileSync(ENVELOPES_PATH, "utf8"));
  console.log(`Extracting signals from ${envelopes.length} envelopes (concurrency ${CONCURRENCY})...\n`);

  const limit = pLimit(CONCURRENCY);
  const results = await Promise.all(
    envelopes.map((env) =>
      limit(async () => {
        const signals = await extractSignalsFromEnvelope(env);
        console.log(
          `  ${env.envelope_id} [${env.source}] ${env.account_name}: ${signals.length} signal(s)`,
        );
        return signals;
      }),
    ),
  );

  const all: Signal[] = results.flat();
  writeFileSync(OUT_PATH, JSON.stringify(all, null, 2) + "\n");

  // Summary — useful when presenting the methodology.
  const byType: Record<string, number> = {};
  for (const s of all) byType[s.signal_type] = (byType[s.signal_type] ?? 0) + 1;
  const empty = results.filter((r) => r.length === 0).length;
  console.log(`\nWrote ${all.length} signals to ${OUT_PATH}`);
  console.log(`By type: ${JSON.stringify(byType)}`);
  console.log(`Envelopes with 0 signals: ${empty} (noise correctly rejected)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
