# Avaliação ao Vivo — Design

**Data:** 2026-06-19
**Branch base:** `feat/entrada-natural-ia`

## Objetivo

Dar ao ValoraIA o "diferencial que impressiona" no front-end, reaproveitando o motor de avaliação e os dados que **já existem e funcionam**. Sem mudar a matemática nem o esquema do DB: transformar o momento em que o valor aparece numa experiência viva — valor que nasce animado, medidor de confiança e um **mapa interativo** dos comparáveis e POIs que sustentaram o laudo.

Onde aparece: **ambos** os pontos do fluxo.
1. **Transição de envio** (`ValuationFlow`): ao submeter, em vez de spinner, a tela revela o resultado como espetáculo.
2. **Topo do laudo** (`Report`): o mesmo herói fica fixo e interativo no relatório.

## Decisões (fechadas no brainstorming)

| Decisão | Escolha |
|---------|---------|
| Onde o "wow" aparece | Ambos: transição de envio + herói do laudo |
| Elementos | Valor revela animado + gauge de confiança; mapa vivo de comparáveis + POIs |
| Timing do valor | **No envio** — 1 única chamada ao motor (`POST /api/valuations`); sem endpoint de preview |
| Biblioteca de mapa | **react-leaflet + tiles OSM** — sem API key, leve, pins customizáveis |
| Layout do herói | **Split**: valor + gauge à esquerda, mapa interativo à direita (colapsa empilhado no mobile) |
| Precisão dos pins | **Exato** — coord real do listing (credibilidade técnica NBR) |

## Não-objetivos (YAGNI)

- Sem endpoint de preview ao vivo no wizard (rejeitado: rodaria o motor 2x).
- Sem mudança no `LaudoPDF.tsx` — o PDF continua estático; o mapa é só web.
- Sem migração de DB — coords trafegam nos blobs JSONB já persistidos.
- Sem novas libs de animação (framer/d3). Animação via `requestAnimationFrame` + CSS/SVG.

---

## Arquitetura

### Fluxo de dados

```
ValuationFlow (submit)
  └─ api.createValuation(body) ──POST /api/valuations──▶ motor (geocode + query espacial + ensemble)
        ◀── ValuationRecord  { lat, lng, confidence_score,
                               comparables[{…, lat, lng}],
                               neighborhood_pois{ pois[{ places[{…, lat, lng}] }] } }
  └─ <LiveValuationHero record/> (modo "reveal")
        └─ CTA "Ver laudo completo" ─▶ navigate(/resultado/:id)

Report (/resultado/:id)
  └─ GET /api/valuations/[id] ─▶ mesmo ValuationRecord
  └─ <LiveValuationHero record/> (modo "static") no topo da seção de valor
```

O único pré-requisito de backend é **expor as coordenadas** que o motor já calcula mas hoje descarta.

### Mudanças de backend (mínimas, sem DB)

1. **`FrontendComparable`** (`ValoraIA_back/src/types/index.ts` + front mirror): adicionar `lat: number | null`, `lng: number | null`.
2. **`toFrontendComparables`** (`valuation-engine.ts:379`): mapear `lat: row.lat, lng: row.lng` (já existem em `ListingRow`, confirmado em `valuation-engine.ts:522/537`).
3. **`NearbyPlace`** (types): adicionar `lat: number | null`, `lng: number | null`.
4. **`nearby-places.ts`**: cada place já tem `r.geometry.location.lat/lng` (usado em `:71` para distância); passar adiante em vez de descartar.
5. **Persistência**: `comparables` e `neighborhood_pois` são blobs JSONB serializados por completo — as coords fluem automaticamente, sem alteração no insert nem no `newschema.sql`.

### Mudanças de frontend

**Tipos** (`ValoraIA_front/src/types/index.ts`): espelhar `lat/lng` em `FrontendComparable` e `NearbyPlace`.

**Dependências novas:** `leaflet`, `react-leaflet`, `@types/leaflet`. Importar `leaflet/dist/leaflet.css` uma vez.

**Componentes novos** (`ValoraIA_front/src/components/`):

| Componente | Responsabilidade | Entrada | Depende de |
|-----------|------------------|---------|-----------|
| `LiveValuationHero.tsx` | Orquestra o herói split; modo `'reveal' \| 'static'` | `record: ValuationRecord`, `mode` | os 3 abaixo |
| `ValueCountUp.tsx` | Conta de 0 até o valor em BRL via rAF; respeita `prefers-reduced-motion` | `value: number`, `animate: boolean` | — |
| `ConfidenceGauge.tsx` | Arco SVG proporcional a `confidence_score` (0–1); anima `stroke-dashoffset` | `score: number \| null` | — |
| `ComparablesMap.tsx` | Mapa Leaflet: pin do alvo (centro) + pins de comparáveis (queda escalonada) + marcadores POI por categoria com toggle; popup do comp (preço, R$/m², área, link) | `subject {lat,lng}`, `comparables[]`, `pois[]` | react-leaflet |

