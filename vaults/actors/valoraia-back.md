---
type: actor
name: "valoraia-back"
aliases: ["ValoraIA Backend", "Backend", "API"]
category: "monolith"
description: "Backend Next.js 16 com App Router. Expõe as APIs de avaliação, dashboard, ingestão e scraping. Conecta ao Supabase/PostGIS e orquestra o motor de avaliação."
repository: ""
stack: "TypeScript · Next.js 16.2 · React 19 · Supabase SSR · Zod · Swagger UI"
status: "active"
team: "[[valoria-core]]"
criticality: "high"
pci: false
known_issues:
  - "Endpoint /api/scrape configurado mas sem implementação"
  - "Sem autenticação — todos endpoints públicos exceto /api/ingest"
  - "Sem rate limiting"
  - "Swagger /api/docs referenciado mas não gerado"
  - "Sem migrations de banco documentadas no repo"
sources: []
last_synced_at: ""
last_synced_sha: ""
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/actor, status/active, domain/backend, domain/produto]
---

# ValoraIA Backend

> API Next.js 16 que orquestra o [[valuation-engine]], persiste avaliações no Supabase e serve dados para o [[valoraia-front]].

## Details

| Campo | Valor |
|---|---|
| Repositório | `ValoraIA_back/` |
| Stack | TypeScript · Next.js 16.2 · Supabase · Zod |
| Status | active |
| Criticidade | high |
| Time | [[valoria-core]] |

## Endpoints

| Método | Rota | Função |
|---|---|---|
| POST | `/api/valuations` | Cria avaliação (fluxo principal) |
| GET | `/api/valuations/:id` | Busca avaliação salva |
| GET | `/api/dashboard/metrics` | KPIs do dashboard |
| GET | `/api/dashboard/valuations` | Histórico paginado |
| GET | `/api/market/trend` | Tendência mensal ppm² por cidade |
| POST | `/api/ingest` | Webhook Apify (autenticado via x-ingest-secret) |
| POST | `/api/evaluate` | Avaliação standalone (sem salvar) |
| GET | `/api/docs` | Swagger UI |
| POST | `/api/scrape` | Trigger scraper Apify (não implementado) |

## Dependências

- Depende de: [[valuation-engine]] (motor estatístico)
- Depende de: [[supabase-db]] (persistência + RPC PostGIS)
- Depende de: Google Maps Geocoding API
- Depende de: Google Places API
- Depende de: Apify (scraper — parcialmente integrado)
- Consumido por: [[valoraia-front]] (todas as chamadas API)

## Tópicos Relacionados

- [[2026-05-feature-autenticacao]] — endpoints públicos precisam de proteção
- [[2026-05-feature-pipeline-dados]] — webhook de ingestão central aqui
- [[2026-05-feature-lancamento-beta]] — pré-requisito para beta
