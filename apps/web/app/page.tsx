"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Brain, ShieldCheck, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      {/* Background grid + radial fade */}
      <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(circle_at_center,black_10%,transparent_75%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,177,79,0.18),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(34,211,238,0.14),transparent_55%)]" />

      {/* floating orbs */}
      <motion.div
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-grab-500/20 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <header className="relative z-10 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-grab-400 to-cyan-500 grid place-items-center shadow-[0_0_24px_rgba(0,177,79,0.45)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">NexusWallet</div>
            <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
              GXS · Hackathon Prototype
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">PROBLEM STATEMENT 3 · FINTECH</Badge>
          <Badge variant="secondary">MAS FEAT-READY</Badge>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <Badge variant="default" className="mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-grab-400 animate-pulse" />
            Live multi-agent GenAI · LangGraph + Groq + PPO
          </Badge>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Adaptive Financial Intelligence
            <br />
            <span className="gradient-text">for the New Work Economy</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            An enterprise-grade, multi-agent GenAI platform that serves gig
            workers, creators, freelancers and seasonal workers — the{" "}
            <span className="text-foreground font-medium">40% of Southeast Asia's workforce</span>{" "}
            that traditional banking still ignores.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="glow-grab">
              <Link href="/personas">
                Enter Demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link href="/reasoning-log">Watch the Reasoning Log</Link>
            </Button>
          </div>
        </motion.div>

        {/* The headline tickers from page 1 of pdfcrowd.pdf */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              n: 87,
              prefix: "$",
              suffix: "B",
              label: "Underserved SEA workforce TAM",
            },
            {
              n: 40,
              prefix: "",
              suffix: "%",
              label: "of SEA workforce in non-traditional employment",
            },
            {
              n: 3,
              prefix: "",
              suffix: "×",
              label: "more income volatility than salaried employees",
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="surface p-6"
            >
              <div className="text-4xl font-semibold tabular-nums">
                {s.prefix}
                <AnimatedNumber value={s.n} duration={1400} />
                {s.suffix}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Three layers from §03 of the solution doc */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Activity,
              title: "Layer 1 · Financial Digital Twin",
              text: "A live, probabilistic simulation of each user's financial future. LSTM + Monte Carlo, runnable per request. Lets you ask 'what if' without hallucination.",
            },
            {
              icon: Brain,
              title: "Layer 2 · RL Coach (PPO)",
              text: "A Proximal Policy Optimization agent over 72 financial actions. Learns which interventions actually move financial stability forward — per segment, per individual.",
            },
            {
              icon: ShieldCheck,
              title: "Layer 3 · Multi-Agent MACE",
              text: "LangGraph state machine routing between Coach, Analyst, Guardian. Every decision audited, SHAP-explained, and grounded in the user's FDT snapshot.",
            },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="surface p-6 hover:border-white/[0.12] transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-grab-500/15 border border-grab-500/30 grid place-items-center text-grab-300 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold">{c.title}</div>
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {c.text}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-xs text-muted-foreground">
          Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">→</kbd>{" "}
          on each demo screen to advance the rehearsed path · Esc anywhere to come back here.
        </div>
      </main>
    </div>
  );
}
