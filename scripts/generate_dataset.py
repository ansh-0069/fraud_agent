"""
Generate synthetic SEA workforce dataset (N users × 52 weeks).

Outputs:
  data/synthetic/users.jsonl  — one JSON object per line
  data/synthetic/income_series.npz  — array shape (N, 52) float32, same row order as jsonl

The four named exemplars (ahmad, meilin, raj, kadek) match apps/web/lib/personas.ts.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "synthetic"
SEGMENTS = ("gig", "creator", "freelancer", "seasonal")

EXEMPLARS: list[dict] = [
    {
        "id": "ahmad",
        "segmentId": "gig",
        "countryCode": "MY",
        "age": 34,
        "riskTier": "T2",
        "currency": "RM",
        "cashBalance": 312.0,
        "emergencyRunwayDays": 6,
        "fdtConfidence": 0.88,
        "incomeVolatilityIdx": 0.42,
        "obligation": {"label": "Alia's school fees", "amount": 1200.0, "daysOut": 21},
        "weeklyIncome": [
            640, 580, 720, 690, 510, 880, 740, 620, 590, 810, 770, 540, 640, 690,
        ],
    },
    {
        "id": "meilin",
        "segmentId": "creator",
        "countryCode": "SG",
        "age": 27,
        "riskTier": "T2",
        "currency": "S$",
        "cashBalance": 1840.0,
        "emergencyRunwayDays": 11,
        "fdtConfidence": 0.74,
        "incomeVolatilityIdx": 0.71,
        "obligation": {"label": "Q2 quarterly tax", "amount": 4200.0, "daysOut": 34},
        "weeklyIncome": [
            820, 410, 1640, 980, 540, 1280, 2100, 760, 480, 1340, 920, 1820, 660, 890,
        ],
    },
    {
        "id": "raj",
        "segmentId": "freelancer",
        "countryCode": "IN",
        "age": 31,
        "riskTier": "T1",
        "currency": "₹",
        "cashBalance": 48200.0,
        "emergencyRunwayDays": 19,
        "fdtConfidence": 0.79,
        "incomeVolatilityIdx": 0.65,
        "obligation": {"label": "Advance income tax", "amount": 92000.0, "daysOut": 42},
        "weeklyIncome": [
            0, 38000, 84000, 12000, 0, 0, 96000, 64000, 0, 22000, 78000, 110000, 8000, 0,
        ],
    },
    {
        "id": "kadek",
        "segmentId": "seasonal",
        "countryCode": "ID",
        "age": 29,
        "riskTier": "T3",
        "currency": "Rp",
        "cashBalance": 1_650_000.0,
        "emergencyRunwayDays": 9,
        "fdtConfidence": 0.69,
        "incomeVolatilityIdx": 0.83,
        "obligation": {"label": "Off-season household reserve", "amount": 9_000_000.0, "daysOut": 60},
        "weeklyIncome": [
            3_800_000, 4_200_000, 4_900_000, 3_400_000, 2_100_000, 1_800_000,
            1_200_000, 900_000, 1_400_000, 2_800_000, 3_900_000, 4_400_000, 4_100_000, 4_700_000,
        ],
    },
]

COUNTRY_BY_SEGMENT_BIAS = {
    "gig": [("MY", 0.35), ("SG", 0.2), ("ID", 0.25), ("IN", 0.2)],
    "creator": [("SG", 0.35), ("MY", 0.3), ("ID", 0.2), ("IN", 0.15)],
    "freelancer": [("IN", 0.45), ("SG", 0.25), ("MY", 0.2), ("ID", 0.1)],
    "seasonal": [("ID", 0.45), ("MY", 0.3), ("SG", 0.15), ("IN", 0.1)],
}


def _pick_country(rng: np.random.Generator, segment: str) -> str:
    choices, probs = zip(*COUNTRY_BY_SEGMENT_BIAS[segment])
    return str(rng.choice(list(choices), p=list(probs)))


def _currency(cc: str) -> str:
    return {"MY": "RM", "SG": "S$", "IN": "₹", "ID": "Rp"}[cc]


def _scale_for_country(base_weekly: float, cc: str) -> float:
    m = {"MY": 1.0, "SG": 1.15, "IN": 45.0, "ID": 5500.0}
    return float(base_weekly * m[cc])


def _gig_series(rng: np.random.Generator, n: int, base: float) -> np.ndarray:
    """Lognormal-ish AR(1) on log scale + mild week-of-year noise."""
    phi = rng.uniform(0.35, 0.75)
    sig = rng.uniform(0.12, 0.28)
    log_x = np.zeros(n, dtype=np.float64)
    log_x[0] = rng.normal(np.log(max(base, 50)), 0.15)
    for t in range(1, n):
        log_x[t] = phi * log_x[t - 1] + rng.normal((1 - phi) * np.log(max(base, 50)), sig)
        # "weekend" / surge — occasional upside
        if rng.random() < 0.15:
            log_x[t] += rng.uniform(0.08, 0.22)
    return np.maximum(0.0, np.exp(log_x)).astype(np.float32)


def _creator_series(rng: np.random.Generator, n: int, base: float) -> np.ndarray:
    """Steady RPM weeks + brand-deal spikes; royalty lag via shifted impulses."""
    y = rng.lognormal(mean=np.log(max(base * 0.35, 80)), sigma=0.18, size=n).astype(np.float64)
    # sparse large deals
    for _ in range(rng.integers(2, 6)):
        max_lag = min(9, max(3, n - 1))
        lag = int(rng.integers(2, max_lag))
        h_hi = max(1, n - lag)
        h = int(rng.integers(0, h_hi))
        target = min(h + lag, n - 1)
        y[target] += rng.lognormal(np.log(base * rng.uniform(1.5, 4.0)), 0.25)
    return np.maximum(0.0, y).astype(np.float32)


def _freelancer_series(rng: np.random.Generator, n: int, base: float) -> np.ndarray:
    """Bursty invoices — many near-zero weeks, occasional project payments."""
    y = np.zeros(n, dtype=np.float32)
    active_prob = rng.uniform(0.22, 0.45)
    for t in range(n):
        if rng.random() < active_prob:
            y[t] = float(rng.lognormal(np.log(max(base * 3, 500)), 0.45))
        else:
            y[t] = float(rng.uniform(0, max(base * 0.08, 10)))
    return np.clip(y, 0.0, None)


def _seasonal_series(rng: np.random.Generator, n: int, base: float) -> np.ndarray:
    """Sinusoidal annual envelope (peak mid-year) + noise."""
    phase = rng.uniform(0, 2 * np.pi)
    amp = rng.uniform(0.35, 0.85)
    floor = 0.12 + rng.uniform(0, 0.1)
    t = np.arange(n, dtype=np.float64)
    env = floor + (1.0 - floor) * 0.5 * (1.0 + np.cos(2 * np.pi * (t / 52.0) + phase))
    noise = rng.normal(1.0, rng.uniform(0.08, 0.2), size=n)
    core = base * env * np.maximum(0.2, noise)
    return np.maximum(0.0, core).astype(np.float32)


def _extend_to_52(short: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Pad / resample 14 weeks to 52 via repetition with decaying autocorr."""
    if len(short) >= 52:
        return short[:52].astype(np.float32)
    out = np.zeros(52, dtype=np.float32)
    out[: len(short)] = short
    last = float(short[-1])
    vol = float(np.std(short)) or (last * 0.1 + 1.0)
    for t in range(len(short), 52):
        last = float(max(0.0, last + rng.normal(0, vol * 0.35)))
        out[t] = last
    return out


