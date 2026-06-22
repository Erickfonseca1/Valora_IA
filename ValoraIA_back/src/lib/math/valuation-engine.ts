import { getAdminClient } from "@/lib/db/supabase";
import { fetchNearbyPlaces } from "@/lib/geocoding/nearby-places";
import type {
  ComparableListing,
  FrontendComparable,
  ListingRow,
  MethodEstimate,
  NeighborhoodData,
  PriceFactor,
  StreetLevel,
  TerrainSlope,
  ValuationRequest,
  ValuationResult,
} from "@/types";
import { runEnsemble, type EnsembleSample, type EnsembleTarget } from "./ensemble";
import {
  computeScopeFactors, computeProximoFactor, type AmenitySelection,
} from "@/lib/amenities/factors";

// ─── NBR 14653 Constants ──────────────────────────────────────────────────────

const OFFER_FACTOR = 0.90;
const AREA_EXPONENT = 0.7;
const CONFIDENCE_LEVEL = 0.80;
const T_80_LARGE = 1.282;

// IDW: always fetch all radii simultaneously, weight by inverse distance
const IDW_RADII_M = [1000, 2000, 3000, 5000];
const IDW_POWER = 2;           // distance exponent — higher = stronger local bias
const MIN_SAMPLES = 5;
const MAX_SAMPLES = 100;

// ─── NBR 14653 Post-Ensemble Homogenization Factors ──────────────────────────
const CORNER_FACTOR = 1.05;
const SLOPE_FACTORS: Record<string, number> = {
  plano: 1.0, aclive_leve: 0.95, declive_leve: 0.95,
  aclive_acentuado: 0.80, declive_acentuado: 0.80,
};
const LEVEL_FACTORS: Record<string, number> = { no_nivel: 1.0, acima_nivel: 0.95, abaixo_nivel: 0.80 };

export function applyScopeFactorsToCombined(
  base: number,
  f: { internalFactor: number; condoFactor: number; proximoFactor: number }
): number {
  return Number((base * f.internalFactor * f.condoFactor * f.proximoFactor).toFixed(6));
}

// ─── Typology Factor (NBR 14653 homogenization) ───────────────────────────────
//
// When target property_type differs from comp property_type, apply a factor to
// convert the comp ppm2 to the target typology.
//
// Factor is computed empirically from matched pairs (same area ±30%, same
// bedrooms ±1) found within 5km. If insufficient pairs, fall back to literature
// defaults from Brazilian appraisal practice.
//
// house / apartment ≈ 1.20 (houses carry land value premium)
// apartment / house ≈ 0.83 (inverse)

const TYPOLOGY_DEFAULTS: Record<string, Record<string, number>> = {
  house:      { apartment: 1.20, commercial: 1.40, land: 1.60 },
  apartment:  { house: 0.83,     commercial: 1.15, land: 1.30 },
  commercial: { house: 0.71,     apartment: 0.87,  land: 1.10 },
  land:       { house: 0.63,     apartment: 0.77,  commercial: 0.91 },
};

const MIN_TYPOLOGY_PAIRS = 3;

async function computeTypologyFactor(
  lat: number,
  lng: number,
  targetType: string,
  compType: string,
  targetArea: number
): Promise<number> {
  if (targetType === compType) return 1.0;

  const db = getAdminClient();

  // Fetch comps of target type near the location
  const { data: targetRows } = await db.rpc("search_listings_in_radius", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: 5000,
    p_area_target: targetArea,
    p_area_tolerance: 0.30,
    p_bedrooms: null,
    p_limit: 50,
  });

  // Fetch comps of comp type near the location
  const { data: compRows } = await db.rpc("search_listings_in_radius", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: 5000,
    p_area_target: targetArea,
    p_area_tolerance: 0.30,
    p_bedrooms: null,
    p_limit: 50,
  });

  const targetSample = ((targetRows ?? []) as ListingRow[])
    .filter((r) => r.property_type === targetType);
  const compSample = ((compRows ?? []) as ListingRow[])
    .filter((r) => r.property_type === compType);

  if (targetSample.length < MIN_TYPOLOGY_PAIRS || compSample.length < MIN_TYPOLOGY_PAIRS) {
    return TYPOLOGY_DEFAULTS[targetType]?.[compType] ?? 1.0;
  }

  const targetPpm2 = targetSample.map((r) => r.price / r.usable_area);
  const compPpm2   = compSample.map((r) => r.price / r.usable_area);

  const avgTarget = targetPpm2.reduce((s, v) => s + v, 0) / targetPpm2.length;
  const avgComp   = compPpm2.reduce((s, v) => s + v, 0) / compPpm2.length;

  if (avgComp === 0) return TYPOLOGY_DEFAULTS[targetType]?.[compType] ?? 1.0;

  // Clamp to ±50% of default to prevent outlier pollution
  const empirical = avgTarget / avgComp;
  const defaultFactor = TYPOLOGY_DEFAULTS[targetType]?.[compType] ?? 1.0;
  return clamp(empirical, defaultFactor * 0.50, defaultFactor * 1.50);
}

