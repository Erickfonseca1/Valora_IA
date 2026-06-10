import { describe, it, expect } from "vitest";
import { inferScope } from "@/lib/amenities/scope";

describe("inferScope", () => {
  it("apartamento: item compartilhável vira condo", () => {
    expect(inferScope("piscina", "apartment", "apartment")).toBe("condo");
    expect(inferScope("academia", "apartment", "apartment")).toBe("condo");
  });

  it("casa isolada: item compartilhável vira interno", () => {
    expect(inferScope("piscina", "house", "home")).toBe("interno");
  });

  it("casa em condomínio fechado: vira condo", () => {
    expect(inferScope("piscina", "house", "gated_community")).toBe("condo");
    expect(inferScope("piscina", "house", "condominium_house")).toBe("condo");
  });

  it("item só-condo é condo independente do tipo", () => {
    expect(inferScope("portaria_24h", "house", "home")).toBe("condo");
  });

  it("item só-interno em terreno é nulo", () => {
    expect(inferScope("quintal", "land", "land")).toBeNull();
  });

  it("item desconhecido é nulo", () => {
    expect(inferScope("inexistente", "apartment", "apartment")).toBeNull();
  });
});
