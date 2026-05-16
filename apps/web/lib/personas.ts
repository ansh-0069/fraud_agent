// Four persona archetypes — each one matches a target segment from the
// pdfcrowd.pdf solution doc (page 2 "Beyond gig workers: the full New Work
// Economy"). Numbers, languages, and challenges are sourced from the doc.

export type SegmentId = "gig" | "creator" | "freelancer" | "seasonal";

export interface Persona {
  id: string;
  segmentId: SegmentId;
  segmentLabel: string;
  segmentEmoji: string;
  name: string;
  age: number;
  city: string;
  country: string;
  countryCode: "MY" | "SG" | "IN" | "ID";
  currency: "RM" | "S$" | "₹" | "Rp";
  language: string; // primary language of the Coach Agent for this persona
  occupation: string;
  monthlyIncomeRange: [number, number]; // in local currency
  incomeVolatilityIdx: number; // 0..1
  fdtConfidence: number; // 0..1
  cashBalance: number;
  emergencyRunwayDays: number;
  riskTier: "T1" | "T2" | "T3"; // T1 lowest risk
  // Headline obligation used by the FDT what-if and reasoning log
  obligation: { label: string; amount: number; daysOut: number };
  // Talking points pulled directly from the PDF
  challenges: string[];
  segmentPainPoint: string; // verbatim-ish from PDF
  marketStat: string;
  // Income series: 14 weeks of synthetic but realistic weekly income for the
  // FDT's LSTM seed and dashboard sparklines
  weeklyIncome: number[];
  // Persona-specific tone for the Coach Agent
  coachTone: string;
}

const range = (lo: number, hi: number, n: number, seed = 1): number[] => {
  // simple deterministic LCG for repeatable demos
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    out.push(lo + r * (hi - lo));
  }
  return out;
};

export const PERSONAS: Persona[] = [
  {
    id: "ahmad",
    segmentId: "gig",
    segmentLabel: "Gig Worker",
    segmentEmoji: "🛵",
    name: "Ahmad",
    age: 34,
    city: "Kuala Lumpur",
    country: "Malaysia",
    countryCode: "MY",
    currency: "RM",
    language: "Bahasa Malaysia / English",
    occupation: "Grab Driver — full time, 4 yrs",
    monthlyIncomeRange: [2400, 3600],
    incomeVolatilityIdx: 0.42,
    fdtConfidence: 0.88,
    cashBalance: 312,
    emergencyRunwayDays: 6,
    riskTier: "T2",
    obligation: { label: "Alia's school fees", amount: 1200, daysOut: 21 },
    challenges: [
      "Daily cash-flow variability",
      "Peak vs off-peak earnings swings",
      "Surge-window dependency",
      "No accident / income-loss safety net",
    ],
    segmentPainPoint:
      "Gig workers have 3× more volatile monthly income vs salaried employees — traditional savings products fail them.",
    marketStat: "SEA Grab partners: ~9M+",
    weeklyIncome: [
      640, 580, 720, 690, 510, 880, 740, 620, 590, 810, 770, 540, 640, 690,
    ],
    coachTone:
      "Plain, warm, family-first. Speaks Bahasa Malaysia / English. References surge hours and Grab earnings patterns.",
  },
  {
    id: "meilin",
    segmentId: "creator",
    segmentLabel: "Creator",
    segmentEmoji: "🎨",
    name: "Mei Lin",
    age: 27,
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    currency: "S$",
    language: "English / Mandarin",
    occupation: "Lifestyle creator — YouTube + TikTok + Shopee Live",
    monthlyIncomeRange: [3200, 9800],
    incomeVolatilityIdx: 0.71,
    fdtConfidence: 0.74,
    cashBalance: 1840,
    emergencyRunwayDays: 11,
    riskTier: "T2",
    obligation: { label: "Q2 quarterly tax", amount: 4200, daysOut: 34 },
    challenges: [
      "30–60 day royalty payment lag",
      "Multi-platform income aggregation (YouTube, TikTok, Shopee)",
      "Tax complexity across SG/MY/ID brand deals",
      "Algorithm changes can cut income overnight",
    ],
    segmentPainPoint:
      "Creators earn on Shopee, TikTok, YouTube — none of these platforms offer financial planning. First-mover opportunity.",
    marketStat: "SEA creator economy: ~$1.4B market (2025)",
    weeklyIncome: [
      820, 410, 1640, 980, 540, 1280, 2100, 760, 480, 1340, 920, 1820, 660,
      890,
    ],
    coachTone:
      "Energetic, growth-minded, fluent in platform metrics (CPM, RPM, brand-deal cadence).",
  },
  {
    id: "raj",
    segmentId: "freelancer",
    segmentLabel: "Freelancer",
    segmentEmoji: "💻",
    name: "Raj",
    age: 31,
    city: "Bengaluru",
    country: "India",
    countryCode: "IN",
    currency: "₹",
    language: "English / Tamil",
    occupation: "Independent product designer — Upwork, direct US clients",
    monthlyIncomeRange: [120000, 360000],
    incomeVolatilityIdx: 0.65,
    fdtConfidence: 0.79,
    cashBalance: 48200,
    emergencyRunwayDays: 19,
    riskTier: "T1",
    obligation: { label: "Advance income tax", amount: 92000, daysOut: 42 },
    challenges: [
      "Project-based income with multi-month dry spells",
      "International client invoicing & FX risk",
      "Unpredictable advance-tax obligations",
      "No employer-sponsored retirement",
    ],
    segmentPainPoint:
      "The 'brilliant but broke' problem — highest earning segment, worst at planning due to cognitive overload.",
    marketStat: "SEA freelancers: ~25M (2025 est.)",
    weeklyIncome: [
      0, 38000, 84000, 12000, 0, 0, 96000, 64000, 0, 22000, 78000, 110000,
      8000, 0,
    ],
    coachTone:
      "Crisp, technical, comfortable with tax / equity / FX terminology. Tamil + English.",
  },
  {
    id: "kadek",
    segmentId: "seasonal",
    segmentLabel: "Seasonal",
    segmentEmoji: "🌾",
    name: "Kadek",
    age: 29,
    city: "Ubud",
    country: "Indonesia",
    countryCode: "ID",
    currency: "Rp",
    language: "Bahasa Indonesia",
    occupation: "Tourism hospitality — peak Apr–Oct, dry Nov–Mar",
    monthlyIncomeRange: [4_200_000, 18_000_000],
    incomeVolatilityIdx: 0.83,
    fdtConfidence: 0.69,
    cashBalance: 1_650_000,
    emergencyRunwayDays: 9,
    riskTier: "T3",
    obligation: {
      label: "Off-season household reserve",
      amount: 9_000_000,
      daysOut: 60,
    },
    challenges: [
      "3–6 month earning windows followed by income cliffs",
      "Tourism cycle dependency",
      "No bank models cyclical income properly",
      "Festival / harvest-driven family obligations",
    ],
    segmentPainPoint:
      "Critically underserved — no bank models cyclical income. NexusWallet uses temporal modeling to plan across seasons, not just months.",
    marketStat: "SEA seasonal workforce: ~50M workers",
    weeklyIncome: [
      3_800_000, 4_200_000, 4_900_000, 3_400_000, 2_100_000, 1_800_000,
      1_200_000, 900_000, 1_400_000, 2_800_000, 3_900_000, 4_400_000,
      4_100_000, 4_700_000,
    ],
    coachTone:
      "Family-centric, season-aware, references upacara (ceremonies) and harvest timing.",
  },
];

export function getPersona(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
