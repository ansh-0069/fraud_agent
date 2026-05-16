// Real Monte Carlo simulator (TS fallback used when Python sidecar offline).
// Generates N synthetic income paths starting from a base weekly income with
// segment-specific drift and volatility, applying any what-if shocks.
// Both the Python and TS implementations agree on the schema.

import type { Persona } from "../personas";

export interface WhatIfParams {
  daysOff?: number; // 0..7
  commissionCutPct?: number; // 0..50  (% reduction in income)
  oneTimeExpense?: number; // local currency
  seasonBreakWeeks?: number; // 0..6
  paths?: number; // 100..10000
  horizonWeeks?: number; // forecast horizon
}

export interface MCResult {
  weeks: number[];
  mean: number[];
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
  samplePaths: number[][];
  shortfallProb: number;
  expectedShortfall: number;
  shockSurvivalDays: number;
  obligationDay: number;
  cashAtObligation: { p50: number; p80: number };
  pathsRun: number;
  runtimeMs: number;
  source: "python" | "ts-fallback";
}

function randNormal(rand: () => number): number {
  // Box–Muller
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentiles(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
  return {
    p10: at(0.1),
    p25: at(0.25),
    p50: at(0.5),
    p75: at(0.75),
    p90: at(0.9),
  };
}

export function runMonteCarloTS(
  persona: Persona,
  params: WhatIfParams = {}
): MCResult {
  const startedAt = Date.now();
  const horizon = params.horizonWeeks ?? 12;
  const N = Math.min(10000, Math.max(50, params.paths ?? 1000));
  const rand = mulberry32(42 + persona.id.charCodeAt(0));

  const lastWeeks = persona.weeklyIncome.slice(-4);
  const baseIncome = lastWeeks.reduce((a, b) => a + b, 0) / lastWeeks.length;

  // Estimate vol from history
  const mean =
    persona.weeklyIncome.reduce((a, b) => a + b, 0) / persona.weeklyIncome.length;
  const variance =
    persona.weeklyIncome.reduce((a, b) => a + (b - mean) ** 2, 0) /
    persona.weeklyIncome.length;
  const sigma = Math.sqrt(variance);
  const sigmaPct = Math.min(0.65, sigma / Math.max(1, mean));

  // Segment-specific drift (mirrors LSTM tendency in Python sidecar)
  const segmentDrift: Record<string, number> = {
    gig: -0.005,
    creator: 0.01,
    freelancer: -0.02,
    seasonal: -0.06,
  };
  const drift = segmentDrift[persona.segmentId] ?? 0;

  // Weekly expense baseline (50% of mean income)
  const weeklyExpense = mean * 0.5;

  // What-if shocks
  const daysOff = Math.min(7, Math.max(0, params.daysOff ?? 0));
  const commCut = Math.min(0.5, Math.max(0, (params.commissionCutPct ?? 0) / 100));
  const oneTime = Math.max(0, params.oneTimeExpense ?? 0);
  const seasonBreak = Math.min(6, Math.max(0, params.seasonBreakWeeks ?? 0));

  const weeks = Array.from({ length: horizon + 1 }, (_, i) => i);
  const allCash: number[][] = [];

  let shortfallCount = 0;
  let shortfallSum = 0;

  const obligationDay = Math.round(persona.obligation.daysOut / 7);
  let cashAtObligationDist: number[] = [];

  for (let p = 0; p < N; p++) {
    const path: number[] = [persona.cashBalance];
    let cash = persona.cashBalance;
    let cashJustBeforeObligation: number | null = null;
    for (let wk = 1; wk <= horizon; wk++) {
      const shock = randNormal(rand);
      const factor = 1 + drift + sigmaPct * shock * 0.8;
      let income = baseIncome * factor * (1 - commCut);
      // First-week reductions
      if (wk === 1 && daysOff > 0) {
        income *= 1 - daysOff / 7;
      }
      if (wk <= seasonBreak) income *= 0.15; // season cliff
      let expense = weeklyExpense * (0.85 + 0.3 * rand());
      if (wk === 1) expense += oneTime;
      cash += income - expense;
      if (wk === obligationDay) {
        cashJustBeforeObligation = cash;
        cash -= persona.obligation.amount;
        cashAtObligationDist.push(cash);
      }
      path.push(cash);
    }
    // "Shortfall" = obligation cannot be fully covered (cash going negative at
    // obligation week, OR running out before the horizon)
    const obligationGap =
      cashJustBeforeObligation === null
        ? 0
        : Math.max(0, persona.obligation.amount - cashJustBeforeObligation);
    const endNegative = path[path.length - 1] < 0;
    if (obligationGap > 0 || endNegative) {
      shortfallCount++;
      shortfallSum += obligationGap > 0 ? obligationGap : -path[path.length - 1];
    }
    allCash.push(path);
  }

  // Compute percentiles per timestep
  const pctSeries = (key: "p10" | "p25" | "p50" | "p75" | "p90") => {
    return weeks.map((_, t) => {
      const slice = allCash.map((p) => p[t]);
      return percentiles(slice)[key];
    });
  };
  const meanSeries = weeks.map((_, t) => {
    const slice = allCash.map((p) => p[t]);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  const obligationPct = percentiles(
    cashAtObligationDist.length ? cashAtObligationDist : [0]
  );

  // Shock survival = first week where p50 cash drops below 0
  let shockDay = horizon * 7;
  const p50 = pctSeries("p50");
  for (let t = 1; t < p50.length; t++) {
    if (p50[t] < 0) {
      shockDay = t * 7;
      break;
    }
  }

  return {
    weeks,
    mean: meanSeries,
    p10: pctSeries("p10"),
    p25: pctSeries("p25"),
    p50,
    p75: pctSeries("p75"),
    p90: pctSeries("p90"),
    samplePaths: allCash.slice(0, 40),
    shortfallProb: shortfallCount / N,
    expectedShortfall: shortfallCount === 0 ? 0 : shortfallSum / shortfallCount,
    shockSurvivalDays: shockDay,
    obligationDay,
    cashAtObligation: { p50: obligationPct.p50, p80: obligationPct.p25 },
    pathsRun: N,
    runtimeMs: Date.now() - startedAt,
    source: "ts-fallback",
  };
}
