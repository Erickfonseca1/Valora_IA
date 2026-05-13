---
type: topic
title: "RFC — Migrations de Banco Documentadas"
aliases: ["Migrations", "RFC Migrations", "Schema Migrations"]
category: "rfc"
status: "open"
people: ["[[erick-fonseca]]"]
actors: ["[[supabase-db]]", "[[valoraia-back]]"]
objective: "Documentar e versionar as migrations do banco Supabase no repositório, incluindo a RPC search_listings_in_radius e estrutura das tabelas listings e valuations"
created_at: 2026-05-03
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/topic, status/open, category/rfc, domain/dados, domain/backend]
---

# RFC — Migrations de Banco Documentadas

> Risco crítico: o [[valuation-engine]] depende da RPC `search_listings_in_radius` existir no Supabase, mas não há migrations no repositório. Um novo ambiente (dev, staging) não consegue replicar o banco sem acesso manual ao Supabase Studio.

## Contexto

A RPC `search_listings_in_radius` é o ponto de falha mais crítico do sistema — sem ela o motor não consegue buscar comparáveis. Sem migrations versionadas, qualquer novo deploy ou ambiente de staging quebra.

## Pessoas Envolvidas

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | implementador |

## Actors Envolvidos

| Actor | Relação |
|---|---|
| [[supabase-db]] | banco que precisa das migrations |
| [[valoraia-back]] | consome a RPC sem fallback |

## Histórico

| Data | Evento |
|---|---|
| 2026-05-03 | Identificado como risco crítico (sem migrations no repo) |

## Decisões

- Usar Supabase CLI para gerenciar migrations localmente
- Incluir migrations no CI para validar em PRs

## Próximos Passos

- [ ] Instalar Supabase CLI
- [ ] Extrair schema atual do Supabase (supabase db dump)
- [ ] Criar migration inicial: tabelas listings, valuations + RPC search_listings_in_radius
- [ ] Adicionar migrations ao repositório em `supabase/migrations/`
- [ ] Documentar processo de setup local no README

## Projetos Relacionados

- [[valoraia-v1]] — pré-requisito de confiabilidade para o beta
