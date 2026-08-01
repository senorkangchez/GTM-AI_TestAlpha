> ## Refinement (post-review) — read this first, it overrides specifics below
>
> Two decisions taken after this addendum was drafted change its emphasis. The engine,
> fixtures, heatmaps, fan-out, and macro views all stand; the interaction model changes.
>
> 1. **The product is READ-ONLY. The CRM-write / approval machinery is removed entirely.**
>    There is no Accept/Trigger button, no approval queue, no "sync to Salesforce," no
>    landing-receipt. Wherever §E/§F below say "reuse the v2 approval gate / Accept / Trigger,"
>    read instead: **a read-only recommendation card** — each department lane shows the
>    recommended move, its rationale, and a descriptive **mode chip** ("would auto-fire" vs
>    "routed for the owning team"). The trust story is no longer human-gated writes; it is
>    **evidence provenance** — every number traces to a verbatim quote and its source
>    conversation/touch.
> 2. **A VP "What's working / not working" digest is the LANDING surface.** Per org
>    (VP Sales Engineering = product; VP ABM = marketing), a scannable set of findings tagged
>    working/not-working leads; the KPI strip, heatmap, fan-out feed, and team break-outs below
>    are the **drill-downs behind each digest line**.
> 3. **Sourcing spans the whole stack** — Gong / email / Slack (conversations, via extraction)
>    **and** Outreach / Marketo (engagement, via touches/enrollments). Say "the field" = both.
>
> The MEDDPICC / divergence / two-dials account view survives as a **read-only** credibility
> drill-down ("what the field says about this deal"), demoted from the headline.

---

# Spec Addendum v3 — The Reframe (Signal → Coordinated Action)

> **For Claude Code AND the deck.** This LAYERS ONTO SPEC.md + ADDENDUM v2 and
> changes the *altitude and emphasis*, not the foundations. The extraction engine,
> signal envelope, shadow DB, and fixtures all stay. What changes: the story moves
> from "capture field intelligence and fix the CRM" (operational, RevOps altitude)
> to **"turn field signals into golden data that automatically drives coordinated
> moves across product, marketing, and sales"** (strategic, VP altitude).
>
> **Audience:** VP of Sales Engineering (owns the product-feedback loop) and VP of
> Account-Based Marketing (owns nurture + campaign conversion). Presenting as an
> FYI. Every screen and slide must speak to at least one of them.

---

## A. The reframe (top-line)

**Old thesis (demote):** "Reps won't update the CRM; we extract field intel and
land it as reviewable updates." → This is now a *supporting proof point* ("the data
is trustworthy and low-effort to capture"), NOT the headline.

**New thesis (lead with this):**
> Every customer conversation contains signals that matter to *more than one team* —
> a feature request that product should hear, a competitor surge marketing should
> counter, a winning play sales should copy. Today that signal dies in one rep's
> notes. This engine turns each signal into **golden data** and **fans it out to the
> right department as a recommended action, automatically** — so a single Gong call
> can trigger a product prioritization signal, a marketing nurture, and a sales play
> at the same time. It changes the unit of GTM from the individual deal to the
> coordinated motion.

**The unit of analysis moves to the OPPORTUNITY, rolling up to ACCOUNT and then to
SEGMENT / COMPETITOR / TEAM.** VPs think in segments and motions, not single deals.
The account/divergence view from v2 stays as drill-down credibility, but the macro
rollup leads.

**"Shy away from field intelligence" in wording:** retire that phrase from titles.
Working name options: "GTM Signal Engine," "Signal-to-Action Engine," or "Golden
Signal Router." Pick one and use it consistently.

---

## B. What each VP needs to see

- **VP Sales Engineering** — the **product-feedback loop**: feature requests and
  win/loss-by-product, aggregated from the field, broken out by sales team, ranked
  by frequency and pipeline weight. Plus technical credibility (pattern recognition,
  the context graph — §C). SEs live at the product-deal boundary; this is their pain.
