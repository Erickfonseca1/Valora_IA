import { describe, it, expect, vi } from "vitest";

// Mock supabase before importing the engine to prevent env var errors
vi.mock("@/lib/db/supabase", () => ({
  getAdminClient: vi.fn(),
}));

import { buildHomogenizationFactors } from "@/lib/math/valuation-engine";

describe("buildHomogenizationFactors", () => {
  it("combined = physical × amenity e market = ppm2_homog × área", () => {
    const hf = buildHomogenizationFactors({
      ensemblePpm2: 5000,
      offerFactor: 0.9,
      typologyFactor: 1.02,
      cornerFactor: 1.05,
      slopeFactor: 1.0,
      levelFactor: 1.0,
      internalFactor: 1.06,
      condoFactor: 1.0,
      proximoFactor: 1.0,
      areaM2: 100,
    });
    expect(hf.physical_factor).toBeCloseTo(1.05, 6);
    expect(hf.amenity_factor).toBeCloseTo(1.06, 6);
    expect(hf.combined_factor).toBeCloseTo(1.05 * 1.06, 6);
    expect(hf.ppm2_homogenized).toBeCloseTo(5000 * 1.05 * 1.06, 4);
    expect(hf.market_value).toBeCloseTo(5000 * 1.05 * 1.06 * 100, 2);
  });

  it("fatores neutros → combined 1.0 e ppm2 inalterado", () => {
    const hf = buildHomogenizationFactors({
      ensemblePpm2: 4200,
      offerFactor: 0.9,
      typologyFactor: 1.0,
      cornerFactor: 1.0,
      slopeFactor: 1.0,
      levelFactor: 1.0,
      internalFactor: 1.0,
      condoFactor: 1.0,
      proximoFactor: 1.0,
      areaM2: 80,
    });
    expect(hf.combined_factor).toBe(1.0);
    expect(hf.ppm2_homogenized).toBeCloseTo(4200, 4);
    expect(hf.market_value).toBeCloseTo(4200 * 80, 2);
  });
});
