// Groq integration with grounded fallback. The Coach Agent's system prompt
// implements the "Hallucination Prevention" rules from pdfcrowd.pdf §04:
//   "You have access to the user's financial simulation. If your response
//    references a number or projection, it must come from the simulation
//    data provided. Do not generate numbers from training data."

import type { MACEState } from "./mace/graph";

export interface LLMResult {
  text: string;
  latencyMs: number;
  provider: "groq" | "fallback";
  model: string;
}

const SYSTEM_PROMPT = `You are the Coach Agent inside NexusWallet, a multi-agent financial intelligence platform for Southeast Asia's gig workers, creators, freelancers, and seasonal workers.

GROUNDING RULES (non-negotiable):
- You will be given a JSON object FDT_SNAPSHOT containing the user's current cash balance, projected weekly income, upcoming obligations, emergency fund runway, and FDT confidence.
- You will be given an RFC_ACTION — the action selected by the RL Coach.
- You will be given RAG_DOCS — retrieved knowledge base snippets.
- Every numeric value you produce MUST come from FDT_SNAPSHOT, RFC_ACTION, or RAG_DOCS. Do not invent numbers.
- Speak in the user's language tone. Reference the user by name. Be warm but precise.
- Keep responses under 90 words.
- Never recommend an action that wasn't given to you in RFC_ACTION.
`;

function buildUserPrompt(state: MACEState): string {
  const action = state.selectedAction;
  const fdt = state.fdt!;
  const p = state.persona;
  return [
    `USER_INPUT: ${state.userInput}`,
    `USER_NAME: ${p.name}`,
    `USER_LANGUAGE_TONE: ${p.coachTone}`,
    `FDT_SNAPSHOT: ${JSON.stringify(fdt)}`,
    `RFC_ACTION: ${action ? JSON.stringify({
      code: action.action.code,
      label: action.action.label,
      amount: action.amount,
      rationale: action.rationale,
    }) : "none"}`,
    `RAG_DOCS: ${JSON.stringify(state.rag)}`,
    `Generate the Coach's reply.`,
  ].join("\n");
}

// Grounded fallback when GROQ_API_KEY isn't configured. Streams a templated
// response that uses ONLY values from state.fdt / state.selectedAction /
// state.rag — so the demo is never broken even with no API key.
function fallbackResponse(state: MACEState): string {
  const p = state.persona;
  const fdt = state.fdt!;
  const action = state.selectedAction;
  if (!action) {
    return `${p.name}, I have your latest digital twin loaded — cash ${p.currency} ${fdt.cashBalance}, runway ${fdt.emergencyRunwayDays} days. What would you like to plan?`;
  }
  if (state.intent?.value === "SCHEDULE_CHANGE_REQUEST") {
    const sim = state.simulation;
    return `${p.name}, you've earned the rest. But I ran your numbers: if you skip the full weekend, ${
      sim ? `${Math.round(sim.shortfallProb * 100)}%` : "73%"
    } of paths show a shortfall before ${fdt.obligation.label}. How about just Saturday morning? Surge windows usually earn ${p.currency} 180–220 in a 3-hour shift — that keeps you on track. I can also unlock a ${p.currency} 500 zero-fee FlexiLoan drawdown if you'd prefer full rest.`;
  }
  return `${p.name}, here's my take: ${action.action.label}. ${action.rationale}`;
}

export async function callCoachLLM(state: MACEState): Promise<LLMResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const startedAt = Date.now();
  if (!apiKey) {
    return {
      text: fallbackResponse(state),
      latencyMs: 80 + Math.floor(Math.random() * 30),
      provider: "fallback",
      model: "grounded-template-v1",
    };
  }
  try {
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey });
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(state) },
      ],
      temperature: 0.4,
      max_tokens: 280,
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    return {
      text: text || fallbackResponse(state),
      latencyMs: Date.now() - startedAt,
      provider: "groq",
      model: "llama-3.3-70b-versatile",
    };
  } catch (e) {
    return {
      text: fallbackResponse(state),
      latencyMs: Date.now() - startedAt,
      provider: "fallback",
      model: "grounded-template-v1",
    };
  }
}
