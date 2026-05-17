"use client";

const COHORT_COLORS = [
  "#00B14F",
  "#a855f7",
  "#22d3ee",
  "#f59e0b",
  "#fb7185",
  "#3b82f6",
  "#34d399",
  "#f43f5e",
];

export type PopulationSummary = {
  generatedAt?: string;
  nUsers: number;
  nCohorts: number;
  silhouette: number;
  lstmValLossFinal: number | null;
  lstmCurve: { train: number[]; val: number[] };
  ppoCurve: number[];
  countries: string[];
  incomeHistogramByCountry: Record<string, { counts: number[]; binEdges: number[] }>;
  umapX: number[];
  umapY: number[];
  cohortLabels: number[];
  personaStars: Array<{
    id: string;
    label: string;
    umapX: number;
    umapY: number;
    cohort: number;
  }>;
  confusionHandVsKMeans: {
    segmentIds: string[];
    cohortIndices: number[];
    matrix: number[][];
  };
  cohortStats: Array<{
    id: number;
    n: number;
    meanVolatility: number;
    meanShockSurvivalDays: number;
    dominantHandSegment: string;
    topActions: string[];
  }>;
  defaultRisk: {
    aucRoc: number;
    brier: number;
    roc: { fpr: number[]; tpr: number[] };
    calibration: { meanPredicted: number[]; fractionPositive: number[] };
  };
  guardian: {
    averagePrecision: number;
    precisionAtK: Record<string, number>;
    prCurve: { precision: number[]; recall: number[] };
  };
  segmentClassifier: {
    macroF1: number;
    perClass: Record<string, { precision: number; recall: number; f1: number }>;
  };
};

function cohortColor(id: number): string {
  return COHORT_COLORS[id % COHORT_COLORS.length] ?? "#888";
}