// ─── Statistical helpers ──────────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function weightedMean(values: number[], weights: number[]): number {
  const sumW = weights.reduce((s, w) => s + w, 0);
  return values.reduce((s, v, i) => s + v * weights[i], 0) / sumW;
}

function stdDev(values: number[], avg: number): number {
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function weightedStdDev(values: number[], weights: number[], wMean: number): number {
  const sumW = weights.reduce((s, w) => s + w, 0);
  const variance = values.reduce((s, v, i) => s + weights[i] * (v - wMean) ** 2, 0) / sumW;
  return Math.sqrt(variance);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function removeOutliersIQR(values: number[]): boolean[] {
  if (values.length < 4) return values.map(() => true);
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return values.map((v) => v >= lower && v <= upper);
}

// ─── Spatial query ────────────────────────────────────────────────────────────

async function fetchCandidates(
  lat: number,
  lng: number,
  radiusM: number,
  targetArea: number,
  targetBedrooms: number | null | undefined,
  areaTolerance = 0.20,
  ignoreBedrooms = false
): Promise<ListingRow[]> {
  const db = getAdminClient();
  const { data, error } = await db.rpc("search_listings_in_radius", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_area_target: targetArea,
    p_area_tolerance: areaTolerance,
    p_bedrooms: ignoreBedrooms ? null : (targetBedrooms ?? null),
    p_limit: MAX_SAMPLES,
  });
  if (error) throw new Error(`Spatial query failed: ${error.message}`);
  return (data as ListingRow[]) ?? [];
}

// Progressive fallback: relax bedroom filter → relax area tolerance → no area filter
async function fetchCandidatesWithFallback(
  lat: number,
  lng: number,
  radiusM: number,
  targetArea: number,
  targetBedrooms: number | null | undefined
): Promise<ListingRow[]> {
  const attempts: Array<{ areaTolerance: number; ignoreBedrooms: boolean }> = [
    { areaTolerance: 0.20, ignoreBedrooms: false },
    { areaTolerance: 0.20, ignoreBedrooms: true },
    { areaTolerance: 0.40, ignoreBedrooms: true },
    { areaTolerance: 0.60, ignoreBedrooms: true },
    { areaTolerance: 1.00, ignoreBedrooms: true }, // no area filter (±100% = all sizes)
  ];

  for (const attempt of attempts) {
    const rows = await fetchCandidates(
      lat, lng, radiusM, targetArea, targetBedrooms,
      attempt.areaTolerance, attempt.ignoreBedrooms
    );
    if (rows.length >= MIN_SAMPLES) return rows;
  }

  return [];
}

// ─── IDW — Inverse Distance Weighting ────────────────────────────────────────
//
// Fetches all candidates within MAX_RADIUS, then assigns each a weight of
// 1 / distance^IDW_POWER. This means:
//   - A comp at 200m weighs 625× more than one at 5000m (power=2)
//   - But distant comps from better neighborhoods still PULL the estimate
//     upward rather than being ignored entirely — exactly what we need for
//     emerging/peripheral markets next to established ones.
//
// After IDW weighting we still run IQR outlier removal on the raw ppm2 values
// to discard true data errors (typos, commercial mixed with residential, etc.)
// before computing the weighted mean.

interface WeightedCandidate {
  row: ListingRow;
  homogenizedPpm2: number;
  idwWeight: number;
  typologyFactor: number;
}

async function fetchIDWCandidates(
  lat: number,
  lng: number,
  targetArea: number,
  targetBedrooms: number | null | undefined,
  targetPropertyType: string | null | undefined
): Promise<{ candidates: WeightedCandidate[]; radiusUsed: number; typologyFactorUsed: number }> {
  // Fetch at max radius with progressive fallback relaxation
  const maxRadius = IDW_RADII_M[IDW_RADII_M.length - 1];
  const rows = await fetchCandidatesWithFallback(lat, lng, maxRadius, targetArea, targetBedrooms);

  if (rows.length === 0) {
    return { candidates: [], radiusUsed: maxRadius, typologyFactorUsed: 1.0 };
  }

  // IQR filter on raw price_per_m2 to remove data errors
  const rawPpm2 = rows.map((r) => r.price / r.usable_area);
  const keepMask = removeOutliersIQR(rawPpm2);
  const cleanRows = rows.filter((_, i) => keepMask[i]);

  if (cleanRows.length === 0) {
    return { candidates: [], radiusUsed: maxRadius, typologyFactorUsed: 1.0 };
  }

  // Pre-compute typology factors per unique comp type
  const compTypes = [...new Set(cleanRows.map((r) => r.property_type ?? "apartment"))];
  const typologyFactorMap = new Map<string, number>();
  for (const compType of compTypes) {
    const tgt = targetPropertyType ?? "apartment";
    const factor = compType === tgt
      ? 1.0
      : await computeTypologyFactor(lat, lng, tgt, compType, targetArea);
    typologyFactorMap.set(compType, factor);
  }

  // Global factor = weighted average across all comps (for reporting)
  const allFactors = cleanRows.map((r) => typologyFactorMap.get(r.property_type ?? "apartment") ?? 1.0);
  const globalTypologyFactor = allFactors.reduce((s, f) => s + f, 0) / allFactors.length;

  // Compute IDW weights — minimum distance floor of 50m to avoid division issues
  const candidates: WeightedCandidate[] = cleanRows.map((row, i) => {
    const distM = Math.max(row.distance_m, 50);
    const idwWeight = 1 / Math.pow(distM, IDW_POWER);
    const typologyFactor = allFactors[i];
    const homogenizedPpm2 = (row.price / row.usable_area) * OFFER_FACTOR *
      Math.pow(targetArea / row.usable_area, AREA_EXPONENT) *
      typologyFactor;
    return { row, homogenizedPpm2, idwWeight, typologyFactor };
  });

  // Determine effective radius: smallest radius that contains >= MIN_SAMPLES
  let radiusUsed = maxRadius;
  for (const r of IDW_RADII_M) {
    const inRadius = candidates.filter((c) => c.row.distance_m <= r).length;
    if (inRadius >= MIN_SAMPLES) {
      radiusUsed = r;
      break;
    }
  }

  return { candidates, radiusUsed, typologyFactorUsed: globalTypologyFactor };
}

// ─── Homogenization ───────────────────────────────────────────────────────────

function homogenize(row: ListingRow, targetArea: number, typologyFactor = 1.0): number {
  return (row.price / row.usable_area) * OFFER_FACTOR *
    Math.pow(targetArea / row.usable_area, AREA_EXPONENT) *
    typologyFactor;
}

// ─── Price Factors (radar chart) ─────────────────────────────────────────────

function computePriceFactors(
  candidates: WeightedCandidate[],
  targetArea: number,
  radiusUsed: number,
  amenityFactor: number,           // internalFactor*condoFactor
  neighborhoodScore?: number
): PriceFactor[] {
  const n = candidates.length;
  const distances = candidates.map((c) => c.row.distance_m);
  const avgDist = mean(distances);

  const locationScore = clamp(1 - avgDist / radiusUsed, 0.3, 1.0);

  const areas = candidates.map((c) => c.row.usable_area);
  const avgArea = mean(areas);
  const areaDeviation = Math.abs(targetArea - avgArea) / avgArea;
  const sizeScore = clamp(1 - areaDeviation, 0.4, 1.0);

  const demandScore = clamp(0.4 + (n / MAX_SAMPLES) * 0.6, 0.4, 1.0);

  const ppm2 = candidates.map((c) => c.row.price / c.row.usable_area);
  const ppm2Mean = mean(ppm2);
  const ppm2Sd = stdDev(ppm2, ppm2Mean);
  const cov = ppm2Sd / ppm2Mean;
  const conditionScore = clamp(1 - cov * 2, 0.3, 1.0);

  const amenityScoreDisplay = clamp(amenityFactor, 0.5, 1.0);

  const distSd = stdDev(distances, avgDist);
  const transportScore = clamp(1 - distSd / radiusUsed, 0.4, 1.0);

  return [
    { label: "Mercado Local",  score: Number(locationScore.toFixed(2)) },
    { label: "Consistência",   score: Number(conditionScore.toFixed(2)) },
    { label: "Volume de Dados",score: Number(demandScore.toFixed(2)) },
    { label: "Perfil da Região",score: Number(sizeScore.toFixed(2)) },
    { label: "Comodidades",    score: Number(amenityScoreDisplay.toFixed(2)) },
    { label: "Cobertura",      score: Number(transportScore.toFixed(2)) },
    { label: "Vizinhança",     score: neighborhoodScore ?? 0.50 },
  ];
}

// ─── Confidence Score (0–100) ─────────────────────────────────────────────────

function computeConfidenceScore(
  n: number,
  ciLower: number,
  ciUpper: number,
  estimatedValue: number
): number {
  const ciWidth = (ciUpper - ciLower) / estimatedValue;
  const ciScore = clamp(1 - ciWidth, 0, 1);
  const sampleScore = clamp(n / 30, 0, 1);
  const raw = ciScore * 0.6 + sampleScore * 0.4;
  return Number(clamp(raw * 100, 40, 99).toFixed(1));
}

// ─── Frontend Comparables ─────────────────────────────────────────────────────

export function toFrontendComparables(
  candidates: WeightedCandidate[],
  maxCount = 5
): FrontendComparable[] {
  // Show closest comps regardless of weight — more intuitive for the user
  const sorted = [...candidates].sort((a, b) => a.row.distance_m - b.row.distance_m);
  return sorted.slice(0, maxCount).map(({ row }) => ({
    address: [row.neighborhood, row.city].filter(Boolean).join(", "),
    neighborhood: [row.neighborhood, row.city].filter(Boolean).join(", "),
    price_brl: row.price,
    area_m2: row.usable_area,
    bedrooms: row.bedrooms,
    price_m2_brl: Math.round(row.price / row.usable_area),
    status: "listed" as const,
    transaction_date: row.last_seen,
    source_url: row.source_url,
    lat: row.lat,
    lng: row.lng,
  }));
}

// ─── Homogenization Factors ───────────────────────────────────────────────────

export interface HomogenizationFactors {
  ensemble_ppm2: number;
  offer_factor: number;
  typology_factor: number;
  corner_factor: number;
  slope_factor: number;
  level_factor: number;
  physical_factor: number;
  amenity_internal: number;
  amenity_condo: number;
  amenity_proximo: number;
  amenity_factor: number;
  combined_factor: number;
  ppm2_homogenized: number;
  area_m2: number;
  market_value: number;
}

export function buildHomogenizationFactors(p: {
  ensemblePpm2: number;
  offerFactor: number;
  typologyFactor: number;
  cornerFactor: number;
  slopeFactor: number;
  levelFactor: number;
  internalFactor: number;
  condoFactor: number;
  proximoFactor: number;
  areaM2: number;
}): HomogenizationFactors {
  const physical = p.cornerFactor * p.slopeFactor * p.levelFactor;
  const amenity = p.internalFactor * p.condoFactor * p.proximoFactor;
  const combined = physical * amenity;
  const ppm2Homog = p.ensemblePpm2 * combined;
  const round = (v: number, d = 6) => Number(v.toFixed(d));
  return {
    ensemble_ppm2: round(p.ensemblePpm2, 2),
    offer_factor: round(p.offerFactor),
    typology_factor: round(p.typologyFactor),
    corner_factor: round(p.cornerFactor),
    slope_factor: round(p.slopeFactor),
    level_factor: round(p.levelFactor),
    physical_factor: round(physical),
    amenity_internal: round(p.internalFactor),
    amenity_condo: round(p.condoFactor),
    amenity_proximo: round(p.proximoFactor),
    amenity_factor: round(amenity),
    combined_factor: round(combined),
    ppm2_homogenized: round(ppm2Homog, 2),
    area_m2: round(p.areaM2, 2),
    market_value: round(ppm2Homog * p.areaM2, 2),
  };
}

// ─── Extended Valuation Result ────────────────────────────────────────────────

export interface ExtendedValuationResult extends ValuationResult {
  confidence_score: number;
  price_factors: PriceFactor[];
  frontend_comparables: FrontendComparable[];
  method_estimates: MethodEstimate[];
  primary_method: "mcd_idw" | "wls" | "gbdt" | "ensemble";
  typology_factor: number;
  neighborhood_pois: NeighborhoodData | null;
  price_per_m2_homogenized: number;
  amenity_breakdown: import("@/lib/amenities/factors").ScopeContribution[];
  amenity_factors: { internal: number; condo: number; proximo: number };
  homogenization_factors: HomogenizationFactors;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export async function runValuation(
  req: ValuationRequest & {
    amenities?: AmenitySelection[];
    in_gated_community?: boolean;
    is_corner?: boolean;
    terrain_slope?: TerrainSlope;
    street_level?: StreetLevel;
  }
): Promise<ExtendedValuationResult> {
  const { lat, lng, target_area, target_bedrooms } = req;
  const amenities = req.amenities ?? [];
  const targetPropertyType = req.target_property_type ?? null;

  const { candidates, radiusUsed, typologyFactorUsed } = await fetchIDWCandidates(
    lat, lng, target_area, target_bedrooms, targetPropertyType
  );

  if (candidates.length < MIN_SAMPLES) {
    throw new Error("Insufficient comparable listings found. Try a broader search area.");
  }

  // ── IDW weighted mean and std dev ─────────────────────────────────────────
  const homPpm2 = candidates.map((c) => c.homogenizedPpm2);
  const weights = candidates.map((c) => c.idwWeight);

  const wAvg = weightedMean(homPpm2, weights);
  const wSd = weightedStdDev(homPpm2, weights, wAvg);

  // Effective sample size for t-Student (Kish approximation)
  const sumW = weights.reduce((s, w) => s + w, 0);
  const sumW2 = weights.reduce((s, w) => s + w * w, 0);
  const nEff = Math.max(1, Math.round((sumW * sumW) / sumW2));

  const sem = wSd / Math.sqrt(nEff);
  const tFactor = getTStudentFactor(nEff >= 15 ? 99 : nEff - 1);
  const ciLower = wAvg - tFactor * sem;
  const ciUpper = wAvg + tFactor * sem;
  const estimatedValue = wAvg * target_area;

  // Median over unweighted sorted values (robust central tendency)
  const sortedHom = [...homPpm2].sort((a, b) => a - b);
  const med = median(sortedHom);

  // ── Build internal comparables list ───────────────────────────────────────
  const comparables: ComparableListing[] = [...candidates]
    .sort((a, b) => a.row.distance_m - b.row.distance_m)
    .slice(0, 5)
    .map(({ row }) => ({
      id: row.id,
      source_url: row.source_url,
      price: row.price,
      price_per_m2: Number((row.price / row.usable_area).toFixed(2)),
      usable_area: row.usable_area,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      parking_spaces: row.parking_spaces,
      coordinates: { lat: row.lat, lng: row.lng },
      neighborhood: row.neighborhood,
      city: row.city,
      distance_m: Math.round(row.distance_m),
      homogenized_price_per_m2: Number(homogenize(row, target_area, typologyFactorUsed).toFixed(2)),
    }));

  // ── Ensemble: MCD+IDW + WLS + GBDT ───────────────────────────────────────
  const ensembleSamples: EnsembleSample[] = candidates.map((c) => ({
    ppm2: c.row.price / c.row.usable_area,
    homPpm2: c.homogenizedPpm2,
    area: c.row.usable_area,
    bedrooms: c.row.bedrooms ?? 0,
    bathrooms: c.row.bathrooms ?? 0,
    parking: c.row.parking_spaces ?? 0,
    lat: c.row.lat,
    lng: c.row.lng,
    idwWeight: c.idwWeight,
  }));

  const ensembleTarget: EnsembleTarget = {
    area: target_area,
    bedrooms: target_bedrooms ?? 0,
    bathrooms: req.target_bathrooms ?? 0,
    parking: req.target_parking ?? 0,
    lat,
    lng,
  };

  const ensemble = runEnsemble(
    ensembleSamples,
    ensembleTarget,
    wAvg,
    ciLower,
    ciUpper,
    nEff
  );

  const finalPpm2 = ensemble.predicted_ppm2;
  const finalEstimatedValue = finalPpm2 * target_area;
  const finalCiLowerBrl = Math.max(0, ensemble.ci_lower_ppm2 * target_area);
  const finalCiUpperBrl = ensemble.ci_upper_ppm2 * target_area;

  // ── Fetch neighborhood (needed for proximoFactor before combinedFactor) ────
  let neighborhood: NeighborhoodData | null = null;
  try {
    neighborhood = await fetchNearbyPlaces(lat, lng);
  } catch {
    // Google Places API unavailable → proceed without neighborhood data
  }

  const scope = computeScopeFactors(amenities, req.in_gated_community ?? false);
  const proximoFactor = computeProximoFactor(neighborhood?.totalScore);

  // ── NBR post-ensemble homogenization (corner, slope, street level) ────────
  const cornerFactor = req.is_corner ? CORNER_FACTOR : 1.0;
  const slopeFactor  = SLOPE_FACTORS[req.terrain_slope ?? 'plano'] ?? 1.0;
  const levelFactor  = LEVEL_FACTORS[req.street_level ?? 'no_nivel'] ?? 1.0;
  const physicalFactor = cornerFactor * slopeFactor * levelFactor;
  const combinedFactor = applyScopeFactorsToCombined(physicalFactor, {
    internalFactor: scope.internalFactor,
    condoFactor: scope.condoFactor,
    proximoFactor,
  });

  const adjustedEstimatedValue = Number((finalEstimatedValue * combinedFactor).toFixed(2));
  const adjustedCiLower = Number((Math.max(0, finalCiLowerBrl) * combinedFactor).toFixed(2));
  const adjustedCiUpper = Number((finalCiUpperBrl * combinedFactor).toFixed(2));
  const pricePerM2Homogenized = Number((finalPpm2 * combinedFactor).toFixed(2));

  const confidenceScore = computeConfidenceScore(nEff, finalCiLowerBrl, finalCiUpperBrl, finalEstimatedValue);
  const priceFactors = computePriceFactors(
    candidates, target_area, radiusUsed,
    scope.internalFactor * scope.condoFactor,
    neighborhood?.totalScore
  );
  const frontendComparables = toFrontendComparables(candidates);

  return {
    estimated_value: adjustedEstimatedValue,
    price_per_m2_mean: Number(finalPpm2.toFixed(2)),
    price_per_m2_median: Number(med.toFixed(2)),
    confidence_interval: {
      lower: adjustedCiLower,
      upper: adjustedCiUpper,
      confidence_level: CONFIDENCE_LEVEL,
    },
    sample_size: candidates.length,
    radius_used_m: radiusUsed,
    offer_factor_applied: OFFER_FACTOR,
    comparables,
    confidence_score: confidenceScore,
    price_factors: priceFactors,
    frontend_comparables: frontendComparables,
    method_estimates: ensemble.method_estimates,
    primary_method: ensemble.primary_method,
    typology_factor: Number(typologyFactorUsed.toFixed(3)),
    neighborhood_pois: neighborhood,
    price_per_m2_homogenized: pricePerM2Homogenized,
    amenity_breakdown: scope.breakdown,
    amenity_factors: {
      internal: scope.internalFactor,
      condo: scope.condoFactor,
      proximo: proximoFactor,
    },
    homogenization_factors: buildHomogenizationFactors({
      ensemblePpm2: finalPpm2,
      offerFactor: OFFER_FACTOR,
      typologyFactor: typologyFactorUsed,
      cornerFactor,
      slopeFactor,
      levelFactor,
      internalFactor: scope.internalFactor,
      condoFactor: scope.condoFactor,
      proximoFactor,
      areaM2: target_area,
    }),
  };
}

// ─── t-Student critical values (80% CI, two-tailed) ──────────────────────────

const T_TABLE_80: Record<number, number> = {
  1: 3.078, 2: 1.886, 3: 1.638, 4: 1.533, 5: 1.476,
  6: 1.440, 7: 1.415, 8: 1.397, 9: 1.383, 10: 1.372,
  11: 1.363, 12: 1.356, 13: 1.350, 14: 1.345,
};

function getTStudentFactor(df: number): number {
  if (df <= 0) return T_80_LARGE;
  if (df >= 15) return T_80_LARGE;
  return T_TABLE_80[df] ?? T_80_LARGE;
}
