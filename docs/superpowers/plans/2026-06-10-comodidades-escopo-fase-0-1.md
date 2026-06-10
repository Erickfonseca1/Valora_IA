# Comodidades por Escopo — Fases 0+1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturar comodidades classificadas por escopo hierárquico (interno do imóvel / condomínio / próximo) e transformá-las em fatores multiplicativos que movem o preço estimado, com peso de fallback de tabela (Fase 1) e fundação de dados para derivação futura (Fase 0).

**Architecture:** Catálogo único item×escopo no backend; inferência de escopo scope-aware por tipo de imóvel; scraper passa a persistir amenities nos comparáveis; engine agrega fatores por escopo (interno/condo/próximo) com tetos de saneamento e os multiplica no `combinedFactor` que move o R$; frontend captura segmentada por escopo com sugestão de IA confirmável; relatório expõe contribuição por escopo. Fase 2 (derivação da amostra) é plano separado — aqui o fator usa o fallback do catálogo (`derived:false`).

**Tech Stack:** TypeScript, Next.js (versão custom — ver `node_modules/next/dist/docs/`), Supabase/Postgres+PostGIS (jsonb), Vitest, React + Vite + Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-10-comodidades-escopo-hierarquico-design.md`

---

## File Structure

**Backend (`ValoraIA_back/`):**
- Create `vitest.config.ts` — runner + alias `@/`.
- Create `src/lib/amenities/catalog.ts` — catálogo item×escopo, categorias, pesos de fallback, mapa Zap→item.
- Create `src/lib/amenities/scope.ts` — `inferScope(item, propertyType, unitType)`.
- Create `src/lib/amenities/factors.ts` — `computeScopeFactors` (interno/condo, fallback), `computeProximoFactor` (vizinhança), clamps/tetos.
- Create `src/lib/amenities/__tests__/*.test.ts`.
- Modify `src/lib/math/valuation-engine.ts` — remove `AMENITY_WEIGHTS`/`computeAmenityScore`; integra fatores de escopo no `combinedFactor`.
- Modify `src/app/api/scrape/route.ts` — persiste `amenities` + `unit_type` nos `listings`.
- Modify `src/app/api/valuations/route.ts` — aceita `amenities` + `in_gated_community`, persiste, repassa ao engine.
- Modify `src/types/index.ts` — tipos de comodidade.
- Create `migrations/2026-06-10_amenities.sql` — DDL (execução manual no Supabase).

**Frontend (`ValoraIA_front/`):**
- Create `src/amenities.ts` — espelho do catálogo (label/categoria/escopos) para a UI.
- Modify `src/components/ValuationFlow.tsx` — seção segmentada; remove `STEPS_BY_TYPE` morto; decopla copy "+5%".
- Modify `src/components/Report.tsx` — 3 categorias + contribuição por escopo.
- Modify `src/types/index.ts` e `src/api.ts` — campos novos no form/body.

**Docs:**
- Modify `COMO_FUNCIONA_AVALIACAO.md` — corrige a afirmação (linha ~242) de que comodidades não movem preço.

---

## Task 1: Setup Vitest no backend

**Files:**
- Create: `ValoraIA_back/vitest.config.ts`
- Modify: `ValoraIA_back/package.json` (scripts + devDeps)

- [ ] **Step 1: Instalar vitest**

Run:
```bash
cd ValoraIA_back && npm i -D vitest@^4.1.5
```
Expected: adiciona `vitest` em devDependencies sem erro.

- [ ] **Step 2: Criar config com alias `@/`**

Create `ValoraIA_back/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Adicionar script de teste**

Modify `ValoraIA_back/package.json` — no objeto `"scripts"`, adicionar:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```
(manter os scripts existentes `dev`/`build`/`start`/`lint`).

- [ ] **Step 4: Smoke test**

Create `ValoraIA_back/src/lib/amenities/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("vitest", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```
Run: `cd ValoraIA_back && npm test`
Expected: 1 passed.

- [ ] **Step 5: Remover smoke e commitar**

Run:
```bash
rm ValoraIA_back/src/lib/amenities/__tests__/smoke.test.ts
cd ValoraIA_back && git add package.json package-lock.json vitest.config.ts
git commit -m "chore(back): setup vitest"
```

---

## Task 2: Migrações SQL (execução manual)

**Files:**
- Create: `migrations/2026-06-10_amenities.sql`

> Este arquivo é entregue para execução **manual** no Supabase pelo usuário. Não executar via código.

- [ ] **Step 1: Escrever o DDL**

Create `migrations/2026-06-10_amenities.sql`:
```sql
-- Comodidades por escopo — Fase 0
-- Comparáveis: armazenar amenities (com escopo inferido) e unit_type cru do Zap.
ALTER TABLE listings  ADD COLUMN IF NOT EXISTS amenities  jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE listings  ADD COLUMN IF NOT EXISTS unit_type  text;

-- Avaliações: comodidades do imóvel avaliado + flag de condomínio fechado.
ALTER TABLE valuations ADD COLUMN IF NOT EXISTS amenities          jsonb   NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE valuations ADD COLUMN IF NOT EXISTS in_gated_community  boolean NOT NULL DEFAULT false;

-- Verificação:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name IN ('listings','valuations')
--    AND column_name IN ('amenities','unit_type','in_gated_community');
```

- [ ] **Step 2: Commit**

Run:
```bash
git add migrations/2026-06-10_amenities.sql
git commit -m "feat(db): migração de amenities/unit_type/in_gated_community"
```

---

## Task 3: Catálogo de comodidades

**Files:**
- Create: `ValoraIA_back/src/lib/amenities/catalog.ts`
- Test: `ValoraIA_back/src/lib/amenities/__tests__/catalog.test.ts`

- [ ] **Step 1: Escrever o teste falho**

Create `ValoraIA_back/src/lib/amenities/__tests__/catalog.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { AMENITY_CATALOG, mapZapAmenity, type Scope } from "@/lib/amenities/catalog";

describe("AMENITY_CATALOG", () => {
  it("piscina existe em interno e condo, não em proximo", () => {
    expect(AMENITY_CATALOG.piscina.scopes).toEqual(
      expect.arrayContaining<Scope>(["interno", "condo"])
    );
    expect(AMENITY_CATALOG.piscina.scopes).not.toContain("proximo");
  });

  it("portaria_24h só existe em condo", () => {
    expect(AMENITY_CATALOG.portaria_24h.scopes).toEqual(["condo"]);
  });

  it("todo item tem fallback definido para cada escopo válido", () => {
    for (const [id, entry] of Object.entries(AMENITY_CATALOG)) {
      for (const scope of entry.scopes) {
        expect(entry.fallback[scope], `${id}.${scope}`).toBeTypeOf("number");
      }
    }
  });

  it("mapeia string crua do Zap para id do catálogo", () => {
    expect(mapZapAmenity("Piscina")).toBe("piscina");
    expect(mapZapAmenity("ACADEMIA")).toBe("academia");
    expect(mapZapAmenity("Salão de Festas")).toBe("salao_festas");
    expect(mapZapAmenity("xpto inexistente")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_back && npx vitest run src/lib/amenities/__tests__/catalog.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar o catálogo**

Create `ValoraIA_back/src/lib/amenities/catalog.ts`:
```ts
export type Scope = "interno" | "condo" | "proximo";
export type AmenityCategory =
  | "lazer" | "espaco" | "conforto" | "seguranca" | "infra" | "proximo";

export interface CatalogEntry {
  label: string;
  cat: AmenityCategory;
  scopes: Scope[];
  /** Peso de fallback (Grau I) por escopo. Usado enquanto não há derivação da amostra. */
  fallback: Partial<Record<Scope, number>>;
}

