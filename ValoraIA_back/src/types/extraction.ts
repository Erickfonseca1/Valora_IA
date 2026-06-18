import type { PropertyType, ConservationState, TerrainSlope, StreetLevel } from "./index";

export interface ExtractedField<T> {
  value: T | null;
  confidence: number; // 0..1
}

export interface ExtractionResult {
  summary: string;
  fields: {
    address?: ExtractedField<string>;
    property_type?: ExtractedField<PropertyType>;
    area_m2?: ExtractedField<number>;
    bedrooms?: ExtractedField<number>;
    bathrooms?: ExtractedField<number>;
    parking_spaces?: ExtractedField<number>;
    construction_age?: ExtractedField<number>;
    conservation_state?: ExtractedField<ConservationState>;
    terrain_slope?: ExtractedField<TerrainSlope>;
    street_level?: ExtractedField<StreetLevel>;
    is_corner?: ExtractedField<boolean>;
    in_gated_community?: ExtractedField<boolean>;
  };
  amenities: { item: string; confidence: number }[];
  gaps: string[];
}
