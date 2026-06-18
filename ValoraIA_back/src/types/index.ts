// ─── Core Domain Types ─────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type AmenityScope = "interno" | "condo" | "proximo";
export interface AmenitySelectionDTO { item: string; scope: AmenityScope; }

// ─── DB Enum Types — must match newschema.sql exactly ─────────────────────────

export type PropertyType = "apartment" | "house" | "commercial" | "land";
export type MarketTemperature = "hot" | "warm" | "cold";

export type ConservationState =
  | "novo"
  | "entre_novo_e_regular"
  | "regular"
  | "reparos_simples"
  | "reparos_importantes"
  | "critico";

export type TerrainSlope =
  | "plano"
  | "aclive_leve"
  | "declive_leve"
  | "aclive_acentuado"
  | "declive_acentuado";

export type StreetLevel = "no_nivel" | "abaixo_nivel" | "acima_nivel";

// ─── Listings Table ────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  source_url: string;
  price: number;
  usable_area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  property_type: PropertyType;
  coordinates: GeoPoint;
  neighborhood: string | null;
  city: string;
  construction_age: number | null;
  conservation_state: ConservationState;
  last_seen: string;
  created_at: string;
}

// ─── Ingest Types ──────────────────────────────────────────────────────────────

export interface IngestPayload {
  source_url: string;
  price: string | number;
  usable_area: string | number;
  bedrooms?: string | number | null;
  bathrooms?: string | number | null;
  parking_spaces?: string | number | null;
  property_type: PropertyType;
  lat: string | number;
  lng: string | number;
  neighborhood?: string | null;
  city: string;
  construction_age?: number | null;
  conservation_state?: ConservationState;
}

export interface IngestResult {
  action: "created" | "updated";
  id: string;
  source_url: string;
}

// ─── Valuation Engine Types ────────────────────────────────────────────────────

export interface ValuationRequest {
  lat: number;
  lng: number;
  target_area: number;
  target_bedrooms?: number | null;
  target_bathrooms?: number | null;
  target_parking?: number | null;
  target_property_type?: PropertyType | null;
}

export interface ComparableListing {
  id: string;
  source_url: string;
  price: number;
  price_per_m2: number;
  usable_area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  coordinates: GeoPoint;
  neighborhood: string | null;
  city: string;
  distance_m: number;
  homogenized_price_per_m2: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence_level: number;
}

export interface ValuationResult {
  estimated_value: number;
  price_per_m2_mean: number;
  price_per_m2_median: number;
  confidence_interval: ConfidenceInterval;
  sample_size: number;
  radius_used_m: number;
  offer_factor_applied: number;
  comparables: ComparableListing[];
}

// ─── DB Row (raw from Supabase listings table) ─────────────────────────────────

export interface ListingRow {
  id: string;
  source_url: string;
  price: number;
  usable_area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  property_type: PropertyType;
  lat: number;
  lng: number;
  neighborhood: string | null;
  city: string;
  construction_age: number | null;
  conservation_state: ConservationState;
  last_seen: string;
  created_at: string;
  distance_m: number;
}

// ─── Zoning Params (stored as JSONB in valuations.zoning_params) ──────────────

export interface ZoningParams {
  IAb?: number;   // Índice de Aproveitamento básico
  IAmax: number;  // Índice de Aproveitamento máximo
  TO?: number;    // Taxa de Ocupação
}

// ─── Comparable stored in valuations.comparables JSONB ────────────────────────

export interface FrontendComparable {
  address: string;
  neighborhood: string;
  price_brl: number;
  area_m2: number;
  bedrooms: number | null;
  price_m2_brl: number;
  status: "sold" | "listed";
  transaction_date: string;
  source_url?: string;
  images?: string[];
}

// ─── Viability Scenarios stored in valuations.viability_scenarios JSONB ────────

export interface ViabilityScenario {
  label: string;
  description: string;
  VGV_total: number;
  residual: number;
  roi_pct: number;
}

// ─── HomogenizationFactors — per-comparable homogenization breakdown ──────────

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

// ─── ValuationRecord — maps 1:1 to valuations table ───────────────────────────

export interface ValuationRecord {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  property_type: PropertyType;
  area_m2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  // PTAM inputs
  construction_age: number | null;
  conservation_state: ConservationState;
  terrain_slope: TerrainSlope;
  street_level: StreetLevel;
  is_corner: boolean;
  // Results — comparative method
  static_market_value_brl: number | null;
  price_per_m2_homogenized: number | null;
  confidence_score: number | null;
  // Results — involutive method
  residual_land_value_brl: number | null;
  max_buildable_area_m2: number | null;
  zoning_params: ZoningParams | null;
  viability_scenarios: ViabilityScenario[] | null;
  // Amenities
  amenities: AmenitySelectionDTO[];
  in_gated_community: boolean;
  // Report metadata
  comparables: FrontendComparable[] | null;
  neighborhood_pois: NeighborhoodData | null;
  homogenization_factors: HomogenizationFactors | null;
  created_at: string;
}

export interface ValuationCreateRequest {
  address: string;
  property_type: PropertyType;
  area_m2: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  construction_age?: number;
  conservation_state?: ConservationState;
  terrain_slope?: TerrainSlope;
  street_level?: StreetLevel;
  is_corner?: boolean;
  amenities?: AmenitySelectionDTO[];
  in_gated_community?: boolean;
}

// ─── Photo Analysis (valuation_photos table + AI) ─────────────────────────────

export interface PhotoAnalysisResult {
  padrao_construtivo: "Alto" | "Médio" | "Popular";
  estado_conservacao_sugerido: ConservationState;
  comodidades_detectadas: string[];
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface PriceFactor {
  label: string;
  score: number;
}

export interface MethodEstimate {
  method: "mcd_idw" | "wls" | "gbdt";
  predicted_ppm2: number;
  weight: number;
  meta: Record<string, unknown>;
}

export interface DashboardMetrics {
  valuations_this_month: number;
  valuations_prev_month: number;
  avg_confidence: number;
  market_temperature: MarketTemperature;
  market_city: string;
}

export interface DashboardValuationItem {
  id: string;
  address: string;
  property_type: PropertyType;
  static_market_value_brl: number | null;
  confidence_score: number | null;
  created_at: string;
  area_m2: number;
}

export interface DashboardValuationsResponse {
  total: number;
  items: DashboardValuationItem[];
}

// ─── Market Trend ──────────────────────────────────────────────────────────────

export interface MarketTrendResponse {
  city: string;
  period_months: number;
  current_price_m2: number;
  yearly_change_pct: number;
  data_points: number[];
}

// ─── Nearby Places / Neighborhood ──────────────────────────────────────────────

export interface NearbyPlace {
  name: string;
  vicinity: string;
  type: string;
  distance_m: number;
}

export interface NeighborhoodData {
  pois: { category: string; label: string; places: NearbyPlace[]; score: number; weight: number }[];
  totalScore: number;
}

// ─── API Response wrapper ──────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Extraction (entrada natural por IA) ──────────────────────────────────────

export type { ExtractedField, ExtractionResult } from "./extraction";