export const AMENITY_CATALOG: Record<string, CatalogEntry> = {
  piscina:        { label: "Piscina",                 cat: "lazer",     scopes: ["interno", "condo"],            fallback: { interno: 0.06, condo: 0.04 } },
  academia:       { label: "Academia",                cat: "lazer",     scopes: ["interno", "condo", "proximo"], fallback: { interno: 0.05, condo: 0.03, proximo: 0.01 } },
  churrasqueira:  { label: "Churrasqueira / Gourmet",  cat: "lazer",     scopes: ["interno", "condo"],            fallback: { interno: 0.04, condo: 0.02 } },
  salao_festas:   { label: "Salão de festas",          cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.03 } },
  salao_jogos:    { label: "Salão de jogos",           cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  playground:     { label: "Playground",               cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  espaco_kids:    { label: "Espaço kids",              cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  quadra:         { label: "Quadra esportiva",         cat: "lazer",     scopes: ["interno", "condo", "proximo"], fallback: { interno: 0.04, condo: 0.02, proximo: 0.01 } },
  sauna:          { label: "Sauna",                    cat: "lazer",     scopes: ["interno", "condo"],            fallback: { interno: 0.03, condo: 0.02 } },
  espaco_pet:     { label: "Espaço pet",               cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.01 } },
  quintal:        { label: "Quintal",                  cat: "espaco",    scopes: ["interno"],                     fallback: { interno: 0.05 } },
  jardim:         { label: "Jardim",                   cat: "espaco",    scopes: ["interno", "condo"],            fallback: { interno: 0.03, condo: 0.02 } },
  varanda:        { label: "Varanda / Sacada",         cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.04 } },
  vista_mar:      { label: "Vista mar",                cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.08 } },
  cobertura:      { label: "Cobertura / Rooftop",      cat: "conforto",  scopes: ["interno", "condo"],            fallback: { interno: 0.08, condo: 0.03 } },
  ar_condicionado:{ label: "Ar condicionado",          cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.03 } },
  armarios:       { label: "Armários planejados",      cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.03 } },
  mobiliado:      { label: "Mobiliado",                cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.04 } },
  lareira:        { label: "Lareira",                  cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.02 } },
  portaria_24h:   { label: "Portaria 24h",             cat: "seguranca", scopes: ["condo"],                       fallback: { condo: 0.04 } },
  seguranca_24h:  { label: "Segurança 24h",            cat: "seguranca", scopes: ["condo"],                       fallback: { condo: 0.03 } },
  portao_eletronico:{ label: "Portão eletrônico",      cat: "seguranca", scopes: ["interno", "condo"],            fallback: { interno: 0.01, condo: 0.01 } },
  cameras:        { label: "Câmeras de segurança",     cat: "seguranca", scopes: ["interno", "condo"],            fallback: { interno: 0.01, condo: 0.01 } },
  elevador:       { label: "Elevador",                 cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.03 } },
  gerador:        { label: "Gerador",                  cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  coworking:      { label: "Coworking",                cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  lavanderia:     { label: "Lavanderia",               cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.01 } },
};

