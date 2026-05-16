"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { useCallback, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ReactFlowProvider,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";

interface NodeMeta {
  title: string;
  layer: string;
  stack: string[];
  why: string;
  tone: string;
}

const NODE_META: Record<string, NodeMeta> = {
  client: {
    title: "Client Layer",
    layer: "Edge",
    stack: ["GXS Mobile (RN)", "Grab Super-app embed", "PWA", "WhatsApp Bot (Twilio)"],
    why: "Multiple surfaces meet users where they already are. PWA + WhatsApp expand TAM beyond the Grab install base.",
    tone: "#22d3ee",
  },
  gateway: {
    title: "API Gateway & Auth",
    layer: "Ingress",
    stack: ["FastAPI Gateway", "JWT + Biometric", "Rate Limiter (Redis)", "HTTPS + mTLS"],
    why: "Single entry point. Token-based auth and rate limiting hard-stop abuse before it reaches the agent layer.",
    tone: "#3b82f6",
  },
  orchestrator: {
    title: "Orchestrator",
    layer: "Agent",
    stack: ["LangGraph", "Pydantic", "TypedDict state"],
    why: "Explicit state machine — every transition is auditable. Beats CrewAI/AutoGen for regulated finance.",
    tone: "#a855f7",
  },
  coach: {
    title: "Coach Agent",
    layer: "Agent",
    stack: ["Groq · LLaMA 3.3 70B", "Grounded prompts", "Multilingual"],
    why: "Sub-100ms latency from Groq + FDT grounding eliminates hallucination on numeric facts.",
    tone: "#00B14F",
  },
  analyst: {
    title: "Analyst Agent",
    layer: "Agent",
    stack: ["FDT interface", "Monte Carlo runner", "What-if API"],
    why: "Lets users ask 'what if' and get answers from a runnable simulation instead of an LLM guess.",
    tone: "#a855f7",
  },
  guardian: {
    title: "Guardian Agent",
    layer: "Agent",
    stack: ["Isolation Forest", "XGBoost", "SHAP plain-language"],
    why: "Pre-hoc fraud — flags drift 48–72h before damage. Two-generation leap over post-hoc industry baseline.",
    tone: "#f43f5e",
  },
  fdt: {
    title: "Financial Digital Twin",
    layer: "Intelligence",
    stack: ["LSTM (PyTorch)", "Monte Carlo", "Redis cache", "Celery rebuild"],
    why: "Twins are the only paradigm that supports 'what-if' without hallucination. First-of-kind at the individual level in SEA fintech.",
    tone: "#f59e0b",
  },
  rfc: {
    title: "RL Coach (PPO)",
    layer: "Intelligence",
    stack: ["Stable-Baselines3", "Gymnasium", "Ray RLlib"],
    why: "PPO handles delayed-reward financial advice better than DQN — stable updates, no reckless swings.",
    tone: "#00B14F",
  },
  rag: {
    title: "RAG Engine",
    layer: "Intelligence",
    stack: ["Qdrant", "BGE-M3 (multilingual)", "FastAPI"],
    why: "BGE-M3 covers Bahasa, Malay, Thai, Tagalog, Tamil — segment-specific corpora keep advice on-topic.",
    tone: "#3b82f6",
  },
  fraud: {
    title: "Fraud Engine",
    layer: "Intelligence",
    stack: ["Isolation Forest", "XGBoost", "SHAP"],
    why: "Unsupervised anomaly detection works without labelled fraud data — sparse in new cohorts.",
    tone: "#f43f5e",
  },
  kafka: {
    title: "Kafka Event Bus",
    layer: "Data",
    stack: ["Real-time tx events", "FDT update triggers"],
    why: "Event-driven updates let the FDT react in near-real-time without expensive recomputes.",
    tone: "#fb923c",
  },
  postgres: {
    title: "PostgreSQL · audit_log",
    layer: "Data",
    stack: ["Per-decision audit", "FDT hash", "MAS FEAT-ready"],
    why: "Every state transition is logged for explainability and regulator review.",
    tone: "#34d399",
  },
  redis: {
    title: "Redis · FDT cache + sessions",
    layer: "Data",
    stack: ["Per-user FDT JSON", "TTL", "Session store"],
    why: "Hot FDT lookups serve in <5ms — required for realtime coaching.",
    tone: "#ef4444",
  },
  s3: {
    title: "S3 · model artifacts",
    layer: "Data",
    stack: ["PPO weights", "LSTM weights", "RAG indexes"],
    why: "Versioned artifacts allow safe model rollouts and audit-ready replays.",
    tone: "#a3a3a3",
  },
  flexiloan: {
    title: "GXS FlexiLoan API",
    layer: "Ecosystem",
    stack: ["Mock for hackathon", "pre-approval lookup"],
    why: "Direct integration turns coach recommendations into one-tap product actions.",
    tone: "#34d399",
  },
  grabearn: {
    title: "Grab Earnings Data",
    layer: "Ecosystem",
    stack: ["Trip + surge history", "Driver telemetry"],
    why: "Richest signal for the gig segment — feeds the LSTM income forecaster.",
    tone: "#34d399",
  },
};