def _synthetic_user(idx: int, rng: np.random.Generator) -> dict:
    segment = str(rng.choice(list(SEGMENTS)))
    cc = _pick_country(rng, segment)
    base = rng.lognormal(mean=np.log(1200), sigma=0.55)
    base = _scale_for_country(base, cc)

    if segment == "gig":
        inc = _gig_series(rng, 52, base)
    elif segment == "creator":
        inc = _creator_series(rng, 52, base)
    elif segment == "freelancer":
        inc = _freelancer_series(rng, 52, base)
    else:
        inc = _seasonal_series(rng, 52, base)

    mean = float(np.mean(inc)) or 1.0
    vol_idx = float(np.clip(np.std(inc) / mean, 0.05, 0.95))
    age = int(rng.integers(22, 56))
    risk_roll = rng.random()
    if vol_idx > 0.65:
        rt = "T3" if risk_roll > 0.35 else "T2"
    elif vol_idx > 0.4:
        rt = "T2"
    else:
        rt = "T1" if risk_roll > 0.25 else "T2"

    cash = float(mean * rng.uniform(0.08, 1.2) * rng.integers(1, 6))
    runway = max(3, int(rng.poisson(8) + vol_idx * 14))
    conf = float(np.clip(rng.normal(0.82 - vol_idx * 0.25, 0.07), 0.45, 0.95))

    obl_amt = float(mean * rng.uniform(2.0, 5.5) * rng.uniform(0.9, 1.4))
    obl_days = int(rng.integers(10, 56))

    uid = f"u{idx:05d}"
    return {
        "id": uid,
        "segmentId": segment,
        "countryCode": cc,
        "age": age,
        "riskTier": rt,
        "currency": _currency(cc),
        "cashBalance": cash,
        "emergencyRunwayDays": runway,
        "fdtConfidence": conf,
        "incomeVolatilityIdx": vol_idx,
        "obligation": {
            "label": "Synthetic obligation",
            "amount": obl_amt,
            "daysOut": obl_days,
        },
        "weeklyIncome": inc.tolist(),
    }


def build_exemplar_record(ex: dict) -> dict:
    weekly = _extend_to_52(np.array(ex["weeklyIncome"], dtype=np.float32), np.random.default_rng(0))
    row = {k: v for k, v in ex.items() if k != "weeklyIncome"}
    row["weeklyIncome"] = weekly.tolist()
    return row


def main(n_random: int = 9996, seed: int = 42) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)

    users: list[dict] = []
    exemplar_rows = [build_exemplar_record(e) for e in EXEMPLARS]
    users.extend(exemplar_rows)

    start_idx = len(users)
    for i in range(n_random):
        users.append(_synthetic_user(start_idx + i, rng))

    jsonl_path = OUT_DIR / "users.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as f:
        for u in users:
            f.write(json.dumps(u, ensure_ascii=False) + "\n")

    mat = np.array([u["weeklyIncome"] for u in users], dtype=np.float32)
    np.savez_compressed(OUT_DIR / "income_series.npz", income=mat)

    print(f"[generate_dataset] wrote {len(users)} users -> {jsonl_path}")
    print(f"[generate_dataset] income shape {mat.shape} -> {OUT_DIR / 'income_series.npz'}")


if __name__ == "__main__":
    main()
