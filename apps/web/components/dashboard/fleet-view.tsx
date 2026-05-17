"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  ShieldAlert,
  TrendingUp,
  TimerReset,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/kpi-card";
import { AgentFeed } from "@/components/dashboard/agent-feed";
import { seedAgentActivity } from "@/lib/mockdata";
import { cn } from "@/lib/utils";

// Indicative FX (snapshot for the demo — not live). Just enough to put
// four currencies on the same axis when computing a fleet-wide "USD-ish"
// liquidity figure for the headline KPI card.
const TO_USD: Record<string, number> = {
  RM: 0.21,
  "S$": 0.74,
  "₹": 0.012,
  Rp: 0.000065,
};

/**
 * The "All Drivers" aggregate view of the command center. Rendered when
 * the global persona filter is empty. Shows fleet-wide KPIs, a per-driver
 * leaderboard with wellness scoring, and the combined agent activity feed.
 *
 * Clicking any driver row activates the persona filter for that driver,
 * causing the rest of the app to drill into their individual view. This
 * is the production fraud-ops UX: scan the fleet, drill into one.
 */
export function FleetView() {
  const setFilter = useAppStore((s) => s.setPersonaFilter);

  // Derive aggregate metrics from PERSONAS. Memoised so a parent re-render
  // doesn't churn the layout (and so the live demo never flickers).
  const stats = useMemo(() => {
    const totalUsd = PERSONAS.reduce(
      (acc, p) => acc + p.cashBalance * (TO_USD[p.currency] ?? 1),
      0
    );
    const avgRunway =
      PERSONAS.reduce((acc, p) => acc + p.emergencyRunwayDays, 0) /
      PERSONAS.length;
    const atRisk = PERSONAS.filter((p) => p.emergencyRunwayDays < 10).length;
    const avgConfidence =
      PERSONAS.reduce((acc, p) => acc + p.fdtConfidence, 0) / PERSONAS.length;
    return { totalUsd, avgRunway, atRisk, avgConfidence };
  }, []);

  // Per-driver wellness ranking. Composite of FDT confidence, normalised
  // runway, and inverse volatility — same factors the Coach Agent uses.
  const ranked = useMemo(
    () =>
      [...PERSONAS]
        .map((p) => {
          const runwayScore = Math.min(1, p.emergencyRunwayDays / 21);
          const volScore = 1 - p.incomeVolatilityIdx;
          const wellness =
            0.45 * p.fdtConfidence + 0.35 * runwayScore + 0.2 * volScore;
          return { ...p, wellness };
        })
        .sort((a, b) => b.wellness - a.wellness),
    []
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <KPICard
          label="Active drivers"
          value={String(PERSONAS.length)}
          icon={Users}
          accent="grab"
          hint="4 segments · MY · SG · IN · ID"
          trend="up"
          delta="+0 today"
        />
        <KPICard
          label="Drivers at risk"
          value={String(stats.atRisk)}
          icon={ShieldAlert}
          accent={stats.atRisk > 0 ? "amber" : "grab"}
          hint="Runway < 10 days · Coach triggers"
          trend={stats.atRisk > 0 ? "down" : "up"}
          delta={`${((stats.atRisk / PERSONAS.length) * 100).toFixed(0)}% of fleet`}
        />
        <KPICard
          label="Avg runway"
          value={stats.avgRunway.toFixed(1)}
          unit="days"
          icon={TimerReset}
          accent="cyan"
          hint="Mean across all drivers"
        />
        <KPICard
          label="Fleet liquidity"
          value={`$${stats.totalUsd.toFixed(0)}`}
          icon={TrendingUp}
          accent="violet"
          hint="Total cash · USD-equiv · live"
          trend="up"
          delta="across 4 currencies"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Driver leaderboard — the centerpiece of the fleet view */}
        <div className="lg:col-span-2 surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Driver leaderboard</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Wellness = 0.45·FDT confidence + 0.35·runway + 0.20·stability ·
                click a row to drill in
              </div>
            </div>
            <Badge variant="secondary" className="num-mono">
              {PERSONAS.length} drivers · {ranked[0].name} leading
            </Badge>
          </div>

          <div className="mt-4 space-y-1.5">
            {ranked.map((p, idx) => {
              const wellnessPct = p.wellness * 100;
              const wellnessColor =
                wellnessPct >= 75
                  ? "from-grab-500 to-grab-400"
                  : wellnessPct >= 55
                  ? "from-cyan-500 to-grab-400"
                  : "from-amber-500 to-rose-400";
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setFilter(p.id)}
                  className={cn(
                    "group w-full flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors p-3 text-left"
                  )}
                >
                  <div className="w-6 text-xs font-mono text-muted-foreground tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.06] grid place-items-center text-lg leading-none">
                    {p.segmentEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      <Badge
                        variant={
                          p.riskTier === "T1"
                            ? "default"
                            : p.riskTier === "T2"
                            ? "info"
                            : "destructive"
                        }
                        className="text-[10px] font-mono px-1.5 py-0"
                      >
                        {p.riskTier}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.segmentLabel} · {p.city} · {p.occupation}
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-0.5 mr-2">
                    <div className="text-xs font-mono text-foreground/80 tabular-nums">
                      {p.currency} {p.cashBalance.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.emergencyRunwayDays}d runway
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">wellness</span>
                      <span className="font-mono tabular-nums text-foreground/80">
                        {wellnessPct.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${wellnessPct}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08 }}
                        className={cn(
                          "h-full bg-gradient-to-r",
                          wellnessColor
                        )}
                      />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-grab-400 group-hover:translate-x-0.5 transition-all" />
                </motion.button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Click a driver to filter the entire app · press{" "}
              <kbd className="font-mono bg-white/[0.04] border border-white/[0.06] rounded px-1">
                1
              </kbd>
              –
              <kbd className="font-mono bg-white/[0.04] border border-white/[0.06] rounded px-1">
                4
              </kbd>{" "}
              for keyboard nav
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/segments">
                Segment deep-dive <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="h-[640px] lg:h-auto">
          <AgentFeed initial={seedAgentActivity(PERSONAS[0])} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {PERSONAS.map((p) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setFilter(p.id)}
            className="group relative overflow-hidden surface p-4 text-left hover:border-grab-500/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/[0.04] grid place-items-center text-lg leading-none">
                {p.segmentEmoji}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {p.segmentLabel}
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              {p.segmentPainPoint}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-mono text-grab-400">
                {p.marketStat}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-grab-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.button>
        ))}
      </div>
    </>
  );
}
