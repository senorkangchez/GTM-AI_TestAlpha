# -*- coding: utf-8 -*-
"""
GTM Signal Engine - Synthetic Data Factory (v3)
===============================================

WHAT THIS IS
------------
This script manufactures the fake world the demo runs on. It does NOT generate
CRM records with MEDDPICC already filled in. It generates the raw, messy field
conversations - Gong call transcripts, sales emails, and Slack threads - that the
extraction agent has to *derive* MEDDPICC from. That inversion is the whole point.

THE METHODOLOGY (this is what you present)
------------------------------------------
  1. PLANT THE ANSWER FIRST.  For each account we decide a hidden ground-truth
     profile - which MEDDPICC elements are true, which competitor is in the deal,
     where it's heading. Nothing is written yet.
  2. HIDE IT IN PROSE.  We write natural conversations that *encode* that truth.
     Front-half MEDDPICC surfaces on CALLS; back-half in EMAILS.
  3. GRADE AGAINST THE ANSWER KEY.  Because we saved the truth, extraction is
     scored field-by-field.

REPRODUCIBILITY (read before you re-run)
----------------------------------------
Single fixed seed drives the whole world. The 600-opp analytics book + campaigns +
heatmaps are FULLY DETERMINISTIC and may be regenerated freely (with faker pinned -
see scripts/requirements.txt; Faker version drift shifts company names and therefore
every downstream win-rate number). The ~30 conversation accounts (envelopes, touches)
are the calibrated demo: the four planted heroes are hardcoded first so they always
fall in the conversation sample and the golden-route pattern fires at exactly the
intended count. `deal_amount` is drawn from a SEPARATE rng (SEED+1) so adding it never
perturbs the main stream that fixes accounts/outcomes/competitors.

OUTPUTS
-------
  fixtures/envelopes.json      -> raw conversations the app ingests (extraction input)
  fixtures/ground_truth.json   -> the hidden answer key + the 600-opp analytics book
                                  (each row carries has_conversations + deal_amount)
  fixtures/touches.json        -> Outreach/Marketo/call/email activity feeding the
                                  PROGRESSION score (NOT run through extraction)
  fixtures/campaigns.json      -> marketing campaigns + enrollments (ABM conversion)
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from faker import Faker

# --------------------------------------------------------------------------- #
# 0. Reproducibility - one seed drives everything
# --------------------------------------------------------------------------- #
SEED = 20260716
fake = Faker()
Faker.seed(SEED)
random.seed(SEED)

# Separate stream for deal_amount ONLY, so introducing dollar figures does not
# consume from the main RNG and shift every account/outcome/competitor draw.
amount_rng = random.Random(SEED + 1)

TODAY = datetime(2026, 7, 16)
WINDOW_WEEKS = 6  # conversations span the last 6 weeks

# --------------------------------------------------------------------------- #
# 1. Vocabulary banks
# --------------------------------------------------------------------------- #
MEDDPICC_FIELDS = [
    "metrics", "economic_buyer", "decision_criteria", "decision_process",
    "paper_process", "identify_pain", "champion", "competition",
]
FRONT_HALF = ["identify_pain", "metrics", "champion", "competition"]   # surface on calls
BACK_HALF = ["economic_buyer", "decision_process", "paper_process", "decision_criteria"]  # surface in email

COMPETITORS = ["Zendesk", "ServiceNow", "Zoho", "HubSpot", "Intercom", "an internal build"]

# Fictional accounts for the non-planted slots - clearly synthetic, safe for a
# public demo. Must NOT overlap the planted account names below (dedup enforced
# in main() as a belt-and-suspenders guard).
FILLER_ACCOUNTS = [
    "Umbrella Logistics", "Hooli", "Vandelay Industries", "Wayne Enterprises",
    "Wonka Foods", "Cyberdyne Systems", "Soylent Corp", "Pied Piper",
    "Massive Dynamic", "Gekko & Co", "Prestige Worldwide", "Bluth Company",
]

STAGES = ["Discovery", "Evaluation", "Proposal", "Negotiation", "Commit"]

# Pain points an ICP like this actually voices on calls
PAINS = [
    "our support tickets are scattered across three different tools and nothing talks to each other",
    "agents waste the first two minutes of every call just figuring out who they're talking to",
    "we have no real visibility into first-response time by team",
    "our current system falls over every time we run a seasonal promotion",
    "reporting is a nightmare - I'm exporting to spreadsheets every single week",
]

# Metric outcomes + dollar framing
METRIC_OUTCOMES = [
    ("cut average handle time by even 20 percent", "around 1.4 million dollars a year in agent capacity"),
    ("get first-response time under an hour", "close to 800 thousand a year in retained accounts"),
    ("deflect a third of tickets to self-service", "about 2 million annually in headcount we wouldn't have to add"),
    ("consolidate onto one platform", "roughly 600 thousand a year in tool spend"),
]

CRITERIA = ["native integrations", "scalability during peak season", "SOC 2 and data residency",
            "ease of admin", "total cost of ownership", "reporting depth"]

# --- product + marketing + org structure ----------------------------------- #
# Feature requests that surface on calls. A request line also names a competitor
# ("...and Zendesk already has that"), so one line yields 3 signals:
# feature_request + competitor + a buying blocker. That's the fan-out seed.
FEATURES = [
    "native Slack integration",
    "mobile agent app",
    "advanced ticket routing",
    "custom SLA reporting",
    "SSO/SAML support",
    "AI answer suggestions",
]

# Product lines the ICP evaluates (for win-rate-by-product KPI).
PRODUCT_LINES = ["Support Cloud", "Messaging", "Analytics", "Self-Service Portal"]

SEGMENTS = ["mid-market", "enterprise", "smb"]
TEAMS = ["West", "East", "Central"]

# Deal-amount bands by segment (feeds pipeline-weight KPIs, dollar-weighted rollups,
# and the deck waterfall). Drawn from amount_rng only.
DEAL_BANDS = {
    "smb": (25_000, 110_000),
    "mid-market": (120_000, 420_000),
    "enterprise": (300_000, 950_000),
}


def deal_amount_for(segment):
    """Deterministic per-opp amount from the SEPARATE amount_rng, rounded to $5k."""
    lo, hi = DEAL_BANDS.get(segment, DEAL_BANDS["mid-market"])
    raw = amount_rng.randint(lo, hi)
    return int(round(raw / 5000.0) * 5000)


# --- Sales hierarchy: accounts roll up to territory, territory to district. ----
DISTRICTS = {
    "West District":    ["Enterprise North", "Mid-Market West", "SMB Pacific"],
    "East District":    ["Enterprise East", "Mid-Market Atlantic"],
    "Central District": ["Enterprise Central", "Mid-Market Plains"],
}
TERRITORY_TO_DISTRICT = {t: d for d, ts in DISTRICTS.items() for t in ts}
ALL_TERRITORIES = list(TERRITORY_TO_DISTRICT)

# Deal outcome. Needed for real win/loss rates in the product x competitor matrix.
OUTCOMES = ["won", "lost", "open"]

# Marketing nurture tracks. `track` says what kind of signal triggers enrollment;
# `target_entity` is what it counters/promotes. Used for the ABM conversion KPI.
CAMPAIGNS = [
    {"campaign_id": "cmp_zdk_integrations", "name": "Zendesk Displacement - Integrations",
     "track": "competitor", "target_entity": "Zendesk"},
    {"campaign_id": "cmp_slack_feature", "name": "Integrations Expansion - Slack",
     "track": "feature", "target_entity": "native Slack integration"},
    {"campaign_id": "cmp_newsletter_q3", "name": "Q3 Product Newsletter",
     "track": "batch", "target_entity": None},
    {"campaign_id": "cmp_webinar_series", "name": "Support Cloud Webinar Series",
     "track": "batch", "target_entity": None},
]

# Realistic Slack chatter that is NOT a signal - gives the pre-filter something to drop
SLACK_NOISE = [
    "anyone have the updated pricing one-pager?",
    "great job on the QBR everyone",
    "reminder: forecast calls locked by EOD Friday",
    "who's covering the SE for the demo tomorrow?",
    "coffee chat notes are in the drive",
    "lol the parking at the office event was chaos",
    "can someone approve my expense report",
]

# --------------------------------------------------------------------------- #
# 2. Roster
# --------------------------------------------------------------------------- #
REPS = [fake.name() for _ in range(6)]


def contact(account):
    """A buyer-side person: name + a plausible support/CX title."""
    title = random.choice([
        "VP of Support", "Director of Customer Experience", "Head of CX Ops",
        "Support Operations Manager", "VP of Customer Success",
    ])
    return f"{fake.name()}", title


# --------------------------------------------------------------------------- #
# 3. Ground truth - the hidden answer key. Decided BEFORE any prose is written.
# --------------------------------------------------------------------------- #
PLANTED_ACCOUNTS = [
    {
        # DEMO MOMENT 1 - the divergence deal. Marked Commit in the CRM, but the
        # field says soft: no economic buyer anywhere, Zendesk rising across calls,
        # champion going quiet in the later emails.
        "account": "Northwind Systems",
        "stage": "Commit",
        "meddpicc_present": ["identify_pain", "metrics", "champion", "competition",
                             "decision_criteria"],  # note: NO economic_buyer, NO paper_process
        "competitor": "Zendesk",
        "trajectory": "rotting",
        "has_win_play": False,
        "segment": "mid-market", "team": "West",
        "territory": "Mid-Market West",
        "outcome": "open",   # still open on purpose - the point is we catch it in time
        "signal_treated": True,
        "product_lines": ["Support Cloud", "Analytics"],
        "feature_requests": ["native Slack integration"],  # counts toward the mid-market cluster
        "n_calls": 3, "n_emails": 2, "n_slack": 1,
    },
    {
        # DEMO MOMENT 2 (part A) - THE HERO FAN-OUT opp. Same competitor as Northwind
        # (cross-deal cluster) AND requests the Slack integration -> one call triggers
        # product + marketing + sales actions.
        "account": "Globex",
        "stage": "Evaluation",
        "meddpicc_present": ["identify_pain", "metrics", "champion", "competition",
                             "economic_buyer", "decision_process"],
        "competitor": "Zendesk",
        "trajectory": "healthy",
        "has_win_play": False,
        "segment": "mid-market", "team": "West",
        "territory": "Mid-Market West",
        "outcome": "open",   # the hero fan-out fires on a LIVE deal
        "signal_treated": True,
        "product_lines": ["Support Cloud", "Messaging"],
        "feature_requests": ["native Slack integration"],  # the hero request
        "n_calls": 2, "n_emails": 1, "n_slack": 1,
    },
    {
        # DEMO MOMENT 2 (part B) - third Zendesk deal, tips the cluster over threshold.
        "account": "Initech",
        "stage": "Proposal",
        "meddpicc_present": ["identify_pain", "champion", "competition"],
        "competitor": "Zendesk",
        "trajectory": "healthy",
        "has_win_play": False,
        "segment": "mid-market", "team": "East",
        "territory": "Mid-Market Atlantic",
        "outcome": "open",
        "signal_treated": False,   # control: engine did not fire here
        "product_lines": ["Support Cloud"],
        "feature_requests": ["native Slack integration"],  # 3rd mid-market Slack request
        "n_calls": 2, "n_emails": 1, "n_slack": 0,
    },
    {
        # DEMO MOMENT 3 - the win play. Slack win-wire describes the migration-story
        # talk track that beat Zendesk. This becomes the propagatable golden route.
        "account": "Stark Industries",
        "stage": "Commit",
        "meddpicc_present": ["identify_pain", "metrics", "champion", "competition",
                             "economic_buyer", "decision_process", "paper_process",
                             "decision_criteria"],
        "competitor": "Zendesk",
        "trajectory": "accelerating",
        "has_win_play": True,
        "segment": "mid-market", "team": "Central",
        "territory": "Mid-Market Plains",
        "outcome": "won",    # the win-play source ("closed Stark Industries!")
        "signal_treated": True,
        "product_lines": ["Support Cloud", "Messaging", "Analytics"],
        "feature_requests": ["native Slack integration"],  # 4th -> "4th in mid-market this month"
        "n_calls": 2, "n_emails": 1, "n_slack": 1,
    },
]


def decide_outcome(stage, trajectory, competitor, feature_requests,
                   signal_treated=False):
    """
    Decide won / lost / open for an opp.

    The planted causal story: deals facing Zendesk WHERE the Slack-integration gap
    was raised lose materially more often. That is what makes the product x
    competitor matrix say something real ("every Zendesk loss cites the Slack gap")
    instead of being decorative. Everything else is plausible baseline noise.
    """
    # Early-stage deals are mostly still open.
    if stage in ("Discovery", "Evaluation"):
        if random.random() < 0.75:
            return "open"
    elif stage == "Proposal":
        if random.random() < 0.45:
            return "open"

    # Baseline win probability, then apply the planted effects.
    p_win = 0.55
    if competitor == "Zendesk":
        p_win -= 0.15                                    # tough competitor
        if "native Slack integration" in feature_requests:
            p_win -= 0.30                                # the gap is what loses it
    elif competitor:
        p_win -= 0.05
    if trajectory == "accelerating":
        p_win += 0.20
    elif trajectory == "rotting":
        p_win -= 0.25

    # Signal treatment (the engine fired: nurture + play propagated) genuinely helps.
    # NOTE the confound this creates on purpose: signal treatment is TARGETED at the
    # hardest deals (Zendesk / feature-gap), so a naive "signal vs batch" comparison
    # makes the engine look harmful. Only a stratified read shows the true lift.
    if signal_treated:
        p_win += 0.18

    p_win = min(max(p_win, 0.05), 0.9)
    return "won" if random.random() < p_win else "lost"


def random_ground_truth(account):
    """Fill out the remaining accounts with plausible random profiles."""
    # 'early' = shallow funnel depth (mostly Marketo/Outreach), anchors the LOW end
    # of the progression dial so it visibly differs from the health dial.
    trajectory = random.choice(["healthy", "healthy", "rotting", "accelerating", "early"])
    present = [f for f in FRONT_HALF if random.random() < 0.75]
    present += [f for f in BACK_HALF if random.random() < 0.45]
    # Zendesk is the hero competitor, weighted to dominate the landscape.
    if "competition" in present or random.random() < 0.55:
        weights = [4 if c == "Zendesk" else 1 for c in COMPETITORS]
        competitor = random.choices(COMPETITORS, weights=weights, k=1)[0]
    else:
        competitor = None
    if competitor and "competition" not in present:
        present.append("competition")
    # ~45% of accounts voice a feature request. 'native Slack integration' is
    # deliberately weighted to dominate - it is the real, spreading gap.
    feature_requests = []
    if random.random() < 0.45:
        others = [f for f in FEATURES if f != "native Slack integration"]
        weights = [4] + [1] * len(others)          # Slack ~4x likelier than any other
        feature_requests = [random.choices(["native Slack integration"] + others,
                                           weights=weights, k=1)[0]]
    # A realistic book is mostly HISTORY plus some live pipeline. ~55% closed.
    territory = random.choice(ALL_TERRITORIES)
    at_risk = (competitor == "Zendesk") or bool(feature_requests)
    signal_treated = random.random() < (0.6 if at_risk else 0.15)
    if random.random() < 0.55:
        outcome = decide_outcome("closed", trajectory, competitor, feature_requests,
                                 signal_treated)
        stage = "Closed Won" if outcome == "won" else "Closed Lost"
    else:
        outcome = "open"
        stage = random.choice(STAGES[:-1])
    return {
        "account": account,
        "stage": stage,
        "outcome": outcome,
        "meddpicc_present": present,
        "competitor": competitor,
        "trajectory": trajectory,
        "has_win_play": trajectory == "accelerating" and random.random() < 0.5,
        "segment": random.choice(SEGMENTS),
        "team": random.choice(TEAMS),
        "territory": territory,
        "signal_treated": signal_treated,
        "product_lines": random.sample(PRODUCT_LINES, random.randint(1, 2)),
        "feature_requests": feature_requests,
        "n_calls": random.randint(1, 3),
        "n_emails": random.randint(0, 2),
        "n_slack": random.randint(0, 1),
    }


# --------------------------------------------------------------------------- #
# 4. Conversation builders - encode ground truth into natural prose.
# --------------------------------------------------------------------------- #
def _ts(days_ago, hour=10):
    return (TODAY - timedelta(days=days_ago)).replace(hour=hour, minute=random.randint(0, 59)).isoformat()


def build_call(gt, rep, buyer_name, buyer_title, call_index, pain, metric,
               escalate_competitor=False):
    """Multi-turn transcript. Front-half MEDDPICC surfaces here."""
    acct = gt["account"]
    lines = []
    lines.append(f"[00:00] {rep} (Rep): Thanks for making time again. How are things on your end since we last spoke?")

    if gt["trajectory"] == "rotting" and call_index >= 1:
        lines.append(f"[00:14] {buyer_name} ({buyer_title}, {acct}): Honestly a bit slammed. I'll be straight with you, things have gotten quieter internally on this.")
    elif gt["trajectory"] == "accelerating":
        lines.append(f"[00:12] {buyer_name} ({buyer_title}, {acct}): Good - actually a lot of momentum this week, the team is excited about this.")
    else:
        lines.append(f"[00:11] {buyer_name} ({buyer_title}, {acct}): Busy, but good. Happy to dig in.")

    if "identify_pain" in gt["meddpicc_present"]:
        lines.append(f"[01:20] {buyer_name}: The core issue hasn't changed - {pain}. It's the thing keeping me up at night.")

    if "metrics" in gt["meddpicc_present"]:
        outcome, dollars = metric
        lines.append(f"[03:05] {buyer_name}: If we could {outcome}, my CFO's model puts that at {dollars}. That's the number I'd be measured on.")

    if "competition" in gt["meddpicc_present"] and gt["competitor"]:
        comp = gt["competitor"]
        if escalate_competitor:
            lines.append(f"[05:40] {buyer_name}: I'll be honest, {comp} has been pushing hard. A few folks on my team are leaning their way, so we're taking a serious look at {comp}.")
        else:
            lines.append(f"[05:33] {buyer_name}: We are also evaluating {comp}, just so you know the landscape.")

    # Feature request (product signal). Surfaced on the FIRST call. Phrased so one
    # utterance yields three signals: feature_request + competitor + a blocker.
    if call_index == 0 and gt.get("feature_requests"):
        feat = gt["feature_requests"][0]
        comp = gt["competitor"] or "the tool we're comparing"
        lines.append(f"[06:15] {buyer_name}: One thing though - we'd really need {feat} before we could roll this out company-wide. Honestly {comp} already has that, so it's a real gap for us right now.")

    if "champion" in gt["meddpicc_present"]:
        if gt["trajectory"] == "rotting" and call_index >= 1:
            lines.append(f"[07:10] {rep} (Rep): Internal note - {buyer_name} has been our champion but is noticeably less responsive this call; may be losing air cover.")
        else:
            lines.append(f"[07:02] {rep} (Rep): Internal note - {buyer_name} is clearly our champion here, actively selling this internally on our behalf.")

    lines.append(f"[09:30] {rep} (Rep): Great, I'll follow up with next steps over email. Appreciate the time.")
    return "\n".join(lines)


def build_email(gt, rep, buyer_name, buyer_title, quiet=False):
    """Email thread. Back-half MEDDPICC surfaces here (EB, decision/paper process)."""
    acct = gt["account"]
    subject = f"RE: {acct} <> next steps"
    body = [f"Subject: {subject}", ""]
    body.append(f"From: {rep}")
    body.append(f"To: {buyer_name} ({buyer_title}, {acct})")
    body.append("")
    body.append(f"Hi {buyer_name.split()[0]},")
    body.append("")
    body.append("Following up on our call - a few questions so I can line up the right next steps.")
    body.append("")

    if "decision_criteria" in gt["meddpicc_present"]:
        c = random.sample(CRITERIA, 3)
        body.append(f"1. On requirements, you'd mentioned {c[0]}, {c[1]}, and {c[2]} as the things that matter most. Still accurate?")

    body.append("")
    body.append("Best,")
    body.append(rep)
    body.append("")
    body.append("---")
    body.append("")

    body.append(f"From: {buyer_name}")
    body.append(f"To: {rep}")
    body.append("")
    if quiet:
        body.append(f"Hi {rep.split()[0]}, thanks - swamped this week, will circle back. {buyer_name.split()[0]}")
        return "\n".join(body)

    body.append(f"Hi {rep.split()[0]},")
    body.append("")
    if "economic_buyer" in gt["meddpicc_present"]:
        eb_name = fake.name()
        body.append(f"On sign-off: ultimately this needs {eb_name}, our CFO, to approve the spend - she holds the budget for anything over 100k, so I'll need to bring her in.")
    if "decision_process" in gt["meddpicc_present"]:
        body.append("Process-wise: my team runs the eval, then it goes to a security review, then finance for final approval.")
    if "paper_process" in gt["meddpicc_present"]:
        body.append("Heads up that procurement requires a full legal review and our MSA redlines usually take about three weeks, so we should start that early.")
    if "decision_criteria" in gt["meddpicc_present"]:
        c = random.sample(CRITERIA, 2)
        body.append(f"And yes on requirements - {c[0]} and {c[1]} are the deciders.")
    body.append("")
    body.append(f"Thanks, {buyer_name.split()[0]}")
    return "\n".join(body)


def build_slack(gt, rep, channel):
    """A Slack thread. Either a win-wire brag (win_play) or a #deal-help competitor
    thread. Always padded with noise so the pre-filter has chaff to reject."""
    acct = gt["account"]
    others = [r for r in REPS if r != rep] or REPS
    lines = []
    if gt["has_win_play"] and channel == "win-wire":
        comp = gt["competitor"] or "the incumbent"
        lines.append(f"{rep}: closed {acct}! 🎉")
        lines.append(f"{rep}: what got us over the line vs {comp} was leaning hard into the migration story - we mapped out a zero-downtime cutover and that's what flipped their ops lead. reusing that on every {comp} deal from now on.")
        lines.append(f"{random.choice(others)}: huge, congrats - stealing that migration angle")
    else:
        comp = gt["competitor"] or random.choice(COMPETITORS)
        lines.append(f"{rep}: anyone hit the '{comp} is cheaper' pushback on {acct}? losing ground on price there")
        lines.append(f"{random.choice(others)}: yeah constant lately, {comp} is discounting aggressively this quarter")
    for note in random.sample(SLACK_NOISE, random.randint(2, 4)):
        lines.append(f"{random.choice(others)}: {note}")
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
# 4b. Touch events (Outreach / Marketo / call / email activity)
#     Structured activity feeding the PROGRESSION score. NOT run through extraction.
# --------------------------------------------------------------------------- #
FUNNEL_ORDER = ["marketo", "outreach", "email", "gong_call"]

TOUCH_SUMMARIES = {
    "marketo": {
        "inbound": ["opened nurture email", "downloaded the ROI whitepaper",
                    "clicked webinar invite", "hit the pricing page"],
        "outbound": ["sent nurture email", "added to webinar invite list",
                     "enrolled in drip campaign"],
    },
    "outreach": {
        "inbound": ["replied to sequence step 2", "booked intro from cold email",
                    "opened outreach email"],
        "outbound": ["sent sequence step 1", "no reply to sequence step 1",
                     "sent follow-up, no response"],
    },
    "email": {
        "inbound": ["replied to AE follow-up", "shared requirements over email",
                    "looped in a colleague"],
        "outbound": ["sent AE follow-up", "emailed recap, no reply",
                     "chased for next steps"],
    },
    "gong_call": {
        "inbound": ["discovery call held", "technical deep-dive call",
                    "exec alignment call"],
        "outbound": ["pricing call", "left voicemail, call not held",
                     "proposed call time"],
    },
}


def build_touches(gt, account_id, opp_id):
    """Emit Touch records for one account, shaped by its trajectory so the two dials
    tell a coherent story (accelerating: deep+recent+two-way; rotting: deep but recent
    touches dry up and go one-way; healthy: moderate two-way; early: shallow)."""
    traj = gt["trajectory"]
    touches = []

    if traj in ("accelerating", "rotting"):
        max_depth = 3          # reached gong_call / AE-led => looks far along
    elif traj == "healthy":
        max_depth = random.choice([2, 3])
    else:
        max_depth = random.choice([0, 1, 2])   # early-stage accounts

    reached = FUNNEL_ORDER[: max_depth + 1]

    for depth, channel in enumerate(reached):
        n = random.randint(2, 4) if channel in ("marketo", "outreach") else random.randint(1, 3)
        base_day = WINDOW_WEEKS * 7 - int((depth / max(len(reached), 1)) * (WINDOW_WEEKS * 7 - 4))
        for _ in range(n):
            day = max(1, base_day - random.randint(0, 9))

            if traj == "rotting":
                recent = day <= 14
                if recent:
                    direction = "outbound"
                else:
                    direction = random.choice(["inbound", "outbound"])
            elif traj == "accelerating":
                direction = "inbound" if random.random() < 0.6 else "outbound"
            elif traj == "healthy":
                direction = "inbound" if random.random() < 0.45 else "outbound"
            else:  # early
                direction = "inbound" if random.random() < 0.25 else "outbound"

            touches.append({
                "touch_id": "tch_" + uuid.UUID(int=random.getrandbits(128)).hex[:10],
                "account_id": account_id,
                "opp_id": opp_id,
                "channel": channel,          # funnel-stage proxy
                "direction": direction,       # inbound = buyer replied (reciprocity)
                "timestamp": _ts(day),
                "summary": random.choice(TOUCH_SUMMARIES[channel][direction]),
            })

    touches.sort(key=lambda t: t["timestamp"])

    if touches:
        if traj == "accelerating":
            touches[-1]["direction"] = "inbound"
            touches[-1]["summary"] = random.choice(
                TOUCH_SUMMARIES[touches[-1]["channel"]]["inbound"])
        elif traj == "rotting":
            for t in touches:
                if (TODAY - datetime.fromisoformat(t["timestamp"])).days <= 14 \
                        and t["direction"] != "outbound":
                    t["direction"] = "outbound"
                    t["summary"] = random.choice(TOUCH_SUMMARIES[t["channel"]]["outbound"])
    return touches


def _slug(name):
    """Collision-safe id from a company name (Faker names contain commas/'and')."""
    keep = [c if c.isalnum() else "_" for c in name.lower()]
    slug = "".join(keep)
    while "__" in slug:
        slug = slug.replace("__", "_")
    return slug.strip("_")[:40]


def envelopes_for_account(gt):
    acct = gt["account"]
    account_id = "acc_" + _slug(acct)
    opp_id = "opp_" + uuid.UUID(int=random.getrandbits(128)).hex[:8]
    rep = random.choice(REPS)
    buyer_name, buyer_title = contact(acct)
    account_pain = random.choice(PAINS)
    account_metric = random.choice(METRIC_OUTCOMES)
    out = []
    touches = build_touches(gt, account_id, opp_id)

    day_slots = sorted(random.sample(range(3, WINDOW_WEEKS * 7),
                                     gt["n_calls"] + gt["n_emails"] + gt["n_slack"]), reverse=True)
    slot = iter(day_slots)

    for i in range(gt["n_calls"]):
        escalate = gt["trajectory"] == "rotting" and i >= 1
        raw = build_call(gt, rep, buyer_name, buyer_title, i, account_pain,
                         account_metric, escalate_competitor=escalate)
        d = next(slot)
        out.append({
            "envelope_id": "env_" + uuid.UUID(int=random.getrandbits(128)).hex[:10],
            "source": "gong_call",
            "account_id": account_id, "account_name": acct, "opp_id": opp_id,
            "timestamp": _ts(d), "raw_text": raw,
            "participants": [rep, f"{buyer_name} ({buyer_title})"],
            "metadata": {"call_duration_min": random.randint(11, 34), "call_index": i},
        })

    for j in range(gt["n_emails"]):
        quiet = gt["trajectory"] == "rotting" and j == gt["n_emails"] - 1
        raw = build_email(gt, rep, buyer_name, buyer_title, quiet=quiet)
        d = next(slot)
        out.append({
            "envelope_id": "env_" + uuid.UUID(int=random.getrandbits(128)).hex[:10],
            "source": "gong_email",
            "account_id": account_id, "account_name": acct, "opp_id": opp_id,
            "timestamp": _ts(d), "raw_text": raw,
            "participants": [rep, f"{buyer_name} ({buyer_title})"],
            "metadata": {"subject": f"RE: {acct} <> next steps", "quiet_reply": quiet},
        })

    for k in range(gt["n_slack"]):
        channel = "win-wire" if gt["has_win_play"] else "deal-help"
        raw = build_slack(gt, rep, channel)
        d = next(slot)
        out.append({
            "envelope_id": "env_" + uuid.UUID(int=random.getrandbits(128)).hex[:10],
            "source": "slack",
            "account_id": account_id, "account_name": acct, "opp_id": opp_id,
            "timestamp": _ts(d), "raw_text": raw,
            "participants": [rep],
            "metadata": {"channel": f"#{channel}"},
        })

    return out, touches, {
        "account": acct, "account_id": account_id, "opp_id": opp_id,
        "crm_stage": gt["stage"],
        "meddpicc_present": sorted(set(gt["meddpicc_present"])),
        "meddpicc_absent": sorted(set(MEDDPICC_FIELDS) - set(gt["meddpicc_present"])),
        "competitor": gt["competitor"],
        "trajectory": gt["trajectory"],
        "has_win_play": gt["has_win_play"],
        "segment": gt.get("segment"),
        "team": gt.get("team"),
        "territory": gt.get("territory"),
        "district": TERRITORY_TO_DISTRICT.get(gt.get("territory")),
        "outcome": gt.get("outcome"),
        "signal_treated": gt.get("signal_treated", False),
        "product_lines": gt.get("product_lines", []),
        "feature_requests": gt.get("feature_requests", []),
        "deal_amount": deal_amount_for(gt.get("segment")),
    }


# --------------------------------------------------------------------------- #
# 5b. Marketing campaigns + enrollments (feeds the ABM conversion KPI)
#     Story we plant: enrollments TRIGGERED BY A SIGNAL convert at a much higher
#     rate than MANUAL / batch enrollments. That gap is the VP-ABM headline.
# --------------------------------------------------------------------------- #
def build_campaign_enrollments(answer_key):
    enrollments = []
    SIGNAL_CONV = 0.62   # planted: signal-triggered nurtures convert well
    BATCH_CONV = 0.19    # planted: batch-and-blast converts poorly

    for key in answer_key:
        opp = key["opp_id"]; acct = key["account_id"]
        team = key["team"]; seg = key["segment"]

        if key.get("signal_treated"):
            if key["competitor"] == "Zendesk":
                enrollments.append(_enroll(opp, acct, team, seg,
                                           "cmp_zdk_integrations", "signal", SIGNAL_CONV))
            if "native Slack integration" in key.get("feature_requests", []):
                enrollments.append(_enroll(opp, acct, team, seg,
                                           "cmp_slack_feature", "signal", SIGNAL_CONV))

        for cid in ("cmp_newsletter_q3", "cmp_webinar_series"):
            if random.random() < 0.55:
                enrollments.append(_enroll(opp, acct, team, seg,
                                           cid, "manual", BATCH_CONV))

    return enrollments


def _enroll(opp, acct, team, seg, campaign_id, triggered_by, conv_rate):
    return {
        "enrollment_id": "enr_" + uuid.UUID(int=random.getrandbits(128)).hex[:10],
        "opp_id": opp, "account_id": acct, "team": team, "segment": seg,
        "campaign_id": campaign_id,
        "triggered_by": triggered_by,      # "signal" (auto) vs "manual" (batch)
        "enrolled_at": _ts(random.randint(5, 25)),
        "converted": random.random() < conv_rate,   # did the opp advance after enrollment?
    }


# --------------------------------------------------------------------------- #
# 6. Main
# --------------------------------------------------------------------------- #
def main():
    # N_ACCOUNTS - the analytics book (macro views, structured, no LLM).
    # N_WITH_CONVERSATIONS - how many accounts get transcripts/emails/Slack/touches;
    #   only these feed the extraction agent. The four planted heroes are always in it.
    N_ACCOUNTS = 600
    N_WITH_CONVERSATIONS = 30

    ground_truths = list(PLANTED_ACCOUNTS)
    planted_names = {gt["account"] for gt in PLANTED_ACCOUNTS}

    names = [a for a in FILLER_ACCOUNTS if a not in planted_names]
    while len(names) < N_ACCOUNTS - len(PLANTED_ACCOUNTS):
        cand = fake.company()
        if cand not in names and cand not in planted_names:
            names.append(cand)

    for acct in names[: N_ACCOUNTS - len(PLANTED_ACCOUNTS)]:
        ground_truths.append(random_ground_truth(acct))

    # Guard: account_id derives from the name, so unique names => unique ids.
    assert len({gt["account"] for gt in ground_truths}) == len(ground_truths), \
        "duplicate account name detected - would collide on account_id"

    all_envelopes, all_touches, answer_key = [], [], []
    for i, gt in enumerate(ground_truths):
        with_convo = i < N_WITH_CONVERSATIONS
        envs, touches, key = envelopes_for_account(gt)
        if with_convo:
            all_envelopes.extend(envs)
            all_touches.extend(touches)
        key["has_conversations"] = with_convo
        answer_key.append(key)

    all_envelopes.sort(key=lambda e: e["timestamp"])
    all_touches.sort(key=lambda t: t["timestamp"])

    enrollments = build_campaign_enrollments(answer_key)

    import os
    os.makedirs("fixtures", exist_ok=True)
    with open("fixtures/envelopes.json", "w") as f:
        json.dump(all_envelopes, f, indent=2)
    with open("fixtures/ground_truth.json", "w") as f:
        json.dump(answer_key, f, indent=2)
    with open("fixtures/touches.json", "w") as f:
        json.dump(all_touches, f, indent=2)
    with open("fixtures/campaigns.json", "w") as f:
        json.dump({"campaigns": CAMPAIGNS, "enrollments": enrollments}, f, indent=2)

    # Console summary - useful when presenting the methodology live.
    print(f"Accounts:        {len(answer_key)}")
    print(f"Envelopes:       {len(all_envelopes)}")
    by_source = {}
    for e in all_envelopes:
        by_source[e["source"]] = by_source.get(e["source"], 0) + 1
    print(f"By source:       {by_source}")
    print(f"Touches:         {len(all_touches)}")
    print(f"Enrollments:     {len(enrollments)}")
    pipeline = sum(k["deal_amount"] for k in answer_key)
    print(f"Pipeline $:      {pipeline:,} across {len(answer_key)} opps")
    zendesk = [k['account'] for k in answer_key if k['competitor'] == 'Zendesk']
    print(f"Zendesk cluster: {len(zendesk)} opps  (cross-deal pattern)")
    div = [k['account'] for k in answer_key
           if k['crm_stage'] == 'Commit' and 'economic_buyer' in k['meddpicc_absent']]
    print(f"Divergence deal: {div}  (Commit in CRM, EB missing in field)")
    plays = [k['account'] for k in answer_key if k['has_win_play']]
    print(f"Win play (won):  {[k['account'] for k in answer_key if k['has_win_play'] and k['outcome']=='won']}")

    # --- waterfall sanity: baseline vs Zendesk vs Zendesk+gap (deck hero) ---
    closed = [k for k in answer_key if k["outcome"] in ("won", "lost")]
    def wr(rows):
        n = len(rows); w = sum(1 for r in rows if r["outcome"] == "won")
        return (round(100 * w / n) if n else None), n
    base = [k for k in closed if k["competitor"] != "Zendesk"]
    zdk = [k for k in closed if k["competitor"] == "Zendesk"]
    zdk_gap = [k for k in zdk if "native Slack integration" in k.get("feature_requests", [])]
    print("\n[waterfall] baseline (non-Zendesk):    win-rate={} (n={})".format(*wr(base)))
    print("[waterfall] facing Zendesk:            win-rate={} (n={})".format(*wr(zdk)))
    print("[waterfall] Zendesk + Slack gap:       win-rate={} (n={})".format(*wr(zdk_gap)))

    # --- stratified lift: signal_treated vs not, by risk band (deck credibility) ---
    def band(k):
        return "contested" if (k["competitor"] == "Zendesk" or k.get("feature_requests")) else "easy"
    for b in ("contested", "easy"):
        rows = [k for k in closed if band(k) == b]
        tr = [k for k in rows if k.get("signal_treated")]
        un = [k for k in rows if not k.get("signal_treated")]
        print(f"[lift] {b:<9} untreated {wr(un)} -> treated {wr(tr)}")

    print("\n[marketing] campaign conversion, signal-triggered vs batch:")
    for trig in ("signal", "manual"):
        rows = [e for e in enrollments if e["triggered_by"] == trig]
        conv = sum(1 for e in rows if e["converted"])
        rate = round(100 * conv / len(rows)) if rows else 0
        print(f"    {trig:<8} enrollments={len(rows):<4} converted={conv:<4} rate={rate}%")


if __name__ == "__main__":
    main()
