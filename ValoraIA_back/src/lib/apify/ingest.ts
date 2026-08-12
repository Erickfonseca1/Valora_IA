import { getAdminClient } from "@/lib/db/supabase";
import { IngestSchema } from "@/lib/validators/ingest.schema";
import { mapVivaRealItem, type VivaRealItem } from "./vivareal";

const UPSERT_BATCH_SIZE = 100;

export interface IngestStats {
  scraped: number;
  upserted: number;
  skipped: number;
  errors: number;
  skip_reasons: Record<string, number>;
}

/**
 * Maps raw VivaReal dataset items to the ingest contract, validates with
 * Zod and upserts into `listings` (dedup by source_url). Shared between the
 * webhook route and the on-demand collection trigger.
 */
export async function ingestVivaRealItems(items: unknown[]): Promise<IngestStats> {
  const db = getAdminClient();
  const result: IngestStats = {
    scraped: items.length,
    upserted: 0,
    skipped: 0,
    errors: 0,
    skip_reasons: {},
  };

  const nowIso = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];

  for (const raw of items) {
    const mapped = mapVivaRealItem(raw as VivaRealItem);
    if (!mapped.payload) {
      result.skipped++;
      const reason = mapped.skipReason ?? "unknown";
      result.skip_reasons[reason] = (result.skip_reasons[reason] ?? 0) + 1;
      continue;
    }

    const parsedPayload = IngestSchema.safeParse(mapped.payload);
    if (!parsedPayload.success) {
      console.error("[apify] validation error:", parsedPayload.error.issues, mapped.payload.source_url);
      result.skipped++;
      result.skip_reasons["schema_validation"] = (result.skip_reasons["schema_validation"] ?? 0) + 1;
      continue;
    }

    const p = parsedPayload.data;
    rows.push({
      source_url: p.source_url,
      source: p.source ?? "vivareal",
      ad_id: p.ad_id ?? null,
      price: p.price,
      usable_area: p.usable_area,
      total_area: p.total_area ?? null,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      suites: p.suites ?? null,
      parking_spaces: p.parking_spaces ?? null,
      condo_fee: p.condo_fee ?? null,
      iptu: p.iptu ?? null,
      property_type: p.property_type,
      coordinates: `SRID=4326;POINT(${p.lng} ${p.lat})`,
      neighborhood: p.neighborhood ?? null,
      city: p.city,
      address: p.address ?? null,
      state: p.state ?? null,
      construction_age: p.construction_age ?? null,
      conservation_state: p.conservation_state ?? "regular",
      floor: p.floor ?? null,
      total_floors: p.total_floors ?? null,
      is_condo: p.is_condo ?? true,
      is_new_launch: p.is_new_launch ?? false,
      listing_created_at: p.listing_created_at ?? null,
      images: p.images ?? [],
      amenities: mapped.amenities,
      last_seen: nowIso,
    });
  }

  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await db
      .from("listings")
      .upsert(batch, { onConflict: "source_url", ignoreDuplicates: false });

    if (error) {
      console.error("[apify] upsert error:", error.message);
      result.errors += batch.length;
    } else {
      result.upserted += batch.length;
    }
  }

  return result;
}
