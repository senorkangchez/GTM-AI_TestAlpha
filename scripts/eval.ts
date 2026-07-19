// Extraction eval: grade the extracted signals against the hidden answer key.
// Because generate.py planted the ground truth, we can measure extraction
// field-by-field. Prints a terminal table; calls out the two hard back-half
// fields (economic_buyer, paper_process). Run: npm run eval
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type MeddpiccField =
  | "metrics" | "economic_buyer" | "decision_criteria" | "decision_process"
  | "paper_process" | "identify_pain" | "champion" | "competition";
const FIELDS: MeddpiccField[] = [
  "identify_pain", "metrics", "champion", "competition",
  "decision_criteria", "economic_buyer", "decision_process", "paper_process",
];

interface Signal {
  account_id: string;
  signal_type: string;
  field: string | null;
  entity: string | null;
}
interface GT {
  account: string;
  account_id: string;
  meddpicc_present: string[];
  competitor: string | null;
  has_win_play: boolean;
}

const root = process.cwd();
const signals: Signal[] = JSON.parse(readFileSync(resolve(root, "fixtures/signals.precomputed.json"), "utf8"));
const gt: GT[] = JSON.parse(readFileSync(resolve(root, "fixtures/ground_truth.json"), "utf8"));
const meta = JSON.parse(readFileSync(resolve(root, "fixtures/signals.meta.json"), "utf8"));

function detectedFields(accountId: string): Set<string> {
  const set = new Set<string>();
  for (const s of signals) {
    if (s.account_id !== accountId) continue;
    if (s.signal_type === "meddpicc" && s.field) set.add(s.field);
    if (s.signal_type === "competitor") set.add("competition");
  }
  return set;
}
function detectedCompetitor(accountId: string): string | null {
  const counts: Record<string, number> = {};
  for (const s of signals)
    if (s.account_id === accountId && s.signal_type === "competitor" && s.entity)
      counts[s.entity] = (counts[s.entity] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

// Per-field confusion across all accounts.
const conf: Record<string, { tp: number; fp: number; fn: number; tn: number }> = {};
for (const f of FIELDS) conf[f] = { tp: 0, fp: 0, fn: 0, tn: 0 };

let fieldCorrect = 0;
for (const g of gt) {
  const det = detectedFields(g.account_id);
  const present = new Set(g.meddpicc_present);
  for (const f of FIELDS) {
    const inGt = present.has(f);
    const inDet = det.has(f);
    if (inGt && inDet) conf[f].tp++;
    else if (!inGt && inDet) conf[f].fp++;
    else if (inGt && !inDet) conf[f].fn++;
    else conf[f].tn++;
    if (inGt === inDet) fieldCorrect++;
  }
}

const pct = (n: number, d: number) => (d === 0 ? "  -  " : `${Math.round((100 * n) / d)}%`.padStart(5));
function prf(c: { tp: number; fp: number; fn: number }) {
  const p = c.tp + c.fp === 0 ? 1 : c.tp / (c.tp + c.fp);
  const r = c.tp + c.fn === 0 ? 1 : c.tp / (c.tp + c.fn);
  const f1 = p + r === 0 ? 0 : (2 * p * r) / (p + r);
  return { p, r, f1 };
}

console.log(`\nExtraction eval  (mode: ${meta.mode}, model: ${meta.model})`);
console.log("=".repeat(64));
console.log("MEDDPICC field detection vs planted ground truth (12 accounts)\n");
console.log("field".padEnd(20) + "prec".padStart(7) + "recall".padStart(8) + "f1".padStart(7) + "  (tp/fp/fn)");
console.log("-".repeat(64));
for (const f of FIELDS) {
  const c = conf[f];
  const { p, r, f1 } = prf(c);
  const hard = f === "economic_buyer" || f === "paper_process" ? " ← hard" : "";
  console.log(
    f.padEnd(20) +
      pct(Math.round(p * 100), 100) +
      pct(Math.round(r * 100), 100) +
      `${f1.toFixed(2)}`.padStart(7) +
      `  (${c.tp}/${c.fp}/${c.fn})` +
      hard,
  );
}

const overall = fieldCorrect / (gt.length * FIELDS.length);
console.log("-".repeat(64));
console.log(`Overall field accuracy: ${Math.round(overall * 100)}% (${fieldCorrect}/${gt.length * FIELDS.length})`);

// Competitor + win_play
let compCorrect = 0;
for (const g of gt) {
  const det = detectedCompetitor(g.account_id);
  if ((det ?? null) === (g.competitor ?? null) || (g.competitor && det === g.competitor)) compCorrect++;
}
const winTp = gt.filter((g) => g.has_win_play && signals.some((s) => s.account_id === g.account_id && s.signal_type === "win_play")).length;
const winTotal = gt.filter((g) => g.has_win_play).length;

console.log(`Competitor identification: ${compCorrect}/${gt.length} accounts correct`);
console.log(`Win-play detection: ${winTp}/${winTotal} planted win-plays found`);

const eb = prf(conf.economic_buyer);
const pp = prf(conf.paper_process);
console.log("\nHard back-half fields (surface only in emails):");
console.log(`  economic_buyer: recall ${Math.round(eb.r * 100)}%   paper_process: recall ${Math.round(pp.r * 100)}%`);
console.log("");
