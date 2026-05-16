"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { motion } from "framer-motion";
import {
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Users,
  Banknote,
  Headphones,
  CheckCircle2,
} from "lucide-react";

const METRICS = [
  {
    label: "Loan default rate",
    current: "~8–12%",
    impact: -30,
    unit: "%",
    suffix: "reduction",
    icon: TrendingDown,
    tone: "grab",
    mechanism: "FDT predicts default risk 45 days ahead; RFC intervenes proactively with restructuring offers.",
  },
  {
    label: "Customer LTV",
    current: "FlexiLoan-driven",
    impact: 50,
    unit: "%",
    suffix: "increase",
    icon: TrendingUp,
    tone: "cyan",
    mechanism: "Segment-aware coaching increases cross-product adoption (savings + insurance + loan).",
  },
  {
    label: "New customer acquisition",
    current: "Grab ecosystem only",
    impact: 17,
    unit: "%",
    suffix: "new cohort",
    icon: Users,
    tone: "violet",
    mechanism: "Creators / freelancers with no Grab history onboard via income stream linking (YouTube, Fiverr).",
  },
  {
    label: "Fraud losses",
    current: "0.3–0.7% of revenue",
    impact: -45,
    unit: "%",
    suffix: "reduction",
    icon: ShieldCheck,
    tone: "rose",
    mechanism: "Guardian Agent detects behavioral anomalies pre-transaction; Isolation Forest on streams.",
  },
  {
    label: "Support cost deflection",
    current: "High",
    impact: -30,
    unit: "%",
    suffix: "deflection",
    icon: Headphones,
    tone: "amber",
    mechanism: "MACE handles balance queries, loan eligibility, payment-plan questions — without a human agent.",
  },
  {
    label: "Regulatory moat",
    current: "MAS baseline",
    impact: 100,
    unit: "%",
    suffix: "MAS FEAT-ready",
    icon: Banknote,
    tone: "grab",
    mechanism: "Every recommendation has SHAP explanation + audit trail — ready for Fairness, Ethics, Accountability principles.",
  },
];

const REVENUE = [
  {
    title: "Enhanced Credit Scoring",
    sub: "B2C · core lending",
    detail: "FDT-based creditworthiness scoring replaces thin-bureau decisions → more loans disbursed at lower default risk → higher net interest income",
    bars: [12, 28, 56],
  },
  {
    title: "Financial Wellness Premium",
    sub: "B2C · $3–5 / month",
    detail: "Advanced FDT scenarios, tax optimisation, multi-platform income aggregation — targeting freelancers and creators",
    bars: [4, 14, 32],
  },
  {
    title: "Platform Intelligence API",
    sub: "B2B · new revenue stream",
    detail: "Sell anonymized, aggregated gig economy financial-health signals to Grab logistics/merchant partners for supply planning",
    bars: [2, 8, 22],
  },
];

const ALIGNMENT = [
  "GXS 2025 goal: 'significant scaling up' — NexusWallet adds value per existing user AND pulls in new cohorts",
  "Business banking launch (Q1 2025) — freelancers/sole proprietors are NexusWallet's exact target",
  "Regional expansion (Indonesia, Malaysia) — multilingual RAG ready day-one",
  "MAS Data Protection Trustmark — on-device FDT inference; no raw financial data leaves the device",
];

const SEA_BUBBLES = [
  { country: "Indonesia", x: 52, y: 80, r: 26, segment: "Seasonal · 50M" },
  { country: "Malaysia", x: 42, y: 56, r: 16, segment: "Gig · core Grab base" },
  { country: "Singapore", x: 50, y: 64, r: 10, segment: "Creator · launchpad" },
  { country: "Thailand", x: 36, y: 38, r: 14, segment: "Gig + Seasonal" },
  { country: "Philippines", x: 76, y: 50, r: 14, segment: "Freelancer · BPO" },
  { country: "Vietnam", x: 56, y: 30, r: 14, segment: "Gig · growth" },
];

