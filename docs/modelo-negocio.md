# Modelo de Negócio — ValoraIA / AVALIA

> Pesquisa de mercado (web, 2026) + análise do sistema atual (código). Recomendação consolidada de modelo de precificação, estrutura de usuários e canais de venda.

---

## 1. Resumo executivo

O mercado brasileiro de software de avaliação imobiliária (NBR 14653 / PTAM) é consolidado, fragmentado e em transição de desktop → nuvem. O segmento self-serve para corretores está na faixa R$ 49–110/mês; o segmento técnico (engenheiros avaliadores) vai de R$ 130–1.326/mês (SisDEA). O segmento imobiliárias (escolhido como primário) está em R$ 145–600/mês, ancorado por softwares de CRM como Imobisoft (R$ 199/mês).

**Recomendação:** SaaS freemium em 4 camadas — Free (R$ 0), Captação Pro (R$ 149/mês), Escritório (R$ 299/mês) e Institucional (R$ 590–1.500/mês, sales-led). Venda primária por demonstração (demo WhatsApp → SECOVI/sindicatos/grupos de corretores), parceria com cursos de avaliação como motor de aquisição de massa, e PLG (trial 7 dias) como camada de baixo custo.

**Posicionamento:** para imobiliárias, o produto não é vendido como "software de PTAM", mas como ferramenta de **captação e consultoria** — quem avalia com precisão conquista o proprietário. O PTAM é o documento-efeito-varinha; o hero é "avalie, imprima um laudo com a sua marca e leve a captação".

**Diferencial real do sistema:** comparáveis 100% automáticos (scraping Apify/VivaReal + limpeza IQR + raio dinâmico) somado a um ensemble de três métodos (MCD+IDW, WLS, GBDT) com homogeneização NBR 14653. A análise de fotos IA já existe no código (flag `PHOTOS_ENABLED`) mas não é o carro-chefe comercial (decisão do fundador).

---

## 2. Benchmark de concorrentes (preços públicos, 2025–2026)

| Software | Modelo | Preço | Público |
|---|---|---|---|
| Avalar | Assinatura | R$ 49,90/mês · R$ 269,90 sem · R$ 498,90 ano (laudos ilimitados) | Corretor PTAM |
| Avalia Turbo | Assinatura | R$ 69,90/mês (teste grátis 7 dias) | Corretor PTAM |
| Amostrando | Assinatura | R$ 89,90 / R$ 109,90 (Infinity Plus) | Avaliadores (eng. + corretor) |
| Avalie Fácil | Uso 30 dias | R$ 89,90 (sem renovação automática) | Corretor PTAM |
| SYSIMOB (SysPrice+SysVistoria) | SaaS | R$ 145 Basic · R$ 290 Advanced · R$ 576 Pro · R$ 60/usuário (15+) | Corretor → imobiliária média |
| SisDEA | Licença/assinatura | R$ 130/mês · R$ 730 sem · R$ 1.326 ano · R$ 1.969 permanente | Engenheiro avaliador |
| TS-Sisreg | Permanente | R$ 1.230 (login/token) · registro adicional R$ 410 | Engenheiro |
| Aplicativo AVALIA | Anuidade | R$ 840/ano (+ licença, 1ª anuidade grátis) | Engenheiro (curso/IPOG) |
| CastleR | Por laudo ("pague quanto usar") | 1 avaliação grátis/mês; tabela de preços por uso | Avaliador bancário |
| PROTO (Real Price) | SaaS + rede de demanda | Assinatura + versão grátis p/ credenciados (Edital 01/2026) | Avaliadores + bancos/licitações |
| Valora (Archicode) | SaaS enterprise, sales-led | Preço oculto ("Agendar Demo") | Engenheiros/estúdios |
| SisRenda | Assinatura | R$ 275/mês · R$ 2.805 ano | Empreendimentos |
| Imobisoft (CRM imobiliária) | SaaS | Desde R$ 199/mês (+ R$ 29,90/usuário extra, R$ 20/100 imóveis) | Imobiliárias |
| Group Vistoria | SaaS | R$ 103 / 167 / 209 / 314 por mês (tiers de vistorias) | Vistorias/imobiliárias |

