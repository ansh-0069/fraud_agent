"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Props {
  lines: string[];
  className?: string;
}

const colorFor = (line: string): string => {
  if (line.startsWith("[ORCHESTRATOR]")) return "text-cyan-300";
  if (line.startsWith("[ANALYST]")) return "text-violet-300";
  if (line.startsWith("[COACH]") || line.startsWith("[RESPONSE")) return "text-grab-300";
  if (line.startsWith("[GUARDIAN]")) return "text-rose-300";
  if (line.startsWith("[FDT]")) return "text-amber-300";
  if (line.startsWith("[RFC")) return "text-grab-300";
  if (line.startsWith("[RAG]")) return "text-blue-300";
  if (line.startsWith("[SIMULATION]")) return "text-amber-300";
  if (line.startsWith("[EXPLAINABILITY]")) return "text-fuchsia-300";
  if (line.startsWith("[AUDIT]")) return "text-emerald-300";
  if (line.startsWith("- WARNING")) return "text-rose-300";
  if (line.startsWith("-")) return "text-foreground/70";
  return "text-foreground/70";
};

export function ReasoningPane({ lines, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-grab-500 animate-pulse" />
          NexusWallet · MACE · live reasoning trace
        </div>
        <div className="text-[10px] text-muted-foreground/70 num-mono">
          {lines.length} lines · ws://mace
        </div>
      </div>
      <div
        ref={ref}
        className="terminal h-[440px] overflow-y-auto"
      >
        {lines.length === 0 && (
          <div className="text-muted-foreground/60">
            # === MACE · Reasoning Log ===
            <br />
            # Awaiting user input…
          </div>
        )}
        {lines.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            className={`whitespace-pre-wrap ${colorFor(l)}`}
          >
            {l}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
