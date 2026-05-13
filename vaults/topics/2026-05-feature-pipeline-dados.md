---
type: topic
title: "Pipeline de Dados — Ingestão via Apify"
aliases: ["Pipeline de Dados", "Ingestão", "Scraper", "Apify Pipeline"]
category: "feature"
status: "open"
people: ["[[erick-fonseca]]"]
actors: ["[[valoraia-back]]", "[[supabase-db]]"]
objective: "Automatizar ingestão de listings de imóveis via Apify scraper, com deduplicação robusta e volume suficiente de comparáveis por cidade-alvo"
created_at: 2026-05-03
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/topic, status/open, category/feature, domain/dados, domain/backend]
---

# Pipeline de Dados — Ingestão via Apify

> O motor de avaliação é tão bom quanto os dados que alimentam. Hoje o webhook `/api/ingest` existe mas o endpoint `/api/scrape` não está implementado. Volume e qualidade dos comparáveis são gargalos críticos para confiança nas avaliações.

## Contexto

O fluxo atual: Apify scraper → webhook `POST /api/ingest` → upsert no Supabase por `source_url`. A deduplicação é simples (onConflict: source_url) sem merge de amenidades ou atualização de preços. O endpoint `/api/scrape` para trigger programático não foi implementado.

## Pessoas Envolvidas

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | implementador |

## Actors Envolvidos

| Actor | Relação |
|---|---|
| [[valoraia-back]] | endpoint /api/scrape a implementar, webhook /api/ingest já existe |
| [[supabase-db]] | destino dos dados; tabela listings |

## Histórico

| Data | Evento |
|---|---|
| 2026-05-03 | Webhook /api/ingest implementado (auth via x-ingest-secret) |
| 2026-05-03 | /api/scrape configurado mas sem implementação |

## Decisões

- Apify como scraper primário (token já configurado)
- Upsert por source_url como estratégia de deduplicação base

## Próximos Passos

- [ ] Implementar `/api/scrape` para trigger programático do Apify
- [ ] Melhorar lógica de merge no ingest (atualizar preço, amenidades, foto)
- [ ] Definir cidades-alvo para o beta (mínimo 1.000 listings cada)
- [ ] Criar job periódico de scraping (cron ou Apify scheduler)
- [ ] Adicionar validação de qualidade dos dados no ingest
- [ ] Monitorar distribuição geográfica dos comparáveis por cidade

## Projetos Relacionados

- [[valoraia-v1]] — qualidade das avaliações depende deste pipeline
