"use client";
import Link from "next/link";
import { Activity, Cpu, Wifi, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const persona = useAppStore((s) => s.getPersona());
  const llm = useAppStore((s) => s.lastLLMLatency);
  const fdt = useAppStore((s) => s.lastFDTRuntime);
  const [mlOk, setMlOk] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setMlOk(j.mlOk ? "up" : "down");
      } catch {
        if (!cancelled) setMlOk("down");
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="h-full flex items-center justify-between px-4 lg:px-8 gap-4">
        <Link href="/" className="lg:hidden flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-grab-400 to-cyan-500 grid place-items-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">NexusWallet</span>
        </Link>

        <div className="flex-1 hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-grab-500 animate-pulse" />
            DEMO MODE · MOCK DATA
          </Badge>
          <span className="opacity-60">
            Acting as <span className="text-foreground/90">{persona.name}</span> · {persona.segmentLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              mlOk === "up" ? "default" : mlOk === "down" ? "destructive" : "secondary"
            }
            className="num-mono"
          >
            <Wifi className="h-3 w-3" />
            {mlOk === "up" ? "ML SIDECAR · UP" : mlOk === "down" ? "SIDECAR · OFFLINE" : "checking…"}
          </Badge>
          <Badge variant="info" className="num-mono">
            <Cpu className="h-3 w-3" />
            FDT {fdt > 0 ? `${fdt}ms` : "—"}
          </Badge>
          <Badge variant="info" className="num-mono">
            <Activity className="h-3 w-3" />
            LLM {llm > 0 ? `${llm}ms` : "—"}
          </Badge>
          <Button asChild variant="glass" size="sm">
            <Link href="/reasoning-log">Demo Path →</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
