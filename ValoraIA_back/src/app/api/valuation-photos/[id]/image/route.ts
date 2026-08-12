import { NextRequest, NextResponse } from "next/server";
import convertHeic from "heic-convert";
import { getAdminClient } from "@/lib/db/supabase";

export const runtime = "nodejs";

// Converts legacy HEIC objects on demand. New uploads are normalized by
// /api/upload-photos, but older records still point at .HEIC files.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const db = getAdminClient();
  const { data, error } = await db
    .from("valuation_photos")
    .select("photo_url")
    .eq("id", id)
    .single();

  if (error || !data?.photo_url) {
    return NextResponse.json({ success: false, error: "Photo not found" }, { status: 404 });
  }

  let source: URL;
  try {
    source = new URL(data.photo_url);
    const storageHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : null;
    if (storageHost && source.host !== storageHost) {
      return NextResponse.json({ success: false, error: "Unsupported photo source" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid photo URL" }, { status: 422 });
  }

  const upstream = await fetch(source, { signal: AbortSignal.timeout(20_000) });
  if (!upstream.ok) {
    return NextResponse.json({ success: false, error: "Could not fetch photo" }, { status: 502 });
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type") ?? "";
  const isHeic = /heic|heif/i.test(contentType) || /\.(heic|heif)(?:\?|$)/i.test(source.pathname);

  if (!isHeic) {
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const jpeg = await convertHeic({ buffer: bytes, format: "JPEG", quality: 0.88 });
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (conversionError) {
    console.error("[valuation-photo] HEIC conversion failed:", conversionError);
    return NextResponse.json({ success: false, error: "Could not convert photo" }, { status: 502 });
  }
}