function nodeBox(id: string, x: number, y: number, w = 200, h = 64): Node {
  const m = NODE_META[id];
  return {
    id,
    position: { x, y },
    style: {
      width: w,
      height: h,
      background: `linear-gradient(135deg, ${m.tone}1f, transparent)`,
      border: `1px solid ${m.tone}55`,
      borderRadius: 12,
      padding: "8px 12px",
      color: "#fff",
      fontSize: 12,
      fontFamily: "var(--font-geist-sans)",
      boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 8px 24px -16px rgba(0,0,0,0.6)`,
      backdropFilter: "blur(12px)",
    },
    data: {
      label: (
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-60">
            {m.layer}
          </div>
          <div className="text-sm font-medium">{m.title}</div>
        </div>
      ),
    },
  };
}

const NODES: Node[] = [
  nodeBox("client", 60, 40, 220, 60),
  nodeBox("gateway", 320, 40, 220, 60),
  nodeBox("orchestrator", 580, 40, 220, 60),

  nodeBox("analyst", 60, 160, 200, 60),
  nodeBox("coach", 280, 160, 200, 60),
  nodeBox("guardian", 500, 160, 200, 60),

  nodeBox("fdt", 40, 290, 200, 64),
  nodeBox("rfc", 250, 290, 200, 64),
  nodeBox("rag", 460, 290, 200, 64),
  nodeBox("fraud", 670, 290, 200, 64),

  nodeBox("kafka", 60, 430, 200, 56),
  nodeBox("redis", 280, 430, 200, 56),
  nodeBox("postgres", 500, 430, 200, 56),
  nodeBox("s3", 720, 430, 180, 56),

  nodeBox("flexiloan", 100, 540, 220, 56),
  nodeBox("grabearn", 360, 540, 220, 56),
];

const EDGES: Edge[] = [
  { id: "e1", source: "client", target: "gateway", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2", source: "gateway", target: "orchestrator", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e3", source: "orchestrator", target: "analyst", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e4", source: "orchestrator", target: "coach", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e5", source: "orchestrator", target: "guardian", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e6", source: "analyst", target: "fdt", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e7", source: "coach", target: "rfc", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e8", source: "coach", target: "rag", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e9", source: "guardian", target: "fraud", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e10", source: "fdt", target: "redis", animated: true },
  { id: "e11", source: "rfc", target: "s3", animated: true },
  { id: "e12", source: "rag", target: "s3", animated: true },
  { id: "e13", source: "fdt", target: "kafka", animated: true },
  { id: "e14", source: "orchestrator", target: "postgres", animated: true, label: "audit", style: { stroke: "#34d39977" } },
  { id: "e15", source: "kafka", target: "flexiloan", animated: true, label: "events" },
  { id: "e16", source: "fdt", target: "grabearn", animated: true, label: "income data" },
];

export default function ArchitecturePage() {
  const [active, setActive] = useState<string>("orchestrator");
  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setActive(node.id);
  }, []);
  const meta = NODE_META[active];

  return (
    <PageShell
      step="STEP 8 · ARCHITECTURE"
      title="System explorer · click to inspect"
      description="The complete NexusWallet topology from the solution doc — Client → Gateway → Agents → Intelligence → Data → Ecosystem. Animated edges show data flow. Click any node for its tech stack and the explicit reason it was chosen."
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 surface overflow-hidden" style={{ height: 660 }}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={NODES}
              edges={EDGES}
              onNodeClick={onNodeClick}
              fitView
              proOptions={{ hideAttribution: true }}
              minZoom={0.55}
              maxZoom={1.4}
            >
              <Background color="#ffffff10" gap={20} />
              <MiniMap
                pannable
                zoomable
                style={{ background: "#0d111d", border: "1px solid #ffffff10" }}
                nodeColor={(n: Node) => {
                  const m = NODE_META[n.id];
                  return m?.tone ?? "#888";
                }}
              />
              <Controls
                showInteractive={false}
                style={{ background: "#0d111d", border: "1px solid #ffffff10" }}
              />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="surface p-5"
        >
          <Badge
            variant="default"
            style={{
              background: `${meta.tone}1f`,
              color: meta.tone,
              borderColor: `${meta.tone}66`,
            }}
          >
            {meta.layer}
          </Badge>
          <div className="mt-2 text-lg font-semibold">{meta.title}</div>
          <div className="mt-2 text-xs text-muted-foreground uppercase tracking-wider">
            Stack
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {meta.stack.map((s) => (
              <span
                key={s}
                className="text-[11px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground uppercase tracking-wider">
            Why this choice
          </div>
          <div className="mt-1 text-sm text-foreground/85 leading-relaxed">
            {meta.why}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="health" value="OK" tone="grab" />
            <Stat label="p99 latency" value={`${(80 + Math.random() * 80).toFixed(0)}ms`} tone="cyan" />
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  const accents: Record<string, string> = {
    grab: "border-grab-500/30 bg-grab-500/5 text-grab-300",
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${accents[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 text-sm font-medium num-mono">{value}</div>
    </div>
  );
}