**Tendências observadas:**
- Convergência da faixa mass em ~R$ 70–110/mês (corretor PTAM).
- Migração de licença permanente → assinatura.
- IA como novo diferenciador (PROTO, Valora).
- Nenhum concorrente público vende análise de fotos por IA no tier baixo — está codado no sistema, custo zero incremental hoje.
- CastleR prova que *por-uso* funciona no segmento bancário (mas não no varejo).

---

## 3. Estrutura de usuários e mercado endereçável

### Demanda direta

- **Corretores de imóveis:** 650–730 mil inscritos no Cofeci (2025), ~700 mil ativos no fim de 2025, 74 mil empresas imobiliárias. Renda média R$ 3–4 mil/mês → sensibilidade a preço alta. PTAM por eles emitido custa R$ 500–2.000 (tabela CRECI-SP: R$ 882 → R$ 28.973 conforme o valor do imóvel).
- **Avaliadores CNAI** (corretor + selo certificador via cursos homologados COFECI): núcleo do funil de compra e público dos cursos parceiros.
- **Engenheiros/arquitetos avaliadores** (IBAPE: 25 institutos estaduais; só MG tem ~460 cadastros): honorários R$ 1.500–3.000 (residencial), R$ 7.200–16.200 referencial IBAPE (Grau I–III) → pagam caro pelo que economiza horas.

### Demanda institucional

- Bancos/consórcios/leilões: crédito imobiliário R$ 312 bi (2024) e R$ 376 bi projetados (2026, ABECIP) — todo crédito exige avaliação.
- Grandes escritórios de avaliação (ex.: Dexter Engenharia: 268 mil laudos, 750 engenheiros, 1.300 cidades — B2B de alto volume).
- Imobiliárias médias/grandes: multi-usuário, painel do gestor, white-label.

### Conformidade legal (importante para a venda)

- PTAM é atribuição de corretor com CRECI (Res. COFECI 1.066/2007); selo CNAl exige curso homologado. Laudo NBR 14653 pleno (judicial/bancário) é de engenheiro/arquiteto (CREA/CAU) + ART/RRT.
- Vender a ferramenta como "apoio ao profissional habilitado" (decisão técnica permanece do avaliador), nunca como laudo automatizado.

---

## 4. Modelo de negócio recomendado

### Formato: SaaS freemium em camadas (não cobrança por laudo como modelo principal)

Cobrança por uso fica restrita a *quotas* (número de avaliações por plano) — protege margem contra usuários intensivos sem complicar a venda. O custo real por avaliação é estimado em ~R$ 1–4 (Apify + Google Maps geocoding/places + Supabase).

### Tabela de planos (imobiliárias/corretoras)

| Plano | Preço | Público | Incluso |
|---|---|---|---|
| **Free** | R$ 0 | Aquisição (leads, trial 7 dias ou 2 avaliações) | 2 avaliações/mês, laudo com marca AVALIA, dashboard/trend básico |
| **Solo Pro** | **R$ 129/mês** (anual: R$ 1.290, −17% = 2 meses grátis) | Corretor avaliador individual | 30 avaliações/mês, **laudo white-label (logo/nome)**, trend por bairro/cidade, fotos IA, PDF completo |
| **Imobiliária** | **R$ 279/mês** (anual: R$ 2.790, −17%) | Micro imobiliária (3 cadeiras incl.; extra R$ 39/cadeira) | 100 avaliações/mês, multi-usuário, painel do gestor, membros com papéis, convites, suporte WhatsApp |
| **Imobiliária+** | **R$ 549/mês** (anual: R$ 5.490, −17%) | Imobiliária média (até 10 cadeiras) | 200 avaliações/mês, tudo do anterior + treinamento e suporte prioritário |
| **Créditos avulsos** | R$ 29,90 / 10 estudos | Todos (excedente da cota) | Não muda o plano; validade 12 meses — ~85% de margem |
| **Institucional** | R$ 1.500–4.000/mês + setup (sales-led) | 15+ corretores, SECOVI, consórcios, bancos | SSO/API, quotas sob medida, treinamento, conformidade, zoneamento/PL custom |
| **Anual** | −17% (2 meses grátis, padrão do mercado) | Todos | Retenção e antecipação de caixa |

