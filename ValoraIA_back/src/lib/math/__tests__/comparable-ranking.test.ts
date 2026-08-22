import { describe, expect, it } from "vitest";
import type { ListingRow } from "@/types";
import { rankComparableRows } from "../comparable-ranking";

function row(overrides: Partial<ListingRow>): ListingRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    source_url: "https://example.com/listing",
    price: 400000,
    usable_area: 120,
    land_area: null,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 2,
    property_type: "house",
    lat: -7.1,
    lng: -34.8,
    neighborhood: "Bairro X",
    city: "João Pessoa",
    construction_age: null,
    conservation_state: "regular",
    last_seen: "2026-08-20T12:00:00Z",
    created_at: "2026-08-20T12:00:00Z",
    distance_m: 500,
    ...overrides,
  };
}

describe("rankComparableRows", () => {
  it("prioriza o mesmo bairro antes da tipologia distante", () => {
    const ranked = rankComparableRows(
      [
        row({ id: "distant-house", property_type: "house", neighborhood: "Bairro Y", distance_m: 4000 }),
        row({ id: "local-apartment", property_type: "apartment", neighborhood: "Bairro X", distance_m: 700 }),
        row({ id: "local-house", property_type: "house", neighborhood: "Bairro X", distance_m: 900 }),
      ],
      "house",
      "Bairro X"
    );

    expect(ranked.map((item) => item.id)).toEqual([
      "local-house",
      "local-apartment",
      "distant-house",
    ]);
  });

  it("mantém a tipologia como prioridade quando o bairro não é conhecido", () => {
    const ranked = rankComparableRows(
      [
        row({ id: "apartment-near", property_type: "apartment", distance_m: 200 }),
        row({ id: "house-far", property_type: "house", distance_m: 1800 }),
      ],
      "house",
      null
    );

    expect(ranked[0].id).toBe("house-far");
  });
});
