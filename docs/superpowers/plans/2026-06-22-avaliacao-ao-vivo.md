# Avaliação ao Vivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## PROMPT DE HANDOFF (cole isto no agente de codificação)

> Você vai implementar a feature **"Avaliação ao Vivo"** no monorepo ValoraIA (backend Next.js 16 em `ValoraIA_back/`, frontend React+Vite em `ValoraIA_front/`). O design completo está em `docs/superpowers/specs/2026-06-19-avaliacao-ao-vivo-design.md`. O plano task-by-task está em `docs/superpowers/plans/2026-06-22-avaliacao-ao-vivo.md` (este arquivo).
>
> Trabalhe **uma task por vez, em ordem**, seguindo TDD: escreva o teste que falha, rode e veja falhar, implemente o mínimo, rode e veja passar, commit. Não pule etapas nem invente APIs — todos os tipos/funções que você precisa estão definidos no plano ou já existem no código citado por `arquivo:linha`.
>
> Regras do repositório: respostas de API usam o envelope `{ success: true, data: T } | { success: false, error: string }`; enums do backend casam com `newschema.sql`; **antes de tocar em qualquer rota Next.js, leia `ValoraIA_back/node_modules/next/dist/docs/`** (esta feature não cria rotas, mas a regra vale). **Não adicione co-autor nem rodapé "Generated with Claude" nos commits.** Tema: PRIMARY `#1E3A8A`, ACCENT `#10B981`.
>
> Comandos de teste: backend `cd ValoraIA_back && npm run test -- <arquivo>`; frontend `cd ValoraIA_front && npm run test -- <arquivo> --run`. Rode a suíte completa de cada app ao terminar suas tasks para garantir que nada quebrou.

---

**Goal:** Transformar o momento em que o valor da avaliação aparece numa experiência viva — valor que nasce animado, medidor de confiança e mapa interativo de comparáveis + POIs — reusando o motor e os dados existentes, em ambos os pontos do fluxo (revelação no envio do wizard + herói no topo do laudo).

**Architecture:** O motor (`POST /api/valuations`) já calcula coordenadas de comparáveis e POIs mas as descarta antes de serializar. As Tasks 1–2 expõem essas coords (sem migração de DB — fluem nos blobs JSONB já persistidos). As Tasks 3–7 constroem componentes de UI isolados (`ValueCountUp`, `ConfidenceGauge`, `ComparablesMap`, `LiveValuationHero`). As Tasks 8–9 integram o herói na transição de envio (`ValuationFlow`) e no topo do laudo (`Report`).

**Tech Stack:** Next.js 16 (backend), React + Vite + TypeScript (frontend), Tailwind v3, react-leaflet + Leaflet (mapa, tiles OSM, sem API key), Vitest + testing-library.

## Global Constraints

- Sem migração de DB e sem mudança em `newschema.sql` — coords trafegam nos blobs JSONB `comparables` e `neighborhood_pois`.
- Sem mudança em `ValoraIA_front/src/components/LaudoPDF.tsx` — o mapa é só web; o PDF segue estático.
- Sem novas libs de animação (framer/d3). Animação via `requestAnimationFrame` + CSS/SVG.
- Mapa usa `CircleMarker` (SVG, sem assets de ícone) — evita o bug clássico de ícone quebrado do Leaflet no Vite.
- Pins exatos: coord real do listing.
- Respeitar `prefers-reduced-motion`: sem count-up nem queda de pins quando ativo.
- Tema: PRIMARY `#1E3A8A`, ACCENT `#10B981`; alvo em PRIMARY, comparáveis em ACCENT, POIs em âmbar `#F59E0B`.
- Tipos espelhados front/back: ao mudar `FrontendComparable`/`NearbyPlace` no backend, mude o espelho no frontend.
- Commits sem co-autor / sem rodapé de IA.

---

## Task 1: Backend — expor `lat/lng` em `FrontendComparable`

**Files:**
- Modify: `ValoraIA_back/src/types/index.ts` (interface `FrontendComparable`)
- Modify: `ValoraIA_back/src/lib/math/valuation-engine.ts:373-390` (`toFrontendComparables`)
- Test: `ValoraIA_back/src/lib/math/__tests__/to-frontend-comparables.test.ts` (novo)

**Interfaces:**
- Produces: `FrontendComparable` agora com `lat: number | null`, `lng: number | null`; `toFrontendComparables(candidates, maxCount?)` exportado.
- Consumes: `ListingRow` (de `@/types`) com campos `lat: number`, `lng: number` (ver `types/index.ts:124`).

- [ ] **Step 1: Tornar `toFrontendComparables` exportável e escrever o teste que falha**

