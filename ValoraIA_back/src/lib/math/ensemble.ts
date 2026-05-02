/**
 * Ensemble combiner for the three valuation methods:
 *
 *   1. MCD+IDW  — Inverse Distance Weighting on homogenized ppm2
 *   2. WLS      — Weighted Least Squares regression (NBR 14653 Grau III)
 *   3. GBDT     — Gradient Boosted Decision Trees
 *
 * Combination strategy: precision-weighted average.
 *
 * Each method receives a trust weight based on its quality signal:
 *   - MCD/IDW: weight = sample_size score (0.4–1.0) × 1.0 base
 *   - WLS:     weight = R² × 1.2 boost (regression is more informative)
 *   - GBDT:    weight = (1 − oob_rmse/predicted) if OOB available, else 0.6
 *
 * If WLS or GBDT fail (insufficient data / singular matrix), the engine
 * falls back gracefully to MCD+IDW alone.
 */

import { runWLSRegression, type RegressionSample, type RegressionResult } from "./regression";
import { trainGBDT, type GBSample, type GBResult } from "./gradient-boost";

export interface MethodEstimate {
  method: "mcd_idw" | "wls" | "gbdt";
  predicted_ppm2: number;
  weight: number;
  meta: Record<string, unknown>;
}

export interface EnsembleResult {
  predicted_ppm2: number;          // ensemble final estimate
  ci_lower_ppm2: number;
  ci_upper_ppm2: number;
  method_estimates: MethodEstimate[];
  primary_method: "mcd_idw" | "wls" | "gbdt" | "ensemble";
  wls: RegressionResult | null;
  gbdt: GBResult | null;
}

// ─── Sample converter ─────────────────────────────────────────────────────────

export interface EnsembleSample {
  ppm2: number;          // raw price_per_m2 (not yet homogenized)
  homPpm2: number;       // offer-adjusted, area-homogenized ppm2
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  lat: number;
  lng: number;
  idwWeight: number;
}

export interface EnsembleTarget {
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  lat: number;
  lng: number;
}

// ─── Main combiner ────────────────────────────────────────────────────────────

export function runEnsemble(
  samples: EnsembleSample[],
  target: EnsembleTarget,
  mcdPpm2: number,          // already computed weighted mean from IDW engine
  mcdCiLow: number,
  mcdCiHigh: number,
  nEff: number
): EnsembleResult {
  const methods: MethodEstimate[] = [];

  // ── Method 1: MCD+IDW ────────────────────────────────────────────────────
  const mcdSampleScore = Math.min(nEff / 30, 1.0);
  const mcdWeight = 0.4 + mcdSampleScore * 0.6; // 0.4 → 1.0
  methods.push({
    method: "mcd_idw",
    predicted_ppm2: mcdPpm2,
    weight: mcdWeight,
    meta: { n_eff: nEff },
  });

  // ── Method 2: WLS Regression ─────────────────────────────────────────────
  let wlsResult: RegressionResult | null = null;
  const regSamples: RegressionSample[] = samples.map((s) => ({
    ppm2: s.homPpm2,
    area: s.area,
    bedrooms: s.bedrooms,
    bathrooms: s.bathrooms,
    parking: s.parking,
    lat: s.lat,
    lng: s.lng,
    weight: s.idwWeight,
  }));

  try {
    wlsResult = runWLSRegression(regSamples, target);
  } catch {
    wlsResult = null;
  }

  const WLS_MIN_R2 = 0.30; // discard WLS when fit is too poor to trust
  if (wlsResult && wlsResult.converged && wlsResult.predicted_ppm2 > 0 && wlsResult.r_squared >= WLS_MIN_R2) {
    const wlsWeight = wlsResult.r_squared * 1.2;
    methods.push({
      method: "wls",
      predicted_ppm2: wlsResult.predicted_ppm2,
      weight: wlsWeight,
      meta: {
        r_squared: wlsResult.r_squared,
        rmse: wlsResult.rmse,
        n: wlsResult.n,
      },
    });
  }

  // ── Method 3: GBDT ────────────────────────────────────────────────────────
  let gbResult: GBResult | null = null;
  const gbSamples: GBSample[] = samples.map((s) => ({
    ppm2: s.homPpm2,
    area: s.area,
    bedrooms: s.bedrooms,
    bathrooms: s.bathrooms,
    parking: s.parking,
    lat: s.lat,
    lng: s.lng,
    weight: s.idwWeight,
  }));

  try {
    gbResult = trainGBDT(gbSamples, target);
  } catch {
    gbResult = null;
  }

  if (gbResult && gbResult.predicted_ppm2 > 0) {
    let gbWeight = 0.6;
    if (gbResult.oob_rmse !== null && gbResult.predicted_ppm2 > 0) {
      const relErr = gbResult.oob_rmse / gbResult.predicted_ppm2;
      gbWeight = Math.max(0.2, 1.0 - relErr * 2);
    }
    methods.push({
      method: "gbdt",
      predicted_ppm2: gbResult.predicted_ppm2,
      weight: gbWeight,
      meta: {
        oob_rmse: gbResult.oob_rmse,
        n: gbResult.n,
        feature_importances: gbResult.feature_importances,
      },
    });
  }

  // ── Precision-weighted average ────────────────────────────────────────────
  const totalW = methods.reduce((s, m) => s + m.weight, 0);
  const ensemblePpm2 = methods.reduce(
    (s, m) => s + (m.predicted_ppm2 * m.weight) / totalW,
    0
  );

  // CI: blend MCD CI with ensemble spread
  const ppm2Values = methods.map((m) => m.predicted_ppm2);
  const ppm2Min = Math.min(...ppm2Values);
  const ppm2Max = Math.max(...ppm2Values);

  // Widen MCD CI to cover inter-method spread if needed
  const ciSpreadLow = Math.min(mcdCiLow, ensemblePpm2 - (ppm2Max - ppm2Min) * 0.5);
  const ciSpreadHigh = Math.max(mcdCiHigh, ensemblePpm2 + (ppm2Max - ppm2Min) * 0.5);

  // Floor: CI lower can't be less than 50% of ensemble (prevents zero/negative CIs on tiny samples)
  const ciFloor = ensemblePpm2 * 0.50;
  const ci_lower_ppm2 = Math.max(ciFloor, ciSpreadLow);
  const ci_upper_ppm2 = Math.max(ensemblePpm2 * 1.10, ciSpreadHigh);

  const primary_method: EnsembleResult["primary_method"] =
    methods.length === 1 ? "mcd_idw" : "ensemble";

  return {
    predicted_ppm2: ensemblePpm2,
    ci_lower_ppm2,
    ci_upper_ppm2,
    method_estimates: methods,
    primary_method,
    wls: wlsResult,
    gbdt: gbResult,
  };
}
