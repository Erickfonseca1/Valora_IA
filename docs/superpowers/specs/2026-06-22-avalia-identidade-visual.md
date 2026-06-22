# AVALIA — Identidade Visual Completa

**Data:** 2026-06-22  
**Escopo:** Redesign completo do sistema visual do frontend (AppShell, Dashboard, Report, ValuationFlow, componentes compartilhados)  
**Nome do produto:** AVALIA — Avaliação Imobiliária Assistida por Inteligência Artificial

---

## Objetivo

Substituir a identidade visual genérica de SaaS (navy + verde, unicode icons, DM Sans único) por um sistema coerente que comunica **autoridade, precisão técnica e valor** — alinhado ao domínio de avaliação imobiliária formal (PTAM / NBR 14653). O produto deve parecer que pertence ao mundo do perito imobiliário, não de uma startup de growth.

## Decisões Fechadas

| Dimensão | Decisão |
|----------|---------|
| Nome | **AVALIA** (substitui "Valora AI") |
| Paleta base | Navy-deep + ouro (substitui navy + verde) |
| Background | Parchment `#F7F4EE` (substitui slate-50 frio) |
| Acento principal | Gold `#C9A227` (substitui ACCENT verde `#10B981`) |
| Verde | Reservado para variação positiva de mercado (semântica), não identidade |
| Tipografia | DM Mono para valores/números + DM Sans para UI (família unificada) |
| Ícones | `lucide-react` substitui unicode placeholders |
| Elemento de assinatura | Arco SVG — aparece em logo, gauge, spinner, nav ativo, separadores |
| SectionHeader do Report | Regra gold esquerda substitui retângulo navy sólido |

---

## Sistema de Tokens

### Cores

```
--navy-deep:     #0F2561   /* sidebar bg, peso máximo */
--navy:          #1E3A8A   /* botões primários, mantido */
--gold:          #C9A227   /* accent, valores-chave, ativos */
--gold-tint:     #FEFCF5   /* card âncora bg, badge highlight */
--gold-border:   #E8D99A   /* borda de card ativo */
--parchment:     #F7F4EE   /* page background */
--surface:       #FFFFFF   /* cards, painéis */
--border:        #E8E0CF   /* bordas de card */
--text-primary:  #1A1A1A   /* texto principal */
--text-secondary:#6B6B6B   /* labels secundários */
--text-muted:    #9E9E9E   /* placeholders, disabled */
```

### Tipografia

| Voz | Fonte | Uso |
|-----|-------|-----|
| Valores / Números | `DM Mono` 400/700 | Preços BRL, scores de confiança, métricas numéricas grandes |
| UI / Corpo | `DM Sans` 400/600/700 | Labels, parágrafos, botões, navegação |

Scale: `11px` eyebrow · `13px` body · `15px` subhead · `26px` card metric · `38px` hero value

Google Fonts import: adicionar `DM+Mono:wght@400;700` ao lado do DM Sans já carregado.

### Ícones

`lucide-react` · tamanho `18px` · stroke `1.5px`

| Rota | Ícone |
|------|-------|
| Painel | `LayoutDashboard` |
| Nova Avaliação | `PlusCircle` |
| Relatórios | `FileText` |
| Portfólio | `Briefcase` |
| Configurações | `Settings` |

### Elemento de Assinatura — O Arco

Arco SVG fino em gold. Forma recorrente em:
1. **Logo** — sobre a letra A no wordmark
2. **ConfidenceGauge** — fill do arco de confiança
3. **Spinner de loading** — arco girando (substitui border-spinner atual)
4. **Nav ativo** — borda esquerda 3px gold (interpretação linear do arco)
5. **SectionHeader do Report** — regra esquerda gold

---

## Componentes

### `index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');

body {
  font-family: 'DM Sans', sans-serif;
  background: #F7F4EE;
  -webkit-font-smoothing: antialiased;
}
```

Trocar `background: #F8FAFC` por `#F7F4EE`.  
Adicionar import DM Mono.  
Trocar cor do spinner `.animate-spin-slow` e `.comp-pin` para usar gold onde hoje usa verde.

### `AppShell.tsx`

**Sidebar:**
- `background: #0F2561` (era `#1E3A8A`)
- Logo: substituir "V" em caixa por wordmark SVG — `AVALIA` + arco fino acima do A
- Subtitle: "Avaliação Imobiliária" (era "Agente de Precificação")
- Ícones: `lucide-react` substituindo unicode
- Active state: `border-left: 3px solid #C9A227` + `background: rgba(201,162,39,0.12)`
- Hover: CSS class com `rgba(255,255,255,0.08)` — remover inline `onMouseEnter/Leave`

**Header:**
- `border-bottom: 1px solid #E8E0CF` (era `border-slate-200`)
- Botão "Nova Avaliação": adicionar ícone `PlusCircle` 16px à esquerda
- Mobile logo: "AVALIA" em DM Sans ExtraBold (era "Valora AI")

### `Dashboard.tsx`

**Cards de métricas:**
- Card âncora ("Avaliações Este Mês"): `border-left: 3px solid #C9A227`, `background: #FEFCF5`, `border-color: #E8D99A`
- "Confiança Média": valor em gold (`color: #C9A227`, DM Mono)
- Todos os cards: hover `box-shadow: 0 4px 16px rgba(201,162,39,0.10)`
- Ícones: lucide substituindo unicode
- Valores numéricos: `font-family: 'DM Mono'`

**Tabela de avaliações:**
- `thead bg: #F7F4EE` (era `bg-slate-50`)
- `tbody border: #E8E0CF` (era `border-slate-100`)
- Row hover: `background: #F7F4EE`
- Coluna "Preço IA": `font-family: 'DM Mono'`, bold
- "Ver todas →": `color: #C9A227`

