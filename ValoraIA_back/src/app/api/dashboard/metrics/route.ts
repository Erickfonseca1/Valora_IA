import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser, getValuationScope } from "@/lib/access";
import type { ApiResponse, DashboardMetrics, MarketTemperature } from "@/types";

const BRASILIA_TZ = "America/Sao_Paulo";

function brasiliaDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: BRASILIA_TZ });
}

function brasiliaParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRASILIA_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function brasiliaMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 3));
}

// Applies tenant isolation (author OR owner/admin of the organization) to any
// valuations query built on the admin client.
function applyScope<T>(query: T, scope: { userId: string; adminOrgIds: string[] }): T {
  const q = query as { or: (v: string) => T; eq: (c: string, v: unknown) => T };
  if (scope.adminOrgIds.length > 0) {
    return q.or(`created_by.eq.${scope.userId},organization_id.in.(${scope.adminOrgIds.join(",")})`);
  }
  return q.eq("created_by", scope.userId);
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<DashboardMetrics>>> {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const scope = await getValuationScope(db, user.id);

  const now = new Date();
  const localNow = brasiliaParts(now);
  const startOfThisMonth = brasiliaMidnightUtc(localNow.year, localNow.month, 1).toISOString();
  const startOfPrevMonth = brasiliaMidnightUtc(localNow.year, localNow.month - 1, 1).toISOString();
  const endOfPrevMonth = startOfThisMonth;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const monthQuery = applyScope(
    db.from("valuations").select("confidence_score", { count: "exact" }).gte("created_at", startOfThisMonth),
    scope
  );
  const prevQuery = applyScope(
    db.from("valuations").select("*", { count: "exact", head: true }).gte("created_at", startOfPrevMonth).lt("created_at", endOfPrevMonth),
    scope
  );
  const dailyQuery = applyScope(
    db.from("valuations").select("created_at").gte("created_at", thirtyDaysAgo),
    scope
  );

  const [
    monthResult,
    { count: prevMonth },
    { data: cityData },
    { data: dailyData },
    { count: recentListings },
    { count: olderListings },
  ] = await Promise.all([
    monthQuery,
    prevQuery,
    db
      .from("listings")
      .select("city")
      .order("last_seen", { ascending: false })
      .limit(100),
    dailyQuery,
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

  const cityCounts: Record<string, number> = {};
  for (const row of cityData ?? []) {
    if (row.city) cityCounts[row.city] = (cityCounts[row.city] ?? 0) + 1;
  }
  const marketCity =
    Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  let marketTemperature: MarketTemperature = "warm";
  const recent = recentListings ?? 0;
  const older = olderListings ?? 1;
  const ratio = recent / older;
  if (ratio >= 1.2) marketTemperature = "hot";
  else if (ratio <= 0.8) marketTemperature = "cold";

  const countsByDay: Record<string, number> = {};
  for (const row of dailyData ?? []) {
    const key = brasiliaDateKey(new Date(row.created_at));
    countsByDay[key] = (countsByDay[key] ?? 0) + 1;
  }

  const valuations_per_day: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const currentLocalDate = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day));
    currentLocalDate.setUTCDate(currentLocalDate.getUTCDate() - i);
    const d = currentLocalDate.toISOString().slice(0, 10);
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