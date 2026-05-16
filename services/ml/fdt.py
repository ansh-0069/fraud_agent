"""
Financial Digital Twin — real LSTM-seeded Monte Carlo simulation in PyTorch.

The model architecture is exactly what pdfcrowd.pdf §03 describes:
  "LSTM networks for income time-series modeling → Monte Carlo sampling for
   future state distributions → a lightweight JSON state graph persisted
   per-user in Redis with TTL."

We train a small 32-hidden-unit LSTM on each persona's weekly history at
startup. The LSTM forecasts the next-week income drift, which seeds the
Monte Carlo path generator. Volatility is estimated from history.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim


# ----------------------------------------------------------------------------
# Tiny LSTM for income forecasting
# ----------------------------------------------------------------------------
class IncomeLSTM(nn.Module):
    def __init__(self, hidden_size: int = 32):
        super().__init__()
        self.hidden_size = hidden_size
        self.lstm = nn.LSTM(input_size=1, hidden_size=hidden_size, batch_first=True)
        self.head = nn.Sequential(nn.Linear(hidden_size, 16), nn.ReLU(), nn.Linear(16, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :])


def _train_lstm(history: List[float], epochs: int = 40) -> IncomeLSTM:
    """Train on rolling windows so the model learns short-horizon dynamics."""
    arr = np.asarray(history, dtype=np.float32)
    mean = arr.mean() if arr.mean() > 0 else 1.0
    x = arr / mean  # normalize
    if len(x) < 5:
        # too short — pad
        x = np.concatenate([np.full(5 - len(x), x.mean()), x])
    W = 4  # window length
    xs, ys = [], []
    for i in range(len(x) - W):
        xs.append(x[i:i + W])
        ys.append(x[i + W])
    if not xs:
        xs = [x[:-1]]
        ys = [x[-1]]
    X = torch.tensor(np.array(xs), dtype=torch.float32).unsqueeze(-1)
    Y = torch.tensor(np.array(ys), dtype=torch.float32).unsqueeze(-1)
    model = IncomeLSTM(hidden_size=32)
    opt = optim.Adam(model.parameters(), lr=0.02)
    loss_fn = nn.MSELoss()
    for _ in range(epochs):
        opt.zero_grad()
        pred = model(X)
        loss = loss_fn(pred, Y)
        loss.backward()
        opt.step()
    return model


# ----------------------------------------------------------------------------
# Engine
# ----------------------------------------------------------------------------
class FDTEngine:
    def __init__(self, models_dir: Path):
        self.models_dir = models_dir
        self._cache: Dict[str, IncomeLSTM] = {}
        self._cache_mean: Dict[str, float] = {}

    def info(self) -> Dict[str, Any]:
        return {
            "lstm_hidden": 32,
            "cached_personas": len(self._cache),
            "torch": torch.__version__,
        }

    def _get_lstm(self, key: str, history: List[float]) -> IncomeLSTM:
        if key not in self._cache:
            self._cache[key] = _train_lstm(history)
            self._cache_mean[key] = float(np.mean(history)) or 1.0
        return self._cache[key]

    def _forecast_drift(self, lstm: IncomeLSTM, history: List[float], mean: float) -> float:
        """Return the LSTM's predicted drift factor (multiplicative) for next week."""
        arr = np.asarray(history[-4:], dtype=np.float32) / mean
        if len(arr) < 4:
            arr = np.concatenate([np.full(4 - len(arr), arr.mean()), arr])
        x = torch.tensor(arr, dtype=torch.float32).reshape(1, 4, 1)
        with torch.no_grad():
            pred = float(lstm(x).item())
        # drift = (next-week prediction) / (last-week observed)
        last_obs = float(arr[-1])
        if last_obs < 1e-6:
            return 1.0
        return float(np.clip(pred / last_obs, 0.6, 1.4))

    def simulate(
        self,
        weekly_income: List[float],
        cash_balance: float,
        obligation: Dict[str, Any],
        segment_id: str,
        params: Dict[str, Any],
    ) -> Dict[str, Any]:
        mean = float(np.mean(weekly_income)) or 1.0
        sigma = float(np.std(weekly_income))
        sigma_pct = float(min(0.65, sigma / max(1.0, mean)))

        # LSTM-derived multiplicative drift
        key = f"{segment_id}|{len(weekly_income)}|{int(mean)}"
        lstm = self._get_lstm(key, weekly_income)
        drift = self._forecast_drift(lstm, weekly_income, mean)

        # Params
        N = int(np.clip(params.get("paths") or 1000, 100, 10000))
        horizon = int(params.get("horizonWeeks") or 12)
        days_off = int(np.clip(params.get("daysOff") or 0, 0, 7))
        comm_cut = float(np.clip((params.get("commissionCutPct") or 0) / 100.0, 0, 0.5))
        one_time = float(max(0, params.get("oneTimeExpense") or 0))
        season_break = int(np.clip(params.get("seasonBreakWeeks") or 0, 0, 6))

        base = float(np.mean(weekly_income[-4:])) if len(weekly_income) >= 4 else mean
        weekly_expense = mean * 0.5

        rng = np.random.default_rng(seed=hash(key) & 0xFFFFFFFF)
        # Vectorized Monte Carlo
        shocks = rng.standard_normal(size=(N, horizon))
        # Per-week multiplicative factor: LSTM drift + lognormal-ish noise
        factors = drift + sigma_pct * shocks * 0.8
        factors = np.clip(factors, 0.05, 3.0)

        incomes = base * factors * (1.0 - comm_cut)
        # First-week reductions
        if days_off > 0:
            incomes[:, 0] *= 1 - days_off / 7.0
        # Season-break weeks
        for wk in range(season_break):
            incomes[:, wk] *= 0.15

        expenses = weekly_expense * (0.85 + 0.3 * rng.random(size=(N, horizon)))
        expenses[:, 0] += one_time

        # Cumulative cash
        cash = np.zeros((N, horizon + 1))
        cash[:, 0] = cash_balance
        flow = incomes - expenses
        for t in range(1, horizon + 1):
            cash[:, t] = cash[:, t - 1] + flow[:, t - 1]

        # Obligation hit
        oblig_week = max(1, min(horizon, round(obligation["daysOut"] / 7)))
        # Capture cash JUST BEFORE the obligation hits so we can compute
        # whether each path can cover it.
        cash_just_before = cash[:, oblig_week].copy()
        cash[:, oblig_week:] -= obligation["amount"]

        # Percentile series
        p10 = np.percentile(cash, 10, axis=0)
        p25 = np.percentile(cash, 25, axis=0)
        p50 = np.percentile(cash, 50, axis=0)
        p75 = np.percentile(cash, 75, axis=0)
        p90 = np.percentile(cash, 90, axis=0)
        mean_series = cash.mean(axis=0)

        # "Shortfall" semantics match the demo narrative in pdfcrowd.pdf §07:
        # any path where cash before the obligation can't cover it, OR ends
        # negative at the horizon.
        obligation_gap = np.maximum(0, obligation["amount"] - cash_just_before)
        ends_negative = cash[:, -1] < 0
        failing = (obligation_gap > 0) | ends_negative
        shortfall_count = int(np.sum(failing))
        shortfall_prob = shortfall_count / N
        if shortfall_count > 0:
            expected_shortfall = float(
                np.mean(
                    np.where(obligation_gap > 0, obligation_gap, -cash[:, -1])[failing]
                )
            )
        else:
            expected_shortfall = 0.0

        # Shock survival: first week where p50 drops below 0
        shock_day = horizon * 7
        for t in range(1, len(p50)):
            if p50[t] < 0:
                shock_day = t * 7
                break

        # Cash distribution at obligation week
        obl_dist = cash[:, oblig_week]
        cash_p50 = float(np.percentile(obl_dist, 50))
        cash_p80 = float(np.percentile(obl_dist, 20))  # P20 → bad case (=P80 in PDF)

        # Sample paths for the frontend fan chart
        sample_idx = rng.choice(N, size=min(40, N), replace=False)
        sample_paths = cash[sample_idx].tolist()

        return {
            "weeks": list(range(horizon + 1)),
            "mean": mean_series.tolist(),
            "p10": p10.tolist(),
            "p25": p25.tolist(),
            "p50": p50.tolist(),
            "p75": p75.tolist(),
            "p90": p90.tolist(),
            "samplePaths": sample_paths,
            "shortfallProb": shortfall_prob,
            "expectedShortfall": expected_shortfall,
            "shockSurvivalDays": int(shock_day),
            "obligationDay": oblig_week,
            "cashAtObligation": {"p50": cash_p50, "p80": cash_p80},
            "pathsRun": N,
            "lstmDrift": drift,
        }
