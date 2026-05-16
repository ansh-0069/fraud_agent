import { NextResponse } from "next/server";

export async function GET() {
  let mlOk = false;
  let mlVersion: string | null = null;
  try {
    const r = await fetch(`${process.env.ML_SERVICE_URL || "http://127.0.0.1:8000"}/health`, {
      signal: AbortSignal.timeout(800),
    });
    if (r.ok) {
      const j = await r.json();
      mlOk = true;
      mlVersion = j.version ?? null;
    }
  } catch {
    mlOk = false;
  }
  return NextResponse.json({
    ok: true,
    mlOk,
    mlVersion,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
  });
}
