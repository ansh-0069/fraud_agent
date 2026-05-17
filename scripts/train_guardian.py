"""
Train IsolationForest on 1M synthetic transactions with ~1% injected fraud.

Writes:
  services/ml/models/guardian_iforest.joblib  — { model, background, meta }
  data/synthetic/guardian_metrics.json        — PR curve, precision@k

Feature order matches services/ml/guardian.py FEATURES.
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "synthetic"
MODELS = ROOT / "services" / "ml" / "models"
MODELS.mkdir(parents=True, exist_ok=True)


def one_normal_tx(rng: np.random.Generator) -> tuple[np.ndarray, int]:
    hour = int(rng.choice([7, 8, 9, 10, 12, 13, 14, 18, 19, 20, 21]))
    is_new = 1.0 if rng.random() < 0.04 else 0.0
    velocity = float(rng.poisson(0.6))
    amount_z = float(rng.normal(0, 1.0))
    geo = float(rng.exponential(2.0))
    weekend = 1.0 if rng.random() < 0.28 else 0.0
    vec = np.array([hour, is_new, velocity, amount_z, geo, weekend], dtype=np.float32)
    return vec, 0


def one_fraud_tx(rng: np.random.Generator) -> tuple[np.ndarray, int]:
    # Anomaly recipe: off-hour, high velocity, extreme z, new device
    hour = int(rng.choice([0, 1, 2, 3, 23]))
    is_new = 1.0
    velocity = float(rng.integers(5, 15))
    amount_z = float(rng.uniform(4.0, 9.0)) * (1 if rng.random() > 0.5 else -1)
    geo = float(rng.uniform(800, 3500))
    weekend = float(rng.choice([0.0, 1.0]))
    vec = np.array([hour, is_new, velocity, amount_z, geo, weekend], dtype=np.float32)
    return vec, 1


def main(n_total: int | None = None, fraud_rate: float = 0.012, seed: int = 7) -> None:
    import os

    if n_total is None:
        n_total = int(os.environ.get("GUARDIAN_N", "1000000"))
    rng = np.random.default_rng(seed)
    X = np.zeros((n_total, 6), dtype=np.float32)
    y = np.zeros(n_total, dtype=np.int32)
    n_fraud = int(n_total * fraud_rate)
    fraud_idx = set(rng.choice(n_total, size=n_fraud, replace=False))
    for i in range(n_total):
        if i in fraud_idx:
            X[i], y[i] = one_fraud_tx(rng)
        else:
            X[i], y[i] = one_normal_tx(rng)

    benign_mask = y == 0
    X_fit = X[benign_mask][: min(400_000, int(benign_mask.sum()))]

    model = IsolationForest(
        n_estimators=200,
        contamination=fraud_rate * 1.5,
        max_samples="auto",
        random_state=seed,
        n_jobs=-1,
    )
    model.fit(X_fit)

    raw_scores = -model.score_samples(X)
    # higher raw_score = more anomalous (same as guardian.py)
    order = np.argsort(-raw_scores)
    k_list = [10, 50, 100, 500, 1000, 5000]
    prec_at_k = {}
    for k in k_list:
        top = order[:k]
        prec_at_k[str(k)] = float(y[top].mean())

    from sklearn.metrics import average_precision_score, precision_recall_curve

    ap = float(average_precision_score(y, raw_scores))
    prec, rec, _ = precision_recall_curve(y, raw_scores)
    step = max(1, len(prec) // 150)
    pr_curve = {
        "precision": prec[::step].tolist(),
        "recall": rec[::step].tolist(),
    }

    bg = X_fit[:500].astype(np.float32)
    bundle = {"model": model, "background": bg, "n_fit": int(X_fit.shape[0])}
    joblib.dump(bundle, MODELS / "guardian_iforest.joblib")

    metrics = {
        "nTransactions": n_total,
        "fraudRate": fraud_rate,
        "precisionAtK": prec_at_k,
        "averagePrecision": ap,
        "prCurve": pr_curve,
    }
    (DATA / "guardian_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"[guardian] saved {MODELS / 'guardian_iforest.joblib'}")


if __name__ == "__main__":
    main()
