"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, User, Activity, Brain } from "lucide-react";
import { AgentGraph } from "@/components/mace/agent-graph";
import { ReasoningPane } from "@/components/mace/reasoning-pane";
import type { AgentName, MACEState } from "@/lib/mace/graph";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  state?: MACEState;
  llm?: { provider: string; model: string; latencyMs: number };
}

export default function MACEPage() {
  const persona = useAppStore((s) => s.getPersona());
  const setTel = useAppStore((s) => s.setTelemetry);
  const demoQuery = useAppStore((s) => s.demoQuery);
  const consumeDemoQuery = useAppStore((s) => s.consumeDemoQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<AgentName[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);

  const headlinePrompts = [
    "I want to take this weekend off.",
    "Can I afford the new phone?",
    "Will I make rent next month?",
    "What if my platform cuts commission by 15%?",
    "I just got a suspicious login alert.",
  ];

  async function send(text: string) {
    if (!text.trim() || running) return;
    setRunning(true);
    setActive(["Orchestrator"]);
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLogLines([]);

    // Animate the agent graph stages while we wait for the API
    const stages: AgentName[][] = [
      ["Orchestrator"],
      ["Orchestrator", "Analyst", "Coach"],
      ["Orchestrator", "Analyst", "Coach", "FDT"],
      ["Orchestrator", "Analyst", "Coach", "FDT", "RFC"],
      ["Orchestrator", "Analyst", "Coach", "FDT", "RFC", "RAG"],
      ["Coach"],
    ];
    let stageIdx = 0;
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stages.length - 1, stageIdx + 1);
      setActive(stages[stageIdx]);
    }, 380);

    try {
      const r = await fetch("/api/mace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona.id, input: text }),
      });
      const j = await r.json();
      const state: MACEState = j.state;
      setLogLines(state.log);
      setTel("llm", j.llm.latencyMs);
      // Stream the assistant text out token-ish
      const reply = state.llmDraft ?? "";
      const tokens = reply.split(/(\s+)/);
      let i = 0;
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "", state, llm: j.llm },
      ]);
      const stream = setInterval(() => {
        i++;
        setMessages((m) => {
          const out = [...m];
          out[out.length - 1] = {
            ...out[out.length - 1],
            text: tokens.slice(0, i).join(""),
          };
          return out;
        });
        if (i >= tokens.length) clearInterval(stream);
      }, 28);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Connection error — falling back to grounded template." },
      ]);
    } finally {
      clearInterval(stageTimer);
      setActive([]);
      setRunning(false);
    }
  }

  // Auto-fire scripted queries pushed by the global Demo Mode runner. The
  // store value is "consumed" (cleared) on read so the same query never
  // re-fires on hot-reload or re-mount.
  useEffect(() => {
    if (!demoQuery || running) return;
    const q = consumeDemoQuery();
    if (q) send(q);
    // `send` and `persona` are intentionally omitted — we only want this to
    // react to a fresh demoQuery being pushed into the store, not to
    // re-fire on persona swap or unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoQuery]);

  return (
    <PageShell
      step="STEP 4 · MULTI-AGENT CHAT (MACE)"
      title="LangGraph state machine · live"
      description="Each user turn flows through the typed MACE state. Watch the routing graph light up, the reasoning log scroll, and SHAP attribution attach — all of which is persisted to the audit trail and ready for MAS FEAT review."
      rightSlot={
        <Badge variant="info" className="num-mono">
          <Activity className="h-3 w-3" />
          {persona.language}
        </Badge>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 surface flex flex-col h-[640px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-grab-500 to-cyan-500 grid place-items-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium">Coach Agent</div>
                <div className="text-[11px] text-muted-foreground">
                  Groq · LLaMA 3.3 70B · grounded in {persona.name}'s FDT snapshot
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.at(-1)?.llm && (
                <Badge variant="info" className="num-mono">
                  {messages.at(-1)!.llm!.provider} · {messages.at(-1)!.llm!.latencyMs}ms
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <div className="grid place-items-center h-full">
                <div className="text-center max-w-md">
                  <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-grab-500/30 to-cyan-500/30 grid place-items-center text-2xl">
                    {persona.segmentEmoji}
                  </div>
                  <div className="mt-3 text-sm font-medium">
                    Hi — I'm {persona.name}'s Coach.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Try one of the headline prompts below or type your own.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                    {headlinePrompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="text-[11px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-2", m.role === "user" ? "justify-end" : "")}
                >
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 rounded-md bg-grab-500/15 border border-grab-500/30 grid place-items-center text-grab-300 shrink-0">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-grab-500/15 border border-grab-500/30 text-grab-100 rounded-br-sm"
                        : "bg-white/[0.04] border border-white/[0.06] rounded-bl-sm"
                    )}
                  >
                    {m.text || (
                      <span className="opacity-60">…thinking</span>
                    )}
                    {m.state?.shap && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Brain className="h-3 w-3" /> SHAP attribution
                        </div>
                        {m.state.shap.map((s, k) => (
                          <div key={k} className="flex items-center gap-2 text-[11px]">
                            <span className="flex-1 truncate text-muted-foreground">{s.feature}</span>
                            <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-grab-500 to-cyan-400"
                                style={{ width: `${s.weight * 100}%` }}
                              />
                            </div>
                            <span className="num-mono w-8 text-right text-foreground/80">
                              {(s.weight * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.state?.selectedAction && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-1.5 text-[10px]">
                        <span className="pill bg-grab-500/10 border border-grab-500/30 text-grab-300">
                          RFC · {m.state.selectedAction.action.code}
                        </span>
                        <span className="pill bg-white/[0.04] border border-white/[0.06]">
                          reward {m.state.selectedAction.expectedReward.toFixed(2)}
                        </span>
                        {m.state?.simulation && (
                          <span className="pill bg-white/[0.04] border border-white/[0.06]">
                            sim · {m.state.simulation.paths} paths · {(m.state.simulation.shortfallProb * 100).toFixed(0)}% shortfall
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="h-7 w-7 rounded-md bg-white/[0.04] border border-white/[0.06] grid place-items-center shrink-0">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="p-4 border-t border-white/[0.06] flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={`Ask ${persona.name}'s Coach…`}
              disabled={running}
            />
            <Button onClick={() => send(input)} disabled={running || !input.trim()}>
              <Send className="h-4 w-4" />
              {running ? "Routing…" : "Send"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface p-4">
            <ReasoningPane lines={logLines} />
          </div>

          <div className="surface p-4">
            <div className="text-xs font-medium mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-grab-500 animate-pulse" />
              Agent routing graph
            </div>
            <AgentGraph active={active} />
            <div className="text-[11px] text-muted-foreground">
              Pulse = currently active node · dashed edges = live data flow.
              Mirrors the LangGraph state machine in <code>lib/mace/graph.ts</code>.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
