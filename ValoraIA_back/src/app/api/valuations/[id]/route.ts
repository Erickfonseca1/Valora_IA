import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, ValuationRecord } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ValuationRecord>>> {
  const { id } = await params;

  const db = getAdminClient();
  const { data, error } = await db
    .from("valuations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: "Valuation not found" },
      { status: 404 }
    );
  }

  const record: ValuationRecord = {
    id: data.id,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    property_type: data.property_type,
    area_m2: Number(data.area_m2),
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    parking_spaces: data.parking_spaces ?? null,
    construction_age: data.construction_age ?? null,
    conservation_state: data.conservation_state ?? "regular",
    terrain_slope: data.terrain_slope ?? "plano",
    street_level: data.street_level ?? "no_nivel",
    is_corner: data.is_corner ?? false,
    static_market_value_brl: data.static_market_value_brl ? Number(data.static_market_value_brl) : null,
    price_per_m2_homogenized: data.price_per_m2_homogenized ? Number(data.price_per_m2_homogenized) : null,
    confidence_score: data.confidence_score ? Number(data.confidence_score) : null,
    residual_land_value_brl: data.residual_land_value_brl ? Number(data.residual_land_value_brl) : null,
    max_buildable_area_m2: data.max_buildable_area_m2 ? Number(data.max_buildable_area_m2) : null,
    zoning_params: data.zoning_params ?? null,
    viability_scenarios: data.viability_scenarios ?? null,
    comparables: data.comparables ?? null,
    neighborhood_pois: data.neighborhood_pois ?? null,
    homogenization_factors: data.homogenization_factors ?? null,
    amenities: data.amenities ?? [],
    in_gated_community: data.in_gated_community ?? false,
    created_at: data.created_at,
  };

  return NextResponse.json({ success: true, data: record });
}
