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
