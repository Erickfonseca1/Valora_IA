---
type: topic
title: "Autenticação e Multi-tenancy"
aliases: ["Auth", "Autenticação", "Login"]
category: "feature"
status: "open"
people: ["[[erick-fonseca]]"]
actors: ["[[valoraia-back]]", "[[valoraia-front]]", "[[supabase-db]]"]
objective: "Adicionar autenticação de usuários via Supabase Auth e isolar dados por tenant para suportar múltiplos clientes no beta"
created_at: 2026-05-03
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/topic, status/open, category/feature, domain/backend, domain/produto]
---

# Autenticação e Multi-tenancy

> Hoje todos os endpoints são públicos (exceto `/api/ingest`). Para o beta, é necessário auth básico com Supabase Auth e isolamento de avaliações por usuário via RLS.

## Contexto

O stack já inclui `@supabase/ssr` e `@supabase/supabase-js`. Supabase Auth é o caminho natural — suporta email/password, magic link, OAuth. RLS já está habilitado no banco, só falta configurar policies por `auth.uid()`.

## Pessoas Envolvidas

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | implementador |

## Actors Envolvidos

| Actor | Relação |
|---|---|
| [[valoraia-back]] | adicionar middleware de auth nas rotas |
| [[valoraia-front]] | adicionar telas de login/cadastro e estado de sessão |
| [[supabase-db]] | configurar RLS policies por usuário |

## Histórico

| Data | Evento |
|---|---|
| 2026-05-03 | Identificado como gap crítico para o beta |

## Decisões

- Usar Supabase Auth (já na stack) — sem adicionar Auth0 ou NextAuth
- RLS no banco para isolamento de avaliações por `user_id`
- Magic link + email/password no início (OAuth Google pode vir depois)

## Próximos Passos

- [ ] Configurar Supabase Auth no projeto
- [ ] Adicionar middleware de auth no backend (Next.js middleware ou por rota)
- [ ] Criar telas de login/cadastro no frontend
- [ ] Configurar RLS policies para tabela `valuations`
- [ ] Adicionar `user_id` na tabela de avaliações
- [ ] Proteger endpoints (exceto `/api/evaluate` que pode ser público com rate limit)

## Projetos Relacionados

- [[valoraia-v1]] — pré-requisito para lançamento beta
