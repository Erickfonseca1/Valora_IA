export type Screen = 'dashboard' | 'valuation-flow' | 'report'

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land'
export type MarketTemperature = 'hot' | 'warm' | 'cold'
export type ConservationState = "A" | "AB" | "B" | "BC" | "C" | "CD" | "D" | "DE" | "E";
export type TerrainSlope = "flat" | "gentle" | "steep";
export type StreetLevel = "same" | "above" | "below";
export type ConstructionStandard = "high" | "medium" | "popular";

export interface RadarFactor {
  label: string
  value: number
}

export interface PriceFactor {
  label: string
  score: number
}

export interface NearbyPlace {
  name: string
  vicinity: string
  type: string
  distance_m: number
}

export interface NeighborhoodPOI {
  category: string
  label: string
  places: NearbyPlace[]
  score: number
  weight: number
}

export interface NeighborhoodData {
  pois: NeighborhoodPOI[]
  totalScore: number
}

export interface FrontendComparable {
  address: string
  neighborhood: string
  price_brl: number
  area_m2: number
  bedrooms: number | null
  price_m2_brl: number
  status: 'sold' | 'listed'
  transaction_date: string
  source_url?: string
  images?: string[]
  amenities?: string[]
}

export interface MethodEstimate {
  method: 'mcd_idw' | 'wls' | 'gbdt'
  predicted_ppm2: number
  weight: number
  meta: Record<string, unknown>
}

export interface ViabilityScenario {
  label: string
  description: string
  VGV_total: number
  residual: number
  roi_pct: number
}

export interface ZoningInfo {
  zone_code?: string
  IA_max: number
  land_use?: string
  restrictions?: string
}

export interface PhotoAnalysisResult {
  padrao_construtivo: "Alto" | "Médio" | "Popular"
  estado_conservacao_sugerido: ConservationState
  comodidades_detectadas: string[]
}

export interface HomogenizationFactors {
  corner_factor: number
  slope_factor: number
  level_factor: number
  offer_factor: number
  combined_factor: number
}

export interface RossHeideckeResult {
  depreciation_coefficient: number
  remaining_value_pct: number
}

export interface ValuationRecord {
  id: string
  address: string
  neighborhood: string | null
  city: string | null
  property_type: PropertyType
  area_m2: number
  bedrooms: number | null
  bathrooms: number | null
  parking_spots: number | null
  amenities: string[]
  price_range_min_brl: number
  price_range_max_brl: number
  recommended_listing_price_brl: number
  confidence_score: number
  price_factors: PriceFactor[]
  comparables: FrontendComparable[]
  method_estimates?: MethodEstimate[]
  primary_method?: 'mcd_idw' | 'wls' | 'gbdt' | 'ensemble'
  neighborhood_pois?: NeighborhoodData | null
  // V2 PTAM fields — all optional so existing records stay valid
  construction_age?: number
  conservation_state?: ConservationState
  is_corner?: boolean
  terrain_slope?: TerrainSlope
  street_level?: StreetLevel
  static_market_value?: number
  residual_land_value?: number
  max_buildable_area?: number
  viability_scenarios?: ViabilityScenario[]
  zoning_info?: ZoningInfo | null
  property_photos?: string[]
  ross_heidecke_result?: RossHeideckeResult
  homogenization_factors?: HomogenizationFactors
  created_at: string
}

export interface DashboardMetrics {
  valuations_this_month: number
  valuations_prev_month: number
  avg_confidence: number
  market_temperature: MarketTemperature
  market_city: string
}

export interface DashboardValuationItem {
  id: string
  address: string
  neighborhood: string
  property_type: PropertyType
  price_brl: number
  confidence_score: number
  created_at: string
  bedrooms: number | null
  area_m2: number
}

export interface DashboardValuationsResponse {
  total: number
  items: DashboardValuationItem[]
}

export interface MarketTrendResponse {
  city: string
  period_months: number
  current_price_m2: number
  yearly_change_pct: number
  data_points: number[]
}

export interface CreateValuationBody {
  address: string
  property_type: PropertyType
  area_m2: number
  bedrooms?: number | null
  bathrooms?: number | null
  parking_spots?: number | null
  amenities?: string[]
  lat?: number
  lng?: number
  construction_age?: number
  conservation_state?: ConservationState
  is_corner?: boolean
  terrain_slope?: TerrainSlope
  street_level?: StreetLevel
  property_photos?: string[]
  construction_standard?: ConstructionStandard
}

export interface ValuationForm {
  address: string
  propertyType: PropertyType
  beds: string
  baths: string
  parking: string
  area: string
  amenities: string[]
  construction_age: string
  conservation_state: ConservationState | ''
  is_corner: boolean
  terrain_slope: TerrainSlope | ''
  street_level: StreetLevel | ''
  photos: File[]
  photoUrls: string[]
}
