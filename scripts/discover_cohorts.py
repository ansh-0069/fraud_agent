"""
Discover cohorts via KMeans (K=3..8, pick by silhouette) + 2D UMAP.

Reads:
  data/synthetic/users.jsonl
  data/synthetic/income_series.npz

Writes:
  services/ml/models/cohort_kmeans.joblib
  data/synthetic/cohorts.json
  data/synthetic/cohort_labels.npz
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

try:
    import umap  # type: ignore
except ImportError:
    umap = None  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "synthetic"
MODELS = ROOT / "services" / "ml" / "models"
MODELS.mkdir(parents=True, exist_ok=True)

SEG_ORDER = ["gig", "creator", "freelancer", "seasonal"]


def extract_features(income: np.ndarray, rows: list[dict]) -> tuple[np.ndarray, list[str]]:
    """income: (N, 52), rows aligned."""
    feats = []
    ids = []
    for i, u in enumerate(rows):
        s = income[i].astype(np.float64)
        mean = float(np.mean(s)) or 1.0
        std = float(np.std(s))
        vol = std / mean
        x = s - mean
        spec = np.abs(np.fft.rfft(x))
        freqs = np.fft.rfftfreq(len(x))
        peak = 0.0
        if len(spec) > 3:
            mask = (freqs > 0.01) & (freqs < 0.25)
            if np.any(mask):
                peak = float(np.max(spec[mask]) / (np.sum(spec) + 1e-9))
        runway = float(u.get("emergencyRunwayDays", 10))
        obl_amt = float(u["obligation"]["amount"])
        obl_days = float(u["obligation"]["daysOut"])
        obl_density = obl_amt / (mean * max(1.0, obl_days / 7.0))
        feats.append(
            [
                np.log1p(mean),
                vol,
                peak,
                np.log1p(runway),
                np.log1p(obl_amt),
                obl_days / 60.0,
                obl_density,
                float(u.get("fdtConfidence", 0.8)),
                float(u.get("cashBalance", 0)) / max(mean, 1.0),
            ]
        )
        ids.append(str(u["id"]))
    return np.asarray(feats, dtype=np.float64), ids


def contingency_hand_vs_kmeans(segments: list[str], labels: np.ndarray, k: int) -> dict:
    mat = np.zeros((len(SEG_ORDER), k), dtype=int)
    seg_i = {s: i for i, s in enumerate(SEG_ORDER)}
    for seg, lab in zip(segments, labels):
        si = seg_i.get(seg, 0)
        mat[si, int(lab)] += 1
    return {
        "segmentIds": SEG_ORDER,
        "cohortIndices": list(range(k)),
        "matrix": mat.tolist(),
    }


def main(random_state: int = 42) -> None:
    if os.name == "nt":
        os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 4))

    rows: list[dict] = []
    with (DATA / "users.jsonl").open(encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    inc = np.load(DATA / "income_series.npz")["income"]
    assert len(rows) == inc.shape[0]

    X_raw, user_ids = extract_features(inc, rows)
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    best_k = 3
    best_score = -1.0
    for k in range(3, 9):
        km = KMeans(n_clusters=k, random_state=random_state, n_init=10)
        lab = km.fit_predict(X)
        sc = float(silhouette_score(X, lab))
        print(f"[cohorts] K={k} silhouette={sc:.4f}")
        if sc > best_score:
            best_score = sc
            best_k = k

    best_model = KMeans(n_clusters=best_k, random_state=random_state, n_init=10)
    labels = best_model.fit_predict(X).astype(int)
    centroids = best_model.cluster_centers_

    if umap is not None:
        reducer = umap.UMAP(
            n_components=2,
            random_state=random_state,
            n_neighbors=15,
            min_dist=0.1,
            n_jobs=1,
        )
        emb = reducer.fit_transform(X)
    else:
        from sklearn.decomposition import PCA

        emb = PCA(n_components=2, random_state=random_state).fit_transform(X)

    segments = [str(r["segmentId"]) for r in rows]
    confusion = contingency_hand_vs_kmeans(segments, labels, best_k)

    bundle = {"scaler": scaler, "model": best_model, "feature_dim": X_raw.shape[1], "k": best_k}
    joblib.dump(bundle, MODELS / "cohort_kmeans.joblib")

    star_ids = {"ahmad", "meilin", "raj", "kadek"}
    stars = []
    for i, uid in enumerate(user_ids):
        if uid in star_ids:
            stars.append(
                {
                    "id": uid,
                    "label": "Mei Lin" if uid == "meilin" else uid.capitalize(),
                    "umapX": float(emb[i, 0]),
                    "umapY": float(emb[i, 1]),
                    "cohort": int(labels[i]),
                }
            )

    out = {
        "nUsers": len(rows),
        "nCohorts": best_k,
        "silhouette": float(best_score),
        "cohortLabels": labels.astype(int).tolist(),
        "umapX": emb[:, 0].tolist(),
        "umapY": emb[:, 1].tolist(),
        "handSegments": segments,
        "centroids": centroids.tolist(),
        "confusionHandVsKMeans": confusion,
        "personaStars": stars,
        "featureNames": [
            "log_mean_income",
            "volatility",
            "seasonality_peak",
            "log_runway",
            "log_obligation_amt",
            "obligation_days_norm",
            "obligation_density",
            "fdt_confidence",
            "cash_to_income",
        ],
    }

    np.savez_compressed(DATA / "cohort_labels.npz", labels=labels)
    p = DATA / "cohorts.json"
    p.write_text(json.dumps(out, indent=2))

    print(f"[cohorts] saved {MODELS / 'cohort_kmeans.joblib'}")
    print(f"[cohorts] saved {p}")


if __name__ == "__main__":
    main()
