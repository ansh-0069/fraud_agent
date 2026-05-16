// The 72-action vocabulary for the RL Coach (RFC).
// Quoting pdfcrowd.pdf §04 Hallucination Prevention & Guardrails:
//   "The RL agent can only recommend from a pre-approved action vocabulary
//    (72 action types). It cannot invent new action types."
// This file is the canonical enum used by both the UI heatmap and the
// Python sidecar (mirrored in services/ml/coach.py).

export type ActionFamily =
  | "Savings"
  | "Income"
  | "Loan"
  | "Insurance"
  | "Spending"
  | "Tax"
  | "Education"
  | "Wellness";

export interface CoachAction {
  id: number;
  code: string;
  label: string;
  family: ActionFamily;
  riskTier: 1 | 2 | 3;
  // Bounded amount range in % of monthly income (RL output is clamped here)
  amountPctRange?: [number, number];
}

const make = (
  family: ActionFamily,
  items: Array<[string, string, 1 | 2 | 3, [number, number]?]>
): CoachAction[] =>
  items.map(([code, label, riskTier, amountPctRange], i) => ({
    id: 0,
    code: `${family.toUpperCase()}_${code}`,
    label,
    family,
    riskTier,
    amountPctRange,
  }));

const FAMILIES: Array<[ActionFamily, Array<[string, string, 1 | 2 | 3, [number, number]?]>]> = [
  // 9 actions per family × 8 families = 72
  [
    "Savings",
    [
      ["MICRO_NUDGE", "Suggest micro-savings nudge today", 1, [0.01, 0.05]],
      ["BOOST_NOW", "Boost auto-save this peak window", 1, [0.05, 0.12]],
      ["DEFER_TARGET", "Defer savings target to peak week", 1],
      ["SPLIT_BUCKETS", "Split savings into goal buckets", 1],
      ["ROUND_UP", "Enable transaction round-up to savings", 1, [0.005, 0.02]],
      ["MATCH_GOAL", "Trigger employer/platform match offer", 2],
      ["FREEZE_PAUSE", "Pause savings rule for 1 week (rest)", 1],
      ["RAINY_DAY_TOPUP", "Top up rainy-day fund", 1, [0.03, 0.08]],
      ["BIG_GOAL_REVIEW", "Review long-term goal feasibility", 1],
    ],
  ],
  [
    "Income",
    [
      ["SUGGEST_PARTIAL_WEEKEND", "Suggest partial weekend (Sat AM only)", 1],
      ["TARGET_SURGE_WINDOW", "Highlight surge window opportunity", 1],
      ["DIVERSIFY_PLATFORM", "Diversify income to second platform", 2],
      ["INVOICE_FOLLOWUP", "Follow up on overdue invoice", 1],
      ["ADJUST_RATES", "Suggest rate-card adjustment", 2],
      ["LOW_DEMAND_ALERT", "Warn of low-demand week ahead", 1],
      ["SCHEDULE_LIGHT_WEEK", "Plan light-load recovery week", 1],
      ["CROSS_BORDER_FX", "Optimize FX timing for foreign payouts", 2],
      ["BRAND_DEAL_PIPE", "Surface brand-deal pipeline gaps", 2],
    ],
  ],
  [
    "Loan",
    [
      ["SUGGEST_ADVANCE_FROM_FLEXILOAN", "Offer FlexiLoan zero-fee drawdown", 2, [0.05, 0.30]],
      ["RESTRUCTURE_OFFER", "Proactive restructuring offer", 2],
      ["DEFER_PAYMENT", "Negotiate one-cycle payment deferral", 2],
      ["EARLY_REPAY_NUDGE", "Nudge early repayment to save interest", 1],
      ["TOP_UP_LOAN", "Offer top-up on existing loan", 3, [0.10, 0.40]],
      ["CONSOLIDATE_DEBT", "Consolidate multiple debts", 3],
      ["PRE_APPROVAL_NOTIFY", "Notify pre-approval status", 1],
      ["RATE_REVIEW", "Review rate against new score", 2],
      ["COLLATERAL_RELEASE", "Release collateral after threshold", 2],
    ],
  ],
  [
    "Insurance",
    [
      ["INCOME_LOSS_PROMPT", "Prompt income-loss insurance enrolment", 2],
      ["ACCIDENT_COVER", "Suggest accident cover top-up", 2],
      ["HEALTH_RIDER_ADD", "Add health rider for dependents", 2],
      ["DEVICE_PROTECTION", "Add device protection (creator gear)", 1],
      ["VEHICLE_COVER_GIG", "Vehicle cover with gig endorsement", 2],
      ["FAMILY_LIFE_BASIC", "Suggest basic family life cover", 2],
      ["CRITICAL_ILLNESS", "Critical illness top-up", 3],
      ["SEASON_GAP_COVER", "Off-season income gap cover", 2],
      ["TRIP_COVER_TRAVEL", "Trip / equipment cover", 1],
    ],
  ],
  [
    "Spending",
    [
      ["BUDGET_REBALANCE", "Rebalance discretionary buckets", 1],
      ["SUBSCRIPTION_PRUNE", "Prune underused subscriptions", 1],
      ["FUEL_OPTIMIZE", "Suggest fuel-cost optimisation route", 1],
      ["MERCHANT_SWAP", "Suggest cheaper merchant alternative", 1],
      ["CASHBACK_MAX", "Maximise cashback path", 1],
      ["FX_ALERT", "FX-friendly purchase timing alert", 2],
      ["FAMILY_BUDGET_SYNC", "Sync budget with household", 1],
      ["FESTIVAL_PLAN", "Pre-plan festival/holiday spend", 1],
      ["BIG_TICKET_DELAY", "Delay big-ticket purchase one cycle", 1],
    ],
  ],
  [
    "Tax",
    [
      ["ADVANCE_TAX_REMIND", "Remind advance tax instalment", 1],
      ["DEDUCTION_OPP", "Surface available deduction", 1],
      ["GST_FILE_DUE", "GST/SST filing due alert", 1],
      ["WITHHOLDING_ADJUST", "Adjust withholding for foreign clients", 2],
      ["RETIREMENT_RELIEF", "Use retirement-fund tax relief", 1],
      ["INVOICE_TAX_BOOK", "Bookkeep invoice for tax", 1],
      ["AUDIT_PREP_CHECK", "Audit-prep readiness check", 1],
      ["CROSS_BORDER_DTAA", "Cross-border DTAA optimisation", 2],
      ["TAX_SAVINGS_PARK", "Park tax reserve in liquid acct", 1],
    ],
  ],
  [
    "Education",
    [
      ["LITERACY_MICROLESSON", "1-min financial literacy lesson", 1],
      ["BENEFIT_BKAP", "Surface gov benefit (e.g. BKAP)", 1],
      ["NEW_PRODUCT_EXPLAIN", "Explain new GXS product simply", 1],
      ["GOAL_FRAMING", "Reframe goal in user's language", 1],
      ["SCENARIO_TUTORIAL", "Walkthrough 'what-if' scenario", 1],
      ["PEER_INSIGHT", "Anonymised peer benchmark", 1],
      ["RIGHTS_KNOW", "Explain consumer rights", 1],
      ["WHY_SHAP", "Show SHAP factors for last decision", 1],
      ["GLOSSARY_TERM", "Translate jargon to user dialect", 1],
    ],
  ],
  [
    "Wellness",
    [
      ["MILESTONE_CELEBRATE", "Celebrate savings milestone", 1],
      ["STRESS_LIGHT_PUSH", "Light push when stress detected", 1],
      ["REST_RECOMMEND", "Recommend full rest day", 1],
      ["FAMILY_TIME_NUDGE", "Nudge protected family time", 1],
      ["GOAL_REWARD", "Self-reward small win", 1],
      ["BURNOUT_FLAG", "Flag burnout risk pattern", 2],
      ["MENTAL_RESOURCE", "Share mental wellness resource", 1],
      ["COMMUNITY_LINK", "Link to peer community", 1],
      ["CHECKIN_MOOD", "Mood check-in nudge", 1],
    ],
  ],
];

export const ACTIONS: CoachAction[] = (() => {
  const out: CoachAction[] = [];
  let id = 0;
  for (const [family, items] of FAMILIES) {
    for (const a of make(family, items)) {
      out.push({ ...a, id: id++ });
    }
  }
  return out;
})();

export const ACTION_FAMILIES: ActionFamily[] = [
  "Savings",
  "Income",
  "Loan",
  "Insurance",
  "Spending",
  "Tax",
  "Education",
  "Wellness",
];

export function actionByCode(code: string): CoachAction | undefined {
  return ACTIONS.find((a) => a.code === code);
}
