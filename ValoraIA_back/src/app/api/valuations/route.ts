import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import { runValuation } from "@/lib/math/valuation-engine";
import { ensureLocalComparables } from "@/lib/apify/on-demand";
import { runInvolutive } from "@/lib/math/involutive-engine";
import { geocodeAddress, reverseGeocode } from "@/lib/geocoding/google-maps";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/security/audit";
import { getCurrentUser, resolveActiveOrg, getValuationScope, canAccessValuation } from "@/lib/access";
import type {
  ApiResponse,
  ValuationRecord,
  ZoningParams,
  DashboardValuationItem,
} from "@/types";

const ValuationCreateSchema = z.object({
  address: z.string().min(5).max(500),
  property_type: z.enum(["apartment", "house", "commercial", "land"]),
  area_m2: z.number().positive().optional(),
  area_construida_m2: z.number().positive().optional(),
  area_terreno_m2: z.number().positive().optional(),
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
  photos: z.array(z.object({
    room: z.string().min(1).max(60),
    url: z.string().min(1).max(2048),
  })).max(30).optional(),
});

// On-demand scraping can wait up to ~3 min for a bairro run (Vercel: Pro+).
export const maxDuration = 300;

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<ValuationRecord>>> {
  const ip = getClientIp(req);
  if (!rateLimit(`valuation:${ip}`, 20, 60_000)) return rateLimitResponse();

  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const organizationId = await resolveActiveOrg(db, user.id, req);

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
    address, property_type,
    area_m2: legacyArea,
    area_construida_m2: requestedConstructionArea,
    area_terreno_m2,
    bedrooms, bathrooms, parking_spaces,
    lat: bodyLat, lng: bodyLng,
    construction_age, conservation_state, terrain_slope, street_level, is_corner,
    amenities, in_gated_community, photos,
  } = parsed.data;

  const area_construida_m2 = requestedConstructionArea ?? legacyArea;
  if (!area_construida_m2) {
    return NextResponse.json({ success: false, error: "area_construida_m2 is required" }, { status: 422 });
  }
  if (property_type === "house" && !area_terreno_m2) {
    return NextResponse.json({ success: false, error: "area_terreno_m2 is required for houses" }, { status: 422 });
  }
  const effectiveLandArea = area_terreno_m2 ?? (property_type === "land" ? area_construida_m2 : null);

  // ── Geocode ───────────────────────────────────────────────────────────────
  let geo: { lat: number; lng: number; neighborhood: string | null; city: string | null } | null = null;

  if (bodyLat !== undefined && bodyLng !== undefined) {
    geo = { lat: bodyLat, lng: bodyLng, neighborhood: null, city: null };
    // Resolve neighborhood/city for the market prior even when coordinates
    // were sent directly (frontend map picker).
    try {
      const reversed = await reverseGeocode(bodyLat, bodyLng);
      if (reversed) {
        geo = {
          lat: bodyLat,
          lng: bodyLng,
          neighborhood: reversed.neighborhood,
          city: reversed.city,
        };
      }
    } catch {
      // Market prior lookup is best-effort; engine still works without it.
    }
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

  // ── On-demand comparables (scraping inteligente) ─────────────────────────
  // If the local DB lacks same-typology comps near the target, trigger a
  // synchronous VivaReal scrape scoped to the bairro+typology. Best-effort:
  // never blocks the valuation — errors just log and the engine proceeds
  // with whatever exists (market prior anchors weak samples).
  let onDemandResult: { before: unknown; after: unknown; collected: number; errors: string[] } | null = null;
  try {
    onDemandResult = await ensureLocalComparables({
      lat: geo.lat,
      lng: geo.lng,
      neighborhood: geo.neighborhood,
      city: geo.city ?? "João Pessoa",
      propertyType: property_type,
    });
    if (onDemandResult.collected > 0) {
      console.log(
        `[valuations] on-demand collected ${onDemandResult.collected} ${property_type} in ${geo.neighborhood ?? "city"}`
      );
    }
  } catch (err) {
    console.error("[valuations] on-demand trigger failed:", err);
  }

  // ── Valuation engine ──────────────────────────────────────────────────────
  let engineResult;
  try {
    engineResult = await runValuation({
      lat: geo.lat,
      lng: geo.lng,
      target_area: area_construida_m2,
      target_construction_area: area_construida_m2,
      target_land_area: effectiveLandArea,
      target_bedrooms: bedrooms ?? null,
      target_bathrooms: bathrooms ?? null,
      target_parking: parking_spaces ?? null,
      target_property_type: property_type,
      neighborhood: geo.neighborhood,
      city: geo.city,
      address,
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
    confidence_diagnostics,
  } = engineResult;

  // ── Involutive (land only) ────────────────────────────────────────────────
  let involutiveResult = null;
  if (property_type === "land") {
    involutiveResult = runInvolutive({
      area_terreno: effectiveLandArea!,
      zoning_params,
      VGV_estimado_m2: engineResult.price_per_m2_mean,
    });
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  const { data: row, error } = await db
    .from("valuations")
    .insert({
      address,
      city: geo.city ?? null,
      lat: geo.lat,
      lng: geo.lng,
      property_type,
      organization_id: organizationId,
      created_by: user.id,
      area_construida_m2,
      area_terreno_m2: effectiveLandArea,
      area_m2: area_construida_m2,
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
      confidence_diagnostics,
      market_reference: engineResult.market_reference,
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

  await logAudit(db, {
    action: "valuation.create",
    entityType: "valuation",
    entityId: row.id,
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    metadata: {
      property_type,
      city: geo.city,
      neighborhood: geo.neighborhood,
      // Unit economics: o que este estudo consumiu de coleta de dados.
      apify_collected: onDemandResult?.collected ?? 0,
      apify_skipped_cache: onDemandResult?.skipped_due_to_cache ?? true,
    },
  });

  // ── Persist photos per room (best-effort; doesn't fail the valuation) ──────
  let persistedPhotos: import("@/types").ValuationPhoto[] = [];
  if (photos && photos.length > 0) {
    const { data: photoRows, error: photoError } = await db
      .from("valuation_photos")
      .insert(photos.map((p) => ({
        valuation_id: row.id,
        room: p.room,
        photo_url: p.url,
      })))
      .select("id, room, photo_url, ai_analysis, created_at");

    if (photoError) {
      console.error("[valuations] photos insert error:", photoError.message);
    } else {
      persistedPhotos = (photoRows ?? []).map((r) => ({
        id: r.id,
        room: r.room ?? null,
        photo_url: r.photo_url,
        ai_analysis: (r.ai_analysis as Record<string, unknown> | null) ?? null,
        created_at: r.created_at,
      }));
    }
  }

  const result: ValuationRecord = {
    id: row.id,
    address,
    lat: geo.lat,
    lng: geo.lng,
    property_type,
    area_construida_m2,
    area_terreno_m2: effectiveLandArea,
    area_m2: area_construida_m2,
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
    confidence_diagnostics,
    market_reference: engineResult.market_reference,
    photos: persistedPhotos,
    amenities: amenities ?? [],
    in_gated_community: in_gated_community ?? false,
    created_at: row.created_at,
  };

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}

// ─── List (paginated, tenant-scoped) ──────────────────────────────────────────

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ total: number; items: DashboardValuationItem[] }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const scope = await getValuationScope(db, user.id);
  const { searchParams } = new URL(req.url);

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status") === "deleted" ? "deleted" : "active";
  const propertyType = searchParams.get("property_type");
  const city = (searchParams.get("city") ?? "").trim();

  let query = db
    .from("valuations")
    .select(
      "id, address, city, property_type, static_market_value_brl, confidence_score, created_at, area_m2, deleted_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  // Tenant isolation: authored by the user, or owned by orgs where the user
  // is owner/admin. Empty admin list means "only mine".
  if (scope.adminOrgIds.length > 0) {
    query = query.or(`created_by.eq.${scope.userId},organization_id.in.(${scope.adminOrgIds.join(",")})`);
  } else {
    query = query.eq("created_by", scope.userId);
  }

  if (status === "deleted") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);
  }
  if (propertyType) query = query.eq("property_type", propertyType);
  if (q) {
    const escaped = escapeLike(q);
    query = query.or(`address.ilike.%${escaped}%,city.ilike.%${escaped}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: "Database error", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      total: count ?? 0,
      items: (data ?? []).map((row) => ({
        id: row.id,
        address: row.address,
        property_type: row.property_type,
        static_market_value_brl: row.static_market_value_brl ? Number(row.static_market_value_brl) : null,
        confidence_score: row.confidence_score ? Number(row.confidence_score) : null,
        created_at: row.created_at,
        area_m2: Number(row.area_m2),
        deleted_at: row.deleted_at,
      })),
    },
  });
}
