import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, PropertyType } from "@/types";
import { buildListingAmenities } from "./amenities-map";

const INGEST_SECRET = process.env.INGEST_WEBHOOK_SECRET;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

const APIFY_URL =
  "https://api.apify.com/v2/acts/fatihtahta~zap-imoveis-scraper/run-sync-get-dataset-items";

const ScrapeInputSchema = z.object({
  location: z.string().min(1, "location is required"),
  deal_type: z.enum(["sale", "rent"]).default("sale"),
  property_type: z
    .array(
      z.enum([
        "apartment", "studio", "kitnet", "house", "gated_house", "villa_house",
        "penthouse", "flat", "loft", "residential_land", "townhouse", "farm",
        "store", "office", "commercial_house", "hotel", "corporate_floor",
        "building", "commercial_land", "storage", "garage",
      ])
    )
    .optional(),
  min_bedroom: z.enum(["1", "2", "3", "4"]).optional(),
  min_bathroom: z.enum(["1", "2", "3", "4"]).optional(),
  min_parking: z.enum(["1", "2", "3", "4"]).optional(),
  min_price: z.number().int().positive().optional(),
  max_price: z.number().int().positive().optional(),
  min_sqm: z.number().int().positive().optional(),
  max_sqm: z.number().int().positive().optional(),
  below_market_price: z.boolean().optional(),
  near_transit: z.boolean().optional(),
  maximize_coverage: z.boolean().optional(),
  limit: z.number().int().min(1).max(2000).default(200),
});

type ScrapeInput = z.infer<typeof ScrapeInputSchema>;

// Actual shape returned by fatihtahta~zap-imoveis-scraper
interface ZapItem {
  source_context?: { url?: string };
  pricing?: { amount?: number };
  location?: {
    neighborhood?: string;
    city?: string;
    coordinates?: { latitude?: number; longitude?: number };
  };
  attributes?: {
    rooms?: { bedrooms?: number; bathrooms?: number; parking_spaces?: number };
    area?: { usable_area?: number };
    amenities?: string[];
    unit_types?: string[];
    usage_types?: string[];
    // Year-built fields — present in some Zap listings
    construction_year?: number;
    year_built?: number;
    characteristics?: { year_built?: number; construction_year?: number };
    features?: { year_built?: number };
  };
  media?: {
    images?: Array<{ id?: string; url?: string }>;
  };
}

interface ScrapeResult {
  scraped: number;
  upserted: number;
  skipped_missing_fields: number;
  skipped_no_coords: number;
  errors: number;
}

// ─── ZAP unit_type → engine property_type ────────────────────────────────────

const HOUSE_TYPES = new Set([
  "home", "house", "residential_building", "condominium_house",
  "village_house", "gated_community", "farm", "chacara",
]);

const APARTMENT_TYPES = new Set([
  "apartment", "flat", "loft", "studio", "kitnet",
  "penthouse", "duplex",
]);

const COMMERCIAL_TYPES = new Set([
  "commercial_building", "office", "store", "warehouse",
  "commercial_floor", "commercial_space",
]);

function mapZapPropertyType(unitTypes: string[]): string | null {
  for (const t of unitTypes) {
    const slug = t.toLowerCase();
    if (HOUSE_TYPES.has(slug))      return "house";
    if (APARTMENT_TYPES.has(slug))  return "apartment";
    if (COMMERCIAL_TYPES.has(slug)) return "commercial";
  }
  return null;
}

// ─── construction_age inference ───────────────────────────────────────────────
// ZAP does not expose year_built in a stable field. We probe several known
// attribute paths; if none yields a plausible year we return null.

const CURRENT_YEAR = new Date().getFullYear();

