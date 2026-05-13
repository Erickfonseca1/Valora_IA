# Auditoria PTAM — Estado Atual do Motor, Renderer, Schema e Zoneamento

> Snapshot técnico em 2026-05-13. Base: branch `main`, último commit `bd5fda5`.

---

## 1. JSON Real do Motor (Output Shape)

Sem valuação real persistida no repo. Não há registros de produção locais, nem fixture para "Rua José Vilar". Para gerar JSON real do imóvel, rodar endpoint local:

```bash
curl -X POST http://localhost:3000/api/valuations \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Rua José Vilar, [número], Manaíra, João Pessoa, PB",
    "property_type": "apartment",
    "area_m2": 98,
    "bedrooms": 3,
    "bathrooms": 2,
    "parking_spaces": 1,
    "construction_age": 15,
    "conservation_state": "regular",
    "is_corner": false,
    "terrain_slope": "plano",
    "street_level": "no_nivel"
  }'
```

### Shape completo produzido por `ExtendedValuationResult` + persistência em `valuations`

```json
{
  "id": "val_xxx",
  "address": "Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB",
  "neighborhood": "Manaíra",
  "city": "João Pessoa",
  "property_type": "apartment",
  "area_m2": 98,
  "bedrooms": 3,
  "bathrooms": 2,
  "parking_spots": 1,
  "construction_age": 15,
  "conservation_state": "regular",
  "terrain_slope": "plano",
  "street_level": "no_nivel",
  "is_corner": false,

  "static_market_value_brl": 505000,
  "price_per_m2_homogenized": 5153.06,
  "confidence_score": 88,

  "price_range_min_brl": 485000,
  "price_range_max_brl": 525000,

  "price_factors": [
    { "label": "Mercado Local",     "score": 0.85 },
    { "label": "Consistência",      "score": 0.72 },
    { "label": "Volume de Dados",   "score": 0.66 },
    { "label": "Perfil da Região",  "score": 0.78 },
    { "label": "Cobertura",         "score": 0.60 },
    { "label": "Comodidades",       "score": 0.55 },
    { "label": "Vizinhança",        "score": 0.71 }
  ],

  "comparables": [
    {
      "address": "Rua João Câncio, 200",
      "neighborhood": "Manaíra",
      "price_brl": 490000,
      "area_m2": 95,
      "bedrooms": 3,
      "price_m2_brl": 5157,
      "status": "listed",
      "transaction_date": "2026-04-15",
      "source_url": "https://zapimoveis.com.br/...",
      "amenities": ["Piscina", "Elevador"],
      "images": ["https://..."]
    }
  ],

  "method_estimates": [
    { "method": "mcd_idw", "predicted_ppm2": 5100, "weight": 0.78, "meta": { "n_eff": 14.2 } },
    { "method": "wls",     "predicted_ppm2": 5200, "weight": 0.55, "meta": { "r_squared": 0.46, "rmse": 412, "n": 18 } },
    { "method": "gbdt",    "predicted_ppm2": 5050, "weight": 0.62, "meta": { "oob_rmse": 380, "n": 18, "feature_importances": {} } }
  ],
  "primary_method": "ensemble",
  "typology_factor": 1.0,

  "neighborhood_pois": {
    "pois": [
      { "category": "education", "label": "Escolas", "score": 0.82, "weight": 0.20, "places": [] },
      { "category": "health",    "label": "Hospitais", "score": 0.65, "weight": 0.15, "places": [] }
    ],
    "totalScore": 0.71
  },

  "homogenization_factors": {
    "offer_factor": 0.90,
    "corner_factor": 1.0,
    "slope_factor": 1.0,
    "level_factor": 1.0,
    "combined_factor": 1.0
  },

  "depreciation_coefficient": 0.18,
  "remaining_value_pct": 0.82,

  "zoning_params": { "IAb": 1.0, "IAmax": 2.0, "TO": 0.5 },
  "residual_land_value_brl": null,
  "max_buildable_area_m2": null,
  "viability_scenarios": null,

  "created_at": "2026-05-13T..."
}
```

Para `property_type=land`: `viability_scenarios`, `residual_land_value_brl`, `max_buildable_area_m2` populados; `static_market_value_brl` pode ser null.

