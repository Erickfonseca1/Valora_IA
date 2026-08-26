import { NextRequest, NextResponse } from "next/server";
import convertHeic from "heic-convert";
import { getAdminClient } from "@/lib/db/supabase";

export const runtime = "nodejs";

// Serves photos through the backend (service role) so the storage bucket can
// stay private. Accepts either the storage object path stored on new rows or
// the legacy full public URL kept by older records.
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

  let objectPath = data.photo_url;
  if (/^https?:\/\//i.test(objectPath)) {
    // Legacy rows store the full public URL; keep only the object path after
    // the bucket segment so the download works against a private bucket.
    try {
      const url = new URL(objectPath);
      const match = url.pathname.match(/(?:^|\/)([^/]+)\/([^/].*)$/);
      objectPath = match ? match[2] : url.pathname.replace(/^\/+/, "");
    } catch {
      return NextResponse.json({ success: false, error: "Invalid photo URL" }, { status: 422 });
    }
  }
  objectPath = objectPath.replace(/^\/+/, "");

  const { data: blob, error: downloadError } = await db.storage
    .from("property-photos")
    .download(objectPath);

  if (downloadError || !blob) {
    return NextResponse.json({ success: false, error: "Photo not found" }, { status: 404 });
  }

  const bytes = Buffer.from(await blob.arrayBuffer());
  const contentType = blob.type || "image/jpeg";
  const isHeic = /heic|heif/i.test(contentType) || /\.(heic|heif)(?:\?|$)/i.test(objectPath);

  if (!isHeic) {
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "private, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const jpeg = await convertHeic({ buffer: bytes, format: "JPEG", quality: 0.88 });
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (conversionError) {
    console.error("[valuation-photo] HEIC conversion failed:", conversionError);
    return NextResponse.json({ success: false, error: "Could not convert photo" }, { status: 502 });
  }
}