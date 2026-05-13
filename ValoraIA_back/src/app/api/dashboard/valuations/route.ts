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
      "id, address, property_type, static_market_value_brl, confidence_score, created_at, area_m2",
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
        property_type: row.property_type,
        static_market_value_brl: row.static_market_value_brl ? Number(row.static_market_value_brl) : null,
        confidence_score: row.confidence_score ? Number(row.confidence_score) : null,
        created_at: row.created_at,
        area_m2: Number(row.area_m2),
      })),
    },
  });
}
