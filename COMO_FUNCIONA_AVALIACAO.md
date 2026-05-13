# Como Funciona o Motor de Avaliação

## Visão Geral

O motor combina três métodos estatísticos em paralelo sobre dados reais de mercado, seguindo a norma **NBR 14653 Grau II/III**. Para imóveis com idade e estado de conservação informados, aplica adicionalmente o método **Ross-Heidecke** de depreciação. Para terrenos com parâmetros de zoneamento, calcula o **Valor Residual do Terreno** pelo método involutivo.

O resultado inclui: preço estimado (R$), intervalo de confiança 80%, score de confiança (0–100), 7 fatores de preço em radar chart, e — quando aplicável — coeficiente de depreciação e cenários de viabilidade construtiva.

---

## Etapa 1 — Geocodificação

O endereço informado é convertido em coordenadas (lat/lng) via **Google Maps Geocoding API**. Sem coordenadas, a avaliação não prossegue.

---

## Etapa 2 — Busca de Comparáveis

Com as coordenadas, o sistema busca imóveis reais anunciados na região. A busca opera em **raio máximo de 5.000m** com filtros progressivos até encontrar o mínimo de 5 amostras:

| Tentativa | Tolerância de Área | Quartos |
|---|---|---|
| 1ª | ±20% | igual ao alvo |
| 2ª | ±20% | ignora |
| 3ª | ±40% | ignora |
| 4ª | ±60% | ignora |
| 5ª | ±100% | ignora |

Após coletar todos os candidatos dentro de 5.000m, o sistema seleciona o **menor raio IDW** entre `[1.000m, 2.000m, 3.000m, 5.000m]` que contenha ao menos 5 amostras. Esse raio é reportado como `radius_used_m` no resultado.

---

## Etapa 3 — Limpeza dos Dados

Os comparáveis passam por filtro **IQR** aplicado ao preço por m² bruto — remove outliers (preços absurdos, erros de cadastro) antes de qualquer ponderação por distância.

---

## Etapa 4 — Homogeneização

Cada comparável é ajustado para ser comparável ao imóvel-alvo. Quatro ajustes aplicados:

| Ajuste | Fórmula | Motivo |
|---|---|---|
| Oferta → venda | `× 0.90` | Preço anunciado ≠ preço real de venda (desconto médio 10%) — NBR 14653 |
| Área | `(área_alvo / área_comp)^0.7` | Imóvel maior por m² vale menos — escalonamento alométrico NBR |
| Tipologia | fator empírico ou tabela NBR | Casa ≠ apartamento ≠ terreno — conversão por tipo |
| Comodidades | score aditivo [0,40 – 1,0] | Amenidades do imóvel-alvo vs. mercado local |

**Fator de tipologia:** calculado empiricamente com dados locais (pares com área ±30%, quartos ±1, dentro de 5km). Com ≥3 pares: usa razão real (limitada a ±50% do default). Sem pares suficientes: usa defaults da NBR 14653 (ex: casa→apartamento = 1,20; apartamento→casa = 0,83).

**Score de comodidades:** soma dos pesos das amenidades declaradas, com piso 0,40 e teto 1,0:

| Tier | Peso por item | Exemplos |
|---|---|---|
| Premium | 0,20 | Piscina, Rooftop, Vista Mar, Cobertura |
| Alto | 0,15 | Academia, Portaria 24h, Elevador, Salão de Festas, Área Gourmet |
| Médio | 0,10 | Varanda, Sacada, Churrasqueira, Playground |
| Básico | 0,05 | Portão eletrônico, Interfone, Câmeras |

---

## Etapa 5 — Três Métodos em Paralelo

### Método 1 — MCD+IDW (Comparativo Direto)

Pesa cada comparável pelo **inverso da distância ao quadrado**. Um imóvel a 200m pesa 625× mais que um a 5km (distância mínima: 50m). Calcula média ponderada do ppm² homogeneizado + intervalo de confiança 80% via t-Student.

O tamanho de amostra efetivo usa **aproximação de Kish**: `nEff = (ΣW)² / ΣW²`

**Peso no ensemble:** `0,4 + (nEff / 30) × 0,6` → entre 0,4 e 1,0

### Método 2 — WLS (Regressão Linear Ponderada)

Monta equação com 6 variáveis (área, quartos, banheiros, vagas, lat, lng) e encontra o ppm² que melhor explica todos os comparáveis juntos.

**Condições de entrada:** ≥ 8 amostras **e** R² ≥ 0,30  
**Peso no ensemble:** `R² × 1,2`

### Método 3 — GBDT (Gradient Boosting)

