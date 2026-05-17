"""
Train default-risk classifier (GradientBoosting) on synthetic outcomes.

Reads data/synthetic/outcomes.jsonl + users (for extra features)
Writes services/ml/models/default_risk.joblib
     data/synthetic/default_risk_metrics.json (ROC, calibration, AUC, Brier)
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "synthetic"
MODELS = ROOT / "services" / "ml" / "models"
MODELS.mkdir(parents=True, exist_ok=True)


def main(seed: int = 42) -> None:
    outcomes = []
    with (DATA / "outcomes.jsonl").open(encoding="utf-8") as f:
        for line in f:
            outcomes.append(json.loads(line))
    users = {}
    with (DATA / "users.jsonl").open(encoding="utf-8") as f:
        for line in f:
            u = json.loads(line)
            users[u["id"]] = u

    rows = []
    for o in outcomes:
        u = users[o["id"]]
        wk = np.array(u["weeklyIncome"], dtype=np.float64)
        mean = float(np.mean(wk)) or 1.0
        rows.append(
            {
                "default": o["default"],
                "shortfallProb": o["shortfallProb"],
                "log_income": np.log1p(mean),
                "vol_u": float(u["incomeVolatilityIdx"]),
                "runway": float(u["emergencyRunwayDays"]),
                "log_cash": np.log1p(float(u["cashBalance"])),
                "log_obl": np.log1p(float(u["obligation"]["amount"])),
                "obl_days": float(u["obligation"]["daysOut"]),
                "fdt_conf": float(u["fdtConfidence"]),
                "cohort_hand": u["segmentId"],
            }
        )

    df = pd.DataFrame(rows)
    y = df["default"].values
    X = df.drop(columns=["default", "cohort_hand", "shortfallProb"]).values
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=seed, stratify=y)

    clf = GradientBoostingClassifier(random_state=seed, max_depth=3, n_estimators=120, learning_rate=0.08)
    clf.fit(X_tr, y_tr)

    proba = clf.predict_proba(X_te)[:, 1]
    auc = float(roc_auc_score(y_te, proba))
    brier = float(brier_score_loss(y_te, proba))
    ap = float(average_precision_score(y_te, proba))

    fpr, tpr, _ = roc_curve(y_te, proba)
    prob_true, prob_pred = calibration_curve(y_te, proba, n_bins=10, strategy="uniform")

    feature_names = [c for c in df.columns if c not in ("default", "cohort_hand", "shortfallProb")]

    bundle = {"model": clf, "feature_names": feature_names}
    joblib.dump(bundle, MODELS / "default_risk.joblib")

    metrics = {
        "aucRoc": auc,
        "averagePrecision": ap,
        "brier": brier,
        "roc": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
        "calibration": {"meanPredicted": prob_pred.tolist(), "fractionPositive": prob_true.tolist()},
    }
    (DATA / "default_risk_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"[default_risk] AUC={auc:.3f} Brier={brier:.4f} -> {MODELS / 'default_risk.joblib'}")


if __name__ == "__main__":
    main()
