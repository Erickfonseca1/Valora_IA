---
type: discussion
title: "Avaliação de Produto — Estado Atual e Próximos Passos"
aliases: ["Product Review", "Avaliação Inicial", "Diagnóstico v1"]
date: 2026-05-03
summary: "Diagnóstico completo do ValoraIA como produto: o que está pronto, o que bloqueia o beta e o roadmap priorizado para os próximos passos."
conclusions:
  - "Motor de avaliação é tecnicamente sólido e diferenciado — NBR 14653 + ensemble é raro no mercado BR"
  - "O produto está a ~6-8 semanas de um beta fechado funcional"
  - "Os 3 blockers críticos são: autenticação, migrations de banco e volume de dados"
  - "Tech debt de médio prazo (cache, rate limiting, error handling) não bloqueia beta mas aumenta risco"
  - "Falta stack de aquisição/feedback — sem ela o beta não gera aprendizado"
action_items:
  - "Implementar autenticação Supabase Auth — owner: [[erick-fonseca]]"
  - "Versionar migrations no repo (supabase/migrations/) — owner: [[erick-fonseca]]"
  - "Automatizar pipeline Apify (implementar /api/scrape) — owner: [[erick-fonseca]]"
  - "Popular 1.000+ comparáveis na cidade-alvo do beta — owner: [[erick-fonseca]]"
  - "Adicionar error boundaries no frontend — owner: [[erick-fonseca]]"
  - "Substituir cache in-memory por Redis (Upstash) — owner: [[erick-fonseca]]"
  - "Deploy em produção com domínio próprio — owner: [[erick-fonseca]]"
  - "Criar landing page + formulário de captação de beta users — owner: [[erick-fonseca]]"
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
related_people: ["[[erick-fonseca]]"]
related_projects: ["[[valoraia-v1]]"]
related_teams: ["[[valoria-core]]"]
source: "session"
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/discussion, domain/produto, domain/crescimento]
---

# Avaliação de Produto — Estado Atual e Próximos Passos

> Diagnóstico completo do ValoraIA como produto: o que está pronto, o que bloqueia o beta e o roadmap priorizado. Feito via análise profunda do código e arquitetura.

---

## O que está pronto (e bem-feito)

### Motor de Avaliação — diferencial técnico real

O [[valuation-engine]] é o ativo mais valioso do projeto. Implementa NBR 14653 Grau II/III com ensemble de 3 métodos:

- **MCD+IDW**: homogeneização com offer factor (0.90), expoente de área alométrico (0.7), remoção IQR de outliers e ponderação inversa à distância²
- **WLS**: regressão linear de 7 parâmetros com pesos IDW — inclui só se R² ≥ 0.30 e ≥8 amostras
- **GBDT**: 80 decision stumps com subsampling 80%, estimativa OOB de RMSE

A combinação via média ponderada por precisão (com fallback progressivo de raio e tolerância de área) é robusta. Poucos concorrentes no Brasil implementam algo neste nível de rigor estatístico.

**Score de confiança (40–99)** é bem calibrado: penaliza CI largo e amostra pequena, premia estabilidade entre métodos.

**6 fatores de preço para radar chart** são boa UX — transformam complexidade estatística em insight visual para o usuário.

### Frontend — fluxo completo e funcional

- Wizard 3 etapas com lógica condicional (amenidades só para casa/apartamento) ✅
- Dashboard com KPIs e histórico ✅
- Relatório com radar chart, comparáveis e estimativas por método ✅
- Tooltip de bairro com POIs do Google Places ✅

### Infraestrutura

- Docker Compose funcional (backend + frontend + proxy Nginx) ✅
- Supabase/PostGIS para queries espaciais ✅
- Zod para validação de input ✅

---

## Gaps que bloqueiam o beta

### 🔴 Crítico 1 — Sem Autenticação

Todos os endpoints são públicos (exceto `/api/ingest` com x-ingest-secret). Impossível abrir para usuários externos:
- Qualquer pessoa acessa avaliações de qualquer outra
- Sem isolamento de dados por usuário
- Sem controle de uso / rate limiting por usuário

**Solução**: Supabase Auth (já na stack) + RLS policies + middleware Next.js. Esforço estimado: 1–2 semanas.

Veja: [[2026-05-feature-autenticacao]]

### 🔴 Crítico 2 — Migrations de Banco não Versionadas

O motor depende 100% da RPC `search_listings_in_radius` existir no Supabase. Sem migrations no repo, um novo ambiente (dev, staging, disaster recovery) não consegue replicar o banco. É um risco de infra grave disfarçado de detalhe.

**Solução**: Supabase CLI + dump do schema atual + migrations em `supabase/migrations/`. Esforço: 2–3 dias.

Veja: [[2026-05-rfc-migrations]]

### 🔴 Crítico 3 — Volume de Dados Insuficiente

O motor é tão bom quanto os dados que alimenta. Sem comparáveis suficientes (mínimo ~500–1.000 por cidade-alvo), as avaliações ficam com confiança baixa e intervalos largos — experiência ruim para o usuário.

O endpoint `/api/scrape` para trigger do Apify não está implementado. A deduplicação no ingest é simples (sem merge de preço ou amenidades em updates).

**Solução**: implementar `/api/scrape`, melhorar merge no ingest, rodar scraping agressivo na cidade-alvo do beta. Esforço: 1 semana.