80 árvores de decisão em cascata (subsampling 80% por árvore) — cada uma corrige o erro da anterior. Captura padrões não-lineares que a regressão não vê.

**Condições de entrada:** ≥ 10 amostras  
**Peso no ensemble:** `max(0,2 ; 1 − oob_rmse / (preço_previsto × 2))` ou 0,6 se OOB indisponível

---

## Etapa 6 — Combinação (Ensemble)

Os métodos aprovados são combinados por **média ponderada pelos seus próprios pesos de qualidade**:

```
ppm2_final = Σ(ppm2_método × peso_método) / Σ(pesos)
```

Se apenas o MCD passar nos critérios, ele é o resultado final (`primary_method = "mcd_idw"`). Com ≥2 métodos: `primary_method = "ensemble"`.

**Intervalo de confiança do ensemble:**
```
ciLower = min(mcdCiLow,  ensemblePpm2 - (ppm2Max - ppm2Min) × 0,5)
ciUpper = max(mcdCiHigh, ensemblePpm2 + (ppm2Max - ppm2Min) × 0,5)
ciLower = max(ciLower, ensemblePpm2 × 0,50)   ← piso: evita IC negativo em amostras pequenas
ciUpper = max(ciUpper, ensemblePpm2 × 1,10)
```

---

## Etapa 6b — Ajustes Pós-Ensemble (NBR 14653)

Após o ensemble, três fatores multiplicativos são aplicados ao ppm² final para refletir características físicas do terreno/imóvel:

| Fator | Valores |
|---|---|
| **Esquina** (`is_corner`) | true = ×1,05 · false = ×1,0 |
| **Declividade** (`terrain_slope`) | plano = 1,0 · aclive/declive_leve = 0,95 · aclive/declive_acentuado = 0,80 |
| **Nível da rua** (`street_level`) | no_nivel = 1,0 · acima_nivel = 0,95 · abaixo_nivel = 0,80 |

```
fatorCombinado = fatorEsquina × fatorDeclividade × fatorNível
ppm2_homogeneizado = ppm2_ensemble × fatorCombinado
valor_estimado     = ppm2_homogeneizado × área_alvo
```

O resultado desta etapa é o `price_per_m2_homogenized` e o `estimated_value` final reportados.

---

## Etapa 7 — Ross-Heidecke (Depreciação)

Quando `construction_age` e `conservation_state` são informados, o motor calcula a **depreciação física da construção** pelo método Ross-Heidecke (NBR 14.653-1).

### Padrões Construtivos

| Padrão | r (taxa de decaimento) | Vu (vida útil) |
|---|---|---|
| Alto | 0,005 | 80 anos |
| Médio | 0,010 | 60 anos |
| Popular | 0,015 | 50 anos |

### Estados de Conservação

| Estado | Depreciação pelo estado |
|---|---|
| `novo` | 0% |
| `entre_novo_e_regular` | 15% |
| `regular` | 33% |
| `reparos_simples` | 52% |
| `reparos_importantes` | 72% |
| `critico` | 100% |

### Fórmula

```
n = min(max(0, idade_construção), Vu − 1)
fator_idade = (1 − r)^n × (Vu − n) / Vu
valor_residual_pct = fator_idade × (1 − depreciação_estado)
coeficiente_depreciação = 1 − valor_residual_pct
```

**Saída:** `depreciation_coefficient` e `remaining_value_pct` (valores em [0, 1], 4 casas decimais).

> **Nota:** O Ross-Heidecke informa o valor da construção depreciada — não substitui o método comparativo para o valor total do imóvel.

---

## Etapa 8 — Motor Involutivo (Valor Residual do Terreno)

Quando `area_terreno` e `zoning_params` (IAmax) são informados, o motor calcula quanto um incorporador pode pagar pelo terreno com base no potencial construtivo.

### Estrutura de Custos (fixos)

| Item | Percentual |
|---|---|
| Custo de Obra | 50% do VGV total |
| Outorga Onerosa | 10% × área × VGV/m² |
| Margem do Incorporador | 15% do VGV total |

### Fórmula (cenário base, IA = IAmax)

```
VGV_total       = IAmax × área_terreno × VGV_estimado_m2
Custo_Obra      = VGV_total × 0,50
Outorga         = área_terreno × 0,10 × VGV_estimado_m2
Margem          = VGV_total × 0,15
Valor_Residual  = VGV_total − Custo_Obra − Outorga − Margem
```

### Cenários de Viabilidade

| Cenário | Fator IA | Descrição |
|---|---|---|
| Conservador | 0,70 × IAmax | Uso parcial do potencial |
| Base | 1,00 × IAmax | Uso pleno permitido |
| Otimista | 1,20 × IAmax | Requer outorga adicional |

