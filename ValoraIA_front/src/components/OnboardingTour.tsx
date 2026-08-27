import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export interface TourStep {
  key: string
  target: string
  title: string
  body: string
  cta?: string
  goTo?: string
}

const STEPS: TourStep[] = [
  {
    key: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'Painel de atividade',
    body: 'Aqui você acompanha sua rotina: estudos no mês, confiança média e a temperatura do mercado na sua região.',
  },
  {
    key: 'new',
    target: '[data-tour="new"]',
    title: 'Nova Avaliação',
    body: 'Comece por aqui: descreva ou preencha o imóvel. O motor busca comparáveis e aplica os fatores da NBR 14.653 em minutos.',
  },
  {
    key: 'reports',
    target: '[data-tour="reports"]',
    title: 'Relatórios',
    body: 'Histórico completo com busca, paginação e lixeira. Excluiu por engano? Restaure em até 30 dias.',
  },
  {
    key: 'config',
    target: '[data-tour="config"]',
    title: 'Sua marca e sua equipe',
    body: 'Nome, logo e membros da organização — tudo aparece no cabeçalho dos estudos. Nova avaliação agora?',
    cta: 'Fazer minha primeira avaliação',
    goTo: '/app/nova-avaliacao',
  },
]

const GOLD = '#C9A227'

function anchorRect(selector: string): DOMRect | null {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  return rect
}

export default function OnboardingTour({ onFinish, onSkip }: { onFinish: () => void; onSkip: () => void }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = STEPS[index]

  useEffect(() => {
    const update = () => setRect(anchorRect(step.target))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [step.target])

  const tooltipStyle = useMemo(() => {
    const width = Math.min(380, window.innerWidth - 32)
    const margin = 14
    if (!rect) return { left: (window.innerWidth - width) / 2, top: 90, width }
    const idealTop = rect.top > window.innerHeight * 0.5 ? rect.top - margin - 170 : rect.bottom + margin
    return {
      left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left - 20)),
      top: Math.max(12, idealTop),
      width,
      rectTop: rect.top,
      rectBottom: rect.bottom,
    } as { left: number; top: number; width: number; rectTop?: number; rectBottom?: number }
  }, [rect])

  const last = index === STEPS.length - 1

  const next = () => {
    if (last) {
      if (step.goTo) navigate(step.goTo)
      onFinish()
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(17, 24, 39, 0.55)' }}
      onClick={onSkip}
      role="dialog"
      aria-label="Apresentação da plataforma"
    >
      {/* Highlight do alvo */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            borderRadius: 10,
            border: `2px solid ${GOLD}`,
            boxShadow: '0 0 0 9999px rgba(17, 24, 39, 0.55)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: tooltipStyle.left,
          top: tooltipStyle.top,
          width: tooltipStyle.width,
          background: '#fff',
          borderRadius: 14,
          padding: '20px 20px 16px',
          boxShadow: '0 18px 50px rgba(0,0,0,0.30)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: 1 }}>
            {String(index + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
          <div style={{ flex: 1, height: 3, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((index + 1) / STEPS.length) * 100}%`, background: GOLD, borderRadius: 2 }} />
          </div>
          <button
            onClick={onSkip}
            aria-label="Pular apresentação"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: 16, fontFamily: 'inherit' }}
          >
            ✕
          </button>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>{step.title}</h3>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>{step.body}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onSkip}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: 12, fontFamily: 'inherit' }}
          >
            Pular
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {index > 0 && (
              <button
                onClick={() => setIndex((i) => i - 1)}
                style={{ border: '1px solid #E8E0CF', background: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
              >
                Voltar
              </button>
            )}
            <button
              onClick={next}
              style={{ border: 'none', background: '#111827', color: '#fff', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
            >
              {last ? (step.cta ?? 'Concluir') : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}