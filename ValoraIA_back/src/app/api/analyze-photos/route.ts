import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzePropertyPhotos } from "@/lib/ai/photo-analyzer";
import type { ApiResponse, PhotoAnalysisResult } from "@/types";

const Schema = z.object({
  photos: z.array(z.string().url()).min(1).max(10),
});

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<PhotoAnalysisResult>>> {
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

  const result = await analyzePropertyPhotos(parsed.data.photos);
  return NextResponse.json({ success: true, data: result });
}
