import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import convertHeic from "heic-convert";
import sharp from "sharp";
import type { ApiResponse } from "@/types";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/security/audit";

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ urls: string[] }>>> {
  const ip = getClientIp(req);
  if (!rateLimit(`upload:${ip}`, 10, 60_000)) return rateLimitResponse();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
  }

  const files = formData.getAll("photos") as File[];

  if (!files.length || files.length > 10) {
    return NextResponse.json(
      { success: false, error: "Send 1–10 photos" },
      { status: 422 }
    );
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/jpg'];

  for (const file of files) {
    const isHeic = /\.(heic|heif)$/i.test(file.name) || ['image/heic', 'image/heif'].includes(file.type);
    if (!ALLOWED_TYPES.includes(file.type) && !isHeic) {
      return NextResponse.json(
        { success: false, error: `File type '${file.type}' not allowed. Use JPEG, PNG, or WebP.` },
        { status: 422 }
      );
    }
  }

  const db = getAdminClient();
  const urls: string[] = [];

  for (const file of files) {
    const isHeic = /\.(heic|heif)$/i.test(file.name) || ['image/heic', 'image/heif'].includes(file.type);
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());

    // HEIC is accepted from iPhones, but browsers and react-pdf do not render
    // it reliably. Normalize it once at upload time so every consumer gets a
    // standard JPEG URL.
    if (isHeic) {
      try {
        buffer = Buffer.from(await convertHeic({ buffer, format: "JPEG", quality: 0.88 }));
      } catch (error) {
        console.error("[upload-photos] HEIC conversion failed:", error);
        return NextResponse.json(
          { success: false, error: "Could not convert HEIC image. Send JPEG, PNG, or WebP." },
          { status: 422 }
        );
      }
    }

    // Privacy: strip all metadata (EXIF/GPS, camera model, timestamps) and
    // normalize to JPEG. sharp only forwards metadata when withMetadata() is
    // used, so re-encoding here removes location and device data before the
    // image is stored or sent to any external service (e.g. Gemini Vision).
    try {
      buffer = await sharp(buffer).rotate().jpeg({ quality: 0.88 }).toBuffer();
    } catch (error) {
      console.error("[upload-photos] image re-encode failed:", error);
      return NextResponse.json(
        { success: false, error: "Could not process image. Send a valid JPEG, PNG, or WebP." },
        { status: 422 }
      );
    }

    const ext = "jpg";
    const contentType = "image/jpeg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await db.storage
      .from("property-photos")
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    // The bucket must be private. Only the storage object path is returned —
    // consumers resolve the image through the authenticated backend proxy.
    urls.push(path);
  }

  await logAudit(db, {
    action: "photo.upload",
    entityType: "photo",
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    metadata: { count: urls.length },
  });

  return NextResponse.json({ success: true, data: { urls } }, { status: 201 });
}