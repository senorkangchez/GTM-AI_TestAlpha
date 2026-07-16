# ADR-0001: Field Intelligence System — architecture

**Status**: Accepted
**Date**: 2026-07-16

## Overview of the functionality

A GTM case-study deliverable: a "system of intelligence" that sits BESIDE the CRM. It
ingests raw sales conversations (Gong call transcripts, sales emails, Slack threads),
runs one real LLM extraction agent to derive evidence-quoted typed signals, then
deterministically scores accounts, computes the divergence between CRM stage and signal
health, routes signals to styled system-of-action previews, and surfaces it all on a
dashboard. Two secondary capabilities: a leadership-defined rubric auto-graded from the
same conversations, and a golden-route play-propagation loop.

Files created in this step (foundation): `lib/types.ts` (the shared schema), `lib/format.ts`,
`lib/org.ts`, `fixtures/envelopes.json` (46 envelopes = 44 provided + 2 planted historical
Zendesk win-wires), `fixtures/ground_truth.json` (12-account answer key), `fixtures/accounts.json`
(deal-amount/territory/district enrichment), plus config (`vitest.config.ts`, `vercel.json`,
`.env.local.example`) and `package.json` scripts. Subsequent steps add `lib/extraction.ts`,
`lib/scoring.ts`, `lib/rollup.ts`, `lib/router.ts`, `lib/rubric.ts`, the `app/` dashboard +
API route, `components/`, and `scripts/`.

## Design decisions

- **One LLM agent, everything else deterministic.** Extraction is the only LLM surface.
  Scoring, divergence, routing, and rollups are pure, unit-tested functions — auditable,
  cheap, reproducible. This is the case study's "buy the stack, build the middle" answer:
  buy Gong/Salesforce/Outreach/Marketo/Clay/Slack; build only the cross-source intelligence
  layer none of them provide.
- **Evidence-quote guardrail.** Every signal must carry a verbatim substring of its source
  `raw_text`, enforced in code after the model returns (not just in the prompt). This is the
  primary anti-hallucination anchor.
- **Precompute + one-per-request.** All extraction is precomputed offline and committed as
  fixtures so the dashboard is statically rendered and free to load. The live API route
  extracts exactly one conversation per request to fit the Vercel Hobby timeout.
- **Additive enrichment layer.** The generated fixtures carry no deal amount/territory. Re-
  running a modified `generate.py` would change ids and invalidate the committed data, so
  `accounts.json` is an additive join keyed by the stable `acc_*` id — never touches the
  generator's random stream.
- **Next.js 16 + React 19 + Tailwind v4.** Scaffolded via `create-next-app`. Tailwind v4 is
  CSS-first (theme tokens in `globals.css`, no `tailwind.config.ts`). Path alias `@/*` -> `./*`,
  mirrored in `vitest.config.ts`.

## Challenges encountered

- **Missing org/deal data in fixtures.** Rollups (account -> territory -> district, dollar-
  weighted) and the router's deal-value input need fields the generator never emitted.
- **Golden-route pattern needs >1 win.** The propagation guardrail requires a pattern of 3
  Zendesk wins, but the provided data has exactly one (Stark).
- **Toolchain surprises.** Next.js 16 ships breaking changes (async `params`) and Tailwind v4
  drops the JS config file; the scaffold's own AGENTS.md warns to read `node_modules/next/dist/docs/`.

## Solutions implemented

- **Org/deal data:** hand-authored `accounts.json` enrichment keyed by `account_id`,
  concentrating the Zendesk cluster + Northwind's $480k divergence in the `west` district.
- **Golden-route pattern:** planted 2 historical "won vs Zendesk" win-wire envelopes
  (Massive Dynamic, Prestige Worldwide) so the pattern fires at 3 — appended to
  `envelopes.json` without regenerating, ids clearly synthetic.
- **Toolchain:** adapting to Tailwind v4 CSS-first theming and Next 16 async-params
  conventions; consulting the bundled docs before writing pages/routes.

## Future considerations

- Deferred (roadmap, not built): synthesis agent (LLM battlecard drafting), digest agent
  (LLM weekly leadership summary), a full leadership-rubric authoring UI, event-driven
  (webhook) triggers, embeddings-based retrieval for rubric grading at scale, and
  territory/role access control on sensitive transcripts.
