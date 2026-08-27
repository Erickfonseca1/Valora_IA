import { getAdminClient } from "@/lib/db/supabase";
import { ingestVivaRealItems, type IngestStats } from "./ingest";
import type { PropertyType } from "@/types";

const VIVAREAL_ACTOR_URL = "https://api.apify.com/v2/acts/fatihtahta~vivareal-scraper/run-sync-get-dataset-items";

// Contract typology → actor property_type values accepted by the actor
const ACTOR_TYPES: Record<PropertyType, string[]> = {
  apartment: ["apartment", "flat", "loft", "studio", "kitnet"],
  house: ["house", "gated_house", "villa_house", "townhouse"],
  commercial: ["store", "office", "commercial_house", "commercial_floor", "hotel"],
  land: ["residential_land", "commercial_land"],
};

/** Minimum listings of the SAME typology before the engine runs without top-up */
const MIN_LOCAL_SAMPLES = 5;

/**
 * TTL do cache de bairro: após uma coleta Apify, os listings do bairro
 * ficam "quentes" por este período — novas avaliações no mesmo bairro/tipologia
 * NÃO disparam novo run (o market prior ancora amostras fracas).
 * Meta de custo: variável ≤15% da receita.
 */
const NEIGHBORHOOD_CACHE_TTL_DAYS = 15;

// ─── Local density check ──────────────────────────────────────────────────────
// Counts same-typology listings within the target radius. The engine's own
// MIN_SAMPLES is 5; we top up before the engine runs so its fallbacks
// (relaxed area/bedrooms) still find an adequate same-typology sample.

export interface LocalCoverage {
  found: number;
  target: number;
  sufficient: boolean;
}

export async function checkLocalCoverage(
  lat: number,
  lng: number,
  radiusM: number,
  propertyType: PropertyType
): Promise<LocalCoverage> {
  const db = getAdminClient();

  // Cheap count via the spatial RPC with a wide area tolerance — we only need
  // the same-typology headcount near the target, not a filtered sample.
  const { data, error } = await db.rpc("search_listings_in_radius", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_area_target: 80,        // placeholder — tolerance 1.00 disables the filter
    p_area_tolerance: 1.00,
    p_bedrooms: null,
    p_limit: 100,
  });

  if (error) {
    console.error("[on-demand] coverage check error:", error.message);
    return { found: 0, target: MIN_LOCAL_SAMPLES, sufficient: false };
  }

  const rows = (data ?? []) as Array<{ property_type?: string }>;
  const found = rows.filter((r) => (r.property_type ?? "apartment") === propertyType).length;

  return { found, target: MIN_LOCAL_SAMPLES, sufficient: found >= MIN_LOCAL_SAMPLES };
}

// ─── Neighborhood freshness ───────────────────────────────────────────────────
// Any listing of the neighborhood (any typology) refreshed inside the TTL means
// the bairro was collected recently — skip a new Apify run to protect margin.

