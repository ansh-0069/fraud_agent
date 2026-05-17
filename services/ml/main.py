"""
NexusWallet ML sidecar.

Three real ML services:
  - FDT (LSTM + Monte Carlo) — PyTorch
  - Guardian (Isolation Forest + SHAP) — scikit-learn + SHAP
  - RL Coach (PPO-style policy) — torch (small custom PPO inference)

The Next.js app calls /fdt/simulate, /coach/recommend, /guardian/score.
Each returns the same JSON schema as the TS fallback in apps/web/lib so the
demo never breaks if this service is down.

Run:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from fdt import FDTEngine
from guardian import GuardianEngine
from coach import CoachEngine

ROOT = Path(__file__).parent
REPO_ROOT = ROOT.parent.parent
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="NexusWallet ML Sidecar", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------------
# Engine singletons (warm at startup so first request is fast)
# ----------------------------------------------------------------------------
print("[ml] booting NexusWallet ML sidecar…")
t0 = time.time()
fdt = FDTEngine(models_dir=MODELS_DIR)
guardian = GuardianEngine(models_dir=MODELS_DIR)
coach = CoachEngine(models_dir=MODELS_DIR)
print(f"[ml] ready in {time.time() - t0:.2f}s")


# ----------------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------------
class Obligation(BaseModel):
    label: str
    amount: float
    daysOut: int


class WhatIfParams(BaseModel):
    daysOff: Optional[int] = 0
    commissionCutPct: Optional[float] = 0
    oneTimeExpense: Optional[float] = 0
    seasonBreakWeeks: Optional[int] = 0
    paths: Optional[int] = 1000
    horizonWeeks: Optional[int] = 12


class FDTRequest(BaseModel):
    persona_id: str
    segment_id: str
    cash_balance: float
    weekly_income: List[float]
    obligation: Obligation
    params: WhatIfParams = Field(default_factory=WhatIfParams)


class FDTSnapshot(BaseModel):
    cashBalance: float
    projectedWeeklyIncome: float
    obligation: Obligation
    emergencyRunwayDays: int
    fdtConfidence: float


class CoachRequest(BaseModel):
    persona_id: str
    intent: str
    fdt: FDTSnapshot


class TxFeatures(BaseModel):
    hour: int
    isNewDevice: bool
    velocityScore: float
    amountZ: float
    geoDeltaKm: float
    weekend: bool


class TxModel(BaseModel):
    id: str
    ts: float
    merchant: str
    category: str
    amount: float
    channel: str
    device: str
    city: str
    countryCode: str
    features: TxFeatures
    isFraud: Optional[bool] = False


class GuardianRequest(BaseModel):
    persona_id: str
    transactions: List[TxModel]


# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------
@app.get("/health")
def health():
    return {
        "ok": True,
        "version": "0.1.0",
        "engines": {
            "fdt": fdt.info(),
            "guardian": guardian.info(),
            "coach": coach.info(),
        },
    }


@app.post("/fdt/simulate")
def fdt_simulate(req: FDTRequest):
    started = time.time()
    res = fdt.simulate(
        weekly_income=req.weekly_income,
        cash_balance=req.cash_balance,
        obligation=req.obligation.model_dump(),
        segment_id=req.segment_id,
        params=req.params.model_dump(),
    )
    res["runtimeMs"] = int((time.time() - started) * 1000)
    res["source"] = "python"
    return res


@app.post("/coach/recommend")
def coach_recommend(req: CoachRequest):
    started = time.time()
    out = coach.recommend(
        intent=req.intent,
        fdt=req.fdt.model_dump(),
        persona_id=req.persona_id,
    )
    out["runtimeMs"] = int((time.time() - started) * 1000)
    out["source"] = "python"
    return out


@app.get("/population/summary")
def population_summary():
    p = REPO_ROOT / "apps" / "web" / "public" / "data" / "population_summary.json"
    if not p.exists():
        raise HTTPException(status_code=404, detail="population_summary.json not found - run scripts/train_all.py")
    return json.loads(p.read_text(encoding="utf-8"))


@app.post("/guardian/score")
def guardian_score(req: GuardianRequest):
    started = time.time()
    scored = guardian.score([tx.model_dump() for tx in req.transactions])
    return {
        "scored": scored,
        "runtimeMs": int((time.time() - started) * 1000),
        "source": "python",
    }
