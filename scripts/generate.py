# -*- coding: utf-8 -*-
"""
Field Intelligence System - Synthetic Data Factory
===================================================

NOTE (committed as a methodology artifact — DO NOT re-run against the repo):
  The committed fixtures/envelopes.json contains this script's 44 generated
  envelopes PLUS 2 hand-authored historical "won vs Zendesk" win-wire envelopes
  (Massive Dynamic, Prestige Worldwide) so the golden-route pattern fires at 3.
  fixtures/accounts.json (deal amount / territory / district enrichment) is also
  hand-authored and NOT produced here. Re-running this script would drop those
  additions and change opp_ids/envelope_ids. Kept in the repo to show the
  "plant the answer, hide it in prose, grade against it" methodology.

WHAT THIS IS
------------
This script manufactures the fake world the demo runs on. It does NOT generate
CRM records with MEDDPICC already filled in. It generates the raw, messy field
conversations - Gong call transcripts, sales emails, and Slack threads - that the
extraction agent has to *derive* MEDDPICC from. That inversion is the whole point.

THE METHODOLOGY (this is what you present)
------------------------------------------
This evolves a prior synthetic-data approach that generated CRM records directly.
Here the method is inverted into three moves:

  1. PLANT THE ANSWER FIRST.  For each account we decide a hidden ground-truth
     profile - which MEDDPICC elements are actually true, which competitor is in
     the deal, and where the deal is really heading. Nothing is written yet.

  2. HIDE IT IN PROSE.  We then write natural conversations that *encode* that
     ground truth. Front-half MEDDPICC (pain, metrics, champion, competition)
     surfaces on CALLS - people say it out loud. Back-half MEDDPICC (economic
     buyer, decision process, paper process) surfaces in EMAILS - it lives in
     loop-ins and procurement threads, not on calls. That's a real sales truth,
     and encoding it in the data lets the demo prove the "calls vs emails" point.

  3. GRADE AGAINST THE ANSWER KEY.  Because we saved the ground truth, we can run
     extraction over the conversations and score it field-by-field. "I measured
     the risky part before building on it" is a claim we can actually back up.

Reproducibility: single fixed seed. Re-running produces byte-identical fixtures.

OUTPUTS
-------
  fixtures/envelopes.json      -> everything the app ingests (raw conversations)
  fixtures/ground_truth.json   -> the hidden answer key (NOT shown in the main UI)
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from faker import Faker

# --------------------------------------------------------------------------- #
# 0. Reproducibility - one seed drives everything (ported from prior workbook)
# --------------------------------------------------------------------------- #
SEED = 20260716
fake = Faker()
Faker.seed(SEED)
random.seed(SEED)

TODAY = datetime(2026, 7, 16)
WINDOW_WEEKS = 6  # conversations span the last 6 weeks

# --------------------------------------------------------------------------- #
# 1. Vocabulary banks (template + trigger method, carried forward & repurposed)
# --------------------------------------------------------------------------- #
MEDDPICC_FIELDS = [
    "metrics", "economic_buyer", "decision_criteria", "decision_process",
    "paper_process", "identify_pain", "champion", "competition",
]
FRONT_HALF = ["identify_pain", "metrics", "champion", "competition"]
BACK_HALF = ["economic_buyer", "decision_process", "paper_process", "decision_criteria"]

COMPETITORS = ["Zendesk", "ServiceNow", "Zoho", "HubSpot", "Intercom", "an internal build"]

FILLER_ACCOUNTS = [
    "Umbrella Logistics", "Hooli", "Vandelay Industries", "Wayne Enterprises",
    "Wonka Foods", "Cyberdyne Systems", "Soylent Corp", "Pied Piper",
    "Massive Dynamic", "Gekko & Co", "Prestige Worldwide", "Bluth Company",
]

STAGES = ["Discovery", "Evaluation", "Proposal", "Negotiation", "Commit"]

PAINS = [
    "our support tickets are scattered across three different tools and nothing talks to each other",
    "agents waste the first two minutes of every call just figuring out who they're talking to",
    "we have no real visibility into first-response time by team",
    "our current system falls over every time we run a seasonal promotion",
    "reporting is a nightmare - I'm exporting to spreadsheets every single week",
]

METRIC_OUTCOMES = [
    ("cut average handle time by even 20 percent", "around 1.4 million dollars a year in agent capacity"),
    ("get first-response time under an hour", "close to 800 thousand a year in retained accounts"),
    ("deflect a third of tickets to self-service", "about 2 million annually in headcount we wouldn't have to add"),
    ("consolidate onto one platform", "roughly 600 thousand a year in tool spend"),
]

CRITERIA = ["native integrations", "scalability during peak season", "SOC 2 and data residency",
            "ease of admin", "total cost of ownership", "reporting depth"]

SLACK_NOISE = [
    "anyone have the updated pricing one-pager?",
    "great job on the QBR everyone",
    "reminder: forecast calls locked by EOD Friday",
    "who's covering the SE for the demo tomorrow?",
    "coffee chat notes are in the drive",
    "lol the parking at the office event was chaos",
    "can someone approve my expense report",
]

REPS = [fake.name() for _ in range(6)]


def contact(account):
    title = random.choice([
        "VP of Support", "Director of Customer Experience", "Head of CX Ops",
        "Support Operations Manager", "VP of Customer Success",
    ])
    return f"{fake.name()}", title


PLANTED_ACCOUNTS = [
    {
        "account": "Northwind Systems", "stage": "Commit",
        "meddpicc_present": ["identify_pain", "metrics", "champion", "competition", "decision_criteria"],
        "competitor": "Zendesk", "trajectory": "rotting", "has_win_play": False,
        "n_calls": 3, "n_emails": 2, "n_slack": 1,
    },
    {
        "account": "Globex", "stage": "Evaluation",
        "meddpicc_present": ["identify_pain", "metrics", "champion", "competition", "economic_buyer", "decision_process"],
        "competitor": "Zendesk", "trajectory": "healthy", "has_win_play": False,
        "n_calls": 2, "n_emails": 1, "n_slack": 1,
    },
    {
        "account": "Initech", "stage": "Proposal",
        "meddpicc_present": ["identify_pain", "champion", "competition"],
        "competitor": "Zendesk", "trajectory": "healthy", "has_win_play": False,
        "n_calls": 2, "n_emails": 1, "n_slack": 0,
    },
    {
        "account": "Stark Industries", "stage": "Commit",
        "meddpicc_present": ["identify_pain", "metrics", "champion", "competition",
                             "economic_buyer", "decision_process", "paper_process", "decision_criteria"],
        "competitor": "Zendesk", "trajectory": "accelerating", "has_win_play": True,
        "n_calls": 2, "n_emails": 1, "n_slack": 1,
    },
]


def random_ground_truth(account):
    trajectory = random.choice(["healthy", "healthy", "rotting", "accelerating"])
    present = [f for f in FRONT_HALF if random.random() < 0.75]
    present += [f for f in BACK_HALF if random.random() < 0.45]
    competitor = random.choice(COMPETITORS) if "competition" in present or random.random() < 0.4 else None
    if competitor and "competition" not in present:
        present.append("competition")
    return {
        "account": account, "stage": random.choice(STAGES),
        "meddpicc_present": present, "competitor": competitor, "trajectory": trajectory,
        "has_win_play": trajectory == "accelerating" and random.random() < 0.5,
        "n_calls": random.randint(1, 3), "n_emails": random.randint(0, 2), "n_slack": random.randint(0, 1),
    }


def _ts(days_ago, hour=10):
    return (TODAY - timedelta(days=days_ago)).replace(hour=hour, minute=random.randint(0, 59)).isoformat()


def build_call(gt, rep, buyer_name, buyer_title, call_index, pain, metric, escalate_competitor=False):
    acct = gt["account"]
    lines = [f"[00:00] {rep} (Rep): Thanks for making time again. How are things on your end since we last spoke?"]
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
    if "champion" in gt["meddpicc_present"]:
        if gt["trajectory"] == "rotting" and call_index >= 1:
            lines.append(f"[07:10] {rep} (Rep): Internal note - {buyer_name} has been our champion but is noticeably less responsive this call; may be losing air cover.")
        else:
            lines.append(f"[07:02] {rep} (Rep): Internal note - {buyer_name} is clearly our champion here, actively selling this internally on our behalf.")
    lines.append(f"[09:30] {rep} (Rep): Great, I'll follow up with next steps over email. Appreciate the time.")
    return "\n".join(lines)


def build_email(gt, rep, buyer_name, buyer_title, quiet=False):
    acct = gt["account"]
    subject = f"RE: {acct} <> next steps"
    body = [f"Subject: {subject}", "", f"From: {rep}", f"To: {buyer_name} ({buyer_title}, {acct})", "",
            f"Hi {buyer_name.split()[0]},", "", "Following up on our call - a few questions so I can line up the right next steps.", ""]
    if "decision_criteria" in gt["meddpicc_present"]:
        c = random.sample(CRITERIA, 3)
        body.append(f"1. On requirements, you'd mentioned {c[0]}, {c[1]}, and {c[2]} as the things that matter most. Still accurate?")
    body += ["", "Best,", rep, "", "---", "", f"From: {buyer_name}", f"To: {rep}", ""]
    if quiet:
        body.append(f"Hi {rep.split()[0]}, thanks - swamped this week, will circle back. {buyer_name.split()[0]}")
        return "\n".join(body)
    body += [f"Hi {rep.split()[0]},", ""]
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
    body += ["", f"Thanks, {buyer_name.split()[0]}"]
    return "\n".join(body)


def build_slack(gt, rep, channel):
    acct = gt["account"]
    others = [r for r in REPS if r != rep] or REPS
    lines = []
    if gt["has_win_play"] and channel == "win-wire":
        comp = gt["competitor"] or "the incumbent"
        lines.append(f"{rep}: closed {acct}! \U0001f389")
        lines.append(f"{rep}: what got us over the line vs {comp} was leaning hard into the migration story - we mapped out a zero-downtime cutover and that's what flipped their ops lead. reusing that on every {comp} deal from now on.")
        lines.append(f"{random.choice(others)}: huge, congrats - stealing that migration angle")
    else:
        comp = gt["competitor"] or random.choice(COMPETITORS)
        lines.append(f"{rep}: anyone hit the '{comp} is cheaper' pushback on {acct}? losing ground on price there")
        lines.append(f"{random.choice(others)}: yeah constant lately, {comp} is discounting aggressively this quarter")
    for note in random.sample(SLACK_NOISE, random.randint(2, 4)):
        lines.append(f"{random.choice(others)}: {note}")
    return "\n".join(lines)


def envelopes_for_account(gt):
    acct = gt["account"]
    account_id = "acc_" + acct.lower().split()[0]
    opp_id = "opp_" + uuid.UUID(int=random.getrandbits(128)).hex[:8]
    rep = random.choice(REPS)
    buyer_name, buyer_title = contact(acct)
    account_pain = random.choice(PAINS)
    account_metric = random.choice(METRIC_OUTCOMES)
    out = []
    day_slots = sorted(random.sample(range(3, WINDOW_WEEKS * 7),
                                     gt["n_calls"] + gt["n_emails"] + gt["n_slack"]), reverse=True)
    slot = iter(day_slots)
    for i in range(gt["n_calls"]):
        escalate = gt["trajectory"] == "rotting" and i >= 1
        raw = build_call(gt, rep, buyer_name, buyer_title, i, account_pain, account_metric, escalate_competitor=escalate)
        d = next(slot)
        out.append({
            "envelope_id": "env_" + uuid.UUID(int=random.getrandbits(128)).hex[:10],
            "source": "gong_call", "account_id": account_id, "account_name": acct, "opp_id": opp_id,
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
            "source": "gong_email", "account_id": account_id, "account_name": acct, "opp_id": opp_id,
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
            "source": "slack", "account_id": account_id, "account_name": acct, "opp_id": opp_id,
            "timestamp": _ts(d), "raw_text": raw,
            "participants": [rep], "metadata": {"channel": f"#{channel}"},
        })
    return out, {
        "account": acct, "account_id": account_id, "opp_id": opp_id, "crm_stage": gt["stage"],
        "meddpicc_present": sorted(set(gt["meddpicc_present"])),
        "meddpicc_absent": sorted(set(MEDDPICC_FIELDS) - set(gt["meddpicc_present"])),
        "competitor": gt["competitor"], "trajectory": gt["trajectory"], "has_win_play": gt["has_win_play"],
    }


def main():
    ground_truths = list(PLANTED_ACCOUNTS)
    planted_names = {gt["account"] for gt in PLANTED_ACCOUNTS}
    fillers = [a for a in FILLER_ACCOUNTS if a not in planted_names]
    for acct in fillers[: 12 - len(PLANTED_ACCOUNTS)]:
        ground_truths.append(random_ground_truth(acct))
    assert len({gt["account"] for gt in ground_truths}) == len(ground_truths), \
        "duplicate account name detected - would collide on account_id"
    all_envelopes, answer_key = [], []
    for gt in ground_truths:
        envs, key = envelopes_for_account(gt)
        all_envelopes.extend(envs)
        answer_key.append(key)
    all_envelopes.sort(key=lambda e: e["timestamp"])
    import os
    os.makedirs("fixtures", exist_ok=True)
    with open("fixtures/envelopes.json", "w") as f:
        json.dump(all_envelopes, f, indent=2)
    with open("fixtures/ground_truth.json", "w") as f:
        json.dump(answer_key, f, indent=2)
    print(f"Accounts:  {len(answer_key)}   Envelopes: {len(all_envelopes)}")


if __name__ == "__main__":
    main()
