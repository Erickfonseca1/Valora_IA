export type Screen = 'dashboard' | 'valuation-flow' | 'report'

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land'
export type MarketTemperature = 'hot' | 'warm' | 'cold'

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
}

export interface ValuationForm {
  address: string
  propertyType: PropertyType
  beds: string
  baths: string
  parking: string
  area: string
  amenities: string[]
}
