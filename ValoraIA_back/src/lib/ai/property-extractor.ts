// ValoraIA_back/src/lib/ai/property-extractor.ts

import type { ExtractionResult } from "@/types/extraction";
import { AMENITY_CATALOG } from "@/lib/amenities/catalog";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Lista de IDs e labels para ancorar o modelo
const CATALOG_ITEMS = Object.entries(AMENITY_CATALOG)
  .map(([id, e]) => `${id} (${e.label})`)
  .join(", ");

const SYSTEM_PROMPT = `Você é um assistente especializado em dados imobiliários brasileiros.
Extraia informações do imóvel a partir da fala ou texto de um corretor.

Regras:
- Só preencha um campo quando houver evidência explícita; caso contrário deixe value: null.
- confidence: menção direta = 0.9; inferência = 0.4; menção parcial = 0.7.
- property_type valores válidos: apartment, house, commercial, land.
- conservation_state valores válidos: novo, entre_novo_e_regular, regular, reparos_simples, reparos_importantes, critico.
- terrain_slope valores válidos: plano, aclive_leve, declive_leve, aclive_acentuado, declive_acentuado.
- street_level valores válidos: no_nivel, abaixo_nivel, acima_nivel.
- amenities: identifique apenas itens desta lista (use o id exato): ${CATALOG_ITEMS}.
- gaps: liste as chaves dos campos obrigatórios ausentes. Campos obrigatórios: address, property_type, area_m2.
- summary: 1-2 frases naturais em português descrevendo o imóvel conforme o corretor relatou.`;

// responseSchema garante saída estruturada sem markdown
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    fields: {
      type: "OBJECT",
      properties: {
        address: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "STRING", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        property_type: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "STRING", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        area_m2: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "NUMBER", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        bedrooms: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "NUMBER", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        bathrooms: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "NUMBER", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        parking_spaces: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "NUMBER", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        construction_age: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "NUMBER", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        conservation_state: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "STRING", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        terrain_slope: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "STRING", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        street_level: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "STRING", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        is_corner: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "BOOLEAN", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
        in_gated_community: {
          type: "OBJECT",
          nullable: true,
          properties: {
            value: { type: "BOOLEAN", nullable: true },
            confidence: { type: "NUMBER" },
          },
        },
      },
    },
    amenities: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          item: { type: "STRING" },
          confidence: { type: "NUMBER" },
        },
        required: ["item", "confidence"],
      },
    },
    gaps: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["summary", "fields", "amenities", "gaps"],
};

const REQUIRED_FIELDS = ["address", "property_type", "area_m2"] as const;

const VALID_PROPERTY_TYPES = new Set(["apartment", "house", "commercial", "land"]);
const VALID_CONSERVATION = new Set([
  "novo", "entre_novo_e_regular", "regular",
  "reparos_simples", "reparos_importantes", "critico",
]);
const VALID_SLOPE = new Set([
  "plano", "aclive_leve", "declive_leve", "aclive_acentuado", "declive_acentuado",
]);
const VALID_STREET = new Set(["no_nivel", "abaixo_nivel", "acima_nivel"]);
const VALID_AMENITY_IDS = new Set(Object.keys(AMENITY_CATALOG));

function sanitize(raw: ExtractionResult): ExtractionResult {
  const f = raw.fields ?? {};

  // Nullify invalid enum values
  if (f.property_type?.value && !VALID_PROPERTY_TYPES.has(f.property_type.value as string)) {
    f.property_type = { value: null, confidence: 0 };
  }
  if (f.conservation_state?.value && !VALID_CONSERVATION.has(f.conservation_state.value as string)) {
    f.conservation_state = { value: null, confidence: 0 };
  }
  if (f.terrain_slope?.value && !VALID_SLOPE.has(f.terrain_slope.value as string)) {
    f.terrain_slope = { value: null, confidence: 0 };
  }
  if (f.street_level?.value && !VALID_STREET.has(f.street_level.value as string)) {
    f.street_level = { value: null, confidence: 0 };
  }

  // Keep only valid catalog amenity IDs
  const amenities = (raw.amenities ?? []).filter(a => VALID_AMENITY_IDS.has(a.item));

  // Compute gaps: required fields with null value
  const gaps = REQUIRED_FIELDS.filter(k => {
    const field = f[k as keyof typeof f];
    return !field || field.value == null;
  });

  return { summary: raw.summary ?? "", fields: f, amenities, gaps };
}

async function callGemini(parts: unknown[]): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (res.status === 429) throw Object.assign(new Error("Rate limited"), { code: 429 });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw Object.assign(new Error(`Gemini error ${res.status}: ${err}`), { code: res.status });
  }

  const json = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text) as ExtractionResult;
  return sanitize(parsed);
}

export async function extractFromText(text: string): Promise<ExtractionResult> {
  return callGemini([{ text }]);
}

export async function extractFromAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const base64 = audioBuffer.toString("base64");
  return callGemini([
    { inlineData: { mimeType, data: base64 } },
    { text: "Extraia os dados do imóvel a partir do áudio acima." },
  ]);
}