Fixture mais completa do repo: [ValoraIA_front/src/__tests__/Report.test.tsx:6-77](ValoraIA_front/src/__tests__/Report.test.tsx#L6-L77)

---

## 2. Renderer Atual do PTAM

**Único artefato**: componente React + `window.print()`. Sem lib de PDF (pdfkit, puppeteer, react-pdf). Geração = HTML estilizado com CSS print media.

Arquivo: [ValoraIA_front/src/components/Report.tsx](ValoraIA_front/src/components/Report.tsx)

### Estrutura (6 seções + header/footer)

| # | Seção | Linhas |
|---|---|---|
| Header | Cabeçalho "Parecer Técnico de Avaliação Mercadológica" + laudo ID `PTAM-{6 dígitos}` | 166–196 |
| 01 | Ficha Técnica (metadata do imóvel) | 199–215 |
| 02 | Valor de Mercado Determinado + confidence score | 218–254 |
| 03 | Tabela de Imóveis Referenciais Homogeneizados | 257–325 |
| 04 | Análise Involutiva (cenários viabilidade) | 328–385 |
| 05 | Abismo de Valor (mercado vs. desenvolvimento) | 388–438 |
| 06 | Análise de Vizinhança (POIs) | 441–484 |
| Footer | Disclaimer NBR 14.653-1 + IA generated | 487–500 |

Botão "Imprimir/PDF" → [Report.tsx:517](ValoraIA_front/src/components/Report.tsx#L517). Browser converte para PDF nativamente.

### Gaps vs. PTAM formal NBR

- Falta seção de pressupostos/limitações detalhada
- Falta memorial de cálculo (mostra resultado, não fórmulas)
- Falta seção de identificação do avaliador/CREA/CRECI
- Falta declaração de responsabilidade técnica
- Falta planta de localização/croqui
- Falta data-base de pesquisa explícita
- Sem assinatura digital/anexos fotográficos formais

---

## 3. Schema/Contrato das Entradas

### Frontend Form

Arquivo: [ValoraIA_front/src/types/index.ts:173-187](ValoraIA_front/src/types/index.ts#L173-L187)

```typescript
interface ValuationForm {
  address: string                          // obrigatório, string livre
  propertyType: "apartment"|"house"|"commercial"|"land"
  area: string                             // obrigatório, > 0

  // condicional (apenas apartment/house):
  bedrooms: string                         // 0–20
  bathrooms: string                        // 0–20
  parking_spaces: string                   // 0–20

  // opcionais PTAM V2:
  construction_age: string                 // 0–200
  conservation_state: ''|'novo'|'entre_novo_e_regular'|'regular'
                      |'reparos_simples'|'reparos_importantes'|'critico'
  is_corner: boolean
  terrain_slope: ''|'plano'|'aclive_leve'|'declive_leve'
                 |'aclive_acentuado'|'declive_acentuado'
  street_level: ''|'no_nivel'|'abaixo_nivel'|'acima_nivel'

  // opcionais — análise visual:
  photos: File[]                           // max 10, image/*
  photoUrls: string[]                      // populated após upload → Gemini Vision
}
```

Validação cliente: apenas `address` non-empty + `area > 0`. Resto livre.

### Backend Zod Schema

Arquivo: [ValoraIA_back/src/app/api/valuations/route.ts:13-32](ValoraIA_back/src/app/api/valuations/route.ts#L13-L32)

```typescript
ValuationCreateSchema = z.object({
  address: z.string().min(5).max(500),
  property_type: z.enum(["apartment","house","commercial","land"]),
  area_m2: z.number().positive(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  parking_spaces: z.number().int().min(0).max(20).optional(),
  lat: z.number().min(-90).max(90).optional(),       // backend geocoda se ausente
  lng: z.number().min(-180).max(180).optional(),
  construction_age: z.number().int().min(0).max(300).optional(),
  conservation_state: z.enum([6 estados]).optional(),
  terrain_slope: z.enum([5 valores]).optional(),
  street_level: z.enum([3 valores]).optional(),
  is_corner: z.boolean().optional(),
});
```

### Campos faltantes no form vs. necessários para PTAM completo

- `zoning_params` (IAb, IAmax, TO) — para terrenos, hoje stub
- `area_terreno` — separado de `area_m2` (área construída)
- `padrao_construtivo` — alto/médio/popular (Ross-Heidecke usa default `medium`)
- `amenities[]` — não no form de avaliação (só no ingest de scraping)
- `frente_lote`, `profundidade` — para fator de testada
- Coordenadas/identificação do imóvel (matrícula, IPTU)
- Identificação do avaliador

---

## 4. Zoneamento Hoje

**Stub hardcoded. Sem input, sem base, sem API.**

Local exato: [ValoraIA_back/src/app/api/valuations/route.ts:73](ValoraIA_back/src/app/api/valuations/route.ts#L73)

```typescript
// Zoning stub (no public BR zoning API — urban default)
const zoning_params: ZoningParams = { IAb: 1.0, IAmax: 2.0, TO: 0.5 };
```

Aplicado apenas quando `property_type === "land"` ([route.ts:140](ValoraIA_back/src/app/api/valuations/route.ts#L140)).

### Consequências

- Mesmo IAmax=2.0 para qualquer cidade/zona do Brasil
- Cenários de viabilidade (Conservador/Base/Otimista) proporcionais a esse 2.0
- Resultado involutivo **não reflete plano diretor real** de nenhum município

### Caminhos para corrigir (ordem de complexidade)

| Opção | Esforço | Cobertura |
|---|---|---|
| Input manual no form (campos IAb/IAmax/TO) | baixo | universal, depende do usuário |
| Base municipal hardcoded (JSON com zonas de SP, RJ, JP, etc.) | médio | cidades cobertas |
| Integração GeoSampa (SP), PMJP (JP), etc. via APIs municipais | alto | fragmentado, sem padrão BR |
| Scraping de planos diretores PDF + dataset geoespacial | muito alto | melhor cobertura possível |

Nenhuma cidade tem zoneamento real implementado hoje.

---

## Resumo Acionável

Para preencher gap PTAM-NBR no curto prazo:

1. Rodar endpoint local com payload Rua José Vilar → JSON real
2. Renderer Report.tsx falta seções formais NBR (memorial, avaliador, pressupostos)
3. Form precisa de: zoneamento manual, área terreno separada, padrão construtivo
4. Zoneamento: começar com input manual + base hardcoded para JP (cidade alvo)
