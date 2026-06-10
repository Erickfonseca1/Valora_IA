import { describe, it, expect } from "vitest";
import { AMENITY_CATALOG, mapZapAmenity, type Scope } from "@/lib/amenities/catalog";

describe("AMENITY_CATALOG", () => {
  it("piscina existe em interno e condo, não em proximo", () => {
    expect(AMENITY_CATALOG.piscina.scopes).toEqual(
      expect.arrayContaining<Scope>(["interno", "condo"])
    );
    expect(AMENITY_CATALOG.piscina.scopes).not.toContain("proximo");
  });

  it("portaria_24h só existe em condo", () => {
    expect(AMENITY_CATALOG.portaria_24h.scopes).toEqual(["condo"]);
  });

  it("todo item tem fallback definido para cada escopo válido", () => {
    for (const [id, entry] of Object.entries(AMENITY_CATALOG)) {
      for (const scope of entry.scopes) {
        expect(entry.fallback[scope], `${id}.${scope}`).toBeTypeOf("number");
      }
    }
  });

  it("mapeia string crua do Zap para id do catálogo", () => {
    expect(mapZapAmenity("Piscina")).toBe("piscina");
    expect(mapZapAmenity("ACADEMIA")).toBe("academia");
    expect(mapZapAmenity("Salão de Festas")).toBe("salao_festas");
    expect(mapZapAmenity("xpto inexistente")).toBeNull();
  });
});
