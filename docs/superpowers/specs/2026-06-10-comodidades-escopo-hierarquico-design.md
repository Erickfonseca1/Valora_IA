# Design — Comodidades por escopo hierárquico e relevância contextual

**Data:** 2026-06-10
**Status:** Aprovado (brainstorming) — pendente revisão do spec

## Problema

O motor de avaliação trata "comodidades" como uma lista plana de itens com peso fixo. Isso é
incorreto: o **mesmo item físico** (piscina, academia, salão de festas) tem valor diferente
conforme **onde ele existe em relação ao imóvel** e conforme **o contexto do imóvel**.

O problema real **não** é apenas "marcar onde fica" o item. É **hierarquizar e qualificar a
relevância** de cada comodidade para *aquele* imóvel. A relevância é uma função:

```
relevância = f(item, escopo_hierárquico, contexto_do_imóvel)
```

### Hierarquia de existência (escopo)

Quão exclusivo/próximo do imóvel o item está define o teto de relevância:

| Escopo | Significado | Relevância | Exemplo |
|--------|-------------|-----------|---------|
| `interno` | exclusivo da unidade/dono | alta | piscina dentro da casa |
| `condo` | compartilhado entre unidades, amortizado | média | piscina no prédio / no condomínio de casas |
| `proximo` | conveniência locacional, não pertence ao imóvel | fraca | piscina de clube a 200 m |

### Contexto do imóvel

A **mesma posição hierárquica** pesa diferente conforme o segmento:

- Piscina interna em casa de alto padrão → diferencial esperado, prêmio marginal pequeno.
- Piscina interna em casa popular → fora do padrão; pode pouco valorizar ou até virar custo.
- Academia de condomínio em apto → padrão de mercado no segmento; prêmio depende do bairro.
- Academia "interna" em terreno → não faz sentido (peso 0 / não ofertado).

Conclusão: o "contexto" sai do **próprio mercado** — os comparáveis daquele segmento/região
revelam quanto cada item×escopo agrega. Por isso a relevância **deve ser derivada da amostra**,
não um número fixo universal.

## Estado atual (diagnóstico)

- **Frontend** ([ValuationFlow.tsx](../../../ValoraIA_front/src/components/ValuationFlow.tsx)):
  fluxo de 3 passos. Captura de comodidades foi **removida** num refactor recente. `STEPS_BY_TYPE`
  é abstração morta (idêntica pros 4 tipos). `handleContinue` hardcoda `step===1` como passo de
  fotos. Copy "(fator +5%)" acoplada à constante do engine. Mistura inline-style + Tailwind.