**Saída:** `residual_land_value_brl`, `max_buildable_area_m2`, `VGV_total`, `Custo_Obra`, `Outorga_Onerosa`, `viability_scenarios[]` com ROI por cenário.

---

## Etapa 9 — Análise de Fotos (Gemini Vision)

Quando fotos são enviadas, o modelo **Gemini Vision** analisa as imagens em paralelo com os demais cálculos e retorna:

- `padrao_construtivo` — padrão da edificação detectado nas fotos
- `estado_conservacao_sugerido` — sugestão de estado de conservação (compatível com os 6 estados do Ross-Heidecke)
- `comodidades_detectadas[]` — lista de amenidades identificadas visualmente

Os resultados podem preencher automaticamente campos do formulário PTAM.

---

## Etapa 10 — Vizinhança (em paralelo)

Enquanto o ensemble roda, o sistema consulta o **Google Places API** e mapeia pontos de interesse ao redor do endereço (hospitais, escolas, parques, comércio, transporte). O resultado é um `totalScore` da vizinhança que entra no radar chart.

---

## Etapa 11 — Score de Confiança e Fatores

### Score de Confiança (0–100)

Combinação de dois sinais, com resultado **limitado ao intervalo [40, 99]**:

| Componente | Peso | Lógica |
|---|---|---|
| Amplitude do IC | 60% | IC estreito = confiança alta |
| Amostras efetivas | 40% | Mais comparáveis = mais confiança (satura em 30 amostras) |

### Radar Chart — 7 Fatores

| Fator | O que mede | Fórmula |
|---|---|---|
| Mercado Local | Proximidade média dos comparáveis ao imóvel | `1 − (distMédia / raioUsado)`, [0,3 – 1,0] |
| Consistência | Variação de preço entre os comparáveis | `1 − (CV × 2)`, onde CV = σ/μ, [0,3 – 1,0] |
| Volume de Dados | Quantidade de comparáveis encontrados | `0,4 + (n/100) × 0,6`, [0,4 – 1,0] |
| Perfil da Região | Similaridade de área entre comparáveis e alvo | `1 − |área_alvo − área_média| / área_média`, [0,4 – 1,0] |
| Cobertura | Dispersão espacial dos comparáveis | `1 − (σ_dist / raioUsado)`, [0,4 – 1,0] |
| Comodidades | Amenidades do imóvel informadas no formulário | score aditivo [0,40 – 1,0] |
| Vizinhança | Pontos de interesse ao redor via Google Maps | `totalScore` do Google Places, ou 0,50 se indisponível |

> **Importante:** Comodidades e Vizinhança são fatores do radar chart — não entram diretamente no cálculo do preço estimado. O preço é determinado exclusivamente pelos comparáveis de mercado e pelos ajustes NBR 14653.

---

## Resultado Final

| Campo | Descrição |
|---|---|
| `estimated_value` | Preço estimado em R$ (pós-ajustes NBR) |
| `price_per_m2_mean` | Preço por m² do ensemble (antes dos ajustes pós-ensemble) |
| `price_per_m2_median` | Preço por m² (mediana robusta dos comparáveis homogeneizados) |
| `price_per_m2_homogenized` | Preço por m² após todos os ajustes NBR (esquina/declividade/nível) |
| `static_market_value_brl` | Valor de mercado pelo método comparativo (armazenado no PTAM) |
| `confidence_interval` | Intervalo inferior e superior com 80% de confiança |
| `confidence_score` | Score de 0 a 100 (limitado a [40, 99]) |
| `price_factors` | 7 fatores para radar chart |
| `frontend_comparables` | 5 imóveis mais próximos usados como base |
| `method_estimates` | Estimativa, peso e metadados de cada método (MCD, WLS, GBDT) |
| `primary_method` | Método dominante: `"mcd_idw"`, `"wls"`, `"gbdt"` ou `"ensemble"` |
| `typology_factor` | Fator de tipologia médio aplicado aos comparáveis |
| `neighborhood_pois` | Dados de POIs do bairro (Google Places) |
| `depreciation_coefficient` | Coeficiente de depreciação Ross-Heidecke [0, 1] (se informado) |
| `remaining_value_pct` | Percentual de valor residual da construção [0, 1] (se informado) |
| `residual_land_value_brl` | Valor residual do terreno pelo método involutivo (se informado) |
| `max_buildable_area_m2` | Área máxima construível (IAmax × área_terreno) (se informado) |
| `viability_scenarios` | 3 cenários de viabilidade construtiva com ROI (se informado) |
