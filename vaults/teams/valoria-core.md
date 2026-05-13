---
type: team
name: "valoria-core"
aliases: ["ValoraIA Core", "Time ValoraIA"]
scope: "Desenvolvimento e evolução do produto ValoraIA — motor de avaliação imobiliária com IA"
purpose: "Construir o melhor motor de avaliação imobiliária do Brasil, seguindo NBR 14653 com ensemble estatístico moderno"
members: ["[[erick-fonseca]]"]
actors: ["[[valuation-engine]]", "[[valoraia-back]]", "[[valoraia-front]]"]
jira_board: ""
confluence_space: ""
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/team, domain/produto, domain/backend, domain/frontend]
---

# ValoraIA Core

> Responsável por todo o ciclo de desenvolvimento do ValoraIA: motor de avaliação, APIs, frontend e infraestrutura.

## Members

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | Fundador & Engenheiro |

## Actors sob Ownership

| Actor | Categoria | Status |
|---|---|---|
| [[valuation-engine]] | api | active |
| [[valoraia-back]] | monolith | active |
| [[valoraia-front]] | monolith | active |

## Responsabilidades

- Manutenção e evolução do motor de avaliação (NBR 14653 + ensemble)
- Ingestão e qualidade dos dados de comparáveis via Apify/Supabase
- UX do fluxo de avaliação e dashboard
- Integrações externas: Google Maps, Google Places, Apify
- Infraestrutura Docker e deploy
