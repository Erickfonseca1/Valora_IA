# ValoraIA — Segundo Cérebro

> Este vault é alimentado pelo [plugin Bedrock](https://github.com/iurykrieger/claude-bedrock).
> Instruções de nível de plugin (tipos de entidade, regras de escrita, tags, fluxo git) são carregadas automaticamente.
> Este arquivo descreve o que é específico **deste vault**.

## Propósito

Segundo cérebro do ValoraIA — SaaS de avaliação imobiliária com IA. Centraliza conhecimento de produto, arquitetura técnica, decisões de negócio, roadmap e memória institucional do projeto.

## Idioma

Todo o conteúdo deste vault é escrito em **Português Brasileiro (pt-BR)**.
Ao criar ou atualizar entidades, use português para todo o conteúdo textual.
Chaves de frontmatter permanecem em inglês. Termos técnicos em inglês são aceitáveis.

## Domínios

Este vault usa as seguintes tags de domínio:

- domain/produto
- domain/backend
- domain/frontend
- domain/dados
- domain/imobiliario
- domain/crescimento

Ao criar entidades, use tags `domain/<nome>` desta lista.
Novos domínios podem ser adicionados conforme o vault cresce.

## Contexto do Projeto

**ValoraIA** é um SaaS de avaliação imobiliária com IA que implementa a norma brasileira **NBR 14653** via ensemble de 3 métodos estatísticos:

- **MCD+IDW** — Homogeneização com ponderação inversa à distância
- **WLS** — Regressão por mínimos quadrados ponderados
- **GBDT** — Gradient Boosted Decision Trees (80 stumps)

Stack: Next.js 16 (backend) + React 18/Vite (frontend) + Supabase/PostGIS + Google Maps API

## Referência Rápida

| Ação | Skill |
|---|---|
| Buscar e consultar o vault | `/bedrock:ask` |
| Ingerir fontes externas (URLs, arquivos markdown, GitHub) | `/bedrock:teach` |
| Criar ou atualizar entidades manualmente | `/bedrock:preserve` |
| Desduplicar e checar saúde do vault | `/bedrock:compress` |
| Re-sincronizar entidades com fontes externas | `/bedrock:sync` |
