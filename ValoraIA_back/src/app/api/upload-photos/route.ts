import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/supabase";
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

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type '${file.type}' not allowed. Use JPEG, PNG, or WebP.` },
        { status: 422 }
      );
    }
  }

  const db = getAdminClient();
  const urls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await db.storage
      .from("property-photos")
      .upload(path, buffer, { contentType: file.type, upsert: false });

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