- **VP ABM** — the **marketing automation loop**: a field signal auto-triggers the
  right nurture track, and conversion is measured **by campaign and by team**. This
  is their entire mandate — closed-loop from signal to campaign to conversion.

Design rule: the product unlock and the marketing unlock each get their own clear
KPI moment. Neither VP should sit through a screen that's entirely for the other.

---

## C. Context graph, not RAG (adopt the language — no new diagram)

Frame the shadow DB as a **context graph**: signals resolve into linked entities —
`account → opportunity → product/feature → competitor → segment → team → campaign →
play`. Say it out loud: *"the value isn't retrieving the right transcript chunk
(RAG) — it's the relationships. Because the data is a context graph, an agent can
traverse from 'this call mentioned a Slack-integration gap' to 'this is the 4th such
request in mid-market, owned by the West team, and there's a matching nurture track'
— and recommend an action. Retrieval answers; a graph lets you act."* No new diagram
required — the existing architecture diagram already shows linked entities; just
relabel the shadow DB as the context graph and use the term in the deck.

---

## D. Data model changes (rework `data/generate.py`)

**D0. Two population sizes, deliberately decoupled.** `N_ACCOUNTS = 600` is the
analytics book — macro views are computed from structured opp data and need no LLM, and
rate breakdowns by district need real volume behind them (see F1a-4). Separately,
`N_WITH_CONVERSATIONS = 30` controls how many accounts get transcripts/emails/Slack/
touches; only those feed the extraction agent. This keeps fixtures small and extraction
cost near zero, and it is honest: you do not need 600 transcripts to prove extraction
works, you need a handful you can read. The four planted heroes are always in the
conversation sample. Each answer-key row carries `has_conversations` so the UI can tell
which accounts support a signal drill-down.

Keep everything from v1/v2. ADD these so the cross-functional story has data. The
existing Zendesk cluster stays the hero thread and now touches all three departments.

**D1. New entities on each account/opp (into `ground_truth.json`):**
```python
"segment": "mid-market" | "enterprise" | "smb",
"team":    "West" | "East" | "Central",        # sales team, for break-outs
"product_lines": [ ... ],                        # what they're evaluating/using
"feature_requests": [ ... ],                     # planted; encoded into a call
```

**D2. New signal type: `feature_request` (product).**
Add a FEATURES list (e.g. "native Slack integration", "mobile agent app",
"advanced ticket routing", "custom SLA reporting", "SSO/SAML"). Encode planted
feature requests into a Gong call line, e.g.:
> "Honestly we love the product, but we'd need {feature} before we could roll out —
> and {competitor} already has that."
This single line yields THREE signals (feature_request + competitor + a buying
blocker), which is the perfect fan-out seed. Make the extraction prompt (SPEC §5.1)
aware of `feature_request` as a signal_type with `entity` = the feature.

**D3. Marketing campaigns + conversions (new fixture `campaigns.json`).**
```python
Campaign = { "campaign_id", "name",            # e.g. "Zendesk Displacement — Integrations"
             "track": "competitor" | "feature" | "segment", "target_entity" }
Enrollment = { "opp_id", "account_id", "campaign_id", "team", "segment",
               "enrolled_at",
               "converted": bool,               # did the opp advance a stage after enrollment?
               "triggered_by": "signal" | "manual" }   # signal = auto-triggered by the engine
```
Generate enrollments so conversion can be broken out **by campaign and by team**.
Plant the story: opps auto-enrolled by a *signal* convert at a visibly higher rate
than manually-enrolled ones — that's the ABM headline ("signal-triggered nurtures
outconvert batch-and-blast").

