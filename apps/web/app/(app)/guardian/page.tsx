"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  Globe2,
  Smartphone,
  Activity,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/mockdata";

interface ScoredTx {
  tx: Transaction;
  score: number;
  topFactors: Array<{ feature: string; weight: number; valueLabel: string }>;
}

export default function GuardianPage() {
  const persona = useAppStore((s) => s.getPersona());
  const [scored, setScored] = useState<ScoredTx[]>([]);
  const [running, setRunning] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [source, setSource] = useState<"python" | "ts-fallback" | "—">("—");
  const [runtimeMs, setRuntimeMs] = useState(0);

  const fetchScored = async (injectFraud: boolean) => {
    setRunning(true);
    const r = await fetch("/api/guardian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: persona.id, injectFraud }),
    });
    const j = await r.json();
    setSource(j.source);
    setRuntimeMs(j.runtimeMs ?? 0);
    setScored(j.scored ?? []);
    if (injectFraud) {
      const top = (j.scored ?? []).find((x: ScoredTx) => x.tx.isFraud);
      if (top) setHighlight(top.tx.id);
    }
    setRunning(false);
  };

  useEffect(() => {
    fetchScored(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id]);

  const flagged = useMemo(
    () => scored.filter((s) => s.score > 0.55).sort((a, b) => b.score - a.score),
    [scored]
  );
  const topAlert = flagged[0];

  return (
    <PageShell
      step="STEP 6 · GUARDIAN AGENT"
      title="Pre-hoc fraud mitigation"
      description="Most fraud solutions are post-hoc — detect and block. The Guardian Agent is pre-hoc: Isolation Forest + behavioral drift detection, with SHAP-explained interventions in plain language. Click 'Inject fraud event' to watch a 3am login + large transfer pattern get caught and decomposed."
      rightSlot={
        <>
          <Button onClick={() => fetchScored(false)} variant="glass" size="sm" disabled={running}>
            <Activity className="h-3.5 w-3.5" />
            Re-score stream
          </Button>
          <Button
            onClick={() => fetchScored(true)}
            variant="destructive"
            disabled={running}
          >
            <Zap className="h-4 w-4" />
            {running ? "Scoring…" : "Inject fraud event"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface flex flex-col h-[640px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Live transaction tape</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Isolation Forest scores every transaction · {scored.length} in window
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="num-mono">{source}</Badge>
              <Badge variant="info" className="num-mono">{runtimeMs}ms</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <AnimatePresence initial={false}>
              {scored.map((s) => {
                const flagged = s.score > 0.55;
                const isHighlight = highlight === s.tx.id;
                return (
                  <motion.div
                    key={s.tx.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: isHighlight
                        ? "rgba(244,63,94,0.18)"
                        : flagged
                        ? "rgba(244,63,94,0.06)"
                        : "rgba(255,255,255,0.02)",
                    }}
                    className={cn(
                      "rounded-lg border p-3 grid grid-cols-12 items-center gap-2",
                      flagged
                        ? "border-rose-500/40"
                        : "border-white/[0.05]",
                      isHighlight && "ring-1 ring-rose-500/60 shadow-[0_0_24px_rgba(244,63,94,0.45)]"
                    )}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      {flagged ? (
                        <ShieldAlert className="h-4 w-4 text-rose-300" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-grab-300/80" />
                      )}
                    </div>
                    <div className="col-span-5">
                      <div className="text-sm font-medium truncate">
                        {s.tx.merchant}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="num-mono">{s.tx.id.slice(-10)}</span>
                        <span>·</span>
                        <span>{s.tx.category}</span>
                        <span>·</span>
                        <span>{s.tx.channel}</span>
                      </div>
                    </div>
                    <div className="col-span-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="num-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.tx.features.hour.toString().padStart(2, "0")}:00
                      </span>
                      <span className="num-mono flex items-center gap-1">
                        <Globe2 className="h-3 w-3" />
                        {s.tx.city}
                      </span>
                      <span className="num-mono flex items-center gap-1">
                        <Smartphone className="h-3 w-3" />
                        {s.tx.device}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "col-span-2 text-right text-sm font-medium num-mono",
                        s.tx.amount < 0 ? "text-foreground/85" : "text-grab-300"
                      )}
                    >
                      {s.tx.amount > 0 ? "+" : ""}
                      {formatCurrency(s.tx.amount, persona.currency)}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <span className="num-mono text-[11px] text-muted-foreground w-8 text-right">
                        {s.score.toFixed(2)}
                      </span>
                      <div className="w-3 h-8 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={cn(
                            "w-full rounded-full transition-all",
                            flagged ? "bg-rose-500" : "bg-grab-500/70"
                          )}
                          style={{ height: `${s.score * 100}%`, marginTop: `${(1 - s.score) * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center gap-2 text-xs">
              {topAlert ? (
                <Badge variant="destructive">
                  <ShieldAlert className="h-3 w-3" />
                  Alert active
                </Badge>
              ) : (
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3" />
                  No anomalies
                </Badge>
              )}
              <Badge variant="secondary" className="num-mono">
                Isolation Forest · n=100
              </Badge>
            </div>

            {topAlert ? (
              <>
                <div className="mt-3 text-base font-medium">
                  Pre-hoc anomaly detected
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {topAlert.tx.merchant} · {formatCurrency(topAlert.tx.amount, persona.currency)} · score{" "}
                  <span className="text-foreground/85 num-mono">
                    {topAlert.score.toFixed(2)}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm">
                  Your login at <span className="font-medium">3:00 AM</span> from a{" "}
                  <span className="font-medium">new device in Ho Chi Minh City</span>, combined with a{" "}
                  <span className="font-medium">large transfer</span>, matches patterns we've seen before.
                  We've held the transfer pending your confirmation.
                </div>

                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    SHAP factor decomposition
                  </div>
                  {topAlert.topFactors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs mt-1.5">
                      <span className="flex-1 truncate text-muted-foreground">
                        {f.feature}
                      </span>
                      <span className="num-mono text-[10px] text-muted-foreground w-20 text-right">
                        {f.valueLabel}
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-400"
                          style={{ width: `${f.weight * 100}%` }}
                        />
                      </div>
                      <span className="num-mono w-8 text-right">
                        {(f.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="destructive" size="sm">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Block & alert user
                  </Button>
                  <Button variant="glass" size="sm">
                    Mark safe
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 text-base font-medium">All systems normal</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last sweep · {scored.length} transactions · 0 anomalies
                </div>
                <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground/80 mb-1">
                    Pre-hoc by design
                  </div>
                  Behavioral drift is monitored continuously — typical fraud
                  patterns are flagged 48–72h before the fraud event itself.
                  Press <span className="text-foreground/80">Inject fraud event</span>{" "}
                  to simulate one now.
                </div>
              </>
            )}
          </div>

          <div className="surface p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Why Isolation Forest + SHAP
            </div>
            <div className="mt-2 text-xs text-foreground/80 leading-relaxed">
              Isolation Forest is the gold standard for unsupervised anomaly
              detection without labelled fraud data — sparse in new user
              cohorts. SHAP turns "your account was flagged" into the plain-language
              explanation above, building user trust.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
