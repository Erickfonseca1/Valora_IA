import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestVivaRealItems, type IngestStats } from "@/lib/apify/ingest";
import type { ApiResponse } from "@/types";

const INGEST_SECRET = process.env.INGEST_WEBHOOK_SECRET;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// VivaReal runs are processed; the actorId may be a human-readable slug
// ("fatihtahta/vivareal-scraper") or Apify's internal ID. We only ignore runs
// when the payload carries a recognizable slug for an unlisted actor.
const ALLOWED_ACTOR_IDS = new Set(["fatihtahta/vivareal-scraper"]);

// Vercel: Hobby caps at 60s, Pro can go up to 300s.
export const maxDuration = 300;

// ─── Webhook payload shape (Apify default payload template) ───────────────────
const WebhookPayloadSchema = z.object({
  eventType: z.string().optional(),
  eventData: z
    .object({
      actorId: z.string().optional(),
      actorRunId: z.string().optional(),
    })
    .optional(),
  resource: z
    .object({
      status: z.string().optional(),
      defaultDatasetId: z.string().optional(),
    })
    .optional(),
  defaultDatasetId: z.string().optional(),
});

interface WebhookResult extends IngestStats {
  dataset_id: string;
  actor_run_id: string | null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<WebhookResult>>> {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  if (INGEST_SECRET) {
    const authHeader = req.headers.get("x-ingest-secret");
    if (authHeader !== INGEST_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!APIFY_TOKEN) {
    return NextResponse.json(
      { success: false, error: "APIFY_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = WebhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const { eventType, eventData, resource } = parsed.data;
  const emptyResult = (): WebhookResult => ({
    dataset_id: "",
    actor_run_id: null,
    scraped: 0,
    upserted: 0,
    skipped: 0,
    errors: 0,
    skip_reasons: {},
  });

  // Only succeed events are meaningful; ignore others (Apify retries on 4xx/5xx,
  // so returning 2xx for irrelevant events prevents useless retries).
  if (eventType && eventType !== "ACTOR.RUN.SUCCEEDED") {
    return NextResponse.json({ success: true, data: emptyResult() }, { status: 200 });
  }
  if (resource?.status && resource.status !== "SUCCEEDED") {
    return NextResponse.json({ success: true, data: emptyResult() }, { status: 200 });
  }

  if (eventData?.actorId?.includes("/") && !ALLOWED_ACTOR_IDS.has(eventData.actorId)) {
    return NextResponse.json({ success: true, data: emptyResult() }, { status: 200 });
  }

  const datasetId = resource?.defaultDatasetId ?? parsed.data.defaultDatasetId;
  if (!datasetId) {
    return NextResponse.json(
      { success: false, error: "No defaultDatasetId in webhook payload" },
      { status: 422 }
    );
  }

  // ── Fetch dataset items from Apify API ──────────────────────────────────────
  const datasetUrl = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);
  datasetUrl.searchParams.set("token", APIFY_TOKEN);
  datasetUrl.searchParams.set("format", "json");
  datasetUrl.searchParams.set("clean", "true");

  const apifyRes = await fetch(datasetUrl, { signal: AbortSignal.timeout(60_000) });
  if (!apifyRes.ok) {
    const text = await apifyRes.text();
    console.error("[apify-webhook] dataset fetch error:", apifyRes.status, text);
    return NextResponse.json(
      { success: false, error: `Apify dataset fetch returned ${apifyRes.status}`, details: text },
      { status: 502 }
    );
  }

  const items: unknown[] = await apifyRes.json();
  if (!Array.isArray(items)) {
    return NextResponse.json(
      { success: false, error: "Unexpected Apify dataset response format" },
      { status: 502 }
    );
  }

  // ── Map + validate + upsert (shared pipeline) ───────────────────────────────
  const stats = await ingestVivaRealItems(items);

  return NextResponse.json(
    {
      success: true,
      data: {
        dataset_id: datasetId,
        actor_run_id: eventData?.actorRunId ?? null,
        ...stats,
      },
    },
    { status: 200 }
  );
}
