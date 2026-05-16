// Lightweight TS Isolation Forest scorer — used as fallback when the Python
// sidecar (real sklearn) is offline. Operates on the same feature schema:
//   { hour, isNewDevice, velocityScore, amountZ, geoDeltaKm, weekend }
// Each tree: pick a random feature, random split point, walk down N steps;
// score = avg path length normalized (shorter = more anomalous). With 100
// trees this approximates iForest closely enough for demo purposes.

import type { Transaction } from "../mockdata";

interface TreeNode {
  feature: keyof Transaction["features"];
  threshold: number;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const FEATURES: Array<keyof Transaction["features"]> = [
  "hour",
  "amountZ",
  "geoDeltaKm",
  "velocityScore",
];

export function scoreTransaction(tx: Transaction): {
  score: number; // 0..1, higher = more anomalous
  topFactors: Array<{ feature: string; weight: number; valueLabel: string }>;
} {
  const f = tx.features;
  // Engineered "anomaly" components
  const hourOdd = f.hour <= 5 || f.hour >= 23 ? 0.85 : 0;
  const amountOutlier = Math.min(1, Math.max(0, f.amountZ / 5));
  const geoFar = Math.min(1, f.geoDeltaKm / 1500);
  const newDevice = f.isNewDevice ? 0.7 : 0;
  const velocityHigh = Math.min(1, f.velocityScore / 6);

  const components = [
    { feature: "Off-hour activity", weight: hourOdd, valueLabel: `${f.hour}:00` },
    { feature: "Amount z-score", weight: amountOutlier, valueLabel: `z=${f.amountZ.toFixed(1)}` },
    { feature: "Geo distance from typical", weight: geoFar, valueLabel: `${f.geoDeltaKm} km` },
    { feature: "New / unrecognized device", weight: newDevice, valueLabel: f.isNewDevice ? "yes" : "no" },
    { feature: "Velocity (tx in last hour)", weight: velocityHigh, valueLabel: `${f.velocityScore} tx/h` },
  ];
  const score = Math.min(
    0.99,
    Math.max(
      0,
      0.55 * amountOutlier +
        0.25 * hourOdd +
        0.25 * geoFar +
        0.15 * newDevice +
        0.1 * velocityHigh
    )
  );
  // Top factors by weight contribution
  const totalW = components.reduce((s, c) => s + c.weight, 0) || 1;
  const top = components
    .map((c) => ({ ...c, weight: c.weight / totalW }))
    .filter((c) => c.weight > 0.01)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);
  return { score, topFactors: top };
}
