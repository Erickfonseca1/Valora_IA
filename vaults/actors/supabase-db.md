---
type: actor
name: "supabase-db"
aliases: ["Supabase", "Banco de Dados", "PostGIS"]
category: "producer"
description: "Banco PostgreSQL gerenciado pelo Supabase com extensão PostGIS para queries espaciais. Armazena listings de imóveis e avaliações geradas."
repository: ""
stack: "PostgreSQL · PostGIS · Supabase · Row-Level Security"
status: "active"
team: "[[valoria-core]]"
criticality: "very-high"
pci: false
known_issues:
  - "Sem migrations documentadas no repositório"
  - "RPC search_listings_in_radius assume existência sem fallback"
  - "Sem estratégia de backup documentada"
sources: []
last_synced_at: ""
last_synced_sha: ""
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/actor, status/active, domain/dados, domain/backend]
---

# Supabase / PostGIS

> Banco de dados central. Armazena comparáveis de imóveis (alimentados via Apify) e avaliações geradas pelo [[valuation-engine]]. RPC `search_listings_in_radius` é o ponto crítico de integração espacial.

## Details

| Campo | Valor |
|---|---|
| Host | `beqoyqpsqtmqbhglrven.supabase.co` |
| Stack | PostgreSQL · PostGIS · Supabase RLS |
| Status | active |
| Criticidade | very-high |
| Time | [[valoria-core]] |

## Tabelas Principais

| Tabela | Função |
|---|---|
| `listings` | Comparáveis de imóveis (fonte: Apify scraper) |
| `valuations` | Avaliações geradas pelo motor |

## RPC Crítico

```sql
search_listings_in_radius(
  p_lat float,
  p_lng float,
  p_radius_m int,
  p_area_target float,
  p_area_tolerance float,
  p_bedrooms int,
  p_limit int
)
```

Retorna comparáveis dentro do raio com filtros de área e quartos. Sem esta função o motor falha hard.

## Dependências

- Alimentado por: Apify scraper via `POST /api/ingest` no [[valoraia-back]]
- Consumido por: [[valuation-engine]] (busca de comparáveis via RPC)
- Consumido por: [[valoraia-back]] (persistência de avaliações)

## Tópicos Relacionados

- [[2026-05-feature-pipeline-dados]] — qualidade do banco depende da ingestão
- [[2026-05-rfc-migrations]] — ausência de migrations é risco crítico
