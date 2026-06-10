# Memória de Cálculo + PDF Vetorial — Design

**Data:** 2026-06-10
**Status:** Aprovado (decisões via AskUserQuestion)

## Objetivo

Duas melhorias no relatório de avaliação (frontend ValoraIA):

1. **Card "Como Chegamos a Este Valor"** — uma memória de cálculo em formato *value waterfall* + legendas em linguagem natural, dando ao avaliador transparência total sobre a construção do valor.
2. **Exportação PDF vetorial** — substituir o `window.print()` (que captura o AppShell inteiro) por um documento PDF estruturado, arquivo-grade, gerado com `@react-pdf/renderer`.

## Decisões de design (confirmadas)

- Card: **waterfall + legendas** (cascata visual de R$/m² → fatores → R$ final).
- Precisão: **preciso, com backend** — persistir os fatores reais de homogeneização.
- PDF: **vetorial via `@react-pdf/renderer`** (documento separado, texto selecionável, qualidade de envio formal).

## A cascata real do engine (fonte da verdade)

Mapeada em `valuation-engine.ts` (`runValuation`):

1. Cada comparável é homogeneizado por `homogenize(row, target_area, typologyFactor)` — **oferta (−10% para `listed`), tipologia e ajuste de área já entram aqui, por comparável**.
2. Ensemble (MCD-IDW + WLS + GBDT) sobre os ppm² homogeneizados → `finalPpm2`.
3. Fatores pós-ensemble (multiplicadores limpos):
   - `physicalFactor = cornerFactor × slopeFactor × levelFactor`
   - `amenityFactor = internalFactor × condoFactor × proximoFactor`
   - `combinedFactor = physicalFactor × amenityFactor`
4. `ppm2_homogenized = finalPpm2 × combinedFactor`
5. `market_value = finalPpm2 × area × combinedFactor`

**Consequência para o waterfall:** oferta/tipologia NÃO são um passo único da cascata (não há um ppm² "pré-oferta" no retorno — cada comparável teve o seu). O waterfall parte do **ppm² do ensemble** e empilha apenas os fatores pós-ensemble (físicos, comodidades). Oferta (−10%) e tipologia aparecem como **contexto na legenda** ("comparáveis já ajustados por oferta −10% e tipologia conforme NBR").

## Parte 1 — Backend: persistir fatores de homogeneização

### Migration (execução manual no Supabase)

`migrations/2026-06-11_homogenization_factors.sql`:
```sql
ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS homogenization_factors jsonb;
```

### Shape do `homogenization_factors`

```ts
interface HomogenizationFactors {
  ensemble_ppm2: number      // finalPpm2 — base unitária (comparáveis homogeneizados + ensemble)
  offer_factor: number       // 0.90 — contexto upstream (por comparável)
  typology_factor: number    // contexto upstream (por comparável)
  corner_factor: number
  slope_factor: number
  level_factor: number
  physical_factor: number    // corner × slope × level
  amenity_internal: number
  amenity_condo: number
  amenity_proximo: number
  amenity_factor: number     // internal × condo × proximo
  combined_factor: number    // physical × amenity
  ppm2_homogenized: number   // ensemble_ppm2 × combined
  area_m2: number
  market_value: number       // ppm2_homogenized × area
}
```

### Mudanças no engine

`runValuation` já calcula todos esses valores localmente. Montar o objeto `homogenization_factors` no retorno (todos os termos já existem: `finalPpm2`, `OFFER_FACTOR`, `typologyFactorUsed`, `cornerFactor`, `slopeFactor`, `levelFactor`, `physicalFactor`, `scope.internalFactor`, `scope.condoFactor`, `proximoFactor`, `combinedFactor`, `pricePerM2Homogenized`, `target_area`, `adjustedEstimatedValue`). Adicionar à interface `ExtendedValuationResult`.

### Persistência e leitura

- `valuations/route.ts` (POST): incluir `homogenization_factors` no insert.
- `valuations/[id]/route.ts` (GET): incluir a coluna no SELECT/mapeamento de retorno.
- Tipo backend (`types/index.ts`): adicionar `homogenization_factors` opcional a `ValuationRecord`.

## Parte 2 — Frontend: tipos + card waterfall

### Tipos

`ValoraIA_front/src/types/index.ts`: adicionar `HomogenizationFactors` e `homogenization_factors?: HomogenizationFactors` a `ValuationRecord`.

### Componente `<ValueWaterfall>`

Nova **seção 02b** no `Report.tsx`, logo após a seção 02 (Valor de Mercado Determinado). Renderiza só se `homogenization_factors` existir.

