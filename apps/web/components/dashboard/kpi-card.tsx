"use client";
import { motion } from "framer-motion";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function KPICard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  delta,
  hint,
  accent = "grab",
}: {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
  delta?: string;
  hint?: string;
  accent?: "grab" | "cyan" | "amber" | "rose" | "violet";
}) {
  const accents: Record<string, string> = {
    grab: "from-grab-500/20 to-grab-500/5 border-grab-500/30 text-grab-300",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-300",
    amber:
      "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-300",
    violet:
      "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface p-5 relative overflow-hidden"
    >
      <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl bg-gradient-to-br", accents[accent])} />
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg grid place-items-center bg-gradient-to-br border", accents[accent])}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        {delta && (
          <span
            className={cn(
              "pill border",
              trend === "up"
                ? "bg-grab-500/10 text-grab-300 border-grab-500/30"
                : "bg-rose-500/10 text-rose-300 border-rose-500/30"
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
      {hint && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </motion.div>
  );
}
