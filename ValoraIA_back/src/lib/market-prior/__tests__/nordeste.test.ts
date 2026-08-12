import { describe, it, expect } from "vitest";
import { getMarketPrior } from "@/lib/market-prior";

describe("market-prior Nordeste (dataset real)", () => {
  it("Recife — Boa Viagem apartamento", () => {
    const m = getMarketPrior("Recife", "Boa Viagem", "apartment");
    expect(m).not.toBeNull();
    expect(m!.raw_price_per_m2).toBe(14464);
  });
  it("Fortaleza — Meireles casa", () => {
    const m = getMarketPrior("Fortaleza", "Meireles", "house");
    expect(m).not.toBeNull();
    expect(m!.raw_price_per_m2).toBe(13424);
  });
  it("Salvador — Vitória apto", () => {
    const m = getMarketPrior("Salvador", "Vitória", "apartment");
    expect(m).not.toBeNull();
  });
  it("São Luís — Ponta d'Areia apto", () => {
    const m = getMarketPrior("São Luís", "Ponta d'Areia", "apartment");
    expect(m).not.toBeNull();
    expect(m!.raw_price_per_m2).toBe(17760);
  });
  it("Natal — Areia Preta casa", () => {
    const m = getMarketPrior("Natal", "Areia Preta", "house");
    expect(m).not.toBeNull();
  });
  it("Maceió — Pajuçara apto", () => {
    const m = getMarketPrior("Maceió", "Pajuçara", "apartment");
    expect(m).not.toBeNull();
  });
  it("Aracaju — 13 de Julho apto", () => {
    const m = getMarketPrior("Aracaju", "13 de Julho", "apartment");
    expect(m).not.toBeNull();
  });
  it("Teresina — Jockey apto", () => {
    const m = getMarketPrior("Teresina", "Jockey", "apartment");
    expect(m).not.toBeNull();
  });
  it("João Pessoa segue funcionando", () => {
    const m = getMarketPrior("Joao Pessoa", "Bancários", "house");
    expect(m).not.toBeNull();
  });
});
