// Five-step auto-demo script. Each step:
//   1. switches the global persona filter to `personaId`
//   2. navigates to /mace
//   3. fires `query` into the Coach (via store.setDemoQuery)
//   4. waits `dwellMs` for the response to stream + judge to read
//   5. advances or ends
//
// Tuned so the full sequence takes ~25s — short enough to keep judges
// engaged, long enough to show every agent in the stack reasoning live.
export interface DemoStep {
  personaId: string;
  query: string;
  label: string;
  capability: string;
  dwellMs: number;
}

export const DEMO_SCRIPT: DemoStep[] = [
  {
    personaId: "ahmad",
    query: "Can I take this Saturday off and still cover Alia's school fees?",
    label: "Surge-day approval",
    capability: "Gig dampening + FDT what-if",
    dwellMs: 5500,
  },
  {
    personaId: "ahmad",
    query: "Why was my last transaction flagged as suspicious?",
    label: "Fraud explanation",
    capability: "Guardian + SHAP attribution",
    dwellMs: 5500,
  },
  {
    personaId: "meilin",
    query: "Should I take the new TikTok brand deal — what does it do to my Q2 tax obligation?",
    label: "Financial wellness check",
    capability: "Multi-platform income aggregator",
    dwellMs: 5500,
  },
  {
    personaId: "raj",
    query: "Will I survive a two-week project dry spell starting next Monday?",
    label: "Shock survival simulation",
    capability: "FDT 12-week Monte Carlo",
    dwellMs: 5500,
  },
  {
    personaId: "kadek",
    query: "Build me a savings plan to bridge Nov–Mar off-season.",
    label: "Seasonal savings plan",
    capability: "RL Coach · 72-action policy",
    dwellMs: 5500,
  },
];
