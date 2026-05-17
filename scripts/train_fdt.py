"""
Pre-train global IncomeLSTM on all synthetic weekly income series.

Saves:
  services/ml/models/fdt_lstm.pt
  services/ml/models/fdt_training_curve.json  — { "train": [...], "val": [...] }
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

ROOT = Path(__file__).resolve().parent.parent
SERVICES_ML = ROOT / "services" / "ml"
sys.path.insert(0, str(SERVICES_ML))

from fdt import IncomeLSTM  # type: ignore

DATA_DIR = ROOT / "data" / "synthetic"
MODELS = SERVICES_ML / "models"
MODELS.mkdir(exist_ok=True)

W = 4  # window length — matches fdt.py inference


def build_windows(series: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """series: (T,) normalized; returns X (n, W, 1), Y (n, 1)"""
    xs, ys = [], []
    T = len(series)
    if T <= W:
        return np.zeros((0, W, 1), dtype=np.float32), np.zeros((0, 1), dtype=np.float32)
    for i in range(T - W):
        xs.append(series[i : i + W])
        ys.append(series[i + W])
    if not xs:
        return np.zeros((0, W, 1), dtype=np.float32), np.zeros((0, 1), dtype=np.float32)
    X = np.array(xs, dtype=np.float32)[:, :, np.newaxis]
    Y = np.array(ys, dtype=np.float32)[:, np.newaxis]
    return X, Y


def main(epochs: int = 60, batch_size: int = 512, seed: int = 0) -> None:
    torch.manual_seed(seed)
    np.random.seed(seed)

    raw = np.load(DATA_DIR / "income_series.npz")["income"]
    n_users = raw.shape[0]
    idx = np.arange(n_users)
    np.random.shuffle(idx)
    n_train = int(0.8 * n_users)
    train_idx, val_idx = idx[:n_train], idx[n_train:]

    def collect_rows(user_indices: np.ndarray):
        X_list, Y_list = [], []
        for ui in user_indices:
            arr = raw[ui].astype(np.float64)
            mean = float(np.mean(arr)) or 1.0
            norm = (arr / mean).astype(np.float32)
            X, Y = build_windows(norm)
            if len(X):
                X_list.append(X)
                Y_list.append(Y)
        if not X_list:
            return None, None
        return np.concatenate(X_list, 0), np.concatenate(Y_list, 0)

    X_tr, Y_tr = collect_rows(train_idx)
    X_va, Y_va = collect_rows(val_idx)
    if X_tr is None:
        raise RuntimeError("No training windows — check dataset")

    X_tr_t = torch.tensor(X_tr, dtype=torch.float32)
    Y_tr_t = torch.tensor(Y_tr, dtype=torch.float32)
    X_va_t = torch.tensor(X_va, dtype=torch.float32)
    Y_va_t = torch.tensor(Y_va, dtype=torch.float32)

    model = IncomeLSTM(hidden_size=32)
    opt = optim.Adam(model.parameters(), lr=0.015)
    loss_fn = nn.MSELoss()

    train_curve: list[float] = []
    val_curve: list[float] = []
    n = X_tr_t.shape[0]

    for ep in range(epochs):
        model.train()
        perm = torch.randperm(n)
        ep_loss = 0.0
        steps = 0
        for start in range(0, n, batch_size):
            sel = perm[start : start + batch_size]
            xb = X_tr_t[sel]
            yb = Y_tr_t[sel]
            opt.zero_grad()
            pred = model(xb)
            loss = loss_fn(pred, yb)
            loss.backward()
            opt.step()
            ep_loss += float(loss.item())
            steps += 1
        train_curve.append(ep_loss / max(steps, 1))

        model.eval()
        with torch.no_grad():
            vloss = float(loss_fn(model(X_va_t), Y_va_t).item())
        val_curve.append(vloss)
        print(f"[fdt] epoch {ep:03d} train_mse {train_curve[-1]:.6f} val_mse {vloss:.6f}")

    out_path = MODELS / "fdt_lstm.pt"
    torch.save(model.state_dict(), out_path)
    curve_path = MODELS / "fdt_training_curve.json"
    curve_path.write_text(json.dumps({"train": train_curve, "val": val_curve}, indent=2))
    print(f"[fdt] saved {out_path}")
    print(f"[fdt] saved {curve_path}")


if __name__ == "__main__":
    main()
