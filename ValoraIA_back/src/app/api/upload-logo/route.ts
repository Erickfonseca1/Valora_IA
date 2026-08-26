import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/access";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import type { ApiResponse } from "@/types";

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB
const MIN_DIMENSION = 256;

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ url: string }>>> {
  const ip = getClientIp(req);
  if (!rateLimit(`logo:${ip}`, 10, 60_000)) return rateLimitResponse();

  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("logo");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ success: false, error: "Missing logo file" }, { status: 422 });
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ success: false, error: "Logo too large (max 500 KB)" }, { status: 413 });
  }

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ success: false, error: "Logo must be PNG, JPEG or WebP" }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let image: sharp.Sharp;
  try {
    image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ success: false, error: "Could not read image" }, { status: 422 });
    }
    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      return NextResponse.json(
        { success: false, error: `Logo must be at least ${MIN_DIMENSION}×${MIN_DIMENSION}px` },
        { status: 422 }
      );
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid image" }, { status: 422 });
  }

  // Normalize to PNG without metadata (EXIF/GPS stripping applies here too).
  const png = await image.png().toBuffer();
  const path = `logos/${user.id}-${Date.now()}.png`;

  const db = getAdminClient();
  const { error } = await db.storage
    .from("org-logos")
    .upload(path, png, { contentType: "image/png", upsert: false });

  if (error) {
    return NextResponse.json({ success: false, error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  const { data } = db.storage.from("org-logos").getPublicUrl(path);
  return NextResponse.json({ success: true, data: { url: data.publicUrl } }, { status: 201 });
}