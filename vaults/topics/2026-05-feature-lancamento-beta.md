---
type: topic
title: "Lançamento Beta ValoraIA"
aliases: ["Beta Launch", "Lançamento Beta", "Beta"]
category: "feature"
status: "in-progress"
people: ["[[erick-fonseca]]"]
actors: ["[[valoraia-back]]", "[[valoraia-front]]", "[[valuation-engine]]"]
objective: "Preparar e executar o lançamento beta do ValoraIA com primeiros usuários reais — produto estável, autenticado e com dados suficientes de comparáveis"
created_at: 2026-05-03
sources: []
updated_at: 2026-05-03
updated_by: "init@agent"
tags: [type/topic, status/in-progress, category/feature, domain/produto, domain/crescimento]
---

# Lançamento Beta ValoraIA

> Preparar o ValoraIA para receber os primeiros usuários reais — inclui estabilização técnica, autenticação, volume de dados e onboarding mínimo.

## Contexto

O produto tem o motor de avaliação funcionando com ensemble de 3 métodos e frontend completo. O que falta para o beta são as camadas de segurança (auth), dados (comparáveis suficientes), confiabilidade (error handling, migrations) e experiência (onboarding, feedback loop).

## Pessoas Envolvidas

| Pessoa | Papel |
|---|---|
| [[erick-fonseca]] | owner e executante |

## Actors Envolvidos

| Actor | Relação |
|---|---|
| [[valoraia-back]] | precisa de auth e rate limiting |
| [[valoraia-front]] | precisa de polish de UX e error boundaries |
| [[valuation-engine]] | precisa de cache persistente e mensagens de erro claras |

## Histórico

| Data | Evento |
|---|---|
| 2026-05-03 | Motor de avaliação completo (MCD+IDW + WLS + GBDT) |
| 2026-05-03 | Docker Compose funcional (backend + frontend) |
| 2026-05-03 | POI scoring via Google Places integrado |

## Decisões

- Usar Supabase Auth para autenticação (já na stack) — evita adicionar novo serviço
- Beta fechado por convite antes de abertura geral

## Próximos Passos

- [ ] Implementar autenticação (Supabase Auth)
- [ ] Adicionar error boundaries no frontend
- [ ] Documentar e executar migrations do banco
- [ ] Implementar cache Redis para geocoding/Places
- [ ] Adicionar rate limiting nas APIs Google Maps
- [ ] Popular base de comparáveis (mínimo 1.000 listings por cidade-alvo)
- [ ] Criar página de onboarding/tutorial
- [ ] Montar formulário de feedback pós-avaliação

## Projetos Relacionados

- [[valoraia-v1]] — projeto macro que contém este tópico
