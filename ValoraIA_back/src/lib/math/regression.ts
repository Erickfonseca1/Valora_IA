/**
 * Weighted Least Squares (WLS) regression for NBR 14653 Grau III.
 *
 * Model: ppm2 = β0 + β1*area + β2*bedrooms + β3*bathrooms + β4*parking
 *               + β5*dlat + β6*dlng
 *
 * Weights: IDW weights (1/d²) passed in from the spatial query — ensures
 * nearby comps dominate the fit without discarding distant ones entirely.
 *
 * Returns:
 *   - estimated ppm2 at the target point
 *   - R² (coefficient of determination)
 *   - RMSE on training data (weighted)
 *   - predicted CI using weighted residual variance
 */

export interface RegressionSample {
  ppm2: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  lat: number;
  lng: number;
  weight: number; // IDW weight
}

export interface RegressionResult {
  predicted_ppm2: number;
  r_squared: number;
  rmse: number;
  ci_lower_ppm2: number;
  ci_upper_ppm2: number;
  n: number;
  converged: boolean;
}

// ─── Matrix helpers (column-major, row-major arrays) ──────────────────────────

function matMul(A: number[][], B: number[][]): number[][] {
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  const C: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let k = 0; k < inner; k++)
      if (A[i][k] !== 0)
        for (let j = 0; j < cols; j++)
          C[i][j] += A[i][k] * B[k][j];
  return C;
}

function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

// Gauss-Jordan inversion — adequate for k ≤ 10
function invertMatrix(M: number[][]): number[][] | null {
  const n = M.length;
  const A = M.map((row, i) => {
    const aug = [...row, ...Array(n).fill(0)];
    aug[n + i] = 1;
    return aug;
  });

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
    [A[col], A[maxRow]] = [A[maxRow], A[col]];

    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-12) return null; // singular

    for (let j = 0; j < 2 * n; j++) A[col][j] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = A[r][col];
      for (let j = 0; j < 2 * n; j++) A[r][j] -= factor * A[col][j];
    }
  }

  return A.map((row) => row.slice(n));
}

// ─── Feature builder ──────────────────────────────────────────────────────────

function buildFeatureRow(
  s: Pick<RegressionSample, "area" | "bedrooms" | "bathrooms" | "parking" | "lat" | "lng">,
  refLat: number,
  refLng: number
): number[] {
  return [
    1,                     // intercept
    s.area,
    s.bedrooms,
    s.bathrooms,
    s.parking,
    (s.lat - refLat) * 111_000,    // metres north/south
    (s.lng - refLng) * 111_000 * Math.cos((refLat * Math.PI) / 180), // metres east/west
  ];
}

// ─── WLS solver ───────────────────────────────────────────────────────────────

export function runWLSRegression(
  samples: RegressionSample[],
  target: Pick<RegressionSample, "area" | "bedrooms" | "bathrooms" | "parking" | "lat" | "lng">
): RegressionResult | null {
  const n = samples.length;
  if (n < 8) return null; // need k+1 = 7 features + safety margin

  const refLat = target.lat;
  const refLng = target.lng;

  // Design matrix X (n × 7), weight diagonal W, response y
  const X = samples.map((s) => buildFeatureRow(s, refLat, refLng));
  const y = samples.map((s) => s.ppm2);
  const w = samples.map((s) => s.weight);

  // Normalize weights so max = 1 (improves numerical stability)
  const wMax = Math.max(...w);
  const wNorm = w.map((wi) => wi / wMax);

  // W · X  (apply diagonal weight to each row)
  const WX = X.map((row, i) => row.map((v) => v * wNorm[i]));
  const Wy = y.map((yi, i) => yi * wNorm[i]);

  const Xt = transpose(X);
  const XtWX = matMul(Xt, WX);       // (7×n)(n×7) = 7×7
  const XtWy = matMul(Xt, [Wy]);      // (7×n)(n×1) = 7×1

  const XtWX_inv = invertMatrix(XtWX);
  if (!XtWX_inv) return null; // multicollinear

  const beta = matMul(XtWX_inv, XtWy).map((row) => row[0]); // 7×1 → flat

  // Predict target
  const targetRow = buildFeatureRow(target, refLat, refLng);
  const predicted_ppm2 = targetRow.reduce((s, x, i) => s + x * beta[i], 0);

  if (predicted_ppm2 <= 0 || !isFinite(predicted_ppm2)) return null;

  // Weighted residuals
  const residuals = samples.map((_, i) => {
    const yhat = X[i].reduce((s, x, j) => s + x * beta[j], 0);
    return y[i] - yhat;
  });

  const sumW = wNorm.reduce((s, wi) => s + wi, 0);
  const wMSE =
    residuals.reduce((s, e, i) => s + wNorm[i] * e * e, 0) /
    Math.max(sumW - beta.length, 1);
  const rmse = Math.sqrt(wMSE);

  // R²
  const yBar = Wy.reduce((s, v, i) => s + v, 0) / sumW;
  const SStot = y.reduce((s, yi, i) => s + wNorm[i] * (yi - yBar) ** 2, 0);
  const SSres = residuals.reduce((s, e, i) => s + wNorm[i] * e * e, 0);
  const r_squared = SStot > 0 ? Math.max(0, 1 - SSres / SStot) : 0;

  // Prediction interval: ŷ ± t * s * sqrt(x'(X'WX)^{-1}x + 1/wSum)
  // Using t ≈ 1.282 (80% CI, large sample) for consistency with MCD engine
  const xVec = [targetRow];
  const xVecT = transpose(xVec);
  const leverage = matMul(matMul(xVec, XtWX_inv), xVecT)[0][0];
  const predSE = Math.sqrt(wMSE * (leverage + 1 / sumW));
  const tFactor = 1.282;
  const ci_lower_ppm2 = Math.max(0, predicted_ppm2 - tFactor * predSE);
  const ci_upper_ppm2 = predicted_ppm2 + tFactor * predSE;

  return {
    predicted_ppm2,
    r_squared,
    rmse,
    ci_lower_ppm2,
    ci_upper_ppm2,
    n,
    converged: true,
  };
}
