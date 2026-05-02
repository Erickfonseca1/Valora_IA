import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, DashboardValuationsResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<DashboardValuationsResponse>>> {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  const db = getAdminClient();

  const { data, error, count } = await db
    .from("valuations")
    .select(
      "id, address, neighborhood, city, property_type, recommended_listing_price_brl, confidence_score, created_at, bedrooms, area_m2",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

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
        neighborhood: [row.neighborhood, row.city].filter(Boolean).join(", ") || row.address,
        property_type: row.property_type,
        price_brl: row.recommended_listing_price_brl,
        confidence_score: row.confidence_score,
        created_at: row.created_at,
        bedrooms: row.bedrooms,
        area_m2: row.area_m2,
      })),
    },
  });
}
