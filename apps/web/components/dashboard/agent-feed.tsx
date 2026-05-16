"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn, nowTs } from "@/lib/utils";
import type { AgentActivity } from "@/lib/mockdata";

const colorFor = (a: string) =>
  ({
    Orchestrator: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    Coach: "border-grab-500/30 bg-grab-500/10 text-grab-300",
    Analyst: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    Guardian: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    FDT: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    RFC: "border-grab-500/30 bg-grab-500/10 text-grab-300",
    RAG: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  } as Record<string, string>);

export function AgentFeed({ initial }: { initial: AgentActivity[] }) {
  const [items, setItems] = useState<AgentActivity[]>(initial);

  // simulate live agent chatter every few seconds
  useEffect(() => {
    const beats: Array<Pick<AgentActivity, "agent" | "text" | "latencyMs">> = [
      { agent: "Guardian", text: "Stream tick · 4 tx scored · 0 anomalies", latencyMs: 11 },
      { agent: "FDT", text: "Cache warm · last weekly rebuild < 1h ago", latencyMs: 6 },
      { agent: "RFC", text: "Policy stable · KL divergence 0.018 · clipped", latencyMs: 22 },
      { agent: "RAG", text: "Qdrant index hit · 2 docs · 3.4ms", latencyMs: 3 },
      { agent: "Orchestrator", text: "Idle · awaiting intent", latencyMs: 1 },
    ];
    let i = 0;
    const id = setInterval(() => {
      const b = beats[i % beats.length];
      i++;
      setItems((cur) =>
        [
          {
            id: `live_${Date.now()}_${i}`,
            agent: b.agent as AgentActivity["agent"],
            text: b.text,
            latencyMs: b.latencyMs,
            ts: Date.now(),
          },
          ...cur,
        ].slice(0, 30)
      );
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="surface flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-grab-500 animate-pulse shadow-[0_0_8px_rgba(0,177,79,0.7)]" />
          <span className="text-sm font-medium">Agent Activity</span>
        </div>
        <Badge variant="secondary" className="num-mono">live</Badge>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <motion.div
                key={i.id}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("pill border", colorFor(i.agent))}>
                    {i.agent}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 num-mono">
                    {i.latencyMs ? `${i.latencyMs}ms` : ""}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-foreground/85">{i.text}</div>
                <div className="text-[10px] text-muted-foreground/60 mt-1 num-mono">
                  {nowTs()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
