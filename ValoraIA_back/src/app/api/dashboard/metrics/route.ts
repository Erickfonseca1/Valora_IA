import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, DashboardMetrics, MarketTemperature } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<DashboardMetrics>>> {
  const db = getAdminClient();

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Valuations this month
  const { count: thisMonth } = await db
    .from("valuations")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfThisMonth);

  // Valuations prev month
  const { count: prevMonth } = await db
    .from("valuations")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfPrevMonth)
    .lt("created_at", endOfPrevMonth);

  // Avg confidence score (last 30 days)
  const { data: confData } = await db
    .from("valuations")
    .select("confidence_score")
    .gte("created_at", startOfThisMonth);

  const scores = (confData ?? []).map((r) => Number(r.confidence_score));
  const avgConfidence =
    scores.length > 0
      ? Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1))
      : 0;

  // Most common city in recent valuations
  const { data: cityData } = await db
    .from("valuations")
    .select("city")
    .not("city", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const cityCounts: Record<string, number> = {};
  for (const row of cityData ?? []) {
    if (row.city) cityCounts[row.city] = (cityCounts[row.city] ?? 0) + 1;
  }
  const marketCity =
    Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  // Market temperature: based on listing volume trend in listings table
  // Compare listings added in last 30 days vs prior 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { count: recentListings } = await db
    .from("listings")
    .select("*", { count: "exact", head: true })
    .gte("last_seen", thirtyDaysAgo);

  const { count: olderListings } = await db
    .from("listings")
    .select("*", { count: "exact", head: true })
    .gte("last_seen", sixtyDaysAgo)
    .lt("last_seen", thirtyDaysAgo);

  let marketTemperature: MarketTemperature = "warm";
  const recent = recentListings ?? 0;
  const older = olderListings ?? 1;
  const ratio = recent / older;
  if (ratio >= 1.2) marketTemperature = "hot";
  else if (ratio <= 0.8) marketTemperature = "cold";

  return NextResponse.json({
    success: true,
    data: {
      valuations_this_month: thisMonth ?? 0,
      valuations_prev_month: prevMonth ?? 0,
      avg_confidence: avgConfidence,
      market_temperature: marketTemperature,
      market_city: marketCity,
    },
  });
}
