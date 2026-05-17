"""
Run FDT Monte Carlo once per synthetic user; label synthetic "default".

Reads data/synthetic/users.jsonl
Writes data/synthetic/outcomes.jsonl

Default = 1 iff shortfallProb > 0.5 (baseline what-if params).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SERVICES_ML = ROOT / "services" / "ml"
sys.path.insert(0, str(SERVICES_ML))

from fdt import FDTEngine  # type: ignore

DATA = ROOT / "data" / "synthetic"
MODELS = SERVICES_ML / "models"


def main() -> None:
    engine = FDTEngine(models_dir=MODELS)
    out_path = DATA / "outcomes.jsonl"
    rows: list[dict] = []
    with (DATA / "users.jsonl").open(encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))

    params = {"paths": 500, "horizonWeeks": 12, "daysOff": 0, "commissionCutPct": 0, "oneTimeExpense": 0, "seasonBreakWeeks": 0}

    with out_path.open("w", encoding="utf-8") as fout:
        for i, u in enumerate(rows):
            wk = [float(x) for x in u["weeklyIncome"]]
            mean4 = float(np.mean(wk[-4:])) if len(wk) >= 4 else float(np.mean(wk))
            sim = engine.simulate(
                weekly_income=wk,
                cash_balance=float(u["cashBalance"]),
                obligation=u["obligation"],
                segment_id=str(u["segmentId"]),
                params=params,
            )
            sp = float(sim["shortfallProb"])
            record = {
                "id": u["id"],
                "segmentId": u["segmentId"],
                "default": 1 if sp > 0.5 else 0,
                "shortfallProb": sp,
                "shockSurvivalDays": int(sim["shockSurvivalDays"]),
                "expectedShortfall": float(sim["expectedShortfall"]),
                "projectedWeeklyIncome": mean4,
                "emergencyRunwayDays": int(u["emergencyRunwayDays"]),
                "incomeVolatilityIdx": float(u["incomeVolatilityIdx"]),
            }
            fout.write(json.dumps(record) + "\n")
            if i % 2000 == 0:
                print(f"[outcomes] {u['id']} shortfall={sp:.3f} default={record['default']}")

    print(f"[outcomes] wrote {out_path}")


if __name__ == "__main__":
    main()