function inferConstructionAge(item: ZapItem): number | null {
  const yearRaw =
    item.attributes?.year_built ??
    item.attributes?.construction_year ??
    item.attributes?.characteristics?.year_built ??
    item.attributes?.characteristics?.construction_year ??
    item.attributes?.features?.year_built;

  if (!yearRaw) return null;
  const year = Number(yearRaw);
  if (!Number.isInteger(year) || year < 1900 || year > CURRENT_YEAR) return null;
  return CURRENT_YEAR - year;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<ScrapeResult>>> {
  if (INGEST_SECRET) {
    if (req.headers.get("x-ingest-secret") !== INGEST_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json(
      { success: false, error: "APIFY_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ScrapeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const input: ScrapeInput = parsed.data;

  const apifyInput: Record<string, unknown> = {
    deal_type: input.deal_type,
    location: input.location,
    limit: input.limit,
  };
  if (input.property_type?.length) apifyInput.property_type = input.property_type;
  if (input.min_bedroom)        apifyInput.min_bedroom = input.min_bedroom;
  if (input.min_bathroom)       apifyInput.min_bathroom = input.min_bathroom;
  if (input.min_parking)        apifyInput.min_parking = input.min_parking;
  if (input.min_price)          apifyInput.min_price = input.min_price;
  if (input.max_price)          apifyInput.max_price = input.max_price;
  if (input.min_sqm)            apifyInput.min_sqm = input.min_sqm;
  if (input.max_sqm)            apifyInput.max_sqm = input.max_sqm;
  if (input.below_market_price) apifyInput.below_market_price = input.below_market_price;
  if (input.near_transit)       apifyInput.near_transit = input.near_transit;
  if (input.maximize_coverage)  apifyInput.maximize_coverage = input.maximize_coverage;

  const apifyRes = await fetch(`${APIFY_URL}?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apifyInput),
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });

  if (!apifyRes.ok) {
    const text = await apifyRes.text();
    console.error("[scrape] Apify error:", apifyRes.status, text);
    return NextResponse.json(
      { success: false, error: `Apify returned ${apifyRes.status}`, details: text },
      { status: 502 }
    );
  }

  const items: unknown[] = await apifyRes.json();
  if (!Array.isArray(items)) {
    return NextResponse.json(
      { success: false, error: "Unexpected Apify response format" },
      { status: 502 }
    );
  }

  const db = getAdminClient();
  const result: ScrapeResult = {
    scraped: items.length,
    upserted: 0,
    skipped_missing_fields: 0,
    skipped_no_coords: 0,
    errors: 0,
  };

  for (const raw of items) {
    const item = raw as ZapItem;

    const url = item.source_context?.url;
    const price = item.pricing?.amount;
    const usable_area = item.attributes?.area?.usable_area;
    const city = item.location?.city;

    if (!url || !price || !usable_area || !city) {
      result.skipped_missing_fields++;
      continue;
    }

    const lat = item.location?.coordinates?.latitude;
    const lng = item.location?.coordinates?.longitude;

    if (!lat || !lng) {
      result.skipped_no_coords++;
      continue;
    }

    const property_type = mapZapPropertyType(item.attributes?.unit_types ?? []);

    if (!property_type) {
      result.skipped_missing_fields++;
      continue;
    }

    const construction_age = inferConstructionAge(item);

    const rawUnitType = item.attributes?.unit_types?.[0] ?? null;
    const listingAmenities = buildListingAmenities(
      item.attributes?.amenities, property_type as PropertyType, rawUnitType
    );

    const { error } = await db.from("listings").upsert(
      {
        source_url: url,
        price,
        usable_area,
        bedrooms: item.attributes?.rooms?.bedrooms ?? null,
        bathrooms: item.attributes?.rooms?.bathrooms ?? null,
        parking_spaces: item.attributes?.rooms?.parking_spaces ?? null,
        property_type,
        coordinates: `SRID=4326;POINT(${lng} ${lat})`,
        neighborhood: item.location?.neighborhood ?? null,
        city,
        construction_age,
        conservation_state: "regular",
        unit_type: rawUnitType,
        amenities: listingAmenities,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "source_url", ignoreDuplicates: false }
    );

    if (error) {
      console.error("[scrape] upsert error:", error.message, url);
      result.errors++;
    } else {
      result.upserted++;
    }
  }

  return NextResponse.json({ success: true, data: result }, { status: 200 });
}
