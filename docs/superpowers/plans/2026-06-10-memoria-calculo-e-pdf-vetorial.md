# Memória de Cálculo + PDF Vetorial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao relatório de avaliação um card "Como Chegamos a Este Valor" (value waterfall com legendas) e substituir o `window.print()` por exportação PDF vetorial estruturada, ambos alimentados por fatores de homogeneização persistidos no backend.

**Architecture:** Backend monta e persiste um jsonb `homogenization_factors` (todos os valores já existem no retorno de `runValuation`); frontend lê esse objeto, renderiza um componente `<ValueWaterfall>` na nova seção 02b do `Report`, e gera um documento `LaudoPDF` via `@react-pdf/renderer` para download. A cascata parte do ppm² do ensemble e empilha só os fatores pós-ensemble (físicos, comodidades); oferta/tipologia entram como contexto na legenda.

**Tech Stack:** TypeScript, Next.js (versão custom — ver `node_modules/next/dist/docs/`), Supabase/Postgres (jsonb), Vitest, React + Vite, `@react-pdf/renderer`.

**Spec:** `docs/superpowers/specs/2026-06-10-memoria-calculo-e-pdf-vetorial-design.md`

---

## File Structure

**Backend (`ValoraIA_back/`):**
- Create `migrations/2026-06-11_homogenization_factors.sql` — DDL (execução manual no Supabase).
- Modify `src/lib/math/valuation-engine.ts` — montar `homogenization_factors` no retorno + interface.
- Modify `src/types/index.ts` — tipo `HomogenizationFactors` + campo em `ValuationRecord`.
- Modify `src/app/api/valuations/route.ts` — persistir no insert + incluir no `ValuationRecord` retornado.
- Modify `src/app/api/valuations/[id]/route.ts` — ler a coluna no mapeamento.
- Test `src/lib/math/__tests__/engine-homogenization.test.ts`.

**Frontend (`ValoraIA_front/`):**
- Modify `src/types/index.ts` — tipo `HomogenizationFactors` + campo em `ValuationRecord`.
- Create `src/components/ValueWaterfall.tsx` — helper puro `buildWaterfallRows` + componente visual.
- Modify `src/components/Report.tsx` — seção 02b + botão de download PDF (remove `window.print`).
- Create `src/components/LaudoPDF.tsx` — documento `@react-pdf/renderer`.
- Modify `package.json` — dependência `@react-pdf/renderer`.
- Test `src/__tests__/ValueWaterfall.test.tsx`, `src/__tests__/LaudoPDF.test.tsx`.

---

## Task 1: Migration SQL (execução manual)

**Files:**
- Create: `ValoraIA_back/migrations/2026-06-11_homogenization_factors.sql`

> Entregue para execução **manual** no Supabase pelo usuário. Não executar via código.

- [ ] **Step 1: Escrever o DDL**

Create `ValoraIA_back/migrations/2026-06-11_homogenization_factors.sql`:
```sql
-- Memória de cálculo: persistir os fatores de homogeneização aplicados.
ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS homogenization_factors jsonb;

-- Verificação:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'valuations' AND column_name = 'homogenization_factors';
```

