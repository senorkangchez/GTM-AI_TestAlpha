// Generate fixtures/touches.json BOUND to the committed accounts (reads
// ground_truth.json), so account_ids/opp_ids/trajectories stay consistent with the
// rest of the calibrated demo. Ports the v2 generate.py touch logic (funnel-mix +
// recency + reciprocity), with funnel DEPTH taken from CRM stage (a Commit deal has
// had deep AE touches; a Discovery deal hasn't) so progression tracks "how far
// along" — orthogonal to health. Deterministic (seeded); run: npm run gen-touches
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TODAY = new Date("2026-07-16T00:00:00").getTime();
const WINDOW_DAYS = 42;
const FUNNEL: ("marketo" | "outreach" | "email" | "gong_call")[] = ["marketo", "outreach", "email", "gong_call"];

// stage -> deepest funnel channel index reached
const STAGE_DEPTH: Record<string, number> = {
  Discovery: 1, // marketo, outreach
  Evaluation: 2, // + email
  Proposal: 2,
  Negotiation: 3, // + gong_call
  Commit: 3,
};

const SUMMARIES: Record<string, { inbound: string[]; outbound: string[] }> = {
  marketo: { inbound: ["opened nurture email", "downloaded the ROI whitepaper", "clicked webinar invite", "hit the pricing page"], outbound: ["sent nurture email", "added to webinar invite list", "enrolled in drip campaign"] },
  outreach: { inbound: ["replied to sequence step 2", "booked intro from cold email", "opened outreach email"], outbound: ["sent sequence step 1", "no reply to sequence step 1", "sent follow-up, no response"] },
  email: { inbound: ["replied to AE follow-up", "shared requirements over email", "looped in a colleague"], outbound: ["sent AE follow-up", "emailed recap, no reply", "chased for next steps"] },
  gong_call: { inbound: ["discovery call held", "technical deep-dive call", "exec alignment call"], outbound: ["pricing call", "left voicemail, call not held", "proposed call time"] },
};

// Deterministic PRNG (mulberry32) so the committed fixture is reproducible.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(20260716);
const ri = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(a: T[]): T => a[Math.floor(rand() * a.length)];
const iso = (daysAgo: number) => new Date(TODAY - daysAgo * 86_400_000 + ri(9, 17) * 3_600_000).toISOString();

interface GT {
  account_id: string;
  opp_id: string;
  crm_stage: string;
  trajectory: string;
}

const root = process.cwd();
const gt: GT[] = JSON.parse(readFileSync(resolve(root, "fixtures/ground_truth.json"), "utf8"));

const touches: Record<string, unknown>[] = [];
let tid = 0;

for (const a of gt.slice().sort((x, y) => x.account_id.localeCompare(y.account_id))) {
  const traj = a.trajectory;
  const depth = STAGE_DEPTH[a.crm_stage] ?? 1;
  const reached = FUNNEL.slice(0, depth + 1);
  const acctTouches: Record<string, unknown>[] = [];

  reached.forEach((channel, di) => {
    const n = channel === "marketo" || channel === "outreach" ? ri(2, 4) : ri(1, 3);
    const baseDay = WINDOW_DAYS - Math.round((di / Math.max(reached.length, 1)) * (WINDOW_DAYS - 4));
    for (let k = 0; k < n; k++) {
      const day = Math.max(1, baseDay - ri(0, 9));
      let direction: "inbound" | "outbound";
      if (traj === "rotting") direction = day <= 14 ? "outbound" : pick(["inbound", "outbound"] as const);
      else if (traj === "accelerating") direction = rand() < 0.6 ? "inbound" : "outbound";
      else if (traj === "healthy") direction = rand() < 0.45 ? "inbound" : "outbound";
      else direction = rand() < 0.25 ? "inbound" : "outbound";
      acctTouches.push({
        touch_id: `tch_${(tid++).toString(36).padStart(6, "0")}`,
        account_id: a.account_id,
        opp_id: a.opp_id,
        channel,
        direction,
        timestamp: iso(day),
        summary: pick(SUMMARIES[channel][direction]),
      });
    }
  });

  acctTouches.sort((x, y) => ((x.timestamp as string) < (y.timestamp as string) ? -1 : 1));
  // Guarantee the hero contrasts survive: accelerating shows a recent buyer reply;
  // rotting shows NO recent buyer reply (buyer gone quiet).
  if (acctTouches.length) {
    if (traj === "accelerating") {
      const last = acctTouches[acctTouches.length - 1];
      last.direction = "inbound";
      last.summary = pick(SUMMARIES[last.channel as string].inbound);
    } else if (traj === "rotting") {
      for (const t of acctTouches) {
        const ageDays = (TODAY - new Date(t.timestamp as string).getTime()) / 86_400_000;
        if (ageDays <= 14 && t.direction !== "outbound") {
          t.direction = "outbound";
          t.summary = pick(SUMMARIES[t.channel as string].outbound);
        }
      }
    }
  }
  touches.push(...acctTouches);
}

touches.sort((x, y) => ((x.timestamp as string) < (y.timestamp as string) ? -1 : 1));
writeFileSync(resolve(root, "fixtures/touches.json"), JSON.stringify(touches, null, 2) + "\n");

const byAcct: Record<string, number> = {};
for (const t of touches) byAcct[t.account_id as string] = (byAcct[t.account_id as string] ?? 0) + 1;
console.log(`Wrote ${touches.length} touches across ${Object.keys(byAcct).length} accounts.`);
for (const a of gt) console.log(`  ${a.account_id.padEnd(16)} ${a.crm_stage.padEnd(11)} ${a.trajectory.padEnd(12)} touches=${byAcct[a.account_id] ?? 0}`);
