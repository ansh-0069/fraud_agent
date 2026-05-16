"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Wallet,
  TimerReset,
  ShieldCheck,
  Gauge,
  ArrowRight,
  Bot,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/ui/page-shell";
import { KPICard } from "@/components/dashboard/kpi-card";
import { AgentFeed } from "@/components/dashboard/agent-feed";
import { MonteCarloFan } from "@/components/fdt/monte-carlo-fan";
import { seedAgentActivity } from "@/lib/mockdata";
import { formatCurrency } from "@/lib/utils";
import type { MCResult } from "@/lib/ml/monte-carlo";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const persona = useAppStore((s) => s.getPersona());
  const setTel = useAppStore((s) => s.setTelemetry);
  const [mc, setMc] = useState<MCResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/fdt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId: persona.id,
        params: { paths: 1000, horizonWeeks: 12 },
      }),
    })
      .then((r) => r.json())
      .then((j: MCResult) => {
        setMc(j);
        setTel("fdt", j.runtimeMs);
      })
      .finally(() => setLoading(false));
  }, [persona.id, setTel]);

  return (
    <PageShell
      step="STEP 2 · LIVE COMMAND CENTER"
      title={
        <span>
          {persona.name}'s digital twin{" "}
          <span className="text-muted-foreground font-normal text-xl">
            · {persona.segmentLabel} · {persona.city}
          </span>
        </span>
      }
      description="Live financial state, Monte Carlo projection, and the agent system's heartbeat — all wired to the same FDT snapshot the LangGraph state machine uses."
      rightSlot={
        <Button asChild variant="default">
          <Link href="/fdt-lab">
            Open FDT Lab <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <KPICard
          label="Cash balance"
          value={formatCurrency(persona.cashBalance, persona.currency)}
          icon={Wallet}
          accent="grab"
          hint="From mock GXS Pockets · Redis-backed"
          trend="up"
          delta="+RM 38 today"
        />
        <KPICard
          label="Emergency runway"
          value={String(persona.emergencyRunwayDays)}
          unit="days"
          icon={TimerReset}
          accent={persona.emergencyRunwayDays < 10 ? "rose" : "cyan"}
          hint="Cash / weekly burn · live"
          trend={persona.emergencyRunwayDays < 10 ? "down" : "up"}
          delta={persona.emergencyRunwayDays < 10 ? "below 14d" : "stable"}
        />
        <KPICard
          label="Shock survival"
          value={mc ? String(mc.shockSurvivalDays) : "—"}
          unit="days"
          icon={Gauge}
          accent={
            mc && mc.shockSurvivalDays < 14
              ? "amber"
              : mc && mc.shockSurvivalDays < 28
              ? "cyan"
              : "grab"
          }
          hint={`Monte Carlo · ${mc?.pathsRun ?? 0} paths`}
        />
        <KPICard
          label="FDT confidence"
          value={(persona.fdtConfidence * 100).toFixed(0)}
          unit="%"
          icon={ShieldCheck}
          accent="violet"
          hint={`${persona.weeklyIncome.length} weeks of history`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Financial Digital Twin · 12-week projection</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                LSTM-seeded Monte Carlo · P10–P90 fan · sample paths shown
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mc && (
                <Badge variant="secondary" className="num-mono">
                  source · {mc.source}
                </Badge>
              )}
              {mc && (
                <Badge variant="info" className="num-mono">
                  {mc.runtimeMs}ms
                </Badge>
              )}
              {mc && (
                <Badge variant="default" className="num-mono">
                  {mc.pathsRun} paths
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-3">
            {loading || !mc ? (
              <div className="h-[360px] grid place-items-center text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-grab-500 animate-pulse" />
                  Running Monte Carlo simulation…
                </div>
              </div>
            ) : (
              <MonteCarloFan
                paths={mc.samplePaths}
                summary={mc}
                obligationDay={mc.obligationDay}
                obligationLabel={`${persona.obligation.label} · ${persona.obligation.amount}`}
                obligationAmount={persona.obligation.amount}
              />
            )}
          </div>

          {mc && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-muted-foreground">Shortfall probability</div>
                <div className="text-2xl font-semibold tabular-nums mt-1">
                  {(mc.shortfallProb * 100).toFixed(0)}%
                </div>
                <div className="text-muted-foreground/70 mt-0.5">
                  paths ending below 0
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-muted-foreground">Cash at obligation · P50</div>
                <div className="text-2xl font-semibold tabular-nums mt-1">
                  {formatCurrency(Math.round(mc.cashAtObligation.p50), persona.currency)}
                </div>
                <div className="text-muted-foreground/70 mt-0.5">
                  median path
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-muted-foreground">Expected shortfall</div>
                <div className="text-2xl font-semibold tabular-nums mt-1">
                  {mc.expectedShortfall === 0
                    ? "—"
                    : formatCurrency(Math.round(mc.expectedShortfall), persona.currency)}
                </div>
                <div className="text-muted-foreground/70 mt-0.5">
                  avg of failing paths
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-[480px] lg:h-auto">
          <AgentFeed initial={seedAgentActivity(persona)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 surface p-5 flex items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default">
                <Bot className="h-3 w-3" />
                Coach Agent · suggestion
              </Badge>
              <Badge variant="secondary" className="num-mono">RFC reward 0.74</Badge>
            </div>
            <div className="mt-3 text-base leading-relaxed text-foreground/90">
              {persona.id === "ahmad" ? (
                <>
                  {persona.name}, with {persona.obligation.label} due in{" "}
                  {persona.obligation.daysOut} days, the model says full weekend
                  off pushes 73% of paths into shortfall. Try a partial Saturday
                  morning shift — surge usually earns RM 180–220 in 3 hours.
                </>
              ) : (
                <>
                  {persona.name}, your projected weekly income is volatile by{" "}
                  {(persona.incomeVolatilityIdx * 100).toFixed(0)}%. The
                  Coach recommends boosting auto-save by 7% during this peak
                  window so {persona.obligation.label} stays on track.
                </>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="pill bg-white/[0.04] border border-white/[0.06]">
                Grounded · {`{cash, runway, obligation}`}
              </span>
              <span className="pill bg-white/[0.04] border border-white/[0.06]">
                SHAP-explained
              </span>
              <span className="pill bg-white/[0.04] border border-white/[0.06]">
                Audit-logged
              </span>
            </div>
          </div>
          <Button asChild variant="glass" size="sm">
            <Link href="/mace">
              Open MACE Chat <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface p-5 relative overflow-hidden"
        >
          <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full blur-3xl bg-grab-500/20" />
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Guardian Agent
          </div>
          <div className="mt-2 text-base font-medium">All systems normal</div>
          <div className="text-xs text-muted-foreground mt-1">
            Isolation Forest scored 60 transactions · 0 anomalies · last sweep 4s ago
          </div>
          <Button asChild variant="ghost" size="sm" className="mt-3">
            <Link href="/guardian">
              Open Guardian sandbox <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </PageShell>
  );
}
