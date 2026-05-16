import { NextRequest, NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import { runMonteCarloTS, type WhatIfParams } from "@/lib/ml/monte-carlo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const personaId: string = body.personaId ?? "ahmad";
  const params: WhatIfParams = body.params ?? {};
  const persona = getPersona(personaId);

  // Try the Python sidecar first (real PyTorch LSTM seeded Monte Carlo)
  const sidecar = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
  try {
    const r = await fetch(`${sidecar}/fdt/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona_id: persona.id,
        segment_id: persona.segmentId,
        cash_balance: persona.cashBalance,
        weekly_income: persona.weeklyIncome,
        obligation: persona.obligation,
        params,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (r.ok) {
      const json = await r.json();
      return NextResponse.json({ ...json, source: "python" });
    }
  } catch {
    // fall through to TS fallback
  }
  const result = runMonteCarloTS(persona, params);
  return NextResponse.json(result);
}
