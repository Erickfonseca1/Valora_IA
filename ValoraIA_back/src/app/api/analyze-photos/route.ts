import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzePropertyPhotos } from "@/lib/ai/photo-analyzer";
import { getAdminClient } from "@/lib/db/supabase";
import type { ApiResponse, PhotoAnalysisResult } from "@/types";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

// Accepts either a storage object path (new uploads) or a full URL (legacy).
const Schema = z.object({
  photos: z.array(z.string().min(1).max(2048)).min(1).max(10),
});

const BUCKET = "property-photos";

// Resolves a storage path to a short-lived signed URL so external AI services
// can fetch it without exposing the bucket publicly. Full URLs pass through.
async function resolvePhotoUrl(db: ReturnType<typeof getAdminClient>, value: string): Promise<string> {
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(value, 3600);
  return data?.signedUrl ?? value;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<PhotoAnalysisResult>>> {
  const ip = getClientIp(req);
  if (!rateLimit(`analyze:${ip}`, 10, 60_000)) return rateLimitResponse();

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    );
  }

  const db = getAdminClient();
  const resolved: string[] = [];
  for (const photo of parsed.data.photos) {
    try {
      resolved.push(await resolvePhotoUrl(db, photo));
    } catch {
      return NextResponse.json(
        { success: false, error: "Could not resolve photo for analysis" },
        { status: 422 }
      );
    }
  }

  const result = await analyzePropertyPhotos(resolved);
  return NextResponse.json({ success: true, data: result });
}