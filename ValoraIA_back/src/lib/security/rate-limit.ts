import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

// Simple in-memory sliding-window rate limiter.
// Production (multi-instance) deployments should move this to a shared store
// (e.g. Upstash Redis); single-instance hosting is fine with memory state.

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 10_000;

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) buckets.clear();

  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

// Generic so call sites with typed NextResponse<ApiResponse<T>> infer T.
export function rateLimitResponse<T = never>(): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: false, error: "Too many requests. Try again in a moment." },
    { status: 429 }
  ) as NextResponse<ApiResponse<T>>;
}