"use client";
import { motion } from "framer-motion";
import type { AgentName } from "@/lib/mace/graph";

interface Props {
  active: AgentName[];
  className?: string;
}

const NODES: Array<{ id: AgentName; x: number; y: number; r: number; label: string; tone: string }> = [
  { id: "Orchestrator", x: 240, y: 50, r: 28, label: "Orchestrator", tone: "#22d3ee" },
  { id: "Analyst", x: 100, y: 165, r: 24, label: "Analyst", tone: "#a855f7" },
  { id: "Coach", x: 240, y: 200, r: 28, label: "Coach", tone: "#00B14F" },
  { id: "Guardian", x: 380, y: 165, r: 24, label: "Guardian", tone: "#f43f5e" },
  { id: "FDT", x: 60, y: 290, r: 22, label: "FDT", tone: "#f59e0b" },
  { id: "RFC", x: 180, y: 320, r: 22, label: "RFC · PPO", tone: "#00B14F" },
  { id: "RAG", x: 320, y: 320, r: 22, label: "RAG · Qdrant", tone: "#3b82f6" },
];

const EDGES: Array<[AgentName, AgentName]> = [
  ["Orchestrator", "Analyst"],
  ["Orchestrator", "Coach"],
  ["Orchestrator", "Guardian"],
  ["Analyst", "FDT"],
  ["Coach", "RFC"],
  ["Coach", "RAG"],
];

export function AgentGraph({ active, className }: Props) {
  const isActive = (id: AgentName) => active.includes(id);
  const edgeActive = ([a, b]: [AgentName, AgentName]) =>
    isActive(a) && isActive(b);

  return (
    <svg viewBox="0 0 480 380" className={className} style={{ width: "100%" }}>
      <defs>
        {NODES.map((n) => (
          <radialGradient id={`g-${n.id}`} key={n.id}>
            <stop offset="0%" stopColor={n.tone} stopOpacity="0.55" />
            <stop offset="100%" stopColor={n.tone} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {EDGES.map(([a, b]) => {
        const A = NODES.find((n) => n.id === a)!;
        const B = NODES.find((n) => n.id === b)!;
        const on = edgeActive([a, b]);
        return (
          <motion.line
            key={`${a}-${b}`}
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={on ? A.tone : "rgba(255,255,255,0.08)"}
            strokeWidth={on ? 2 : 1}
            strokeDasharray={on ? "6 5" : "0"}
            animate={on ? { strokeDashoffset: [0, -22] } : {}}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        );
      })}

      {NODES.map((n) => {
        const on = isActive(n.id);
        return (
          <g key={n.id}>
            {on && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={`url(#g-${n.id})`}
                animate={{ r: [n.r, n.r * 1.6, n.r] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={on ? `${n.tone}25` : "rgba(255,255,255,0.04)"}
              stroke={on ? n.tone : "rgba(255,255,255,0.12)"}
              strokeWidth={on ? 1.6 : 1}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
              fill={on ? n.tone : "rgba(255,255,255,0.5)"}
              fontWeight={600}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
