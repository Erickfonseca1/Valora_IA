import { describe, it, expect } from "vitest";
import { getMarketPrior } from "@/lib/market-prior";

describe("getMarketPrior (dataset real João Pessoa)", () => {
  it("Bancários casa", () => {
    const m = getMarketPrior("João Pessoa", "Bancários", "house");
    console.log("Bancários house:", m);
    expect(m).not.toBeNull();
  });
  it("José Américo casa", () => {
    const m = getMarketPrior("Joao Pessoa", "José Américo de Almeida", "house");
    console.log("José Américo house:", m);
    expect(m).not.toBeNull();
  });
  it("Manaíra apto", () => {
    const m = getMarketPrior("joão pessoa", "Manaíra", "apartment");
    console.log("Manaíra apto:", m);
    expect(m).not.toBeNull();
  });
});