- [ ] **Step 2: Commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_back/migrations/2026-06-11_homogenization_factors.sql
git commit -m "feat(db): coluna homogenization_factors em valuations"
```

---

## Task 2: Engine monta `homogenization_factors`

**Files:**
- Modify: `ValoraIA_back/src/lib/math/valuation-engine.ts`
- Test: `ValoraIA_back/src/lib/math/__tests__/engine-homogenization.test.ts`

Contexto: em `runValuation` (linhas ~519-533) já existem `finalPpm2`, `OFFER_FACTOR`, `typologyFactorUsed`, `cornerFactor`, `slopeFactor`, `levelFactor`, `physicalFactor`, `combinedFactor`, `pricePerM2Homogenized`, `target_area`, `adjustedEstimatedValue`, `scope.internalFactor`, `scope.condoFactor`, `proximoFactor`. A interface `ExtendedValuationResult` está na linha ~394.

- [ ] **Step 1: Escrever o teste de integração (falho)**

Create `ValoraIA_back/src/lib/math/__tests__/engine-homogenization.test.ts`:
```ts
import { describe, it, expect } from "vitest";
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npx vitest run src/lib/math/__tests__/engine-homogenization.test.ts`
Expected: FAIL — `buildHomogenizationFactors` não exportado.

- [ ] **Step 3: Adicionar a interface e o helper exportado**

Modify `ValoraIA_back/src/lib/math/valuation-engine.ts` — adicionar a interface (perto de `ExtendedValuationResult`, antes dela):
```ts
export interface HomogenizationFactors {
  ensemble_ppm2: number;
  offer_factor: number;
  typology_factor: number;
  corner_factor: number;
  slope_factor: number;
  level_factor: number;
  physical_factor: number;
  amenity_internal: number;
  amenity_condo: number;
  amenity_proximo: number;
  amenity_factor: number;
  combined_factor: number;
  ppm2_homogenized: number;
  area_m2: number;
  market_value: number;
}
```
E adicionar o helper puro (perto dos outros helpers de fator, ex. após `applyScopeFactorsToCombined`):
```ts
export function buildHomogenizationFactors(p: {
  ensemblePpm2: number;
  offerFactor: number;
  typologyFactor: number;
  cornerFactor: number;
  slopeFactor: number;
  levelFactor: number;
  internalFactor: number;
  condoFactor: number;
  proximoFactor: number;
  areaM2: number;
}): HomogenizationFactors {
  const physical = p.cornerFactor * p.slopeFactor * p.levelFactor;
  const amenity = p.internalFactor * p.condoFactor * p.proximoFactor;
  const combined = physical * amenity;
  const ppm2Homog = p.ensemblePpm2 * combined;
  const round = (v: number, d = 6) => Number(v.toFixed(d));
  return {
    ensemble_ppm2: round(p.ensemblePpm2, 2),
    offer_factor: round(p.offerFactor),
    typology_factor: round(p.typologyFactor),
    corner_factor: round(p.cornerFactor),
    slope_factor: round(p.slopeFactor),
    level_factor: round(p.levelFactor),
    physical_factor: round(physical),
    amenity_internal: round(p.internalFactor),
    amenity_condo: round(p.condoFactor),
    amenity_proximo: round(p.proximoFactor),
    amenity_factor: round(amenity),
    combined_factor: round(combined),
    ppm2_homogenized: round(ppm2Homog, 2),
    area_m2: round(p.areaM2, 2),
    market_value: round(ppm2Homog * p.areaM2, 2),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npx vitest run src/lib/math/__tests__/engine-homogenization.test.ts`
Expected: PASS.

- [ ] **Step 5: Adicionar `homogenization_factors` ao tipo de retorno e ao objeto retornado**

Modify `ValoraIA_back/src/lib/math/valuation-engine.ts`:
- Na interface `ExtendedValuationResult` (após `amenity_factors`):
```ts
  homogenization_factors: HomogenizationFactors;
```
- No objeto de retorno de `runValuation` (após o bloco `amenity_factors: { ... }`, linhas ~565-569), adicionar:
```ts
    homogenization_factors: buildHomogenizationFactors({
      ensemblePpm2: finalPpm2,
      offerFactor: OFFER_FACTOR,
      typologyFactor: typologyFactorUsed,
      cornerFactor,
      slopeFactor,
      levelFactor,
      internalFactor: scope.internalFactor,
      condoFactor: scope.condoFactor,
      proximoFactor,
      areaM2: target_area,
    }),
```

- [ ] **Step 6: Type-check + suíte do engine**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npx tsc --noEmit && npx vitest run`
Expected: sem erros; todos os testes verdes.

- [ ] **Step 7: Commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_back/src/lib/math/valuation-engine.ts ValoraIA_back/src/lib/math/__tests__/engine-homogenization.test.ts
git commit -m "feat(engine): monta homogenization_factors no retorno"
```

---

## Task 3: Tipo `HomogenizationFactors` no backend + `ValuationRecord`

**Files:**
- Modify: `ValoraIA_back/src/types/index.ts`

- [ ] **Step 1: Adicionar a interface**

Modify `ValoraIA_back/src/types/index.ts` — adicionar antes de `export interface ValuationRecord {` (linha ~179):
```ts
export interface HomogenizationFactors {
  ensemble_ppm2: number;
  offer_factor: number;
  typology_factor: number;
  corner_factor: number;
  slope_factor: number;
  level_factor: number;
  physical_factor: number;
  amenity_internal: number;
  amenity_condo: number;
  amenity_proximo: number;
  amenity_factor: number;
  combined_factor: number;
  ppm2_homogenized: number;
  area_m2: number;
  market_value: number;
}
```

- [ ] **Step 2: Adicionar o campo a `ValuationRecord`**

Modify `ValoraIA_back/src/types/index.ts` — em `ValuationRecord`, na seção `// Report metadata` (após `neighborhood_pois`, antes de `created_at`):
```ts
  homogenization_factors: HomogenizationFactors | null;
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npx tsc --noEmit`
Expected: erros esperados em `valuations/route.ts` e `[id]/route.ts` (campo obrigatório ainda não preenchido) — serão corrigidos na Task 4. Se aparecerem, prosseguir para Task 4 e re-checar lá.

- [ ] **Step 4: Commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_back/src/types/index.ts
git commit -m "feat(types): HomogenizationFactors + campo em ValuationRecord (back)"
```

---

## Task 4: Persistir no POST e ler no GET

**Files:**
- Modify: `ValoraIA_back/src/app/api/valuations/route.ts`
- Modify: `ValoraIA_back/src/app/api/valuations/[id]/route.ts`

- [ ] **Step 1: Extrair do `engineResult` no POST**

Modify `ValoraIA_back/src/app/api/valuations/route.ts` — no destruct do `engineResult` (linhas ~107-113), adicionar `homogenization_factors`:
```ts
  const {
    estimated_value,
    price_per_m2_homogenized,
    confidence_score,
    frontend_comparables,
    neighborhood_pois,
    homogenization_factors,
  } = engineResult;
```

- [ ] **Step 2: Persistir no insert**

Modify o objeto do `.insert({ ... })` (após `in_gated_community: in_gated_community ?? false,`, linha ~153):
```ts
      homogenization_factors,
```

- [ ] **Step 3: Incluir no `ValuationRecord` retornado**

Modify o objeto `result: ValuationRecord` (após `in_gated_community: in_gated_community ?? false,`, antes de `created_at`, linha ~191):
```ts
    homogenization_factors,
```

- [ ] **Step 4: Ler no GET**

Modify `ValoraIA_back/src/app/api/valuations/[id]/route.ts` — no objeto `record: ValuationRecord` (após `in_gated_community: data.in_gated_community ?? false,`, linha ~50):
```ts
    homogenization_factors: data.homogenization_factors ?? null,
```

- [ ] **Step 5: Type-check**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Suíte completa do backend**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npm test`
Expected: todos verdes.

- [ ] **Step 7: Commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_back/src/app/api/valuations/route.ts "ValoraIA_back/src/app/api/valuations/[id]/route.ts"
git commit -m "feat(api): persiste e lê homogenization_factors"
```

---

## Task 5: Tipo `HomogenizationFactors` no frontend

**Files:**
- Modify: `ValoraIA_front/src/types/index.ts`

- [ ] **Step 1: Adicionar a interface**

Modify `ValoraIA_front/src/types/index.ts` — adicionar antes de `export interface ValuationRecord {` (linha ~98):
```ts
export interface HomogenizationFactors {
  ensemble_ppm2: number
  offer_factor: number
  typology_factor: number
  corner_factor: number
  slope_factor: number
  level_factor: number
  physical_factor: number
  amenity_internal: number
  amenity_condo: number
  amenity_proximo: number
  amenity_factor: number
  combined_factor: number
  ppm2_homogenized: number
  area_m2: number
  market_value: number
}
```

- [ ] **Step 2: Adicionar o campo a `ValuationRecord`**

Modify `ValoraIA_front/src/types/index.ts` — em `ValuationRecord`, após `amenity_breakdown?: ...` (linha ~129):
```ts
  homogenization_factors?: HomogenizationFactors | null
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_front/src/types/index.ts
git commit -m "feat(types): HomogenizationFactors em ValuationRecord (front)"
```

---

## Task 6: Componente `<ValueWaterfall>` (helper + visual)

**Files:**
- Create: `ValoraIA_front/src/components/ValueWaterfall.tsx`
- Test: `ValoraIA_front/src/__tests__/ValueWaterfall.test.tsx`

A cascata: base = `ensemble_ppm2`; passo "físicos" × `physical_factor`; passo "comodidades" × `amenity_factor`; resultado = `ppm2_homogenized`; depois × área = `market_value`. Helper puro `buildWaterfallRows` retorna os passos com valor acumulado e flag `neutral` (multiplicador == 1).

- [ ] **Step 1: Escrever o teste falho**

Create `ValoraIA_front/src/__tests__/ValueWaterfall.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ValueWaterfall, { buildWaterfallRows } from '../components/ValueWaterfall'
import type { HomogenizationFactors } from '../types'

const hf: HomogenizationFactors = {
  ensemble_ppm2: 5000,
  offer_factor: 0.9,
  typology_factor: 1.02,
  corner_factor: 1.05,
  slope_factor: 1.0,
  level_factor: 1.0,
  physical_factor: 1.05,
  amenity_internal: 1.06,
  amenity_condo: 1.0,
  amenity_proximo: 1.0,
  amenity_factor: 1.06,
  combined_factor: 1.113,
  ppm2_homogenized: 5565,
  area_m2: 100,
  market_value: 556500,
}

describe('buildWaterfallRows', () => {
  it('acumula até o ppm² homogeneizado', () => {
    const rows = buildWaterfallRows(hf)
    const last = rows[rows.length - 1]
    expect(last.runningPpm2).toBeCloseTo(hf.ppm2_homogenized, 2)
  })

  it('marca passo neutro quando multiplicador é 1', () => {
    const neutralHf = { ...hf, amenity_factor: 1.0 }
    const rows = buildWaterfallRows(neutralHf)
    const amenityRow = rows.find(r => r.key === 'amenity')!
    expect(amenityRow.neutral).toBe(true)
  })
})

describe('<ValueWaterfall>', () => {
  it('renderiza título e valor de mercado final', () => {
    render(<ValueWaterfall factors={hf} />)
    expect(screen.getByText(/Como Chegamos a Este Valor/i)).toBeInTheDocument()
    expect(screen.getByText(/556\.500/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx vitest run src/__tests__/ValueWaterfall.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar o componente**

Create `ValoraIA_front/src/components/ValueWaterfall.tsx`:
```tsx
import type { HomogenizationFactors } from '../types'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPpm2 = (v: number) => fmtBRL(Math.round(v)) + '/m²'
const fmtMult = (v: number) => '× ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface WaterfallRow {
  key: 'physical' | 'amenity'
  label: string
  multiplier: number
  runningPpm2: number
  sub: string
  caption?: string
  neutral: boolean
}

export function buildWaterfallRows(f: HomogenizationFactors): WaterfallRow[] {
  const afterPhysical = f.ensemble_ppm2 * f.physical_factor
  const afterAmenity = afterPhysical * f.amenity_factor
  return [
    {
      key: 'physical',
      label: 'Fatores físicos',
      multiplier: f.physical_factor,
      runningPpm2: afterPhysical,
      sub: `Esquina ${f.corner_factor.toFixed(2)} · Topografia ${f.slope_factor.toFixed(2)} · Nível ${f.level_factor.toFixed(2)}`,
      neutral: f.physical_factor === 1,
    },
    {
      key: 'amenity',
      label: 'Comodidades por escopo',
      multiplier: f.amenity_factor,
      runningPpm2: afterAmenity,
      sub: `Interno ${f.amenity_internal.toFixed(2)} · Condomínio ${f.amenity_condo.toFixed(2)} · Entorno ${f.amenity_proximo.toFixed(2)}`,
      caption: 'Diferenciais que valorizam o imóvel acima do mercado base.',
      neutral: f.amenity_factor === 1,
    },
  ]
}

export default function ValueWaterfall({ factors }: { factors: HomogenizationFactors }) {
  const rows = buildWaterfallRows(factors)
  const muted = '#94A3B8'

  return (
    <div style={{ padding: '18px 22px' }}>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 18px', lineHeight: 1.7 }}>
        O valor parte do preço unitário de mercado (ensemble dos comparáveis homogeneizados) e recebe
        os ajustes do imóvel avaliado. Cada fator multiplica o R$/m² acumulado.
      </p>

      {/* Base */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Valor unitário de mercado (ensemble)</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
            ↳ Comparáveis já ajustados por oferta (−{Math.round((1 - factors.offer_factor) * 100)}%) e tipologia, conforme NBR 14.653.
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: PRIMARY, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {fmtPpm2(factors.ensemble_ppm2)}
        </div>
      </div>

      {/* Fatores */}
      {rows.map(r => (
        <div key={r.key} style={{ borderTop: '1px solid #F1F5F9', padding: '10px 0', opacity: r.neutral ? 0.5 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                {r.label} {r.neutral && <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>(sem efeito)</span>}
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.sub}</div>
              {r.caption && !r.neutral && (
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>↳ {r.caption}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: r.neutral ? muted : ACCENT, fontFamily: 'monospace' }}>
                {fmtMult(r.multiplier)}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
                {fmtPpm2(r.runningPpm2)}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Resultado unitário */}
      <div style={{ borderTop: '2px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0 10px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>R$/m² homogeneizado</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: PRIMARY, fontFamily: 'monospace' }}>
          {fmtPpm2(factors.ppm2_homogenized)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#64748B' }}>Área útil</div>
        <div style={{ fontSize: 13, color: '#64748B', fontFamily: 'monospace' }}>
          {fmtMult(factors.area_m2)} m²
        </div>
      </div>

      {/* Valor final */}
      <div style={{ background: `${ACCENT}0D`, border: `1px solid ${ACCENT}33`, borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: 1 }}>
          Valor de Mercado
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: ACCENT, fontFamily: 'monospace' }}>
          {fmtBRL(factors.market_value)}
        </div>
      </div>
    </div>
  )
}
```

> Nota: `fmtMult` é reusado para a linha de área (mostra "× 100,00 m²"); aceitável visualmente como multiplicador da área. Mantém DRY.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx vitest run src/__tests__/ValueWaterfall.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Type-check + commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx tsc -b --noEmit
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_front/src/components/ValueWaterfall.tsx ValoraIA_front/src/__tests__/ValueWaterfall.test.tsx
git commit -m "feat(front): componente ValueWaterfall (memória de cálculo)"
```

---

## Task 7: Integrar `<ValueWaterfall>` no `Report` (seção 02b)

**Files:**
- Modify: `ValoraIA_front/src/components/Report.tsx`
- Modify: `ValoraIA_front/src/__tests__/Report.test.tsx`

- [ ] **Step 1: Importar o componente**

Modify `ValoraIA_front/src/components/Report.tsx` — após o import de `FRONT_CATALOG` (linha ~5):
```tsx
import ValueWaterfall from './ValueWaterfall'
```

- [ ] **Step 2: Inserir a seção 02b**

Modify `ValoraIA_front/src/components/Report.tsx` — logo após o fechamento da seção 02 (`</SectionCard>` que encerra "Valor de Mercado Determinado", antes do comentário `{/* ── 03. IMÓVEIS REFERENCIAIS */}`):
```tsx
      {/* ── 02b. MEMÓRIA DE CÁLCULO ─────────────────────────────── */}
      {valuation.homogenization_factors && (
        <SectionCard>
          <SectionHeader number="02b" title="Como Chegamos a Este Valor" />
          <ValueWaterfall factors={valuation.homogenization_factors} />
        </SectionCard>
      )}
```

- [ ] **Step 3: Atualizar o mock do teste e adicionar caso**

Modify `ValoraIA_front/src/__tests__/Report.test.tsx`:
- No objeto `mockValuation` (`vi.hoisted`), adicionar o campo (após `in_gated_community: false,` ou junto aos campos V2):
```ts
    homogenization_factors: {
      ensemble_ppm2: 5000, offer_factor: 0.9, typology_factor: 1.0,
      corner_factor: 1.05, slope_factor: 1.0, level_factor: 1.0, physical_factor: 1.05,
      amenity_internal: 1.06, amenity_condo: 1.0, amenity_proximo: 1.0, amenity_factor: 1.06,
      combined_factor: 1.113, ppm2_homogenized: 5565, area_m2: 98, market_value: 545370,
    },
```
- Adicionar o teste:
```tsx
it('mostra a seção de memória de cálculo quando há fatores', async () => {
  renderReport()
  await waitFor(() => {
    expect(screen.getByText('Como Chegamos a Este Valor')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Rodar o teste do Report**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx vitest run src/__tests__/Report.test.tsx`
Expected: o novo teste passa. (Falhas pré-existentes do refactor V2 PTAM podem permanecer — não introduzir novas.)

- [ ] **Step 5: Type-check + commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx tsc -b --noEmit
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_front/src/components/Report.tsx ValoraIA_front/src/__tests__/Report.test.tsx
git commit -m "feat(front): seção 02b memória de cálculo no relatório"
```

---

## Task 8: Dependência + componente `LaudoPDF`

**Files:**
- Modify: `ValoraIA_front/package.json` (via npm)
- Create: `ValoraIA_front/src/components/LaudoPDF.tsx`
- Test: `ValoraIA_front/src/__tests__/LaudoPDF.test.tsx`

- [ ] **Step 1: Instalar `@react-pdf/renderer`**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npm i @react-pdf/renderer`
Expected: adiciona a dependência (4.x) sem erro.

- [ ] **Step 2: Escrever o teste falho**

Create `ValoraIA_front/src/__tests__/LaudoPDF.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { isValidElement } from 'react'
import LaudoPDF from '../components/LaudoPDF'
import type { ValuationRecord } from '../types'

const rec = {
  id: 'val_test01', address: 'Rua Teste, 100', lat: null, lng: null,
  property_type: 'apartment', area_m2: 98, bedrooms: 3, bathrooms: 2, parking_spaces: 1,
  construction_age: 5, conservation_state: 'regular', terrain_slope: 'plano',
  street_level: 'no_nivel', is_corner: true,
  static_market_value_brl: 545370, price_per_m2_homogenized: 5565, confidence_score: 88,
  residual_land_value_brl: null, max_buildable_area_m2: null, zoning_params: null,
  viability_scenarios: null, comparables: [], neighborhood_pois: null,
  amenities: [{ item: 'piscina', scope: 'condo' as const }], in_gated_community: false,
  homogenization_factors: {
    ensemble_ppm2: 5000, offer_factor: 0.9, typology_factor: 1.0,
    corner_factor: 1.05, slope_factor: 1.0, level_factor: 1.0, physical_factor: 1.05,
    amenity_internal: 1.0, amenity_condo: 1.06, amenity_proximo: 1.0, amenity_factor: 1.06,
    combined_factor: 1.113, ppm2_homogenized: 5565, area_m2: 98, market_value: 545370,
  },
  created_at: '2025-05-01T10:00:00Z',
} as unknown as ValuationRecord

describe('LaudoPDF', () => {
  it('constrói o documento sem lançar', () => {
    const el = LaudoPDF({ valuation: rec })
    expect(isValidElement(el)).toBe(true)
  })

  it('lida com avaliação sem homogenization_factors', () => {
    const el = LaudoPDF({ valuation: { ...rec, homogenization_factors: null } })
    expect(isValidElement(el)).toBe(true)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx vitest run src/__tests__/LaudoPDF.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 4: Implementar o documento PDF**

Create `ValoraIA_front/src/components/LaudoPDF.tsx`:
```tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ValuationRecord } from '../types'
import { FRONT_CATALOG } from '../amenities'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'
const MUTED = '#94A3B8'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento', house: 'Casa', commercial: 'Comercial', land: 'Terreno',
}
const CONSERVATION_LABELS: Record<string, string> = {
  novo: 'Novo', entre_novo_e_regular: 'Entre Novo e Regular', regular: 'Regular',
  reparos_simples: 'Reparos Simples', reparos_importantes: 'Reparos Importantes', critico: 'Crítico',
}
const SCOPE_TITLES: Record<string, string> = {
  interno: 'Diferencial do Imóvel', condo: 'Infra do Condomínio', proximo: 'Entorno',
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPpm2 = (v: number) => fmtBRL(Math.round(v)) + '/m²'
const fmtMult = (v: number) => '× ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: '#1E293B', fontFamily: 'Helvetica' },
  header: { backgroundColor: PRIMARY, padding: 16, marginBottom: 14, borderRadius: 4 },
  headerEyebrow: { color: '#FFFFFF', opacity: 0.6, fontSize: 7, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#FFFFFF', opacity: 0.55, fontSize: 8, marginTop: 3 },
  headerMeta: { color: '#FFFFFF', fontSize: 9, marginTop: 8 },
  sectionTitle: { backgroundColor: PRIMARY, color: '#FFFFFF', fontSize: 9, fontFamily: 'Helvetica-Bold', padding: '5 10', marginTop: 12, marginBottom: 0, letterSpacing: 1 },
  card: { border: '1 solid #E2E8F0', borderTop: 'none' },
  row: { flexDirection: 'row', borderBottom: '1 solid #F1F5F9', padding: '4 10' },
  rowLabel: { width: '40%', color: '#64748B', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  rowValue: { width: '60%' },
  valueBig: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  waterLine: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '1 solid #F1F5F9', padding: '5 10' },
  waterFinal: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ECFDF5', padding: '8 10', marginTop: 4 },
  mono: { fontFamily: 'Helvetica-Bold' },
  sub: { color: MUTED, fontSize: 7, marginTop: 2 },
  disclaimer: { marginTop: 16, fontSize: 7, color: MUTED, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: MUTED, borderTop: '1 solid #E2E8F0', paddingTop: 6 },
})

function FichaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

export default function LaudoPDF({ valuation: v }: { valuation: ValuationRecord }) {
  const laudoId = `PTAM-${v.id.slice(-6).toUpperCase()}`
  const laudoDate = new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const propertyLabel = PROPERTY_TYPE_LABELS[v.property_type] ?? v.property_type
  const hf = v.homogenization_factors

  const amenitiesByScope: Record<string, string[]> = {}
  for (const a of v.amenities ?? []) {
    const label = FRONT_CATALOG[a.item]?.label ?? a.item
    ;(amenitiesByScope[a.scope] ??= []).push(label)
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Letterhead */}
        <View style={s.header}>
          <Text style={s.headerEyebrow}>PARECER TÉCNICO DE AVALIAÇÃO MERCADOLÓGICA</Text>
          <Text style={s.headerTitle}>ValoraIA</Text>
          <Text style={s.headerSub}>Avaliação por Inteligência Artificial · Conforme ABNT NBR 14.653</Text>
          <Text style={s.headerMeta}>{laudoId} · {laudoDate}</Text>
          <Text style={s.headerMeta}>Imóvel: {v.address}</Text>
        </View>

        {/* Ficha técnica */}
        <Text style={s.sectionTitle}>01 · FICHA TÉCNICA</Text>
        <View style={s.card}>
          <FichaRow label="Nº do Laudo" value={laudoId} />
          <FichaRow label="Tipo de Imóvel" value={propertyLabel} />
          <FichaRow label="Área" value={`${v.area_m2.toLocaleString('pt-BR')} m²`} />
          {v.bedrooms != null && <FichaRow label="Quartos" value={String(v.bedrooms)} />}
          {v.bathrooms != null && <FichaRow label="Banheiros" value={String(v.bathrooms)} />}
          {v.parking_spaces != null && <FichaRow label="Vagas" value={String(v.parking_spaces)} />}
          <FichaRow label="Estado de Conservação" value={CONSERVATION_LABELS[v.conservation_state] ?? v.conservation_state} />
          {v.is_corner && <FichaRow label="Situação" value="Imóvel de Esquina" />}
          <FichaRow label="Metodologia" value="Método Comparativo Direto de Dados de Mercado — NBR 14.653" />
        </View>

        {/* Comodidades por escopo */}
        {(v.amenities?.length ?? 0) > 0 && (
          <>
            <Text style={s.sectionTitle}>01b · COMODIDADES POR ESCOPO</Text>
            <View style={s.card}>
              {(['interno', 'condo', 'proximo'] as const).map(sc =>
                amenitiesByScope[sc]?.length ? (
                  <View key={sc} style={s.row}>
                    <Text style={s.rowLabel}>{SCOPE_TITLES[sc]}</Text>
                    <Text style={s.rowValue}>{amenitiesByScope[sc].join(' · ')}</Text>
                  </View>
                ) : null
              )}
            </View>
          </>
        )}

        {/* Valor de mercado */}
        <Text style={s.sectionTitle}>02 · VALOR DE MERCADO DETERMINADO</Text>
        <View style={[s.card, { padding: 12 }]}>
          <Text style={{ fontSize: 7, color: MUTED, letterSpacing: 1, marginBottom: 4 }}>VALOR DE MERCADO (MÉTODO COMPARATIVO)</Text>
          <Text style={s.valueBig}>{v.static_market_value_brl != null ? fmtBRL(v.static_market_value_brl) : '—'}</Text>
          {v.price_per_m2_homogenized != null && (
            <Text style={{ fontSize: 9, color: '#64748B', marginTop: 4 }}>
              {fmtPpm2(v.price_per_m2_homogenized)} · homogeneizado · Confiança {v.confidence_score ?? 0}%
            </Text>
          )}
        </View>

        {/* Memória de cálculo */}
        {hf && (
          <>
            <Text style={s.sectionTitle}>02b · COMO CHEGAMOS A ESTE VALOR</Text>
            <View style={s.card}>
              <View style={s.waterLine}>
                <View>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Valor unitário de mercado (ensemble)</Text>
                  <Text style={s.sub}>Comparáveis já ajustados por oferta (−{Math.round((1 - hf.offer_factor) * 100)}%) e tipologia.</Text>
                </View>
                <Text style={[s.mono, { color: PRIMARY }]}>{fmtPpm2(hf.ensemble_ppm2)}</Text>
              </View>
              <View style={s.waterLine}>
                <View>
                  <Text>Fatores físicos</Text>
                  <Text style={s.sub}>Esquina {hf.corner_factor.toFixed(2)} · Topografia {hf.slope_factor.toFixed(2)} · Nível {hf.level_factor.toFixed(2)}</Text>
                </View>
                <Text style={[s.mono, { color: hf.physical_factor === 1 ? MUTED : ACCENT }]}>{fmtMult(hf.physical_factor)}</Text>
              </View>
              <View style={s.waterLine}>
                <View>
                  <Text>Comodidades por escopo</Text>
                  <Text style={s.sub}>Interno {hf.amenity_internal.toFixed(2)} · Condomínio {hf.amenity_condo.toFixed(2)} · Entorno {hf.amenity_proximo.toFixed(2)}</Text>
                </View>
                <Text style={[s.mono, { color: hf.amenity_factor === 1 ? MUTED : ACCENT }]}>{fmtMult(hf.amenity_factor)}</Text>
              </View>
              <View style={s.waterLine}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>R$/m² homogeneizado  ×  {hf.area_m2.toLocaleString('pt-BR')} m²</Text>
                <Text style={[s.mono, { color: PRIMARY }]}>{fmtPpm2(hf.ppm2_homogenized)}</Text>
              </View>
              <View style={s.waterFinal}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#15803D' }}>VALOR DE MERCADO</Text>
                <Text style={[s.mono, { color: ACCENT, fontSize: 12 }]}>{fmtBRL(hf.market_value)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Comparáveis */}
        {(v.comparables?.length ?? 0) > 0 && (
          <>
            <Text style={s.sectionTitle}>03 · IMÓVEIS REFERENCIAIS HOMOGENEIZADOS</Text>
            <View style={s.card}>
              {v.comparables!.map((c, i) => (
                <View key={i} style={s.row}>
                  <Text style={{ width: '50%' }}>{c.neighborhood} — {c.address}</Text>
                  <Text style={{ width: '20%', textAlign: 'right' }}>{c.area_m2}m²</Text>
                  <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{fmtBRL(c.price_brl)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={s.disclaimer}>
          Aviso Legal: Este parecer foi gerado por sistema de inteligência artificial com base em dados públicos
          de oferta e transação imobiliária. Os valores têm caráter informativo e não substituem laudo de avaliação
          assinado por profissional habilitado pelo IBAPE/CONFEA, conforme NBR 14.653-1.
        </Text>

        <View style={s.footer} fixed>
          <Text>ValoraIA · {laudoId}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx vitest run src/__tests__/LaudoPDF.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 6: Type-check + commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx tsc -b --noEmit
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_front/src/components/LaudoPDF.tsx ValoraIA_front/src/__tests__/LaudoPDF.test.tsx ValoraIA_front/package.json ValoraIA_front/package-lock.json
git commit -m "feat(front): documento LaudoPDF (@react-pdf/renderer)"
```

---

## Task 9: Botão de download PDF no `Report` (remove `window.print`)

**Files:**
- Modify: `ValoraIA_front/src/components/Report.tsx`

- [ ] **Step 1: Imports e estado**

Modify `ValoraIA_front/src/components/Report.tsx`:
- Adicionar import:
```tsx
import { pdf } from '@react-pdf/renderer'
import LaudoPDF from './LaudoPDF'
```
- No corpo do componente `Report`, junto aos outros `useState` (ex. após `const [loading, setLoading] = useState(true)`):
```tsx
  const [pdfLoading, setPdfLoading] = useState(false)
```

- [ ] **Step 2: Handler de download**

Modify `Report.tsx` — adicionar antes do `return` principal (após a verificação de `error || !valuation`, onde `valuation` já é não-nulo):
```tsx
  const handleDownloadPdf = async () => {
    if (!valuation) return
    setPdfLoading(true)
    try {
      const blob = await pdf(<LaudoPDF valuation={valuation} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${laudoId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }
```
> `laudoId` já está definido no escopo do componente (linha ~174). O handler deve ficar após essa definição.

- [ ] **Step 3: Trocar o botão**

Modify `Report.tsx` — substituir o botão `onClick={() => window.print()}` (linhas ~558-563):
```tsx
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          style={{ padding: '10px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: pdfLoading ? 'default' : 'pointer', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', opacity: pdfLoading ? 0.6 : 1 }}
        >
          {pdfLoading ? 'Gerando PDF…' : 'Baixar PDF'}
        </button>
```

- [ ] **Step 4: Rodar testes do Report + type-check**

Run: `cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx vitest run src/__tests__/Report.test.tsx && npx tsc -b --noEmit`
Expected: sem novas falhas; type-check limpo.

- [ ] **Step 5: Commit**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA
git add ValoraIA_front/src/components/Report.tsx
git commit -m "feat(front): download de PDF vetorial substitui window.print"
```

---

## Task 10: Suíte completa + verificação final

**Files:** nenhum novo (verificação).

- [ ] **Step 1: Suíte completa dos dois pacotes**

Run:
```bash
cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npm test
cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx vitest run
```
Expected: backend verde; frontend sem **novas** falhas além das pré-existentes do refactor V2 PTAM (documentadas em sessões anteriores). Confirmar que os testes novos (`ValueWaterfall`, `LaudoPDF`, memória de cálculo no Report) passam.

- [ ] **Step 2: Type-check final**

Run:
```bash
cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_back && npx tsc --noEmit
cd /Users/erickfonseca/Desktop/ValoraIA/ValoraIA_front && npx tsc -b --noEmit
```
Expected: sem erros nos dois.

- [ ] **Step 3: Commit final (se houver ajustes)**

```bash
cd /Users/erickfonseca/Desktop/ValoraIA
git add -A
git commit -m "test: verificação final memória de cálculo + PDF" || echo "nada a commitar"
```

---

## Pós-implementação (ação manual do usuário)

1. Executar `migrations/2026-06-11_homogenization_factors.sql` no Supabase (SQL editor).
2. Avaliações **antigas** não têm `homogenization_factors` → a seção 02b e a memória de cálculo no PDF simplesmente não aparecem (fallback). Novas avaliações já trazem o campo.

## Notas

- A oferta (−10%) e a tipologia são aplicadas por comparável antes do ensemble; por isso aparecem como **contexto** na legenda do waterfall, não como passo multiplicativo único.
- Nenhum valor é recalculado no frontend — tudo vem de `homogenization_factors`.
