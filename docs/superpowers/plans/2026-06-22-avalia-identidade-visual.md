# AVALIA — Identidade Visual: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar identidade visual completa do AVALIA: paleta parchment+gold, DM Mono em valores, lucide-react nos ícones, arco gold como elemento de assinatura, novo wordmark, SectionHeader document-like.

**Architecture:** Mudanças puramente visuais — sem alteração de lógica, rotas ou schema. Todas as constantes de cor `PRIMARY/ACCENT` nos componentes passam a referenciar as novas cores. Tailwind recebe tokens `gold`, `parchment`, `navy-deep`. Nenhum novo componente de dado.

**Tech Stack:** React 18 + Vite, TypeScript, Tailwind v3, lucide-react (a instalar), DM Mono (Google Fonts), inline styles + Tailwind classes (padrão do projeto).

## Global Constraints

- Nunca alterar lógica de negócio, tipos, rotas ou backend
- Não mudar estrutura de layout (grid columns, breakpoints existentes)
- Manter todos os testes passando após cada task — `npm test` roda vitest watch; use `npm run test -- --run` para one-shot
- Não trocar `styled-components` nem introduzir CSS Modules — padrão do projeto é inline styles + Tailwind
- Diretório de trabalho: `ValoraIA_front/`
- Instalar dependências com `npm install` dentro de `ValoraIA_front/`
- Não adicionar co-autor nos commits

---

## Mapa de Arquivos

| Arquivo | Tipo | O que muda |
|---------|------|------------|
| `index.html` | Modify | título, DM Mono font |
| `tailwind.config.ts` | Modify | tokens gold, parchment, navy-deep, border-warm |
| `src/index.css` | Modify | bg parchment, .input-focus, .sidebar-nav-item, keyframes |
| `ValoraIA_front/package.json` | Modify | add lucide-react |
| `src/components/AppShell.tsx` | Modify | wordmark, lucide icons, gold active state, navy-deep |
| `src/components/ConfidenceGauge.tsx` | Modify | arco gold |
| `src/components/ValueCountUp.tsx` | Modify | DM Mono |
| `src/components/Charts.tsx` | Modify | ConfidenceBadge gold, RadarChart gold |
| `src/components/ValueWaterfall.tsx` | Modify | paleta gold/navy/red, DM Mono |
| `src/components/Dashboard.tsx` | Modify | card âncora gold, DM Mono, const ACCENT → gold |
| `src/components/ComparablesMap.tsx` | Modify | comparable pin color → gold |
| `src/components/LiveValuationHero.tsx` | Modify | left col parchment |
| `src/components/Report.tsx` | Modify | SectionHeader, SectionCard, PDF button, spinner |
| `src/components/ValuationFlow.tsx` | Modify | stepper circles, spinner arc, focus gold, pills, label |
| `src/components/ExtractionCard.tsx` | Modify | header parchment, campo states, amenity gold |

---

## Task 1: Setup — lucide-react, tokens Tailwind, fontes, CSS base

**Files:**
- Modify: `ValoraIA_front/package.json`
- Modify: `ValoraIA_front/tailwind.config.ts`
- Modify: `ValoraIA_front/index.html`
- Modify: `ValoraIA_front/src/index.css`

**Interfaces:**
- Produces: tokens Tailwind `gold`, `parchment`, `navy-deep`, `border-warm`; classe CSS `.input-focus`; classe `.sidebar-nav-item`; fonte DM Mono disponível globalmente

- [ ] **Step 1: Instalar lucide-react**

```bash
cd ValoraIA_front && npm install lucide-react
```

Esperado: `added 1 package` sem erros.

- [ ] **Step 2: Atualizar tailwind.config.ts**

Substituir o conteúdo completo do arquivo:

```ts
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        primary: '#1E3A8A',
        'navy-deep': '#0F2561',
        gold: '#C9A227',
        'gold-tint': '#FEFCF5',
        'gold-border': '#E8D99A',
        parchment: '#F7F4EE',
        'border-warm': '#E8E0CF',
        accent: '#10B981',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Atualizar index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AVALIA — Avaliação Imobiliária com IA</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Atualizar src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: 'DM Sans', sans-serif;
  background: #F7F4EE;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: #C9A22722;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #E8E0CF;
  border-radius: 3px;
}

/* Input focus gold */
.input-focus:focus {
  border-color: #C9A227 !important;
  box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.15) !important;
  outline: none;
}

/* Sidebar nav item hover */
.sidebar-nav-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08) !important;
  opacity: 1 !important;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-slide-up {
  animation: fadeSlideUp 0.6s ease forwards;
}

.animate-fade-slide-up-delay {
  animation: fadeSlideUp 0.6s ease 0.15s forwards;
  opacity: 0;
}

.animate-spin-slow {
  animation: spin 0.8s linear infinite;
}

@keyframes pinDrop {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.comp-pin {
  transform-origin: center;
  animation: pinDrop 0.4s ease-out both;
}
.comp-pin-0 { animation-delay: 0.05s; }
.comp-pin-1 { animation-delay: 0.13s; }
.comp-pin-2 { animation-delay: 0.21s; }
.comp-pin-3 { animation-delay: 0.29s; }
.comp-pin-4 { animation-delay: 0.37s; }
@media (prefers-reduced-motion: reduce) {
  .comp-pin { animation: none; }
}

.live-hero { grid-template-columns: minmax(260px, 1fr) minmax(280px, 1.2fr); }
.live-hero > div:first-child span { font-size: 38px; font-weight: 900; color: #1A1A1A; font-family: 'DM Mono', monospace; line-height: 1; }
@media (max-width: 640px) {
  .live-hero { grid-template-columns: 1fr !important; }
}
```

