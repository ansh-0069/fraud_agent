"use client";
import { PageShell } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PERSONAS } from "@/lib/personas";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  gig: "#00B14F",
  creator: "#a855f7",
  freelancer: "#22d3ee",
  seasonal: "#f59e0b",
};

const SEGMENT_TAILORED: Record<
  string,
  Array<{ code: string; label: string }>
> = {
  gig: [
    { code: "INCOME_TARGET_SURGE_WINDOW", label: "Highlight surge window opportunities" },
    { code: "INSURANCE_VEHICLE_COVER_GIG", label: "Vehicle cover with gig endorsement" },
    { code: "SAVINGS_BOOST_NOW", label: "Boost savings during peak windows" },
  ],
  creator: [
    { code: "INCOME_BRAND_DEAL_PIPE", label: "Surface brand-deal pipeline gaps" },
    { code: "TAX_CROSS_BORDER_DTAA", label: "Cross-border DTAA optimisation" },
    { code: "INSURANCE_DEVICE_PROTECTION", label: "Device + equipment protection" },
  ],
  freelancer: [
    { code: "INCOME_INVOICE_FOLLOWUP", label: "Follow up on overdue invoices" },
    { code: "TAX_ADVANCE_TAX_REMIND", label: "Remind quarterly advance-tax instalment" },
    { code: "SAVINGS_BIG_GOAL_REVIEW", label: "Review long-term goal feasibility" },
  ],
  seasonal: [
    { code: "INSURANCE_SEASON_GAP_COVER", label: "Off-season income gap cover" },
    { code: "SAVINGS_RAINY_DAY_TOPUP", label: "Top up rainy-day fund pre-cliff" },
    { code: "SPENDING_FESTIVAL_PLAN", label: "Pre-plan festival/upacara spend" },
  ],
};

function SegmentSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 280;
  const h = 80;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 70 }}>
      <defs>
        <linearGradient id={`seg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#seg-${color})`} />
      <polyline points={pts} stroke={color} strokeWidth={1.6} fill="none" />
    </svg>
  );
}

export default function SegmentsPage() {
  const router = useRouter();
  const personaId = useAppStore((s) => s.personaId);
  const setPersonaId = useAppStore((s) => s.setPersonaId);

  return (
    <PageShell
      step="STEP 9 · SEGMENTS"
      title="Beyond gig workers · the full New Work Economy"
      description="Each segment has radically different income patterns, risk profiles and financial anxieties. A one-size-fits-all coach is noise. NexusWallet's segment-aware engine adapts the FDT, RL Coach, and language tone to the right cohort — driving the +15–20% new customer acquisition lever."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PERSONAS.map((p) => {
          const color = COLORS[p.segmentId];
          const tailored = SEGMENT_TAILORED[p.segmentId];
          const active = personaId === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                "surface p-5 relative overflow-hidden flex flex-col gap-4 transition-all",
                active && "ring-1 ring-grab-500/60 shadow-[0_0_36px_-12px_rgba(0,177,79,0.5)]"
              )}
            >
              <div
                className="absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl pointer-events-none"
                style={{ background: `${color}33` }}
              />
              <div className="flex items-start gap-3 relative">
                <div
                  className="h-12 w-12 rounded-xl grid place-items-center text-2xl border"
                  style={{ borderColor: `${color}55`, background: `${color}1a` }}
                >
                  {p.segmentEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{p.segmentLabel}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {p.name} · {p.city}
                  </div>
                  <Badge variant="secondary" className="mt-2 num-mono text-[10px]">
                    {p.marketStat}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Income pattern (14 wk)
                </div>
                <SegmentSparkline data={p.weeklyIncome} color={color} />
              </div>

              <div className="text-xs text-muted-foreground italic border-l-2 pl-3"
                   style={{ borderColor: `${color}88` }}>
                "{p.segmentPainPoint}"
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Tailored top actions
                </div>
                <div className="space-y-1.5">
                  {tailored.map((a) => (
                    <div
                      key={a.code}
                      className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 text-[11px]"
                    >
                      <div className="num-mono text-grab-300 truncate">{a.code}</div>
                      <div className="text-muted-foreground mt-0.5">{a.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="glass"
                size="sm"
                onClick={() => {
                  setPersonaId(p.id);
                  router.push("/dashboard");
                }}
              >
                Demo as {p.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="surface p-6">
        <div className="text-sm font-medium">Why this matters for GXS</div>
        <div className="mt-2 text-sm text-foreground/80 leading-relaxed">
          GXS CEO has explicitly noted the need to "go outside of its established
          ecosystem to get enough volume." Creators, freelancers, and seasonal
          workers are not currently Grab users — but they will become GXS
          customers through NexusWallet, expanding the TAM beyond Grab's
          existing install base.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="default">+15–20% new-cohort acquisition</Badge>
          <Badge variant="info">Multilingual (5 SEA languages)</Badge>
          <Badge variant="warning">Embedded in regulated GXS license</Badge>
          <Badge variant="secondary">Day-one regional deployable</Badge>
        </div>
      </div>
    </PageShell>
  );
}
