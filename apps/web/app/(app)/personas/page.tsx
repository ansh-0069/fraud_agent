"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, AlertTriangle } from "lucide-react";
import { PERSONAS } from "@/lib/personas";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 220;
  const h = 56;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="opacity-90">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={`url(#g-${color})`}
      />
      <polyline
        points={pts}
        stroke={color}
        strokeWidth={1.6}
        fill="none"
      />
    </svg>
  );
}

export default function PersonasPage() {
  const router = useRouter();
  const personaId = useAppStore((s) => s.personaId);
  const setPersonaId = useAppStore((s) => s.setPersonaId);
  const [hover, setHover] = useState<string | null>(null);

  const colors: Record<string, string> = {
    gig: "#00B14F",
    creator: "#a855f7",
    freelancer: "#22d3ee",
    seasonal: "#f59e0b",
  };

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            STEP 1 · CHOOSE A PERSONA
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Four segments. One intelligence platform.
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Each persona has radically different income patterns, risk profiles
            and financial anxieties. NexusWallet's segment-aware engine adapts
            the FDT, RL Coach and MACE to the right persona — picking one will
            seed every other screen with that person's real digital twin.
          </p>
        </div>
        <Button asChild variant="glass" size="sm">
          <Link href="/dashboard">
            Continue with selected persona <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PERSONAS.map((p) => {
          const selected = p.id === personaId;
          const color = colors[p.segmentId];
          return (
            <motion.button
              key={p.id}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                setPersonaId(p.id);
                router.push("/dashboard");
              }}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className={cn(
                "relative text-left surface p-6 group overflow-hidden",
                selected && "ring-1 ring-grab-500/60 shadow-[0_0_36px_-12px_rgba(0,177,79,0.55)]"
              )}
            >
              {selected && (
                <span className="absolute top-3 right-3 pill bg-grab-500/15 text-grab-300 border border-grab-500/30">
                  ● Active persona
                </span>
              )}
              <div
                className="absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl pointer-events-none"
                style={{ background: `${color}33` }}
              />

              <div className="flex items-start gap-4 relative">
                <div
                  className="h-14 w-14 rounded-xl grid place-items-center text-3xl border"
                  style={{
                    borderColor: `${color}55`,
                    background: `${color}1a`,
                  }}
                >
                  {p.segmentEmoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      · {p.age} yrs
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {p.segmentLabel}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {p.city}, {p.country} · {p.language}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {p.occupation}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Monthly income</div>
                  <div className="num-mono font-medium text-foreground">
                    {formatCurrency(p.monthlyIncomeRange[0], p.currency)}–
                    {formatCurrency(p.monthlyIncomeRange[1], p.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Volatility idx</div>
                  <div className="num-mono font-medium text-foreground">
                    {(p.incomeVolatilityIdx * 100).toFixed(0)} / 100
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Runway</div>
                  <div className="num-mono font-medium text-foreground">
                    {p.emergencyRunwayDays} days
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                    <AlertTriangle className="h-3 w-3" />
                    Volatility (last 14 weeks)
                  </div>
                  <Sparkline data={p.weeklyIncome} color={color} />
                </div>
                <div className="text-right text-[10px] text-muted-foreground max-w-[180px]">
                  {p.marketStat}
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground italic border-l-2 pl-3"
                   style={{ borderColor: `${color}88` }}>
                "{p.segmentPainPoint}"
              </div>

              {hover === p.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 grid grid-cols-2 gap-2 text-[11px]"
                >
                  {p.challenges.map((c) => (
                    <div
                      key={c}
                      className="px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-muted-foreground"
                    >
                      • {c}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
