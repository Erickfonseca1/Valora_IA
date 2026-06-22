import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNearbyPlaces } from "../nearby-places";

beforeEach(() => {
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: "OK",
      results: [
        {
          name: "Mercado Central",
          vicinity: "Rua A, 10",
          geometry: { location: { lat: -7.501, lng: -34.500 } },
          types: ["supermarket"],
        },
      ],
    }),
  }));
});

describe("fetchNearbyPlaces", () => {
  it("inclui lat/lng em cada place", async () => {
    // coords únicas evitam o cache module-level
    const data = await fetchNearbyPlaces(-7.5001, -34.5001);
    const allPlaces = data.pois.flatMap((p) => p.places);
    expect(allPlaces.length).toBeGreaterThan(0);
    expect(allPlaces[0].lat).toBe(-7.501);
    expect(allPlaces[0].lng).toBe(-34.500);
  });
});
