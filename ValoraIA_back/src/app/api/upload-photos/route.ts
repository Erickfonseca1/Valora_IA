import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
import convertHeic from "heic-convert";
import type { ApiResponse } from "@/types";

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ urls: string[] }>>> {
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
    let ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    let contentType = file.type || "image/jpeg";
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());

    // HEIC is accepted from iPhones, but browsers and react-pdf do not render
    // it reliably. Normalize it once at upload time so every consumer gets a
    // standard JPEG URL.
    if (isHeic) {
      try {
        buffer = Buffer.from(await convertHeic({ buffer, format: "JPEG", quality: 0.88 }));
        ext = "jpg";
        contentType = "image/jpeg";
      } catch (error) {
        console.error("[upload-photos] HEIC conversion failed:", error);
        return NextResponse.json(
          { success: false, error: "Could not convert HEIC image. Send JPEG, PNG, or WebP." },
          { status: 422 }
        );
      }
    }

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

    const { data } = db.storage.from("property-photos").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return NextResponse.json({ success: true, data: { urls } }, { status: 201 });
}
