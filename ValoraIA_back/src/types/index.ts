// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Platform = "olx" | "zapimoveis" | "vivareal" | "quintoandar" | "imovelweb";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Listing {
  id: string;
  source_url: string;
  platform: Platform;
  price: number;
  usable_area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  coordinates: GeoPoint;
  neighborhood: string | null;
  city: string;
  price_per_m2: number;
  last_seen: string;
  created_at: string;
}

// ─── Ingest Types ─────────────────────────────────────────────────────────────

export interface IngestPayload {
  source_url: string;
  platform: Platform;
  price: string | number;
  usable_area: string | number;
  bedrooms?: string | number | null;
  bathrooms?: string | number | null;
  parking_spaces?: string | number | null;
  lat: string | number;
  lng: string | number;
  neighborhood?: string | null;
  city: string;
}

export interface IngestResult {
  action: "created" | "updated";
  id: string;
  source_url: string;
}

// ─── Valuation / MCDDM Types ──────────────────────────────────────────────────

export interface ValuationRequest {
  lat: number;
  lng: number;
  target_area: number;
  target_bedrooms?: number | null;
  target_bathrooms?: number | null;
  target_parking?: number | null;
  target_property_type?: string | null;
}

export interface ComparableListing {
  id: string;
  source_url: string;
  platform: Platform;
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
  confidence_level: number; // e.g. 0.80
}

export interface ValuationResult {
  estimated_value: number;
  price_per_m2_mean: number;
  price_per_m2_median: number;
  confidence_interval: ConfidenceInterval;
  sample_size: number;
  radius_used_m: number;
  offer_factor_applied: number; // e.g. 0.90
  comparables: ComparableListing[];
}

// ─── DB Row (raw from Supabase) ───────────────────────────────────────────────

export interface ListingRow {
  id: string;
  source_url: string;
  platform: string;
  price: number;
  usable_area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  // PostGIS returns as GeoJSON or lon/lat columns depending on query
  lat: number;
  lng: number;
  neighborhood: string | null;
  city: string;
  price_per_m2: number;
  last_seen: string;
  created_at: string;
  distance_m: number;
  images: string[];
  amenities: string[];
  property_type: string | null;
}

// ─── Front-end Valuation (wizard + report) ────────────────────────────────────

export type PropertyType = "apartment" | "house" | "commercial" | "land";
export type MarketTemperature = "hot" | "warm" | "cold";

export interface PriceFactor {
  label: string;
  score: number; // 0–1
}

export interface MethodEstimate {
  method: "mcd_idw" | "wls" | "gbdt";
  predicted_ppm2: number;
  weight: number;
  meta: Record<string, unknown>;
}

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
  amenities?: string[];
}

export interface ValuationRecord {
  id: string;
  address: string;
  neighborhood: string | null;
  city: string | null;
  property_type: PropertyType;
  area_m2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  amenities: string[];
  price_range_min_brl: number;
  price_range_max_brl: number;
  recommended_listing_price_brl: number;
  confidence_score: number;
  price_factors: PriceFactor[];
  comparables: FrontendComparable[];
  method_estimates?: MethodEstimate[];
  primary_method?: "mcd_idw" | "wls" | "gbdt" | "ensemble";
  created_at: string;
}

export interface ValuationCreateRequest {
  address: string;
  property_type: PropertyType;
  area_m2: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spots?: number | null;
  amenities?: string[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

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
  neighborhood: string;
  property_type: PropertyType;
  price_brl: number;
  confidence_score: number;
  created_at: string;
  bedrooms: number | null;
  area_m2: number;
}

export interface DashboardValuationsResponse {
  total: number;
  items: DashboardValuationItem[];
}

// ─── Market Trend ─────────────────────────────────────────────────────────────

export interface MarketTrendResponse {
  city: string;
  period_months: number;
  current_price_m2: number;
  yearly_change_pct: number;
  data_points: number[];
}

// ─── API Response wrapper ─────────────────────────────────────────────────────

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
