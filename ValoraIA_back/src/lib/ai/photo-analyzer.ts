import type { PhotoAnalysisResult, ConservationState } from "@/types";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const ANALYSIS_PROMPT = `You are a Brazilian real estate appraiser AI. Analyze these property photos and respond ONLY with a valid JSON object (no markdown, no code fences, no explanation) with exactly these fields:
{
  "padrao_construtivo": "Alto" | "Médio" | "Popular",
  "estado_conservacao_sugerido": "A" | "AB" | "B" | "BC" | "C" | "CD" | "D" | "DE" | "E",
  "comodidades_detectadas": ["item1", "item2"]
}
Conservation states: A=new, AB=excellent, B=very good, BC=good, C=regular, CD=fair, D=deteriorated, DE=starting ruins, E=ruins.
Construction standard: Alto=luxury finishes, Médio=standard residential, Popular=basic/low-cost.`;

const SAFE_DEFAULT: PhotoAnalysisResult = {
  padrao_construtivo: "Médio",
  estado_conservacao_sugerido: "B" as ConservationState,
  comodidades_detectadas: [],
};

export async function analyzePropertyPhotos(
  photoUrls: string[]
): Promise<PhotoAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return SAFE_DEFAULT;

  const parts: unknown[] = [{ text: ANALYSIS_PROMPT }];
  for (const url of photoUrls.slice(0, 8)) {
    parts.push({
      file_data: { mime_type: "image/jpeg", file_uri: url },
    });
  }

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 512, temperature: 0 },
      }),
    });

    if (!res.ok) return SAFE_DEFAULT;

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as PhotoAnalysisResult;

    const validStates = ["A","AB","B","BC","C","CD","D","DE","E"];
    const validStandards = ["Alto","Médio","Popular"];
    if (
      !validStandards.includes(parsed.padrao_construtivo) ||
      !validStates.includes(parsed.estado_conservacao_sugerido)
    ) {
      return SAFE_DEFAULT;
    }

    return {
      padrao_construtivo: parsed.padrao_construtivo,
      estado_conservacao_sugerido: parsed.estado_conservacao_sugerido,
      comodidades_detectadas: Array.isArray(parsed.comodidades_detectadas)
        ? parsed.comodidades_detectadas
        : [],
    };
  } catch {
    return SAFE_DEFAULT;
  }
}
