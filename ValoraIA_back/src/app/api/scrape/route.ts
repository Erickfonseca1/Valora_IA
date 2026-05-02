import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse } from "@/types";

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

// ─── ZAP amenity slug → engine amenity label ──────────────────────────────────

const ZAP_AMENITY_MAP: Record<string, string> = {
  // Premium
  "swimming_pool":            "Piscina",
  "rooftop":                  "Rooftop",
  "sea_view":                 "Vista Mar",
  "penthouse":                "Cobertura",
  // Alto
  "gym":                      "Academia",
  "fitness_center":           "Academia",
  "doorman":                  "Portaria",
  "24h_doorman":              "Portaria 24h",
  "security_24h":             "Segurança 24h",
  "24h_security":             "Segurança 24h",
  "elevator":                 "Elevador",
  "party_room":               "Salão de Festas",
  "gourmet_area":             "Área Gourmet",
  "gourmet_balcony":          "Área Gourmet",
  // Médio
  "balcony":                  "Varanda",
  "barbecue_grill":           "Churrasqueira",
  "playground":               "Playground",
  "game_room":                "Salão de Jogos",
  "kids_space":               "Espaço Kids",
  "coworking":                "Coworking",
  "sports_court":             "Quadra Esportiva",
  "tennis_court":             "Quadra Esportiva",
  "sport_court":              "Quadra Esportiva",
  // Básico
  "intercom":                 "Interfone",
  "security_cameras":         "Câmeras de segurança",
  "cctv":                     "Câmeras de segurança",
  "laundry_room":             "Área de serviço",
  "built_in_wardrobes":       "Armários planejados",
  "built_in_closets":         "Armários planejados",
  "air_conditioning":         "Ar condicionado",
  "pet_friendly":             "Pet friendly",
  "electric_gate":            "Portão eletrônico",
  "guest_parking":            "Portão eletrônico",
};

function mapZapAmenities(zapAmenities: string[]): string[] {
  const mapped = zapAmenities
    .map((slug) => ZAP_AMENITY_MAP[slug.toLowerCase()])
    .filter((v): v is string => v !== undefined);
  return [...new Set(mapped)]; // deduplicate
}

// ─── Image URL resolver ───────────────────────────────────────────────────────
// ZAP returns template URLs with {description}/{width}/{height} placeholders.
// Replace with a standard 760×570 resolution.

function resolveImageUrl(raw: string): string {
  return raw
    .replace("{description}", "fit-in")
    .replace("{action}", "fit-in")
    .replace("{width}", "760")
    .replace("{height}", "570")
    .replace("%7Baction%7D", "fit-in")
    .replace("%7Bwidth%7D", "760")
    .replace("%7Bheight%7D", "570");
}

function extractImages(item: ZapItem, maxImages = 6): string[] {
  const raw = item.media?.images ?? [];
  return raw
    .slice(0, maxImages)
    .map((img) => img.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0)
    .map(resolveImageUrl);
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

    const images = extractImages(item);
    const amenities = mapZapAmenities(item.attributes?.amenities ?? []);
    const property_type = mapZapPropertyType(item.attributes?.unit_types ?? []);

    const { error } = await db.from("listings").upsert(
      {
        source_url: url,
        platform: "zapimoveis",
        price,
        usable_area,
        bedrooms: item.attributes?.rooms?.bedrooms ?? null,
        bathrooms: item.attributes?.rooms?.bathrooms ?? null,
        parking_spaces: item.attributes?.rooms?.parking_spaces ?? null,
        coordinates: `SRID=4326;POINT(${lng} ${lat})`,
        neighborhood: item.location?.neighborhood ?? null,
        city,
        images,
        amenities,
        property_type,
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
