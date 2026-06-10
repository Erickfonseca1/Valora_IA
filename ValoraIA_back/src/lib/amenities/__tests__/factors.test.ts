import { describe, it, expect } from "vitest";
import { computeScopeFactors, computeProximoFactor, type AmenitySelection } from "@/lib/amenities/factors";

describe("computeScopeFactors", () => {
  it("sem comodidades → fatores neutros 1.0", () => {
    const r = computeScopeFactors([], false);
    expect(r.internalFactor).toBe(1.0);
    expect(r.condoFactor).toBe(1.0);
    expect(r.breakdown).toEqual([]);
  });

  it("comodidade interna soma fallback no internalFactor", () => {
    const sel: AmenitySelection[] = [{ item: "piscina", scope: "interno" }];
    const r = computeScopeFactors(sel, false);
    expect(r.internalFactor).toBeCloseTo(1.06, 5);
    expect(r.condoFactor).toBe(1.0);
    expect(r.breakdown).toEqual([
      { scope: "interno", item: "piscina", contribution: 0.06, derived: false },
    ]);
  });

  it("condo só conta se inGated true (gating já resolvido a montante)", () => {
    const sel: AmenitySelection[] = [{ item: "portaria_24h", scope: "condo" }];
    const r = computeScopeFactors(sel, true);
    expect(r.condoFactor).toBeCloseTo(1.04, 5);
  });

  it("teto interno limita a 1.25", () => {
    const sel: AmenitySelection[] = [
      { item: "piscina", scope: "interno" }, { item: "vista_mar", scope: "interno" },
      { item: "cobertura", scope: "interno" }, { item: "quintal", scope: "interno" },
      { item: "varanda", scope: "interno" }, { item: "mobiliado", scope: "interno" },
    ];
    const r = computeScopeFactors(sel, false);
    expect(r.internalFactor).toBeLessThanOrEqual(1.25);
    expect(r.internalFactor).toBe(1.25);
  });

  it("ignora seleção cujo item não suporta o escopo informado", () => {
    const sel: AmenitySelection[] = [{ item: "portaria_24h", scope: "interno" }];
    const r = computeScopeFactors(sel, false);
    expect(r.internalFactor).toBe(1.0);
  });
});

describe("computeProximoFactor", () => {
  it("score no baseline → neutro", () => {
    expect(computeProximoFactor(0.40)).toBe(1.0);
  });
  it("score máximo → teto +5%", () => {
    expect(computeProximoFactor(1.0)).toBe(1.05);
  });
  it("score ausente → neutro", () => {
    expect(computeProximoFactor(undefined)).toBe(1.0);
  });
});
