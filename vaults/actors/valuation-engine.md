---
type: actor
name: "valuation-engine"
aliases: ["Motor de Avaliação", "Valuation Engine", "Engine"]
category: "api"
description: "Motor de avaliação imobiliária com ensemble de 3 métodos estatísticos (MCD+IDW, WLS, GBDT), implementando NBR 14653 Grau II/III"
repository: ""
stack: "TypeScript · Next.js 16 · Supabase/PostGIS · Google Maps API · Google Places API"
status: "active"
team: "[[valoria-core]]"
criticality: "very-high"
pci: false
known_issues:
  - "Cache geocoding/Places em memória — perde ao reiniciar"
  - "Sem rate limiting nas chamadas Google Maps"
  - "WLS usa Gauss-Jordan inline — sem biblioteca de álgebra linear"
  - "Mensagem de erro genérica quando não há comparáveis suficientes"
sources: []
last_synced_at: ""
last_synced_sha: ""
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/actor, status/active, domain/backend, domain/dados, domain/imobiliario]
---

# Motor de Avaliação

> Núcleo do ValoraIA. Implementa avaliação imobiliária seguindo NBR 14653 via ensemble de precisão ponderada com 3 métodos estatísticos. Retorna preço estimado (BRL), intervalo de confiança 80%, score de confiança (40–99) e 6 fatores de preço para radar chart.

## Details

| Campo | Valor |
|---|---|
| Repositório | `ValoraIA_back/src/lib/math/valuation-engine.ts` (558 linhas) |
| Ensemble | `ValoraIA_back/src/lib/math/ensemble.ts` (189 linhas) |
| Stack | TypeScript · Next.js 16 · Supabase PostGIS · Google APIs |
| Status | active |
| Criticidade | very-high |
| Time | [[valoria-core]] |

## Arquitetura do Ensemble

### Método 1 — MCD+IDW

- Busca comparáveis dentro de raio 1km→5km via RPC PostGIS `search_listings_in_radius`
- **Homogeneização**: `ppm2_adj = ppm2 × OFFER_FACTOR × (area_alvo / area_comp)^0.7 × fator_tipologia`
  - `OFFER_FACTOR = 0.90` (desconto oferta→venda de 10%)
  - `AREA_EXPONENT = 0.7` (escalonamento alométrico NBR)
- Remoção de outliers por IQR antes da ponderação
- Pesos inversamente proporcionais à distância²
- Retorna média ponderada ± IC 80%
- **Peso no ensemble**: `0.40 + (n_eff / 30) × 0.60` → range 0.4–1.0

### Método 2 — WLS (Regressão por Mínimos Quadrados Ponderados)

- Features: área, quartos, banheiros, vagas, dlat, dlng (6 variáveis)
- Modelo linear de 7 parâmetros com pesos IDW
- Inclusão condicional: ≥8 amostras **e** R² ≥ 0.30
- Retorna ppm2 predito, R², RMSE, intervalo de predição
- **Peso no ensemble**: `R² × 1.2` → range 0–1.2

### Método 3 — GBDT (Gradient Boosted Decision Trees)

- 80 decision stumps, learning rate 0.12, subsampling estocástico 80%
- Estimativa OOB de RMSE para robustez
- Feature importance scores
- Inclusão condicional: ≥10 amostras
- **Peso no ensemble**: `max(0.2, 1 − oob_rmse/predito × 2)` → range 0.2–1.0

### Combinação Final

```
ppm2_final = Σ(ppm2_método × peso_método) / Σ(pesos)
```

IC: começa com IC do MCD, alarga para spread entre métodos se divergência significativa.

## Fatores de Preço (Radar Chart)

| Fator | Fórmula | Domínio |
|---|---|---|
| Mercado Local | `1 − (dist_média / raio_usado)` | [0,1] |
| Consistência | `1 − (CV × 2)` | [0,1] |
| Volume de Dados | `0.4 + (n / 100) × 0.6` | [0.4,1] |
| Perfil da Região | `1 − |área_alvo − área_média| / área_média` | [0,1] |
| Comodidades | `0.40 + Σ(pesos_amenities)` (cap 1.0) | [0.4,1] |
| Cobertura | `1 − (std_espacial / raio)` | [0,1] |

## Pesos de Amenidades

| Categoria | Peso | Exemplos |
|---|---|---|
| Premium | 0.20 | Piscina, Rooftop, Vista Mar, Cobertura |
| Alto | 0.15 | Academia, Portaria 24h, Elevador, Salão de Festas |
| Médio | 0.10 | Varanda, Churrasqueira, Quadra |
| Básico | 0.05 | Interfone, Ar condicionado, Pet friendly |

## Fallback Progressivo (busca de comparáveis)

1. ±20% área + quartos iguais
2. ±20% área + ignora quartos
3. ±40% área + ignora quartos
4. ±60% área + ignora quartos
5. ±100% área (qualquer tamanho)

Mínimo de 5 amostras para avaliação válida.

## Dependências

- Depende de: [[supabase-db]] via RPC `search_listings_in_radius` (PostGIS)
- Depende de: Google Maps Geocoding API (lat/lng do endereço)
- Depende de: Google Places Nearby Search API (POI score do bairro)
- Consumido por: [[valoraia-back]] (endpoint `POST /api/valuations` e `POST /api/evaluate`)

## Known Issues

- Cache geocoding/Places em memória — reiniciar servidor limpa o cache (sem Redis)
- Sem rate limiting nas chamadas Google Maps — risco de estouro de cota
- WLS usa Gauss-Jordan inline — adequado para 7×7 mas QR seria mais robusto
- Mensagem de erro genérica "Comparáveis insuficientes" — usuário não sabe se é endereço não encontrado ou área muito nichada

## Tópicos Relacionados

- [[2026-05-feature-pipeline-dados]] — qualidade e volume dos comparáveis impacta diretamente o engine
- [[2026-05-feature-autenticacao]] — acesso ao engine precisa ser protegido por auth
- [[2026-05-rfc-cache-redis]] — proposta de cache persistente para substituir in-memory
