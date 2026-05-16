"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { useEffect, useMemo, useState } from "react";
import { MonteCarloFan } from "@/components/fdt/monte-carlo-fan";
import type { MCResult } from "@/lib/ml/monte-carlo";
import { formatCurrency } from "@/lib/utils";
import { Coffee, TrendingDown, Receipt, Snowflake, Play, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function FDTLabPage() {
  const persona = useAppStore((s) => s.getPersona());
  const setTel = useAppStore((s) => s.setTelemetry);
  const [daysOff, setDaysOff] = useState(0);
  const [commissionCut, setCommissionCut] = useState(0);
  const [oneTimeExpense, setOneTimeExpense] = useState(0);
  const [seasonBreak, setSeasonBreak] = useState(0);
  const [paths, setPaths] = useState(1000);
  const [mc, setMc] = useState<MCResult | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Array<{ label: string; mc: MCResult }>>([]);

  const run = async (label?: string) => {
    setRunning(true);
    const startedAt = Date.now();
    const r = await fetch("/api/fdt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId: persona.id,
        params: {
          daysOff,
          commissionCutPct: commissionCut,
          oneTimeExpense,
          seasonBreakWeeks: seasonBreak,
          paths,
        },
      }),
    });
    const j: MCResult = await r.json();
    setMc(j);
    setTel("fdt", j.runtimeMs);
    setHistory((h) =>
      [
        {
          label:
            label ??
            `${daysOff}d off · -${commissionCut}% comm · expense ${oneTimeExpense} · ${seasonBreak}w break · ${paths}p`,
          mc: j,
        },
        ...h,
      ].slice(0, 6)
    );
    setRunning(false);
  };

  useEffect(() => {
    run("baseline · no shocks");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id]);

  const sliders = [
    {
      label: "Days off this week",
      value: daysOff,
      set: setDaysOff,
      min: 0,
      max: 7,
      step: 1,
      icon: Coffee,
      hint: "Reduces first-week income proportionally",
      fmt: (v: number) => `${v} day${v === 1 ? "" : "s"}`,
    },
    {
      label: "Platform commission cut",
      value: commissionCut,
      set: setCommissionCut,
      min: 0,
      max: 50,
      step: 1,
      icon: TrendingDown,
      hint: "Algorithm change · long-term income hit",
      fmt: (v: number) => `-${v}%`,
    },
    {
      label: "One-time expense (this week)",
      value: oneTimeExpense,
      set: setOneTimeExpense,
      min: 0,
      max: Math.round(persona.monthlyIncomeRange[1]),
      step: persona.segmentId === "seasonal" ? 100000 : 100,
      icon: Receipt,
      hint: "Medical, vehicle, family event",
      fmt: (v: number) => formatCurrency(v, persona.currency),
    },
    {
      label: "Season-break weeks",
      value: seasonBreak,
      set: setSeasonBreak,
      min: 0,
      max: 6,
      step: 1,
      icon: Snowflake,
      hint: "Off-season / festival income cliff",
      fmt: (v: number) => `${v} weeks`,
    },
  ] as const;

  const presets = [
    { label: "Skip the weekend", apply: () => { setDaysOff(2); setCommissionCut(0); setOneTimeExpense(0); setSeasonBreak(0); } },
    { label: "Algorithm cuts pay 15%", apply: () => { setDaysOff(0); setCommissionCut(15); setOneTimeExpense(0); setSeasonBreak(0); } },
    { label: "Big medical bill", apply: () => { setDaysOff(0); setCommissionCut(0); setOneTimeExpense(persona.segmentId === "seasonal" ? 4_000_000 : 1500); setSeasonBreak(0); } },
    { label: "2-week Raya break", apply: () => { setDaysOff(0); setCommissionCut(0); setOneTimeExpense(0); setSeasonBreak(2); } },
    { label: "Worst case · everything", apply: () => { setDaysOff(2); setCommissionCut(15); setOneTimeExpense(persona.segmentId === "seasonal" ? 4_000_000 : 1500); setSeasonBreak(2); } },
  ];

  return (
    <PageShell
      step="STEP 3 · DIGITAL TWIN LAB"
      title="What-if simulation, runnable"
      description="The FDT is not a dashboard — it's a runnable model. Drag the sliders, hit Run, and a real Monte Carlo simulation answers your what-if. P10–P90 fan, P50 median, sample paths, shortfall probability, and shock-survival days are all computed live from your persona's history."
      rightSlot={
        <>
          <Button variant="glass" size="sm" onClick={() => setPaths(paths === 1000 ? 10000 : 1000)}>
            <Sparkles className="h-3.5 w-3.5" />
            {paths === 1000 ? "Flex · 10,000 paths" : "Standard · 1,000 paths"}
          </Button>
          <Button onClick={() => run()} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? "Running…" : "Run simulation"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">12-week cash trajectory</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  P10–P90 fan with sampled paths · obligation marker shown
                </div>
              </div>
              {mc && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="num-mono">{mc.source}</Badge>
                  <Badge variant="info" className="num-mono">{mc.pathsRun}p</Badge>
                  <Badge variant="info" className="num-mono">{mc.runtimeMs}ms</Badge>
                </div>
              )}
            </div>
            <div className="mt-3">
              {mc ? (
                <MonteCarloFan
                  paths={mc.samplePaths}
                  summary={mc}
                  obligationDay={mc.obligationDay}
                  obligationLabel={`${persona.obligation.label} · ${formatCurrency(persona.obligation.amount, persona.currency)}`}
                  obligationAmount={persona.obligation.amount}
                />
              ) : (
                <div className="h-[360px] grid place-items-center text-muted-foreground text-sm">
                  Press Run simulation
                </div>
              )}
            </div>
          </div>

          {mc && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Shortfall probability" value={`${(mc.shortfallProb * 100).toFixed(0)}%`} hint="paths ending below 0" tone={mc.shortfallProb > 0.5 ? "rose" : mc.shortfallProb > 0.2 ? "amber" : "grab"} />
              <Stat label="Shock survival" value={`${mc.shockSurvivalDays}`} unit="days" hint="P50 cash hits 0" tone={mc.shockSurvivalDays < 21 ? "rose" : "grab"} />
              <Stat label="Cash at obligation · P50" value={formatCurrency(Math.round(mc.cashAtObligation.p50), persona.currency)} hint="median path" tone={mc.cashAtObligation.p50 < 0 ? "rose" : "cyan"} />
              <Stat label="Expected shortfall" value={mc.expectedShortfall === 0 ? "—" : formatCurrency(Math.round(mc.expectedShortfall), persona.currency)} hint="avg of failing paths" tone={mc.expectedShortfall > 0 ? "amber" : "grab"} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">What-if controls</div>
              <Badge variant="secondary">live</Badge>
            </div>
            <div className="space-y-5">
              {sliders.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {s.label}
                      </span>
                      <span className="num-mono text-foreground/90">{s.fmt(s.value)}</span>
                    </div>
                    <Slider
                      className="mt-2"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={[s.value]}
                      onValueChange={(v) => s.set(v[0])}
                    />
                    <div className="text-[10px] text-muted-foreground mt-1">{s.hint}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5">
              <div className="text-xs text-muted-foreground mb-2">Quick presets</div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={p.apply}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <div className="text-sm font-medium">Run history</div>
            <div className="mt-2 space-y-2">
              {history.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No runs yet — try a preset.
                </div>
              )}
              {history.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground/80 truncate">{h.label}</span>
                    <span className="num-mono text-muted-foreground">{h.mc.runtimeMs}ms</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-3 num-mono">
                    <span>{(h.mc.shortfallProb * 100).toFixed(0)}% shortfall</span>
                    <span>{h.mc.shockSurvivalDays}d survive</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone: "grab" | "cyan" | "amber" | "rose";
}) {
  const accents: Record<string, string> = {
    grab: "from-grab-500/20 to-grab-500/5 border-grab-500/30",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30",
  };
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 ${accents[tone]}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {unit && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