Crie `ValoraIA_back/src/lib/math/__tests__/to-frontend-comparables.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { toFrontendComparables } from "../valuation-engine";
import type { ListingRow } from "@/types";

function makeRow(over: Partial<ListingRow> = {}): ListingRow {
  return {
    id: "l1",
    source_url: "https://x.com/1",
    price: 500_000,
    usable_area: 100,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    property_type: "apartment",
    lat: -7.115,
    lng: -34.861,
    neighborhood: "Manaíra",
    city: "João Pessoa",
    construction_age: 5,
    conservation_state: "regular",
    last_seen: "2026-06-01",
    created_at: "2026-05-01",
    distance_m: 250,
    ...over,
  };
}

describe("toFrontendComparables", () => {
  it("inclui lat/lng do row em cada comparável", () => {
    const candidates = [
      { row: makeRow({ lat: -7.11, lng: -34.86, distance_m: 100 }), homogenizedPpm2: 5000, idwWeight: 1, typologyFactor: 1 },
      { row: makeRow({ lat: -7.12, lng: -34.87, distance_m: 300 }), homogenizedPpm2: 5100, idwWeight: 1, typologyFactor: 1 },
    ];
    const result = toFrontendComparables(candidates);
    expect(result[0].lat).toBe(-7.11);
    expect(result[0].lng).toBe(-34.86);
    expect(result[1].lat).toBe(-7.12);
    expect(result[1].lng).toBe(-34.87);
  });

  it("ordena por distância e preserva coords", () => {
    const candidates = [
      { row: makeRow({ lat: -7.20, distance_m: 900 }), homogenizedPpm2: 5000, idwWeight: 1, typologyFactor: 1 },
      { row: makeRow({ lat: -7.10, distance_m: 100 }), homogenizedPpm2: 5000, idwWeight: 1, typologyFactor: 1 },
    ];
    const result = toFrontendComparables(candidates);
    expect(result[0].lat).toBe(-7.10); // mais próximo primeiro
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd ValoraIA_back && npm run test -- src/lib/math/__tests__/to-frontend-comparables.test.ts`
Expected: FAIL — `toFrontendComparables` não é exportado / `lat` é `undefined`.

- [ ] **Step 3: Adicionar `lat/lng` à interface `FrontendComparable`**

Em `ValoraIA_back/src/types/index.ts`, na interface `FrontendComparable`, adicione após `images?`:

```typescript
  lat: number | null;
  lng: number | null;
```

- [ ] **Step 4: Exportar e preencher coords em `toFrontendComparables`**

Em `ValoraIA_back/src/lib/math/valuation-engine.ts:373`, troque `function toFrontendComparables(` por `export function toFrontendComparables(`. No objeto retornado (`:379-389`), adicione após `source_url: row.source_url,`:

```typescript
      lat: row.lat,
      lng: row.lng,
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd ValoraIA_back && npm run test -- src/lib/math/__tests__/to-frontend-comparables.test.ts`
Expected: PASS (ambos os testes).

- [ ] **Step 6: Verificar TypeScript e suíte do motor**

Run: `cd ValoraIA_back && npx tsc --noEmit 2>&1 | grep -E "valuation-engine|FrontendComparable" || echo "sem erros"`
Run: `cd ValoraIA_back && npm run test -- src/lib/math`
Expected: testes existentes do motor continuam passando.

- [ ] **Step 7: Commit**

```bash
git add ValoraIA_back/src/types/index.ts ValoraIA_back/src/lib/math/valuation-engine.ts ValoraIA_back/src/lib/math/__tests__/to-frontend-comparables.test.ts
git commit -m "feat(back): expor lat/lng em FrontendComparable"
```

---

## Task 2: Backend — expor `lat/lng` em `NearbyPlace`

**Files:**
- Modify: `ValoraIA_back/src/lib/geocoding/nearby-places.ts` (interface `NearbyPlace` + map `:69-73`)
- Modify: `ValoraIA_back/src/types/index.ts` (interface `NearbyPlace`, se existir cópia)
- Test: `ValoraIA_back/src/lib/geocoding/__tests__/nearby-places.test.ts` (novo)

**Interfaces:**
- Produces: `NearbyPlace` com `lat: number | null`, `lng: number | null`.
- Consumes: resposta Google Places com `r.geometry.location.lat/lng` (já lida em `nearby-places.ts:71`).

- [ ] **Step 1: Escrever o teste que falha**

Crie `ValoraIA_back/src/lib/geocoding/__tests__/nearby-places.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNearbyPlaces } from "../nearby-places";

beforeEach(() => {
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: "OK",
      results: [
        {
          name: "Mercado Central",
          vicinity: "Rua A, 10",
          geometry: { location: { lat: -7.1101, lng: -34.8601 } },
          types: ["supermarket"],
        },
      ],
    }),
  }));
});

describe("fetchNearbyPlaces", () => {
  it("inclui lat/lng em cada place", async () => {
    // coords únicas evitam o cache module-level
    const data = await fetchNearbyPlaces(-7.5001, -34.5001);
    const allPlaces = data.pois.flatMap((p) => p.places);
    expect(allPlaces.length).toBeGreaterThan(0);
    expect(allPlaces[0].lat).toBe(-7.1101);
    expect(allPlaces[0].lng).toBe(-34.8601);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_back && npm run test -- src/lib/geocoding/__tests__/nearby-places.test.ts`
Expected: FAIL — `lat` é `undefined`.

- [ ] **Step 3: Adicionar `lat/lng` à interface `NearbyPlace`**