- [ ] **Step 5: Rodar testes e confirmar baseline**

```bash
cd ValoraIA_front && npm run test -- --run
```

Esperado: todos os testes passam (mesmo resultado de antes desta task).

- [ ] **Step 6: Commit**

```bash
git add ValoraIA_front/package.json ValoraIA_front/package-lock.json ValoraIA_front/tailwind.config.ts ValoraIA_front/index.html ValoraIA_front/src/index.css
git commit -m "feat(ui): setup AVALIA tokens, DM Mono, lucide-react, parchment bg"
```

---

## Task 2: AppShell — wordmark AVALIA, lucide icons, gold active state

**Files:**
- Modify: `ValoraIA_front/src/components/AppShell.tsx`

**Interfaces:**
- Consumes: lucide-react (Task 1), tokens Tailwind (Task 1)
- Produces: sidebar com wordmark AVALIA + arco, lucide icons, active state gold

- [ ] **Step 1: Reescrever AppShell.tsx**

Substituir o arquivo completo:

```tsx
import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, FileText, Briefcase, Settings, Plus } from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel', path: '/' },
  { icon: PlusCircle, label: 'Nova Avaliação', path: '/nova-avaliacao' },
  { icon: FileText, label: 'Relatórios', path: '/relatorios' },
  { icon: Briefcase, label: 'Portfólio', path: '/portfolio', disabled: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', disabled: true },
]

function AvaliaWordmark() {
  return (
    <div>
      <svg width="76" height="7" viewBox="0 0 76 7" style={{ display: 'block', marginBottom: 3, marginLeft: 1 }}>
        <path d="M 0 6 Q 38 0 76 6" fill="none" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 16,
        fontWeight: 800,
        color: '#FFFFFF',
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        AVALIA
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3, letterSpacing: '0.02em' }}>
        Avaliação Imobiliária
      </div>
    </div>
  )
}

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const Sidebar = (
    <aside
      className="flex flex-col flex-shrink-0 py-6"
      style={{ background: '#0F2561', width: 220, height: '100%' }}
    >
      <div className="px-5 pb-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <AvaliaWordmark />
      </div>

      <nav className="flex-1 p-2.5 mt-4">
        {NAV_ITEMS.map(item => {
          const active = !item.disabled && (
            location.pathname === item.path ||
            (item.path === '/relatorios' && location.pathname.startsWith('/relatorios'))
          )
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => !item.disabled && navigate(item.path)}
              disabled={item.disabled}
              className="sidebar-nav-item flex items-center gap-2.5 w-full py-2.5 rounded-lg border-none text-sm text-left mb-0.5 transition-all duration-150"
              style={{
                paddingLeft: active ? 9 : 12,
                paddingRight: 12,
                background: active ? 'rgba(201,162,39,0.12)' : 'transparent',
                borderLeft: active ? '3px solid #C9A227' : '3px solid transparent',
                color: '#fff',
                fontWeight: active ? 600 : 400,
                opacity: item.disabled ? 0.25 : 1,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={17} strokeWidth={1.5} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            EP
          </div>
          <div>
            <div className="text-xs font-medium text-white">Edizio Peixoto</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Corretor · Premium</div>
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen font-sans text-slate-900" style={{ background: '#F7F4EE' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        {Sidebar}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className="fixed top-0 left-0 h-full z-50 md:hidden transition-transform duration-300"
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {Sidebar}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-[60px] px-4 md:px-7 flex items-center justify-between bg-white flex-shrink-0 gap-3" style={{ borderBottom: '1px solid #E8E0CF' }}>
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer text-slate-600 hover:bg-slate-100 flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
            style={{ fontFamily: 'inherit', fontSize: 18 }}
          >
            ☰
          </button>

          {/* Logo mobile */}
          <div className="md:hidden font-bold text-slate-900 flex-1 text-sm" style={{ letterSpacing: '-0.3px', fontWeight: 800 }}>
            AVALIA
          </div>

          {/* Spacer desktop */}
          <div className="hidden md:flex flex-1" />

          <button
            onClick={() => navigate('/nova-avaliacao')}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg border-none cursor-pointer text-xs md:text-sm font-semibold text-white transition-opacity hover:opacity-85 whitespace-nowrap flex-shrink-0"
            style={{ background: '#1E3A8A', fontFamily: 'inherit' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Nova Avaliação
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

O teste `AppShell.test.tsx` pode verificar texto de navegação — confirmar que ainda passa. Se falhar por causa do ícone de texto, atualizar o teste para procurar pelo label de texto dos itens.

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/AppShell.tsx
git commit -m "feat(ui): wordmark AVALIA, lucide icons, gold active nav, navy-deep sidebar"
```

---

## Task 3: ConfidenceGauge — arco gold

**Files:**
- Modify: `ValoraIA_front/src/components/ConfidenceGauge.tsx`

**Interfaces:**
- Produces: `ConfidenceGauge` com arco fill `#C9A227`, track `#E8E0CF`, score em DM Mono

- [ ] **Step 1: Atualizar ConfidenceGauge.tsx**

