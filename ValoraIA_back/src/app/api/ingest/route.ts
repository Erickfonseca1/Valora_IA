import { NextRequest, NextResponse } from "next/server";
import { IngestSchema } from "@/lib/validators/ingest.schema";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, IngestResult } from "@/types";

// Shared secret to protect the webhook from unauthorized callers
const INGEST_SECRET = process.env.INGEST_WEBHOOK_SECRET;

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<IngestResult>>> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  if (INGEST_SECRET) {
    const authHeader = req.headers.get("x-ingest-secret");
    if (authHeader !== INGEST_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ── Validate + coerce ──────────────────────────────────────────────────────
  const parsed = IngestSchema.safeParse(body);
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

  const {
    source_url,
    price,
    usable_area,
    bedrooms,
    bathrooms,
    parking_spaces,
    property_type,
    lat,
    lng,
    neighborhood,
    city,
    construction_age,
    conservation_state,
  } = parsed.data;

  // ── Upsert into Supabase ───────────────────────────────────────────────────
  const db = getAdminClient();

  // PostGIS geography point via ST_SetSRID / ST_MakePoint — we use a raw RPC
  // or rely on the PostGIS WKT text input format: 'SRID=4326;POINT(lng lat)'
  const coordinatesWKT = `SRID=4326;POINT(${lng} ${lat})`;

  const { data, error } = await db
    .from("listings")
    .upsert(
      {
        source_url,
        price,
        usable_area,
        bedrooms,
        bathrooms,
        parking_spaces,
        property_type,
        coordinates: coordinatesWKT,
        neighborhood,
        city,
        construction_age,
        conservation_state,
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: "source_url",
        // On conflict update price, area, and last_seen only
        ignoreDuplicates: false,
      }
    )
    .select("id, source_url")
    .single();

  if (error || !data) {
    console.error("[ingest] upsert error:", error);
    return NextResponse.json(
      { success: false, error: "Database error", details: error?.message },
      { status: 500 }
    );
  }

  // Supabase doesn't expose whether the upsert was INSERT or UPDATE directly,
  // so we check created_at vs last_seen equivalence via a follow-up read.
  const { data: row } = await db
    .from("listings")
    .select("created_at, last_seen")
    .eq("id", data.id)
    .single();

  const action: IngestResult["action"] =
    row && row.created_at === row.last_seen ? "created" : "updated";

  return NextResponse.json(
    {
      success: true,
      data: {
        action,
        id: data.id,
        source_url: data.source_url,
      },
    },
    { status: action === "created" ? 201 : 200 }
  );
}
