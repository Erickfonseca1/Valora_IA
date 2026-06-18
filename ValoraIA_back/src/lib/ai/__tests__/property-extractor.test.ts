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
