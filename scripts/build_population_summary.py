"""
Assemble apps/web/public/data/population_summary.json for the /population page.

Run after: generate_dataset, train_fdt, discover_cohorts, train_segment_classifier,
simulate_outcomes, train_default_risk, train_coach, train_guardian.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "synthetic"
MODELS = ROOT / "services" / "ml" / "models"
PUBLIC = ROOT / "apps" / "web" / "public" / "data"
PUBLIC.mkdir(parents=True, exist_ok=True)

# Tailored top-3 RL actions by hand segment (matches apps/web/app/(app)/segments/page.tsx)
SEG_TOP_ACTIONS: dict[str, list[str]] = {
    "gig": [
        "INCOME_TARGET_SURGE_WINDOW",
        "INSURANCE_VEHICLE_COVER_GIG",
        "SAVINGS_BOOST_NOW",
    ],
    "creator": [
        "INCOME_BRAND_DEAL_PIPE",
        "TAX_CROSS_BORDER_DTAA",
        "INSURANCE_DEVICE_PROTECTION",
    ],
    "freelancer": [
        "INCOME_INVOICE_FOLLOWUP",
        "TAX_ADVANCE_TAX_REMIND",
        "SAVINGS_BIG_GOAL_REVIEW",
    ],
    "seasonal": [
        "INSURANCE_SEASON_GAP_COVER",
        "SAVINGS_RAINY_DAY_TOPUP",
        "SPENDING_FESTIVAL_PLAN",
    ],
}


def main() -> None:
    users: list[dict] = []
    with (DATA / "users.jsonl").open(encoding="utf-8") as f:
        for line in f:
            users.append(json.loads(line))

    cohorts = json.loads((DATA / "cohorts.json").read_text(encoding="utf-8"))
    labels = np.array(cohorts["cohortLabels"], dtype=int)
    hand = cohorts["handSegments"]
    k = int(cohorts["nCohorts"])

    outcomes_by_id: dict[str, dict] = {}
    with (DATA / "outcomes.jsonl").open(encoding="utf-8") as f:
        for line in f:
            o = json.loads(line)
            outcomes_by_id[o["id"]] = o

    # Income histogram (log10 of mean weekly income) by country
    countries = sorted({u["countryCode"] for u in users})
    bin_edges = np.linspace(1.8, 6.2, 19)
    income_hist: dict[str, dict] = {}
    for cc in countries:
        vals = [
            float(np.log10(max(1.0, np.mean(u["weeklyIncome"]))))
            for u in users
            if u["countryCode"] == cc
        ]
        counts, _ = np.histogram(vals, bins=bin_edges)
        income_hist[cc] = {"counts": counts.tolist(), "binEdges": bin_edges.tolist()}

    cohort_stats = []
    for c in range(k):
        idx = [i for i, lab in enumerate(labels) if lab == c]
        vols = [float(users[i]["incomeVolatilityIdx"]) for i in idx]
        shocks = [float(outcomes_by_id[users[i]["id"]]["shockSurvivalDays"]) for i in idx if users[i]["id"] in outcomes_by_id]
        segs = [hand[i] for i in idx]
        mode_seg = Counter(segs).most_common(1)[0][0] if segs else "gig"
        cohort_stats.append(
            {
                "id": c,
                "n": len(idx),
                "meanVolatility": float(np.mean(vols)) if vols else 0.0,
                "meanShockSurvivalDays": float(np.mean(shocks)) if shocks else 0.0,
                "dominantHandSegment": mode_seg,
                "topActions": SEG_TOP_ACTIONS.get(mode_seg, SEG_TOP_ACTIONS["gig"]),
            }
        )

    fdt_curve = json.loads((MODELS / "fdt_training_curve.json").read_text(encoding="utf-8"))
    ppo_curve = json.loads((MODELS / "training_curve.json").read_text(encoding="utf-8"))

    default_m = json.loads((DATA / "default_risk_metrics.json").read_text(encoding="utf-8"))
    guardian_m = json.loads((DATA / "guardian_metrics.json").read_text(encoding="utf-8"))
    seg_clf = json.loads((DATA / "segment_classifier_metrics.json").read_text(encoding="utf-8"))

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "nUsers": len(users),
        "nCohorts": k,
        "silhouette": float(cohorts["silhouette"]),
        "lstmValLossFinal": float(fdt_curve["val"][-1]) if fdt_curve.get("val") else None,
        "lstmCurve": fdt_curve,
        "ppoCurve": ppo_curve,
        "countries": countries,
        "incomeHistogramByCountry": income_hist,
        "umapX": cohorts["umapX"],
        "umapY": cohorts["umapY"],
        "cohortLabels": cohorts["cohortLabels"],
        "personaStars": cohorts["personaStars"],
        "confusionHandVsKMeans": cohorts["confusionHandVsKMeans"],
        "cohortStats": cohort_stats,
        "defaultRisk": {
            "aucRoc": default_m["aucRoc"],
            "brier": default_m["brier"],
            "roc": default_m["roc"],
            "calibration": default_m["calibration"],
        },
        "guardian": {
            "averagePrecision": guardian_m["averagePrecision"],
            "precisionAtK": guardian_m["precisionAtK"],
            "prCurve": guardian_m["prCurve"],
        },
        "segmentClassifier": seg_clf,
    }

    out_path = PUBLIC / "population_summary.json"
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"[summary] wrote {out_path}")


if __name__ == "__main__":
    main()
