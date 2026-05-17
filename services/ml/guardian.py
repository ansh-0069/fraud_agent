"""
Guardian Engine — real sklearn Isolation Forest + SHAP plain-language explanations.

Trains an Isolation Forest at startup on a large synthetic transaction corpus
(realistic feature distributions for ordinary gig-worker / creator activity).
Scores incoming transactions against that anomaly baseline and uses a SHAP
TreeExplainer to attribute the anomaly score to specific features.

The output schema matches the TS fallback in apps/web/lib/ml/guardian.ts so
the frontend can render scores from either source identically.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import joblib
from sklearn.ensemble import IsolationForest

try:
    import shap  # type: ignore
except Exception:  # shap is heavy; tolerate missing
    shap = None  # type: ignore


FEATURES = ["hour", "isNewDevice", "velocityScore", "amountZ", "geoDeltaKm", "weekend"]

FEATURE_LABELS = {
    "hour": "Off-hour activity",
    "isNewDevice": "New / unrecognized device",
    "velocityScore": "Velocity (tx in last hour)",
    "amountZ": "Amount z-score",
    "geoDeltaKm": "Geo distance from typical",
    "weekend": "Weekend pattern",
}


def _tx_to_vec(tx: Dict[str, Any]) -> np.ndarray:
    f = tx["features"]
    return np.array(
        [
            float(f["hour"]),
            1.0 if f["isNewDevice"] else 0.0,
            float(f["velocityScore"]),
            float(f["amountZ"]),
            float(f["geoDeltaKm"]),
            1.0 if f["weekend"] else 0.0,
        ],
        dtype=np.float32,
    )


def _gen_baseline(n: int = 4000, rng: np.random.Generator | None = None) -> np.ndarray:
    rng = rng or np.random.default_rng(7)
    # Realistic baseline: business hours, occasional weekend, no new device most of the time
    hour = rng.choice([7, 8, 9, 10, 12, 13, 14, 18, 19, 20, 21], size=n, p=None)
    is_new = rng.random(n) < 0.04
    velocity = rng.poisson(0.6, size=n).astype(np.float32)
    amount_z = rng.normal(0, 1.0, size=n).astype(np.float32)
    geo = rng.exponential(2.0, size=n).astype(np.float32)
    weekend = (rng.random(n) < 0.28).astype(np.float32)
    X = np.column_stack([hour, is_new.astype(np.float32), velocity, amount_z, geo, weekend])
    return X.astype(np.float32)


def _plain_language(feat: str, value: float, raw: Dict[str, Any]) -> str:
    if feat == "hour":
        return f"{int(value):02d}:00"
    if feat == "isNewDevice":
        return "yes" if raw["features"]["isNewDevice"] else "no"
    if feat == "velocityScore":
        return f"{int(value)} tx/h"
    if feat == "amountZ":
        return f"z={value:.1f}"
    if feat == "geoDeltaKm":
        return f"{int(value)} km"
    if feat == "weekend":
        return "yes" if raw["features"]["weekend"] else "no"
    return f"{value:.2f}"


class GuardianEngine:
    def __init__(self, models_dir: Path):
        bundle_path = models_dir / "guardian_iforest.joblib"
        if bundle_path.exists():
            try:
                bundle = joblib.load(bundle_path)
                self.model = bundle["model"]
                self.background = np.asarray(bundle["background"], dtype=np.float32)
                self.baseline_size = int(bundle.get("n_fit", len(bundle.get("background", []))))
                self.explainer = None
                if shap is not None:
                    try:
                        self.explainer = shap.Explainer(self.model, self.background)
                    except Exception:
                        self.explainer = None
                return
            except Exception:
                pass
        rng = np.random.default_rng(13)
        X = _gen_baseline(4000, rng)
        self.model = IsolationForest(
            n_estimators=120,
            contamination=0.05,
            max_samples="auto",
            random_state=13,
        )
        self.model.fit(X)
        self.background = X[:200]
        self.explainer = None
        if shap is not None:
            try:
                self.explainer = shap.Explainer(self.model, self.background)
            except Exception:
                self.explainer = None
        self.baseline_size = X.shape[0]

    def info(self) -> Dict[str, Any]:
        return {
            "method": f"IsolationForest(n_estimators={getattr(self.model, 'n_estimators', '?')})",
            "baseline_rows": int(self.baseline_size),
            "shap": bool(self.explainer is not None),
        }

    def score(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not transactions:
            return []
        X = np.vstack([_tx_to_vec(t) for t in transactions])
        # Higher = more anomalous
        raw_scores = -self.model.score_samples(X)
        # Normalize to 0..1 using a soft logistic
        normalized = 1.0 / (1.0 + np.exp(-(raw_scores - raw_scores.mean()) * 1.4))
        # SHAP attribution
        if self.explainer is not None:
            try:
                shap_vals = self.explainer(X).values  # shape (n_tx, n_features)
            except Exception:
                shap_vals = None
        else:
            shap_vals = None

        out: List[Dict[str, Any]] = []
        for i, tx in enumerate(transactions):
            score = float(np.clip(normalized[i], 0.0, 0.99))
            # Build per-feature absolute weights
            if shap_vals is not None and i < len(shap_vals):
                weights = np.abs(shap_vals[i])
            else:
                # Fallback weighting matches TS heuristic — keeps demo honest
                f = tx["features"]
                weights = np.array(
                    [
                        0.6 if (f["hour"] <= 5 or f["hour"] >= 23) else 0.05,
                        0.5 if f["isNewDevice"] else 0.0,
                        min(1.0, f["velocityScore"] / 6.0),
                        min(1.0, max(0.0, abs(f["amountZ"]) / 5.0)),
                        min(1.0, f["geoDeltaKm"] / 1500.0),
                        0.05,
                    ]
                )
            total = float(weights.sum()) or 1.0
            normed = weights / total
            top_factors = sorted(
                [
                    {
                        "feature": FEATURE_LABELS[FEATURES[k]],
                        "weight": float(normed[k]),
                        "valueLabel": _plain_language(FEATURES[k], float(X[i][k]), tx),
                    }
                    for k in range(len(FEATURES))
                ],
                key=lambda d: -d["weight"],
            )[:4]

            out.append({"tx": tx, "score": score, "topFactors": top_factors})
        return out
