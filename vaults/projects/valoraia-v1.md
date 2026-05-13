---
type: project
name: "ValoraIA v1"
aliases: ["ValoraIA v1", "MVP", "v1"]
description: "Versão 1 do SaaS de avaliação imobiliária com IA — do zero ao produto em produção com primeiros usuários pagantes"
status: "active"
deadline: ""
progress: "Motor de avaliação completo (ensemble MCD+IDW + WLS + GBDT), frontend com wizard + relatório + dashboard, Docker Compose funcional. Faltam: auth, migrations, pipeline de dados robusto, cache persistente."
blockers:
  - "Volume de comparáveis insuficiente para cidades além da cidade-alvo inicial"
  - "Sem autenticação — não é possível abrir para usuários externos"
action_items:
  - description: "Implementar autenticação via Supabase Auth"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
  - description: "Documentar e versionar migrations do banco"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
  - description: "Implementar /api/scrape e automatizar pipeline Apify"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
  - description: "Substituir cache em memória por Redis persistente"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
  - description: "Adicionar error boundaries e tratamento de erros no frontend"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
  - description: "Popular base de comparáveis (min 1.000 listings por cidade-alvo)"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
  - description: "Deploy em produção (VPS ou Vercel + Fly.io)"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
  - description: "Criar landing page e formulário de captação de beta users"
    status: "todo"
    deadline: ""
    owner: "[[erick-fonseca]]"
focal_points: ["[[erick-fonseca]]"]
related_topics:
  - "[[2026-05-feature-lancamento-beta]]"
  - "[[2026-05-feature-autenticacao]]"
  - "[[2026-05-feature-pipeline-dados]]"
  - "[[2026-05-rfc-cache-redis]]"
  - "[[2026-05-rfc-migrations]]"
related_actors:
  - "[[valuation-engine]]"
  - "[[valoraia-back]]"
  - "[[valoraia-front]]"
  - "[[supabase-db]]"
related_teams: ["[[valoria-core]]"]
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/project, status/active, domain/produto, domain/crescimento]
---

# ValoraIA v1

> Primeiro SaaS de avaliação imobiliária com ensemble estatístico baseado em NBR 14653 — do protótipo ao produto com usuários pagantes.

## Overview

O ValoraIA implementa avaliação imobiliária profissional (nível NBR 14653 Grau II/III) de forma automatizada e acessível. O motor combina 3 métodos estatísticos (MCD+IDW, WLS, GBDT) com dados reais de mercado obtidos via scraping. O produto entrega: preço estimado em BRL, intervalo de confiança 80%, score de confiança (40–99) e análise de 6 fatores de preço visualizados em radar chart.

O diferencial técnico é sólido. O foco do v1 é transformar a tecnologia em produto — com auth, dados suficientes, confiabilidade e aquisição dos primeiros usuários.

## Status

| Campo | Valor |
|---|---|
| Status | active |
| Deadline | — |
| Progress | Motor completo + frontend funcional. Faltam: auth, migrations, pipeline de dados, cache persistente. |

## Action Items

| Item | Status | Deadline | Owner |
|---|---|---|---|
| Autenticação via Supabase Auth | todo | — | [[erick-fonseca]] |
| Migrations do banco documentadas | todo | — | [[erick-fonseca]] |
| Pipeline Apify automatizado | todo | — | [[erick-fonseca]] |
| Cache Redis persistente | todo | — | [[erick-fonseca]] |
| Error boundaries no frontend | todo | — | [[erick-fonseca]] |
| Popular comparáveis (1k+ por cidade) | todo | — | [[erick-fonseca]] |
| Deploy em produção | todo | — | [[erick-fonseca]] |
| Landing page + captação beta users | todo | — | [[erick-fonseca]] |

## Blockers

- Volume de comparáveis insuficiente — avaliações em cidades sem dados ficam com confiança baixa
- Sem autenticação — impossível abrir para usuários externos com segurança

## Focal Points

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | fundador e único dev |

## Tópicos Relacionados

| Tópico | Relação |
|---|---|
| [[2026-05-feature-lancamento-beta]] | objetivo principal do projeto |
| [[2026-05-feature-autenticacao]] | blocker para beta |
| [[2026-05-feature-pipeline-dados]] | blocker para qualidade das avaliações |
| [[2026-05-rfc-cache-redis]] | melhoria de estabilidade |
| [[2026-05-rfc-migrations]] | risco crítico de infra |

## Actors Relacionados

| Actor | Relação |
|---|---|
| [[valuation-engine]] | núcleo do produto |
| [[valoraia-back]] | API e orquestração |
| [[valoraia-front]] | experiência do usuário |
| [[supabase-db]] | persistência e queries espaciais |

## Times Relacionados

| Time | Relação |
|---|---|
| [[valoria-core]] | time dono do projeto |
