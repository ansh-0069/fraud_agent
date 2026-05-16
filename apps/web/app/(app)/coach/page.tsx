"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { ACTIONS, ACTION_FAMILIES, type ActionFamily } from "@/lib/actions";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Brain, Play, Sparkles } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface CoachReco {
  candidates: Array<{
    code: string;
    label: string;
    family: string;
    reward: number;
    amount?: number;
    rationale: string;
    shap: Array<{ feature: string; weight: number }>;
  }>;
  policy: {
    method: string;
    klDiv: number;
    clipFraction: number;
    explainedVariance: number;
  };
  trainingCurve: number[]; // mean reward per epoch (replay)
  source: "python" | "ts-fallback";
  runtimeMs: number;
}

const familyColor: Record<ActionFamily, string> = {
  Savings: "#00B14F",
  Income: "#22d3ee",
  Loan: "#f59e0b",
  Insurance: "#a855f7",
  Spending: "#f43f5e",
  Tax: "#3b82f6",
  Education: "#fb7185",
  Wellness: "#34d399",
};

export default function CoachLab() {
  const persona = useAppStore((s) => s.getPersona());
  const [intent, setIntent] = useState("SCHEDULE_CHANGE_REQUEST");
  const [reco, setReco] = useState<CoachReco | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const r = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: persona.id, intent }),
    });
    const j = await r.json();
    setReco(j);
    setRunning(false);
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id]);

  const grouped = useMemo(() => {
    const g: Record<ActionFamily, typeof ACTIONS> = {
      Savings: [],
      Income: [],
      Loan: [],
      Insurance: [],
      Spending: [],
      Tax: [],
      Education: [],
      Wellness: [],
    };
    ACTIONS.forEach((a) => g[a.family].push(a));
    return g;
  }, []);

  const selectedCodes = new Set(reco?.candidates.map((c) => c.code));
  const top = reco?.candidates[0];

  return (
    <PageShell
      step="STEP 5 · RL COACH LAB"
      title="PPO over a 72-action vocabulary"
      description="The RFC operates on the user's FDT state and learns which interventions move the financial-stability reward forward — per segment, per individual. Every recommendation is bounded to this fixed action vocabulary so the agent cannot invent new actions (a hard guardrail from the solution doc)."
      rightSlot={
        <>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-sm focus:outline-none focus:border-grab-500/60"
          >
            <option value="SCHEDULE_CHANGE_REQUEST">SCHEDULE_CHANGE_REQUEST</option>
            <option value="WHAT_IF_QUESTION">WHAT_IF_QUESTION</option>
            <option value="LOAN_INQUIRY">LOAN_INQUIRY</option>
            <option value="SAVINGS_GOAL">SAVINGS_GOAL</option>
            <option value="FRAUD_REPORT">FRAUD_REPORT</option>
          </select>
          <Button onClick={run} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? "Inferring…" : "Run policy"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">72-action vocabulary heatmap</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                8 families × 9 actions · highlighted cells are the policy's top picks for this state
              </div>
            </div>
            {reco && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="num-mono">{reco.source}</Badge>
                <Badge variant="info" className="num-mono">{reco.runtimeMs}ms</Badge>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            {ACTION_FAMILIES.map((fam) => (
              <div key={fam} className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-2 text-[11px] flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: familyColor[fam] }}
                  />
                  <span className="text-muted-foreground">{fam}</span>
                </div>
                <div className="col-span-10 grid grid-cols-9 gap-1">
                  {grouped[fam].map((a) => {
                    const sel = selectedCodes.has(a.code);
                    const isTop = top?.code === a.code;
                    const reward =
                      reco?.candidates.find((c) => c.code === a.code)?.reward ??
                      0;
                    return (
                      <motion.div
                        key={a.code}
                        initial={{ opacity: 0.5 }}
                        animate={{
                          opacity: sel ? 1 : 0.4,
                          scale: isTop ? 1.05 : 1,
                        }}
                        className={cn(
                          "h-9 rounded-md border relative group",
                          sel
                            ? "ring-1"
                            : "border-white/[0.05] bg-white/[0.02]"
                        )}
                        style={{
                          borderColor: sel ? familyColor[fam] : undefined,
                          background: sel
                            ? `${familyColor[fam]}1f`
                            : undefined,
                          boxShadow: isTop
                            ? `0 0 24px ${familyColor[fam]}55`
                            : undefined,
                        }}
                        title={`${a.code} · ${a.label}${sel ? ` · reward ${reward.toFixed(2)}` : ""}`}
                      >
                        {sel && (
                          <div className="absolute inset-0 grid place-items-center text-[10px] font-medium text-foreground/90 num-mono">
                            {reward.toFixed(2)}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {reco && top && (
            <div className="mt-5 rounded-xl border border-grab-500/30 bg-grab-500/5 p-4">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="default">
                  <Sparkles className="h-3 w-3" />
                  Selected action
                </Badge>
                <Badge variant="secondary" className="num-mono">
                  {top.code}
                </Badge>
                <Badge variant="info" className="num-mono">
                  reward {top.reward.toFixed(2)}
                </Badge>
                {top.amount !== undefined && top.amount > 0 && (
                  <Badge variant="warning" className="num-mono">
                    {formatCurrency(top.amount, persona.currency)}
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-sm text-foreground/85">{top.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {top.rationale}
              </div>

              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Brain className="h-3 w-3" /> SHAP factor decomposition
                </div>
                <div className="space-y-1.5">
                  {top.shap.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate text-muted-foreground">
                        {s.feature}
                      </span>
                      <div className="w-44 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-grab-500 to-cyan-400"
                          style={{ width: `${s.weight * 100}%` }}
                        />
                      </div>
                      <span className="num-mono w-10 text-right">
                        {(s.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface p-5">
            <div className="text-sm font-medium">PPO policy stats</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Stat label="Method" value={reco?.policy.method ?? "PPO"} />
              <Stat label="KL divergence" value={(reco?.policy.klDiv ?? 0.018).toFixed(3)} />
              <Stat label="Clip fraction" value={(reco?.policy.clipFraction ?? 0.12).toFixed(2)} />
              <Stat label="Expl. variance" value={(reco?.policy.explainedVariance ?? 0.71).toFixed(2)} />
            </div>
            <div className="mt-4 text-[11px] text-muted-foreground">
              Why PPO over DQN: large action space + delayed rewards. PPO's stable
              policy updates and clipping prevent reckless recommendation swings on
              noisy reward signals (pdfcrowd.pdf §03).
            </div>
          </div>

          <div className="surface p-5">
            <div className="text-sm font-medium mb-2">Training reward curve</div>
            <CurveSpark data={reco?.trainingCurve ?? []} />
            <div className="text-[11px] text-muted-foreground mt-2">
              Replay of the cached PPO training run · models/ppo_coach.zip
            </div>
          </div>

          <div className="surface p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Top-3 action candidates
            </div>
            {reco?.candidates.map((c, i) => (
              <div key={i} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="num-mono">{c.code}</span>
                  <span className="num-mono text-grab-300">{c.reward.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 truncate">
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function CurveSpark({ data }: { data: number[] }) {
  if (!data.length) {
    return <div className="h-20 grid place-items-center text-[11px] text-muted-foreground">no curve</div>;
  }
  const w = 280;
  const h = 80;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 80 }}>
      <defs>
        <linearGradient id="curve-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00B14F" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#00B14F" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#curve-g)" />
      <polyline points={pts} stroke="#00B14F" strokeWidth={1.6} fill="none" />
    </svg>
  );
}
