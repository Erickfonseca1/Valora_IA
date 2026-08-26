import { describe, it, expect } from "vitest";
import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  it("permite chamadas dentro do limite", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3)).toBe(true);
    }
  });

  it("bloqueia chamadas acima do limite", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3);
    expect(rateLimit(key, 3)).toBe(false);
  });

  it("libera após o fim da janela", async () => {
    const key = `test-${Date.now()}`;
    rateLimit(key, 1, 30);
    expect(rateLimit(key, 1, 30)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(rateLimit(key, 1, 30)).toBe(true);
  });
});