import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { runValuation } from "@/lib/math/valuation-engine";
import { computeRossHeidecke } from "@/lib/math/ross-heidecke";
import { runInvolutive } from "@/lib/math/involutive-engine";
import { analyzePropertyPhotos } from "@/lib/ai/photo-analyzer";
import { geocodeAddress } from "@/lib/geocoding/google-maps";
import type {
  ApiResponse,
  ConservationState,
  ConstructionStandard,
  RossHeideckeResult,
  ValuationRecord,
  ZoningInfo,
} from "@/types";

const ValuationCreateSchema = z.object({
  address: z.string().min(5).max(500),
  property_type: z.enum(["apartment", "house", "commercial", "land"]),
  area_m2: z.number().positive(),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  parking_spots: z.number().int().min(0).nullable().optional(),
  amenities: z.array(z.string()).optional().default([]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  construction_age: z.number().int().min(0).max(200).optional(),
  conservation_state: z.enum(["A","AB","B","BC","C","CD","D","DE","E"]).optional(),
  is_corner: z.boolean().optional(),
  terrain_slope: z.enum(["flat","gentle","steep"]).optional(),
  street_level: z.enum(["same","above","below"]).optional(),
  property_photos: z.array(z.string()).optional().default([]),
  construction_standard: z.enum(["high","medium","popular"]).optional().default("medium"),
});

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<ValuationRecord>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ValuationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const {
    address, property_type, area_m2, bedrooms, bathrooms, parking_spots, amenities,
    lat: bodyLat, lng: bodyLng,
    construction_age, conservation_state, is_corner, terrain_slope, street_level,
    property_photos, construction_standard,
  } = parsed.data;

  // ── Geocode address (skip if lat/lng provided directly) ───────────────────
  let geo: { lat: number; lng: number; neighborhood: string | null; city: string | null } | null = null;

  if (bodyLat !== undefined && bodyLng !== undefined) {
    geo = { lat: bodyLat, lng: bodyLng, neighborhood: null, city: null };
  } else {
    geo = await geocodeAddress(address);
    if (!geo) {
      return NextResponse.json(
        { success: false, error: "Could not geocode address. Try a more specific address including city and state." },
        { status: 422 }
      );
    }
  }

  // ── Zoning stub (no public BR zoning API — use urban default) ────────────
  const zoning_info: ZoningInfo = {
    zone_code: "ZR-2",
    IA_max: 2.0,
    land_use: "Residencial",
    restrictions: "Dados de zoneamento indisponíveis — usando padrão urbano brasileiro.",
  };

  // ── Photo analysis — auto-fills conservation_state when user didn't set it ──
  let effectiveConservationState = conservation_state;
  if (property_photos && property_photos.length > 0 && !conservation_state) {
    try {
      const photoAnalysis = await analyzePropertyPhotos(property_photos);
      effectiveConservationState = photoAnalysis.estado_conservacao_sugerido;
    } catch { /* non-fatal */ }
  }

  // ── Ross-Heidecke depreciation ────────────────────────────────────────────
  let rossHeidecke: RossHeideckeResult | null = null;
  if (construction_age != null && effectiveConservationState) {
    rossHeidecke = computeRossHeidecke({
      construction_age,
      conservation_state: effectiveConservationState as ConservationState,
      construction_standard: (construction_standard ?? "medium") as ConstructionStandard,
    });
  }

  const rossHeideckeRecord = rossHeidecke
    ? { ...rossHeidecke, construction_standard: construction_standard ?? "medium" }
    : null;

  // ── MCDDM valuation engine ────────────────────────────────────────────────
  let engineResult;
  try {
    engineResult = await runValuation({
      lat: geo.lat,
      lng: geo.lng,
      target_area: area_m2,
      target_bedrooms: bedrooms ?? null,
      target_bathrooms: bathrooms ?? null,
      target_parking: parking_spots ?? null,
      target_property_type: property_type,
      amenities,
      is_corner,
      terrain_slope,
      street_level,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Valuation failed";
    if (message.startsWith("Insufficient")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    console.error("[valuations] engine error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  // Static market value = estimated_value before any land-specific adjustment
  const static_market_value = engineResult.estimated_value;

  // ── Involutive engine (land only) ─────────────────────────────────────────
  let involutiveResult = null;
  if (property_type === "land") {
    involutiveResult = runInvolutive({
      area_terreno: area_m2,
      IA_max: zoning_info.IA_max,
      VGV_estimado_m2: engineResult.price_per_m2_mean,
    });
  }

  const {
    confidence_interval,
    price_per_m2_mean,
    confidence_score,
    price_factors,
    frontend_comparables,
    sample_size,
    radius_used_m,
    method_estimates,
    primary_method,
    neighborhood_pois,
    homogenization_factors,
  } = engineResult;

  void price_per_m2_mean; // consumed by involutive engine above

  // recommended = mean of CI
  const recommended = Math.round((confidence_interval.lower + confidence_interval.upper) / 2);

  // ── Persist valuation ──────────────────────────────────────────────────────
  const db = getAdminClient();
  const { data: row, error } = await db
    .from("valuations")
    .insert({
      address,
      neighborhood: geo.neighborhood,
      city: geo.city,
      property_type,
      area_m2,
      bedrooms: bedrooms ?? null,
      bathrooms: bathrooms ?? null,
      parking_spots: parking_spots ?? null,
      amenities,
      price_range_min_brl: confidence_interval.lower,
      price_range_max_brl: confidence_interval.upper,
      recommended_listing_price_brl: recommended,
      confidence_score,
      price_factors,
      comparables: frontend_comparables,
      lat: geo.lat,
      lng: geo.lng,
      sample_size,
      radius_used_m,
      neighborhood_pois,
      method_estimates,
      primary_method,
      construction_age: construction_age ?? null,
      conservation_state: effectiveConservationState ?? null,
      is_corner: is_corner ?? null,
      terrain_slope: terrain_slope ?? null,
      street_level: street_level ?? null,
      property_photos: property_photos ?? [],
      static_market_value,
      residual_land_value: involutiveResult?.Valor_Residual_Terreno ?? null,
      max_buildable_area: involutiveResult?.max_buildable_area ?? null,
      viability_scenarios: involutiveResult?.viability_scenarios ?? null,
      zoning_info,
      homogenization_factors,
      ross_heidecke_result: rossHeideckeRecord ?? null,
    })
    .select("id, created_at")
    .single();

  if (error || !row) {
    console.error("[valuations] insert error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to persist valuation", details: error?.message },
      { status: 500 }
    );
  }

  const result: ValuationRecord = {
    id: row.id,
    address,
    neighborhood: geo.neighborhood,
    city: geo.city,
    property_type,
    area_m2,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    parking_spots: parking_spots ?? null,
    amenities,
    price_range_min_brl: Number(confidence_interval.lower.toFixed(2)),
    price_range_max_brl: Number(confidence_interval.upper.toFixed(2)),
    recommended_listing_price_brl: recommended,
    confidence_score,
    price_factors,
    comparables: frontend_comparables,
    method_estimates,
    primary_method,
    neighborhood_pois,
    created_at: row.created_at,
    // V2 fields:
    construction_age: construction_age ?? undefined,
    conservation_state: effectiveConservationState as ConservationState ?? undefined,
    is_corner: is_corner ?? undefined,
    terrain_slope: terrain_slope ?? undefined,
    street_level: street_level ?? undefined,
    property_photos: property_photos ?? [],
    static_market_value,
    residual_land_value: involutiveResult?.Valor_Residual_Terreno ?? undefined,
    max_buildable_area: involutiveResult?.max_buildable_area ?? undefined,
    viability_scenarios: involutiveResult?.viability_scenarios ?? undefined,
    zoning_info,
    homogenization_factors,
    ross_heidecke_result: rossHeideckeRecord ?? undefined,
  };

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}