```tsx
interface Props {
  score: number | null
  size?: number
}

export default function ConfidenceGauge({ score, size = 120 }: Props) {
  if (score == null) return null

  const pct = Math.round(score <= 1 ? score * 100 : score)
  const clamped = Math.max(0, Math.min(100, pct))

  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped / 100)

  return (
    <svg
      data-testid="confidence-gauge"
      data-pct={String(clamped)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Grau de confiança ${clamped}%`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E0CF" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#C9A227"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />
      <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.22} fontWeight={900} fill="#1A1A1A" fontFamily="'DM Mono', monospace">
        {clamped}%
      </text>
      <text x="50%" y="66%" textAnchor="middle" fontSize={size * 0.1} fill="#6B6B6B">
        confiança
      </text>
    </svg>
  )
}
```

- [ ] **Step 2: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

O teste `ConfidenceGauge.test.tsx` verifica `data-pct` e proporção do arco — deve passar sem alteração.

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/ConfidenceGauge.tsx
git commit -m "feat(ui): arco de confiança gold, track border-warm, score DM Mono"
```

---

## Task 4: ValueCountUp — DM Mono

**Files:**
- Modify: `ValoraIA_front/src/components/ValueCountUp.tsx`

**Interfaces:**
- Produces: `ValueCountUp` renderiza valor BRL em `DM Mono`

- [ ] **Step 1: Atualizar ValueCountUp.tsx**

Trocar a linha de retorno:

```tsx
// de:
return <span className={className}>{BRL.format(display)}</span>

// para:
return (
  <span className={className} style={{ fontFamily: "'DM Mono', monospace" }}>
    {BRL.format(display)}
  </span>
)
```

O arquivo completo fica:

```tsx
import { useEffect, useRef, useState } from 'react'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

interface Props {
  value: number
  animate?: boolean
  className?: string
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export default function ValueCountUp({ value, animate = true, className }: Props) {
  const [display, setDisplay] = useState(animate && !prefersReducedMotion() ? 0 : value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setDisplay(value)
      return
    }
    const duration = 900
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, animate])

  return (
    <span className={className} style={{ fontFamily: "'DM Mono', monospace" }}>
      {BRL.format(display)}
    </span>
  )
}
```

- [ ] **Step 2: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

`ValueCountUp.test.tsx` testa formato BRL — deve passar.

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/ValueCountUp.tsx
git commit -m "feat(ui): DM Mono em ValueCountUp"
```

---

## Task 5: Charts — ConfidenceBadge gold, RadarChart gold

**Files:**
- Modify: `ValoraIA_front/src/components/Charts.tsx`

**Interfaces:**
- Produces: `ConfidenceBadge` com score ≥75 em gold; `RadarChart` com polígono gold

- [ ] **Step 1: Atualizar Charts.tsx**

Substituir o arquivo completo:

```tsx
import type { RadarFactor } from '../types'

interface MiniLineChartProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function MiniLineChart({ data, color = '#C9A227', width = 280, height = 120 }: MiniLineChartProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 20) - 10
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v - min) / range) * (height - 20) - 10
        return i === data.length - 1 ? (
          <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#fff" strokeWidth="2" />
        ) : null
      })}
    </svg>
  )
}

interface RadarChartProps {
  factors: RadarFactor[]
  size?: number
}

export function RadarChart({ factors, size = 240 }: RadarChartProps) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 30
  const n = factors.length
  const angleStep = (Math.PI * 2) / n

  const getPoint = (i: number, val: number) => {
    const angle = angleStep * i - Math.PI / 2
    return {
      x: cx + Math.cos(angle) * r * val,
      y: cy + Math.sin(angle) * r * val,
    }
  }

  const gridLevels = [0.25, 0.5, 0.75, 1]
  const dataPoints = factors.map((f, i) => getPoint(i, f.value))

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: size }}>
      {gridLevels.map((level, li) => {
        const pts = factors.map((_, i) => getPoint(i, level))
        return (
          <polygon
            key={li}
            points={pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#E8E0CF"
            strokeWidth="1"
          />
        )
      })}
      {factors.map((_, i) => {
        const p = getPoint(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E8E0CF" strokeWidth="1" />
      })}
      <polygon
        points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(201,162,39,0.12)"
        stroke="#C9A227"
        strokeWidth="2"
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#C9A227" stroke="#fff" strokeWidth="2" />
      ))}
      {factors.map((f, i) => {
        const p = getPoint(i, 1.18)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#6B6B6B"
            fontWeight="500"
          >
            {f.label}
          </text>
        )
      })}
    </svg>
  )
}

interface ConfidenceBadgeProps {
  score: number
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const color = score >= 75 ? '#C9A227' : score >= 60 ? '#F59E0B' : '#EF4444'
  const bg = score >= 75 ? '#FEFCF5' : score >= 60 ? '#FFFBEB' : '#FEF2F2'

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {score}% Conf.
    </span>
  )
}

interface BarIndicatorProps {
  label: string
  value: number
  color?: string
  tooltip?: string
}

