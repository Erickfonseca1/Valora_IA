---
type: topic
title: "RFC — Cache Persistente com Redis"
aliases: ["Cache Redis", "RFC Redis", "Cache Persistente"]
category: "rfc"
status: "open"
people: ["[[erick-fonseca]]"]
actors: ["[[valuation-engine]]", "[[valoraia-back]]"]
objective: "Substituir cache em memória de geocoding e Google Places por Redis persistente, eliminando chamadas duplicadas à API e evitando perda de cache em restart"
created_at: 2026-05-03
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/topic, status/open, category/rfc, domain/backend, domain/dados]
---

# RFC — Cache Persistente com Redis

> Hoje geocoding e Google Places são cacheados em `Map` em memória — reiniciar o servidor limpa tudo. Com Redis (ou Upstash serverless), o cache persiste, reduz custos de API e melhora latência.

## Contexto

O [[valuation-engine]] usa dois caches em memória:
- `geocodeCache: Map<string, GeocodingResult>` — por endereço
- `placesCache: Map<string, number>` — por lat/lng (precisão 6 decimais)

Sem cache persistente, cada restart causa spike de chamadas Google Maps.

## Pessoas Envolvidas

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | decisor e implementador |

## Actors Envolvidos

| Actor | Relação |
|---|---|
| [[valuation-engine]] | onde os caches estão hoje |
| [[valoraia-back]] | infraestrutura que precisaria da conexão Redis |

## Histórico

| Data | Evento |
|---|---|
| 2026-05-03 | Identificado como tech debt e risco de custo |

## Decisões

- Avaliar Upstash Redis (serverless, zero infra, free tier generoso) vs Redis self-hosted
- TTL sugerido: 30 dias para geocoding, 7 dias para Places (POIs mudam menos)

## Próximos Passos

- [ ] Decidir Upstash vs Redis self-hosted (custo vs complexidade)
- [ ] Implementar client Redis no backend
- [ ] Migrar geocodeCache para Redis com TTL 30d
- [ ] Migrar placesCache para Redis com TTL 7d
- [ ] Adicionar rate limiting nas chamadas Google Maps (token bucket)

## Projetos Relacionados

- [[valoraia-v1]] — melhoria de estabilidade para o beta
