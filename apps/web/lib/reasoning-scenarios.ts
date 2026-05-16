// Per-persona reasoning scenarios.
//
// Ahmad's scenario is the canonical 8-step trace from pdfcrowd.pdf §07
// (verbatim — same numbers, same actions, same SHAP weights). The other
// three personas get equivalent 8-step scenarios that exercise the same
// MACE pipeline but use their own segment-appropriate inputs (creator
// platform delay, freelancer dry spell, seasonal income cliff) and their
// own currency / language / obligations.

import type { Persona } from "./personas";
import { formatCurrency } from "./utils";

export interface Step {
  num: number;
  title: string;
  agent: string;
  badge: string;
  artifact:
    | "intent"
    | "fdt"
    | "sim"
    | "rfc"
    | "rag"
    | "llm"
    | "shap"
    | "audit";
  lines: string[];
}

export interface ScenarioMeta {
  sessionId: string;
  userInput: string;
  intent: string;
  intentConfidence: number;
  routing: string;
  // Step 3 — simulation summary
  sim: { paths: number; p50Gap: number; p80Gap: number; shortfallProbPct: number };
  // Step 4 — RFC top-3 (reward, label)
  rfc: Array<{ code: string; reward: number; note: string }>;
  // Step 5 — RAG docs
  rag: Array<{ source: string; snippet: string }>;
  // Step 6 — LLM response (grounded, will be played back letter-by-letter)
  llmResponse: string;
  llmLatencyMs: number;
  // Step 7 — SHAP attribution (already normalized to sum ~ 1.0)
  shap: Array<{ feature: string; weight: number }>;
  // Audit
  auditAction: string;
  // Misc display strings
  query: string;
}

export interface PersonaScenario {
  meta: ScenarioMeta;
  steps: Step[];
}

const cur = (p: Persona, n: number) => formatCurrency(n, p.currency);

function build(p: Persona, m: ScenarioMeta): PersonaScenario {
  const projectedIncome = Math.round(
    p.weeklyIncome.slice(-3).reduce((a, b) => a + b, 0) / 3
  );
  const steps: Step[] = [
    {
      num: 1,
      title: "Intent Classification",
      agent: "ORCHESTRATOR",
      badge: "STEP 1",
      artifact: "intent",
      lines: [
        `[ORCHESTRATOR] User input: "${m.userInput}"`,
        `[ORCHESTRATOR] Intent classified: ${m.intent} (confidence: ${m.intentConfidence.toFixed(2)})`,
        `[ORCHESTRATOR] Routing to: ${m.routing} (parallel)`,
      ],
    },
    {
      num: 2,
      title: "FDT Snapshot Load",
      agent: "ANALYST",
      badge: "STEP 2",
      artifact: "fdt",
      lines: [
        `[ANALYST] Loading FDT state for user_id: ${m.sessionId} from Redis cache...`,
        `[FDT] Current financial state:`,
        `- Cash balance: ${cur(p, p.cashBalance)}`,
        `- Projected weekly income: ${cur(p, projectedIncome)} (${p.segmentLabel.toLowerCase()} pattern detected)`,
        `- Upcoming obligation: ${p.obligation.label} ${cur(p, p.obligation.amount)} due in ${p.obligation.daysOut} days`,
        `- Emergency fund runway: ${p.emergencyRunwayDays} days`,
        `- FDT confidence: ${p.fdtConfidence.toFixed(2)} (based on ${p.weeklyIncome.length} weeks of history)`,
      ],
    },
    {
      num: 3,
      title: "Simulation · Scenario Run",
      agent: "ANALYST",
      badge: "STEP 3",
      artifact: "sim",
      lines: [
        `[ANALYST] Running FDT simulation: "${m.query}"`,
        `[SIMULATION] ${m.sim.paths.toLocaleString()} Monte Carlo paths sampled:`,
        `- P50 scenario: ${p.obligation.label} gap = ${cur(p, m.sim.p50Gap)} by deadline`,
        `- P80 scenario: ${p.obligation.label} gap = ${cur(p, m.sim.p80Gap)} (worst-case)`,
        `- WARNING: ${m.sim.shortfallProbPct}% of simulated paths show shortfall. ${
          m.sim.shortfallProbPct >= 70
            ? "High financial risk."
            : m.sim.shortfallProbPct >= 40
            ? "Moderate financial risk."
            : "Low financial risk — but proactive intervention worth it."
        }`,
      ],
    },
    {
      num: 4,
      title: "RL Coach Action Selection",
      agent: "RFC · PPO",
      badge: "STEP 4",
      artifact: "rfc",
      lines: [
        `[RFC · PPO Agent] State vector constructed from FDT snapshot...`,
        `[RFC] Evaluating action space (72 possible interventions)...`,
        `[RFC] Top 3 actions by expected reward:`,
        ...m.rfc.map(
          (a, i) => `${i + 1}. ${a.code}${a.note ? ` (${a.note})` : ""} → reward: ${a.reward.toFixed(2)}`
        ),
        `[RFC] Selected: ACTION_1 (highest reward, lowest friction)`,
      ],
    },
    {
      num: 5,
      title: "RAG Retrieval for Contextual Support",
      agent: "COACH",
      badge: "STEP 5",
      artifact: "rag",
      lines: [
        `[COACH] Querying Qdrant: "${m.query}"...`,
        `[RAG] Retrieved: ${m.rag.length} relevant documents`,
        ...m.rag.map((d) => `- ${d.source}: ${d.snippet}`),
      ],
    },
    {
      num: 6,
      title: `Response Generation (Groq LLaMA 3.3, ${m.llmLatencyMs}ms)`,
      agent: "COACH",
      badge: "STEP 6",
      artifact: "llm",
      lines: [
        `[COACH] Grounding prompt with: FDT snapshot + RFC action + RAG docs...`,
        `[RESPONSE DRAFT] "${m.llmResponse}"`,
      ],
    },
    {
      num: 7,
      title: "SHAP Explanation Attached",
      agent: "EXPLAINABILITY",
      badge: "STEP 7",
      artifact: "shap",
      lines: [
        `[EXPLAINABILITY] Top factors for this recommendation:`,
        ...m.shap.map(
          (s) =>
            `- ${s.feature}: ${(s.weight * 100).toFixed(0)}% weight`
        ),
      ],
    },
    {
      num: 8,
      title: "Audit Trail Written",
      agent: "AUDIT",
      badge: "STEP 8",
      artifact: "audit",
      lines: [
        `[AUDIT] Writing to PostgreSQL audit_log table...`,
        `[AUDIT] session_id, timestamp, fdt_snapshot_hash, rl_action_id, llm_prompt_hash, response_hash → COMMITTED`,
        `# Full audit trail for MAS FEAT regulatory compliance`,
      ],
    },
  ];
  return { meta: m, steps };
}

