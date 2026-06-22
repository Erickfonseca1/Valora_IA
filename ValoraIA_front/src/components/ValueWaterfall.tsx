import type { HomogenizationFactors } from '../types'

const NAVY = '#111827'
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
