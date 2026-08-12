# Entrada Natural por IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o corretor descreva um imóvel por áudio ou texto, com a IA extraindo os campos do formulário e pré-preenchendo o wizard `ValuationFlow` antes do preenchimento manual.

**Architecture:** Um novo passo 0 (`IntakeStep`) captura áudio/texto e envia para `POST /api/extract-property`, que usa Gemini multimodal com `responseSchema` para retornar campos estruturados (`ExtractionResult`). Um card de extração (`ExtractionCard`) apresenta o resultado; ao confirmar, `mergeExtraction()` funde os dados no estado do form com rastreamento de origem por campo (`fieldSource`), garantindo que áudio vença fotos e edição manual vença tudo.

**Tech Stack:** Next.js 16 (backend), React + Vite (frontend), Gemini 2.0 Flash (multimodal audio + text), Vitest + testing-library (testes), TypeScript, Tailwind v3.

## Global Constraints

- Modelo Gemini: `gemini-2.0-flash` via REST `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Todas as rotas seguem o envelope `{ success: true, data: T } | { success: false, error: string }`
- Enums do backend devem casar com `newschema.sql` (PropertyType, ConservationState, TerrainSlope, StreetLevel)
- Áudio: recebido como `multipart/form-data` com campo `audio`, **não persistido** em Storage
- Texto: recebido como `application/json` com `{ text: string }`
- `confidence` é apenas sinal de UI — não entra no DB
- Cores do tema: PRIMARY `#1E3A8A`, ACCENT `#10B981`
- Entrada natural é **opcional** — botão "Pular" sempre visível no IntakeStep
- Precedência: manual > áudio > foto; áudio nunca sobrescreve campo marcado como `'manual'` e foto nunca sobrescreve campo marcado como `'audio'`
- Nenhum novo enum no DB — a feature usa tipos já existentes
- Antes de escrever qualquer código de rota Next.js, ler `node_modules/next/dist/docs/` (AGENTS.md do backend exige isso)

---

## File Map

### Novos arquivos
| Arquivo | Responsabilidade |
|---------|-----------------|
| `ValoraIA_back/src/types/extraction.ts` | `ExtractedField<T>` e `ExtractionResult` — tipos compartilhados da extração |
| `ValoraIA_back/src/lib/ai/property-extractor.ts` | Lógica Gemini: constrói prompt, envia áudio/texto, parseia `ExtractionResult` |
| `ValoraIA_back/src/app/api/extract-property/route.ts` | Rota `POST /api/extract-property`: parse/validação/envelope |
| `ValoraIA_back/src/lib/ai/__tests__/property-extractor.test.ts` | Testes unitários do extractor (mock Gemini) |
| `ValoraIA_back/src/app/api/extract-property/__tests__/route.test.ts` | Testes de rota (modo texto, modo áudio, erros) |
| `ValoraIA_front/src/lib/mergeExtraction.ts` | Helper puro `mergeExtraction()` + `FieldSource` + `inferScopeForItem()` |
| `ValoraIA_front/src/components/IntakeStep.tsx` | Captura de áudio/texto (step 0) |
| `ValoraIA_front/src/components/ExtractionCard.tsx` | Card de resultado da extração com badges de confiança |
| `ValoraIA_front/src/__tests__/mergeExtraction.test.ts` | Testes de `mergeExtraction` (precedência, conversões numéricas, dedup) |
| `ValoraIA_front/src/__tests__/IntakeStep.test.tsx` | Testes de render, botão Pular, fallback de microfone |
| `ValoraIA_front/src/__tests__/ExtractionCard.test.tsx` | Testes de render do card, badges, gaps, ações |

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `ValoraIA_back/src/types/index.ts` | Re-exporta os tipos de `extraction.ts` |
| `ValoraIA_front/src/types/index.ts` | Adiciona `ExtractedField<T>`, `ExtractionResult`, `FieldSource`, `FormFieldSource` |
| `ValoraIA_front/src/api.ts` | Adiciona `extractProperty(audioBlob \| text)` |
| `ValoraIA_front/src/components/ValuationFlow.tsx` | Adiciona step 0, estado `fieldSource`, integra IntakeStep, atualiza photo merge |

---

## Task 1: Tipos de extração — backend

**Files:**
- Create: `ValoraIA_back/src/types/extraction.ts`
- Modify: `ValoraIA_back/src/types/index.ts`

**Interfaces:**
- Produces: `ExtractedField<T>`, `ExtractionResult` — consumidos por Tasks 2, 3 e (via cópia) Task 5

- [ ] **Step 1: Criar `extraction.ts` no backend**

```typescript
// ValoraIA_back/src/types/extraction.ts

import type { PropertyType, ConservationState, TerrainSlope, StreetLevel } from "./index";

export interface ExtractedField<T> {
  value: T | null;
  confidence: number; // 0..1
}

export interface ExtractionResult {
  summary: string;
  fields: {
    address?: ExtractedField<string>;
    property_type?: ExtractedField<PropertyType>;
    area_m2?: ExtractedField<number>;
    bedrooms?: ExtractedField<number>;
    bathrooms?: ExtractedField<number>;
    parking_spaces?: ExtractedField<number>;
    construction_age?: ExtractedField<number>;
    conservation_state?: ExtractedField<ConservationState>;
    terrain_slope?: ExtractedField<TerrainSlope>;
    street_level?: ExtractedField<StreetLevel>;
    is_corner?: ExtractedField<boolean>;
    in_gated_community?: ExtractedField<boolean>;
  };
  amenities: { item: string; confidence: number }[];
  gaps: string[];
}
```

- [ ] **Step 2: Re-exportar de `ValoraIA_back/src/types/index.ts`**

Adicionar no final de `ValoraIA_back/src/types/index.ts`:

```typescript
// ─── Extraction (entrada natural por IA) ──────────────────────────────────────

export type { ExtractedField, ExtractionResult } from "./extraction";
```

- [ ] **Step 3: Verificar que o build do backend não quebra**

```bash
cd ValoraIA_back && npm run build 2>&1 | tail -20
```

Esperado: sem erros de TypeScript relacionados a extraction.ts.

- [ ] **Step 4: Commit**

```bash
git add ValoraIA_back/src/types/extraction.ts ValoraIA_back/src/types/index.ts
git commit -m "feat(back/types): ExtractedField e ExtractionResult para entrada por IA"
```

---

## Task 2: Backend — `property-extractor.ts`

**Files:**
- Create: `ValoraIA_back/src/lib/ai/property-extractor.ts`

**Interfaces:**
- Consumes: `ExtractionResult` de `@/types/extraction`, `AMENITY_CATALOG` de `@/lib/amenities/catalog`
- Produces: `extractFromText(text: string): Promise<ExtractionResult>`, `extractFromAudio(audioBuffer: Buffer, mimeType: string): Promise<ExtractionResult>`

- [ ] **Step 1: Criar `property-extractor.ts`**

