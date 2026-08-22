import type { ValuationRecord } from '../types'
import ValueCountUp from './ValueCountUp'
import ComparablesMap from './ComparablesMap'

const PRIMARY = '#111827'

interface Props {
  record: ValuationRecord
  mode: 'reveal' | 'static'
  onSeeReport?: () => void
}

function valueBand(value: number, score: number | null, intervalWidthPct?: number): number {
  if (intervalWidthPct != null && intervalWidthPct > 0) {
    return Math.round(value * (intervalWidthPct / 200))
  }
  const pct = score == null ? 50 : score <= 1 ? score * 100 : score
  const bandPct = 0.20 - (Math.max(0, Math.min(100, pct)) / 100) * 0.12
  return Math.round(value * bandPct)
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export default function LiveValuationHero({ record, mode, onSeeReport }: Props) {
  const animate = mode === 'reveal'
  const value = record.static_market_value_brl ?? 0
  const band = valueBand(value, record.confidence_score, record.confidence_diagnostics?.confidence_interval_width_pct)
  const hasMap = record.lat != null && record.lng != null
  const diagnostics = record.confidence_diagnostics
  const displayedCount = diagnostics?.displayed_sample_size ?? record.comparables?.length ?? 0
  const usedCount = diagnostics?.sample_size ?? displayedCount

  return (
    <div
      data-testid="live-hero"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#fff',
      }}
      className="live-hero md:grid-cols-[minmax(260px,1fr)_minmax(280px,1.2fr)]"
    >
      {/* Coluna esquerda: valor + faixa indicativa */}
      <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 18, background: '#FEFCF5' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Valor de Mercado
          </div>
          <ValueCountUp
            value={value}
            animate={animate}
          />
          {record.static_market_value_brl != null && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderLeft: '3px solid #C9A227', background: '#FFFFFF', borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Faixa indicativa de mercado
              </div>
              <div style={{ fontSize: 17, color: '#475569', fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                {BRL.format(value - band)} – {BRL.format(value + band)}
              </div>
            </div>
          )}
          {record.price_per_m2_homogenized != null && (
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {BRL.format(Math.round(record.price_per_m2_homogenized))}/m² · homogeneizado
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>
          {usedCount > displayedCount
            ? `${usedCount} comparáveis usados no cálculo; ${displayedCount} principais exibidos.`
            : `Cálculo baseado em ${usedCount} comparáve${usedCount === 1 ? 'l' : 'is'} na vizinhança.`}
          <div style={{ marginTop: 5, color: '#92720A' }}>
            O valor é uma referência técnica para orientar a decisão, não uma regra fixa de negociação.
          </div>
        </div>

        {mode === 'reveal' && (
          <button
            onClick={onSeeReport}
            style={{
              marginTop: 'auto',
              alignSelf: 'flex-start',
              padding: '12px 22px',
              borderRadius: 10,
              border: 'none',
              background: PRIMARY,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ver laudo completo →
          </button>
        )}
      </div>

      {/* Coluna direita: mapa (abaixo do valor em mobile) */}
      {hasMap && (
        <div style={{ minHeight: 320, borderLeft: '1px solid #E8E0CF' }} className="md:border-t-0 border-t" data-report-map>
          <ComparablesMap
            subject={{ lat: record.lat, lng: record.lng }}
            comparables={record.comparables ?? []}
            pois={record.neighborhood_pois}
            animate={animate}
          />
        </div>
      )}
    </div>
  )
}
