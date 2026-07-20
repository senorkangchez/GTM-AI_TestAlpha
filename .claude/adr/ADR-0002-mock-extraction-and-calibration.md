# ADR-0002: Mock extraction fallback, scoring calibration, rubric-from-signals

**Status**: Accepted
**Date**: 2026-07-17

## Overview of the functionality

Three execution-time decisions that deviated from or refined ADR-0001, made because
no `ANTHROPIC_API_KEY` was available at build time (the user chose the "no key handy,
mock fallback" path).

Files: `lib/mock-extraction.ts` (new), `scripts/precompute.ts` (mock/live switch +
`signals.meta.json`), `lib/scoring.ts` (decay + competitive-threat recalibration),
`lib/rubric.ts` (grades from precomputed signals rather than a separate LLM pass),
`lib/router.ts` (cluster membership requires call/email evidence).

## Design decisions

- **Deterministic mock extractor as an LLM stand-in.** It pattern-matches the
  transcript templates to produce `RawSignal[]`, then runs them through the *same*
  `validateSignals` guardrail as the real path — so every mock signal is a genuine
  verbatim substring (0 violations). `precompute.ts` auto-switches to the real
  Anthropic agent when a key is present; nothing downstream changes. The extraction
  mode is recorded in `signals.meta.json` and surfaced in the UI for an honest split.
- **Scoring recalibration for the 6-week window.** The original 21-day half-life
  decayed in-window June conversations too hard (every account read at-risk). Added a
  14-day grace window + 45-day half-life, and changed competitive threat from a linear
  sum of mentions to `strongest mention + capped breadth` (a competitor named on 3
  calls isn't 3× the threat). Result: a legible spread (Stark healthy 81, Northwind
  at-risk 29 with a critical Commit divergence).
- **Rubric graded from precomputed signals, not a separate grade-rubric pass.** The
  leadership rubric is a config-driven view over the already-extracted evidence
  (`fixtures/surveys.json` → `lib/rubric.ts`), computed at build time. This avoids a
  second precompute artifact while keeping the "leadership defines it, the field grades
  it, reps do nothing" story intact. A live re-grade pass remains a clean future add.
- **Cluster membership requires call/email evidence.** A Slack price-gripe alone
  doesn't put a competitor "in the evaluation," so cluster counts exclude slack-only
  mentions — restoring the intended Zendesk (6, fires) vs HubSpot (3, doesn't) contrast.

## Challenges encountered

- No API key at build time, but the demo must still build, score, route, and deploy.
- Mock signals initially made the whole board red (no visual spread), undercutting the
  "divergence pops" narrative.
- A Slack gripe about Soylent inflated the HubSpot cluster to 4, breaking the contrast.

## Solutions implemented

- The mock extractor + auto-switching precompute (above).
- The decay + competitive-threat recalibration + a mild positive-engagement cue for
  healthy openers (above).
- Call/email-only cluster membership (above).

## Future considerations

- Swap to live extraction by adding a key and re-running `npm run precompute`; re-run
  `npm run eval` to compare live vs mock accuracy.
- A dedicated `grade-rubric` LLM pass over raw conversations (vs. deriving from signals)
  if leadership rubrics grow beyond what the signal types capture.