**Gráfico de tendência:**
- Linha do `MiniLineChart`: `color: #C9A227` (era `ACCENT = #10B981`)
- Valores numéricos: DM Mono

### `Charts.tsx`

- `MiniLineChart`: prop `color` passada do Dashboard já é ACCENT — basta trocar o valor da constante no Dashboard
- `ConfidenceBadge`: score ≥ 75 → `color: #C9A227, background: #FEFCF5` (era verde `#10B981` / `#ECFDF5`); score < 60 → manter vermelho `#EF4444`; score 60–74 → âmbar `#F59E0B`

### `ConfidenceGauge.tsx`

- Arco fill: `stroke: #C9A227` (era provavelmente verde ou navy)
- Arco track (fundo): `stroke: #E8E0CF`
- Texto do score: `font-family: 'DM Mono'`

### `LiveValuationHero.tsx`

- Coluna esquerda: `background: #FEFCF5` (parchment leve, diferencia do mapa)
- Valor (`ValueCountUp`): garantir `style={{ fontFamily: "'DM Mono', monospace" }}` no `<span>` do valor formatado
- Gauge: já coberto em ConfidenceGauge
- Pins comparáveis (`ComparablesMap`): trocar cor de comparáveis de `#10B981` para `#C9A227`
- Pin alvo: `#0F2561`

### `ValueCountUp.tsx`

- Adicionar `fontFamily: 'DM Mono'` no elemento span do valor

### `ValueWaterfall.tsx`

- Barras positivas (fatores que aumentam valor): `#C9A227`
- Barras negativas: `#EF4444` (manter)
- Barra base: `#0F2561`
- Grid lines: `#E8E0CF`

### `Report.tsx` — `SectionHeader`

Atual:
```tsx
<div style={{ background: PRIMARY, color: '#fff', padding: '10px 20px', ... }}>
```

Novo:
```tsx
<div style={{
  borderLeft: '3px solid #C9A227',
  paddingLeft: 16,
  paddingTop: 10,
  paddingBottom: 10,
  borderBottom: '1px solid #E8E0CF',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'transparent',
}}>
  <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#C9A227', fontWeight: 700 }}>
    {number}
  </span>
  <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.2px' }}>
    {title}
  </span>
</div>
```

Cards de seção no Report: `border: 1px solid #E8E0CF`, `border-radius: 12px`, `background: #FFFFFF`, `box-shadow: 0 2px 8px rgba(0,0,0,0.04)`.

Botão "Baixar PDF":
```
border: 1px solid #E8E0CF
background: #FFFFFF
color: #1A1A1A
hover: border-color #C9A227, color #C9A227
```

### `ValuationFlow.tsx`

**Stepper visual:**
- Substituir referência ao array `STEPS` por componente stepper horizontal
- Done: círculo gold fill + checkmark branco
- Active: círculo navy-deep + ring gold `2px`
- Pending: círculo branco + `border: 1px solid #E8E0CF`
- Connector done: linha gold; connector pending: `#E8E0CF`

**Inputs:**
- Focus: `border-color: #C9A227`, `ring: rgba(201,162,39,0.15)` (substitui azul Tailwind default)

**Tipo de imóvel (pills):**
- Ativo: `background: #0F2561, color: #FFFFFF`
- Inativo: `background: #FFFFFF, border: 1px solid #E8E0CF`

**Loading (SkeletonStep):**
- Spinner: arco SVG gold animado (substitui border-spinner navy/slate)
- Ícone de step concluído: gold (era verde `ACCENT`)

### `ExtractionCard.tsx`

- Header: `background: #F7F4EE`, ícone `Sparkles` (lucide) em gold
- Campos confirmados: `border-left: 2px solid #C9A227`, `background: #FEFCF5`
- Campos a revisar: `border-left: 2px solid #F59E0B` (âmbar — distinção semântica: gold = confirmado, âmbar = revisar)

---

## Não-objetivos

- Sem mudança em `LaudoPDF.tsx` — PDF permanece estático
- Sem alteração de layout — estrutura de grids e proporções mantidas
- Sem novos componentes de UI além do stepper e do wordmark SVG
- Sem mudança em rotas, estado ou lógica de negócio
- Sem migração de `styled-components` ou outro sistema — tudo em inline styles + Tailwind, mesmo padrão atual

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `ValoraIA_front/src/index.css` | background parchment, import DM Mono, cores de keyframes |
| `ValoraIA_front/src/components/AppShell.tsx` | logo, sidebar navy-deep, active gold, lucide icons |
| `ValoraIA_front/src/components/Dashboard.tsx` | card âncora, DM Mono valores, gold no gráfico |
| `ValoraIA_front/src/components/Charts.tsx` | ConfidenceBadge gold, cores |
| `ValoraIA_front/src/components/ConfidenceGauge.tsx` | arco gold |
| `ValoraIA_front/src/components/ValueCountUp.tsx` | DM Mono |
| `ValoraIA_front/src/components/ValueWaterfall.tsx` | paleta gold/navy/red |
| `ValoraIA_front/src/components/LiveValuationHero.tsx` | bg parchment, pins gold |
| `ValoraIA_front/src/components/Report.tsx` | SectionHeader, cards, botão PDF |
| `ValoraIA_front/src/components/ValuationFlow.tsx` | stepper, focus gold, spinner arco |
| `ValoraIA_front/src/components/ExtractionCard.tsx` | header, campos gold/âmbar |
| `ValoraIA_front/package.json` | adicionar `lucide-react` |