export function IncomeHistograms({
  countries,
  incomeHistogramByCountry,
}: {
  countries: string[];
  incomeHistogramByCountry: PopulationSummary["incomeHistogramByCountry"];
}) {
  const h = 100;
  const w = 200;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {countries.map((cc) => {
        const hdata = incomeHistogramByCountry[cc];
        if (!hdata) return null;
        const maxC = Math.max(...hdata.counts, 1);
        const n = hdata.counts.length;
        const barW = w / n;
        return (
          <div key={cc} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-xs font-medium mb-2">{cc}</div>
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
              {hdata.counts.map((c, i) => {
                const bh = (c / maxC) * (h - 16);
                return (
                  <rect
                    key={i}
                    x={i * barW + 1}
                    y={h - 12 - bh}
                    width={Math.max(1, barW - 2)}
                    height={bh}
                    fill="#00B14F88"
                    rx={1}
                  />
                );
              })}
            </svg>
            <div className="text-[10px] text-muted-foreground mt-1">
              log₁₀(mean weekly income)
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UmapScatter({
  umapX,
  umapY,
  cohortLabels,
  personaStars,
}: {
  umapX: number[];
  umapY: number[];
  cohortLabels: number[];
  personaStars: PopulationSummary["personaStars"];
}) {
  const pad = 24;
  const w = 560;
  const h = 380;
  const minX = Math.min(...umapX);
  const maxX = Math.max(...umapX);
  const minY = Math.min(...umapY);
  const maxY = Math.max(...umapY);
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (w - 2 * pad);
  const sy = (y: number) => h - pad - ((y - minY) / (maxY - minY || 1)) * (h - 2 * pad);

  const step = Math.max(1, Math.floor(umapX.length / 4000));
  const indices = [];
  for (let i = 0; i < umapX.length; i += step) indices.push(i);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-2xl" style={{ height: h }}>
      <rect width={w} height={h} fill="transparent" />
      {indices.map((i) => {
        const lab = cohortLabels[i] ?? 0;
        return (
          <circle
            key={i}
            cx={sx(umapX[i])}
            cy={sy(umapY[i])}
            r={1.2}
            fill={cohortColor(lab)}
            opacity={0.55}
          />
        );
      })}
      {personaStars.map((p) => (
        <g key={p.id}>
          <circle
            cx={sx(p.umapX)}
            cy={sy(p.umapY)}
            r={7}
            fill="none"
            stroke="#fff"
            strokeWidth={2}
          />
          <circle cx={sx(p.umapX)} cy={sy(p.umapY)} r={5} fill={cohortColor(p.cohort)} />
          <text
            x={sx(p.umapX) + 10}
            y={sy(p.umapY) + 4}
            className="fill-foreground text-[10px] font-medium"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ConfusionHeat({
  confusion,
}: {
  confusion: PopulationSummary["confusionHandVsKMeans"];
}) {
  const { segmentIds, matrix } = confusion;
  const flat = matrix.flat();
  const maxV = Math.max(...flat, 1);
  const cell = 36;
  const labelW = 88;
  const headH = 28;
  const nw = matrix[0]?.length ?? 0;
  const nh = matrix.length;
  const w = labelW + nw * cell;
  const h = headH + nh * cell;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>
      {Array.from({ length: nw }).map((_, j) => (
        <text
          key={j}
          x={labelW + j * cell + cell / 2}
          y={16}
          textAnchor="middle"
          className="fill-muted-foreground text-[9px]"
        >
          C{j}
        </text>
      ))}
      {matrix.map((row, i) => (
        <g key={i}>
          <text
            x={4}
            y={headH + i * cell + cell / 2 + 4}
            className="fill-muted-foreground text-[9px]"
          >
            {segmentIds[i]?.slice(0, 8)}
          </text>
          {row.map((v, j) => (
            <rect
              key={j}
              x={labelW + j * cell + 1}
              y={headH + i * cell + 1}
              width={cell - 2}
              height={cell - 2}
              rx={2}
              fill={`rgba(0,177,79,${0.15 + (v / maxV) * 0.75})`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function MultiLineCurve({
  series,
  labels,
  colors,
}: {
  series: number[][];
  labels: string[];
  colors: string[];
}) {
  if (!series.length || !series[0]?.length) {
    return <div className="text-xs text-muted-foreground">No curve data</div>;
  }
  const w = 320;
  const chartH = 120;
  const all = series.flat();
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = 8;

  return (
    <svg viewBox={`0 0 ${w} ${chartH + 16}`} className="w-full" style={{ height: chartH + 16 }}>
      {series.map((data, si) => {
        const pts = data
          .map((v, i) => {
            const x = pad + (i / (data.length - 1 || 1)) * (w - 2 * pad);
            const y = chartH - pad - ((v - min) / (max - min || 1)) * (chartH - 2 * pad);
            return `${x},${y}`;
          })
          .join(" ");
        return (
          <polyline
            key={si}
            points={pts}
            fill="none"
            stroke={colors[si % colors.length]}
            strokeWidth={1.8}
          />
        );
      })}
      <g className="text-[9px] fill-muted-foreground">
        {labels.map((lb, i) => (
          <text key={lb} x={4} y={12 + i * 12}>
            <tspan fill={colors[i % colors.length]}>●</tspan> {lb}
          </text>
        ))}
      </g>
    </svg>
  );
}

export function RocCurve({ fpr, tpr }: { fpr: number[]; tpr: number[] }) {
  const w = 280;
  const h = 200;
  const pts = fpr
    .map((x, i) => {
      const px = x * (w - 20) + 10;
      const py = h - 10 - tpr[i] * (h - 20);
      return `${px},${py}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <polyline points={`10,${h - 10} ${w - 10},10`} stroke="#ffffff22" strokeWidth={1} strokeDasharray="4 3" />
      <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth={2} />
    </svg>
  );
}

export function CalibrationChart({
  meanPredicted,
  fractionPositive,
}: {
  meanPredicted: number[];
  fractionPositive: number[];
}) {
  const w = 280;
  const h = 200;
  const pts = meanPredicted
    .map((x, i) => {
      const px = 10 + x * (w - 20);
      const py = h - 10 - fractionPositive[i] * (h - 20);
      return `${px},${py}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <polyline points={`10,${h - 10} ${w - 10},10`} stroke="#ffffff22" strokeWidth={1} />
      <polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth={2} />
    </svg>
  );
}

export function PrCurve({ precision, recall }: { precision: number[]; recall: number[] }) {
  const w = 280;
  const h = 200;
  if (!precision.length) return null;
  const pts = precision
    .map((_, i) => {
      const px = 10 + recall[i] * (w - 20);
      const py = h - 10 - precision[i] * (h - 20);
      return `${px},${py}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <polyline points={pts} fill="none" stroke="#a855f7" strokeWidth={2} />
    </svg>
  );
}

export { cohortColor, COHORT_COLORS };
