# Pesquisa Apify — Melhor Extrator de Anúncios de Imóveis

> Documento para ser enviado como prompt à IA Manus (manus.im) para pesquisar e
> recomendar o melhor extrator (actor) do Apify para o ValoraIA.
> Copie a seção "PROMPT" abaixo integralmente no Manus.

---

## Contexto do projeto (para sua referência)

- **ValoraIA** — sistema de avaliação de imóveis (PTAM, NBR 14653) no Brasil.
- Backend Node.js com webhook `POST /api/ingest` que recebe anúncios e grava na
  tabela `listings` (Postgres/PostGIS no Supabase). Dedup por `source_url`.
- O extrator alimenta um motor de avaliação que busca comparáveis por raio
  geográfico (PostGIS) e roda modelos de regressão (MCD+IDW, WLS, GBDT).
- Targets das plataformas: **VivaReal, QuintoAndar, ZAP Imóveis, OLX, Imovelweb, Chaves na Mão**.
- Volume alvo: milhares de anúncios/dia por cidade, custo deve ser viável em Apify (tiers gratis/Starter).

---

## PROMPT (copie daqui para baixo no Manus)

---

Você é um analista sênior de automação e web scraping. Preciso de uma pesquisa
detalhada e comparativa de extratores de imóveis no **Apify**, para alimentar um
sistema de avaliação imobiliária brasileiro (PTAM / NBR 14653).

## Contexto

Tenho um backend que recebe anúncios via webhook `POST /api/ingest` com a seguinte
estrutura de dados (contrato rígido, validado com Zod):

```json
{
  "source_url": "https://www.vivareal.com.br/...",
  "source": "vivareal",
  "ad_id": "abc-123",
  "price": 450000.00,
  "condo_fee": 850.00,
  "iptu": 120.00,
  "property_type": "apartment",
  "usable_area": 72.5,
  "total_area": 90.0,
  "bedrooms": 3,
  "suites": 1,
  "bathrooms": 2,
  "parking_spaces": 1,
  "lat": -23.5505,
  "lng": -46.6333,
  "address": "Rua Augusta, 1234",
  "neighborhood": "Consolação",
  "city": "São Paulo",
  "state": "SP",
  "construction_year": 2005,
  "construction_age": 19,
  "conservation_state": "regular",
  "floor": 7,
  "total_floors": 12,
  "is_condo": true,
  "amenities": ["piscina", "academia", "portaria 24h"],
  "is_new_launch": false,
  "listing_created_at": "2026-07-01T10:00:00Z",
  "photo_urls": ["https://.../foto1.jpg"]
}
```

Campos **obrigatórios**: `source_url`, `price`, `usable_area`, `property_type`,
`lat`, `lng`, `city`. Os demais são desejáveis (quanto mais preenchidos, melhor o
resultado). Imóveis brasileiros: apartamentos, casas, comerciais e terrenos.

## O que preciso que você faça

1. **Busque no catálogo do Apify** (apify.com/search e apify.com/store) atores que
   extraiam anúncios de imóveis, priorizando plataformas brasileiras:
   **VivaReal, QuintoAndar, ZAP Imóveis, OLX (imóveis), Imovelweb, Chaves na Mão**.
   Inclua também atores genéricos de imóveis se cobrirem sites brasileiros.

2. Para cada candidato relevante (mín. 3–4 candidatos), levante:
   - Nome do actor + URL no Apify
   - Plataformas suportadas (VivaReal? QuintoAndar? etc.)
   - **Campos de saída** — compare com meu contrato acima. O que ele retorna?
     Ele retorna lat/lng? área privada vs total? condomínio/IPTU? andar?
     fotos? data do anúncio? bairro/cidade/estado? ano de construção?
   - Mecanismo anti-bloqueio (proxies, headers, residentes de sessão?)
   - Preço/custo por execução ou por mil resultados (tiers de Apify)
   - Volume máximo por execução (limite de resultados)
   - Filtros de busca (cidade, bairro, tipo, faixa de preço, quartos?)
   - Manutenção do ator (última atualização, problemas conhecidos nos reviews)
   - Requisitos de entrada (URLs de listagem? busca por cidade?)

3. **Compare os candidatos** e me entregue:
   - Tabela comparativa lado a lado (campos do meu contrato × cada actor)
   - Recomendação final com justificativa técnica e de custo
   - **Melhor opção geral** e **melhor opção gratuita/baixo custo**
   - Se nenhum ator cobre meu contrato, recomende a abordagem alternativa
     (actor de browser universal + prompt, ou custom actor via Crawlee) e
     estime o esforço

4. Regras:
   - Verifique se os atores estão ativos e publicados em 2025/2026 (não recomende
     atores mortos/desatualizados)
   - Considere a realidade do mercado brasileiro: muitos anúncios em VivaReal e
     QuintoAndar são alimentados por portais interligados (CRECI/data) e podem ter
     dados duplicados entre portais
   - Aponte riscos legais/ToS de scraping de cada plataforma
   - Seja específico: cite URLs e preços reais, não estimativas vagas

## Formato de saída

Um relatório em Markdown com: sumário executivo → tabela comparativa →
análise detalhada por candidato → recomendação final (com plano de integração
de 3 passos ao meu webhook).

---

## Notas de uso

- Após a resposta do Manus, valide a recomendação testando o actor no Apify com
  uma busca pequena (ex.: "apartamento São Paulo centro, 2 quartos") e compare a
  saída com o contrato acima.
- O webhook aceita os campos com tipos flexíveis (string numérica com vírgula),
  então pequenas diferenças de formato não quebram a ingestão.