**Cotas dimensionadas pela meta de custo:** variável ≤15% da receita com custo-alvo de US$ 0,075–0,10/estudo (Apify cacheado + prior curado). Excedente via créditos avulsos — nunca downgrade forçado nem perda de dados.

### Racional value-based

- Corretor PTAM = R$ 500–1.200 por laudo e 4–8 h de trabalho manual → R$ 149/mês se paga com 1 PTAM a cada 3 meses **apenas no tempo economizado**; no volume típico (1–3 laudos/mês), ROI é óbvio.
- Engenheiro: 1 laudo = R$ 1.500–3.000 → faixa Escritório R$ 299 é < 2% do valor de um laudo; vender em "horas economizadas e grau de fundamentação".
- Imobiliária média: custo ~R$ 30–50/corretor/mês; **1 captação extra/mês paga o sistema** (comissão média R$ 3k+).
- Ancoragem de preço: Imobisoft (R$ 199 CRM completo) e SYSIMOB (R$ 145–290) — o valor deve ficar **abaixo do CRM** porque é a camada de inteligência, não a operação.

---

## 5. Estado do produto hoje (o que existe e o que falta)

### Já implementado e funcional

- Motor ensemble MCD+IDW / WLS / GBDT com homogeneização NBR 14653 (oferta 0,90; área alométrica; tipologia empírica; comodidades por escopo; esquina/declividade/nível).
- Comparáveis automáticos via scraping Apify/VivaReal + filtro IQR + seleção dinâmica de raio (1–5 km, tolerâncias progressivas de área/quartos).
- Ross-Heidecke (depreciação), método involutivo com 3 cenários de viabilidade (zoneamento hoje é **stub** hardcoded).
- POIs de vizinhança (Google Places), IC 80%, score de confiança 0–100, radar de 7 fatores.
- Dashboard de métricas + endpoint `market/trend` por cidade ("valorização por bairro" — argumento de captação).
- Laudo PDF (render React + print) e landing pública com SEO.
- Análise de fotos IA (upload + Gemini Vision) já codada — não é o carro-chefe.

### Lacunas para monetizar (próximo trabalho de produto)

1. **Autenticação + multi-usuário + organização** (hoje não há contas/paywall).
2. **Billing** (Pix/cartão/boleto via Asaas; Stripe é alternativa) com webhook de assinatura e cancelamento.
3. **Quotas por plano** nas rotas `/api/valuations` e dashboards.
4. **White-label do PDF** (hoje o laudo tem a marca fixa "AVALIA" — crítico para vender a imobiliárias).
5. **Scoping por conta/org** nos dashboards (hoje são globais) + painel do gestor com lista de avaliações por corretor.
6. **Seções formais do PTAM** (identificação do avaliador, pressupostos/limitações, memorial de cálculo simplificado) — credibilidade do documento é argumento de compra.

---

## 6. Meios de venda (por ordem de prioridade)

1. **Demonstração assistida (canal primário do segmento imobiliárias)** — vendas por WhatsApp/telefone com demo personalizada; ciclo típico 1–2 semanas; alvo: SECOVI, sindicatos locais, associações de imobiliárias, grupos de corretores.
2. **Parceria com cursos de avaliação (motor de aquisição de massa)** — Laudo Master já distribui cupons do PROTO (50%/3 meses, 10%/12 meses); SysAcademy vende SYSIMOB em bundle. Alvos: IBREP (curso AVI), CMI Secovi-MG, IPOG, Laudo Master, CRECI/PROECCI-SP. Modelo: 30–60 dias grátis + comissão 15–25% pela primeira cobrança do aluno.
3. **Self-serve PLG** — trial 7 dias (padrão do mercado), checkout Pix/cartão/boleto, onboarding de 5 min; SEO técnico (calculadoras grátis como lead magnet — modelo do Valora Archicode) e blog de mercado.
4. **Vendas institucionais sales-led** — bancos, consórcios, escritórios credenciados: argumento de volume, API, conformidade BACEN/NBR 14653.
5. **Credibilidade técnica** — associação ao IBAPE/eventos (COBREAP), conteúdo assinado sobre NBR 14653; necessário para o público engenheiro.

