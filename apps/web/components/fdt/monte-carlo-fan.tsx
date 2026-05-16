"use client";
import { useMemo } from "react";

export interface MCPath {
  values: number[];
}

export interface MCSummary {
  weeks: number[];
  mean: number[];
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
}

interface Props {
  paths?: number[][]; // up to ~50 sample paths to draw individually
  summary: MCSummary;
  obligationDay?: number;
  obligationLabel?: string;
  obligationAmount?: number;
  height?: number;
  className?: string;
}

export function MonteCarloFan({
  paths = [],
  summary,
  obligationDay,
  obligationLabel,
  obligationAmount,
  height = 360,
  className,
}: Props) {
  const w = 880;
  const h = height;
  const padX = 56;
  const padY = 28;

  const allValues = useMemo(() => {
    return [
      ...summary.p10,
      ...summary.p90,
      ...(paths.flat?.() ?? []),
      ...(obligationAmount !== undefined ? [-obligationAmount] : []),
    ];
  }, [summary, paths, obligationAmount]);

  const minY = Math.min(...allValues, 0);
  const maxY = Math.max(...allValues, 1);
  const xs = summary.weeks;

  const x = (i: number) =>
    padX + (i / Math.max(1, xs.length - 1)) * (w - padX * 2);
  const y = (v: number) =>
    padY + (1 - (v - minY) / (maxY - minY || 1)) * (h - padY * 2);

  const band = (lo: number[], hi: number[]) => {
    const top = lo.map((_, i) => `${x(i)},${y(hi[i])}`).join(" ");
    const bot = lo
      .map((_, i) => `${x(lo.length - 1 - i)},${y(lo[lo.length - 1 - i])}`)
      .join(" ");
    return `${top} ${bot}`;
  };

  const line = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id="fan-outer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="fan-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00B14F" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#00B14F" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* zero baseline */}
      <line
        x1={padX}
        x2={w - padX}
        y1={y(0)}
        y2={y(0)}
        stroke="rgba(255,255,255,0.08)"
        strokeDasharray="3 4"
      />

      {/* P10–P90 band */}
      <polygon points={band(summary.p10, summary.p90)} fill="url(#fan-outer)" />
      {/* P25–P75 band */}
      <polygon points={band(summary.p25, summary.p75)} fill="url(#fan-inner)" />

      {/* sample paths */}
      {paths.slice(0, 40).map((p, idx) => (
        <path
          key={idx}
          d={line(p)}
          stroke="rgba(34,211,238,0.18)"
          strokeWidth={0.7}
          fill="none"
        />
      ))}

      {/* P50 line */}
      <path
        d={line(summary.p50)}
        stroke="#00B14F"
        strokeWidth={2}
        fill="none"
      />

      {/* obligation marker */}
      {obligationDay !== undefined && obligationDay < xs.length && (
        <g>
          <line
            x1={x(obligationDay)}
            x2={x(obligationDay)}
            y1={padY}
            y2={h - padY}
            stroke="rgba(244,63,94,0.6)"
            strokeDasharray="4 3"
          />
          <rect
            x={x(obligationDay) - 80}
            y={padY}
            width={170}
            height={26}
            rx={6}
            fill="rgba(244,63,94,0.12)"
            stroke="rgba(244,63,94,0.45)"
          />
          <text
            x={x(obligationDay) + 5}
            y={padY + 17}
            fill="#fda4af"
            fontSize="11"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {obligationLabel ?? "obligation"}
          </text>
        </g>
      )}

      {/* axes labels */}
      {xs.map((wk, i) =>
        i % Math.max(1, Math.floor(xs.length / 8)) === 0 ? (
          <text
            key={wk}
            x={x(i)}
            y={h - 6}
            fill="rgba(255,255,255,0.4)"
            fontSize="10"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            wk{wk}
          </text>
        ) : null
      )}
    </svg>
  );
}
