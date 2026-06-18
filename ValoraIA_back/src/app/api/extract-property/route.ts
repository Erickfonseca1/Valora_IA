import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractFromText, extractFromAudio } from "@/lib/ai/property-extractor";
import type { ApiResponse, ExtractionResult } from "@/types";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

const TextSchema = z.object({ text: z.string().min(1).max(5000) });

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ExtractionResult>>> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid multipart data" },
        { status: 400 }
      );
    }

    const audioEntry = formData.get("audio");
    if (!(audioEntry instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Missing audio field" },
        { status: 400 }
      );
    }
    if (audioEntry.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { success: false, error: "Audio file too large (max 15 MB)" },
        { status: 413 }
      );
    }

    const mimeType = audioEntry.type || "audio/webm";
    const buffer = Buffer.from(await audioEntry.arrayBuffer());
    try {
      const result = await extractFromAudio(buffer, mimeType);
      return NextResponse.json({ success: true, data: result });
    } catch (err: unknown) {
      return classifyAiError(err);
    }
  }

  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const parsed = TextSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.issues },
        { status: 422 }
      );
    }

    try {
      const result = await extractFromText(parsed.data.text);
      return NextResponse.json({ success: true, data: result });
    } catch (err: unknown) {
      return classifyAiError(err);
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: "Unsupported Content-Type. Use application/json or multipart/form-data",
    },
    { status: 415 }
  );
}

function classifyAiError(
  err: unknown
): NextResponse<ApiResponse<ExtractionResult>> {
  if (err instanceof Error) {
    const code = (err as Error & { code?: number }).code;
    if (code === 429) {
      return NextResponse.json(
        { success: false, error: "Serviço de IA sobrecarregado. Tente novamente." },
        { status: 429 }
      );
    }
    if (err.message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY não configurada" },
        { status: 500 }
      );
    }
  }
  console.error("[extract-property]", err);
  return NextResponse.json(
    {
      success: false,
      error: "Não foi possível extrair os dados. Tente descrever mais detalhes.",
    },
    { status: 502 }
  );
}
