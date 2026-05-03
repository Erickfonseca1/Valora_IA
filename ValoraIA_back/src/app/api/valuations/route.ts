import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { runValuation } from "@/lib/math/valuation-engine";
import { geocodeAddress } from "@/lib/geocoding/google-maps";
import type { ApiResponse, ValuationRecord } from "@/types";

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

  const { address, property_type, area_m2, bedrooms, bathrooms, parking_spots, amenities, lat: bodyLat, lng: bodyLng } =
    parsed.data;

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

  // ── Run MCDDM engine ───────────────────────────────────────────────────────
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
  } = engineResult;

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
  };

  void price_per_m2_mean;

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}