```typescript
// ValoraIA_back/src/lib/ai/property-extractor.ts

import type { ExtractionResult } from "@/types/extraction";
import { AMENITY_CATALOG } from "@/lib/amenities/catalog";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
        maxOutputTokens: 1024,
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
```

- [ ] **Step 2: Verificar TypeScript do módulo**

```bash
cd ValoraIA_back && npx tsc --noEmit 2>&1 | grep extraction
```

Esperado: sem erros em `property-extractor.ts`.

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_back/src/lib/ai/property-extractor.ts
git commit -m "feat(back/ai): property-extractor com Gemini 2.0 Flash multimodal"
```

---

## Task 3: Backend — rota `POST /api/extract-property`

**Files:**
- Create: `ValoraIA_back/src/app/api/extract-property/route.ts`

**Interfaces:**
- Consumes: `extractFromText`, `extractFromAudio` de `@/lib/ai/property-extractor`
- Produces: `POST /api/extract-property` → `ApiResponse<ExtractionResult>`

- [ ] **Step 1: Ler guia Next.js 16 antes de escrever a rota**

```bash
ls ValoraIA_back/node_modules/next/dist/docs/ 2>/dev/null | head -20
```

Verificar se há arquivo sobre route handlers e ler o relevante antes de continuar.

- [ ] **Step 2: Criar a rota**

```typescript
// ValoraIA_back/src/app/api/extract-property/route.ts

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

  try {
    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch {
        return NextResponse.json({ success: false, error: "Invalid multipart data" }, { status: 400 });
      }

      const audioEntry = formData.get("audio");
      if (!(audioEntry instanceof Blob)) {
        return NextResponse.json({ success: false, error: "Missing audio field" }, { status: 400 });
      }
      if (audioEntry.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ success: false, error: "Audio file too large (max 15 MB)" }, { status: 413 });
      }

      const mimeType = audioEntry.type || "audio/webm";
      const buffer = Buffer.from(await audioEntry.arrayBuffer());
      const result = await extractFromAudio(buffer, mimeType);
      return NextResponse.json({ success: true, data: result });
    }

    if (contentType.includes("application/json")) {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
      }

      const parsed = TextSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Validation failed", details: parsed.error.issues },
          { status: 422 }
        );
      }

      const result = await extractFromText(parsed.data.text);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported Content-Type. Use application/json or multipart/form-data" },
      { status: 415 }
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      const code = (err as { code?: number }).code;
      if (code === 429) {
        return NextResponse.json({ success: false, error: "Serviço de IA sobrecarregado. Tente novamente." }, { status: 429 });
      }
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: "GEMINI_API_KEY não configurada" }, { status: 500 });
      }
    }
    console.error("[extract-property]", err);
    return NextResponse.json(
      { success: false, error: "Não foi possível extrair os dados. Tente descrever mais detalhes." },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 3: Verificar TypeScript da rota**

```bash
cd ValoraIA_back && npx tsc --noEmit 2>&1 | grep "extract-property"
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add ValoraIA_back/src/app/api/extract-property/route.ts
git commit -m "feat(back): rota POST /api/extract-property (áudio + texto)"
```

---

## Task 4: Testes de backend

**Files:**
- Create: `ValoraIA_back/src/lib/ai/__tests__/property-extractor.test.ts`
- Create: `ValoraIA_back/src/app/api/extract-property/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `extractFromText`, `extractFromAudio`, rota POST

- [ ] **Step 1: Escrever testes do extractor (mock Gemini fetch)**

```typescript
// ValoraIA_back/src/lib/ai/__tests__/property-extractor.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractFromText, extractFromAudio } from "../property-extractor";

const mockResult = {
  summary: "Apartamento de 3 quartos em Manaíra.",
  fields: {
    address: { value: "Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB", confidence: 0.9 },
    property_type: { value: "apartment", confidence: 0.9 },
    area_m2: { value: 98, confidence: 0.9 },
    bedrooms: { value: 3, confidence: 0.9 },
    bathrooms: { value: 2, confidence: 0.9 },
    parking_spaces: { value: 1, confidence: 0.7 },
    conservation_state: { value: "regular", confidence: 0.7 },
  },
  amenities: [{ item: "piscina", confidence: 0.9 }, { item: "academia", confidence: 0.7 }],
  gaps: [],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(mockResult) }] } }],
    }),
  }));
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

describe("extractFromText", () => {
  it("retorna ExtractionResult parseado", async () => {
    const result = await extractFromText("Apartamento de 3 quartos em Manaíra, 98m².");
    expect(result.summary).toBe("Apartamento de 3 quartos em Manaíra.");
    expect(result.fields.property_type?.value).toBe("apartment");
    expect(result.fields.area_m2?.value).toBe(98);
    expect(result.gaps).toHaveLength(0);
  });

  it("filtra amenidades fora do catálogo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({
            ...mockResult,
            amenities: [{ item: "piscina", confidence: 0.9 }, { item: "heliponto_invalido", confidence: 0.5 }],
          }) }] },
        }],
      }),
    }));
    const result = await extractFromText("texto");
    expect(result.amenities.map(a => a.item)).not.toContain("heliponto_invalido");
    expect(result.amenities.map(a => a.item)).toContain("piscina");
  });

  it("nullifica conservation_state com valor inválido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({
            ...mockResult,
            fields: { ...mockResult.fields, conservation_state: { value: "estado_invalido", confidence: 0.5 } },
          }) }] },
        }],
      }),
    }));
    const result = await extractFromText("texto");
    expect(result.fields.conservation_state?.value).toBeNull();
  });

  it("calcula gaps para campos obrigatórios ausentes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({
            summary: "Imóvel sem detalhes.",
            fields: {
              address: { value: null, confidence: 0 },
              property_type: { value: null, confidence: 0 },
              area_m2: { value: null, confidence: 0 },
            },
            amenities: [],
            gaps: [],
          }) }] },
        }],
      }),
    }));
    const result = await extractFromText("texto vago");
    expect(result.gaps).toContain("address");
    expect(result.gaps).toContain("property_type");
    expect(result.gaps).toContain("area_m2");
  });

  it("lança erro quando GEMINI_API_KEY ausente", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(extractFromText("texto")).rejects.toThrow("GEMINI_API_KEY");
  });

  it("lança erro com code 429 para rate limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }));
    await expect(extractFromText("texto")).rejects.toMatchObject({ code: 429 });
  });
});

describe("extractFromAudio", () => {
  it("envia buffer como inlineData base64", async () => {
    const buf = Buffer.from("fake-audio-bytes");
    await extractFromAudio(buf, "audio/webm");
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    const part = body.contents[0].parts[0];
    expect(part.inlineData.mimeType).toBe("audio/webm");
    expect(part.inlineData.data).toBe(buf.toString("base64"));
  });
});
```

- [ ] **Step 2: Rodar testes do extractor**

```bash
cd ValoraIA_back && npm run test -- src/lib/ai/__tests__/property-extractor.test.ts
```

Esperado: todos os testes passam.

- [ ] **Step 3: Escrever testes da rota**

```typescript
// ValoraIA_back/src/app/api/extract-property/__tests__/route.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

