# ADR-0003: Two dials, the landing receipt, and the approval queue (SPEC Addendum v2)

**Status**: Accepted
**Date**: 2026-07-20

## Overview of the functionality

Implements SPEC_ADDENDUM.md v2, which layers onto (does not replace) the v1 build: a
second **Progression** dial, a `touches` activity layer, the Account-View **landing
panel** (the "data → field" receipt), and a human-gated **approval queue**. Problem-first
framing added to README, deck, and How-it-works.

Files: `lib/progression.ts`, `lib/landing.ts`, `lib/approvals.ts`, `scripts/generate-touches.ts`,
`fixtures/touches.json`, `components/TwoDials.tsx` / `LandingPanel.tsx` / `ApprovalControls.tsx` /
`QueueClient.tsx`, `app/(dashboard)/queue/page.tsx`, reworked `app/(dashboard)/account/[accountId]/page.tsx`,
updated `scripts/generate.py` (→ v2), `lib/types.ts`, `lib/data.ts`, `lib/store.ts`, `app/layout.tsx`,
`README.md`, `presentation/DECK-OUTLINE.md`, `app/(dashboard)/how-it-works/page.tsx`.

## Design decisions

- **Progression is directional, not a volume tally.** `score01 = 0.6·funnel_depth +
  0.4·two-way_momentum`. Momentum counts only inbound (buyer-reply) touches, recency-
  decayed; outbound activity credits funnel depth but never momentum — so blasting one-way
  sequences cannot game the score (unit-tested). Kept entirely separate from the health
  score: two dials, two questions, allowed to disagree (Northwind 99 vs 29).
- **Touches bound to existing accounts, not a full regenerate.** Re-running the v2
  generator would shift every filler profile via RNG and invalidate the calibrated
  signals + demo moments. `scripts/generate-touches.ts` generates `touches.json` for the
  committed accounts (depth from CRM stage, recency/reciprocity from trajectory), which is
  what the addendum means by "reuse the seed, account list, window." `generate.py` is
  updated to v2 as the canonical methodology artifact.
- **The landing panel is the "sausage-making" answer.** One row per MEDDPICC field: source
  conversation → extracted field → verbatim evidence + Accept/Reject; absent fields greyed
  (absence is signal — the whole Northwind story). It reuses the precomputed signals.
- **Approvals never touch a CRM.** Client-side status (`pending`/`approved`/`rejected`) in
  localStorage via `useSyncExternalStore`, shared by the inline panel and the global
  `/queue`. Accept = status flip + "would sync to SFDC ✓" badge. The human gate *is* the
  shadow-DB boundary; the queue doubles as a labeled-training-data flywheel.

## Challenges encountered

- Reciprocity guardrail leaked: 20 shallow outbound touches still juiced momentum via volume.
- Keeping the new account view a server component while the receipt needs interactive Accept/Reject.
- Progression must stay HIGH for Northwind (it *is* far along) even though its recent activity is one-way.

## Solutions implemented

- Momentum counts inbound only (outbound → depth, not momentum); shallow one-way now caps at "Early".
- Server components (`LandingPanel`, account page) render client islands (`ApprovalControls`) — minimal client JS.
- Depth dominates progression (0.6 weight) and is set by CRM stage, so Northwind stays Advanced while
  the one-way recent activity only dampens the momentum term.

## Future considerations

- Persist approvals server-side (they're per-browser now) and pipe accepted/rejected labels into a
  live extraction eval. A dedicated LLM rubric/landing re-grade pass over raw conversations if rubrics
  outgrow the signal types. Real Outreach/Marketo connectors replacing the synthetic touch layer.