Veja: [[2026-05-feature-pipeline-dados]]

---

## Tech debt de médio prazo (não bloqueia beta, mas aumenta risco)

### 🟡 Cache em Memória (geocoding + Google Places)

Reiniciar o servidor limpa o cache → spike de chamadas Google Maps → risco de estouro de cota e custo.

**Solução**: Upstash Redis (serverless, free tier, zero infra). Esforço: 1–2 dias.

Veja: [[2026-05-rfc-cache-redis]]

### 🟡 Sem Error Boundaries no Frontend

Erros em runtime quebram a tela sem feedback claro ao usuário. Especialmente problemático no wizard e no relatório.

**Solução**: React Error Boundary nos componentes principais + fallback UI com retry. Esforço: 1 dia.

### 🟡 Mensagem de Erro Genérica no Motor

"Comparáveis insuficientes" não diz ao usuário se é endereço inválido, cidade sem dados ou área muito nichada. Prejudica conversão.

**Solução**: diferenciar erros no motor e retornar `error_code` específico para o frontend tratar. Esforço: meio dia.

### 🟡 Sem Testes Automatizados

Estrutura de testes existe (Vitest + React Testing Library) mas os arquivos estão vazios. Para um motor matemático, testes unitários são críticos para detectar regressões.

**Solução mínima**: testar as funções core do valuation-engine (homogeneização, ensemble combiner, score de confiança). Esforço: 2–3 dias.

---

## O que falta na camada de produto/crescimento

### 🔵 Deploy em Produção

O Docker Compose funciona localmente. Falta um ambiente de produção com domínio próprio. Opções:

| Opção | Custo | Complexidade |
|---|---|---|
| VPS (Hetzner/DigitalOcean) + Caddy | ~€5/mês | Média |
| Vercel (backend) + Netlify (frontend) | Grátis tier | Baixa |
| Fly.io (backend) + Netlify (frontend) | ~$5/mês | Baixa |

Recomendação: **Fly.io + Netlify** para o beta — zero infra, deploy em minutos.

### 🔵 Landing Page + Captação de Beta Users

Sem landing page, o produto não tem canal de aquisição. Mesmo para um beta fechado, é necessário:
- Proposta de valor clara (para quem? avaliadores, corretores, proprietários?)
- Formulário de interesse / lista de espera
- Prova de conceito visual (demo ou screenshot)

### 🔵 Feedback Loop

Após uma avaliação, o usuário não tem como dizer se o preço foi útil, se acertou na negociação, se o imóvel foi vendido. Sem esse dado, é impossível calibrar o motor com feedback real de mercado.

**Sugestão mínima**: pergunta pós-avaliação ("O preço sugerido foi útil? Sim / Não / Parcialmente") + campo para preço real de fechamento (voluntário).

### 🔵 Definição Clara do ICP (Ideal Customer Profile)

Quem é o usuário? O produto pode servir:
- **Avaliadores imobiliários** (CRECI) — querem laudo técnico exportável
- **Corretores** — querem precificação rápida para captação
- **Proprietários** — querem saber se estão pedindo o preço certo
- **Investidores** — querem identificar ativos subprecificados

Cada perfil tem necessidades diferentes de UX e de output. Definir o ICP antes do beta evita dispersão de feature.

---

## Roadmap Priorizado

### Fase 1 — Beta Fechado (4–6 semanas)

| Prioridade | Item | Esforço |
|---|---|---|
| 🔴 P0 | Autenticação (Supabase Auth + RLS) | 1–2 sem |
| 🔴 P0 | Migrations de banco no repo | 2–3 dias |
| 🔴 P0 | Pipeline Apify automatizado + 1k comparáveis | 1 sem |
| 🟡 P1 | Error boundaries + mensagens de erro específicas | 1–2 dias |
| 🟡 P1 | Cache Redis (Upstash) | 1–2 dias |
| 🔵 P2 | Deploy produção (Fly.io + Netlify) | 1 dia |
| 🔵 P2 | Landing page + lista de espera | 2–3 dias |

### Fase 2 — Crescimento Inicial (pós-beta)

| Prioridade | Item |
|---|---|
| 🔵 P2 | Feedback loop pós-avaliação |
| 🔵 P2 | Exportação de relatório em PDF |
| 🔵 P2 | Suporte a múltiplas cidades com dados |
| 🟡 P1 | Testes automatizados do motor |
| 🔵 P3 | Integração OAuth Google no login |
| 🔵 P3 | API pública para parceiros (corretoras, plataformas) |

---

## Participantes

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | fundador — alvo desta análise |

## Actors Discutidos

| Actor | Contexto |
|---|---|
| [[valuation-engine]] | núcleo técnico diferenciado — sólido |
| [[valoraia-back]] | funcional, falta auth e /api/scrape |
| [[valoraia-front]] | completo, falta error handling |
| [[supabase-db]] | sem migrations = risco crítico |

## Projetos Relacionados

- [[valoraia-v1]]

## Tópicos Relacionados

- [[2026-05-feature-lancamento-beta]]
- [[2026-05-feature-autenticacao]]
- [[2026-05-feature-pipeline-dados]]
- [[2026-05-rfc-cache-redis]]
- [[2026-05-rfc-migrations]]
