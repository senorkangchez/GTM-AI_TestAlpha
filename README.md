# Field Intelligence System

**Problem.** Field intelligence is trapped across disparate sources — calls, emails,
Slack — and reps won't do the CRM admin to surface it. So the CRM goes stale, no one has
a true account 360, and the deals that are quietly rotting look fine on paper. **This
system** extracts that intelligence automatically, lands it on the account as *reviewable*
CRM updates, and flags where the CRM disagrees with what the field is actually saying.

A GTM case-study build: **a system of intelligence that sits beside the CRM.** It reads
what sales hears — Gong calls, emails, Slack — derives evidence-backed signals with one
real LLM step, then deterministically scores accounts on **two dials** (Health = how well
it's going; Progression = how far along), surfaces where the CRM and the field disagree,
lands each extracted field as a human-approved suggestion, and routes the insight to
whoever can act. Runs as a self-contained demo on synthetic data, deployable to a public URL.

- **The product isn't a score — it's the divergence.** "CRM says Commit, the field says
  soft," with a traceable reason for every number.
- **Live demo paths:** territory dashboard → account drill-down (evidence quotes + rubric)
  → routing (golden-route propagation) → live extraction → how-it-works.

## The honest split (state this in the walkthrough)

- **Data — fully synthetic.** A seeded generator (`scripts/generate.py`) plants a hidden
  ground-truth answer key, then *hides it in natural conversations*. The MEDDPICC we used
  to fabricate directly is now the answer key we grade extraction against.
- **Extraction — the one real LLM.** `lib/extraction.ts` calls Anthropic (Haiku 4.5),
  envelope → typed, evidence-quoted signals. Without an API key it falls back to a
  **deterministic mock** with the *identical* verbatim-quote guardrail, so the whole app
  builds and demos offline; add a key and re-run precompute to switch to live. The current
  mode is shown in the header badge and on the How-it-works page.
- **Everything downstream — deterministic code.** Scoring, divergence, routing, rollups,
  rubric — pure, unit-tested functions, precomputed and statically rendered. Zero
  per-request cost except the one live-extract button.

## Architecture

```
Gong calls / emails / Slack ─▶ [EXTRACTION AGENT — the one LLM] ─▶ evidence-quoted signals
Outreach / Marketo / call / email touches ─▶ (structured, NOT extracted)
        │
        ▼ (all deterministic)
   PROGRESSION      HEALTH          DIVERGENCE       ROUTER            RUBRIC
   "how far along"  "how well"      CRM vs field     reason-coded      leadership grade
        └── ACCOUNT VIEW: landing receipt (source→field→evidence, Accept/Reject) + two dials
        └── ROUTER → Slack / Outreach / Marketo / Salesforce / #product / play library
        └── APPROVAL QUEUE: human-gated suggestions — nothing auto-writes to the CRM
```

One LLM agent (extraction). Progression, health, router, and rubric are deterministic on
purpose — auditable, cheap, reproducible. **Two dials that can disagree** (Northwind: far
along AND unhealthy) are the point. Touches are structured activity and never go through
the LLM. Synthesis and digest agents are named as roadmap, not built.

## Buy vs build

Buy the whole stack (Gong, Salesforce, Outreach, Marketo, Clay, Slack); build only the
middle intelligence layer none of them provide — cross-source reasoning that turns
individual conversations into an account-level, CRM-diverging, evidence-anchored signal.
First move: de-risk extraction, because everything downstream depends on it.

## Dummy-data methodology (`scripts/generate.py`)

"Plant the answer, hide it in prose, grade against it." Front-half MEDDPICC (pain, metrics,
champion, competition) surfaces on **calls**; back-half (economic buyer, decision/paper
process) surfaces in **emails** — encoding the "calls vs emails" truth in the data. Three
demo moments are planted: a divergence deal (Northwind), a cross-deal competitor cluster
(Zendesk), and a propagatable win play (the zero-downtime migration story).

## Failure modes considered

- **Hallucination** → every signal must be a verbatim substring of the source, checked in
  code (`validateSignals`); unquotable signals are dropped.
- **Alert fatigue** → clustering + a recipient-load governor; single mentions are logged,
  not routed.
- **Divergence false-positives** → flags require confidence + cited evidence, always shown.
- **Staleness** → recency decay (grace window + half-life).
- **Cross-source conflict** → newest evidence wins on a contested field.
- **Black-box distrust** → reason codes on every driver and decision.
- **Cost at volume** → cheap model + precompute + one-conversation-per-request.

## Run it

```bash
npm install
npm test            # 27 unit tests: scoring, divergence, rollup, router, progression
npm run precompute  # regenerate fixtures/signals.precomputed.json
                    #   no ANTHROPIC_API_KEY -> deterministic mock
                    #   with a key in .env.local -> real Anthropic extraction
npm run gen-touches # regenerate fixtures/touches.json (activity for the progression dial)
npm run eval        # grade extraction vs the planted answer key (terminal table)
npm run dev         # http://localhost:3000
```

To run real extraction: `cp .env.local.example .env.local`, paste your key, then
`npm run precompute` (regenerates committed signals) and restart. The Live-extract tab and
the `/api/extract` route also go live automatically.

## Deploy (Vercel CLI)

```bash
npm i -g vercel        # or use `npx vercel`
vercel                 # first run links/creates the project
vercel env add ANTHROPIC_API_KEY   # optional: enables live extraction on the deployment
vercel --prod          # ship it
```

The build is `next build` only — precompute is **not** in the build (signals are committed),
so deploys are deterministic and need no key at build time. `/api/extract` is a Node
serverless function; one Haiku call fits the Hobby timeout.

## Map

```
lib/        types · extraction · mock-extraction · scoring · progression · rollup · router ·
            rubric · landing · approvals · data · store · org · format
app/        (dashboard) territory/account/district/routing/queue/live/how-it-works · api/extract
components/ ScoreRing · TwoDials · DivergenceHero · DriverBars · LandingPanel · ApprovalControls ·
            QueueClient · ChangeFeed · RoutingTable · WinPlayCard · RubricScorecard · …
fixtures/   envelopes · ground_truth · accounts · signals.precomputed · touches · surveys (.json)
scripts/    generate.py · generate-touches.ts · precompute.ts · eval.ts
```
