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
  source: string | null;
  price: number;
  usable_area: number;
  total_area: number | null;
  land_area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  suites: number | null;
  parking_spaces: number | null;
  property_type: PropertyType;
  coordinates: GeoPoint;
  neighborhood: string | null;
  city: string;
  address: string | null;
  state: string | null;
  condo_fee: number | null;
  iptu: number | null;
  construction_age: number | null;
  conservation_state: ConservationState;
  floor: number | null;
  total_floors: number | null;
  is_condo: boolean;
  is_new_launch: boolean;
  listing_created_at: string | null;
  last_seen: string;
  created_at: string;
}

// ─── Ingest Types ──────────────────────────────────────────────────────────────

export interface IngestPayload {
  source_url: string;
  source?: string;
  ad_id?: string;
  price: string | number;
  usable_area: string | number;
  total_area?: string | number;
  land_area?: string | number;
  bedrooms?: string | number | null;
  bathrooms?: string | number | null;
  suites?: string | number | null;
  parking_spaces?: string | number | null;
  condo_fee?: string | number;
  iptu?: string | number;
  property_type: PropertyType;
  lat: string | number;
  lng: string | number;
  neighborhood?: string | null;
  city: string;
  address?: string | null;
  state?: string | null;
  construction_age?: number | null;
  conservation_state?: ConservationState;
  floor?: number | null;
  total_floors?: number | null;
  is_condo?: boolean;
  is_new_launch?: boolean;
  listing_created_at?: string;
  images?: string[];
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
  target_construction_area?: number;
  target_land_area?: number | null;
  target_bedrooms?: number | null;
  target_bathrooms?: number | null;
  target_parking?: number | null;
  target_property_type?: PropertyType | null;
  /** neighborhood/city from geocoding — used for verified market prior */
  neighborhood?: string | null;
  city?: string | null;
  /** raw address text — fallback for bairro detection when geocoding misses it */
  address?: string | null;
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

export interface ConfidenceDiagnostics {
  sample_size: number;
  displayed_sample_size: number;
  effective_sample_size: number;
  same_typology_count: number;
  same_neighborhood_count: number;
  confidence_interval_width_pct: number;
  reasons: string[];
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
  land_area: number | null;
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
  lat: number | null;
  lng: number | null;
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
  area_construida_m2: number;
  area_terreno_m2: number | null;
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
    confidence_diagnostics: ConfidenceDiagnostics | null;
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
  market_reference: {
    neighborhood: string;
    raw_price_per_m2: number;
    price_per_m2: number;
    match_score: number;
    blend_weight: number;
    sample_quality: number;
  } | null;
  photos?: ValuationPhoto[];
  created_at: string;
  // Ownership (multi-tenant)
  organization_id?: string | null;
  created_by?: string | null;
  deleted_at?: string | null;
  organization?: {
    name: string;
    logo_url: string | null;
  } | null;
}

export interface CreateValuationRequest {
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
  /** photos per room — uploaded to Storage first, then attached to the record */
  photos?: { room: string; url: string }[];
}

export interface ValuationPhoto {
  id: string;
  room: string | null;
  photo_url: string;
  ai_analysis: Record<string, unknown> | null;
  created_at: string;
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
  valuations_per_day: { date: string; count: number }[];
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
  lat: number | null;
  lng: number | null;
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

// ─── Auth & Organizations (multi-tenant) ─────────────────────────────────────

export type OrgType = "solo" | "imobiliaria" | "escritorio";
export type MembershipRole = "owner" | "admin" | "avaliador" | "pending";

export interface Profile {
  id: string;
  full_name: string;
  creci: string | null;
  cnai: string | null;
  avatar_url: string | null;
  onboarding_completed_at?: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  logo_url: string | null;
  created_by: string | null;
  plan: string;
  created_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  invited_by: string | null;
  created_at: string;
}

export interface OrgInvite {
  id: string;
  organization_id: string;
  email: string;
  role: MembershipRole;
  token: string;
  invited_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface OrganizationMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: MembershipRole;
  created_at: string;
}

export interface OrganizationDetail extends Organization {
  members: OrganizationMember[];
  invites: OrgInvite[];
}
