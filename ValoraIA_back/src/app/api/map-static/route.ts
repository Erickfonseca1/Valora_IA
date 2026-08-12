import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Static map proxy ─────────────────────────────────────────────────────────
// Generates a static map image for the PDF report. Tries the Google Static
// Maps API first (server-side key, never exposed); falls back to the free
// OpenStreetMap staticmap service.

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().int().min(8).max(18).default(13),
  width: z.coerce.number().int().min(200).max(1000).default(560),
  height: z.coerce.number().int().min(150).max(700).default(300),
  // "lat,lng" comma-separated list of comparable markers
  comps: z.string().optional(),
});

const GOOGLE_STATIC_URL = "https://maps.googleapis.com/maps/api/staticmap";
const OSM_STATIC_URL = "https://staticmap.openstreetmap.de/staticmap.php";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid query params" }, { status: 400 });
  }

  const { lat, lng, zoom, width, height, comps } = parsed.data;
  const compList = (comps ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s));

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    const gurl = new URL(GOOGLE_STATIC_URL);
    gurl.searchParams.set("center", `${lat},${lng}`);
    gurl.searchParams.set("zoom", String(zoom));
    gurl.searchParams.set("size", `${width}x${height}`);
    gurl.searchParams.set("scale", "2");
    gurl.searchParams.set("maptype", "roadmap");
    gurl.searchParams.set("format", "png");
    // Subject property = red marker; comparables = green markers
    gurl.searchParams.append("markers", `color:red|label:A|${lat},${lng}`);
    for (const c of compList) {
      gurl.searchParams.append("markers", `color:green|size:small|${c}`);
    }
    gurl.searchParams.set("key", apiKey);

    const res = await fetch(gurl.toString(), { signal: AbortSignal.timeout(15_000) });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      return new NextResponse(new Uint8Array(buffer), {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
      });
    }
    console.error("[map-static] Google failed, falling back to OSM:", res.status);
  }

  // ── OSM fallback (no key required) ─────────────────────────────────────────
  const ourl = new URL(OSM_STATIC_URL);
  ourl.searchParams.set("center", `${lat},${lng}`);
  ourl.searchParams.set("zoom", String(zoom));
  ourl.searchParams.set("size", `${width}x${height}`);
  ourl.searchParams.set("format", "png");
  ourl.searchParams.set("maptype", "mapnik");
  ourl.searchParams.append("markers", `${lat},${lng},red`);
  for (const c of compList) {
    ourl.searchParams.append("markers", `${c},green`);
  }

  const res = await fetch(ourl.toString(), { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    return NextResponse.json({ success: false, error: `Map service returned ${res.status}` }, { status: 502 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}
