import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, DashboardMetrics, MarketTemperature } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<DashboardMetrics>>> {
  const db = getAdminClient();

  // Fast path: single RPC round trip (migration 006_dashboard_metrics.sql).
  // Falls back to client-side aggregation if the function isn't deployed yet.
  const { data: rpcData, error: rpcError } = await db.rpc("get_dashboard_metrics");
  if (!rpcError && rpcData) {
    const m = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
    return NextResponse.json({
      success: true,
      data: {
        valuations_this_month: Number(m.valuations_this_month ?? 0),
        valuations_prev_month: Number(m.valuations_prev_month ?? 0),
        avg_confidence: Number(m.avg_confidence ?? 0),
        market_temperature: (m.market_temperature ?? "warm") as MarketTemperature,
        market_city: String(m.market_city ?? "N/A"),
        valuations_per_day: Array.isArray(m.valuations_per_day)
          ? m.valuations_per_day.map((d: { date?: string; count?: number }) => ({
              date: String(d.date ?? ""),
              count: Number(d.count ?? 0),
            }))
          : [],
      },
    });
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // All queries are independent — run in parallel to cut dashboard latency.
  // thisMonth count + confidence scores come from the same filtered set,
  // so they share a single query (count exact returns both rows and count).
  const [
    monthResult,
    { count: prevMonth },
    { data: cityData },
    { data: dailyData },
    { count: recentListings },
    { count: olderListings },
  ] = await Promise.all([
    db
      .from("valuations")
      .select("confidence_score", { count: "exact" })
      .gte("created_at", startOfThisMonth),
    db
      .from("valuations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfPrevMonth)
      .lt("created_at", endOfPrevMonth),
    db
      .from("listings")
      .select("city")
      .order("last_seen", { ascending: false })
      .limit(100),
    db
      .from("valuations")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo),
    db
      .from("listings")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", thirtyDaysAgo),
    db
      .from("listings")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", sixtyDaysAgo)
      .lt("last_seen", thirtyDaysAgo),
  ]);

  const thisMonth = monthResult.count ?? 0;
  const scores = (monthResult.data ?? []).map((r) => Number(r.confidence_score));
  const avgConfidence =
    scores.length > 0
      ? Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1))
      : 0;

  // Most common city from listings (no city column on valuations table)
  const cityCounts: Record<string, number> = {};
  for (const row of cityData ?? []) {
    if (row.city) cityCounts[row.city] = (cityCounts[row.city] ?? 0) + 1;
  }
  const marketCity =
    Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  // Market temperature: based on listing volume trend in listings table
  // Compare listings added in last 30 days vs prior 30 days
  let marketTemperature: MarketTemperature = "warm";
  const recent = recentListings ?? 0;
  const older = olderListings ?? 1;
  const ratio = recent / older;
  if (ratio >= 1.2) marketTemperature = "hot";
  else if (ratio <= 0.8) marketTemperature = "cold";

  // Valuations per day (last 30 days) — daily activity series
  const countsByDay: Record<string, number> = {};
  for (const row of dailyData ?? []) {
    const key = row.created_at.slice(0, 10);
    countsByDay[key] = (countsByDay[key] ?? 0) + 1;
  }

  const valuations_per_day: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    valuations_per_day.push({ date: d, count: countsByDay[d] ?? 0 });
  }

  return NextResponse.json({
    success: true,
    data: {
      valuations_this_month: thisMonth,
      valuations_prev_month: prevMonth ?? 0,
      avg_confidence: avgConfidence,
      market_temperature: marketTemperature,
      market_city: marketCity,
      valuations_per_day,
    },
  });
}
