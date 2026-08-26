import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser, getValuationScope, canAccessValuation } from "@/lib/access";
import { logAudit } from "@/lib/security/audit";
import { getClientIp } from "@/lib/security/rate-limit";
import type { ApiResponse, ValuationRecord } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<ValuationRecord>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

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

  const scope = await getValuationScope(db, user.id);
  if (!canAccessValuation(scope, { created_by: data.created_by, organization_id: data.organization_id })) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  let organization: { name: string; logo_url: string | null } | null = null;
  if (data.organization_id) {
    const { data: org } = await db
      .from("organizations")
      .select("name, logo_url")
      .eq("id", data.organization_id)
      .maybeSingle();
    if (org) organization = org as { name: string; logo_url: string | null };
  }

  const record: ValuationRecord = {
    id: data.id,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    property_type: data.property_type,
    area_construida_m2: Number(data.area_construida_m2 ?? data.area_m2),
    area_terreno_m2: data.area_terreno_m2 != null ? Number(data.area_terreno_m2) : null,
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
    confidence_diagnostics: data.confidence_diagnostics ?? null,
    residual_land_value_brl: data.residual_land_value_brl ? Number(data.residual_land_value_brl) : null,
    max_buildable_area_m2: data.max_buildable_area_m2 ? Number(data.max_buildable_area_m2) : null,
    zoning_params: data.zoning_params ?? null,
    viability_scenarios: data.viability_scenarios ?? null,
    comparables: data.comparables ?? null,
    neighborhood_pois: data.neighborhood_pois ?? null,
    homogenization_factors: data.homogenization_factors ?? null,
    market_reference: data.market_reference ?? null,
    amenities: data.amenities ?? [],
    in_gated_community: data.in_gated_community ?? false,
    photos: await fetchValuationPhotos(id),
    organization_id: data.organization_id ?? null,
    created_by: data.created_by ?? null,
    deleted_at: data.deleted_at ?? null,
    organization,
    created_at: data.created_at,
  };

  return NextResponse.json({ success: true, data: record });
}

// ─── Soft delete (lixeira) ────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getAdminClient();

  const { data: valuation } = await db.from("valuations").select("created_by, organization_id, deleted_at").eq("id", id).maybeSingle();
  if (!valuation) {
    return NextResponse.json({ success: false, error: "Valuation not found" }, { status: 404 });
  }
  if (valuation.deleted_at) {
    return NextResponse.json({ success: false, error: "Already deleted" }, { status: 409 });
  }

  const scope = await getValuationScope(db, user.id);
  if (!canAccessValuation(scope, { created_by: valuation.created_by, organization_id: valuation.organization_id })) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const { error } = await db.from("valuations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, error: "Failed to delete valuation" }, { status: 500 });
  }

  await logAudit(db, {
    action: "valuation.soft_delete",
    entityType: "valuation",
    entityId: id,
    userId: user.id,
    organizationId: valuation.organization_id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}

// ─── Restore from lixeira ─────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getAdminClient();

  const { data: valuation } = await db.from("valuations").select("created_by, organization_id, deleted_at").eq("id", id).maybeSingle();
  if (!valuation) {
    return NextResponse.json({ success: false, error: "Valuation not found" }, { status: 404 });
  }
  if (!valuation.deleted_at) {
    return NextResponse.json({ success: false, error: "Valuation is not deleted" }, { status: 409 });
  }

  const scope = await getValuationScope(db, user.id);
  if (!canAccessValuation(scope, { created_by: valuation.created_by, organization_id: valuation.organization_id })) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const { error } = await db.from("valuations").update({ deleted_at: null }).eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, error: "Failed to restore valuation" }, { status: 500 });
  }

  await logAudit(db, {
    action: "valuation.restore",
    entityType: "valuation",
    entityId: id,
    userId: user.id,
    organizationId: valuation.organization_id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ success: true, data: { ok: true } });
}

// ─── Photos per room (valuation_photos table) ────────────────────────────────

async function fetchValuationPhotos(
  valuationId: string
): Promise<import("@/types").ValuationPhoto[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("valuation_photos")
    .select("id, room, photo_url, ai_analysis, created_at")
    .eq("valuation_id", valuationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as Array<{
    id: string;
    room: string | null;
    photo_url: string;
    ai_analysis: unknown;
    created_at: string;
  }>).map((r) => ({
    id: r.id,
    room: r.room ?? null,
    photo_url: r.photo_url,
    ai_analysis: (r.ai_analysis as Record<string, unknown> | null) ?? null,
    created_at: r.created_at,
  }));
}