- **Engine** ([valuation-engine.ts](../../../ValoraIA_back/src/lib/math/valuation-engine.ts)):
  duas tabelas de peso desconexas — `AMENITY_WEIGHTS` (academia 0.15) e `POI_CONFIGS` (academia
  0.05) — sem camada de condomínio. `computeAmenityScore` e `neighborhoodScore` alimentam **só** o
  radar chart (`computePriceFactors`), **não movem o preço**. O preço é movido apenas por
  `combinedFactor = corner × slope × level` ([:528](../../../ValoraIA_back/src/lib/math/valuation-engine.ts#L528)).
  Confirmado em [COMO_FUNCIONA_AVALIACAO.md:242](../../../COMO_FUNCIONA_AVALIACAO.md).
- **Comparáveis** (`listings`): **não armazenam comodidades**. O scraper recebe `amenities` do Zap
  ([scrape/route.ts:52](../../../ValoraIA_back/src/app/api/scrape/route.ts#L52)) mas **descarta** no
  upsert ([:234-249](../../../ValoraIA_back/src/app/api/scrape/route.ts#L234-L249)). Zero dado
  acumulado → derivação da amostra é hoje impossível (galinha-e-ovo).

## Decisões (brainstorming)

1. **Captura condo:** combinação — manual = fonte de verdade, IA/scrape pré-preenchem sugestões
   confirmáveis.
2. **Modelo de dados:** item + tag de escopo (lista única, peso = lookup `f(item, escopo)`).
3. **Escopo × tipo:** apartamento sempre tem `condo`; casa/comercial ganham `condo` se marcado
   `imóvel em condomínio fechado`; terreno só `proximo`.
4. **Efeito no preço:** fator multiplicativo por escopo (estilo NBR), entra no `combinedFactor`.
5. **Rigor NBR:** derivar fator da amostra (Grau II/III) — alvo. Tabela referenciável só como
   fallback explícito (degradação de grau declarada no relatório).

### O que a NBR 14653-2 governa (e o que não governa)

A norma **não** prescreve percentuais por comodidade. Ela governa método e limites:
- Cada fator de homogeneização por comparável ∈ **[0,50; 2,00]**; fora disso → comparável
  descartado (saneamento).
- Grau de fundamentação (tratamento por fatores): graus maiores exigem ajustes individuais e
  somatório em módulo mais apertados + nº mínimo de comparáveis efetivamente usados.
- Grau II/III exigem fatores **justificados/derivados** (inferência sobre a amostra ou tabela de
  referência reconhecida), não arbitrados.

**Limites adotados (decisão).** A NBR fixa a admissibilidade por fator; o resto são guardrails de
saneamento de engenharia (declarados como tais no relatório, não como "percentual da norma"):

- **Por fator individual (norma):** todo fator de homogeneização aplicado a um comparável ∈
  **[0,50; 2,00]**. Fora → comparável descartado.
- **Mínimo para derivar (engenharia):** `≥ 5 pares` casados com/sem o item (espelha
  `MIN_SAMPLES=5` do engine). Abaixo disso → `derived:false`, usa fallback do catálogo.
- **Teto agregado por escopo (engenharia, anti-runaway do produtório):** `internalFactor` ∈
  [0,80; 1,25] (±25%), `condoFactor` ∈ [0,90; 1,15] (±15%), `proximoFactor` ∈ [0,95; 1,05] (±5%,
  delta-only). O valor *dentro* desses limites vem da amostra; os tetos só evitam que ruído de
  amostra pequena exploda o preço.
- O relatório expõe fator, origem (`derived`/`fallback`) e nº de pares → grau de fundamentação
  auditável e degradação explícita.

## Arquitetura

### Restrição-chave: escopo nos comparáveis (scope-aware)

Amenity do Zap é nível-anúncio e não distingue escopo sozinha. Inferência por tipo de imóvel do
comparável:

- comp `apartment` com item compartilhável (piscina, academia, salão) ⇒ escopo `condo`.
- comp `house` ⇒ `interno`; se `unit_type ∈ {gated_community, condominium_house}` ⇒ `condo`.
- itens estruturalmente de condomínio (portaria 24h, elevador) ⇒ sempre `condo`.

Logo a derivação é **scope-aware**: `condoFactor` deriva de pares de apartamentos (e casas em
condomínio); `internalFactor` deriva de pares de casas isoladas.

### Catálogo único (item × escopo)

Fonte única substituindo `AMENITY_WEIGHTS` + `POI_CONFIGS`. Cada item declara em quais escopos é
ofertado e o peso **de fallback** (tabela referenciável) por escopo. O peso efetivo é, quando há
dados, **derivado da amostra**; o fallback só entra com amostra insuficiente.

```ts
// catálogo: o que existe e onde faz sentido. Pesos = fallback Grau I.
AMENITY_CATALOG = {
  piscina:     { label:"Piscina",     cat:"lazer",     scopes:["interno","condo"],          fallback:{interno:0.08, condo:0.05} },
  academia:    { label:"Academia",    cat:"lazer",     scopes:["interno","condo","proximo"], fallback:{interno:0.06, condo:0.04, proximo:0.02} },
  portaria_24h:{ label:"Portaria 24h",cat:"seguranca", scopes:["condo"],                     fallback:{condo:0.05} },
  // ...
}
```

`scopes` ausente para um escopo ⇒ item não ofertado/peso 0 (ex: portaria não é `interno`;
academia `interno` não existe para terreno).

#### Catálogo MVP (decisão)

Itens cobertos no MVP, alinhados às amenities recorrentes do Zap (mercado residencial BR). Coluna
de escopos válidos define onde cada item pode existir:

| Item | Categoria | interno | condo | proximo |
|------|-----------|:------:|:-----:|:-------:|
| Piscina | lazer | ✓ | ✓ | — |
| Academia | lazer | ✓ | ✓ | ✓ |
| Churrasqueira / Área gourmet | lazer | ✓ | ✓ | — |
| Salão de festas | lazer | — | ✓ | — |
| Salão de jogos | lazer | — | ✓ | — |
| Playground | lazer | — | ✓ | — |
| Espaço kids | lazer | — | ✓ | — |
| Quadra esportiva | lazer | ✓ | ✓ | ✓ |
| Sauna | lazer | ✓ | ✓ | — |
| Espaço pet | lazer | — | ✓ | — |
| Quintal | espaço | ✓ | — | — |
| Jardim | espaço | ✓ | ✓ | — |
| Varanda / Sacada | conforto | ✓ | — | — |
| Vista mar | conforto | ✓ | — | — |
| Cobertura / Rooftop | conforto | ✓ | ✓ | — |
| Ar condicionado | conforto | ✓ | — | — |
| Armários planejados | conforto | ✓ | — | — |
| Mobiliado | conforto | ✓ | — | — |
| Lareira | conforto | ✓ | — | — |
| Portaria 24h | segurança | — | ✓ | — |
| Segurança 24h | segurança | — | ✓ | — |
| Portão eletrônico | segurança | ✓ | ✓ | — |
| Câmeras de segurança | segurança | ✓ | ✓ | — |
| Elevador | infra | — | ✓ | — |
| Gerador | infra | — | ✓ | — |
| Coworking | infra | — | ✓ | — |
| Lavanderia | infra | — | ✓ | — |
| Supermercado | proximo (POI) | — | — | ✓ |
| Farmácia | proximo (POI) | — | — | ✓ |
| Transporte público | proximo (POI) | — | — | ✓ |
| Escola | proximo (POI) | — | — | ✓ |
| Hospital | proximo (POI) | — | — | ✓ |
| Parque | proximo (POI) | — | — | ✓ |
| Shopping | proximo (POI) | — | — | ✓ |
| Restaurante | proximo (POI) | — | — | ✓ |

Itens `proximo (POI)` mantêm a fonte Google Places atual (não viram input de usuário). Pesos de
fallback por escopo são definidos no `amenity-catalog.ts` na implementação, ancorados na ordem de
grandeza atual das tabelas (`AMENITY_WEIGHTS`/`POI_CONFIGS`), porém reduzidos para caber nos tetos
agregados acima — o valor real vem da amostra quando disponível.

### Camadas (unidades isoladas)

1. **Catálogo** (`amenity-catalog.ts`) — tabela de verdade do domínio: itens, categorias, escopos
   válidos, pesos de fallback. Sem lógica de cálculo. Mapeamento Zap-string → item do catálogo.
2. **Inferência de escopo** (`amenity-scope.ts`) — `inferScope(item, propertyType, unitType)` →
   escopo do item para um comparável. Usado na ingestão dos comps e na derivação.
3. **Derivação de fator** (`amenity-factor.ts`) — dado o conjunto de comparáveis e o item×escopo,
   estima o fator por pareamento/regressão; aplica bound [0,50; 2,00]; retorna `{factor, method,
   nPairs, derived: boolean}`. Cai pro fallback do catálogo quando `nPairs < mínimo`.
4. **Engine** — agrega os fatores por escopo do imóvel-alvo em `internalFactor`, `condoFactor`
   (gated por tipo/flag), `proximoFactor` (delta-only fraco, ver abaixo) e multiplica em
   `combinedFactor`.
5. **Persistência** — comodidades do imóvel-alvo nas `valuations`; comodidades dos comps nas
   `listings`.
6. **Frontend** — captura segmentada por escopo + relatório com contribuição por escopo.

### Anti-dupla-contagem (escopo `proximo`)

Comparáveis na mesma micro-região já embutem o valor locacional. Logo `proximoFactor` premia
apenas o **delta** acima do baseline de vizinhança (0,40), fraco e capado — não recompensa o que o
comparável já reflete. Itens `proximo` continuam vindo do POI (Google Places), não de input do
usuário.

### Fluxo de valor

```
ensemble ppm² → × typology → × (corner × slope × level)            [já existe]
                            → × internalFactor × condoFactor × proximoFactor   [novo]
                            = ppm²_homogeneizado → × área = valor
cada fator individual ∈ [0,50; 2,00]; origem (derived|fallback) exposta no retorno
```

## Dados (migrações — execução manual no Supabase)

> As migrações serão entregues como SQL; o usuário as executa no Supabase **após** as alterações de
> código. Não rodar automaticamente.

1. `listings`:
   - `ADD COLUMN amenities jsonb DEFAULT '[]'` — `[{item, scope}]` (escopo inferido na ingestão).
   - `ADD COLUMN unit_type text` — para inferência `gated_community`/`condominium_house`.
2. `valuations`:
   - `ADD COLUMN amenities jsonb DEFAULT '[]'` — `[{item, scope}]` do imóvel avaliado.
   - `ADD COLUMN in_gated_community boolean DEFAULT false`.

## Faseamento

A derivação da amostra depende de dados que ainda não existem. Implementação em fases:

### Fase 0 — Fundação de dados (pré-requisito)
- Migrações acima.
- Scraper: parar de descartar `amenities`; mapear strings Zap → itens do catálogo; inferir escopo
  por tipo; persistir em `listings.amenities` + `unit_type`.
- Acumular dado via re-scrape até massa suficiente por item/escopo/região.

### Fase 1 — Captura + persistência + display (interino)
- Catálogo item×escopo no engine (substitui as 2 tabelas).
- UI segmentada: `interno` (todos), `condo` (apto sempre; casa/comercial sob flag; terreno oculto),
  `proximo` (auto-POI, read-only). Captura manual = verdade + sugestão IA/scrape confirmável.
- Fator de comodidade entra como **fallback de tabela referenciável citada** (Grau I, declarado no
  relatório) enquanto Fase 2 não tem dados. `proximo` delta-only fraco.

### Fase 2 — Fator derivado da amostra (NBR Grau II/III — alvo)
- `amenity-factor.ts` ativo: pareamento scope-aware (pares mesma região, área ±%, quartos ±1,
  com/sem item) ou regressão → fator empírico por item×escopo×segmento.
- Bound [0,50; 2,00]; comps fora descartados; nº de comps e somatório respeitam grau.
- Relatório audita: fator, origem (`derived`/`fallback`), nº de pares — degradação de grau
  explícita quando cai no fallback.

## Tratamento de erros

- Google Places indisponível → `proximoFactor = 1.0` (neutro), como hoje com `neighborhood`.
- Amostra insuficiente para derivar → fallback do catálogo, marcado `derived:false` no retorno.
- Item Zap desconhecido (sem mapeamento no catálogo) → ignorado na ingestão (não polui derivação).
- Fator derivado fora de [0,50; 2,00] → clamp + flag de saneamento; comp individual fora → descarte.

## Testes

- **Catálogo/escopo:** `inferScope` por tipo (apto→condo, casa→interno, casa gated→condo, terreno
  bloqueia interno).
- **Derivação:** pares sintéticos com prêmio conhecido → fator recuperado dentro de tolerância;
  amostra pequena → cai no fallback; fator extremo → clampado a [0,50; 2,00].
- **Engine:** `combinedFactor` inclui os 3 novos fatores; gating por tipo/flag; `proximo` delta-only
  não duplica vizinhança.
- **Frontend:** captura segmentada renderiza por tipo; flag condomínio revela camada condo em casa;
  terreno não mostra interno/condo. Regressão dos testes existentes de `ValuationFlow`/`Report`.
- **Scraper:** amenities Zap mapeadas e persistidas com escopo correto; string desconhecida ignorada.

## Fora de escopo (YAGNI)

- Reescrita do ensemble/IDW.
- Captura manual de itens `proximo` (continua só POI).
- Tabela normalizada de comodidades (jsonb basta, segue padrão de `neighborhood_pois`).
- Redesign visual amplo do fluxo — só os fixes no caminho da seção tocada.
