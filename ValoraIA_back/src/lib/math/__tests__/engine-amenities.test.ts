import { describe, it, expect, vi } from "vitest";

// Mock supabase before importing the engine to prevent env var errors
vi.mock("@/lib/db/supabase", () => ({
  getAdminClient: vi.fn(),
}));

import { applyScopeFactorsToCombined } from "@/lib/math/valuation-engine";

describe("applyScopeFactorsToCombined", () => {
  it("multiplica interno×condo×proximo no fator base", () => {
    const out = applyScopeFactorsToCombined(1.0, {
      internalFactor: 1.06, condoFactor: 1.0, proximoFactor: 1.05,
    });
    expect(out).toBeCloseTo(1.113, 4);
  });

  it("neutro quando todos 1.0", () => {
    expect(applyScopeFactorsToCombined(1.05, {
      internalFactor: 1.0, condoFactor: 1.0, proximoFactor: 1.0,
    })).toBeCloseTo(1.05, 5);
  });
});
