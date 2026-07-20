# Field Intelligence System — Leadership Deck Outline

> Audience: sales + marketing leadership. They care about outcomes, not APIs.
> Three acts: **Protect revenue → Lift win rates → Zero rep effort.** Every number
> below is from the live demo (synthetic data, but real, traceable figures).

---

## Slide 1 — Title / one-line promise

**"The truth is in the field. We move it — automatically."**
A system of intelligence that sits *beside* the CRM and carries what sales hears on
calls, emails, and Slack to whoever can act on it, in real time.

Speaker note: the CRM is the system of record — what reps *say* is happening. This
is the system of intelligence — what the field *actually* says.

---

## Slide 2 — The problem (why leadership should care)

- The most valuable knowledge in the company — which messaging lands, which
  competitors show up, where deals are quietly slipping — lives in reps' heads and
  one-off Slack threads.
- Today it travels by call notes and QBRs. By the time it reaches marketing,
  product, and leadership, the deal has moved.
- Reps shouldn't have to do extra work to share it.

---

## Slide 3 — ACT I: Protect revenue (the divergence)

**Headline: $1.03M of late-stage pipeline is quietly diverging.**

- Across 4 deals, the CRM stage is ahead of what the field actually shows.
- The hero: **Northwind — a $480K deal marked _Commit_, that the field scores
  _at-risk_ (29/100).** No economic buyer anywhere in the conversations, Zendesk
  rising across the last three calls, champion going quiet in the latest emails.
- The forecast says this is closing. The field says it isn't. We surface that gap
  **weeks before it slips** — with the exact quotes behind every driver.

Visual: the divergence hero card (CRM says Commit / field says soft) + driver chips.

Speaker note: the score never reads the CRM stage — so when they disagree, it's
real, not circular.

---

## Slide 4 — ACT II: Lift win rates for everyone (propagation)

**Headline: one rep's winning play, pushed to every open deal that needs it.**

- We won 3 deals against Zendesk with the same move — a zero-downtime *migration
  story*. The system detected the pattern from the reps' own words.
- It drafts a battlecard from those words and — on one approval — pushes it to the
  **5 open Zendesk deals** still in flight (Northwind, Globex, Initech, Vandelay,
  Wayne).
- That's the "insight that helped one rep win reaches every rep" — automatically,
  not via a QBR three weeks later.

Visual: the golden-route card with the 5 target deals.

---

## Slide 5 — ACT III: Zero rep effort (how it runs)

- Reps do **nothing extra**. The system reads the conversations that already
  happen in Gong and Slack.
- Leadership can define what "qualified" means (a rubric); every deal is graded
  against it *from the field*, with evidence — no forms, no self-reporting.
- Runs on a ~5-minute batch: intelligence reaches the right team while it's still
  actionable.
- 151 signals extracted this window; 11 high-value actions routed; the rest logged.
  No alert spam — clustering + an alert-fatigue governor.

---

## Slide 6 — Where it lands (the stack, not a new tool)

We **buy** the stack and **build** the intelligence in the middle:

| Signal | Lands in |
|---|---|
| Competitive cluster | Marketo campaign + play library |
| Deal-owner nudge | Slack + Outreach task |
| Divergence on a big deal | Salesforce task + leadership flag (approval-gated) |
| Recurring product gap | #product / Productboard |
| Winning play | Self-updating battlecard library |

Nothing overwrites the CRM. It reads stage; it writes tasks.

---

## Slide 7 — Why trust it (failure modes)

- **No hallucinations:** every signal quotes the transcript verbatim, or it's
  dropped (checked in code, not just asked of the model).
- **No black box:** every score driver and routing decision carries a plain-English
  reason code.
- **No alert fatigue:** clustering + recipient-load caps; single mentions are logged.
- **Honest about accuracy:** we planted an answer key and measured — 90% field
  accuracy; the hard back-half fields (economic buyer, paper process) are where we
  invest next.

---

## Slide 8 — What it changes for the business

- **Forecast you can trust:** the diverging deals surface before the slip, not after.
- **Higher win rates:** the best rep's play becomes everyone's play, same week.
- **Faster loops to marketing & product:** competitive clusters and product gaps
  routed automatically.
- Illustrative upside *(clearly a model, not a demo number)*: on a competitive
  pipeline of ~$5M, a 3-point win-rate lift is ~$150K/quarter — before counting the
  Commit-stage deals we stop losing silently.

---

## Slide 9 — Roadmap (what we didn't build yet, on purpose)

- Synthesis agent (LLM drafts the battlecard); weekly leadership digest agent.
- Self-serve rubric authoring for leadership.
- Event-driven triggers, embeddings retrieval at scale, territory/role access control.
- Shipped first: the one risky thing — trustworthy extraction — because everything
  downstream depends on it.

---

## Slide 10 — Ask / close

- The first move was to de-risk extraction; it works and it's measured.
- Next: connect one real Gong workspace (read-only) and run it live on one segment.
- The demo is clickable now — divergence, propagation, live extraction, the eval.