const META_BY_PERSONA: Record<string, ScenarioMeta> = {
  ahmad: {
    sessionId: "A8821",
    userInput: "I want to take this weekend off.",
    intent: "SCHEDULE_CHANGE_REQUEST",
    intentConfidence: 0.94,
    routing: "ANALYST_AGENT + COACH_AGENT",
    query: "Remove Fri-Sun income from trajectory...",
    sim: { paths: 1000, p50Gap: 408, p80Gap: 612, shortfallProbPct: 73 },
    rfc: [
      { code: "INCOME_TARGET_SURGE_WINDOW", reward: 0.74, note: "Sat AM only" },
      { code: "LOAN_SUGGEST_ADVANCE_FROM_FLEXILOAN", reward: 0.61, note: "RM 500 zero-fee" },
      { code: "SAVINGS_BOOST_NOW", reward: 0.58, note: "+7% auto-save" },
    ],
    rag: [
      {
        source: "GXS FlexiLoan",
        snippet: "zero-fee drawdown available, RM 500 in Ahmad's pre-approved limit",
      },
      {
        source: "Malaysia School Fee Assistance",
        snippet: "BKAP application deadline 30 days out",
      },
    ],
    llmResponse:
      "Ahmad, you've earned it — and a break is important. But I ran your numbers: if you skip the full weekend, there's a 73% chance of a shortfall before Alia's school fees. How about just Saturday morning? Grab's data shows surge pricing hits at 7–10am — that 3-hour window usually earns RM 180–220. That keeps you on track. I can also unlock a RM 500 zero-fee FlexiLoan drawdown as a safety net if you'd prefer full rest this weekend.",
    llmLatencyMs: 87,
    shap: [
      { feature: "School fees deadline proximity", weight: 0.38 },
      { feature: "Weekend surge hour pattern", weight: 0.29 },
      { feature: "Emergency fund low level", weight: 0.21 },
      { feature: "FlexiLoan pre-approval status", weight: 0.12 },
    ],
    auditAction: "INCOME_TARGET_SURGE_WINDOW",
  },

  meilin: {
    sessionId: "M4093",
    userInput: "My TikTok payout is delayed 60 days. What should I do?",
    intent: "WHAT_IF_QUESTION",
    intentConfidence: 0.91,
    routing: "ANALYST_AGENT + COACH_AGENT",
    query: "Defer largest creator-payout stream by 60 days...",
    sim: {
      paths: 1000,
      p50Gap: 1840,
      p80Gap: 3120,
      shortfallProbPct: 64,
    },
    rfc: [
      {
        code: "INCOME_DIVERSIFY_PLATFORM",
        reward: 0.68,
        note: "Shopee + YouTube",
      },
      {
        code: "LOAN_SUGGEST_ADVANCE_FROM_FLEXILOAN",
        reward: 0.62,
        note: "S$ 2,000 bridge",
      },
      { code: "TAX_CROSS_BORDER_DTAA", reward: 0.49, note: "delay tax reserve" },
    ],
    rag: [
      {
        source: "GXS FlexiLoan",
        snippet:
          "creator income-stream verification supported, S$ 2,000 in pre-approved limit",
      },
      {
        source: "TikTok Creator Fund · SG payout terms",
        snippet:
          "Q2 brand deals booked = S$ 4,200; payout schedule confirmed for July",
      },
    ],
    llmResponse:
      "Mei Lin, breathe — I see this. The 60-day TikTok delay puts you 64% likely to fall short on Q2 quarterly tax. Two moves: route this week's brand-deal payout (S$ 4,200 booked) directly to your tax reserve, and tap a S$ 2,000 zero-fee FlexiLoan bridge that auto-repays from the TikTok payout in July. You stay on track without selling gear or pausing content.",
    llmLatencyMs: 92,
    shap: [
      { feature: "Quarterly tax deadline proximity", weight: 0.36 },
      { feature: "Multi-platform income concentration", weight: 0.28 },
      { feature: "Brand-deal pipeline coverage", weight: 0.22 },
      { feature: "FlexiLoan pre-approval status", weight: 0.14 },
    ],
    auditAction: "INCOME_DIVERSIFY_PLATFORM",
  },

  raj: {
    sessionId: "R7714",
    userInput: "My next project doesn't start for 6 weeks. Will I be okay?",
    intent: "WHAT_IF_QUESTION",
    intentConfidence: 0.88,
    routing: "ANALYST_AGENT + COACH_AGENT",
    query: "Extend dry-spell to 6 weeks before next project income...",
    sim: {
      paths: 1000,
      p50Gap: 38000,
      p80Gap: 71000,
      shortfallProbPct: 52,
    },
    rfc: [
      {
        code: "INCOME_INVOICE_FOLLOWUP",
        reward: 0.71,
        note: "USD 2.4k overdue",
      },
      {
        code: "TAX_ADVANCE_TAX_REMIND",
        reward: 0.6,
        note: "park reserve early",
      },
      {
        code: "SAVINGS_BIG_GOAL_REVIEW",
        reward: 0.54,
        note: "delay big-ticket",
      },
    ],
    rag: [
      {
        source: "Open Banking · Raj's invoice ledger",
        snippet:
          "2 invoices overdue >30 days, total ₹ 196,000 — collection probability 0.82",
      },
      {
        source: "GXS Business · India advance-tax",
        snippet:
          "Q1 advance-tax instalment due in 42 days · 15% of expected annual liability",
      },
    ],
    llmResponse:
      "Raj, 6-week gaps are not new for you — but this one collides with advance-tax. The model says 52% chance of trouble unless we act. First: chase the two overdue invoices (₹ 196,000, 82% collectable). Second: I'll park ₹ 18,000/week into a tax reserve so you're not scrambling on day 42. Hold the laptop upgrade for one more cycle. Two of these three and you sail through.",
    llmLatencyMs: 104,
    shap: [
      { feature: "Project gap duration", weight: 0.33 },
      { feature: "Advance-tax deadline proximity", weight: 0.27 },
      { feature: "Overdue invoice value", weight: 0.24 },
      { feature: "Discretionary big-ticket spend", weight: 0.16 },
    ],
    auditAction: "INCOME_INVOICE_FOLLOWUP",
  },

  kadek: {
    sessionId: "K2207",
    userInput: "Tourism is slowing down. How long can I survive?",
    intent: "WHAT_IF_QUESTION",
    intentConfidence: 0.92,
    routing: "ANALYST_AGENT + COACH_AGENT",
    query: "Drop tourism income to 25% for off-season window...",
    sim: {
      paths: 1000,
      p50Gap: 4_200_000,
      p80Gap: 7_800_000,
      shortfallProbPct: 81,
    },
    rfc: [
      {
        code: "INSURANCE_SEASON_GAP_COVER",
        reward: 0.7,
        note: "off-season cover",
      },
      {
        code: "SAVINGS_RAINY_DAY_TOPUP",
        reward: 0.63,
        note: "pre-cliff buffer",
      },
      {
        code: "SPENDING_FESTIVAL_PLAN",
        reward: 0.55,
        note: "smooth Galungan",
      },
    ],
    rag: [
      {
        source: "GXS Pockets · Kadek seasonal model",
        snippet:
          "10-year tourism cliff begins ~Nov 12 · expected 4-month income trough",
      },
      {
        source: "Indonesia Off-season Income Cover",
        snippet:
          "Rp 1,500,000/mo replacement income product · 30-day waiting period",
      },
    ],
    llmResponse:
      "Kadek, the model says 81% chance of trouble through the off-season — your runway covers 9 days, but the cliff is ~4 months. Three moves: enrol in the off-season cover (Rp 1.5M/mo, 30-day waiting period — start now), shift Rp 800k/week into the rainy-day fund while peak still holds, and pre-plan Galungan so the upacara doesn't surprise the budget. We've done this every year — you survive each one. Let's make this one easier.",
    llmLatencyMs: 96,
    shap: [
      { feature: "Off-season cliff proximity", weight: 0.39 },
      { feature: "Emergency fund vs trough length", weight: 0.27 },
      { feature: "Festival / upacara obligation", weight: 0.2 },
      { feature: "Off-season cover availability", weight: 0.14 },
    ],
    auditAction: "INSURANCE_SEASON_GAP_COVER",
  },
};

export function getScenario(persona: Persona): PersonaScenario {
  const meta = META_BY_PERSONA[persona.id] ?? META_BY_PERSONA.ahmad;
  return build(persona, meta);
}