export default function ImpactPage() {
  return (
    <PageShell
      step="STEP 10 · BUSINESS IMPACT"
      title="Why this wins for Grab, GXS, and users"
      description="GXS targets profitability by March 2027. NexusWallet is a direct accelerant — it increases loan conversion, reduces default rates, and acquires customers outside the existing Grab ecosystem."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((m, i) => {
          const Icon = m.icon;
          const accents: Record<string, string> = {
            grab: "from-grab-500/20 to-grab-500/5 border-grab-500/30",
            cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
            amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
            rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30",
            violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
          };
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`surface p-5 relative overflow-hidden bg-gradient-to-br ${accents[m.tone]}`}
            >
              <div className="flex items-start justify-between">
                <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] grid place-items-center">
                  <Icon className="h-4 w-4" />
                </div>
                <Badge variant="secondary" className="num-mono">
                  baseline · {m.current}
                </Badge>
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums flex items-baseline gap-1">
                <span className={m.impact < 0 ? "text-grab-300" : "text-cyan-300"}>
                  {m.impact < 0 ? "↓" : "↑"}
                  <AnimatedNumber value={Math.abs(m.impact)} />
                  {m.unit}
                </span>
                <span className="text-sm text-muted-foreground">{m.suffix}</span>
              </div>
              <div className="mt-1 text-sm font-medium">{m.label}</div>
              <div className="mt-2 text-xs text-muted-foreground">{m.mechanism}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface p-6">
          <div className="text-sm font-medium">Revenue model · 3-year projection</div>
          <div className="text-xs text-muted-foreground mt-1">
            Three independent streams — each de-risks the others
          </div>
          <div className="mt-5 space-y-5">
            {REVENUE.map((r) => (
              <div key={r.title}>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground">{r.sub}</div>
                  </div>
                  <div className="flex gap-2 text-[11px] text-muted-foreground num-mono">
                    <span>Y1</span><span>Y2</span><span>Y3</span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {r.bars.map((b, i) => (
                    <div key={i}>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${b * 1.5}%` }}
                          transition={{ duration: 1, delay: 0.4 + i * 0.15 }}
                          className="h-full bg-gradient-to-r from-grab-500 to-cyan-400"
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground num-mono">
                        ${b}M
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">{r.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-6">
          <div className="text-sm font-medium">GXS strategic alignment</div>
          <div className="mt-3 space-y-2.5">
            {ALIGNMENT.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-grab-300 shrink-0" />
                <span className="text-foreground/85">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface p-6">
        <div className="text-sm font-medium">SEA TAM coverage</div>
        <div className="text-xs text-muted-foreground mt-1">
          Bubble size = relative non-traditional workforce size. NexusWallet's
          multilingual stack (Bahasa, Malay, Thai, Tagalog, Tamil) is designed
          for these markets from day one.
        </div>
        <div className="mt-4 relative bg-ink-950/60 rounded-xl border border-white/[0.06] h-[360px] overflow-hidden">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="bubble-g">
                <stop offset="0%" stopColor="#00B14F" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#00B14F" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bubble-g)" opacity="0.05" />
            {SEA_BUBBLES.map((b, i) => (
              <g key={b.country}>
                <motion.circle
                  cx={b.x}
                  cy={b.y}
                  r={b.r}
                  fill="url(#bubble-g)"
                  initial={{ r: 0 }}
                  animate={{ r: b.r }}
                  transition={{ delay: i * 0.12, duration: 0.8 }}
                />
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={3}
                  fill="#00B14F"
                />
                <text
                  x={b.x}
                  y={b.y - b.r - 1.5}
                  textAnchor="middle"
                  fontSize="2.5"
                  fill="#fff"
                  fontFamily="ui-monospace,monospace"
                >
                  {b.country}
                </text>
                <text
                  x={b.x}
                  y={b.y - b.r + 1}
                  textAnchor="middle"
                  fontSize="1.7"
                  fill="#94a3b8"
                  fontFamily="ui-monospace,monospace"
                >
                  {b.segment}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </PageShell>
  );
}