export async function isNeighborhoodFresh(
  neighborhood: string | null,
  city: string,
  propertyType: PropertyType
): Promise<boolean> {
  if (!neighborhood) return false;
  const db = getAdminClient();
  const cutoff = new Date(Date.now() - NEIGHBORHOOD_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("listings")
    .select("id", { count: "exact", head: true })
    .ilike("neighborhood", `%${neighborhood}%`)
    .eq("city", city)
    .eq("property_type", propertyType)
    .gte("last_seen", cutoff);

  if (error) {
    console.error("[on-demand] freshness check error:", error.message);
    return false;
  }
  return (data ?? []).length > 0;
}

// ─── On-demand Apify collection ───────────────────────────────────────────────
// Runs the VivaReal actor synchronously for a specific bairro + typology,
// ingests results, and returns stats. Used by the valuation route when the
// local density check fails.

export interface OnDemandResult {
  collected: number;
  actor_runs_finished: boolean;
  stats: IngestStats | null;
  error: string | null;
}

const ON_DEMAND_TIMEOUT_MS = 180_000; // 3 min — Free plan caps runs ~5 min

export async function collectOnDemand(p: {
  neighborhood: string | null;
  city: string;
  propertyType: PropertyType;
  limit?: number;
}): Promise<OnDemandResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return { collected: 0, actor_runs_finished: false, stats: null, error: "APIFY_API_TOKEN not configured" };
  }

  // Build the actor input: location scoped to the bairro (or city fallback)
  const location = p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city;
  const actorInput: Record<string, unknown> = {
    deal_type: "sale",
    location,
    property_type: ACTOR_TYPES[p.propertyType],
    limit: p.limit ?? 100,
    maximize_coverage: true,
  };

  const apifyUrl = `${VIVAREAL_ACTOR_URL}?token=${token}`;

  try {
    const apifyRes = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
      signal: AbortSignal.timeout(ON_DEMAND_TIMEOUT_MS),
    });

    if (!apifyRes.ok) {
      const text = await apifyRes.text();
      console.error("[on-demand] Apify error:", apifyRes.status, text);
      return {
        collected: 0,
        actor_runs_finished: false,
        stats: null,
        error: `Apify returned ${apifyRes.status}`,
      };
    }

    const items: unknown[] = await apifyRes.json();
    if (!Array.isArray(items)) {
      return {
        collected: 0,
        actor_runs_finished: false,
        stats: null,
        error: "Unexpected Apify response format",
      };
    }

    const stats = await ingestVivaRealItems(items);
    return {
      collected: stats.upserted,
      actor_runs_finished: true,
      stats,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[on-demand] run failed:", message);
    return { collected: 0, actor_runs_finished: false, stats: null, error: message };
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Full on-demand flow used by the valuation route:
//   1. check local same-typology density (2km)
//   2. if insufficient → collect for the bairro
//   3. re-check; if still insufficient → widen to city-level fallback
// Best-effort: never throws — the engine proceeds with whatever is available
// (the verified market prior anchors weak samples).

export async function ensureLocalComparables(p: {
  lat: number;
  lng: number;
  neighborhood: string | null;
  city: string;
  propertyType: PropertyType;
}): Promise<{ before: LocalCoverage; after: LocalCoverage; collected: number; actor_runs_finished: boolean; errors: string[]; skipped_due_to_cache: boolean }> {
  const errors: string[] = [];

  const before = await checkLocalCoverage(p.lat, p.lng, 2000, p.propertyType);
  let after = before;
  let collected = 0;
  let actorRunsFinished = false;
  let skippedDueToCache = false;

  if (!before.sufficient) {
    // Cache de bairro: se o bairro foi coletado dentro do TTL, não gastamos
    // outro run Apify — dados existentes + market prior ancoram a amostra.
    const fresh = await isNeighborhoodFresh(p.neighborhood, p.city, p.propertyType);
    if (fresh) {
      skippedDueToCache = true;
      console.log(
        `[on-demand] ${p.neighborhood}/${p.city} fresh (TTL ${NEIGHBORHOOD_CACHE_TTL_DAYS}d) — skipping Apify run`
      );
    } else {
      const bairroResult = await collectOnDemand({
        neighborhood: p.neighborhood,
        city: p.city,
        propertyType: p.propertyType,
      });

      collected = bairroResult.collected;
      actorRunsFinished = bairroResult.actor_runs_finished;
      if (bairroResult.error) errors.push(bairroResult.error);

      after = await checkLocalCoverage(p.lat, p.lng, 2000, p.propertyType);

      // Widening fallback: if the bairro produced nothing useful, try the whole city
      // (more samples, higher chance of same-typology comps elsewhere).
      if (!after.sufficient && bairroResult.actor_runs_finished && bairroResult.collected === 0) {
        const cityResult = await collectOnDemand({
          neighborhood: null,
          city: p.city,
          propertyType: p.propertyType,
        });
        collected += cityResult.collected;
        actorRunsFinished = actorRunsFinished && cityResult.actor_runs_finished;
        if (cityResult.error) errors.push(cityResult.error);
        after = await checkLocalCoverage(p.lat, p.lng, 2000, p.propertyType);
      }
    }
  }

  return { before, after, collected, actor_runs_finished: actorRunsFinished, errors, skipped_due_to_cache: skippedDueToCache };
}