/** Strings cruas do Zap → id do catálogo. Chaves normalizadas (lower, sem acento). */
const ZAP_TO_ITEM: Record<string, string> = {
  "piscina": "piscina",
  "academia": "academia",
  "fitness": "academia",
  "churrasqueira": "churrasqueira",
  "espaco gourmet": "churrasqueira",
  "area gourmet": "churrasqueira",
  "salao de festas": "salao_festas",
  "salao de jogos": "salao_jogos",
  "playground": "playground",
  "espaco kids": "espaco_kids",
  "brinquedoteca": "espaco_kids",
  "quadra": "quadra",
  "quadra poliesportiva": "quadra",
  "sauna": "sauna",
  "espaco pet": "espaco_pet",
  "pet care": "espaco_pet",
  "quintal": "quintal",
  "jardim": "jardim",
  "varanda": "varanda",
  "sacada": "varanda",
  "vista mar": "vista_mar",
  "vista para o mar": "vista_mar",
  "cobertura": "cobertura",
  "rooftop": "cobertura",
  "ar condicionado": "ar_condicionado",
  "armarios planejados": "armarios",
  "mobiliado": "mobiliado",
  "lareira": "lareira",
  "portaria 24h": "portaria_24h",
  "portaria 24 horas": "portaria_24h",
  "seguranca 24h": "seguranca_24h",
  "portao eletronico": "portao_eletronico",
  "cameras de seguranca": "cameras",
  "circuito de seguranca": "cameras",
  "elevador": "elevador",
  "gerador": "gerador",
  "coworking": "coworking",
  "lavanderia": "lavanderia",
};

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function mapZapAmenity(raw: string): string | null {
  return ZAP_TO_ITEM[normalize(raw)] ?? null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ValoraIA_back && npx vitest run src/lib/amenities/__tests__/catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
cd ValoraIA_back && git add src/lib/amenities/catalog.ts src/lib/amenities/__tests__/catalog.test.ts
git commit -m "feat(amenities): catálogo item×escopo + mapa Zap"
```

---

## Task 4: Inferência de escopo (scope-aware)

**Files:**
- Create: `ValoraIA_back/src/lib/amenities/scope.ts`
- Test: `ValoraIA_back/src/lib/amenities/__tests__/scope.test.ts`

Regra: para um comparável, decidir o escopo do item.
- Item com escopo único no catálogo → esse escopo.
- Item compartilhável (tem `condo` nos scopes): `apartment` → `condo`; `house`/`commercial` →
  `condo` se `unitType ∈ {gated_community, condominium_house}`, senão `interno` (se item suporta
  `interno`) ou `condo`; `land` → não aplicável → `null`.
- Item só-`interno` em `land` → `null`.

- [ ] **Step 1: Escrever o teste falho**

Create `ValoraIA_back/src/lib/amenities/__tests__/scope.test.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_back && npx vitest run src/lib/amenities/__tests__/scope.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Create `ValoraIA_back/src/lib/amenities/scope.ts`:
```ts
import { AMENITY_CATALOG, type Scope } from "./catalog";
import type { PropertyType } from "@/types";

const GATED_UNIT_TYPES = new Set([
  "gated_community", "condominium_house", "village_house",
]);

/** Escopo de um item para um comparável/imóvel. Retorna null se não aplicável. */
export function inferScope(
  item: string,
  propertyType: PropertyType,
  unitType?: string | null
): Scope | null {
  const entry = AMENITY_CATALOG[item];
  if (!entry) return null;

  const can = (s: Scope) => entry.scopes.includes(s);

  // Item de escopo único → resolve direto.
  if (entry.scopes.length === 1) {
    const only = entry.scopes[0];
    if (only === "interno" && propertyType === "land") return null;
    return only;
  }

  // Item compartilhável (suporta condo e/ou interno).
  if (propertyType === "apartment") {
    return can("condo") ? "condo" : (can("interno") ? "interno" : null);
  }
  if (propertyType === "land") return null;

  // house / commercial
  const gated = unitType ? GATED_UNIT_TYPES.has(unitType) : false;
  if (gated && can("condo")) return "condo";
  if (can("interno")) return "interno";
  return can("condo") ? "condo" : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ValoraIA_back && npx vitest run src/lib/amenities/__tests__/scope.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
cd ValoraIA_back && git add src/lib/amenities/scope.ts src/lib/amenities/__tests__/scope.test.ts
git commit -m "feat(amenities): inferência de escopo scope-aware"
```

---

## Task 5: Fatores de escopo (fallback Fase 1)

**Files:**
- Create: `ValoraIA_back/src/lib/amenities/factors.ts`
- Test: `ValoraIA_back/src/lib/amenities/__tests__/factors.test.ts`

Tetos (saneamento): interno [0,80; 1,25], condo [0,90; 1,15], próximo [0,95; 1,05].

- [ ] **Step 1: Escrever o teste falho**

Create `ValoraIA_back/src/lib/amenities/__tests__/factors.test.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_back && npx vitest run src/lib/amenities/__tests__/factors.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Create `ValoraIA_back/src/lib/amenities/factors.ts`:
```ts
import { AMENITY_CATALOG, type Scope } from "./catalog";

export interface AmenitySelection { item: string; scope: Scope; }

export interface ScopeContribution {
  scope: Scope;
  item: string;
  contribution: number;
  derived: boolean;
}

export interface ScopeFactors {
  internalFactor: number;
  condoFactor: number;
  breakdown: ScopeContribution[];
}

const CAPS: Record<"interno" | "condo", { min: number; max: number }> = {
  interno: { min: 0.80, max: 1.25 },
  condo:   { min: 0.90, max: 1.15 },
};
const PROXIMO_CAP = { min: 0.95, max: 1.05 };
const NEIGHBORHOOD_BASE = 0.40;
// delta máx (1.0-0.40)=0.60 mapeado para +0.05 → k ≈ 0.0833
const PROXIMO_K = 0.05 / 0.60;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
function round4(v: number): number { return Number(v.toFixed(4)); }

/**
 * Fatores de interno e condo a partir das seleções do imóvel-alvo.
 * `inGated` apenas documenta o contexto; o gating de quais itens são `condo`
 * já foi resolvido a montante (UI + inferência). Seleções com escopo inválido
 * para o item são ignoradas (saneamento).
 */
export function computeScopeFactors(
  selections: AmenitySelection[],
  _inGated: boolean
): ScopeFactors {
  const breakdown: ScopeContribution[] = [];
  let internoSum = 0;
  let condoSum = 0;

  for (const sel of selections) {
    const entry = AMENITY_CATALOG[sel.item];
    if (!entry || !entry.scopes.includes(sel.scope)) continue;
    if (sel.scope === "proximo") continue; // próximo vem da vizinhança, não daqui
    const w = entry.fallback[sel.scope];
    if (typeof w !== "number") continue;
    breakdown.push({ scope: sel.scope, item: sel.item, contribution: w, derived: false });
    if (sel.scope === "interno") internoSum += w;
    else condoSum += w;
  }

  return {
    internalFactor: round4(clamp(1 + internoSum, CAPS.interno.min, CAPS.interno.max)),
    condoFactor: round4(clamp(1 + condoSum, CAPS.condo.min, CAPS.condo.max)),
    breakdown,
  };
}

/** Fator do entorno: delta-only acima do baseline de vizinhança, fraco e capado. */
export function computeProximoFactor(neighborhoodScore?: number): number {
  if (typeof neighborhoodScore !== "number") return 1.0;
  const delta = neighborhoodScore - NEIGHBORHOOD_BASE;
  return round4(clamp(1 + delta * PROXIMO_K, PROXIMO_CAP.min, PROXIMO_CAP.max));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ValoraIA_back && npx vitest run src/lib/amenities/__tests__/factors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
cd ValoraIA_back && git add src/lib/amenities/factors.ts src/lib/amenities/__tests__/factors.test.ts
git commit -m "feat(amenities): fatores de escopo (fallback) + fator de entorno"
```

---

## Task 6: Integrar fatores no engine

**Files:**
- Modify: `ValoraIA_back/src/lib/math/valuation-engine.ts`
- Test: `ValoraIA_back/src/lib/math/__tests__/engine-amenities.test.ts`

Remover `AMENITY_WEIGHTS`, `AMENITY_WEIGHT_DEFAULT`, `AMENITY_SCORE_BASE`, `computeAmenityScore`.
A função `computePriceFactors` deixa de receber `amenities: string[]`; a linha "Comodidades" do
radar passa a refletir `internalFactor*condoFactor`. O `runValuation` recebe
`amenities?: AmenitySelection[]` e `in_gated_community?: boolean`, calcula os 3 fatores e os
multiplica no `combinedFactor`.

- [ ] **Step 1: Escrever o teste de integração (falho)**

Create `ValoraIA_back/src/lib/math/__tests__/engine-amenities.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { applyScopeFactorsToCombined } from "@/lib/math/valuation-engine";

// Helper puro exportado do engine para isolar a multiplicação dos fatores de escopo.
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_back && npx vitest run src/lib/math/__tests__/engine-amenities.test.ts`
Expected: FAIL — `applyScopeFactorsToCombined` não exportado.

- [ ] **Step 3: Remover tabela antiga de amenities**

Modify `ValoraIA_back/src/lib/math/valuation-engine.ts` — apagar o bloco `// ─── Amenity weights ──` inteiro (linhas ~17–45: `AMENITY_WEIGHTS`, `AMENITY_WEIGHT_DEFAULT`, `AMENITY_SCORE_BASE`, `computeAmenityScore`).

- [ ] **Step 4: Adicionar imports e helper exportado**

Modify `ValoraIA_back/src/lib/math/valuation-engine.ts` — adicionar no topo (junto aos imports existentes):
```ts
import {
  computeScopeFactors, computeProximoFactor, type AmenitySelection,
} from "@/lib/amenities/factors";
```
E adicionar o helper puro (perto dos demais helpers de fator, ex. após `LEVEL_FACTORS`):
```ts
export function applyScopeFactorsToCombined(
  base: number,
  f: { internalFactor: number; condoFactor: number; proximoFactor: number }
): number {
  return Number((base * f.internalFactor * f.condoFactor * f.proximoFactor).toFixed(6));
}
```

- [ ] **Step 5: Ajustar `computePriceFactors`**

Modify `valuation-engine.ts` — trocar a assinatura e o cálculo da linha "Comodidades":
```ts
function computePriceFactors(
  candidates: WeightedCandidate[],
  targetArea: number,
  radiusUsed: number,
  amenityFactor: number,           // internalFactor*condoFactor
  neighborhoodScore?: number
): PriceFactor[] {
```
Remover `const amenityScore = computeAmenityScore(amenities);` e usar:
```ts
  const amenityScoreDisplay = clamp(amenityFactor, 0.5, 1.0);
```
Na lista de retorno, trocar a entrada de "Comodidades" para:
```ts
    { label: "Comodidades",    score: Number(amenityScoreDisplay.toFixed(2)) },
```

- [ ] **Step 6: Ajustar assinatura e corpo de `runValuation`**

Modify `valuation-engine.ts`:

Na assinatura/destruct (linhas ~427–435), trocar `amenities?: string[]` por:
```ts
export async function runValuation(
  req: ValuationRequest & {
    amenities?: AmenitySelection[];
    in_gated_community?: boolean;
    is_corner?: boolean;
    terrain_slope?: TerrainSlope;
    street_level?: StreetLevel;
  }
): Promise<ExtendedValuationResult> {
  const { lat, lng, target_area, target_bedrooms } = req;
  const amenities = req.amenities ?? [];
```

Após calcular `neighborhood` (linha ~537) e antes de `combinedFactor` ser aplicado, inserir:
```ts
  const scope = computeScopeFactors(amenities, req.in_gated_community ?? false);
  const proximoFactor = computeProximoFactor(neighborhood?.totalScore);
```
Modify a linha `const combinedFactor = cornerFactor * slopeFactor * levelFactor;` (~528) para
mover-se para depois do cálculo de `neighborhood`/`scope` e ficar:
```ts
  const physicalFactor = cornerFactor * slopeFactor * levelFactor;
  const combinedFactor = applyScopeFactorsToCombined(physicalFactor, {
    internalFactor: scope.internalFactor,
    condoFactor: scope.condoFactor,
    proximoFactor,
  });
```
> Atenção à ordem: hoje `combinedFactor` é calculado na linha ~528, antes do fetch de
> `neighborhood` (~537). Reordenar para que `neighborhood`/`scope`/`proximoFactor` sejam
> calculados **antes** de `combinedFactor`, e antes das linhas que usam `combinedFactor`
> (`adjustedEstimatedValue` etc, ~530-533).

- [ ] **Step 7: Atualizar chamada de `computePriceFactors` e retorno**

Modify `valuation-engine.ts` (~543):
```ts
  const priceFactors = computePriceFactors(
    candidates, target_area, radiusUsed,
    scope.internalFactor * scope.condoFactor,
    neighborhood?.totalScore
  );
```
Adicionar ao objeto de retorno e à interface `ExtendedValuationResult`:
```ts
  amenity_breakdown: scope.breakdown,
  amenity_factors: {
    internal: scope.internalFactor,
    condo: scope.condoFactor,
    proximo: proximoFactor,
  },
```
Na interface `ExtendedValuationResult` (após `price_per_m2_homogenized`):
```ts
  amenity_breakdown: import("@/lib/amenities/factors").ScopeContribution[];
  amenity_factors: { internal: number; condo: number; proximo: number };
```

- [ ] **Step 8: Rodar testes do engine**

Run: `cd ValoraIA_back && npx vitest run src/lib/math/__tests__/engine-amenities.test.ts`
Expected: PASS.

- [ ] **Step 9: Type-check do backend**

Run: `cd ValoraIA_back && npx tsc --noEmit`
Expected: sem erros (corrigir referências remanescentes a `amenities` string[] se houver).

- [ ] **Step 10: Commit**

Run:
```bash
cd ValoraIA_back && git add src/lib/math/valuation-engine.ts src/lib/math/__tests__/engine-amenities.test.ts
git commit -m "feat(engine): fatores de comodidade por escopo movem o preço"
```

---

## Task 7: Scraper persiste amenities + unit_type

**Files:**
- Modify: `ValoraIA_back/src/app/api/scrape/route.ts`
- Test: `ValoraIA_back/src/app/api/scrape/__tests__/amenities-map.test.ts`

Extrair função pura `buildListingAmenities(rawAmenities, propertyType, unitType)` →
`AmenitySelection[]` (mapeia via `mapZapAmenity` + `inferScope`, descarta nulos), testá-la, e usá-la
no upsert.

- [ ] **Step 1: Escrever o teste falho**

Create `ValoraIA_back/src/app/api/scrape/__tests__/amenities-map.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildListingAmenities } from "@/app/api/scrape/amenities-map";

describe("buildListingAmenities", () => {
  it("apartamento: piscina vira {piscina, condo}", () => {
    const out = buildListingAmenities(["Piscina", "Academia"], "apartment", "apartment");
    expect(out).toEqual([
      { item: "piscina", scope: "condo" },
      { item: "academia", scope: "condo" },
    ]);
  });

  it("casa isolada: piscina vira interno", () => {
    const out = buildListingAmenities(["Piscina"], "house", "home");
    expect(out).toEqual([{ item: "piscina", scope: "interno" }]);
  });

  it("descarta strings desconhecidas e escopos nulos", () => {
    const out = buildListingAmenities(["xpto", "Quintal"], "land", "land");
    expect(out).toEqual([]); // quintal só-interno não aplica a land; xpto não mapeia
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_back && npx vitest run src/app/api/scrape/__tests__/amenities-map.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar a função pura**

Create `ValoraIA_back/src/app/api/scrape/amenities-map.ts`:
```ts
import { mapZapAmenity } from "@/lib/amenities/catalog";
import { inferScope } from "@/lib/amenities/scope";
import type { AmenitySelection } from "@/lib/amenities/factors";
import type { PropertyType } from "@/types";

export function buildListingAmenities(
  raw: string[] | undefined,
  propertyType: PropertyType,
  unitType?: string | null
): AmenitySelection[] {
  if (!raw?.length) return [];
  const out: AmenitySelection[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const item = mapZapAmenity(r);
    if (!item || seen.has(item)) continue;
    const scope = inferScope(item, propertyType, unitType);
    if (!scope) continue;
    seen.add(item);
    out.push({ item, scope });
  }
  return out;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ValoraIA_back && npx vitest run src/app/api/scrape/__tests__/amenities-map.test.ts`
Expected: PASS.

- [ ] **Step 5: Usar no upsert**

Modify `ValoraIA_back/src/app/api/scrape/route.ts`:
- Importar no topo:
```ts
import { buildListingAmenities } from "./amenities-map";
```
- Antes do `db.from("listings").upsert(` (~234), capturar o `unit_type` cru e montar amenities. O
  `unit_type` vem de `item.attributes?.unit_types?.[0]`:
```ts
    const rawUnitType = item.attributes?.unit_types?.[0] ?? null;
    const listingAmenities = buildListingAmenities(
      item.attributes?.amenities, property_type, rawUnitType
    );
```
- No objeto do upsert, adicionar duas chaves (após `conservation_state`):
```ts
        unit_type: rawUnitType,
        amenities: listingAmenities,
```

- [ ] **Step 6: Type-check**

Run: `cd ValoraIA_back && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

Run:
```bash
cd ValoraIA_back && git add src/app/api/scrape/route.ts src/app/api/scrape/amenities-map.ts src/app/api/scrape/__tests__/amenities-map.test.ts
git commit -m "feat(scrape): persistir amenities com escopo + unit_type nos comparáveis"
```

---

## Task 8: API de avaliação aceita e persiste comodidades

**Files:**
- Modify: `ValoraIA_back/src/app/api/valuations/route.ts`
- Modify: `ValoraIA_back/src/types/index.ts`

- [ ] **Step 1: Tipos no backend**

Modify `ValoraIA_back/src/types/index.ts`:
- Adicionar (junto aos tipos de domínio):
```ts
export type AmenityScope = "interno" | "condo" | "proximo";
export interface AmenitySelectionDTO { item: string; scope: AmenityScope; }
```
- Em `comodidades_detectadas: string[];` deixar como está. Adicionar `amenities` e
  `in_gated_community` ao tipo do corpo de criação de avaliação (localizar a interface usada pela
  rota; se chamada `CreateValuationBody`):
```ts
  amenities?: AmenitySelectionDTO[];
  in_gated_community?: boolean;
```
- Adicionar ao tipo `ValuationRecord` (mapeia colunas):
```ts
  amenities: AmenitySelectionDTO[];
  in_gated_community: boolean;
```

- [ ] **Step 2: Ler o handler atual**

Run: `cd ValoraIA_back && sed -n '80,200p' src/app/api/valuations/route.ts`
Expected: ver onde o corpo é lido, onde `runValuation` é chamado e onde o insert em `valuations`
acontece (linhas ~100-180, já contém `neighborhood_pois`).

- [ ] **Step 3: Encaminhar ao engine e persistir**

Modify `ValoraIA_back/src/app/api/valuations/route.ts`:
- Ao montar a chamada de `runValuation`, repassar:
```ts
    amenities: body.amenities ?? [],
    in_gated_community: body.in_gated_community ?? false,
```
- No insert do registro `valuations`, adicionar as colunas:
```ts
    amenities: body.amenities ?? [],
    in_gated_community: body.in_gated_community ?? false,
```
(Manter `neighborhood_pois` e demais campos como estão.)

- [ ] **Step 4: Type-check**

Run: `cd ValoraIA_back && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

Run:
```bash
cd ValoraIA_back && git add src/app/api/valuations/route.ts src/types/index.ts
git commit -m "feat(api): valuations aceita e persiste amenities + in_gated_community"
```

---

## Task 9: Catálogo espelho no frontend + tipos

**Files:**
- Create: `ValoraIA_front/src/amenities.ts`
- Modify: `ValoraIA_front/src/types/index.ts`
- Test: `ValoraIA_front/src/__tests__/amenities.test.ts`

- [ ] **Step 1: Tipos no frontend**

Modify `ValoraIA_front/src/types/index.ts`:
```ts
export type AmenityScope = 'interno' | 'condo' | 'proximo'
export interface AmenitySelection { item: string; scope: AmenityScope }
```
- Em `ValuationForm`, adicionar:
```ts
  amenities: AmenitySelection[]
  in_gated_community: boolean
```
- Em `CreateValuationBody`, adicionar:
```ts
  amenities?: AmenitySelection[]
  in_gated_community?: boolean
```
- Em `ValuationRecord`, adicionar:
```ts
  amenities: AmenitySelection[]
  in_gated_community: boolean
```

- [ ] **Step 2: Escrever o teste falho do espelho**

Create `ValoraIA_front/src/__tests__/amenities.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { FRONT_CATALOG, itemsForScope } from '../amenities'

describe('FRONT_CATALOG', () => {
  it('piscina está em interno e condo', () => {
    expect(FRONT_CATALOG.piscina.scopes).toContain('interno')
    expect(FRONT_CATALOG.piscina.scopes).toContain('condo')
  })
  it('itemsForScope("interno") inclui quintal e exclui portaria_24h', () => {
    const ids = itemsForScope('interno').map(i => i.id)
    expect(ids).toContain('quintal')
    expect(ids).not.toContain('portaria_24h')
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd ValoraIA_front && npx vitest run src/__tests__/amenities.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar o espelho**

Create `ValoraIA_front/src/amenities.ts`:
```ts
import type { AmenityScope } from './types'

export interface FrontCatalogEntry {
  label: string
  cat: 'lazer' | 'espaco' | 'conforto' | 'seguranca' | 'infra'
  scopes: AmenityScope[]
}

// Espelho dos itens "selecionáveis pelo usuário" (interno/condo) do catálogo backend.
// Itens só-proximo (POI) NÃO entram aqui — vêm automáticos da vizinhança.
export const FRONT_CATALOG: Record<string, FrontCatalogEntry> = {
  piscina:          { label: 'Piscina',               cat: 'lazer',     scopes: ['interno', 'condo'] },
  academia:         { label: 'Academia',              cat: 'lazer',     scopes: ['interno', 'condo'] },
  churrasqueira:    { label: 'Churrasqueira / Gourmet', cat: 'lazer',   scopes: ['interno', 'condo'] },
  salao_festas:     { label: 'Salão de festas',       cat: 'lazer',     scopes: ['condo'] },
  salao_jogos:      { label: 'Salão de jogos',        cat: 'lazer',     scopes: ['condo'] },
  playground:       { label: 'Playground',            cat: 'lazer',     scopes: ['condo'] },
  espaco_kids:      { label: 'Espaço kids',           cat: 'lazer',     scopes: ['condo'] },
  quadra:           { label: 'Quadra esportiva',      cat: 'lazer',     scopes: ['interno', 'condo'] },
  sauna:            { label: 'Sauna',                 cat: 'lazer',     scopes: ['interno', 'condo'] },
  espaco_pet:       { label: 'Espaço pet',            cat: 'lazer',     scopes: ['condo'] },
  quintal:          { label: 'Quintal',               cat: 'espaco',    scopes: ['interno'] },
  jardim:           { label: 'Jardim',                cat: 'espaco',    scopes: ['interno', 'condo'] },
  varanda:          { label: 'Varanda / Sacada',      cat: 'conforto',  scopes: ['interno'] },
  vista_mar:        { label: 'Vista mar',             cat: 'conforto',  scopes: ['interno'] },
  cobertura:        { label: 'Cobertura / Rooftop',   cat: 'conforto',  scopes: ['interno', 'condo'] },
  ar_condicionado:  { label: 'Ar condicionado',       cat: 'conforto',  scopes: ['interno'] },
  armarios:         { label: 'Armários planejados',   cat: 'conforto',  scopes: ['interno'] },
  mobiliado:        { label: 'Mobiliado',             cat: 'conforto',  scopes: ['interno'] },
  lareira:          { label: 'Lareira',               cat: 'conforto',  scopes: ['interno'] },
  portaria_24h:     { label: 'Portaria 24h',          cat: 'seguranca', scopes: ['condo'] },
  seguranca_24h:    { label: 'Segurança 24h',         cat: 'seguranca', scopes: ['condo'] },
  portao_eletronico:{ label: 'Portão eletrônico',     cat: 'seguranca', scopes: ['interno', 'condo'] },
  cameras:          { label: 'Câmeras de segurança',  cat: 'seguranca', scopes: ['interno', 'condo'] },
  elevador:         { label: 'Elevador',              cat: 'infra',     scopes: ['condo'] },
  gerador:          { label: 'Gerador',               cat: 'infra',     scopes: ['condo'] },
  coworking:        { label: 'Coworking',             cat: 'infra',     scopes: ['condo'] },
  lavanderia:       { label: 'Lavanderia',            cat: 'infra',     scopes: ['condo'] },
}

export function itemsForScope(scope: AmenityScope): Array<{ id: string } & FrontCatalogEntry> {
  return Object.entries(FRONT_CATALOG)
    .filter(([, e]) => e.scopes.includes(scope))
    .map(([id, e]) => ({ id, ...e }))
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd ValoraIA_front && npx vitest run src/__tests__/amenities.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Run:
```bash
cd ValoraIA_front && git add src/amenities.ts src/types/index.ts src/__tests__/amenities.test.ts
git commit -m "feat(front): catálogo espelho de comodidades + tipos"
```

---

## Task 10: UI de captura segmentada por escopo

**Files:**
- Modify: `ValoraIA_front/src/components/ValuationFlow.tsx`
- Modify: `ValoraIA_front/src/__tests__/ValuationFlow.test.tsx`

Adicionar uma seção "Comodidades & Diferenciais" no passo 0 (Detalhes), abaixo de "Imóvel de
esquina". Subseções:
- **Interno do imóvel** — chips de `itemsForScope('interno')`. Sempre visível (exceto `land`).
- **Do condomínio** — chips de `itemsForScope('condo')`. Visível se `apartment`, ou se
  `in_gated_community` marcado (checkbox novo "Imóvel em condomínio fechado") para `house`/`commercial`.
  Oculto para `land`.
- **Próximo** — nota read-only: "Detectado automaticamente pela localização (não editável)".

Também: remover `STEPS_BY_TYPE` morto e decoplar a copy "+5%".

- [ ] **Step 1: Inicializar form e imports**

Modify `ValuationFlow.tsx`:
- Importar:
```tsx
import { itemsForScope } from '../amenities'
import type { AmenityScope, AmenitySelection } from '../types'
```
- No estado inicial do `form` adicionar:
```tsx
    amenities: [] as AmenitySelection[],
    in_gated_community: false,
```

- [ ] **Step 2: Helpers de toggle + condo visível**

Modify `ValuationFlow.tsx` — adicionar dentro do componente (antes do `return`):
```tsx
  const hasAmenity = (item: string, scope: AmenityScope) =>
    form.amenities.some(a => a.item === item && a.scope === scope)

  const toggleAmenity = (item: string, scope: AmenityScope) =>
    setForm(f => ({
      ...f,
      amenities: hasAmenityIn(f.amenities, item, scope)
        ? f.amenities.filter(a => !(a.item === item && a.scope === scope))
        : [...f.amenities, { item, scope }],
    }))

  const condoVisible =
    form.propertyType === 'apartment' ||
    ((form.propertyType === 'house' || form.propertyType === 'commercial') && form.in_gated_community)

  const internoVisible = form.propertyType !== 'land'
```
E o helper puro fora do componente (topo do arquivo):
```tsx
function hasAmenityIn(list: AmenitySelection[], item: string, scope: AmenityScope) {
  return list.some(a => a.item === item && a.scope === scope)
}
```

- [ ] **Step 3: Renderizar a seção**

Modify `ValuationFlow.tsx` — após o bloco do checkbox `is_corner` (dentro do `step === 0`),
inserir:
```tsx
            {/* Comodidades & Diferenciais */}
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                Comodidades & Diferenciais
              </label>

              {(form.propertyType === 'house' || form.propertyType === 'commercial') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    id="in_gated"
                    checked={form.in_gated_community}
                    onChange={e => setForm(f => ({ ...f, in_gated_community: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="in_gated" style={{ fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                    Imóvel em condomínio fechado
                  </label>
                </div>
              )}

              {internoVisible && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Do imóvel</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {itemsForScope('interno').map(a => (
                      <button key={`int-${a.id}`} type="button"
                        onClick={() => toggleAmenity(a.id, 'interno')}
                        style={pillStyle(hasAmenity(a.id, 'interno'))}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {condoVisible && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Do condomínio</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {itemsForScope('condo').map(a => (
                      <button key={`con-${a.id}`} type="button"
                        onClick={() => toggleAmenity(a.id, 'condo')}
                        style={pillStyle(hasAmenity(a.id, 'condo'))}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                Comodidades próximas (entorno) são detectadas automaticamente pela localização.
              </p>
            </div>
```

- [ ] **Step 4: Enviar no submit**

Modify `ValuationFlow.tsx` — no `createValuation({...})` dentro de `handleSubmit`, adicionar:
```tsx
        amenities: form.amenities,
        in_gated_community: form.in_gated_community || undefined,
```

- [ ] **Step 5: Limpar comodidades de condo ao desmarcar / trocar tipo**

Modify `handlePropertyTypeChange` para zerar seleções inválidas:
```tsx
  const handlePropertyTypeChange = (value: PropertyType) => {
    setForm(f => ({
      ...f,
      propertyType: value,
      amenities: value === 'land' ? [] : f.amenities,
      in_gated_community: value === 'apartment' ? false : f.in_gated_community,
    }))
    setStep(s => Math.min(s, STEPS.length - 1))
  }
```

- [ ] **Step 6: Remover `STEPS_BY_TYPE` morto e decoplar copy**

Modify `ValuationFlow.tsx`:
- Apagar a const `STEPS_BY_TYPE`. Substituir usos por `STEPS` direto: `const steps = STEPS`.
- Trocar o label do checkbox de esquina de `Imóvel de esquina (fator +5%)` para
  `Imóvel de esquina`.

- [ ] **Step 7: Atualizar/!escrever teste**

Modify `ValoraIA_front/src/__tests__/ValuationFlow.test.tsx` — adicionar caso:
```tsx
it('mostra comodidades de condomínio para apartamento e oculta para casa sem flag', async () => {
  render(<MemoryRouter><ValuationFlow /></MemoryRouter>)
  // apartment é default → "Do condomínio" visível
  expect(screen.getByText('Do condomínio')).toBeInTheDocument()
  // troca para Casa → some
  fireEvent.click(screen.getByText('Casa'))
  expect(screen.queryByText('Do condomínio')).not.toBeInTheDocument()
  // marca condomínio fechado → reaparece
  fireEvent.click(screen.getByLabelText('Imóvel em condomínio fechado'))
  expect(screen.getByText('Do condomínio')).toBeInTheDocument()
})
```
(Importar `fireEvent`, `screen`, `MemoryRouter` conforme o topo do arquivo de teste já faz; se
faltar `fireEvent`, adicioná-lo ao import de `@testing-library/react`.)

- [ ] **Step 8: Rodar testes do front**

Run: `cd ValoraIA_front && npx vitest run src/__tests__/ValuationFlow.test.tsx`
Expected: PASS (ajustar asserts antigos que dependiam do texto "(fator +5%)").

- [ ] **Step 9: Type-check + commit**

Run:
```bash
cd ValoraIA_front && npx tsc -b --noEmit
git add src/components/ValuationFlow.tsx src/__tests__/ValuationFlow.test.tsx
git commit -m "feat(front): captura de comodidades segmentada por escopo + fixes de fluxo"
```

---

## Task 11: Relatório mostra contribuição por escopo

**Files:**
- Modify: `ValoraIA_front/src/components/Report.tsx`
- Modify: `ValoraIA_front/src/types/index.ts`
- Modify: `ValoraIA_front/src/__tests__/Report.test.tsx`

- [ ] **Step 1: Tipos do retorno estendido**

Modify `ValoraIA_front/src/types/index.ts` — em `ValuationRecord` (ou no tipo do payload de
relatório consumido pelo `Report`), adicionar:
```ts
  amenity_factors?: { internal: number; condo: number; proximo: number }
  amenity_breakdown?: { scope: AmenityScope; item: string; contribution: number; derived: boolean }[]
```
> Confirmar que `valuations/[id]/route.ts` devolve esses campos. Se hoje devolve só colunas da
> tabela, derivar `amenity_factors`/`amenity_breakdown` a partir do `amenities` persistido +
> `computeScopeFactors` no GET, ou persistir no insert (Task 8) em coluna jsonb extra. Decisão de
> implementação: persistir `amenity_factors` dentro de um jsonb de metadados já existente
> (`comparables`/`neighborhood_pois` são jsonb) ou adicionar leitura. Mínimo viável: exibir a partir
> de `amenities` agrupado por escopo.

- [ ] **Step 2: Escrever/!ajustar teste**

Modify `ValoraIA_front/src/__tests__/Report.test.tsx` — adicionar (usando o mock de
`ValuationRecord` já existente no arquivo, acrescentando `amenities`):
```tsx
it('agrupa comodidades por escopo no relatório', () => {
  const rec = { ...baseRecord, amenities: [
    { item: 'piscina', scope: 'condo' }, { item: 'quintal', scope: 'interno' },
  ] }
  renderReport(rec)
  expect(screen.getByText('Diferencial do Imóvel')).toBeInTheDocument()
  expect(screen.getByText('Infra do Condomínio')).toBeInTheDocument()
})
```
(`baseRecord`/`renderReport` conforme helpers já presentes no arquivo de teste; se nomes diferem,
usar os equivalentes existentes.)

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd ValoraIA_front && npx vitest run src/__tests__/Report.test.tsx`
Expected: FAIL — textos ausentes.

- [ ] **Step 4: Implementar a seção**

Modify `ValoraIA_front/src/components/Report.tsx` — adicionar um bloco que agrupa
`record.amenities` por escopo e renderiza, usando o catálogo espelho para labels:
```tsx
import { FRONT_CATALOG } from '../amenities'
// ...
const SCOPE_TITLES: Record<string, string> = {
  interno: 'Diferencial do Imóvel',
  condo: 'Infra do Condomínio',
  proximo: 'Entorno',
}
function AmenityScopes({ amenities }: { amenities?: { item: string; scope: string }[] }) {
  if (!amenities?.length) return null
  const byScope: Record<string, string[]> = {}
  for (const a of amenities) {
    const label = FRONT_CATALOG[a.item]?.label ?? a.item
    ;(byScope[a.scope] ??= []).push(label)
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['interno', 'condo', 'proximo'] as const).map(s =>
        byScope[s]?.length ? (
          <div key={s}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              {SCOPE_TITLES[s]}
            </div>
            <div style={{ fontSize: 13, color: '#334155' }}>{byScope[s].join(' · ')}</div>
          </div>
        ) : null
      )}
    </div>
  )
}
```
E inserir `<AmenityScopes amenities={record.amenities} />` numa seção apropriada do relatório
(perto de comparáveis/vizinhança).

- [ ] **Step 5: Rodar e ver passar**

Run: `cd ValoraIA_front && npx vitest run src/__tests__/Report.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check + commit**

Run:
```bash
cd ValoraIA_front && npx tsc -b --noEmit
git add src/components/Report.tsx src/types/index.ts src/__tests__/Report.test.tsx
git commit -m "feat(front): relatório agrupa comodidades por escopo"
```

---

## Task 12: Sugestão de IA/scrape confirmável (pré-preenchimento)

**Files:**
- Modify: `ValoraIA_front/src/components/ValuationFlow.tsx`
- Modify: `ValoraIA_front/src/__tests__/ValuationFlow.test.tsx`

Após `analyzePhotos` (no `advanceFromPhotoStep`), mapear `comodidades_detectadas` para itens do
catálogo e marcá-los como **sugestões** (não confirmadas). Renderizar chips de sugestão com visual
distinto; clique confirma (vira seleção real).

- [ ] **Step 1: Estado de sugestões**

Modify `ValuationFlow.tsx` — adicionar:
```tsx
  const [suggested, setSuggested] = useState<AmenitySelection[]>([])
```

- [ ] **Step 2: Mapear sugestões da IA**

Modify `advanceFromPhotoStep` — após obter `analysis`, mapear comodidades detectadas para o escopo
default por tipo (apartment→condo, house→interno):
```tsx
        const defScope: AmenityScope =
          form.propertyType === 'apartment' ? 'condo' : 'interno'
        const sugg = (analysis.comodidades_detectadas ?? [])
          .map(c => mapLabelToItem(c))
          .filter((id): id is string => !!id && !hasAmenityIn(form.amenities, id, defScope))
          .map(id => ({ item: id, scope: defScope }))
        setSuggested(sugg)
```
Adicionar helper puro (topo do arquivo) que casa label↔id via `FRONT_CATALOG`:
```tsx
import { FRONT_CATALOG } from '../amenities'
function mapLabelToItem(label: string): string | null {
  const n = label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const hit = Object.entries(FRONT_CATALOG).find(
    ([, e]) => e.label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(n)
  )
  return hit ? hit[0] : null
}
```

- [ ] **Step 3: Renderizar chips de sugestão no passo de revisão**

Modify `ValuationFlow.tsx` — no `isReviewStep`, antes do grid de revisão, se `suggested.length`:
```tsx
            {suggested.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#15803D', marginBottom: 8 }}>
                  Sugestões da IA — clique para confirmar
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {suggested.map(s => (
                    <button key={`sug-${s.item}`} type="button"
                      onClick={() => {
                        toggleAmenity(s.item, s.scope)
                        setSuggested(list => list.filter(x => x.item !== s.item))
                      }}
                      style={pillStyle(false)}>
                      + {FRONT_CATALOG[s.item]?.label ?? s.item}
                    </button>
                  ))}
                </div>
              </div>
            )}
```

- [ ] **Step 4: Teste**

Modify `ValuationFlow.test.tsx` — adicionar teste com `analyzePhotos` mockado retornando
`comodidades_detectadas: ['Piscina']`, avançar até revisão, e verificar que o chip de sugestão
aparece e que clicar adiciona à seleção. (Seguir o padrão de mock de `api` já usado no arquivo.)

- [ ] **Step 5: Rodar + type-check + commit**

Run:
```bash
cd ValoraIA_front && npx vitest run src/__tests__/ValuationFlow.test.tsx && npx tsc -b --noEmit
git add src/components/ValuationFlow.tsx src/__tests__/ValuationFlow.test.tsx
git commit -m "feat(front): sugestão de comodidades da IA confirmável"
```

---

## Task 13: Atualizar documentação e rodar suíte completa

**Files:**
- Modify: `COMO_FUNCIONA_AVALIACAO.md`

- [ ] **Step 1: Corrigir a afirmação obsoleta**

Modify `COMO_FUNCIONA_AVALIACAO.md` (~linha 242) — substituir o aviso de que "Comodidades e
Vizinhança são fatores do radar chart — não entram diretamente no cálculo" por:
```md
> **Comodidades por escopo:** comodidades internas do imóvel e do condomínio entram no preço como
> fatores multiplicativos de homogeneização (interno, condo), classificados por escopo hierárquico.
> O entorno (próximo) entra como fator delta-only fraco sobre o baseline de vizinhança, para não
> duplicar o valor locacional já embutido nos comparáveis. Cada fator respeita o intervalo NBR
> [0,50; 2,00] e tetos de saneamento (interno ±25%, condo ±15%, próximo ±5%). Na Fase 1 o peso vem
> de tabela de referência (Grau I); a Fase 2 deriva o fator da própria amostra.
```

- [ ] **Step 2: Rodar suíte completa dos dois pacotes**

Run:
```bash
cd ValoraIA_back && npm test
cd ../ValoraIA_front && npx vitest run
```
Expected: ambos verdes.

- [ ] **Step 3: Type-check final**

Run:
```bash
cd ValoraIA_back && npx tsc --noEmit
cd ../ValoraIA_front && npx tsc -b --noEmit
```
Expected: sem erros.

- [ ] **Step 4: Commit**

Run:
```bash
git add COMO_FUNCIONA_AVALIACAO.md
git commit -m "docs: comodidades por escopo movem o preço (atualiza metodologia)"
```

---

## Pós-implementação (ação manual do usuário)

1. Executar `migrations/2026-06-10_amenities.sql` no Supabase (SQL editor).
2. Rodar o scraper para começar a acumular `amenities`/`unit_type` nos comparáveis (necessário para
   a Fase 2 — derivação da amostra).

## Notas para Fase 2 (plano futuro, fora deste plano)

- Criar `src/lib/amenities/derive.ts`: pareamento scope-aware sobre `listings.amenities` para
  estimar o fator real por item×escopo; bound [0,50; 2,00]; mínimo 5 pares; fallback ao catálogo.
- `computeScopeFactors` passa a aceitar a amostra e marcar `derived:true` quando deriva.
- Relatório expõe origem (`derived`/`fallback`) e nº de pares por fator.
