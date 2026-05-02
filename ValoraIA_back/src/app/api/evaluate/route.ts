import { NextRequest, NextResponse } from "next/server";
import { EvaluateSchema } from "@/lib/validators/ingest.schema";
import { runValuation } from "@/lib/math/valuation-engine";
import type { ApiResponse, ValuationResult } from "@/types";

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ValuationResult>>> {
  // ── Parse ──────────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  const parsed = EvaluateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.issues,
      },
      { status: 422 }
    );
  }

  const { lat, lng, target_area, target_bedrooms } = parsed.data;

  // ── Run MCDDM engine ───────────────────────────────────────────────────────
  try {
    const result = await runValuation({ lat, lng, target_area, target_bedrooms });
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Valuation failed";

    // Distinguish "not enough data" (404) from internal errors (500)
    if (message.startsWith("Insufficient")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }

    console.error("[evaluate] engine error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}

// GET for quick sanity-check / docs
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "POST /api/evaluate",
    description: "Valora AI — MCDDM Valuation Engine (NBR 14653)",
    body: {
      lat: "number (required) — target property latitude",
      lng: "number (required) — target property longitude",
      target_area: "number (required, > 0) — usable area in m²",
      target_bedrooms: "integer | null (optional) — filter comparables by bedroom count",
    },
    response: {
      estimated_value: "BRL estimated market value",
      price_per_m2_mean: "homogenized mean price per m²",
      price_per_m2_median: "homogenized median price per m²",
      confidence_interval: "{ lower, upper, confidence_level: 0.80 } in BRL",
      sample_size: "number of comparable listings used",
      radius_used_m: "search radius that yielded sufficient samples",
      offer_factor_applied: 0.9,
      comparables: "array of 5 closest comparable listings with coordinates",
    },
  });
}
