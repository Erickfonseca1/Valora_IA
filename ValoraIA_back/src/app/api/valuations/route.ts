import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { runValuation } from "@/lib/math/valuation-engine";
import { runInvolutive } from "@/lib/math/involutive-engine";
import { geocodeAddress } from "@/lib/geocoding/google-maps";
import type {
  ApiResponse,
  ValuationRecord,
  ZoningParams,
} from "@/types";

const ValuationCreateSchema = z.object({
  address: z.string().min(5).max(500),
  property_type: z.enum(["apartment", "house", "commercial", "land"]),
  area_m2: z.number().positive(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  parking_spaces: z.number().int().min(0).max(20).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  construction_age: z.number().int().min(0).max(300).optional(),
  conservation_state: z.enum([
    "novo", "entre_novo_e_regular", "regular",
    "reparos_simples", "reparos_importantes", "critico",
  ]).optional(),
  terrain_slope: z.enum([
    "plano", "aclive_leve", "declive_leve", "aclive_acentuado", "declive_acentuado",
  ]).optional(),
  street_level: z.enum(["no_nivel", "abaixo_nivel", "acima_nivel"]).optional(),
  is_corner: z.boolean().optional(),
  amenities: z.array(z.object({
    item: z.string(),
    scope: z.enum(["interno", "condo", "proximo"]),
  })).optional(),
  in_gated_community: z.boolean().optional(),
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
    address, property_type, area_m2,
    bedrooms, bathrooms, parking_spaces,
    lat: bodyLat, lng: bodyLng,
    construction_age, conservation_state, terrain_slope, street_level, is_corner,
    amenities, in_gated_community,
  } = parsed.data;

  // ── Geocode ───────────────────────────────────────────────────────────────
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

  // ── Zoning stub (no public BR zoning API — urban default) ────────────────
  const zoning_params: ZoningParams = { IAb: 1.0, IAmax: 2.0, TO: 0.5 };

  // ── Valuation engine ──────────────────────────────────────────────────────
  let engineResult;
  try {
    engineResult = await runValuation({
      lat: geo.lat,
      lng: geo.lng,
      target_area: area_m2,
      target_bedrooms: bedrooms ?? null,
      target_bathrooms: bathrooms ?? null,
      target_parking: parking_spaces ?? null,
      target_property_type: property_type,
      is_corner,
      terrain_slope,
      street_level,
      amenities: amenities ?? [],
      in_gated_community: in_gated_community ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Valuation failed";
    if (message.startsWith("Insufficient")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    console.error("[valuations] engine error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }

  const {
    estimated_value,
    price_per_m2_homogenized,
    confidence_score,
    frontend_comparables,
    neighborhood_pois,
    homogenization_factors,
  } = engineResult;

  // ── Involutive (land only) ────────────────────────────────────────────────
  let involutiveResult = null;
  if (property_type === "land") {
    involutiveResult = runInvolutive({
      area_terreno: area_m2,
      zoning_params,
      VGV_estimado_m2: engineResult.price_per_m2_mean,
    });
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  const db = getAdminClient();
  const { data: row, error } = await db
    .from("valuations")
    .insert({
      address,
      lat: geo.lat,
      lng: geo.lng,
      property_type,
      area_m2,
      bedrooms: bedrooms ?? null,
      bathrooms: bathrooms ?? null,
      parking_spaces: parking_spaces ?? null,
      construction_age: construction_age ?? null,
      conservation_state: conservation_state ?? "regular",
      terrain_slope: terrain_slope ?? "plano",
      street_level: street_level ?? "no_nivel",
      is_corner: is_corner ?? false,
      static_market_value_brl: estimated_value,
      price_per_m2_homogenized,
      confidence_score,
      residual_land_value_brl: involutiveResult?.residual_land_value_brl ?? null,
      max_buildable_area_m2: involutiveResult?.max_buildable_area_m2 ?? null,
      zoning_params: property_type === "land" ? zoning_params : null,
      viability_scenarios: involutiveResult?.viability_scenarios ?? null,
      comparables: frontend_comparables,
      neighborhood_pois,
      homogenization_factors,
      amenities: amenities ?? [],
      in_gated_community: in_gated_community ?? false,
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
    lat: geo.lat,
    lng: geo.lng,
    property_type,
    area_m2,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    parking_spaces: parking_spaces ?? null,
    construction_age: construction_age ?? null,
    conservation_state: conservation_state ?? "regular",
    terrain_slope: terrain_slope ?? "plano",
    street_level: street_level ?? "no_nivel",
    is_corner: is_corner ?? false,
    static_market_value_brl: estimated_value,
    price_per_m2_homogenized,
    confidence_score,
    residual_land_value_brl: involutiveResult?.residual_land_value_brl ?? null,
    max_buildable_area_m2: involutiveResult?.max_buildable_area_m2 ?? null,
    zoning_params: property_type === "land" ? zoning_params : null,
    viability_scenarios: involutiveResult?.viability_scenarios ?? null,
    comparables: frontend_comparables,
    neighborhood_pois,
    homogenization_factors,
    amenities: amenities ?? [],
    in_gated_community: in_gated_community ?? false,
    created_at: row.created_at,
  };

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}