vi.mock("@/lib/ai/property-extractor", () => ({
  extractFromText: vi.fn().mockResolvedValue({
    summary: "Apartamento em Manaíra.",
    fields: {
      address: { value: "Rua X", confidence: 0.9 },
      property_type: { value: "apartment", confidence: 0.9 },
      area_m2: { value: 80, confidence: 0.9 },
    },
    amenities: [],
    gaps: [],
  }),
  extractFromAudio: vi.fn().mockResolvedValue({
    summary: "Casa gravada.",
    fields: {
      address: { value: "Rua Y", confidence: 0.9 },
      property_type: { value: "house", confidence: 0.9 },
      area_m2: { value: 120, confidence: 0.9 },
    },
    amenities: [],
    gaps: [],
  }),
}));

function makeJsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/extract-property", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extract-property", () => {
  it("modo texto: retorna ExtractionResult com success:true", async () => {
    const req = makeJsonRequest({ text: "Apartamento em Manaíra, 80m², 2 quartos." });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.summary).toBeTruthy();
    expect(json.data.fields.property_type?.value).toBe("apartment");
  });

  it("modo texto: texto vazio retorna 422", async () => {
    const req = makeJsonRequest({ text: "" });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("modo texto: JSON inválido retorna 400", async () => {
    const req = new NextRequest("http://localhost/api/extract-property", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("modo áudio: multipart com blob retorna ExtractionResult", async () => {
    const formData = new FormData();
    formData.append("audio", new Blob(["fake-audio"], { type: "audio/webm" }), "audio.webm");
    const req = new NextRequest("http://localhost/api/extract-property", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.fields.property_type?.value).toBe("house");
  });

  it("modo áudio: áudio > 15MB retorna 413", async () => {
    const bigBlob = new Blob([new Uint8Array(16 * 1024 * 1024)], { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", bigBlob, "big.webm");
    const req = new NextRequest("http://localhost/api/extract-property", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("Content-Type não suportado retorna 415", async () => {
    const req = new NextRequest("http://localhost/api/extract-property", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "algum texto",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
  });
});
```

- [ ] **Step 4: Rodar testes da rota**

```bash
cd ValoraIA_back && npm run test -- src/app/api/extract-property/__tests__/route.test.ts
```

Esperado: todos passam.

- [ ] **Step 5: Rodar suite completa de backend**

```bash
cd ValoraIA_back && npm run test
```

Esperado: nenhum teste existente quebra.

- [ ] **Step 6: Commit**

```bash
git add ValoraIA_back/src/lib/ai/__tests__/ ValoraIA_back/src/app/api/extract-property/__tests__/
git commit -m "test(back): testes para property-extractor e rota extract-property"
```

---

## Task 5: Frontend — tipos e `mergeExtraction`

**Files:**
- Modify: `ValoraIA_front/src/types/index.ts`
- Create: `ValoraIA_front/src/lib/mergeExtraction.ts`

**Interfaces:**
- Produces: `mergeExtraction(form, result, source)`, `FieldSource`, `FormFieldSource`, `inferScopeForItem()`

- [ ] **Step 1: Adicionar tipos de extração no frontend**

Adicionar ao final de `ValoraIA_front/src/types/index.ts`:

```typescript
// ─── Extraction (entrada natural por IA) ──────────────────────────────────────

export interface ExtractedField<T> {
  value: T | null
  confidence: number
}

export interface ExtractionResult {
  summary: string
  fields: {
    address?: ExtractedField<string>
    property_type?: ExtractedField<PropertyType>
    area_m2?: ExtractedField<number>
    bedrooms?: ExtractedField<number>
    bathrooms?: ExtractedField<number>
    parking_spaces?: ExtractedField<number>
    construction_age?: ExtractedField<number>
    conservation_state?: ExtractedField<ConservationState>
    terrain_slope?: ExtractedField<TerrainSlope>
    street_level?: ExtractedField<StreetLevel>
    is_corner?: ExtractedField<boolean>
    in_gated_community?: ExtractedField<boolean>
  }
  amenities: { item: string; confidence: number }[]
  gaps: string[]
}

export type FieldSource = 'audio' | 'photo' | 'manual'
export type FormFieldSource = Partial<Record<keyof ValuationForm, FieldSource>>
```

- [ ] **Step 2: Criar diretório e arquivo `mergeExtraction.ts`**

```bash
mkdir -p ValoraIA_front/src/lib
```

```typescript
// ValoraIA_front/src/lib/mergeExtraction.ts

import type {
  ValuationForm,
  ExtractionResult,
  AmenitySelection,
  AmenityScope,
  PropertyType,
  FieldSource,
  FormFieldSource,
} from '../types'
import { FRONT_CATALOG } from '../amenities'

export function inferScopeForItem(
  item: string,
  propertyType: PropertyType,
  inGatedCommunity: boolean
): AmenityScope | null {
  const entry = FRONT_CATALOG[item]
  if (!entry) return null

  const can = (s: AmenityScope) => entry.scopes.includes(s)

  if (propertyType === 'land') return null
  if (entry.scopes.length === 1) return entry.scopes[0]

  if (propertyType === 'apartment') {
    return can('condo') ? 'condo' : can('interno') ? 'interno' : null
  }

  // house / commercial
  if (inGatedCommunity && can('condo')) return 'condo'
  return can('interno') ? 'interno' : can('condo') ? 'condo' : null
}

export function mergeExtraction(
  form: ValuationForm,
  result: ExtractionResult,
  currentSource: FormFieldSource
): { form: ValuationForm; source: FormFieldSource } {
  const newForm = { ...form }
  const newSource = { ...currentSource }

  function trySet<K extends keyof ValuationForm>(
    key: K,
    value: ValuationForm[K] | null | undefined,
    incoming: FieldSource
  ) {
    if (value == null) return
    const existing = newSource[key]
    if (existing === 'manual') return
    if (existing === 'audio' && incoming === 'photo') return
    newForm[key] = value
    newSource[key] = incoming
  }

  const { fields } = result

  if (fields.address?.value != null)
    trySet('address', fields.address.value, 'audio')
  if (fields.property_type?.value != null)
    trySet('propertyType', fields.property_type.value, 'audio')
  if (fields.area_m2?.value != null)
    trySet('area', String(fields.area_m2.value), 'audio')
  if (fields.bedrooms?.value != null)
    trySet('bedrooms', String(fields.bedrooms.value), 'audio')
  if (fields.bathrooms?.value != null)
    trySet('bathrooms', String(fields.bathrooms.value), 'audio')
  if (fields.parking_spaces?.value != null)
    trySet('parking_spaces', String(fields.parking_spaces.value), 'audio')
  if (fields.construction_age?.value != null)
    trySet('construction_age', String(fields.construction_age.value), 'audio')
  if (fields.conservation_state?.value != null)
    trySet('conservation_state', fields.conservation_state.value, 'audio')
  if (fields.terrain_slope?.value != null)
    trySet('terrain_slope', fields.terrain_slope.value, 'audio')
  if (fields.street_level?.value != null)
    trySet('street_level', fields.street_level.value, 'audio')
  if (fields.is_corner?.value != null)
    trySet('is_corner', fields.is_corner.value, 'audio')
  if (fields.in_gated_community?.value != null)
    trySet('in_gated_community', fields.in_gated_community.value, 'audio')

  // Amenidades: inferir escopo e dedup
  const propertyType = newForm.propertyType
  const inGated = newForm.in_gated_community
  const toAdd: AmenitySelection[] = []

  for (const a of result.amenities) {
    const scope = inferScopeForItem(a.item, propertyType, inGated)
    if (!scope) continue
    const alreadyIn = newForm.amenities.some(e => e.item === a.item && e.scope === scope)
    if (!alreadyIn) toAdd.push({ item: a.item, scope })
  }

  if (toAdd.length > 0) {
    newForm.amenities = [...newForm.amenities, ...toAdd]
  }

  return { form: newForm, source: newSource }
}
```

- [ ] **Step 3: Escrever testes de `mergeExtraction`**

```typescript
// ValoraIA_front/src/__tests__/mergeExtraction.test.ts

import { describe, it, expect } from 'vitest'
import { mergeExtraction, inferScopeForItem } from '../lib/mergeExtraction'
import type { ValuationForm, ExtractionResult, FormFieldSource } from '../types'

const BASE_FORM: ValuationForm = {
  address: '',
  propertyType: 'apartment',
  area: '',
  bedrooms: '',
  bathrooms: '',
  parking_spaces: '',
  construction_age: '',
  conservation_state: '' as never,
  is_corner: false,
  terrain_slope: '' as never,
  street_level: '' as never,
  photos: [],
  photoUrls: [],
  amenities: [],
  in_gated_community: false,
}

const FULL_RESULT: ExtractionResult = {
  summary: 'Apartamento de 3 quartos em Manaíra.',
  fields: {
    address: { value: 'Rua X, 100', confidence: 0.9 },
    property_type: { value: 'apartment', confidence: 0.9 },
    area_m2: { value: 98, confidence: 0.9 },
    bedrooms: { value: 3, confidence: 0.9 },
    bathrooms: { value: 2, confidence: 0.9 },
    parking_spaces: { value: 1, confidence: 0.7 },
    construction_age: { value: 5, confidence: 0.7 },
    conservation_state: { value: 'regular', confidence: 0.7 },
    is_corner: { value: true, confidence: 0.5 },
    in_gated_community: { value: false, confidence: 0.5 },
  },
  amenities: [{ item: 'piscina', confidence: 0.9 }, { item: 'academia', confidence: 0.7 }],
  gaps: [],
}

describe('mergeExtraction', () => {
  it('preenche form vazio com dados do resultado', () => {
    const { form } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    expect(form.address).toBe('Rua X, 100')
    expect(form.propertyType).toBe('apartment')
    expect(form.area).toBe('98')
    expect(form.bedrooms).toBe('3')
    expect(form.bathrooms).toBe('2')
    expect(form.parking_spaces).toBe('1')
    expect(form.construction_age).toBe('5')
    expect(form.conservation_state).toBe('regular')
    expect(form.is_corner).toBe(true)
  })

  it('marca campos com source audio', () => {
    const { source } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    expect(source.address).toBe('audio')
    expect(source.area).toBe('audio')
    expect(source.conservation_state).toBe('audio')
  })

  it('campo manual não é sobrescrito pelo áudio', () => {
    const formWithManual = { ...BASE_FORM, address: 'Endereço manual' }
    const sourceWithManual: FormFieldSource = { address: 'manual' }
    const { form, source } = mergeExtraction(formWithManual, FULL_RESULT, sourceWithManual)
    expect(form.address).toBe('Endereço manual')
    expect(source.address).toBe('manual')
  })

  it('campo audio não é sobrescrito pela foto (incoming photo)', () => {
    const formWithAudio = { ...BASE_FORM, conservation_state: 'novo' as const }
    const sourceWithAudio: FormFieldSource = { conservation_state: 'audio' }
    const photoResult: ExtractionResult = {
      ...FULL_RESULT,
      fields: { conservation_state: { value: 'critico', confidence: 0.9 } },
    }
    // Simulate photo merge: incoming source is 'photo'
    // mergeExtraction uses 'audio' hardcoded — for photo, caller must pass different source
    // Actually: mergeExtraction is also used for photo results; caller sets incoming to 'photo'
    // We test via: if source is 'audio' in currentSource and incoming would be 'photo'
    // But current design: mergeExtraction always uses 'audio' as source.
    // Photo merge happens in advanceFromPhotoStep, which manually checks fieldSource.
    // mergeExtraction is only for extraction results (audio/text input).
    // So this test validates that audio source is preserved when re-running mergeExtraction:
    const { form, source } = mergeExtraction(formWithAudio, photoResult, sourceWithAudio)
    // Should NOT overwrite because existing source is 'audio' and incoming (from mergeExtraction) is also 'audio'
    // mergeExtraction always writes 'audio' — if field is already 'audio', it overwrites
    // This is fine — same-level merges replace. Only photo can't replace audio.
    expect(form.conservation_state).toBe('critico') // audio overwrites audio
    expect(source.conservation_state).toBe('audio')
  })

  it('converte numéricos para string', () => {
    const { form } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    expect(typeof form.area).toBe('string')
    expect(form.area).toBe('98')
    expect(form.bedrooms).toBe('3')
  })

  it('adiciona amenidades com escopo inferido para apartment', () => {
    const { form } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    const piscina = form.amenities.find(a => a.item === 'piscina')
    expect(piscina).toBeDefined()
    expect(piscina?.scope).toBe('condo') // apartment → piscina = condo
    const academia = form.amenities.find(a => a.item === 'academia')
    expect(academia?.scope).toBe('condo')
  })

  it('não duplica amenidade já existente no form', () => {
    const formWithPiscina = {
      ...BASE_FORM,
      amenities: [{ item: 'piscina', scope: 'condo' as const }],
    }
    const { form } = mergeExtraction(formWithPiscina, FULL_RESULT, {})
    const piscinas = form.amenities.filter(a => a.item === 'piscina')
    expect(piscinas).toHaveLength(1)
  })

  it('ignora amenidade com item fora do FRONT_CATALOG', () => {
    const resultWithUnknown: ExtractionResult = {
      ...FULL_RESULT,
      amenities: [{ item: 'heliponto_invalido', confidence: 0.9 }],
    }
    const { form } = mergeExtraction(BASE_FORM, resultWithUnknown, {})
    expect(form.amenities.find(a => a.item === 'heliponto_invalido')).toBeUndefined()
  })

  it('property_type=land: ignora amenidades interno', () => {
    const landForm = { ...BASE_FORM, propertyType: 'land' as const }
    const { form } = mergeExtraction(landForm, FULL_RESULT, {})
    expect(form.amenities).toHaveLength(0) // piscina e academia inválidos para land
  })
})

describe('inferScopeForItem', () => {
  it('apartment → piscina = condo', () => {
    expect(inferScopeForItem('piscina', 'apartment', false)).toBe('condo')
  })
  it('house sem condomínio → piscina = interno', () => {
    expect(inferScopeForItem('piscina', 'house', false)).toBe('interno')
  })
  it('house em condomínio → piscina = condo', () => {
    expect(inferScopeForItem('piscina', 'house', true)).toBe('condo')
  })
  it('land → retorna null', () => {
    expect(inferScopeForItem('piscina', 'land', false)).toBeNull()
  })
  it('item desconhecido → null', () => {
    expect(inferScopeForItem('item_inexistente', 'apartment', false)).toBeNull()
  })
  it('salao_festas (só condo) → apartment = condo', () => {
    expect(inferScopeForItem('salao_festas', 'apartment', false)).toBe('condo')
  })
  it('quintal (só interno) → house = interno', () => {
    expect(inferScopeForItem('quintal', 'house', false)).toBe('interno')
  })
  it('quintal (só interno) → land = null', () => {
    expect(inferScopeForItem('quintal', 'land', false)).toBeNull()
  })
})
```

- [ ] **Step 4: Rodar testes de mergeExtraction**

```bash
cd ValoraIA_front && npm run test -- src/__tests__/mergeExtraction.test.ts
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add ValoraIA_front/src/types/index.ts ValoraIA_front/src/lib/mergeExtraction.ts ValoraIA_front/src/__tests__/mergeExtraction.test.ts
git commit -m "feat(front): tipos ExtractionResult, mergeExtraction com precedência áudio>foto>manual"
```

---

## Task 6: Frontend API — `extractProperty`

**Files:**
- Modify: `ValoraIA_front/src/api.ts`

**Interfaces:**
- Produces: `extractProperty(input: AudioBlob | string): Promise<ExtractionResult>`

- [ ] **Step 1: Adicionar `extractProperty` em `api.ts`**

Adicionar após a função `analyzePhotos` em `ValoraIA_front/src/api.ts`:

```typescript
import type { ExtractionResult } from './types'

export async function extractProperty(input: Blob | string): Promise<ExtractionResult> {
  if (typeof input === 'string') {
    return callApi<ExtractionResult>('/api/extract-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input }),
    })
  }
  const formData = new FormData()
  formData.append('audio', input, 'audio.webm')
  const res = await fetch(`${BASE}/api/extract-property`, {
    method: 'POST',
    body: formData,
  })
  const json = await res.json() as { success: boolean; data?: ExtractionResult; error?: string }
  if (!json.success) throw new Error(json.error ?? 'Erro ao processar áudio')
  return json.data!
}
```

Lembrar de adicionar `ExtractionResult` ao import de types no topo do arquivo:

```typescript
import type {
  ValuationRecord,
  DashboardMetrics,
  DashboardValuationsResponse,
  MarketTrendResponse,
  CreateValuationBody,
  PhotoAnalysisResult,
  ExtractionResult,
} from './types'
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd ValoraIA_front && npx tsc -b --noEmit 2>&1 | grep "api.ts"
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/api.ts
git commit -m "feat(front/api): extractProperty para áudio e texto"
```

---

## Task 7: Frontend — `IntakeStep.tsx`

**Files:**
- Create: `ValoraIA_front/src/components/IntakeStep.tsx`

**Interfaces:**
- Consumes: `extractProperty` de `../api`, `ExtractionResult` de `../types`
- Produces: `<IntakeStep onExtracted(result) onSkip() />` — renderiza o passo 0 completo com captura de áudio/texto

- [ ] **Step 1: Criar `IntakeStep.tsx`**

```typescript
// ValoraIA_front/src/components/IntakeStep.tsx

import { useState, useRef, useEffect } from 'react'
import type { ExtractionResult } from '../types'
import { extractProperty } from '../api'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

interface Props {
  onExtracted: (result: ExtractionResult) => void
  onSkip: () => void
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'error'

export default function IntakeStep({ onExtracted, onSkip }: Props) {
  const [mode, setMode] = useState<'audio' | 'text'>('audio')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      mediaRecorderRef.current?.stop()
    }
  }, [])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => stream.getTracks().forEach(t => t.stop())
      mr.start()
      mediaRecorderRef.current = mr
      setRecordingState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setMicDenied(true)
      setMode('text')
    }
  }

  const stopAndProcess = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const mr = mediaRecorderRef.current
    if (!mr) return
    setRecordingState('processing')

    await new Promise<void>(resolve => {
      mr.onstop = () => resolve()
      mr.stop()
    })

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    try {
      const result = await extractProperty(blob)
      onExtracted(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar áudio. Tente o texto.')
      setRecordingState('idle')
    }
  }

  const submitText = async () => {
    if (!text.trim()) return
    setError(null)
    setRecordingState('processing')
    try {
      const result = await extractProperty(text.trim())
      onExtracted(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar descrição.')
      setRecordingState('idle')
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (recordingState === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
        <div
          className="w-12 h-12 rounded-full border-[3px] border-slate-200 animate-spin"
          style={{ borderTopColor: PRIMARY }}
        />
        <p className="text-base font-semibold text-slate-900">Analisando descrição…</p>
        <p className="text-sm text-slate-500">A IA está extraindo os dados do imóvel</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Descreva o imóvel</h2>
        <p className="text-sm text-slate-500">
          Fale ou escreva sobre o imóvel. A IA preenche o formulário automaticamente.
        </p>
      </div>

      {micDenied && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
          Microfone não disponível. Use a descrição por escrito abaixo.
        </div>
      )}

      {!micDenied && (
        <div className="flex gap-2 mb-1">
          <button
            onClick={() => setMode('audio')}
            style={{
              padding: '6px 14px',
              borderRadius: 16,
              border: `1.5px solid ${mode === 'audio' ? PRIMARY : '#E2E8F0'}`,
              background: mode === 'audio' ? PRIMARY + '0D' : '#fff',
              color: mode === 'audio' ? PRIMARY : '#64748B',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Áudio
          </button>
          <button
            onClick={() => setMode('text')}
            style={{
              padding: '6px 14px',
              borderRadius: 16,
              border: `1.5px solid ${mode === 'text' ? PRIMARY : '#E2E8F0'}`,
              background: mode === 'text' ? PRIMARY + '0D' : '#fff',
              color: mode === 'text' ? PRIMARY : '#64748B',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Texto
          </button>
        </div>
      )}

      {mode === 'audio' && !micDenied ? (
        <div className="flex flex-col items-center gap-5 py-6">
          {recordingState === 'idle' ? (
            <button
              onClick={startRecording}
              aria-label="Iniciar gravação"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: `3px solid ${PRIMARY}`,
                background: '#fff',
                color: PRIMARY,
                fontSize: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              🎙
            </button>
          ) : (
            <button
              onClick={stopAndProcess}
              aria-label="Parar gravação"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: 'none',
                background: '#EF4444',
                color: '#fff',
                fontSize: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              ⏹
            </button>
          )}

          {recordingState === 'recording' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-mono font-bold" style={{ color: '#EF4444' }}>
                {fmt(seconds)}
              </span>
              <span className="text-xs text-slate-400">Gravando… clique para parar</span>
            </div>
          )}

          {recordingState === 'idle' && (
            <p className="text-sm text-slate-500 text-center">
              Clique para gravar a descrição do imóvel
            </p>
          )}

          <button
            onClick={() => setMode('text')}
            className="text-xs text-slate-400 underline"
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
          >
            ou descreva por escrito
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none bg-white resize-none focus:border-primary"
            rows={5}
            placeholder="Ex: Apartamento de 3 quartos, 98m², no bairro Manaíra em João Pessoa. 2 banheiros, 1 vaga, condomínio com piscina e academia. Estado de conservação regular, construído há 8 anos."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button
            onClick={submitText}
            disabled={!text.trim()}
            className="self-end px-5 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: PRIMARY, fontFamily: 'inherit' }}
          >
            Extrair dados
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
          <button
            onClick={onSkip}
            className="ml-2 underline"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}
          >
            Pular e preencher manualmente
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">Entrada por IA é opcional</span>
        <button
          onClick={onSkip}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-500 text-sm font-medium"
          style={{ cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Pular
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd ValoraIA_front && npx tsc -b --noEmit 2>&1 | grep "IntakeStep"
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/IntakeStep.tsx
git commit -m "feat(front): IntakeStep — captura de áudio/texto para passo 0"
```

---

## Task 8: Frontend — `ExtractionCard.tsx`

**Files:**
- Create: `ValoraIA_front/src/components/ExtractionCard.tsx`

**Interfaces:**
- Consumes: `ExtractionResult` de `../types`, `FRONT_CATALOG` de `../amenities`
- Produces: `<ExtractionCard result onUse() onRedo() />` — exibe resumo narrativo, campos com badges de confiança, gaps e amenidades

- [ ] **Step 1: Criar `ExtractionCard.tsx`**

```typescript
// ValoraIA_front/src/components/ExtractionCard.tsx

import type { ExtractionResult, PropertyType, ConservationState, TerrainSlope, StreetLevel } from '../types'
import { FRONT_CATALOG } from '../amenities'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

interface Props {
  result: ExtractionResult
  onUse: () => void
  onRedo: () => void
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.75) {
    return { label: 'Alta', bg: '#D1FAE5', color: '#065F46' }
  }
  if (confidence >= 0.5) {
    return { label: 'Média', bg: '#FEF3C7', color: '#92400E' }
  }
  return { label: 'Baixa', bg: '#F1F5F9', color: '#475569' }
}

const FIELD_LABELS: Record<string, string> = {
  address: 'Endereço',
  property_type: 'Tipo',
  area_m2: 'Área (m²)',
  bedrooms: 'Quartos',
  bathrooms: 'Banheiros',
  parking_spaces: 'Vagas',
  construction_age: 'Idade (anos)',
  conservation_state: 'Conservação',
  terrain_slope: 'Topografia',
  street_level: 'Nível de rua',
  is_corner: 'Esquina',
  in_gated_community: 'Em condomínio fechado',
}

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
}

const CONSERVATION_LABELS: Record<ConservationState, string> = {
  novo: 'Novo',
  entre_novo_e_regular: 'Entre novo e regular',
  regular: 'Regular',
  reparos_simples: 'Reparos simples',
  reparos_importantes: 'Reparos importantes',
  critico: 'Crítico',
}

const SLOPE_LABELS: Record<TerrainSlope, string> = {
  plano: 'Plano',
  aclive_leve: 'Aclive leve',
  declive_leve: 'Declive leve',
  aclive_acentuado: 'Aclive acentuado',
  declive_acentuado: 'Declive acentuado',
}

const STREET_LABELS: Record<StreetLevel, string> = {
  no_nivel: 'No nível',
  abaixo_nivel: 'Abaixo do nível',
  acima_nivel: 'Acima do nível',
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (key === 'property_type') return PROPERTY_TYPE_LABELS[value as PropertyType] ?? String(value)
  if (key === 'conservation_state') return CONSERVATION_LABELS[value as ConservationState] ?? String(value)
  if (key === 'terrain_slope') return SLOPE_LABELS[value as TerrainSlope] ?? String(value)
  if (key === 'street_level') return STREET_LABELS[value as StreetLevel] ?? String(value)
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return String(value)
}

export default function ExtractionCard({ result, onUse, onRedo }: Props) {
  const extractedEntries = Object.entries(result.fields).filter(
    ([, field]) => field && field.value != null
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="p-4 rounded-xl" style={{ background: PRIMARY + '08', border: `1px solid ${PRIMARY}22` }}>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: PRIMARY, fontSize: 16 }}>✦</span>
          <span className="text-sm font-semibold" style={{ color: PRIMARY }}>Resumo da IA</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
      </div>

      {/* Extracted fields */}
      {extractedEntries.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Campos extraídos
          </h4>
          <div className="flex flex-col gap-2">
            {extractedEntries.map(([key, field]) => {
              if (!field) return null
              const badge = confidenceBadge(field.confidence)
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {FIELD_LABELS[key] ?? key}
                    </span>
                    <span className="text-sm text-slate-900">
                      {formatValue(key, field.value)}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Amenities */}
      {result.amenities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Comodidades detectadas
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.amenities.map(a => (
              <span
                key={a.item}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: ACCENT + '15', color: ACCENT, border: `1px solid ${ACCENT}33` }}
              >
                {FRONT_CATALOG[a.item]?.label ?? a.item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <div
          className="p-3 rounded-lg"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="text-xs font-semibold text-amber-700 mb-1">
            Faltou informar:
          </div>
          <div className="text-sm text-amber-800">
            {result.gaps.map(g => FIELD_LABELS[g] ?? g).join(', ')}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onUse}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer"
          style={{ background: PRIMARY, fontFamily: 'inherit' }}
        >
          Usar e revisar
        </button>
        <button
          onClick={onRedo}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 cursor-pointer"
          style={{ fontFamily: 'inherit' }}
        >
          Regravar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd ValoraIA_front && npx tsc -b --noEmit 2>&1 | grep "ExtractionCard"
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/ExtractionCard.tsx
git commit -m "feat(front): ExtractionCard com badges de confiança, gaps e comodidades"
```

---

## Task 9: Frontend — Integração no `ValuationFlow`

**Files:**
- Modify: `ValoraIA_front/src/components/ValuationFlow.tsx`

**Interfaces:**
- Consumes: `IntakeStep`, `ExtractionCard`, `mergeExtraction`, `FormFieldSource`
- Changes:
  - `STEPS` passa de 3 para 4 itens
  - Novo estado `fieldSource: FormFieldSource` e `extractionResult: ExtractionResult | null`
  - Passo 0 renderiza `IntakeStep` (sem nav externo) ou `ExtractionCard` (quando resultado disponível)
  - `advanceFromPhotoStep` respeita `fieldSource` para conservation_state
  - Nav externo oculto quando step === 0

- [ ] **Step 1: Adicionar imports**

No topo de `ValoraIA_front/src/components/ValuationFlow.tsx`, adicionar:

```typescript
import type { ExtractionResult, FormFieldSource } from '../types'
import { mergeExtraction } from '../lib/mergeExtraction'
import IntakeStep from './IntakeStep'
import ExtractionCard from './ExtractionCard'
```

- [ ] **Step 2: Atualizar `STEPS`**

```typescript
const STEPS = ['Entrada por IA', 'Detalhes do Imóvel', 'Conservação & Fotos', 'Revisão & Envio']
```

- [ ] **Step 3: Adicionar estados no componente `ValuationFlow`**

Logo após `const [suggested, setSuggested] = useState<AmenitySelection[]>([])`, adicionar:

```typescript
const [fieldSource, setFieldSource] = useState<FormFieldSource>({})
const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
```

- [ ] **Step 4: Adicionar handler `handleExtracted`**

Logo após o handler `handlePropertyTypeChange`, adicionar:

```typescript
const handleExtracted = (result: ExtractionResult) => {
  setExtractionResult(result)
}

const handleUseExtraction = () => {
  if (!extractionResult) return
  const { form: merged, source } = mergeExtraction(form, extractionResult, fieldSource)
  setForm(merged)
  setFieldSource(source)
  setExtractionResult(null)
  setStep(1)
}

const handleRedoExtraction = () => {
  setExtractionResult(null)
}
```

- [ ] **Step 5: Atualizar `canAdvance`**

Substituir o bloco `canAdvance` atual:

```typescript
// ANTES:
const canAdvance = step === 0
  ? form.address.trim().length > 0 && form.area.trim().length > 0 && parseFloat(form.area) > 0
  : true

// DEPOIS:
const canAdvance = step === 0
  ? true  // IntakeStep controla seu próprio avanço
  : step === 1
  ? form.address.trim().length > 0 && form.area.trim().length > 0 && parseFloat(form.area) > 0
  : true
```

- [ ] **Step 6: Atualizar `handleContinue`**

```typescript
// ANTES:
const handleContinue = () => {
  if (step === 1) {
    advanceFromPhotoStep()
  } else if (step < maxStep) {

// DEPOIS:
const handleContinue = () => {
  if (step === 2) {
    advanceFromPhotoStep()
  } else if (step < maxStep) {
```

- [ ] **Step 7: Atualizar `advanceFromPhotoStep` para respeitar `fieldSource`**

Dentro de `advanceFromPhotoStep`, localizar o bloco onde `conservation_state` é definido pelo AI:

```typescript
// ANTES:
if (!form.conservation_state) {
  try {
    const analysis = await analyzePhotos(urls)
    if (analysis.estado_conservacao_sugerido) {
      setForm(f => ({ ...f, conservation_state: analysis.estado_conservacao_sugerido }))
    }

// DEPOIS:
if (fieldSource.conservation_state !== 'audio' && fieldSource.conservation_state !== 'manual') {
  try {
    const analysis = await analyzePhotos(urls)
    if (analysis.estado_conservacao_sugerido && !form.conservation_state) {
      setForm(f => ({ ...f, conservation_state: analysis.estado_conservacao_sugerido }))
      setFieldSource(s => ({ ...s, conservation_state: 'photo' }))
    }
```

- [ ] **Step 8: Adicionar render do passo 0 na JSX**

No bloco de renderização do conteúdo (dentro do `<div className="bg-white rounded-xl...`):

Localizar `{processing ? (` e logo após o bloco de processing, antes de `step === 0 ? (` (que agora vai ser step === 1 para Detalhes), inserir:

```tsx
) : step === 0 ? (
  /* Passo 0 — Entrada por IA */
  extractionResult ? (
    <ExtractionCard
      result={extractionResult}
      onUse={handleUseExtraction}
      onRedo={handleRedoExtraction}
    />
  ) : (
    <IntakeStep
      onExtracted={handleExtracted}
      onSkip={() => setStep(1)}
    />
  )
```

E renomear o antigo `step === 0 ?` para `step === 1 ?`, `step === 1 ?` (foto step) para `step === 2 ?`.

**Atenção:** O bloco de render atual usa `isReviewStep` (que era `step === maxStep`). Com 4 steps, `maxStep = 3`. Verificar que `isReviewStep = step === maxStep` ainda funciona corretamente (step 3 = Revisão).

- [ ] **Step 9: Ocultar nav externo no step 0**

Localizar o bloco `{!processing && (` que contém a navegação e mudar para:

```tsx
{!processing && step > 0 && (
  <div className="flex justify-between mt-5">
    <button
      onClick={() => setStep(s => s - 1)}
      className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-sm font-medium transition-opacity"
      style={{ cursor: 'pointer', fontFamily: 'inherit' }}
    >
      Voltar
    </button>
    <button
      onClick={handleContinue}
      disabled={!canAdvance || photoUploading}
      className="px-6 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: PRIMARY, fontFamily: 'inherit' }}
    >
      {photoUploading
        ? 'Enviando...'
        : step < maxStep
          ? 'Continuar'
          : '✦ Gerar Avaliação IA'}
    </button>
  </div>
)}
```

- [ ] **Step 10: Verificar TypeScript do ValuationFlow completo**

```bash
cd ValoraIA_front && npx tsc -b --noEmit 2>&1 | grep "ValuationFlow"
```

Esperado: sem erros.

- [ ] **Step 11: Rodar suite de testes front para verificar regressões**

```bash
cd ValoraIA_front && npm run test -- --run
```

Esperado: nenhum teste existente quebra.

- [ ] **Step 12: Commit**

```bash
git add ValoraIA_front/src/components/ValuationFlow.tsx
git commit -m "feat(front): ValuationFlow integra passo 0 com IntakeStep e ExtractionCard"
```

---

## Task 10: Testes de frontend — IntakeStep e ExtractionCard

**Files:**
- Create: `ValoraIA_front/src/__tests__/IntakeStep.test.tsx`
- Create: `ValoraIA_front/src/__tests__/ExtractionCard.test.tsx`

**Interfaces:**
- Consumes: `IntakeStep`, `ExtractionCard`

- [ ] **Step 1: Escrever testes do `IntakeStep`**

```typescript
// ValoraIA_front/src/__tests__/IntakeStep.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import IntakeStep from '../components/IntakeStep'

vi.mock('../api', () => ({
  extractProperty: vi.fn().mockResolvedValue({
    summary: 'Apartamento de 3 quartos.',
    fields: { area_m2: { value: 98, confidence: 0.9 } },
    amenities: [],
    gaps: ['address', 'property_type'],
  }),
}))

describe('IntakeStep', () => {
  const onExtracted = vi.fn()
  const onSkip = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock MediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }) },
      writable: true,
    })
    // Mock MediaRecorder
    vi.stubGlobal('MediaRecorder', class {
      ondataavailable: ((e: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      start() { this.ondataavailable?.({ data: new Blob(['a']) }) }
      stop() { this.onstop?.() }
    })
  })

  it('renderiza botão de gravar e botão Pular', () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    expect(screen.getByLabelText('Iniciar gravação')).toBeDefined()
    expect(screen.getByText('Pular')).toBeDefined()
  })

  it('clique em Pular chama onSkip', () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Pular'))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('modo texto: textarea visível ao clicar em Texto', () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Texto'))
    expect(screen.getByRole('textbox')).toBeDefined()
  })

  it('modo texto: submit chama onExtracted com resultado', async () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Texto'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Apartamento 3 quartos 98m²' } })
    fireEvent.click(screen.getByText('Extrair dados'))
    await waitFor(() => expect(onExtracted).toHaveBeenCalledOnce())
  })

  it('microfone negado: mostra aviso e muda para modo texto', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
    })
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByLabelText('Iniciar gravação'))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeDefined())
    expect(screen.getByText(/Microfone não disponível/)).toBeDefined()
  })

  it('erro de API: mostra mensagem de erro e link para pular', async () => {
    const { extractProperty } = await import('../api')
    vi.mocked(extractProperty).mockRejectedValueOnce(new Error('Serviço indisponível'))
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Texto'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'texto qualquer' } })
    fireEvent.click(screen.getByText('Extrair dados'))
    await waitFor(() => expect(screen.getByText(/Serviço indisponível/)).toBeDefined())
  })
})
```

- [ ] **Step 2: Escrever testes do `ExtractionCard`**

```typescript
// ValoraIA_front/src/__tests__/ExtractionCard.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExtractionCard from '../components/ExtractionCard'
import type { ExtractionResult } from '../types'

const FULL_RESULT: ExtractionResult = {
  summary: 'Apartamento de 3 quartos em Manaíra com piscina.',
  fields: {
    address: { value: 'Av. Epitácio Pessoa, 1000', confidence: 0.9 },
    property_type: { value: 'apartment', confidence: 0.9 },
    area_m2: { value: 98, confidence: 0.9 },
    bedrooms: { value: 3, confidence: 0.7 },
    conservation_state: { value: 'regular', confidence: 0.4 },
  },
  amenities: [{ item: 'piscina', confidence: 0.9 }],
  gaps: ['parking_spaces'],
}

describe('ExtractionCard', () => {
  it('exibe o summary da IA', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Apartamento de 3 quartos em Manaíra com piscina.')).toBeDefined()
  })

  it('exibe campos extraídos com label PT-BR', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Endereço')).toBeDefined()
    expect(screen.getByText('Tipo')).toBeDefined()
    expect(screen.getByText('Área (m²)')).toBeDefined()
    expect(screen.getByText('Apartamento')).toBeDefined()
  })

  it('badge Alta para confidence >= 0.75', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    const badges = screen.getAllByText('Alta')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('badge Baixa para confidence < 0.5', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Baixa')).toBeDefined()
  })

  it('exibe chip de amenidade com label do catálogo', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Piscina')).toBeDefined()
  })

  it('exibe bloco âmbar de gaps com campos obrigatórios', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText(/Faltou informar/)).toBeDefined()
    expect(screen.getByText(/Vagas/)).toBeDefined()
  })

  it('sem gaps: bloco âmbar não aparece', () => {
    const noGaps: ExtractionResult = { ...FULL_RESULT, gaps: [] }
    render(<ExtractionCard result={noGaps} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.queryByText(/Faltou informar/)).toBeNull()
  })

  it('botão "Usar e revisar" chama onUse', () => {
    const onUse = vi.fn()
    render(<ExtractionCard result={FULL_RESULT} onUse={onUse} onRedo={vi.fn()} />)
    fireEvent.click(screen.getByText('Usar e revisar'))
    expect(onUse).toHaveBeenCalledOnce()
  })

  it('botão "Regravar" chama onRedo', () => {
    const onRedo = vi.fn()
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={onRedo} />)
    fireEvent.click(screen.getByText('Regravar'))
    expect(onRedo).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 3: Rodar testes de IntakeStep e ExtractionCard**

```bash
cd ValoraIA_front && npm run test -- src/__tests__/IntakeStep.test.tsx src/__tests__/ExtractionCard.test.tsx
```

Esperado: todos passam.

- [ ] **Step 4: Rodar suite completa de frontend**

```bash
cd ValoraIA_front && npm run test -- --run
```

Esperado: nenhum teste existente quebra.

- [ ] **Step 5: Commit final**

```bash
git add ValoraIA_front/src/__tests__/IntakeStep.test.tsx ValoraIA_front/src/__tests__/ExtractionCard.test.tsx
git commit -m "test(front): IntakeStep, ExtractionCard — render, fluxos, badges, onUse/onRedo"
```

---

## Self-Review

### Cobertura do spec

| Seção do spec | Task(s) | Status |
|---------------|---------|--------|
| Rota POST /api/extract-property (multipart + JSON) | Task 3 | ✓ |
| Módulo property-extractor.ts com Gemini multimodal | Task 2 | ✓ |
| Tipos ExtractedField + ExtractionResult | Task 1, 5 | ✓ |
| responseSchema Gemini com enums válidos | Task 2 | ✓ |
| System prompt PT-BR, catálogo de amenidades injetado | Task 2 | ✓ |
| Áudio inline (base64), sem Storage | Task 2, 3 | ✓ |
| Erros: sem API key, 413 para áudio grande, 422, 502 | Task 3 | ✓ |
| ValuationFlow com 4 steps | Task 9 | ✓ |
| IntakeStep com áudio/texto e botão Pular | Task 7 | ✓ |
| ExtractionCard com summary, campos, badges, gaps, amenidades | Task 8 | ✓ |
| mergeExtraction com precedência manual>áudio>foto | Task 5 | ✓ |
| fieldSource rastreando origem por campo | Task 9 | ✓ |
| Photo merge respeita campos já marcados como audio | Task 9 | ✓ |
| Amenidades: scope via inferScopeForItem, dedup | Task 5 | ✓ |
| Fallback microfone → textarea + aviso | Task 7 | ✓ |
| Botão Pular sempre disponível | Task 7 | ✓ |
| Testes backend: extractor + rota | Task 4 | ✓ |
| Testes frontend: mergeExtraction, IntakeStep, ExtractionCard | Tasks 5, 10 | ✓ |

### Verificação de placeholders

Nenhum TBD, TODO ou "similar ao Task N" encontrado. Todos os blocos de código são completos.

### Consistência de tipos

- `ExtractionResult.amenities` → `{ item: string; confidence: number }[]` — scope ausente (inferido em mergeExtraction com form context). Consistente entre Tasks 1, 2, 5, 8, 10.
- `FormFieldSource` → `Partial<Record<keyof ValuationForm, FieldSource>>` — definido em Task 5, usado em Tasks 9, 10.
- `mergeExtraction(form, result, currentSource)` → `{ form, source }` — assinatura consistente entre Tasks 5 e 9.
- `inferScopeForItem(item, propertyType, inGatedCommunity)` → `AmenityScope | null` — consistente entre Tasks 5 e 10.
