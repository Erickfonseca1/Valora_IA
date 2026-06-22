import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/supabase", () => ({
  getAdminClient: vi.fn(),
}));

import { toFrontendComparables } from "../valuation-engine";
import type { ListingRow } from "@/types";

function makeRow(over: Partial<ListingRow> = {}): ListingRow {
  return {
    id: "l1",
    source_url: "https://x.com/1",
    price: 500_000,
    usable_area: 100,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    property_type: "apartment",
    lat: -7.115,
    lng: -34.861,
    neighborhood: "Manaíra",
    city: "João Pessoa",
    construction_age: 5,
    conservation_state: "regular",
    last_seen: "2026-06-01",
    created_at: "2026-05-01",
    distance_m: 250,
    ...over,
  };
}

describe("toFrontendComparables", () => {
  it("inclui lat/lng do row em cada comparável", () => {
    const candidates = [
      { row: makeRow({ lat: -7.11, lng: -34.86, distance_m: 100 }), homogenizedPpm2: 5000, idwWeight: 1, typologyFactor: 1 },
      { row: makeRow({ lat: -7.12, lng: -34.87, distance_m: 300 }), homogenizedPpm2: 5100, idwWeight: 1, typologyFactor: 1 },
    ];
    const result = toFrontendComparables(candidates);
    expect(result[0].lat).toBe(-7.11);
    expect(result[0].lng).toBe(-34.86);
    expect(result[1].lat).toBe(-7.12);
    expect(result[1].lng).toBe(-34.87);
  });

  it("ordena por distância e preserva coords", () => {
    const candidates = [
      { row: makeRow({ lat: -7.20, distance_m: 900 }), homogenizedPpm2: 5000, idwWeight: 1, typologyFactor: 1 },
      { row: makeRow({ lat: -7.10, distance_m: 100 }), homogenizedPpm2: 5000, idwWeight: 1, typologyFactor: 1 },
    ];
    const result = toFrontendComparables(candidates);
    expect(result[0].lat).toBe(-7.10); // mais próximo primeiro
  });
});