export function BarIndicator({ label, value, color = '#1E3A8A', tooltip }: BarIndicatorProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 text-slate-500">
        <span className={`${tooltip ? 'cursor-help border-b border-dotted border-slate-300' : ''}`}>
          {tooltip ? (
            <span className="group relative inline-block">
              {label}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal w-56 z-50 text-center leading-relaxed">
                {tooltip}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800" />
              </span>
            </span>
          ) : (
            label
          )}
        </span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#E8E0CF' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ background: color, width: `${value}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/Charts.tsx
git commit -m "feat(ui): ConfidenceBadge gold, RadarChart gold, MiniLineChart default gold"
```

---

## Task 6: ValueWaterfall — paleta gold/navy, DM Mono

**Files:**
- Modify: `ValoraIA_front/src/components/ValueWaterfall.tsx`

**Interfaces:**
- Produces: multipliers em gold, valor final em gold, bordas em border-warm, monospace → DM Mono

- [ ] **Step 1: Atualizar ValueWaterfall.tsx**

Substituir as 3 primeiras linhas de constantes e as referências de cor/fonte:

```tsx
import type { HomogenizationFactors } from '../types'

const NAVY = '#0F2561'
const GOLD = '#C9A227'
const BORDER = '#E8E0CF'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPpm2 = (v: number) => fmtBRL(Math.round(v)) + '/m²'
const fmtMult = (v: number) => '× ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MONO = "'DM Mono', monospace"

export interface WaterfallRow {
  key: 'physical' | 'amenity'
  label: string
  multiplier: number
  runningPpm2: number
  sub: string
  caption?: string
  neutral: boolean
}

export function buildWaterfallRows(f: HomogenizationFactors): WaterfallRow[] {
  const afterPhysical = f.ensemble_ppm2 * f.physical_factor
  const afterAmenity = afterPhysical * f.amenity_factor
  return [
    {
      key: 'physical',
      label: 'Fatores físicos',
      multiplier: f.physical_factor,
      runningPpm2: afterPhysical,
      sub: `Esquina ${f.corner_factor.toFixed(2)} · Topografia ${f.slope_factor.toFixed(2)} · Nível ${f.level_factor.toFixed(2)}`,
      neutral: f.physical_factor === 1,
    },
    {
      key: 'amenity',
      label: 'Comodidades por escopo',
      multiplier: f.amenity_factor,
      runningPpm2: afterAmenity,
      sub: `Interno ${f.amenity_internal.toFixed(2)} · Condomínio ${f.amenity_condo.toFixed(2)} · Entorno ${f.amenity_proximo.toFixed(2)}`,
      caption: 'Diferenciais que valorizam o imóvel acima do mercado base.',
      neutral: f.amenity_factor === 1,
    },
  ]
}

const muted = '#9E9E9E'

export default function ValueWaterfall({ factors }: { factors: HomogenizationFactors }) {
  const rows = buildWaterfallRows(factors)

  return (
    <div style={{ padding: '18px 22px' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: '0 0 10px' }}>
        Como Chegamos a Este Valor
      </h3>
      <p style={{ fontSize: 13, color: '#6B6B6B', margin: '0 0 18px', lineHeight: 1.7 }}>
        O valor parte do preço unitário de mercado (ensemble dos comparáveis homogeneizados) e recebe
        os ajustes do imóvel avaliado. Cada fator multiplica o R$/m² acumulado.
      </p>

      {/* Base */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Valor unitário de mercado (ensemble)</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
            ↳ Comparáveis já ajustados por oferta (−{Math.round((1 - factors.offer_factor) * 100)}%) e tipologia, conforme NBR 14.653.
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, fontFamily: MONO, whiteSpace: 'nowrap' }}>
          {fmtPpm2(factors.ensemble_ppm2)}
        </div>
      </div>

      {/* Fatores */}
      {rows.map(r => (
        <div key={r.key} style={{ borderTop: `1px solid ${BORDER}`, padding: '10px 0', opacity: r.neutral ? 0.5 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                {r.label} {r.neutral && <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>(sem efeito)</span>}
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.sub}</div>
              {r.caption && !r.neutral && (
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>↳ {r.caption}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: r.neutral ? muted : GOLD, fontFamily: MONO }}>
                {fmtMult(r.multiplier)}
              </div>
              <div style={{ fontSize: 12, color: '#6B6B6B', fontFamily: MONO, marginTop: 2 }}>
                {fmtPpm2(r.runningPpm2)}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Resultado unitário */}
      <div style={{ borderTop: `2px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0 10px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>R$/m² homogeneizado</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, fontFamily: MONO }}>
          {fmtPpm2(factors.ppm2_homogenized)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#6B6B6B' }}>Área útil</div>
        <div style={{ fontSize: 13, color: '#6B6B6B', fontFamily: MONO }}>
          {fmtMult(factors.area_m2)} m²
        </div>
      </div>

      {/* Valor final */}
      <div style={{ background: '#FEFCF5', border: `1px solid #E8D99A`, borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#92720A', textTransform: 'uppercase', letterSpacing: 1 }}>
          Valor de Mercado
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, fontFamily: MONO }}>
          {fmtBRL(factors.market_value)}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/ValueWaterfall.tsx
git commit -m "feat(ui): ValueWaterfall paleta gold/navy, DM Mono, border-warm"
```

---

## Task 7: Dashboard — card âncora, DM Mono valores, gold no gráfico

**Files:**
- Modify: `ValoraIA_front/src/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `ConfidenceBadge` (Task 5), `MiniLineChart` (Task 5)
- Produces: primeiro metric card com gold border-left; valores numéricos em DM Mono; linha do gráfico em gold

- [ ] **Step 1: Atualizar Dashboard.tsx**

Mudanças: constante ACCENT → gold, card âncora style, DM Mono em valores, cor do gráfico, "Ver todas" gold, hover shadow gold, thead bg parchment, row hover parchment.

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardMetrics, DashboardValuationItem, MarketTrendResponse } from '../types'
import { getDashboardMetrics, getDashboardValuations, getMarketTrend } from '../api'
import { ConfidenceBadge, MiniLineChart } from './Charts'

const PRIMARY = '#1E3A8A'
const GOLD = '#C9A227'
const MONO = "'DM Mono', monospace"

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
}

const TEMPERATURE_CONFIG = {
  hot: { label: 'Aquecido', color: '#10B981', bg: '#ECFDF5' },
  warm: { label: 'Estável', color: '#F59E0B', bg: '#FFFBEB' },
  cold: { label: 'Frio', color: '#3B82F6', bg: '#EFF6FF' },
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000)
  if (diffH < 1) return 'Agora'
  if (diffH < 24) return `${diffH}h atrás`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Ontem'
  if (diffD < 7) return `${diffD} dias atrás`
  return d.toLocaleDateString('pt-BR')
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [valuations, setValuations] = useState<DashboardValuationItem[]>([])
  const [trend, setTrend] = useState<MarketTrendResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDashboardMetrics(),
      getDashboardValuations(10, 0),
    ])
      .then(([m, v]) => {
        setMetrics(m)
        setValuations(v.items)
        return getMarketTrend(m.market_city)
      })
      .then(t => setTrend(t))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg width="40" height="40" viewBox="0 0 40 40" className="animate-spin-slow">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#E8E0CF" strokeWidth="3" />
          <path d="M 20 3 A 17 17 0 0 1 37 20" fill="none" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-sm" style={{ color: '#9E9E9E' }}>Erro ao carregar dados</div>
        <div className="text-xs text-red-400">{error}</div>
      </div>
    )
  }

  const tempConfig = metrics ? TEMPERATURE_CONFIG[metrics.market_temperature] : null
  const monthChange = metrics
    ? metrics.valuations_prev_month > 0
      ? Math.round(((metrics.valuations_this_month - metrics.valuations_prev_month) / metrics.valuations_prev_month) * 100)
      : null
    : null

  const METRIC_CARDS = metrics ? [
    {
      label: 'Avaliações Este Mês',
      value: String(metrics.valuations_this_month),
      sub: monthChange !== null ? `${monthChange >= 0 ? '+' : ''}${monthChange}% em relação ao mês anterior` : 'Sem dados do mês anterior',
      icon: '▦',
      color: GOLD,
      anchor: true,
    },
    {
      label: 'Confiança Média',
      value: `${metrics.avg_confidence.toFixed(1)}%`,
      sub: 'Em todas as avaliações',
      icon: '◎',
      color: GOLD,
      anchor: false,
    },
    {
      label: 'Temperatura do Mercado',
      value: tempConfig!.label,
      sub: `${metrics.market_city} · ${metrics.market_temperature === 'hot' ? 'Tendência de alta' : metrics.market_temperature === 'warm' ? 'Mercado estável' : 'Mercado em baixa'}`,
      icon: '△',
      color: tempConfig!.color,
      anchor: false,
    },
  ] : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold m-0" style={{ color: '#1A1A1A' }}>Painel</h1>
        <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>Bem-vinda de volta, Maria. Aqui está seu panorama de mercado.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {METRIC_CARDS.map((m, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 transition-shadow"
            style={{
              border: m.anchor ? '1px solid #E8D99A' : '1px solid #E8E0CF',
              borderLeft: m.anchor ? '3px solid #C9A227' : '1px solid #E8E0CF',
              background: m.anchor ? '#FEFCF5' : '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(201,162,39,0.10)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#9E9E9E' }}>{m.label}</span>
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: m.color + '20', color: m.color }}
              >
                {m.icon}
              </span>
            </div>
            <div
              className="text-[26px] font-bold mb-1"
              style={{ color: i === 1 ? GOLD : '#1A1A1A', fontFamily: i < 2 ? MONO : 'inherit' }}
            >
              {m.value}
            </div>
            <div className="text-xs" style={{ color: '#6B6B6B' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Recent Valuations */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E8E0CF' }}>
          <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid #E8E0CF' }}>
            <h2 className="text-[15px] font-semibold m-0" style={{ color: '#1A1A1A' }}>Avaliações Recentes</h2>
            <span className="text-xs font-medium cursor-pointer" style={{ color: GOLD }}>Ver todas</span>
          </div>
          {valuations.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: '#9E9E9E' }}>Nenhuma avaliação encontrada.</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: '#F7F4EE' }}>
                  <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#9E9E9E' }}>Imóvel</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#9E9E9E' }}>Tipo</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#9E9E9E' }}>Preço IA</th>
                  <th className="hidden md:table-cell px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#9E9E9E' }}>Confiança</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#9E9E9E' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {valuations.map(v => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/resultado/${v.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderTop: '1px solid #E8E0CF' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F7F4EE' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-[160px] sm:max-w-none" style={{ color: '#1A1A1A' }}>{v.address}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{v.area_m2}m²</div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3" style={{ color: '#6B6B6B' }}>{PROPERTY_TYPE_LABELS[v.property_type] ?? v.property_type}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1A1A1A', fontFamily: MONO }}>{v.static_market_value_brl != null ? fmt(v.static_market_value_brl) : '—'}</td>
                    <td className="hidden md:table-cell px-4 py-3"><ConfidenceBadge score={v.confidence_score ?? 0} /></td>
                    <td className="hidden sm:table-cell px-4 py-3" style={{ color: '#9E9E9E' }}>{fmtDate(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Market Trends */}
        <div className="bg-white rounded-xl p-5 flex flex-col" style={{ border: '1px solid #E8E0CF' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold m-0" style={{ color: '#1A1A1A' }}>Tendência Preço/m²</h2>
            <span className="text-xs font-medium" style={{ color: '#9E9E9E' }}>
              {trend ? `${trend.city} · ${trend.period_months} meses` : '—'}
            </span>
          </div>
          <div className="flex-1 min-h-[160px]">
            {trend && <MiniLineChart data={trend.data_points} color={GOLD} />}
          </div>
          <div className="flex justify-between mt-3 pt-3" style={{ borderTop: '1px solid #E8E0CF' }}>
            <div>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: '#9E9E9E' }}>Atual</div>
              <div className="text-lg font-bold" style={{ color: '#1A1A1A', fontFamily: MONO }}>
                {trend ? fmt(trend.current_price_m2) : '—'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: '#9E9E9E' }}>Variação Anual</div>
              {trend && (
                <div
                  className="text-lg font-bold"
                  style={{ color: trend.yearly_change_pct >= 0 ? '#10B981' : '#EF4444', fontFamily: MONO }}
                >
                  {trend.yearly_change_pct >= 0 ? '+' : ''}{trend.yearly_change_pct.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/Dashboard.tsx
git commit -m "feat(ui): Dashboard card âncora gold, DM Mono valores, gráfico gold"
```

---

## Task 8: ComparablesMap — pins comparáveis gold

**Files:**
- Modify: `ValoraIA_front/src/components/ComparablesMap.tsx`

**Interfaces:**
- Produces: pins de comparáveis na cor `#C9A227`; pin do alvo em `#0F2561`

- [ ] **Step 1: Ler o arquivo atual e identificar as constantes de cor dos pins**

```bash
grep -n "10B981\|1E3A8A\|ACCENT\|PRIMARY\|color\|fill" ValoraIA_front/src/components/ComparablesMap.tsx | head -30
```

- [ ] **Step 2: Substituir cores dos pins**

Localizar todas as ocorrências de `#10B981` (verde dos comparáveis) e trocar por `#C9A227`.  
Localizar `#1E3A8A` (pin do alvo) e trocar por `#0F2561`.

Exemplo do padrão esperado no arquivo — adaptar conforme grep acima:

```tsx
// Pin do alvo (sujeito):
// de: color: '#1E3A8A'  ou  fill: '#1E3A8A'
// para: color: '#0F2561'  ou  fill: '#0F2561'

// Pin de comparável:
// de: color: '#10B981'  ou  fill: '#10B981'
// para: color: '#C9A227'  ou  fill: '#C9A227'
```

- [ ] **Step 3: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

`ComparablesMap.test.tsx` verifica quantidade de markers, não cores — deve passar.

- [ ] **Step 4: Commit**

```bash
git add ValoraIA_front/src/components/ComparablesMap.tsx
git commit -m "feat(ui): ComparablesMap pins gold (comparáveis) e navy-deep (alvo)"
```

---

## Task 9: LiveValuationHero — coluna esquerda parchment

**Files:**
- Modify: `ValoraIA_front/src/components/LiveValuationHero.tsx`

**Interfaces:**
- Consumes: `ValueCountUp` (Task 4, DM Mono), `ConfidenceGauge` (Task 3, gold), `ComparablesMap` (Task 8, gold pins)
- Produces: coluna esquerda com background `#FEFCF5`; botão "Ver laudo" sem mudança

- [ ] **Step 1: Atualizar LiveValuationHero.tsx**

Trocar o `padding` da coluna esquerda para incluir `background: '#FEFCF5'`:

```tsx
{/* Coluna esquerda: valor + gauge */}
<div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 18, background: '#FEFCF5' }}>
```

Trocar o `borderLeft` da coluna direita para usar `#E8E0CF`:

```tsx
{hasMap && (
  <div style={{ minHeight: 320, borderLeft: '1px solid #E8E0CF' }}>
```

- [ ] **Step 2: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

- [ ] **Step 3: Commit**

```bash
git add ValoraIA_front/src/components/LiveValuationHero.tsx
git commit -m "feat(ui): LiveValuationHero coluna valor em parchment-tint"
```

---

## Task 10: Report — SectionHeader document-like, SectionCard, PDF button, spinner

**Files:**
- Modify: `ValoraIA_front/src/components/Report.tsx`

**Interfaces:**
- Produces: `SectionHeader` com regra gold esq (sem retângulo navy); `SectionCard` com border-warm; botão PDF ghost; spinner gold arc

- [ ] **Step 1: Atualizar SectionHeader em Report.tsx**

Localizar a função `SectionHeader` (linha ~88) e substituir:

```tsx
function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
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
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#C9A227',
        letterSpacing: 1,
        minWidth: 20,
      }}>{number}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#1A1A1A',
        letterSpacing: '-0.2px',
        textTransform: 'uppercase',
      }}>{title}</span>
    </div>
  )
}
```

- [ ] **Step 2: Atualizar SectionCard em Report.tsx**

Localizar `SectionCard` (linha ~117) e substituir:

```tsx
function SectionCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8E0CF',
      borderRadius: 12,
      marginBottom: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      ...style,
    }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Atualizar loading spinner em Report.tsx**

Localizar o spinner de loading (buscar `animate-spin` em Report.tsx) e substituir por arco gold:

```tsx
// de:
<div
  className="w-10 h-10 rounded-full border-[3px] border-slate-200 animate-spin"
  style={{ borderTopColor: PRIMARY }}
/>

// para:
<svg width="40" height="40" viewBox="0 0 40 40" className="animate-spin-slow">
  <circle cx="20" cy="20" r="17" fill="none" stroke="#E8E0CF" strokeWidth="3" />
  <path d="M 20 3 A 17 17 0 0 1 37 20" fill="none" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
</svg>
```

- [ ] **Step 4: Atualizar botão "Baixar PDF" em Report.tsx**

Localizar o botão de download de PDF (buscar `pdfLoading` ou `Baixar` em Report.tsx) e aplicar estilo ghost:

```tsx
// O botão de PDF deve ter este estilo:
style={{
  border: '1px solid #E8E0CF',
  background: '#FFFFFF',
  color: '#1A1A1A',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: pdfLoading ? 'not-allowed' : 'pointer',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, color 0.15s',
}}
onMouseEnter={e => {
  (e.currentTarget as HTMLButtonElement).style.borderColor = '#C9A227'
  ;(e.currentTarget as HTMLButtonElement).style.color = '#C9A227'
}}
onMouseLeave={e => {
  (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8E0CF'
  ;(e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A'
}}
```

- [ ] **Step 5: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

`Report.test.tsx` pode testar o texto dos headers — confirmar que os títulos ainda renderizam.

- [ ] **Step 6: Commit**

```bash
git add ValoraIA_front/src/components/Report.tsx
git commit -m "feat(ui): Report SectionHeader regra gold, SectionCard border-warm, PDF button ghost, spinner arc"
```

---

## Task 11: ValuationFlow — stepper circles, spinner arc, focus gold, pills, label

**Files:**
- Modify: `ValoraIA_front/src/components/ValuationFlow.tsx`

**Interfaces:**
- Consumes: `LiveValuationHero` (Tasks anteriores), `ExtractionCard` (próxima task), `IntakeStep`
- Produces: stepper com círculos gold/navy; spinner arco gold; inputs com focus gold; pills navy ativo; "Avaliação concluída" em gold

- [ ] **Step 1: Adicionar import de Fragment**

No topo do arquivo, garantir que `Fragment` está importado:

```tsx
import { useState, useEffect, Fragment } from 'react'
```

- [ ] **Step 2: Substituir stepper de barras por círculos**

Localizar o bloco `{/* Step indicator */}` (linha ~274) e substituir:

```tsx
{/* Step indicator */}
<div className="flex items-center mb-8">
  {steps.map((s, i) => (
    <Fragment key={i}>
      <div className="flex flex-col items-center" style={{ gap: 6 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: i < step ? '#C9A227' : i === step ? '#0F2561' : '#FFFFFF',
            border: i === step ? '2px solid #C9A227' : i < step ? 'none' : '1.5px solid #E8E0CF',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          {i < step ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <polyline points="2,6 5,9 10,3" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: i === step ? '#FFFFFF' : '#9E9E9E' }}>{i + 1}</span>
          )}
        </div>
        <span style={{
          fontSize: 10,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          fontWeight: i === step ? 600 : 400,
          color: i <= step ? '#1A1A1A' : '#9E9E9E',
          textAlign: 'center' as const,
          maxWidth: 64,
          lineHeight: 1.3,
        }}>
          {s}
        </span>
      </div>
      {i < steps.length - 1 && (
        <div style={{
          flex: 1,
          height: 1.5,
          background: i < step ? '#C9A227' : '#E8E0CF',
          margin: '0 4px',
          marginBottom: 20,
        }} />
      )}
    </Fragment>
  ))}
</div>
```

- [ ] **Step 3: Substituir spinner de loading por arco SVG**

Localizar o bloco `{processing ? (` e o spinner interno:

```tsx
// de:
<div
  className="w-12 h-12 rounded-full border-[3px] border-slate-200 animate-spin"
  style={{ borderTopColor: PRIMARY }}
/>

// para:
<svg width="48" height="48" viewBox="0 0 48 48" className="animate-spin-slow">
  <circle cx="24" cy="24" r="20" fill="none" stroke="#E8E0CF" strokeWidth="3" />
  <path d="M 24 4 A 20 20 0 0 1 44 24" fill="none" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
</svg>
```

- [ ] **Step 4: Atualizar SkeletonStep — done color gold**

Na função `SkeletonStep`, trocar a cor do círculo done:

```tsx
// de:
style={{ background: done ? ACCENT : '#E2E8F0' }}

// para:
style={{ background: done ? '#C9A227' : '#E8E0CF' }}
```

- [ ] **Step 5: Atualizar inputClass para usar .input-focus**

```tsx
// de:
const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none bg-white transition-colors focus:border-primary'

// para:
const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white transition-colors input-focus'
```

E adicionar `style={{ borderColor: '#E8E0CF' }}` nos inputs que usam `inputClass` — ou melhor: atualizar o Tailwind para ter `border-border-warm` como default do `inputClass`. Como `border-warm` agora existe no tailwind config, use:

```tsx
const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-border-warm text-sm bg-white transition-colors input-focus'
```

- [ ] **Step 6: Atualizar pillStyle**

```tsx
const pillStyle = (active: boolean) => ({
  padding: '8px 16px',
  borderRadius: 20,
  border: `1.5px solid ${active ? '#0F2561' : '#E8E0CF'}`,
  background: active ? '#0F2561' : '#fff',
  color: active ? '#FFFFFF' : '#6B6B6B',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer' as const,
  transition: 'all 0.15s',
  fontFamily: 'inherit',
})
```

- [ ] **Step 7: Atualizar label "Avaliação concluída"**

```tsx
// de:
<div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: 1 }}>

// para:
<div style={{ fontSize: 13, fontWeight: 700, color: '#C9A227', textTransform: 'uppercase', letterSpacing: 1 }}>
```

- [ ] **Step 8: Remover constante ACCENT não usada**

Localizar `const ACCENT = '#10B981'` em ValuationFlow.tsx e remover se não há mais referências após as mudanças acima. Verificar com:

```bash
grep -n "ACCENT" ValoraIA_front/src/components/ValuationFlow.tsx
```

- [ ] **Step 9: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

`ValuationFlow.test.tsx` — confirmar que steps ainda renderizam com os labels corretos.

- [ ] **Step 10: Commit**

```bash
git add ValoraIA_front/src/components/ValuationFlow.tsx
git commit -m "feat(ui): stepper circles gold, spinner arco, focus gold, pills navy, label gold"
```

---

## Task 12: ExtractionCard — header parchment, campos gold/âmbar, amenity tags gold

**Files:**
- Modify: `ValoraIA_front/src/components/ExtractionCard.tsx`

**Interfaces:**
- Produces: summary block em parchment + gold; campos confirmados com left-border gold; amenity tags gold

- [ ] **Step 1: Atualizar constantes e confidenceBadge em ExtractionCard.tsx**

```tsx
// Remover: const PRIMARY = '#1E3A8A' e const ACCENT = '#10B981'
// Adicionar:
const NAVY = '#1E3A8A'
const GOLD = '#C9A227'

// Atualizar confidenceBadge:
function confidenceBadge(confidence: number) {
  if (confidence >= 0.75) return { label: 'Alta', bg: '#FEFCF5', color: '#92720A' }
  if (confidence >= 0.5) return { label: 'Média', bg: '#FFFBEB', color: '#92400E' }
  return { label: 'Baixa', bg: '#F1F5F9', color: '#475569' }
}
```

- [ ] **Step 2: Atualizar bloco "Resumo da IA"**

```tsx
// de:
<div className="p-4 rounded-xl" style={{ background: PRIMARY + '08', border: `1px solid ${PRIMARY}22` }}>
  <div className="flex items-center gap-2 mb-2">
    <span style={{ color: PRIMARY, fontSize: 16 }}>✦</span>
    <span className="text-sm font-semibold" style={{ color: PRIMARY }}>Resumo da IA</span>
  </div>

// para:
<div className="p-4 rounded-xl" style={{ background: '#F7F4EE', border: '1px solid #E8E0CF' }}>
  <div className="flex items-center gap-2 mb-2">
    <span style={{ color: GOLD, fontSize: 16 }}>✦</span>
    <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Resumo da IA</span>
  </div>
```

- [ ] **Step 3: Atualizar rows de campos extraídos**

```tsx
// de:
<div
  key={key}
  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50"
>

// para:
<div
  key={key}
  className="flex items-center justify-between px-3 py-2 rounded-lg"
  style={{
    background: '#FEFCF5',
    borderLeft: '2px solid #C9A227',
  }}
>
```

- [ ] **Step 4: Atualizar tags de amenities**

```tsx
// de:
style={{ background: ACCENT + '15', color: ACCENT, border: `1px solid ${ACCENT}33` }}

// para:
style={{ background: '#FEFCF5', color: '#92720A', border: '1px solid #E8D99A' }}
```

- [ ] **Step 5: Atualizar botão "Usar e revisar"**

```tsx
// de:
style={{ background: PRIMARY, fontFamily: 'inherit' }}

// para:
style={{ background: NAVY, fontFamily: 'inherit' }}
```

- [ ] **Step 6: Rodar testes**

```bash
cd ValoraIA_front && npm run test -- --run
```

`ExtractionCard.test.tsx` — confirmar que ainda renderiza campos e botões.

- [ ] **Step 7: Commit**

```bash
git add ValoraIA_front/src/components/ExtractionCard.tsx
git commit -m "feat(ui): ExtractionCard parchment, campos gold, amenity tags gold"
```

---

## Self-Review

### Spec coverage

| Requisito do spec | Task que implementa |
|-------------------|---------------------|
| bg parchment `#F7F4EE` | Task 1 (index.css), Task 2 (AppShell bg) |
| Gold `#C9A227` como accent | Tasks 3,4,5,6,7,8,9,10,11,12 |
| DM Mono em valores | Tasks 4,6,7,10 |
| lucide-react icons | Tasks 1 (install), 2 (AppShell) |
| Wordmark AVALIA + arco | Task 2 |
| Active nav gold border | Task 2 |
| Navy-deep `#0F2561` sidebar | Task 2 |
| ConfidenceGauge arco gold | Task 3 |
| ConfidenceBadge ≥75 gold | Task 5 |
| RadarChart gold | Task 5 |
| ValueWaterfall gold | Task 6 |
| Dashboard card âncora | Task 7 |
| Linha gráfico gold | Task 7 |
| Pins comparáveis gold | Task 8 |
| LiveValuationHero parchment col | Task 9 |
| SectionHeader regra gold | Task 10 |
| SectionCard border-warm | Task 10 |
| PDF button ghost | Task 10 |
| Stepper circles | Task 11 |
| Spinner arco gold | Tasks 7, 10, 11 |
| Focus inputs gold | Task 11 |
| Pills navy ativo | Task 11 |
| ExtractionCard parchment | Task 12 |
| Amenity tags gold | Task 12 |

Cobertura completa.