**D4. Feature-request aggregation is derived, not stored.** The product KPI ("top
requested features by team") rolls up from `feature_request` signals at query time.

**D5. Keep the touch/progression/health data from v2** — it rolls up from opp to
account to segment for the macro health view ("mid-market health dropping as Zendesk
enters").

---

## E. THE NEW BUILD: the cross-functional fan-out (the hero)

This is the one fully-built new thing. It is the demo's money shot and the literal
answer to "what do we unlock that changes the way we work."

**Concept:** a deterministic **fan-out router** (extends the v2 router, still not an
LLM) takes a signal (or cluster) and emits **one recommended action per relevant
department**, each with a plain-language rationale from pattern recognition.

**The hero example (build this end to end):**
A Gong call on the **Globex** opp: buyer names a Slack-integration gap and mentions
Zendesk. Pattern recognition fires:
- **Product (VP SE):** "Log feature request: native Slack integration. This is the
  **4th in mid-market this month** (West: 2, East: 1, Central: 1). Ranked #2 by
  pipeline weight." → destination: product prioritization.
- **Marketing (VP ABM):** "Auto-enroll Globex + 5 other Zendesk-exposed mid-market
  opps in the **'Zendesk Displacement — Integrations'** nurture track. Signal-
  triggered enrollments are converting at 31% vs 12% batch." → destination: Marketo.
- **Sales:** "Surface the winning play: **Stark's zero-downtime migration story**
  (beat Zendesk, closed). Push to Globex's rep + 5 exposed reps." → destination: rep.

One call → three coordinated moves, each with a why. Render it as a single
**fan-out card**: Source (the Gong call + evidence quote) → Detected pattern → three
department lanes, each with the recommended action. *(Refinement: read-only — a mode
chip per lane, no Accept/Trigger button; see the banner at the top of this file.)*

**Autonomy tiering carries over** as a descriptive label: the sales play nudge reads
"would auto-fire"; enrolling a campaign and logging a product request read "routed for
the owning team."

---

## F. Dashboard rework (clean, KPI-first UX)

New primary screen is a **macro command view**, with drill-down to opp/account.
*(Refinement: the VP "what's working / not working" digest is the landing surface; the
views below are the drill-downs behind each digest line.)*

**F1. Top: KPI strip (the clean-UX ask).** A row of KPI cards, each a single number +
trend + one-line "so what," grouped so each VP sees theirs:
- *Product:* Top requested feature (count, ▲), Feature requests this month, Win rate
  by product line.
- *Marketing:* Signal-triggered nurtures sent, Conversion by campaign (signal vs
  batch), Pipeline influenced.
- *Sales/competitive:* Competitor mentions ▲ by segment, Plays propagated, Win rate
  vs Zendesk.
Round everything. Each card drills into its detail.

The KPI cards above show *state*. The two views below show *causality and change* —
which product wins against which competitor, and which field signals should trigger
which play. These are the money views for each VP; build at least one.

**F1a. Product × Competitor win-rate HEATMAP — the dashboard's primary macro view
(VP Sales Engineering).** A grid: rows = product lines, columns = competitors, each
cell = win rate (large), with `n` closed and gap-cited losses beneath it. Cells are
color-banded: red <40%, amber 40–59%, green 60%+.

*Why a heatmap and not a Sankey (asked and answered — say this if challenged):* the
question here is a RATE, and a Sankey encodes absolute volume, so you'd be dividing
band thicknesses by eye to answer it. Worse, product/competitor/outcome aren't a flow
at all — they're three attributes of the same record, so rendering them as a flow is a
cross-tab in a costume. A heatmap prints the rate directly and is scannable in about
a second. Sankey is retired from this view; see §J if you want a flow diagram.

**Rules for the cells:**
- **Grey out any cell with n < 5** and show "n=3" instead of a rate. A 100% win rate
  off 2 deals is noise dressed as a finding; suppressing it is the credibility move.
- Cell drills into the deals behind it, with evidence quotes.
- Splittable by segment/district/territory — a product can win enterprise and lose
  mid-market to the same competitor.
- Optional per-cell trend arrow for change over the window.

**The finding it produces (verified in fixtures, 600 opps / 330 closed):** the Zendesk
column is the weakest in every product row — 35%–45% — while other competitors sit
amber or green. The read for the room: *"There's one weak column. It isn't a product
problem — all four products underperform against Zendesk, and the losses cite the same
gap."* Sourced by joining outcome + `competitor` + `feature_request` signals.

**F1a-2. Two more heatmap views, same component — switched by a dropdown.** One grid
component, three datasets, so this is cheap to build:
- **Product × competitor** (above) — VP Sales Engineering's view.
- **Campaign × segment** — which nurture track works where. VP ABM's view. Shows that
  the signal-triggered tracks (Zendesk Displacement, Slack Expansion) hold up while
  the generic batch sends (Q3 Newsletter, Webinar Series) flatten out — especially in
  smb, where the newsletter drops to ~40%.
- **Product × campaign** — which campaign lifts which product. The actionable cell:
  Support Cloud × Zendesk Displacement runs ~63% vs Support Cloud's ~55% on the generic
  newsletter, i.e. the targeted track is worth roughly 8 points on that product.

**F1a-3. Geography toggle: two dropdowns, not one.** A "Level" select (All / District /
Territory) driving a second "Scope" select that repopulates with that level's options.
Hide the scope select entirely when Level = All. This is cleaner than one long grouped
list and it makes the hierarchy explicit.

**F1a-4. Show cell density, and warn when the breakdown outruns the data.** This is the
non-obvious requirement and it's what keeps the view honest. Rate analysis needs n≥5
per cell, and cells multiply: a 4×6 grid is 24 cells, so it needs ~120 closed deals in
scope to fill. Print a live "N of M cells have enough volume (P%)" readout and turn it
amber below 40%. **Say this out loud rather than hiding it:** *"Product × competitor
doesn't hold up at territory level — one territory doesn't close enough deals in a
window to support a 24-cell rate breakdown. The coarser campaign views do. Granularity
of the breakdown has to match the volume available."*

**F1b. Signal → Marketing-trigger map (VP ABM's view).** A table that makes the
automation legible: which detected signal fires which nurture, from which source, and
what it converts. Columns: *Trigger signal* · *Source* · *Marketing play it fires* ·
*Auto / routed* · *Conversion*. Seed it with rows spanning both Gong content signals and
Outreach/Marketo engagement signals so it's clear the triggers come from the whole
stack, not just calls. Each row drills into the opps currently matching that trigger,
and every row is splittable by team/segment for the break-out views (F3).

**F2. Middle: the fan-out feed (§E).** The stream of signal → 3-department
recommendations. THIS is what you narrate live.

**F3. Break-out-by-team views.** Feature requests by team; campaign conversion by
team; competitor exposure by team. VPs manage teams, so every macro number should be
splittable by team/segment.

**F4. Drill-down: opp → account.** Click any opp to the v2 account view (two dials,
divergence), now **read-only**. Opp-level signals roll up to account, accounts roll up
to the KPI strip.

**F5. Demote, don't delete, the divergence view.** It stays as a "and the data's
trustworthy — here's how we catch the deal the CRM is lying about" proof point, one
click from the macro view. It is no longer the headline.

---

## G. What stays / moves / goes

- **Stays:** extraction agent + evidence-quote guardrail; shadow DB (now "context
  graph"); signal envelope; fixtures + generator; two dials (progression/health, now
  rolling up); account view (now read-only drill-down).
- **Moves up:** the routing/fan-out layer is now the CENTERPIECE. Product + marketing
  unlocks are the headline. A VP digest leads.
- **Moves down:** field-intelligence/CRM-hygiene framing → supporting proof point.
  MEDDPICC → one signal category feeding the graph, not the star.
- **New:** `feature_request` signals, campaigns/conversions data, team+segment
  entities, the cross-functional fan-out router + card, the KPI macro view, the digest.
- **Removed (refinement):** the approval gate / landing receipt / queue / CRM-sync.

---

## H. Build order (v3) + cut lines

1. **Extend the generator** (§D): features, teams, segments, `campaigns.json`.
2. **Fan-out router** (§E, deterministic) — for the hero signal, emit the 3
   department actions with rationales.
3. **Fan-out card + feed** (F2) — the money shot. Build this even if nothing else new
   ships.
4. **KPI strip** (F1) with the product + marketing cards.
5. **The one causality view** — build F1a (product × competitor **heatmap**). Both if
   time allows.
6. **Break-out-by-team** (F3).
7. Wire drill-down to the existing (read-only) account view (F4).
8. **Deck visuals** (§J) — the win-rate waterfall is the hero slide.

**Cut order if short:** drop break-out-by-team first, then trim KPI cards, then reduce
the fan-out to the single hero example. **Never cut:** the one hero fan-out card
(source → pattern → 3 actions) — that single artifact carries the entire reframe.

---

## I. Talking points (per audience)

- **Opening (both):** "Field signals matter to more than one team, but today they die
  in one rep's notes. We turn each signal into golden data and route it — product,
  marketing, sales — automatically. One call, a coordinated motion."
- **For VP SE:** the product-feedback loop + "pattern recognition over a context
  graph, not RAG — that's what lets it recommend an action, not just surface a quote."
- **For VP ABM:** "signal-triggered nurtures convert at ~60% vs ~20% for batch —
  because we enroll the moment the field tells us intent, not on a calendar."
- **Credibility close:** drill into one opp → the account view → "and every
  recommendation traces to a verbatim quote; nothing is asserted without a source."
- **The one line to leave them with:** "It changes the unit of go-to-market from the
  deal to the motion."

---

## J. Deck visuals — which chart does which job

Split by purpose: the dashboard is a MONITORING surface (always on, scannable, no
narration). The deck is an ARGUMENT (shown once, must persuade). Different forms.

### J1. THE HERO SLIDE — win-rate waterfall (build this for the deck)
A waterfall decomposing win rate into its causes. Numbers from the fixtures:

| Step | Win rate | n |
|---|---|---|
| Baseline — all other competitors | **58%** | 158 closed |
| Facing Zendesk | −9 pts → **49%** | 97 closed |
| ...and the Slack gap is raised | −27 pts → **22%** | 37 closed |

**Why this is the single most important image in the deck:** it converts a feature
request into a number a VP can fund. "The integration gap costs us 27 points of win
rate" wins a budget fight; "reps asked for it 15 times" does not.

Caption it: *"Each drop is measured, not assumed — 330 closed deals across 600 opps."*
The competitor isn't the problem; the gap against that competitor is.

### J2. Credibility slide — stratified lift dumbbell
Two dots per risk band, connected: contested deals go untreated 31% → treated 61%, a
**+30 pt lift**; easy deals go 55% → 53%, **−2 pts**. Put the naive all-deals number
(+16 pts) in a footnote, labelled confounded. **Own the weakness out loud:** the
easy-deals treated cell is thin — say "the lift is concentrated in contested deals."

### J3. Dashboard view — the heatmap (F1a)
Screenshot the live heatmap into the deck rather than making a bespoke slide version.

### J4. Where a Sankey DOES belong — the fan-out, not win rates
If the deck wants a flow diagram, point it at the engine: signals ingested →
classified by type → confidence-gated (some dropped) → fanned out to product /
marketing / sales. Do NOT use a Sankey for win rates (see F1a).

### Assignment summary
| Question | Form | Where |
|---|---|---|
| What's working / not working? | digest | dashboard (landing) |
| Where are we weakest? | heatmap | dashboard |
| Why are we losing, and what's it worth? | waterfall | deck (hero) |
| Does the engine work? | dumbbell | deck (credibility) |
| How does a signal become 3 actions? | fan-out card | both |

> **Note:** the numeric figures in §E, §F1b, and §J (e.g. "31% vs 12%", "58 → 49 → 22")
> are illustrative. Read the ACTUAL numbers from the regenerated fixtures
> (`npm run eval`, the heatmap density print, and `lib/analytics.ts`) and use those in
> the deck — do not hand-copy these.