**Não fazer agora:** marketplace de avaliações (rede PROTO-like) — alto custo operacional, exige tração e músculo institucional.

---

## 7. Unit economics — custos de infraestrutura por perfil de usuário

> Seção para apresentação ao sócio. Valores de referência 2026, câmbio US$ 1 ≈ R$ 5,30.
> Metas: custo variável ≤ 15% da receita dos planos pagos e custo fixo da plataforma
> alocado ≤ 10% da receita mensal no momento em que se sustentar.

### 7.1 O que custa cada componente (por avaliação)

| Componente | O que é | Custo/estudo (cenário alvo) |
|---|---|---|
| **Apify (scraping VivaReal)** | 1 run por bairro+tipologia alimenta vários estudos | **US$ 0,03** amortizado (com cache 15 dias) — sem cache: US$ 0,16–0,60 |
| **Google Maps — Geocoding** | endereço → coordenadas | US$ 0,005 |
| **Google Maps — Places Nearby** | POIs do entorno (esco-las, hospitais > fator vizinhança) | US$ 0,032 |
| **Google Maps — Static Maps** | mapa de fundo do PDF | US$ 0,002 |
| **Gemini Vision (fotos)** | leitura das fotos → sugestão padrão/conservação (8 fotos) | US$ 0,002–0,01 (Flash US$0,30/1M in, US$2,50/1M out) |
| **Supabase (compute/storage/auth)** | variável por operação | US$ 0,003 |
| **TOTAL por estudo (alvo)** | | **≈ US$ 0,075–0,10 (R$ 0,40–0,53)** |

Pior caso com Apify sem cache: US$ 0,65/estudo (R$ 3,45) — **motivo da meta de cache de 15 dias** (já implementada: bairro "quente" não refaz run; prior curado por cidade ancora amostras fracas).

### 7.2 Custo fixo mensal da plataforma (arquitetura escalável)

| Nível | Receita mensal | Stack | Custo fixo/mês |
|---|---|---|---|
| MVP | 0–R$ 15k | Railway Pro (backend, cap de gasto) US$ 25–45 + **Supabase Pro US$ 25** + front estático (Cloudflare Pages US$ 0) + observabilidade US$ 5–15 | **US$ 55–85 (R$ 290–450)** |
| Crescimento | R$ 15–60k | Railway tiers + Supabase Pro multi-instância + filas/workers | US$ 150–300 |
| Escala | R$ 100k+ | Kubernetes/VPS + Postgres dedicado | US$ 500–1.500 |

**Por que não Vercel como backend:** workload pesado (sharp/HEIC + scraping síncrono até 5 min) custa US$ 55–110/mês em Vercel Pro e a cobrança por banda/CPU surpreende em pico. Railway (cap configurado) + Supabase é o equilíbrio MVP-escalável. (Vite front fica em CDN grátis.)

### 7.3 Custos por plano (1 organização usando 100% da cota)

| Plano | Preço R$ | Receita US$ | Estudos/mês | Custo variável US$ | Fixo share* | **Custo total** | **Margem bruta** |
|---|---|---|---|---|---|---|---|
| **Free** | 0 | 0 | 2 | 0,15–0,20 | ~0 | US$ 0,20 | Prejuízo proposital (aquisição; 2 estudos não disparam run por cache+prior) |
| **Solo Pro** | 129 | 24,3 | 30 | 2,3–3,0 | 5 | US$ 8,3 | **≈ 66–90%** |
| **Imobiliária** | 279 | 52,6 | 100 | 7,5–10,0 | 8 | US$ 18 | **≈ 66–86%** |
| **Imobiliária+** | 549 | 103,6 | 200 | 15–20 | 12 | US$ 32 | **≈ 69–85%** |
| Créditos avulsos | 29,90 (10 estudos) | 5,6 | 10 | 0,75–1,00 | ~0 | US$ 1 | **≈ 82–87%** |
| Institucional | sob contrato | alto | alto | 25–40% da receita | — | — | neg. ≥ 60% |

