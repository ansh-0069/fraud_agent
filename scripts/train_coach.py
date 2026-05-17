"""
Offline trainer for the NexusWallet RL Coach.

Samples FDT state vectors from data/synthetic/users.jsonl (population training).
Saves weights to services/ml/models/ppo_coach.pt and training_curve.json.

Usage:
    python scripts/generate_dataset.py   # if not already
    python scripts/train_coach.py
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path
from typing import Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

ROOT = Path(__file__).resolve().parent.parent
SERVICES_ML = ROOT / "services" / "ml"
sys.path.insert(0, str(SERVICES_ML))

from coach import ACTION_CODES, NUM_ACTIONS, STATE_DIM, PolicyNet  # type: ignore

MODELS = SERVICES_ML / "models"
MODELS.mkdir(exist_ok=True)

DATA_USERS = ROOT / "data" / "synthetic" / "users.jsonl"


def load_population_states(path: Path) -> list[np.ndarray]:
    """Same normalization as coach._state_vector (services/ml/coach.py)."""
    states: list[np.ndarray] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            u = json.loads(line)
            wk = u["weeklyIncome"]
            mean4 = float(np.mean(wk[-4:])) if len(wk) >= 4 else float(np.mean(wk))
            obl = u["obligation"]
            s = np.array(
                [
                    float(u["cashBalance"]) / 5000.0,
                    mean4 / 2000.0,
                    float(obl["amount"]) / 5000.0,
                    float(obl["daysOut"]) / 60.0,
                    float(u["emergencyRunwayDays"]) / 30.0,
                    float(u["fdtConfidence"]),
                    1.0,
                    0.0,
                ],
                dtype=np.float32,
            )
            states.append(s)
    if not states:
        raise RuntimeError(f"No users in {path} — run scripts/generate_dataset.py")
    return states


class FinancialCoachEnv:
    def __init__(self, states_pool: list[np.ndarray], seed: int = 0):
        self.rng = np.random.default_rng(seed)
        self.pool = states_pool
        self.t = 0
        self.state = self.reset()

    def reset(self) -> np.ndarray:
        self.t = 0
        return self._random_state()

    def _random_state(self) -> np.ndarray:
        idx = int(self.rng.integers(0, len(self.pool)))
        return self.pool[idx].copy()

    def step(self, action_idx: int) -> Tuple[np.ndarray, float, bool]:
        s = self.state
        code = ACTION_CODES[action_idx]
        runway = s[4]
        obl_days = s[3]
        cash = s[0]
        reward = 0.0
        if runway < 0.3:
            if code.startswith("SAVINGS_") or code.startswith("INCOME_"):
                reward += 0.6
            if code.startswith("WELLNESS_") or code.startswith("EDUCATION_"):
                reward -= 0.1
        if obl_days < 0.3:
            if code.startswith("LOAN_") or code == "INCOME_TARGET_SURGE_WINDOW":
                reward += 0.5
            if "BIG_TICKET_DELAY" in code:
                reward += 0.1
        if cash > 0.6 and runway > 0.5 and code.startswith("INSURANCE_"):
            reward += 0.3
        if code.startswith("WELLNESS_") and runway > 0.5:
            reward += 0.2
        reward += float(self.rng.normal(0, 0.05))
        self.t += 1
        done = self.t >= 8
        self.state = self._random_state()
        return self.state, float(reward), done


def train(epochs: int = 50, batch_size: int = 256, lr: float = 3e-3) -> None:
    pool = load_population_states(DATA_USERS)
    net = PolicyNet()
    opt = optim.Adam(net.parameters(), lr=lr)

    env = FinancialCoachEnv(states_pool=pool, seed=0)
    curve = []
    gamma = 0.97
    clip = 0.2

    for ep in range(epochs):
        states, actions, log_probs_old, returns = [], [], [], []
        ep_rewards = []
        for _ in range(batch_size // 8):
            s = env.reset()
            traj_states, traj_actions, traj_logp, traj_r = [], [], [], []
            done = False
            while not done:
                st = torch.tensor(s, dtype=torch.float32).unsqueeze(0)
                with torch.no_grad():
                    logits, _ = net(st)
                    probs = torch.softmax(logits, dim=-1).squeeze(0)
                a = int(torch.multinomial(probs, 1).item())
                logp = float(torch.log(probs[a] + 1e-9).item())
                ns, r, done = env.step(a)
                traj_states.append(s)
                traj_actions.append(a)
                traj_logp.append(logp)
                traj_r.append(r)
                s = ns
            R = 0.0
            traj_returns = []
            for r in reversed(traj_r):
                R = r + gamma * R
                traj_returns.insert(0, R)
            states.extend(traj_states)
            actions.extend(traj_actions)
            log_probs_old.extend(traj_logp)
            returns.extend(traj_returns)
            ep_rewards.append(sum(traj_r))

        S = torch.tensor(np.array(states), dtype=torch.float32)
        A = torch.tensor(actions, dtype=torch.long)
        LP = torch.tensor(log_probs_old, dtype=torch.float32)
        R = torch.tensor(returns, dtype=torch.float32)
        R_n = (R - R.mean()) / (R.std() + 1e-6)

        for _ in range(4):
            logits, value = net(S)
            probs = torch.softmax(logits, dim=-1)
            taken = probs.gather(1, A.unsqueeze(1)).squeeze(1)
            logp = torch.log(taken + 1e-9)
            ratio = torch.exp(logp - LP)
            adv = R_n - value.squeeze(1).detach()
            obj1 = ratio * adv
            obj2 = torch.clamp(ratio, 1 - clip, 1 + clip) * adv
            policy_loss = -torch.min(obj1, obj2).mean()
            value_loss = ((R - value.squeeze(1)) ** 2).mean()
            entropy = -(probs * torch.log(probs + 1e-9)).sum(-1).mean()
            loss = policy_loss + 0.5 * value_loss - 0.01 * entropy
            opt.zero_grad()
            loss.backward()
            opt.step()

        mean_r = float(np.mean(ep_rewards))
        curve.append(mean_r)
        print(f"[ppo] epoch {ep:02d}  mean_reward {mean_r:+.3f}  loss {loss.item():+.3f}")

    weights_path = MODELS / "ppo_coach.pt"
    torch.save(net.state_dict(), weights_path)
    (MODELS / "training_curve.json").write_text(json.dumps(curve, indent=2))
    print(f"[ppo] saved weights to {weights_path}")
    print(f"[ppo] saved curve to {MODELS / 'training_curve.json'}")


if __name__ == "__main__":
    torch.manual_seed(0)
    np.random.seed(0)
    random.seed(0)
    train()
