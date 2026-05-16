# NexusWallet · ML Sidecar

FastAPI service that hosts the three real ML engines from `pdfcrowd.pdf`:

| Engine | What | File |
|---|---|---|
| FDT | Tiny PyTorch LSTM (32 hidden) trained at startup on each persona's weekly history, used to seed a vectorized NumPy Monte Carlo over 100–10,000 paths | [`fdt.py`](fdt.py) |
| Guardian | `sklearn.ensemble.IsolationForest(n=120)` fit on 4,000 rows of synthetic baseline transactions + real `shap.Explainer` attribution | [`guardian.py`](guardian.py) |
| Coach | PyTorch policy network (`8 → 64 → 64 → 72-action head`), trained with a small PPO loop from [`scripts/train_coach.py`](../../scripts/train_coach.py) | [`coach.py`](coach.py) |

## Endpoints

| Route | Body | Returns |
|---|---|---|
| `GET  /health` | – | engine info + version |
| `POST /fdt/simulate` | `{ persona_id, segment_id, cash_balance, weekly_income, obligation, params }` | Monte Carlo percentiles, sample paths, shortfall metrics |
| `POST /coach/recommend` | `{ persona_id, intent, fdt }` | Top-3 actions from the trained PPO policy + policy stats + training curve |
| `POST /guardian/score` | `{ persona_id, transactions[] }` | Per-transaction Isolation Forest score + SHAP top-factor decomposition |

## Run

```powershell
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

## Train the PPO Coach

```powershell
# From the repo root
python scripts/train_coach.py
```

Trains for 50 epochs over a custom `FinancialCoachEnv` and writes:

- `models/ppo_coach.pt` — policy + value head weights
- `models/training_curve.json` — mean reward per epoch (shown on `/coach`)

Restart the sidecar after training so it picks up the new weights.

## Fallback behavior

If this sidecar is offline, the Next.js app gracefully falls back to TS
implementations of the same algorithms (real Monte Carlo, heuristic
Isolation Forest, intent-priored coach). The top status bar shows whether
the real Python pipeline or the TS fallback is in use.