*Fixo share = proporção de ~US$ 60/mês de plataforma dividida por ~8–15 clientes pagos ativos.

- **Ponto de equilíbrio da plataforma:** ~R$ 3.500–4.500/mês de receita (≈ 8–12 clientes pagos médios) cobre o fixo US$ 55–85.
- **Como a margem é garantida:** cache de bairro TTL 15 dias (implementado) + prior curado por cidade (Nordeste coberto; expandir capitais) + cotas por plano como teto de gasto + créditos avulsos com ~85% de margem.
- **Meta de longo prazo:** variável ≤15% e fixo ≤10% → margem operacional alvo **≥ 70% bruto / ≥ 55% operacional**, padrão SaaS saudável.

### 7.4 Segurança dos dados (diligência para sócio/parceiros)

- **Supabase** (Postgres + Auth + Storage + RLS): SOC 2 Type II, criptografia em trânsito/repouso, backup automático (Pro: 7 dias + PITR opcional), auth gerenciado com MFA/rate-limit nativo; **bucket de fotos privado + proxy autenticado + EXIF removido; audit_logs**. 
- **Pendências formais:** (1) DPA com clientes e SCCs ANPD com provedores (Supabase/Google/Apify — prazo Res. ANPD 19/2024 venceu ago/2025); (2) nomear Encarregado/DPO (documentos prontos em `docs/lgpd/`).
- **Futuro enterprise (bancos/consórcios):** avaliar self-hosted Postgres ou Supabase Dedicated + ISO 27001 antes de questionários de segurança institucionais.

---

*Fontes de preço: ai.google.dev/gemini-api/docs/pricing (Gemini Flash $0,30/1M in · $2,50/1M out), Google Maps Platform core pricing (Geocoding US$5/1 mil · Places Nearby Search Pro US$32/1 mil · Static Maps US$2/1 mil), Railway (US$5 base + uso) / Vercel Pro US$20/seat + consumo (não recomendado p/ backend), Supabase Pro US$25/mês, Apify (faixa por run informada pelo time: US$0,16–0,60).*

---

## 8. Roadmap de execução

### Fase 1 — Fundação monetizável (~2–3 semanas)
- Auth (Supabase) com contas + organização por imobiliária.
- Quotas por plano (contador nas rotas de avaliação e RPC de dashboard).
- Billing Asaas (Pix + cartão + boleto) com webhook de assinatura/cancelamento; paywall nas rotas.
- Onboarding: trial 7 dias automático (ou 2 avaliações grátis) + checkout pela landing.

### Fase 2 — Pronto para venda B2B (~1–2 semanas)
- White-label do PDF (nome/logo da imobiliária).
- Seções formais do PTAM (avaliador, pressupostos, memorial simplificado).
- Painel do gestor por organização + filtros por usuário nos dashboards.
- Página de preços com planos e FAQ (grátis até X; cancelamento a qualquer momento).

### Fase 3 — Semeadura (~2 semanas, em paralelo)
- 10–20 imobiliárias amostra (SECOVI, sindicatos, grupos de WhatsApp) com demo personalizada.
- Fechar 2–3 parcerias de cursos de avaliação.
- Conteúdo SEO "avaliação para captação" + dados de bairro (landing já existe).

---

*Fontes principais: sites públicos dos concorrentes (2025–2026), Cofeci (730k corretores, 74k imobiliárias), ABECIP (crédito imobiliário), Manual CNAI/COFECI (honorários PTAM e hora técnica), IBAPE-MG/SP (honorários de engenharia).*
