# NexusWallet · ML Sidecar

FastAPI service that hosts the three real ML engines from `pdfcrowd.pdf`:

| Engine | What | File |
|---|---|---|
| FDT | PyTorch LSTM (32 hidden). If `models/fdt_lstm.pt` exists (from `scripts/train_fdt.py`), a **global** pre-trained LSTM is used for all users; otherwise the LSTM trains per persona at startup, then seeds NumPy Monte Carlo | [`fdt.py`](fdt.py) |
| Guardian | `IsolationForest` — loads `models/guardian_iforest.joblib` when present (from `scripts/train_guardian.py`), else fits on 4k synthetic baseline rows + SHAP | [`guardian.py`](guardian.py) |
| Coach | PyTorch policy (`8 → 64 → 64 → 72`), PPO-trained via [`scripts/train_coach.py`](../../scripts/train_coach.py) on **population** FDT state vectors | [`coach.py`](coach.py) |

## Endpoints

| Route | Body | Returns |
|---|---|---|
| `GET  /health` | – | engine info + version |
| `POST /fdt/simulate` | `{ persona_id, segment_id, cash_balance, weekly_income, obligation, params }` | Monte Carlo percentiles, sample paths, shortfall metrics |
| `POST /coach/recommend` | `{ persona_id, intent, fdt }` | Top-3 actions from the trained PPO policy + policy stats + training curve |
| `GET  /population/summary` | – | Pre-merged `population_summary.json` from `scripts/train_all.py` (same payload as `/api/population` in Next) |
| `POST /guardian/score` | `{ persona_id, transactions[] }` | Per-transaction Isolation Forest score + SHAP top-factor decomposition |

## Run

```powershell
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

If Windows shows **`WinError 10013`** or **port in use**, something else is already on 8000 (often a previous `uvicorn`). Run `netstat -ano | findstr :8000`, stop that PID, or use e.g. `--port 8001`.

## Full population pipeline (optional)

From repo root:

```powershell
pip install -r services/ml/requirements.txt
python scripts/train_all.py
```

Generates `data/synthetic/*`, all `models/*` weights, and `apps/web/public/data/population_summary.json`.

## Train the PPO Coach only

```powershell
# From the repo root
python scripts/train_coach.py
```

Trains for 50 epochs over a custom `FinancialCoachEnv` whose states are sampled from `data/synthetic/users.jsonl`, and writes:

- `models/ppo_coach.pt` — policy + value head weights
- `models/training_curve.json` — mean reward per epoch (shown on `/coach`)

Restart the sidecar after training so it picks up the new weights.

## Fallback behavior

If this sidecar is offline, the Next.js app gracefully falls back to TS
implementations of the same algorithms (real Monte Carlo, heuristic
Isolation Forest, intent-priored coach). The top status bar shows whether
the real Python pipeline or the TS fallback is in use.
