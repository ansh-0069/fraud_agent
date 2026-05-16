import { NextRequest, NextResponse } from "next/server";
import { getPersona } from "@/lib/personas";
import {
  generateTransactions,
  fraudTransaction,
  type Transaction,
} from "@/lib/mockdata";
import { scoreTransaction } from "@/lib/ml/guardian";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const personaId = body.personaId ?? "ahmad";
  const injectFraud: boolean = Boolean(body.injectFraud);
  const persona = getPersona(personaId);

  let txs: Transaction[] = generateTransactions(persona, 24);
  if (injectFraud) {
    txs = [fraudTransaction(persona), ...txs];
  }

  const startedAt = Date.now();
  // Try real Python sidecar (sklearn IsolationForest)
  try {
    const sidecar = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
    const r = await fetch(`${sidecar}/guardian/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona_id: persona.id,
        transactions: txs,
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (r.ok) {
      const j = await r.json();
      return NextResponse.json({
        ...j,
        source: "python",
        runtimeMs: Date.now() - startedAt,
      });
    }
  } catch {}

  const scored = txs.map((tx) => ({
    tx,
    ...scoreTransaction(tx),
  }));

  return NextResponse.json({
    scored,
    source: "ts-fallback",
    runtimeMs: Date.now() - startedAt,
  });
}
