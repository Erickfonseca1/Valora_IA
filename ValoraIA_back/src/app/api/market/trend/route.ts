import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, MarketTrendResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<MarketTrendResponse>>> {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? "";
  const months = Math.min(Math.max(parseInt(searchParams.get("months") ?? "12", 10), 1), 24);

  if (!city) {
    return NextResponse.json(
      { success: false, error: "city query param is required" },
      { status: 422 }
    );
  }

  const db = getAdminClient();

  // Fetch price_per_m2 grouped by month for the requested city
  // We build month buckets from oldest to newest
  const dataPoints: number[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const { data } = await db
      .from("listings")
      .select("price_per_m2")
      .ilike("city", `%${city.replace(/-/g, " ")}%`)
      .gte("last_seen", monthStart.toISOString())
      .lt("last_seen", monthEnd.toISOString())
      .not("price_per_m2", "is", null);

    const values = (data ?? []).map((r) => Number(r.price_per_m2)).filter((v) => v > 0);
    const avg = values.length > 0
      ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
      : 0;

    dataPoints.push(avg);
  }

  // Fill zero months with interpolated or last-known value
  const filled = fillZeros(dataPoints);

  const currentPpm2 = filled[filled.length - 1] ?? 0;
  const yearAgoIndex = filled.length - 13;
  const yearAgoPpm2 = yearAgoIndex >= 0 ? filled[yearAgoIndex] : filled[0];
  const yearlyChangePct =
    yearAgoPpm2 > 0
      ? Number((((currentPpm2 - yearAgoPpm2) / yearAgoPpm2) * 100).toFixed(1))
      : 0;

  // Normalize city name for display
  const displayCity = city
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return NextResponse.json({
    success: true,
    data: {
      city: displayCity,
      period_months: months,
      current_price_m2: currentPpm2,
      yearly_change_pct: yearlyChangePct,
      data_points: filled,
    },
  });
}

// Forward-fill zeros with last known value; if leading zeros, use first non-zero
function fillZeros(points: number[]): number[] {
  const result = [...points];
  // Forward fill
  let last = result.find((v) => v > 0) ?? 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i] > 0) { last = result[i]; }
    else { result[i] = last; }
  }
  return result;
}
