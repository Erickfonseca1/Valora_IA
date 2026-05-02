/**
 * Gradient Boosted Decision Trees (GBDT) for real estate ppm2 prediction.
 *
 * Pure TypeScript, zero runtime dependencies. Runs on the Next.js edge runtime.
 *
 * Algorithm:
 *   F0 = weighted mean(y)
 *   For m = 1..n_estimators:
 *     r_i = y_i - F_{m-1}(x_i)          (pseudo-residuals, MSE loss → gradient = residual)
 *     fit a decision stump h_m to (x_i, r_i) with sample weights w_i
 *     F_m = F_{m-1} + learning_rate * h_m
 *
 * Features (same as WLS): area, bedrooms, bathrooms, parking, dlat, dlng
 * Target: price_per_m2 (already offer-factor adjusted, pre-homogenized)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GBSample {
  ppm2: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  lat: number;
  lng: number;
  weight: number;
}

export interface GBResult {
  predicted_ppm2: number;
  feature_importances: Record<string, number>;
  n: number;
  oob_rmse: number | null;
}

// ─── Decision stump ───────────────────────────────────────────────────────────

interface Stump {
  featureIdx: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
}

function fitStump(
  X: number[][],
  residuals: number[],
  weights: number[]
): Stump {
  const nFeatures = X[0].length;
  let bestLoss = Infinity;
  let best: Stump = { featureIdx: 0, threshold: 0, leftValue: 0, rightValue: 0 };

  for (let f = 0; f < nFeatures; f++) {
    const vals = X.map((row) => row[f]);
    const sorted = [...new Set(vals)].sort((a, b) => a - b);

    // Try midpoints between unique values
    for (let t = 0; t < sorted.length - 1; t++) {
      const threshold = (sorted[t] + sorted[t + 1]) / 2;

      let leftWSum = 0, leftWY = 0;
      let rightWSum = 0, rightWY = 0;

      for (let i = 0; i < X.length; i++) {
        const w = weights[i];
        const r = residuals[i];
        if (vals[i] <= threshold) {
          leftWSum += w;
          leftWY += w * r;
        } else {
          rightWSum += w;
          rightWY += w * r;
        }
      }

      const lv = leftWSum > 0 ? leftWY / leftWSum : 0;
      const rv = rightWSum > 0 ? rightWY / rightWSum : 0;

      // Weighted MSE of residuals after this split
      let loss = 0;
      for (let i = 0; i < X.length; i++) {
        const pred = vals[i] <= threshold ? lv : rv;
        loss += weights[i] * (residuals[i] - pred) ** 2;
      }

      if (loss < bestLoss) {
        bestLoss = loss;
        best = { featureIdx: f, threshold, leftValue: lv, rightValue: rv };
      }
    }
  }

  return best;
}

function predictStump(stump: Stump, row: number[]): number {
  return row[stump.featureIdx] <= stump.threshold
    ? stump.leftValue
    : stump.rightValue;
}

// ─── Feature extraction ───────────────────────────────────────────────────────

const FEATURE_NAMES = ["area", "bedrooms", "bathrooms", "parking", "dlat_km", "dlng_km"];

function extractFeatures(
  s: Pick<GBSample, "area" | "bedrooms" | "bathrooms" | "parking" | "lat" | "lng">,
  refLat: number,
  refLng: number
): number[] {
  return [
    s.area,
    s.bedrooms,
    s.bathrooms,
    s.parking,
    (s.lat - refLat) * 111.0,
    (s.lng - refLng) * 111.0 * Math.cos((refLat * Math.PI) / 180),
  ];
}

// ─── GBDT trainer ─────────────────────────────────────────────────────────────

const N_ESTIMATORS = 80;
const LEARNING_RATE = 0.12;
const SUBSAMPLE_RATIO = 0.8; // stochastic GB: use 80% of data per tree

// Simple LCG for deterministic shuffling (no Math.random drift between calls)
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function trainGBDT(
  samples: GBSample[],
  target: Pick<GBSample, "area" | "bedrooms" | "bathrooms" | "parking" | "lat" | "lng">
): GBResult | null {
  const n = samples.length;
  if (n < 10) return null;

  const refLat = target.lat;
  const refLng = target.lng;

  const X = samples.map((s) => extractFeatures(s, refLat, refLng));
  const y = samples.map((s) => s.ppm2);
  const w = samples.map((s) => s.weight);

  // Normalize weights
  const wMax = Math.max(...w);
  const wNorm = w.map((wi) => wi / wMax);
  const sumW = wNorm.reduce((s, wi) => s + wi, 0);

  // F0 = weighted mean
  const F0 = y.reduce((s, yi, i) => s + wNorm[i] * yi, 0) / sumW;
  const F = new Array(n).fill(F0);

  const stumps: Stump[] = [];
  const featureUseCounts = new Array(FEATURE_NAMES.length).fill(0);
  const rand = lcg(42);

  // Out-of-bag tracking
  const oobResiduals: number[] = new Array(n).fill(0);
  const oobCounts: number[] = new Array(n).fill(0);

  for (let m = 0; m < N_ESTIMATORS; m++) {
    // Stochastic subsampling
    const subsampleMask = Array.from({ length: n }, () => rand() < SUBSAMPLE_RATIO);
    const idxIn = samples.map((_, i) => i).filter((i) => subsampleMask[i]);
    const idxOut = samples.map((_, i) => i).filter((i) => !subsampleMask[i]);

    if (idxIn.length < 4) continue;

    const Xsub = idxIn.map((i) => X[i]);
    const residuals = idxIn.map((i) => y[i] - F[i]);
    const wsub = idxIn.map((i) => wNorm[i]);

    const stump = fitStump(Xsub, residuals, wsub);
    stumps.push(stump);
    featureUseCounts[stump.featureIdx]++;

    // Update predictions for in-bag samples
    for (const i of idxIn) {
      F[i] += LEARNING_RATE * predictStump(stump, X[i]);
    }

    // Track OOB residuals
    for (const i of idxOut) {
      const pred = F0 + stumps.slice(0, m + 1).reduce(
        (s, st) => s + LEARNING_RATE * predictStump(st, X[i]),
        0
      );
      oobResiduals[i] += (y[i] - pred) ** 2;
      oobCounts[i]++;
    }
  }

  // Predict target
  const targetFeatures = extractFeatures(target, refLat, refLng);
  let predicted_ppm2 = F0;
  for (const stump of stumps) {
    predicted_ppm2 += LEARNING_RATE * predictStump(stump, targetFeatures);
  }

  if (predicted_ppm2 <= 0 || !isFinite(predicted_ppm2)) return null;

  // OOB RMSE
  const oobValid = oobCounts.map((c, i) => (c > 0 ? oobResiduals[i] / c : null));
  const oobMSE = oobValid.filter((v) => v !== null) as number[];
  const oob_rmse = oobMSE.length > 0
    ? Math.sqrt(oobMSE.reduce((s, v) => s + v, 0) / oobMSE.length)
    : null;

  // Feature importance: proportion of splits on each feature
  const totalSplits = featureUseCounts.reduce((s, v) => s + v, 0) || 1;
  const feature_importances: Record<string, number> = {};
  FEATURE_NAMES.forEach((name, i) => {
    feature_importances[name] = Number((featureUseCounts[i] / totalSplits).toFixed(3));
  });

  return { predicted_ppm2, feature_importances, n, oob_rmse };
}