Layout (cascata vertical):
```
COMO CHEGAMOS A ESTE VALOR

Valor unitário de mercado (ensemble)        R$ 5.200/m²
  ↳ Comparáveis já ajustados por oferta (−10%) e tipologia, conforme NBR.

× Fatores físicos                            × 1,05
  Esquina 1,05 · Topografia 1,00 · Nível 1,00

× Comodidades por escopo                     × 1,08
  Interno 1,06 · Condomínio 1,02 · Entorno 1,00
  ↳ Diferenciais que valorizam o imóvel acima do mercado base.

──────────────────────────────────────────────────────
R$/m² homogeneizado                          R$ 5.897/m²
× Área útil                                  × 98 m²
══════════════════════════════════════════════════════
VALOR DE MERCADO                             R$ 577.906
```

- Cada linha de fator: rótulo + multiplicador (monospace) + sub-breakdown em cinza.
- Fatores neutros (= 1,00) renderizados com cor esmaecida ("sem efeito"); pode-se omitir a linha de sub-breakdown quando todos os componentes são 1,00.
- Legendas em prosa curta abaixo dos passos relevantes (`↳`), tom explicativo para o avaliador.
- Reusa `SectionCard`/`SectionHeader`, paleta `PRIMARY`/`ACCENT`, helpers `fmt`/`fmtM2`.
- Sem dependências novas; só apresentação.

**Fallback:** se `homogenization_factors` ausente (avaliações antigas), a seção não renderiza — sem quebra.

## Parte 3 — Frontend: PDF vetorial

### Dependência

`@react-pdf/renderer` (vetorial, texto selecionável, sem rasterização).

### Componente `LaudoPDF.tsx`

Documento react-pdf que espelha o laudo, usando primitivas `Document/Page/View/Text/StyleSheet` (não HTML/CSS). Seções:

1. Cabeçalho/letterhead (Nº laudo, data, endereço, marca ValoraIA).
2. Ficha técnica (tabela).
3. Comodidades por escopo (se houver).
4. Valor de mercado + grau de confiança.
5. **Memória de cálculo (waterfall)** — mesma lógica do card, em layout PDF.
6. Tabela de comparáveis homogeneizados.
7. Análise involutiva / abismo de valor (se aplicável).
8. Vizinhança (se houver).
9. Aviso legal + rodapé paginado (`Página X de Y`).

Tudo derivado do mesmo `ValuationRecord` — sem novas chamadas de API.

### Disparo do download

Substituir o botão "Imprimir / PDF" por geração via `@react-pdf/renderer`:
- `import { pdf } from '@react-pdf/renderer'` → `const blob = await pdf(<LaudoPDF valuation={valuation} />).toBlob()` → download com nome `Laudo-${laudoId}.pdf`.
- Estado de loading no botão ("Gerando PDF…") enquanto resolve.
- Alternativa equivalente: `<PDFDownloadLink>`; a decisão fica para o plano (preferência por `pdf().toBlob()` para controlar o nome do arquivo e o estado de loading).

`window.print()` é removido.

## Arquivos afetados

**Backend:**
- Create `migrations/2026-06-11_homogenization_factors.sql`
- Modify `ValoraIA_back/src/lib/math/valuation-engine.ts` (montar `homogenization_factors` no retorno + interface)
- Modify `ValoraIA_back/src/app/api/valuations/route.ts` (insert)
- Modify `ValoraIA_back/src/app/api/valuations/[id]/route.ts` (select/map)
- Modify `ValoraIA_back/src/types/index.ts` (tipo)

**Frontend:**
- Modify `ValoraIA_front/src/types/index.ts` (tipos)
- Modify `ValoraIA_front/src/components/Report.tsx` (seção 02b + botão PDF)
- Create `ValoraIA_front/src/components/ValueWaterfall.tsx`
- Create `ValoraIA_front/src/components/LaudoPDF.tsx`
- Modify `ValoraIA_front/package.json` (`@react-pdf/renderer`)
- Tests para waterfall (cálculo de exibição) e tipos

## Testes

- Backend: teste de que `runValuation` retorna `homogenization_factors` coerente (combined = physical × amenity; market_value = ppm2_homog × area).
- Frontend: teste do `<ValueWaterfall>` (renderiza passos, omite/esmaece neutros, valor final correto); teste de que `Report` mostra a seção quando há `homogenization_factors` e a oculta quando ausente.
- PDF: smoke test de que `pdf(<LaudoPDF/>).toBlob()` resolve sem lançar (jsdom pode limitar; se necessário, testar a montagem do componente, não o blob).

## Fora de escopo

- Print CSS (descartado em favor do PDF vetorial).
- Recalcular valores no frontend (todos vêm do backend).
- Backfill de `homogenization_factors` em avaliações antigas (fallback de UI cobre).
