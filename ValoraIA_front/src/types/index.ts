export type Screen = 'dashboard' | 'valuation-flow' | 'report'

export type AmenityScope = 'interno' | 'condo' | 'proximo'
export interface AmenitySelection { item: string; scope: AmenityScope }

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land'
export type MarketTemperature = 'hot' | 'warm' | 'cold'

// DB enum types — must match newschema.sql exactly
export type ConservationState =
  | 'novo'
  | 'entre_novo_e_regular'
  | 'regular'
  | 'reparos_simples'
  | 'reparos_importantes'
  | 'critico'

export type TerrainSlope =
  | 'plano'
  | 'aclive_leve'
  | 'declive_leve'
  | 'aclive_acentuado'
  | 'declive_acentuado'

export type StreetLevel = 'no_nivel' | 'abaixo_nivel' | 'acima_nivel'

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
  lat: number | null
  lng: number | null
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
  lat: number | null
  lng: number | null
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

export interface ZoningParams {
  IAb?: number
  IAmax: number
  TO?: number
}

export interface PhotoAnalysisResult {
  padrao_construtivo: 'Alto' | 'Médio' | 'Popular'
  estado_conservacao_sugerido: ConservationState
  comodidades_detectadas: string[]
}

export interface HomogenizationFactors {
  ensemble_ppm2: number
  offer_factor: number
  typology_factor: number
  corner_factor: number
  slope_factor: number
  level_factor: number
  physical_factor: number
  amenity_internal: number
  amenity_condo: number
  amenity_proximo: number
  amenity_factor: number
  combined_factor: number
  ppm2_homogenized: number
  area_m2: number
  market_value: number
}

// Maps 1:1 to valuations table columns
export interface ValuationRecord {
  id: string
  address: string
  lat: number | null
  lng: number | null
  property_type: PropertyType
  area_m2: number
  bedrooms: number | null
  bathrooms: number | null
  parking_spaces: number | null
  // PTAM inputs
  construction_age: number | null
  conservation_state: ConservationState
  terrain_slope: TerrainSlope
  street_level: StreetLevel
  is_corner: boolean
  // Results — comparative method
  static_market_value_brl: number | null
  price_per_m2_homogenized: number | null
  confidence_score: number | null
  // Results — involutive method
  residual_land_value_brl: number | null
  max_buildable_area_m2: number | null
  zoning_params: ZoningParams | null
  viability_scenarios: ViabilityScenario[] | null
  // Report metadata
  comparables: FrontendComparable[] | null
  neighborhood_pois: NeighborhoodData | null
  amenities: AmenitySelection[]
  in_gated_community: boolean
  amenity_factors?: { internal: number; condo: number; proximo: number }
  amenity_breakdown?: { scope: AmenityScope; item: string; contribution: number; derived: boolean }[]
  homogenization_factors?: HomogenizationFactors | null
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
  property_type: PropertyType
  static_market_value_brl: number | null
  confidence_score: number | null
  created_at: string
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
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  construction_age?: number
  conservation_state?: ConservationState
  terrain_slope?: TerrainSlope
  street_level?: StreetLevel
  is_corner?: boolean
  lat?: number
  lng?: number
  amenities?: AmenitySelection[]
  in_gated_community?: boolean
}

export interface ValuationForm {
  address: string
  propertyType: PropertyType
  area: string
  bedrooms: string
  bathrooms: string
  parking_spaces: string
  construction_age: string
  conservation_state: ConservationState | ''
  is_corner: boolean
  terrain_slope: TerrainSlope | ''
  street_level: StreetLevel | ''
  photos: File[]
  photoUrls: string[]
  amenities: AmenitySelection[]
  in_gated_community: boolean
}

// ─── Extraction (entrada natural por IA) ──────────────────────────────────────

export interface ExtractedField<T> {
  value: T | null
  confidence: number
}

export interface ExtractionResult {
  summary: string
  fields: {
    address?: ExtractedField<string>
    property_type?: ExtractedField<PropertyType>
    area_m2?: ExtractedField<number>
    bedrooms?: ExtractedField<number>
    bathrooms?: ExtractedField<number>
    parking_spaces?: ExtractedField<number>
    construction_age?: ExtractedField<number>
    conservation_state?: ExtractedField<ConservationState>
    terrain_slope?: ExtractedField<TerrainSlope>
    street_level?: ExtractedField<StreetLevel>
    is_corner?: ExtractedField<boolean>
    in_gated_community?: ExtractedField<boolean>
  }
  amenities: { item: string; confidence: number }[]
  gaps: string[]
}

export type FieldSource = 'audio' | 'photo' | 'manual'
export type FormFieldSource = Partial<Record<keyof ValuationForm, FieldSource>>