Em `ValoraIA_back/src/lib/geocoding/nearby-places.ts:3-8`, adicione dentro de `interface NearbyPlace`:

```typescript
  lat: number | null;
  lng: number | null;
```

- [ ] **Step 4: Preencher coords no map de places**

Em `nearby-places.ts:70-73`, troque o corpo do `.map((r) => { ... })` por:

```typescript
        .map((r) => {
          const dist = haversineMeters(lat, lng, r.geometry.location.lat, r.geometry.location.lng);
          return {
            name: r.name,
            vicinity: r.vicinity,
            type: config.type,
            distance_m: Math.round(dist),
            lat: r.geometry.location.lat,
            lng: r.geometry.location.lng,
          };
        })
```

- [ ] **Step 5: Espelhar na cópia de tipos (se existir)**

Verifique se há cópia da interface no barrel de tipos:

Run: `grep -n "interface NearbyPlace" ValoraIA_back/src/types/index.ts || echo "sem copia"`

Se existir, adicione `lat: number | null;` e `lng: number | null;` lá também (manter em sincronia).

- [ ] **Step 6: Rodar e ver passar**

Run: `cd ValoraIA_back && npm run test -- src/lib/geocoding/__tests__/nearby-places.test.ts`
Expected: PASS.

- [ ] **Step 7: TypeScript + commit**

Run: `cd ValoraIA_back && npx tsc --noEmit 2>&1 | grep -E "nearby-places|NearbyPlace" || echo "sem erros"`

```bash
git add ValoraIA_back/src/lib/geocoding/nearby-places.ts ValoraIA_back/src/types/index.ts ValoraIA_back/src/lib/geocoding/__tests__/nearby-places.test.ts
git commit -m "feat(back): expor lat/lng em NearbyPlace"
```

---

## Task 3: Frontend — espelhar tipos + instalar Leaflet

**Files:**
- Modify: `ValoraIA_front/src/types/index.ts` (`FrontendComparable`, `NearbyPlace`)
- Modify: `ValoraIA_front/package.json` (deps)

**Interfaces:**
- Produces: tipos `FrontendComparable` e `NearbyPlace` com `lat/lng`; deps `leaflet`, `react-leaflet`, `@types/leaflet` instaladas.

- [ ] **Step 1: Adicionar `lat/lng` aos tipos espelho**

Em `ValoraIA_front/src/types/index.ts`, na interface `FrontendComparable` (após `images?`), adicione:

```typescript
  lat: number | null
  lng: number | null
```

Na interface `NearbyPlace` (após `distance_m: number`), adicione:

```typescript
  lat: number | null
  lng: number | null
```

- [ ] **Step 2: Instalar dependências do mapa**

Run:
```bash
cd ValoraIA_front && npm install leaflet@^1.9.4 react-leaflet@^4.2.1 && npm install -D @types/leaflet@^1.9.12
```
Expected: instala sem erros de peer dependency (react-leaflet 4.x suporta React 18+).

- [ ] **Step 3: Verificar TypeScript**

Run: `cd ValoraIA_front && npx tsc -b --noEmit 2>&1 | grep -E "types/index|leaflet" || echo "sem erros"`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add ValoraIA_front/src/types/index.ts ValoraIA_front/package.json ValoraIA_front/package-lock.json
git commit -m "feat(front): espelhar lat/lng nos tipos + instalar leaflet"
```

---

## Task 4: Frontend — `ValueCountUp`

**Files:**
- Create: `ValoraIA_front/src/components/ValueCountUp.tsx`
- Test: `ValoraIA_front/src/__tests__/ValueCountUp.test.tsx`

**Interfaces:**
- Produces: `<ValueCountUp value={number} animate?={boolean} className?={string} />` — renderiza `value` formatado em BRL; conta de 0 até `value` via rAF quando `animate` e sem `prefers-reduced-motion`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `ValoraIA_front/src/__tests__/ValueCountUp.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ValueCountUp from '../components/ValueCountUp'

