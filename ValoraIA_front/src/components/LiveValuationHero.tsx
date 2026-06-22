import type { ValuationRecord } from '../types'
import ValueCountUp from './ValueCountUp'
import ConfidenceGauge from './ConfidenceGauge'
import ComparablesMap from './ComparablesMap'

const PRIMARY = '#1E3A8A'

interface Props {
  record: ValuationRecord
  mode: 'reveal' | 'static'
  onSeeReport?: () => void
}

function valueBand(value: number, score: number | null): number {
  const pct = score == null ? 50 : score <= 1 ? score * 100 : score
  const bandPct = 0.20 - (Math.max(0, Math.min(100, pct)) / 100) * 0.12
  return Math.round(value * bandPct)
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export default function LiveValuationHero({ record, mode, onSeeReport }: Props) {
  const animate = mode === 'reveal'
  const value = record.static_market_value_brl ?? 0
  const band = valueBand(value, record.confidence_score)
  const hasMap = record.lat != null && record.lng != null

  return (
    <div
      data-testid="live-hero"
      style={{
        display: 'grid',
        gridTemplateColumns: hasMap ? 'minmax(260px, 1fr) minmax(280px, 1.2fr)' : '1fr',
        gap: 0,
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#fff',
      }}
      className="live-hero"
    >
      {/* Coluna esquerda: valor + gauge */}
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
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>
              faixa estimada {BRL.format(value - band)} – {BRL.format(value + band)}
            </div>
          )}
          {record.price_per_m2_homogenized != null && (
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {BRL.format(Math.round(record.price_per_m2_homogenized))}/m² · homogeneizado
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ConfidenceGauge score={record.confidence_score} />
          <div style={{ fontSize: 12, color: '#64748B', maxWidth: 160 }}>
            Baseado em {record.comparables?.length ?? 0} imóvel(is) comparável(is) na vizinhança.
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

      {/* Coluna direita: mapa */}
      {hasMap && (
        <div style={{ minHeight: 320, borderLeft: '1px solid #E8E0CF' }}>
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
