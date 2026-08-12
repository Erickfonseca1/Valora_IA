import { describe, it, expect } from "vitest";
import {
  getMarketPrior,
  matchNeighborhood,
  type MarketPriorCity,
} from "@/lib/market-prior";

const fakeCity: MarketPriorCity = {
  cidade: "João Pessoa",
  uf: "PB",
  data_referencia: "2025",
  bairros: [
    { nome: "José Américo", precos_medios_m2: { casa: 3000, apartamento: 4500 } },
    { nome: "Manaíra", precos_medios_m2: { apartamento: 8500, casa: 6500 } },
    { nome: "Jd Cidade Univ", precos_medios_m2: { apartamento: 4000 } },
    { nome: "Bancários", precos_medios_m2: { apartamento: 5000, terreno: 2500 } },
  ],
};

describe("matchNeighborhood", () => {
  it("match exato", () => {
    const m = matchNeighborhood(fakeCity, "Manaíra", "apartment");
    expect(m?.matched_neighborhood).toBe("Manaíra");
    expect(m?.match_score).toBe(1);
    expect(m?.price_per_m2).toBe(8500 * 0.90);
  });

  it("match fuzzy: Google expande nome (José Américo de Almeida → José Américo)", () => {
    const m = matchNeighborhood(fakeCity, "José Américo de Almeida", "house");
    expect(m?.matched_neighborhood).toBe("José Américo");
    expect(m?.raw_price_per_m2).toBe(3000);
  });

  it("abreviações: Jd Cidade Univ → Jardim Cidade Universitária", () => {
    const m = matchNeighborhood(fakeCity, "Jardim Cidade Universitária", "apartment");
    expect(m?.matched_neighborhood).toBe("Jd Cidade Univ");
  });

  it("null para bairro inexistente", () => {
    expect(matchNeighborhood(fakeCity, "Guarajuba", "apartment")).toBeNull();
  });

  it("null quando a tipologia não existe no bairro", () => {
    expect(matchNeighborhood(fakeCity, "Bancários", "commercial")).toBeNull();
  });
});

describe("getMarketPrior", () => {
  it("ignora acentos na cidade", () => {
    const m = getMarketPrior("Joao Pessoa", "Manaíra", "apartment");
    expect(m?.raw_price_per_m2).toBe(8500);
  });

  it("null sem cidade ou bairro", () => {
    expect(getMarketPrior(null, "Manaíra", "apartment")).toBeNull();
    expect(getMarketPrior("João Pessoa", null, "apartment")).toBeNull();
  });

  it("null para cidade fora do dataset", () => {
    expect(getMarketPrior("Rio de Janeiro", "Copacabana", "apartment")).toBeNull();
    expect(getMarketPrior("Curitiba", "Centro", "apartment")).toBeNull();
  });
});