describe('ValueCountUp', () => {
  it('renderiza o valor final formatado em BRL quando animate=false', () => {
    render(<ValueCountUp value={487300} animate={false} />)
    expect(screen.getByText(/R\$\s?487\.300/)).toBeInTheDocument()
  })

  it('renderiza 0 formatado quando value é 0', () => {
    render(<ValueCountUp value={0} animate={false} />)
    expect(screen.getByText(/R\$\s?0/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ValueCountUp.test.tsx --run`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `ValueCountUp.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

interface Props {
  value: number
  animate?: boolean
  className?: string
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export default function ValueCountUp({ value, animate = true, className }: Props) {
  const [display, setDisplay] = useState(animate && !prefersReducedMotion() ? 0 : value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setDisplay(value)
      return
    }
    const duration = 900
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(Math.round(value * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, animate])

  return <span className={className}>{BRL.format(display)}</span>
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ValueCountUp.test.tsx --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ValoraIA_front/src/components/ValueCountUp.tsx ValoraIA_front/src/__tests__/ValueCountUp.test.tsx
git commit -m "feat(front): ValueCountUp com count-up rAF e BRL"
```

---

## Task 5: Frontend — `ConfidenceGauge`

**Files:**
- Create: `ValoraIA_front/src/components/ConfidenceGauge.tsx`
- Test: `ValoraIA_front/src/__tests__/ConfidenceGauge.test.tsx`

**Interfaces:**
- Produces: `<ConfidenceGauge score={number | null} />` — `score` em 0..1 OU 0..100 (normaliza); arco SVG proporcional; nada renderizado quando `score` nulo. Expõe `data-testid="confidence-gauge"` no `<svg>` e `data-pct` com o percentual inteiro.

- [ ] **Step 1: Escrever o teste que falha**

Crie `ValoraIA_front/src/__tests__/ConfidenceGauge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfidenceGauge from '../components/ConfidenceGauge'

describe('ConfidenceGauge', () => {
  it('normaliza score 0..1 para percentual', () => {
    render(<ConfidenceGauge score={0.82} />)
    const svg = screen.getByTestId('confidence-gauge')
    expect(svg).toHaveAttribute('data-pct', '82')
  })

  it('aceita score já em 0..100', () => {
    render(<ConfidenceGauge score={82} />)
    expect(screen.getByTestId('confidence-gauge')).toHaveAttribute('data-pct', '82')
  })

  it('não renderiza nada quando score é null', () => {
    const { container } = render(<ConfidenceGauge score={null} />)
    expect(container.querySelector('[data-testid="confidence-gauge"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ConfidenceGauge.test.tsx --run`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `ConfidenceGauge.tsx`**

```tsx
const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'
const WARN = '#F59E0B'

interface Props {
  score: number | null
  size?: number
}

export default function ConfidenceGauge({ score, size = 120 }: Props) {
  if (score == null) return null

  const pct = Math.round(score <= 1 ? score * 100 : score)
  const clamped = Math.max(0, Math.min(100, pct))
  const color = clamped >= 75 ? ACCENT : WARN

  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped / 100)

  return (
    <svg
      data-testid="confidence-gauge"
      data-pct={String(clamped)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Grau de confiança ${clamped}%`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />
      <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.22} fontWeight={900} fill={PRIMARY}>
        {clamped}%
      </text>
      <text x="50%" y="66%" textAnchor="middle" fontSize={size * 0.1} fill="#64748B">
        confiança
      </text>
    </svg>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ConfidenceGauge.test.tsx --run`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add ValoraIA_front/src/components/ConfidenceGauge.tsx ValoraIA_front/src/__tests__/ConfidenceGauge.test.tsx
git commit -m "feat(front): ConfidenceGauge arco SVG animado"
```

---

## Task 6: Frontend — `ComparablesMap`

**Files:**
- Create: `ValoraIA_front/src/components/ComparablesMap.tsx`
- Test: `ValoraIA_front/src/__tests__/ComparablesMap.test.tsx`

**Interfaces:**
- Consumes: `FrontendComparable[]`, `NeighborhoodData | null`, `{ lat, lng }` do alvo (todos de `../types`).
- Produces: `<ComparablesMap subject={{lat,lng}} comparables={FrontendComparable[]} pois={NeighborhoodData | null} animate?={boolean} />` — Leaflet com `CircleMarker` do alvo (PRIMARY), comparáveis (ACCENT) e POIs (âmbar); popups com preço/R$ por m²/área/link. Retorna `null` se `subject.lat`/`subject.lng` nulos.

- [ ] **Step 1: Escrever o teste que falha (mock react-leaflet)**

Crie `ValoraIA_front/src/__tests__/ComparablesMap.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import ComparablesMap from '../components/ComparablesMap'
import type { FrontendComparable, NeighborhoodData } from '../types'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tiles" />,
  CircleMarker: ({ children, pathOptions }: { children?: ReactNode; pathOptions?: { className?: string } }) => (
    <div data-testid="marker" data-cls={pathOptions?.className}>{children}</div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

const SUBJECT = { lat: -7.11, lng: -34.86 }

const COMPS: FrontendComparable[] = [
  { address: 'A', neighborhood: 'Manaíra', price_brl: 500000, area_m2: 100, bedrooms: 3, price_m2_brl: 5000, status: 'listed', transaction_date: '2026-06-01', source_url: 'https://x/1', lat: -7.112, lng: -34.861 },
  { address: 'B', neighborhood: 'Tambaú', price_brl: 600000, area_m2: 120, bedrooms: 3, price_m2_brl: 5000, status: 'listed', transaction_date: '2026-06-01', lat: null, lng: null },
]

const POIS: NeighborhoodData = {
  totalScore: 0.7,
  pois: [{ category: 'supermarket', label: 'Supermercados', score: 0.9, weight: 0.15, places: [
    { name: 'Mercado', vicinity: 'Rua A', type: 'supermarket', distance_m: 200, lat: -7.113, lng: -34.862 },
  ] }],
}

describe('ComparablesMap', () => {
  it('retorna null quando o alvo não tem coordenadas', () => {
    const { container } = render(<ComparablesMap subject={{ lat: null, lng: null }} comparables={COMPS} pois={POIS} />)
    expect(container.querySelector('[data-testid="map"]')).toBeNull()
  })

  it('renderiza marcador do alvo + apenas comparáveis com coords + POIs', () => {
    render(<ComparablesMap subject={SUBJECT} comparables={COMPS} pois={POIS} />)
    const markers = screen.getAllByTestId('marker')
    // 1 alvo + 1 comparável com coord (B é descartado) + 1 POI = 3
    expect(markers).toHaveLength(3)
  })

  it('popup do comparável mostra preço por m²', () => {
    render(<ComparablesMap subject={SUBJECT} comparables={COMPS} pois={null} />)
    expect(screen.getByText(/5\.000/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ComparablesMap.test.tsx --run`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `ComparablesMap.tsx`**

```tsx
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { LatLngBoundsExpression } from 'leaflet'
import type { FrontendComparable, NeighborhoodData } from '../types'
import 'leaflet/dist/leaflet.css'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'
const AMBER = '#F59E0B'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

interface Subject { lat: number | null; lng: number | null }

interface Props {
  subject: Subject
  comparables: FrontendComparable[]
  pois: NeighborhoodData | null
  animate?: boolean
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 16 })
    }
  }, [map, points])
  return null
}

export default function ComparablesMap({ subject, comparables, pois, animate = true }: Props) {
  if (subject.lat == null || subject.lng == null) return null

  const comps = comparables.filter((c) => c.lat != null && c.lng != null)
  const poiPlaces = (pois?.pois ?? []).flatMap((cat) => cat.places).filter((p) => p.lat != null && p.lng != null)

  const points: [number, number][] = [
    [subject.lat, subject.lng],
    ...comps.map((c) => [c.lat as number, c.lng as number] as [number, number]),
  ]

  return (
    <MapContainer
      center={[subject.lat, subject.lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', minHeight: 320, borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />

      {poiPlaces.map((p, i) => (
        <CircleMarker
          key={`poi-${i}`}
          center={[p.lat as number, p.lng as number]}
          radius={5}
          pathOptions={{ color: AMBER, fillColor: AMBER, fillOpacity: 0.7, weight: 1 }}
        >
          <Popup>
            <strong>{p.name}</strong><br />
            {p.vicinity}<br />
            <span style={{ color: '#64748B' }}>{p.distance_m} m</span>
          </Popup>
        </CircleMarker>
      ))}

      {comps.map((c, i) => (
        <CircleMarker
          key={`comp-${i}`}
          center={[c.lat as number, c.lng as number]}
          radius={9}
          pathOptions={{
            color: '#fff',
            fillColor: ACCENT,
            fillOpacity: 0.95,
            weight: 2,
            className: animate ? `comp-pin comp-pin-${i}` : undefined,
          }}
        >
          <Popup>
            <strong>{c.neighborhood}</strong><br />
            {BRL.format(c.price_brl)} · {c.area_m2} m²<br />
            <span style={{ color: ACCENT, fontWeight: 700 }}>{BRL.format(c.price_m2_brl)}/m²</span>
            {c.source_url && (<><br /><a href={c.source_url} target="_blank" rel="noreferrer">ver anúncio</a></>)}
          </Popup>
        </CircleMarker>
      ))}

      <CircleMarker
        center={[subject.lat, subject.lng]}
        radius={12}
        pathOptions={{ color: '#fff', fillColor: PRIMARY, fillOpacity: 1, weight: 3 }}
      >
        <Popup><strong>Imóvel avaliado</strong></Popup>
      </CircleMarker>
    </MapContainer>
  )
}
```

- [ ] **Step 4: Adicionar o keyframe da queda dos pins ao CSS global**

Em `ValoraIA_front/src/index.css`, adicione ao final:

```css
@keyframes pinDrop {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.comp-pin {
  transform-origin: center;
  animation: pinDrop 0.4s ease-out both;
}
.comp-pin-0 { animation-delay: 0.05s; }
.comp-pin-1 { animation-delay: 0.13s; }
.comp-pin-2 { animation-delay: 0.21s; }
.comp-pin-3 { animation-delay: 0.29s; }
.comp-pin-4 { animation-delay: 0.37s; }
@media (prefers-reduced-motion: reduce) {
  .comp-pin { animation: none; }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ComparablesMap.test.tsx --run`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add ValoraIA_front/src/components/ComparablesMap.tsx ValoraIA_front/src/__tests__/ComparablesMap.test.tsx ValoraIA_front/src/index.css
git commit -m "feat(front): ComparablesMap Leaflet com pins de comparáveis e POIs"
```

---

## Task 7: Frontend — `LiveValuationHero`

**Files:**
- Create: `ValoraIA_front/src/components/LiveValuationHero.tsx`
- Test: `ValoraIA_front/src/__tests__/LiveValuationHero.test.tsx`

**Interfaces:**
- Consumes: `ValuationRecord` (de `../types`), `ValueCountUp`, `ConfidenceGauge`, `ComparablesMap`.
- Produces: `<LiveValuationHero record={ValuationRecord} mode={'reveal' | 'static'} onSeeReport?={() => void} />` — layout split (valor + gauge à esquerda, mapa à direita). Em `mode="reveal"` anima e mostra CTA "Ver laudo completo" (chama `onSeeReport`). Em `mode="static"` sem animação e sem CTA. Mapa some quando `record.lat`/`record.lng` nulos. `data-testid="live-hero"`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `ValoraIA_front/src/__tests__/LiveValuationHero.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import LiveValuationHero from '../components/LiveValuationHero'
import type { ValuationRecord } from '../types'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tiles" />,
  CircleMarker: ({ children }: { children?: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

function makeRecord(over: Partial<ValuationRecord> = {}): ValuationRecord {
  return {
    id: 'val_1',
    address: 'Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB',
    lat: -7.11,
    lng: -34.86,
    property_type: 'apartment',
    area_m2: 98,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    construction_age: 5,
    conservation_state: 'regular',
    terrain_slope: 'plano',
    street_level: 'no_nivel',
    is_corner: false,
    static_market_value_brl: 487300,
    price_per_m2_homogenized: 4972,
    confidence_score: 82,
    residual_land_value_brl: null,
    max_buildable_area_m2: null,
    zoning_params: null,
    viability_scenarios: null,
    comparables: [
      { address: 'A', neighborhood: 'Manaíra', price_brl: 500000, area_m2: 100, bedrooms: 3, price_m2_brl: 5000, status: 'listed', transaction_date: '2026-06-01', lat: -7.112, lng: -34.861 },
    ],
    neighborhood_pois: null,
    amenities: [],
    in_gated_community: false,
    created_at: '2026-06-01T10:00:00Z',
  } as ValuationRecord
}

describe('LiveValuationHero', () => {
  it('mostra o valor de mercado e o gauge', () => {
    render(<LiveValuationHero record={makeRecord()} mode="static" />)
    expect(screen.getByText(/R\$\s?487\.300/)).toBeInTheDocument()
    expect(screen.getByTestId('confidence-gauge')).toHaveAttribute('data-pct', '82')
  })

  it('renderiza o mapa quando há coordenadas do alvo', () => {
    render(<LiveValuationHero record={makeRecord()} mode="static" />)
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('oculta o mapa quando o alvo não tem coordenadas', () => {
    render(<LiveValuationHero record={makeRecord({ lat: null, lng: null })} mode="static" />)
    expect(screen.queryByTestId('map')).toBeNull()
  })

  it('mode=reveal mostra CTA que chama onSeeReport', () => {
    const onSee = vi.fn()
    render(<LiveValuationHero record={makeRecord()} mode="reveal" onSeeReport={onSee} />)
    fireEvent.click(screen.getByRole('button', { name: /laudo completo/i }))
    expect(onSee).toHaveBeenCalledOnce()
  })

  it('mode=static não mostra CTA', () => {
    render(<LiveValuationHero record={makeRecord()} mode="static" />)
    expect(screen.queryByRole('button', { name: /laudo completo/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/LiveValuationHero.test.tsx --run`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `LiveValuationHero.tsx`**

```tsx
import type { ValuationRecord } from '../types'
import ValueCountUp from './ValueCountUp'
import ConfidenceGauge from './ConfidenceGauge'
import ComparablesMap from './ComparablesMap'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

interface Props {
  record: ValuationRecord
  mode: 'reveal' | 'static'
  onSeeReport?: () => void
}

// Faixa ± derivada da confiança: maior confiança → banda mais estreita (8%..20%).
function valueBand(value: number, score: number | null): number {
  const pct = score == null ? 50 : score <= 1 ? score * 100 : score
  const bandPct = 0.20 - (Math.max(0, Math.min(100, pct)) / 100) * 0.12
  return Math.round(value * bandPct)
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export default function LiveValuationHero({ record, mode, onSeeReport }: Props) {
  const animate = mode === 'reveal'
  const value = record.static_market_value_brl ?? 0
  const band = valueBand(value, record.confidence_score)
  const hasMap = record.lat != null && record.lng != null

  return (
    <div
      data-testid="live-hero"
      style={{
        display: 'grid',
        gridTemplateColumns: hasMap ? 'minmax(260px, 1fr) minmax(280px, 1.2fr)' : '1fr',
        gap: 0,
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#fff',
      }}
      className="live-hero"
    >
      {/* Coluna esquerda: valor + gauge */}
      <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Valor de Mercado
          </div>
          <ValueCountUp
            value={value}
            animate={animate}
          />
          {record.static_market_value_brl != null && (
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
              faixa estimada {BRL.format(value - band)} – {BRL.format(value + band)}
            </div>
          )}
          {record.price_per_m2_homogenized != null && (
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {BRL.format(Math.round(record.price_per_m2_homogenized))}/m² · homogeneizado
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ConfidenceGauge score={record.confidence_score} />
          <div style={{ fontSize: 12, color: '#64748B', maxWidth: 160 }}>
            Baseado em {record.comparables?.length ?? 0} imóvel(is) comparável(is) na vizinhança.
          </div>
        </div>

        {mode === 'reveal' && (
          <button
            onClick={onSeeReport}
            style={{
              marginTop: 'auto',
              alignSelf: 'flex-start',
              padding: '12px 22px',
              borderRadius: 10,
              border: 'none',
              background: PRIMARY,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ver laudo completo →
          </button>
        )}
      </div>

      {/* Coluna direita: mapa */}
      {hasMap && (
        <div style={{ minHeight: 320, borderLeft: '1px solid #F1F5F9' }}>
          <ComparablesMap
            subject={{ lat: record.lat, lng: record.lng }}
            comparables={record.comparables ?? []}
            pois={record.neighborhood_pois}
            animate={animate}
          />
        </div>
      )}
    </div>
  )
}
```

Aplique o título grande do valor via classe utilitária no `ValueCountUp` se quiser; aqui o tamanho vem do CSS abaixo.

- [ ] **Step 4: Estilo responsivo do herói**

Em `ValoraIA_front/src/index.css`, adicione:

```css
.live-hero { grid-template-columns: minmax(260px, 1fr) minmax(280px, 1.2fr); }
.live-hero > div:first-child span { font-size: 38px; font-weight: 900; color: #1E3A8A; font-family: monospace; line-height: 1; }
@media (max-width: 640px) {
  .live-hero { grid-template-columns: 1fr !important; }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/LiveValuationHero.test.tsx --run`
Expected: PASS (5 testes).

- [ ] **Step 6: Commit**

```bash
git add ValoraIA_front/src/components/LiveValuationHero.tsx ValoraIA_front/src/__tests__/LiveValuationHero.test.tsx ValoraIA_front/src/index.css
git commit -m "feat(front): LiveValuationHero split valor+gauge+mapa"
```

---

## Task 8: Integração — revelação no envio do `ValuationFlow`

**Files:**
- Modify: `ValoraIA_front/src/components/ValuationFlow.tsx` (`handleSubmit` `:185-209` + render)
- Modify: `ValoraIA_front/src/__tests__/ValuationFlow.test.tsx` (ajustar expectativa de submit)

**Interfaces:**
- Consumes: `LiveValuationHero` (Task 7), `createValuation` retornando `ValuationRecord`.
- Produces: ao submeter com sucesso, renderiza `<LiveValuationHero mode="reveal">` com o record; CTA navega para `/resultado/:id`.

- [ ] **Step 1: Ajustar o teste de `ValuationFlow` para o novo comportamento**

Em `ValoraIA_front/src/__tests__/ValuationFlow.test.tsx`, o mock `mockValuationResult` precisa do campo `static_market_value_brl` para a revelação exibir o valor. Adicione ao objeto `mockValuationResult` (dentro de `vi.hoisted`): `static_market_value_brl: 1000000,` e `lat: null, lng: null,` (mapa oculto no teste). Garanta que `react-leaflet` esteja mockado no topo do arquivo (copie o bloco `vi.mock('react-leaflet', …)` da Task 7).

Adicione este teste ao final do `describe`:

```tsx
it('após submeter, revela o herói com o valor antes de navegar', async () => {
  // chega até o último passo e submete (reutilize os helpers já existentes no arquivo
  // para preencher os campos obrigatórios e avançar até o review step)
  // ... avançar até o review e clicar em enviar ...
  await waitFor(() => {
    expect(screen.getByTestId('live-hero')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s?1\.000\.000/)).toBeInTheDocument()
  })
})
```

> Nota para o implementador: o arquivo já tem fluxo de preenchimento nos testes existentes — reaproveite a mesma sequência de `fireEvent` usada pelo teste de submit atual; apenas troque a asserção final (que hoje verifica navegação) pela asserção do herói + clique no CTA.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ValuationFlow.test.tsx --run`
Expected: FAIL — `live-hero` não aparece (ainda navega direto).

- [ ] **Step 3: Adicionar estado de revelação e trocar a navegação**

Em `ValuationFlow.tsx`, importe no topo:

```tsx
import LiveValuationHero from './LiveValuationHero'
import type { ValuationRecord } from '../types'
```

Adicione o estado (junto aos outros `useState`, perto de `:65`):

```tsx
const [revealRecord, setRevealRecord] = useState<ValuationRecord | null>(null)
```

Em `handleSubmit` (`:204`), troque `navigate(`/resultado/${result.id}`)` por:

```tsx
      setRevealRecord(result)
      setProcessing(false)
```

- [ ] **Step 4: Renderizar a tela de revelação**

Logo no início do `return (` do componente (antes do wizard normal), adicione um curto-circuito:

```tsx
  if (revealRecord) {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: 1 }}>
            Avaliação concluída
          </div>
        </div>
        <LiveValuationHero
          record={revealRecord}
          mode="reveal"
          onSeeReport={() => navigate(`/resultado/${revealRecord.id}`)}
        />
      </div>
    )
  }
```

> Coloque esse bloco como primeira instrução dentro do componente, após os hooks e handlers, antes do `return` do wizard. Não o coloque dentro de outro `return` condicional já existente.

- [ ] **Step 5: Rodar e ver passar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/ValuationFlow.test.tsx --run`
Expected: PASS — herói revelado com o valor; CTA navega.

- [ ] **Step 6: TypeScript + commit**

Run: `cd ValoraIA_front && npx tsc -b --noEmit 2>&1 | grep ValuationFlow || echo "sem erros"`

```bash
git add ValoraIA_front/src/components/ValuationFlow.tsx ValoraIA_front/src/__tests__/ValuationFlow.test.tsx
git commit -m "feat(front): revelação Avaliação ao Vivo no envio do wizard"
```

---

## Task 9: Integração — herói no topo do `Report`

**Files:**
- Modify: `ValoraIA_front/src/components/Report.tsx` (inserir herói antes da Seção 02, `:280`)
- Modify: `ValoraIA_front/src/__tests__/` test do Report (se existir) ou criar asserção mínima

**Interfaces:**
- Consumes: `LiveValuationHero` (Task 7), `valuation: ValuationRecord` já carregado em `Report.tsx:134`.
- Produces: `<LiveValuationHero mode="static">` renderizado no topo do laudo.

- [ ] **Step 1: Verificar se há teste de Report e escrever/ajustar asserção**

Run: `ls ValoraIA_front/src/__tests__/ | grep -i report || echo "sem teste de report"`

Se existir `Report.test.tsx`, adicione (com `react-leaflet` mockado como na Task 7) ao caso de render com record completo:

```tsx
expect(screen.getByTestId('live-hero')).toBeInTheDocument()
```

Se **não** existir, crie `ValoraIA_front/src/__tests__/Report.hero.test.tsx` mínimo:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'
import Report from '../components/Report'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div />,
  CircleMarker: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

vi.mock('../api', () => ({
  getValuation: vi.fn().mockResolvedValue({
    id: 'val_1', address: 'Av. X, 1, Manaíra, João Pessoa, PB', lat: -7.11, lng: -34.86,
    property_type: 'apartment', area_m2: 98, bedrooms: 3, bathrooms: 2, parking_spaces: 1,
    construction_age: 5, conservation_state: 'regular', terrain_slope: 'plano', street_level: 'no_nivel',
    is_corner: false, static_market_value_brl: 487300, price_per_m2_homogenized: 4972, confidence_score: 82,
    residual_land_value_brl: null, max_buildable_area_m2: null, zoning_params: null, viability_scenarios: null,
    comparables: [], neighborhood_pois: null, amenities: [], in_gated_community: false,
    created_at: '2026-06-01T10:00:00Z',
  }),
}))

describe('Report — herói', () => {
  it('renderiza o LiveValuationHero no topo', async () => {
    render(
      <MemoryRouter initialEntries={['/resultado/val_1']}>
        <Routes><Route path="/resultado/:id" element={<Report />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByTestId('live-hero')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/Report.hero.test.tsx --run`
Expected: FAIL — `live-hero` não existe no Report.

- [ ] **Step 3: Inserir o herói antes da Seção 02**

Em `Report.tsx`, importe no topo:

```tsx
import LiveValuationHero from './LiveValuationHero'
```

Imediatamente antes do `<SectionCard>` que contém `<SectionHeader number="02" …>` (`:280`), insira:

```tsx
      <div style={{ marginBottom: 16 }}>
        <LiveValuationHero record={valuation} mode="static" />
      </div>
```

> A Seção 02 textual permanece como detalhe abaixo do herói. Não remova nada existente.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd ValoraIA_front && npm run test -- src/__tests__/Report.hero.test.tsx --run`
Expected: PASS.

- [ ] **Step 5: Suíte completa do frontend + TypeScript**

Run: `cd ValoraIA_front && npx tsc -b --noEmit 2>&1 | tail -5`
Run: `cd ValoraIA_front && npm run test -- --run`
Expected: toda a suíte verde.

- [ ] **Step 6: Commit**

```bash
git add ValoraIA_front/src/components/Report.tsx ValoraIA_front/src/__tests__/Report.hero.test.tsx
git commit -m "feat(front): herói Avaliação ao Vivo no topo do laudo"
```

---

## Verificação final (após todas as tasks)

- [ ] Backend: `cd ValoraIA_back && npm run test && npm run build`
- [ ] Frontend: `cd ValoraIA_front && npm run test -- --run && npm run build`
- [ ] Smoke manual: `docker-compose up`, criar uma avaliação real → ver a revelação animada → abrir o laudo e confirmar mapa interativo com pins de comparáveis/POIs e popups.

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** coords backend (Tasks 1–2), tipos+deps front (3), ValueCountUp (4), ConfidenceGauge (5), ComparablesMap (6), LiveValuationHero (7), revelação no envio (8), herói no laudo (9). Casos de borda (alvo sem coord, comparável sem coord, score nulo, reduced-motion) cobertos nos componentes e testes. Sem migração de DB, sem mudança no PDF — respeitado.
- **Faixa ±:** regra definida explicitamente em `valueBand()` (Task 7), removendo o "a definir" do spec.
- **Consistência de tipos:** `FrontendComparable.lat/lng` e `NearbyPlace.lat/lng` adicionados em ambos os apps; `toFrontendComparables` exportada e usada no teste; `LiveValuationHero` consome `record.lat/lng/comparables/neighborhood_pois/static_market_value_brl/confidence_score/price_per_m2_homogenized` — todos campos reais de `ValuationRecord` (`types/index.ts:116+`).
