import { describe, it, expect } from "vitest";
import { buildListingAmenities } from "@/app/api/scrape/amenities-map";

describe("buildListingAmenities", () => {
  it("apartamento: piscina vira {piscina, condo}", () => {
    const out = buildListingAmenities(["Piscina", "Academia"], "apartment", "apartment");
    expect(out).toEqual([
      { item: "piscina", scope: "condo" },
      { item: "academia", scope: "condo" },
    ]);
  });

  it("casa isolada: piscina vira interno", () => {
    const out = buildListingAmenities(["Piscina"], "house", "home");
    expect(out).toEqual([{ item: "piscina", scope: "interno" }]);
  });

  it("descarta strings desconhecidas e escopos nulos", () => {
    const out = buildListingAmenities(["xpto", "Quintal"], "land", "land");
    expect(out).toEqual([]); // quintal só-interno não aplica a land; xpto não mapeia
  });
});
