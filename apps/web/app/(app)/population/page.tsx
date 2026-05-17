"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import {
  IncomeHistograms,
  UmapScatter,
  ConfusionHeat,
  MultiLineCurve,
  RocCurve,
  CalibrationChart,
  PrCurve,
  cohortColor,
  type PopulationSummary,
} from "@/components/charts/population-charts";
import { cn } from "@/lib/utils";

export default function PopulationPage() {
  const [data, setData] = useState<PopulationSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/population");
      if (!r.ok) {
        setErr(r.status === 404 ? "not_generated" : String(r.status));
        return;
      }
      setData(await r.json());
    })();
  }, []);

  return (
    <PageShell
      step="STEP 10 · POPULATION ML"
      title="Synthetic SEA cohort — 10k users, real training curves"
      description="Every model is trained on a generated population: global FDT LSTM, KMeans+UMAP cohorts, segment MLP, default-risk GBM, population-sampled PPO states, and a 1M-row Guardian corpus. The four demo personas are fixed stars in UMAP space."
    >
      {err === "not_generated" && (
        <div className="surface p-6 border border-amber-500/30 bg-amber-500/5 text-sm">
          <div className="font-medium text-amber-200">population_summary.json not found</div>
          <p className="mt-2 text-muted-foreground">
            Run the offline pipeline from the repo root:
          </p>
          <pre className="mt-3 p-3 rounded-lg bg-black/40 text-xs overflow-x-auto">
            {`cd services\\ml
pip install -r requirements.txt
cd ..\\..
python scripts\\train_all.py`}
          </pre>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Users" value={String(data.nUsers)} />
            <Kpi label="Cohorts (KMeans)" value={String(data.nCohorts)} />
            <Kpi label="Silhouette" value={data.silhouette.toFixed(3)} />
            <Kpi
              label="LSTM val MSE"
              value={data.lstmValLossFinal != null ? data.lstmValLossFinal.toFixed(4) : "—"}
            />
            <Kpi label="Default AUC" value={data.defaultRisk.aucRoc.toFixed(3)} />
            <Kpi label="Brier" value={data.defaultRisk.brier.toFixed(4)} />
            <Kpi label="Guardian AP" value={data.guardian.averagePrecision.toFixed(3)} />
            <Kpi label="Segment clf F1" value={data.segmentClassifier.macroF1.toFixed(3)} />
          </div>

          <section className="surface p-5 space-y-3">
            <div className="text-sm font-medium">Income distribution by country</div>
            <IncomeHistograms
              countries={data.countries}
              incomeHistogramByCountry={data.incomeHistogramByCountry}
            />
          </section>

          <section className="surface p-5 space-y-3">
            <div className="text-sm font-medium">UMAP · hand-crafted personas as stars</div>
            <div className="text-xs text-muted-foreground">
              Points subsampled for render · color = KMeans cohort
            </div>
            <UmapScatter
              umapX={data.umapX}
              umapY={data.umapY}
              cohortLabels={data.cohortLabels}
              personaStars={data.personaStars}
            />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: data.nCohorts }).map((_, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: cohortColor(i) }} />
                  Cohort {i}
                </Badge>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="surface p-5">
              <div className="text-sm font-medium mb-2">Hand segment vs KMeans</div>
              <ConfusionHeat confusion={data.confusionHandVsKMeans} />
            </div>
            <div className="surface p-5 space-y-4">
              <div className="text-sm font-medium">Per-cohort aggregates</div>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {data.cohortStats.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: cohortColor(c.id) }}
                      />
                      <span className="font-medium">Cohort {c.id}</span>
                      <Badge variant="outline" className="text-[9px]">
                        n={c.n}
                      </Badge>
                      <span className="text-muted-foreground ml-auto">
                        dominant: {c.dominantHandSegment}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <span>Volatility μ {(c.meanVolatility * 100).toFixed(0)}%</span>
                      <span>Shock survival μ {c.meanShockSurvivalDays.toFixed(0)} d</span>
                    </div>
                    <div className="mt-2 text-[10px] text-grab-300/90 space-y-0.5">
                      {c.topActions.map((a) => (
                        <div key={a} className="font-mono truncate">
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface p-5">
              <div className="text-sm font-medium mb-2">FDT LSTM pre-training</div>
              <MultiLineCurve
                series={[data.lstmCurve.train, data.lstmCurve.val]}
                labels={["train MSE", "val MSE"]}
                colors={["#00B14F", "#22d3ee"]}
              />
            </div>
            <div className="surface p-5">
              <div className="text-sm font-medium mb-2">PPO Coach (population states)</div>
              <MultiLineCurve series={[data.ppoCurve]} labels={["mean reward / epoch"]} colors={["#00B14F"]} />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="surface p-5">
              <div className="text-sm font-medium mb-2">Default risk · ROC</div>
              <RocCurve fpr={data.defaultRisk.roc.fpr} tpr={data.defaultRisk.roc.tpr} />
            </div>
            <div className="surface p-5">
              <div className="text-sm font-medium mb-2">Calibration</div>
              <CalibrationChart
                meanPredicted={data.defaultRisk.calibration.meanPredicted}
                fractionPositive={data.defaultRisk.calibration.fractionPositive}
              />
            </div>
            <div className="surface p-5">
              <div className="text-sm font-medium mb-2">Guardian · PR (subset)</div>
              <PrCurve
                precision={data.guardian.prCurve.precision}
                recall={data.guardian.prCurve.recall}
              />
              <div className="mt-3 text-[10px] text-muted-foreground flex flex-wrap gap-2">
                {Object.entries(data.guardian.precisionAtK).map(([k, v]) => (
                  <span key={k} className="tabular-nums">
                    P@{k}={v.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="surface p-5">
            <div className="text-sm font-medium mb-2">Segment classifier · per-cohort F1</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(data.segmentClassifier.perClass).map(([cid, m]) => (
                <div key={cid} className="rounded border border-white/[0.05] p-2">
                  <div className="text-muted-foreground">C{cid}</div>
                  <div className="num-mono">F1 {m.f1.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </section>

          {data.generatedAt && (
            <div className="text-[10px] text-muted-foreground text-center">
              Artifacts generated {data.generatedAt}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-3 rounded-xl border border-white/[0.06]">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums")}>{value}</div>
    </div>
  );
}
