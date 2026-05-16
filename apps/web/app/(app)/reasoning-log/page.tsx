"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Activity,
  Brain,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import { cn, formatCurrency, shortHash } from "@/lib/utils";
import {
  getScenario,
  type PersonaScenario,
  type Step,
} from "@/lib/reasoning-scenarios";

export default function ReasoningLogPage() {
  const persona = useAppStore((s) => s.getPersona());
  const scenario: PersonaScenario = useMemo(
    () => getScenario(persona),
    [persona]
  );
  const STEPS = scenario.steps;
  const meta = scenario.meta;

  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [typedLines, setTypedLines] = useState<string[][]>(
    STEPS.map(() => [])
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when persona changes
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setTypedLines(STEPS.map(() => []));
    setStepIdx(0);
    setPlaying(false);
  }, [persona.id, STEPS.length]);

  // Type the current step's lines progressively
  useEffect(() => {
    if (!playing) return;
    const step = STEPS[stepIdx];
    let lineI = 0;
    let charI = 0;
    setTypedLines((cur) => {
      const out = [...cur];
      out[stepIdx] = step.lines.map(() => "");
      return out;
    });
    const tick = () => {
      const line = step.lines[lineI];
      if (charI < line.length) {
        charI++;
        setTypedLines((cur) => {
          const out = cur.map((c) => [...c]);
          out[stepIdx][lineI] = line.slice(0, charI);
          return out;
        });
        timer.current = setTimeout(tick, 8);
      } else {
        lineI++;
        charI = 0;
        if (lineI < step.lines.length) {
          timer.current = setTimeout(tick, 80);
        } else {
          // step complete — auto advance after pause
          if (stepIdx < STEPS.length - 1) {
            advanceTimer.current = setTimeout(() => {
              setStepIdx((s) => s + 1);
            }, 1100);
          } else {
            setPlaying(false);
          }
        }
      }
    };
    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [playing, stepIdx, STEPS]);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setTypedLines(STEPS.map(() => []));
    setStepIdx(0);
    setPlaying(false);
  };

  const currentStep = STEPS[stepIdx];

  return (
    <PageShell
      step="STEP 7 · REASONING LOG · CINEMATIC REPLAY"
      title={`${persona.name}'s session #${meta.sessionId} · live`}
      description={
        <>
          The 8-step reasoning trace plays out exactly as the agent system
          would generate it for{" "}
          <span className="text-foreground">
            {persona.name} · {persona.segmentLabel} · {persona.city}
          </span>{" "}
          — Orchestrator → Analyst (FDT) → RFC (PPO) → Coach (RAG + LLM) →
          SHAP → Audit. Switch persona on{" "}
          <span className="text-foreground">/personas</span> to see a different
          scenario.
        </>
      }
      rightSlot={
        <>
          <Badge variant="secondary" className="num-mono">
            {persona.segmentEmoji} {persona.name}
          </Badge>
          <Button variant="glass" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          {!playing ? (
            <Button onClick={() => setPlaying(true)}>
              <Play className="h-4 w-4" />
              Play
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setPlaying(false)}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          <Button
            variant="glass"
            size="sm"
            onClick={() =>
              setStepIdx((s) => Math.min(STEPS.length - 1, s + 1))
            }
          >
            Step <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* steps left rail */}
        <div className="space-y-2">
          {STEPS.map((s, i) => {
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <motion.button
                key={i}
                onClick={() => setStepIdx(i)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition-all relative overflow-hidden",
                  active
                    ? "border-grab-500/60 bg-grab-500/5 shadow-[0_0_24px_-12px_rgba(0,177,79,0.7)]"
                    : done
                    ? "border-white/[0.08] bg-white/[0.02]"
                    : "border-white/[0.05] bg-white/[0.01] opacity-70"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full grid place-items-center text-[11px] font-medium",
                      active
                        ? "bg-grab-500 text-white shadow-[0_0_16px_rgba(0,177,79,0.6)]"
                        : done
                        ? "bg-grab-500/15 text-grab-300 border border-grab-500/30"
                        : "bg-white/[0.04] text-muted-foreground border border-white/[0.06]"
                    )}
                  >
                    {s.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {s.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground num-mono">
                      {s.agent}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* center: terminal log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="default">{currentStep.badge}</Badge>
                <span className="font-medium">{currentStep.title}</span>
              </div>
              <Badge variant="secondary" className="num-mono">
                <Activity className="h-3 w-3" /> session #{meta.sessionId}
              </Badge>
            </div>

            <div className="terminal mt-3 min-h-[260px]">
              <div className="text-muted-foreground/70">
                # === NexusWallet MACE · Reasoning Log · Session #
                {meta.sessionId} · {persona.name} ===
              </div>
              <AnimatePresence>
                {typedLines[stepIdx].map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "whitespace-pre-wrap mt-1",
                      line.startsWith("[ORCHESTRATOR]")
                        ? "text-cyan-300"
                        : line.startsWith("[ANALYST]") ||
                          line.startsWith("[FDT]")
                        ? "text-violet-300"
                        : line.startsWith("[RFC")
                        ? "text-grab-300"
                        : line.startsWith("[COACH") ||
                          line.startsWith("[RESPONSE")
                        ? "text-grab-300"
                        : line.startsWith("[RAG]")
                        ? "text-blue-300"
                        : line.startsWith("[SIMULATION]") ||
                          line.startsWith("- WARNING")
                        ? "text-amber-300"
                        : line.startsWith("[EXPLAINABILITY]")
                        ? "text-fuchsia-300"
                        : line.startsWith("[AUDIT]")
                        ? "text-emerald-300"
                        : "text-foreground/80"
                    )}
                  >
                    {line}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <ArtifactPanel step={currentStep} scenario={scenario} />
        </div>
      </div>
    </PageShell>
  );
}

function ArtifactPanel({
  step,
  scenario,
}: {
  step: Step;
  scenario: PersonaScenario;
}) {
  const persona = useAppStore((s) => s.getPersona());
  const meta = scenario.meta;
  const projectedIncome = Math.round(
    persona.weeklyIncome.slice(-3).reduce((a, b) => a + b, 0) / 3
  );

  switch (step.artifact) {
    case "intent":
      return (
        <div className="surface p-5">
          <div className="text-xs font-medium mb-2 flex items-center gap-2">
            <ScrollText className="h-3.5 w-3.5" /> Intent classifier output
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Box label="value" value={meta.intent} tone="cyan" />
            <Box
              label="confidence"
              value={meta.intentConfidence.toFixed(2)}
              tone="grab"
            />
            <Box label="route" value={meta.routing.replace("_AGENT", "")} tone="violet" />
          </div>
        </div>
      );
    case "fdt":
      return (
        <div className="surface p-5">
          <div className="text-xs font-medium mb-2 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" /> FDT snapshot · Redis JSON
          </div>
          <pre className="text-[11px] text-grab-300 font-mono leading-relaxed bg-ink-950/60 rounded-lg p-3 border border-white/[0.05] overflow-x-auto">
{`{
  "user_id": "${meta.sessionId}",
  "segment": "${persona.segmentId}",
  "city": "${persona.city}",
  "cash_balance": ${persona.cashBalance},
  "projected_weekly_income": ${projectedIncome},
  "obligation": { "label": "${persona.obligation.label}", "amount": ${persona.obligation.amount}, "days_out": ${persona.obligation.daysOut} },
  "emergency_runway_days": ${persona.emergencyRunwayDays},
  "fdt_confidence": ${persona.fdtConfidence.toFixed(2)},
  "history_weeks": ${persona.weeklyIncome.length},
  "language": "${persona.language}"
}`}
          </pre>
        </div>
      );
    case "sim":
      return (
        <div className="surface p-5">
          <div className="text-xs font-medium mb-2 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" /> Monte Carlo ·{" "}
            {meta.sim.paths.toLocaleString()} paths
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Box
              label="P50 gap"
              value={formatCurrency(meta.sim.p50Gap, persona.currency)}
              tone={meta.sim.p50Gap > 0 ? "amber" : "grab"}
            />
            <Box
              label="P80 gap"
              value={formatCurrency(meta.sim.p80Gap, persona.currency)}
              tone={meta.sim.p80Gap > 0 ? "rose" : "grab"}
            />
            <Box
              label="shortfall paths"
              value={`${meta.sim.shortfallProbPct}%`}
              tone={
                meta.sim.shortfallProbPct >= 70
                  ? "rose"
                  : meta.sim.shortfallProbPct >= 40
                  ? "amber"
                  : "grab"
              }
            />
          </div>
        </div>
      );
    case "rfc":
      return (
        <div className="surface p-5">
          <div className="text-xs font-medium mb-2 flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" /> RFC · top-3 actions
          </div>
          <div className="space-y-2">
            {meta.rfc.map((a, i) => (
              <div
                key={a.code}
                className={cn(
                  "rounded-lg border p-2.5 text-xs flex items-center gap-3",
                  i === 0
                    ? "border-grab-500/40 bg-grab-500/5"
                    : "border-white/[0.05] bg-white/[0.02]"
                )}
              >
                <span className="num-mono w-4 text-muted-foreground">
                  #{i + 1}
                </span>
                <span className="num-mono flex-1 truncate">{a.code}</span>
                <span className="text-muted-foreground hidden md:block truncate max-w-[200px]">
                  {a.note}
                </span>
                <span className="num-mono text-grab-300 w-12 text-right">
                  {a.reward.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case "rag":
      return (
        <div className="surface p-5">
          <div className="text-xs font-medium mb-2">RAG · retrieved docs</div>
          <div className="space-y-2 text-xs">
            {meta.rag.map((d, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5"
              >
                <div
                  className={cn(
                    "num-mono",
                    i === 0 ? "text-grab-300" : "text-blue-300"
                  )}
                >
                  {d.source}
                </div>
                <div className="text-muted-foreground mt-0.5">{d.snippet}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "llm":
      return (
        <div className="surface p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium">
              Coach response · grounded · {persona.language}
            </div>
            <Badge variant="info" className="num-mono">
              {meta.llmLatencyMs} ms · Groq
            </Badge>
          </div>
          <div className="rounded-xl border border-grab-500/30 bg-grab-500/5 p-4 text-sm leading-relaxed">
            "{meta.llmResponse}"
          </div>
        </div>
      );
    case "shap":
      return (
        <div className="surface p-5">
          <div className="text-xs font-medium mb-2 flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" /> SHAP attribution
          </div>
          {meta.shap.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs mt-1.5">
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
      );
    case "audit":
      const ts = new Date().toISOString();
      const fdtHash = shortHash(`${persona.id}-fdt-${meta.sessionId}`, 12);
      const promptHash = shortHash(`${persona.id}-prompt-${meta.sessionId}`, 12);
      const respHash = shortHash(`${persona.id}-resp-${meta.sessionId}`, 12);
      return (
        <div className="surface p-5">
          <div className="text-xs font-medium mb-2 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Audit row · committed
          </div>
          <pre className="text-[11px] font-mono text-emerald-300 bg-ink-950/60 rounded-lg p-3 border border-white/[0.05] overflow-x-auto">
{`session_id      : ${meta.sessionId}
user_id         : ${persona.id}
timestamp       : ${ts}
fdt_snapshot    : sha256:${fdtHash}…b714
rl_action_id    : ${meta.auditAction}
llm_prompt      : sha256:${promptHash}…aa48
llm_response    : sha256:${respHash}…1a07
shap_factors    : ${meta.shap.length}
status          : COMMITTED  (MAS FEAT-ready)`}
          </pre>
        </div>
      );
  }
}

function Box({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  const accents: Record<string, string> = {
    grab: "border-grab-500/30 bg-grab-500/5 text-grab-300",
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    rose: "border-rose-500/30 bg-rose-500/5 text-rose-300",
    violet: "border-violet-500/30 bg-violet-500/5 text-violet-300",
  };
  return (
    <div className={cn("rounded-lg border p-3", accents[tone])}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium num-mono break-all">{value}</div>
    </div>
  );
}
