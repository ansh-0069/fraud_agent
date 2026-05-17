"""
Run the full offline ML + data pipeline.

  python scripts/train_all.py

Steps:
  1. generate_dataset.py
  2. train_fdt.py
  3. discover_cohorts.py  (requires umap-learn)
  4. train_segment_classifier.py
  5. simulate_outcomes.py
  6. train_default_risk.py
  7. train_coach.py
  8. train_guardian.py
  9. build_population_summary.py → apps/web/public/data/population_summary.json
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Windows: joblib/loky sometimes fails to probe physical CPU count (WinError 2).
# Setting this silences the warning and avoids flaky core detection.
if os.name == "nt":
    os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 4))

SCRIPTS = [
    "generate_dataset.py",
    "train_fdt.py",
    "discover_cohorts.py",
    "train_segment_classifier.py",
    "simulate_outcomes.py",
    "train_default_risk.py",
    "train_coach.py",
    "train_guardian.py",
    "build_population_summary.py",
]


def main() -> None:
    for name in SCRIPTS:
        path = ROOT / "scripts" / name
        print(f"\n[train_all] === {name} ===\n", flush=True)
        subprocess.check_call([sys.executable, str(path)], cwd=str(ROOT))
    print("\n[train_all] done. Open /population in the web app.\n")


if __name__ == "__main__":
    main()
