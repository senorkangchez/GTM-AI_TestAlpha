# -*- coding: utf-8 -*-
"""
Heatmap datasets for the dashboard (F1a family).

Builds THREE views, each computed for every geography scope (All / each district /
each territory) so the dashboard can toggle without recomputing:

  1. product x competitor   - which product holds up against whom
  2. campaign x segment     - which nurture track works where (VP ABM)
  3. product x campaign     - which campaign lifts which product

Cell metric is WIN RATE with n, plus gap-cited losses where relevant. Cells with
n < MIN_N are emitted with rate=None so the UI greys them out rather than showing
a rate off 2 deals.

Attribution note: an opp is counted under EVERY product it involves and EVERY
campaign it was enrolled in. That is correct for "how does X fare" questions (unlike
a flow diagram, a cross-tab has no conservation requirement).

Output: fixtures/heatmaps.json
"""
import json
from collections import defaultdict

MIN_N = 5


def load():
    with open("fixtures/ground_truth.json") as f:
        opps = json.load(f)
    with open("fixtures/campaigns.json") as f:
        camp = json.load(f)
    return opps, camp["campaigns"], camp["enrollments"]


def cell(rows):
    """Win rate + n for a set of opps."""
    closed = [o for o in rows if o["outcome"] in ("won", "lost")]
    won = sum(1 for o in closed if o["outcome"] == "won")
    gap = sum(1 for o in closed
              if o["outcome"] == "lost" and o.get("feature_requests"))
    n = len(closed)
    return {
        "rate": round(100 * won / n) if n >= MIN_N else None,
        "n": n,
        "gap_losses": gap,
    }


def grid(opps, row_key, col_key, row_vals, col_vals):
    out = {}
    for r in row_vals:
        for c in col_vals:
            rows = [o for o in opps if r in row_key(o) and c in col_key(o)]
            if not rows:
                continue
            out[f"{r}|{c}"] = cell(rows)
    return out


def main():
    opps, campaigns, enrollments = load()
    cname = {c["campaign_id"]: c["name"] for c in campaigns}

    # opp -> set of campaign names it was enrolled in
    opp_camps = defaultdict(set)
    for e in enrollments:
        opp_camps[e["opp_id"]].add(cname[e["campaign_id"]])
    for o in opps:
        o["_campaigns"] = sorted(opp_camps.get(o["opp_id"], [])) or ["no campaign"]

    products = ["Support Cloud", "Messaging", "Analytics", "Self-Service Portal"]
    competitors = ["Zendesk", "Zoho", "Intercom", "HubSpot",
                   "an internal build", "no competitor"]
    camp_names = [c["name"] for c in campaigns] + ["no campaign"]
    segments = ["mid-market", "enterprise", "smb"]

    districts = sorted({o["district"] for o in opps if o.get("district")})
    territories = sorted({o["territory"] for o in opps if o.get("territory")})

    scopes = {"All": opps}
    for d in districts:
        scopes[d] = [o for o in opps if o.get("district") == d]
    for t in territories:
        scopes[t] = [o for o in opps if o.get("territory") == t]

    views = {}
    for scope, rows in scopes.items():
        views[scope] = {
            "n_opps": len(rows),
            "product_competitor": grid(
                rows, lambda o: o.get("product_lines", []),
                lambda o: [o.get("competitor") or "no competitor"],
                products, competitors),
            "campaign_segment": grid(
                rows, lambda o: o["_campaigns"],
                lambda o: [o.get("segment")],
                camp_names, segments),
            "product_campaign": grid(
                rows, lambda o: o.get("product_lines", []),
                lambda o: o["_campaigns"],
                products, camp_names),
        }

    payload = {
        "axes": {
            "product_competitor": {"rows": products, "cols": competitors},
            "campaign_segment": {"rows": camp_names, "cols": segments},
            "product_campaign": {"rows": products, "cols": camp_names},
        },
        "geo": {"districts": districts, "territories": territories,
                "territory_to_district": {o["territory"]: o["district"]
                                          for o in opps if o.get("territory")}},
        "min_n": MIN_N,
        "views": views,
    }
    with open("fixtures/heatmaps.json", "w") as f:
        json.dump(payload, f, indent=1)

    # ---- density report: are cells actually populated at each scope? ----
    print(f"scopes: All + {len(districts)} districts + {len(territories)} territories\n")
    for view in ("product_competitor", "campaign_segment", "product_campaign"):
        print(f"{view}:")
        for label, scope in (("All", "All"),
                             ("district avg", districts),
                             ("territory avg", territories)):
            scope_list = [scope] if isinstance(scope, str) else scope
            shown, total = 0, 0
            for s in scope_list:
                g = views[s][view]
                total += len(g)
                shown += sum(1 for v in g.values() if v["rate"] is not None)
            pct = round(100 * shown / total) if total else 0
            print(f"   {label:<14} {shown}/{total} cells have n>={MIN_N}  ({pct}%)")
        print()


if __name__ == "__main__":
    main()
