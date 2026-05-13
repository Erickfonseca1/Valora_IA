---
type: actor
name: "valoraia-front"
aliases: ["ValoraIA Frontend", "Frontend", "SPA"]
category: "monolith"
description: "SPA React 18/Vite com 3 rotas: Dashboard, Wizard de Avaliação e Relatório. Servido via Nginx com proxy reverso para o backend."
repository: ""
stack: "TypeScript · React 18.3 · Vite 6 · React Router 7 · Tailwind CSS 3 · Nginx"
status: "active"
team: "[[valoria-core]]"
criticality: "high"
pci: false
known_issues:
  - "Sem error boundaries adequadas nos componentes"
  - "Testes unitários estruturados mas vazios"
  - "Sem tratamento de estados de loading granular"
sources: []
last_synced_at: ""
last_synced_sha: ""
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/actor, status/active, domain/frontend, domain/produto]
---

# ValoraIA Frontend

> SPA React que guia o usuário pelo wizard de avaliação em 3 etapas, exibe o relatório com radar chart de fatores de preço e apresenta o dashboard com histórico e tendência de mercado.

## Details

| Campo | Valor |
|---|---|
| Repositório | `ValoraIA_front/` |
| Stack | React 18 · Vite 6 · Tailwind 3 · React Router 7 |
| Status | active |
| Criticidade | high |
| Time | [[valoria-core]] |

## Rotas

| Rota | Componente | Função |
|---|---|---|
| `/` | Dashboard | KPIs, histórico de avaliações, gráfico de tendência |
| `/nova-avaliacao` | ValuationFlow | Wizard 3 etapas (2 para terreno/comercial) |
| `/resultado/:id` | Report | Relatório completo com radar chart e comparáveis |

## Fluxo Principal

1. Usuário preenche endereço (geocoding automático) + tipo de imóvel
2. Área, quartos, banheiros, vagas
3. Amenidades (somente apartamento/casa)
4. Submit → `POST /api/valuations` → redirect para `/resultado/:id`

## Dependências

- Consome: [[valoraia-back]] (todas as chamadas)
- Servido por: Nginx (proxy `/api/` → backend:3000)

## Tópicos Relacionados

- [[2026-05-feature-lancamento-beta]] — UX precisa de polish antes do beta
- [[2026-05-feature-autenticacao]] — precisa de login/logout no frontend
