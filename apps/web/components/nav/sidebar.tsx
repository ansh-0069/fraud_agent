"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  Activity,
  Bot,
  Brain,
  ShieldAlert,
  ScrollText,
  Network,
  Users,
  TrendingUp,
  FileLock2,
  CircleUser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";

const NAV = [
  { href: "/personas", label: "Personas", icon: CircleUser, group: "Setup" },
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard, group: "Live" },
  { href: "/fdt-lab", label: "Digital Twin Lab", icon: Activity, group: "Live" },
  { href: "/mace", label: "MACE Chat", icon: Bot, group: "Live" },
  { href: "/coach", label: "RL Coach Lab", icon: Brain, group: "Live" },
  { href: "/guardian", label: "Guardian Sandbox", icon: ShieldAlert, group: "Live" },
  { href: "/reasoning-log", label: "Reasoning Log", icon: ScrollText, group: "Story" },
  { href: "/architecture", label: "Architecture", icon: Network, group: "Story" },
  { href: "/segments", label: "Segments", icon: Users, group: "Story" },
  { href: "/impact", label: "Business Impact", icon: TrendingUp, group: "Story" },
  { href: "/audit", label: "Audit Trail", icon: FileLock2, group: "Story" },
];

export function Sidebar() {
  const pathname = usePathname();
  const persona = useAppStore((s) => s.getPersona());
  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/60 backdrop-blur-xl">
      <Link
        href="/"
        className="flex items-center gap-2.5 px-5 h-16 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
      >
        <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-grab-400 to-cyan-500 grid place-items-center shadow-[0_0_24px_rgba(0,177,79,0.45)]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">NexusWallet</span>
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
            GXS · Hackathon
          </span>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {groups.map((g) => (
          <div key={g} className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {g}
            </div>
            {NAV.filter((n) => n.group === g).map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + "/");
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                    active
                      ? "bg-grab-500/10 text-grab-300"
                      : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg ring-1 ring-grab-500/40"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon className="h-4 w-4 relative z-10" />
                  <span className="relative z-10">{n.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <Link
          href="/personas"
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-2.5"
        >
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-grab-500/30 to-cyan-500/30 grid place-items-center text-lg">
            {persona.segmentEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{persona.name}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {persona.segmentLabel} · {persona.city}
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-grab-500 shadow-[0_0_8px_rgba(0,177,79,0.7)] animate-pulse" />
        </Link>
      </div>
    </aside>
  );
}