**Componentes modificados:**

- `ValuationFlow.tsx`: no sucesso do submit, renderizar `<LiveValuationHero mode="reveal">` com o record retornado; CTA navega para `/resultado/:id`. (Hoje provavelmente navega direto — substituir por esse intervalo de revelação.)
- `Report.tsx`: inserir `<LiveValuationHero mode="static">` no topo, ancorando a Seção 02 ("Valor de Mercado Determinado"). A tabela de comparáveis (Seção 03) e POIs (Seção 06) permanecem como detalhe textual sob o mapa.

### Animações (sem libs novas)

- **Valor:** count-up via `requestAnimationFrame`, ~900ms, easing ease-out, formatação `Intl.NumberFormat('pt-BR', BRL)`.
- **Gauge:** arco SVG com `stroke-dasharray`/`stroke-dashoffset` animado por transição CSS ao montar.
- **Pins:** queda escalonada — cada comparável aparece com `transform: translateY` + delay incremental (CSS `animation-delay` por índice).
- **`prefers-reduced-motion`:** desliga count-up e queda; mostra valores finais imediatamente.

### Faixa de valor (±)

A "± faixa" exibida no card deriva de `confidence_score` (sinal já existente) como banda percentual simples sobre `static_market_value_brl` (ex.: maior confiança → banda menor). Regra exata a definir no plano; é apenas apresentação, não entra no DB.

## Tratamento de erros / casos de borda

| Caso | Comportamento |
|------|---------------|
| `lat/lng` do alvo nulo (geocode falhou) | Mapa oculto; mostra só valor + gauge em largura cheia |
| `comparables` vazio/nulo | Mapa centra no alvo; rótulo "sem comparáveis plotáveis" |
| comparável com `lat/lng` nulo | Pin omitido; ainda aparece na tabela textual |
| `confidence_score` nulo | Gauge oculto (sem estado neutro enganoso) |
| Tiles OSM offline | Leaflet mostra fundo cinza; valor/gauge intactos |
| Mobile estreito | Split colapsa para empilhado (valor em cima, mapa embaixo) |

## Testes

**Backend:**
- `toFrontendComparables` inclui `lat/lng` do row.
- `nearby-places` propaga `lat/lng` em cada place.
- Ajustar testes/snapshots existentes do motor que comparem o shape de `comparables`/`neighborhood_pois`.

**Frontend (vitest + testing-library):**
- `ValueCountUp`: renderiza valor final formatado em BRL; sem animação quando `animate=false`.
- `ConfidenceGauge`: comprimento do arco proporcional ao score; nada quando score nulo.
- `ComparablesMap`: renderiza marcador do alvo + N marcadores de comparáveis; popup com preço/R$ por m²/área/link; degrada com coords nulas. (Mock do react-leaflet.)
- `LiveValuationHero`: render de integração com record mockado nos modos `reveal` e `static`; oculta mapa quando alvo sem coords.

## Arquivos

### Novos
- `ValoraIA_front/src/components/LiveValuationHero.tsx`
- `ValoraIA_front/src/components/ValueCountUp.tsx`
- `ValoraIA_front/src/components/ConfidenceGauge.tsx`
- `ValoraIA_front/src/components/ComparablesMap.tsx`
- `ValoraIA_front/src/__tests__/ValueCountUp.test.tsx`
- `ValoraIA_front/src/__tests__/ConfidenceGauge.test.tsx`
- `ValoraIA_front/src/__tests__/ComparablesMap.test.tsx`
- `ValoraIA_front/src/__tests__/LiveValuationHero.test.tsx`

### Modificados
- `ValoraIA_back/src/types/index.ts` — `lat/lng` em `FrontendComparable` e `NearbyPlace`
- `ValoraIA_back/src/lib/math/valuation-engine.ts` — `toFrontendComparables` expõe coords
- `ValoraIA_back/src/lib/geocoding/nearby-places.ts` — propaga coords dos places
- `ValoraIA_front/src/types/index.ts` — espelha `lat/lng`
- `ValoraIA_front/src/components/ValuationFlow.tsx` — revelação no submit
- `ValoraIA_front/src/components/Report.tsx` — herói no topo
- `ValoraIA_front/package.json` — leaflet, react-leaflet, @types/leaflet

## Tema

PRIMARY `#1E3A8A`, ACCENT `#10B981`. Pin do alvo em PRIMARY; comparáveis em ACCENT; POIs em tom neutro/âmbar por categoria. Card de vidro do valor sobre fundo claro.
