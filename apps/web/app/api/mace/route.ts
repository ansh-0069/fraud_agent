import { NextRequest, NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import {
  newSession,
  orchestratorNode,
  fdtSnapshotNode,
  ragNode,
  rfcNode,
  auditFinalize,
  type RecommendationCandidate,
} from "@/lib/mace/graph";
import { ACTIONS } from "@/lib/actions";
import { runMonteCarloTS } from "@/lib/ml/monte-carlo";
import { callCoachLLM } from "@/lib/llm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const personaId: string = body.personaId ?? "ahmad";
  const input: string = body.input ?? "";
  const persona = getPersona(personaId);

  let state = newSession(persona, input);
  state = orchestratorNode(state);
  state = fdtSnapshotNode(state);

  // Quick sim used for the "73% of paths show shortfall" line for SCHEDULE_CHANGE
  const sim = runMonteCarloTS(persona, {
    daysOff: state.intent?.value === "SCHEDULE_CHANGE_REQUEST" ? 2 : 0,
    paths: 1000,
  });
  state.simulation = {
    paths: sim.pathsRun,
    p50Gap: Math.round(Math.max(0, persona.obligation.amount - sim.cashAtObligation.p50)),
    p80Gap: Math.round(Math.max(0, persona.obligation.amount - sim.cashAtObligation.p80)),
    shortfallProb: sim.shortfallProb,
  };
  state.log.push(
    `[ANALYST] Running FDT simulation: "${
      state.intent?.value === "SCHEDULE_CHANGE_REQUEST"
        ? "Remove Fri-Sun income from trajectory..."
        : "Probe near-term cash trajectory..."
    }"`
  );
  state.log.push(`[SIMULATION] ${sim.pathsRun} Monte Carlo paths sampled:`);
  state.log.push(
    `- P50 scenario: gap = ${persona.currency} ${state.simulation.p50Gap}`
  );
  state.log.push(
    `- P80 scenario: gap = ${persona.currency} ${state.simulation.p80Gap}`
  );
  state.log.push(
    `- WARNING: ${(state.simulation.shortfallProb * 100).toFixed(
      0
    )}% of simulated paths show shortfall.`
  );

  // Try Python sidecar for PPO action selection
  let candidates: RecommendationCandidate[] | undefined;
  try {
    const sidecar = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
    const r = await fetch(`${sidecar}/coach/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona_id: persona.id,
        intent: state.intent?.value,
        fdt: state.fdt,
        sim: state.simulation,
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (r.ok) {
      const j = await r.json();
      candidates = (j.candidates ?? []).map((c: any) => {
        const action =
          ACTIONS.find((a) => a.code === c.code) ?? ACTIONS[0];
        return {
          action,
          expectedReward: c.reward,
          amount: c.amount,
          rationale: c.rationale,
        };
      });
    }
  } catch {}

  state = rfcNode(state, candidates);
  state = ragNode(state);

  // LLM call (Groq or grounded fallback)
  const llm = await callCoachLLM(state);
  state = auditFinalize(state, llm.text, llm.latencyMs);

  return NextResponse.json({
    state,
    llm: { provider: llm.provider, model: llm.model, latencyMs: llm.latencyMs },
  });
}
