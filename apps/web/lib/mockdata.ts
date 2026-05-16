import type { Persona, SegmentId } from "./personas";

// Deterministic seeded RNG so demos are repeatable
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Transaction {
  id: string;
  ts: number; // ms epoch (relative to "now" in demo)
  merchant: string;
  category: string;
  amount: number; // positive = inflow, negative = outflow
  channel: "Grab Pay" | "Card" | "Bank Transfer" | "Cash" | "Platform Payout";
  device: "iOS" | "Android" | "Web" | "Unknown";
  city: string;
  countryCode: string;
  // Pre-computed feature snapshot (used by Guardian's Isolation Forest)
  features: {
    hour: number; // 0..23
    isNewDevice: boolean;
    velocityScore: number; // tx in last hour
    amountZ: number; // amount z-score vs user's history
    geoDeltaKm: number; // distance from typical location
    weekend: boolean;
  };
  isFraud?: boolean;
}

const merchantsByCategory: Record<string, string[]> = {
  Fuel: ["Petronas Bangsar", "Shell Damansara", "BP Subang"],
  Food: ["Mamak Corner", "FamilyMart KL Sentral", "Kopitiam Bangsar", "Old Town"],
  Telco: ["Maxis Postpaid", "Digi Prepaid", "Celcom"],
  Loan: ["GXS FlexiLoan repayment"],
  Income: ["Grab Driver Payout", "Grab Pay Tip", "Surge Bonus"],
  Education: ["SK Bandar Utama School", "School Fees"],
  Health: ["Pharmacy Watsons", "Klinik Mediviron"],
  Utilities: ["Tenaga Nasional", "Air Selangor"],
  Family: ["MoneyToFamily", "Tabung Haji"],
  Subscription: ["Netflix", "Spotify", "Apple iCloud"],
  Brand: ["Brand Deal Payout", "TikTok Creator Fund", "YouTube AdSense"],
  Tax: ["IRAS", "LHDN", "Income Tax India"],
};

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function generateTransactions(
  persona: Persona,
  count = 60,
  seed = 42
): Transaction[] {
  const rand = mulberry32(seed + persona.id.charCodeAt(0));
  const out: Transaction[] = [];
  const baseHour = 14;
  const monthlyAvg =
    (persona.monthlyIncomeRange[0] + persona.monthlyIncomeRange[1]) / 2;
  const txAvg = monthlyAvg / 80;

  for (let i = 0; i < count; i++) {
    const isInflow = rand() < (persona.segmentId === "creator" ? 0.18 : 0.32);
    const cat = isInflow
      ? persona.segmentId === "creator"
        ? "Brand"
        : "Income"
      : pick(
          ["Fuel", "Food", "Telco", "Utilities", "Family", "Subscription", "Health", "Education", "Loan"],
          rand
        );
    const merchant = pick(merchantsByCategory[cat], rand);
    const sign = isInflow ? 1 : -1;
    const amt = Math.round(sign * txAvg * (0.4 + rand() * 1.6));

    const minutesAgo = i * (60 + Math.floor(rand() * 90));
    const date = new Date(Date.now() - minutesAgo * 60_000);
    const hour = date.getHours();

    out.push({
      id: `tx_${persona.id}_${i.toString().padStart(4, "0")}`,
      ts: date.getTime(),
      merchant,
      category: cat,
      amount: amt,
      channel: pick(
        cat === "Brand"
          ? ["Platform Payout"]
          : cat === "Income"
          ? ["Grab Pay", "Bank Transfer"]
          : ["Card", "Grab Pay", "Bank Transfer", "Cash"],
        rand
      ) as Transaction["channel"],
      device: pick(["iOS", "Android", "Web"], rand) as Transaction["device"],
      city: persona.city,
      countryCode: persona.countryCode,
      features: {
        hour,
        isNewDevice: rand() < 0.04,
        velocityScore: Math.floor(rand() * 4),
        amountZ: ((Math.abs(amt) - txAvg) / (txAvg * 0.6)) || 0,
        geoDeltaKm: Math.round(rand() * 6),
        weekend: [0, 6].includes(date.getDay()),
      },
    });
  }
  return out;
}

// A clearly-fraudulent transaction tail used by /guardian's "Inject fraud" button.
// Quotes pdfcrowd.pdf (Guardian section): "your login at 3am from a new device,
// combined with a large transfer, matches patterns we've seen before".
export function fraudTransaction(persona: Persona): Transaction {
  const monthlyAvg =
    (persona.monthlyIncomeRange[0] + persona.monthlyIncomeRange[1]) / 2;
  return {
    id: `tx_${persona.id}_fraud_${Date.now()}`,
    ts: Date.now(),
    merchant: "Unknown wallet · transfer to e0xA7…f12",
    category: "Transfer",
    amount: -Math.round(monthlyAvg * 0.45),
    channel: "Bank Transfer",
    device: "Unknown",
    city: "Ho Chi Minh City",
    countryCode: "VN",
    features: {
      hour: 3,
      isNewDevice: true,
      velocityScore: 6,
      amountZ: 4.8,
      geoDeltaKm: 1980,
      weekend: false,
    },
    isFraud: true,
  };
}

export interface IncomeStreamPoint {
  week: number;
  base: number; // historical
  forecast?: number; // LSTM forecast, if any
}

export function buildIncomeStream(
  persona: Persona,
  forecastWeeks = 4
): IncomeStreamPoint[] {
  const out: IncomeStreamPoint[] = persona.weeklyIncome.map((v, i) => ({
    week: i + 1,
    base: v,
  }));
  // Lightweight forecast: last 3-week mean + small seasonal drift
  const last3 =
    persona.weeklyIncome.slice(-3).reduce((a, b) => a + b, 0) / 3;
  for (let i = 0; i < forecastWeeks; i++) {
    const drift =
      persona.segmentId === "seasonal"
        ? -0.15 * (i + 1)
        : persona.segmentId === "freelancer"
        ? (i % 2 === 0 ? -0.4 : 0.3)
        : 0.04 * (i + 1);
    out.push({
      week: out.length + 1,
      base: 0,
      forecast: Math.max(0, last3 * (1 + drift)),
    });
  }
  return out;
}

// Synthetic agent activity used by the dashboard side rail
export interface AgentActivity {
  id: string;
  agent: "Orchestrator" | "Coach" | "Analyst" | "Guardian" | "FDT" | "RFC" | "RAG";
  text: string;
  latencyMs?: number;
  ts: number;
}

export function seedAgentActivity(persona: Persona): AgentActivity[] {
  const now = Date.now();
  return [
    {
      id: "a1",
      agent: "FDT",
      text: `Rebuilt digital twin · ${persona.weeklyIncome.length} weeks of history · confidence ${persona.fdtConfidence.toFixed(2)}`,
      latencyMs: 142,
      ts: now - 3 * 60_000,
    },
    {
      id: "a2",
      agent: "Guardian",
      text: "Isolation Forest scored 60 transactions · 0 anomalies",
      latencyMs: 38,
      ts: now - 2 * 60_000,
    },
    {
      id: "a3",
      agent: "RFC",
      text: `Policy evaluated 72 actions · selected MICRO_NUDGE for ${persona.name}`,
      latencyMs: 27,
      ts: now - 90_000,
    },
    {
      id: "a4",
      agent: "Coach",
      text: `Drafted message in ${persona.language.split("/")[0].trim()}`,
      latencyMs: 87,
      ts: now - 30_000,
    },
  ];
}
