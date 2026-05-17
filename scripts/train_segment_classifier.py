"""
Train a small MLP to predict KMeans cohort from clustering features.

Reads:
  data/synthetic/users.jsonl + income_series.npz + cohorts.json (cohortLabels)

Writes:
  services/ml/models/segment_clf.pt
  data/synthetic/segment_classifier_metrics.json
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "synthetic"
MODELS = ROOT / "services" / "ml" / "models"
MODELS.mkdir(parents=True, exist_ok=True)


def extract_features(income: np.ndarray, rows: list[dict]) -> tuple[np.ndarray, list[str]]:
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


class SegmentMLP(nn.Module):
    def __init__(self, in_dim: int, num_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def main(seed: int = 42, epochs: int = 80, lr: float = 1e-3) -> None:
    torch.manual_seed(seed)
    rows: list[dict] = []
    with (DATA / "users.jsonl").open(encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    inc = np.load(DATA / "income_series.npz")["income"]
    cohorts = json.loads((DATA / "cohorts.json").read_text(encoding="utf-8"))
    y = np.array(cohorts["cohortLabels"], dtype=np.int64)
    X_raw, _ = extract_features(inc, rows)
    assert len(y) == len(X_raw)

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X_raw)
    try:
        X_tr, X_te, y_tr, y_te = train_test_split(Xs, y, test_size=0.2, random_state=seed, stratify=y)
    except ValueError:
        X_tr, X_te, y_tr, y_te = train_test_split(Xs, y, test_size=0.2, random_state=seed)

    num_classes = int(y.max()) + 1
    in_dim = Xs.shape[1]
    model = SegmentMLP(in_dim, num_classes)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.CrossEntropyLoss()

    Xt = torch.tensor(X_tr, dtype=torch.float32)
    yt = torch.tensor(y_tr, dtype=torch.long)

    for ep in range(epochs):
        model.train()
        opt.zero_grad()
        logits = model(Xt)
        loss = loss_fn(logits, yt)
        loss.backward()
        opt.step()
        if ep % 20 == 0:
            print(f"[segment_clf] epoch {ep} loss {loss.item():.4f}")

    model.eval()
    with torch.no_grad():
        te_logits = model(torch.tensor(X_te, dtype=torch.float32))
        pred = te_logits.argmax(dim=1).numpy()

    report = classification_report(y_te, pred, output_dict=True, zero_division=0)
    macro_f1 = float(f1_score(y_te, pred, average="macro", zero_division=0))

    torch.save(
        {
            "state_dict": model.state_dict(),
            "in_dim": in_dim,
            "num_classes": num_classes,
            "scaler_mean": scaler.mean_.tolist(),
            "scaler_scale": scaler.scale_.tolist(),
        },
        MODELS / "segment_clf.pt",
    )

    metrics = {
        "macroF1": macro_f1,
        "perClass": {
            str(k): {
                "precision": float(v["precision"]),
                "recall": float(v["recall"]),
                "f1": float(v["f1-score"]),
            }
            for k, v in report.items()
            if k.isdigit()
        },
    }
    (DATA / "segment_classifier_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"[segment_clf] saved {MODELS / 'segment_clf.pt'}")


if __name__ == "__main__":
    main()
