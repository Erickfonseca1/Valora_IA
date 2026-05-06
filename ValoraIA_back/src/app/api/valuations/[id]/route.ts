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
    neighborhood: data.neighborhood,
    city: data.city,
    property_type: data.property_type,
    area_m2: data.area_m2,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    parking_spots: data.parking_spots,
    amenities: data.amenities ?? [],
    price_range_min_brl: data.price_range_min_brl,
    price_range_max_brl: data.price_range_max_brl,
    recommended_listing_price_brl: data.recommended_listing_price_brl,
    confidence_score: data.confidence_score,
    price_factors: data.price_factors ?? [],
    comparables: data.comparables ?? [],
    neighborhood_pois: data.neighborhood_pois ?? null,
    created_at: data.created_at,
    construction_age: data.construction_age ?? undefined,
    conservation_state: data.conservation_state ?? undefined,
    is_corner: data.is_corner ?? undefined,
    terrain_slope: data.terrain_slope ?? undefined,
    street_level: data.street_level ?? undefined,
    property_photos: data.property_photos ?? [],
    static_market_value: data.static_market_value ? Number(data.static_market_value) : undefined,
    residual_land_value: data.residual_land_value ? Number(data.residual_land_value) : undefined,
    max_buildable_area: data.max_buildable_area ? Number(data.max_buildable_area) : undefined,
    viability_scenarios: data.viability_scenarios ?? undefined,
    zoning_info: data.zoning_info ?? undefined,
    homogenization_factors: data.homogenization_factors ?? undefined,
    ross_heidecke_result: data.ross_heidecke_result ?? undefined,
    method_estimates: data.method_estimates ?? undefined,
    primary_method: data.primary_method ?? undefined,
  };

  return NextResponse.json({ success: true, data: record });
}
