import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { ValuationRecord } from '../types'
import { getValuation } from '../api'
import { RadarChart, BarIndicator } from './Charts'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
}

const TOOLTIPS: Record<string, string> = {
  'Mercado Local': 'Proximidade dos imóveis comparáveis — quanto mais perto estão do imóvel avaliado, mais precisa é a estimativa.',
  'Consistência': 'Estabilidade dos preços na região — quanto menos os preços variam entre os imóveis, mais confiável é a referência.',
  'Volume de Dados': 'Quantidade de imóveis usados na análise — quanto maior a amostra, mais robusto é o resultado.',
  'Perfil da Região': 'O quanto o imóvel se encaixa no padrão da vizinhança — área próxima à média dos imóveis comparáveis da região.',
  'Comodidades': 'Itens de valorização do imóvel — piscina, academia, varanda, churrasqueira, portaria 24h, entre outros.',
  'Cobertura': 'Distribuição dos imóveis comparáveis pela região — quanto mais uniforme, melhor a representatividade da amostra.',
  'Vizinhança': 'Serviços e comércios próximos ao imóvel — supermercados, farmácias, escolas, transporte público, hospitais e lazer.',
}

const CONFIDENCE_LABEL = (score: number) => {
  if (score >= 90) return 'Muito Alta'
  if (score >= 75) return 'Alta'
  if (score >= 60) return 'Média'
  return 'Baixa'
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const fmtM2 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/m²'

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [valuation, setValuation] = useState<ValuationRecord | null>(null)
  const [animate, setAnimate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { navigate('/'); return }
    getValuation(id)
      .then(v => {
        setValuation(v)
        setTimeout(() => setAnimate(true), 100)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-10 h-10 rounded-full border-[3px] border-slate-200 animate-spin"
          style={{ borderTopColor: PRIMARY }}
        />
      </div>
    )
  }

  if (error || !valuation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-slate-400 text-sm">Avaliação não encontrada</div>
        {error && <div className="text-xs text-red-400">{error}</div>}
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: PRIMARY, fontFamily: 'inherit' }}
        >
          Voltar ao painel
        </button>
      </div>
    )
  }

  const radarFactors = valuation.price_factors.map(f => ({ label: f.label, value: f.score }))
  const propertyLabel = PROPERTY_TYPE_LABELS[valuation.property_type] ?? valuation.property_type

  const subtitle = [
    valuation.neighborhood ?? valuation.city,
    propertyLabel,
    `${valuation.area_m2}m²`,
    valuation.bedrooms != null ? `${valuation.bedrooms} quarto${valuation.bedrooms !== 1 ? 's' : ''}` : null,
    valuation.bathrooms != null ? `${valuation.bathrooms} banheiro${valuation.bathrooms !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Hero */}
      <div
        className="rounded-xl p-8 mb-5 relative overflow-hidden text-white"
        style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY}DD 100%)` }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-[180px] h-[180px] rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute bottom-[-60px] right-[80px] w-[120px] h-[120px] rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />

        <div className="relative">
          <div className="text-xs uppercase tracking-widest opacity-70 mb-2">Relatório de Avaliação IA</div>
          <h1 className="text-xl font-semibold m-0 mb-1">{valuation.address}</h1>
          <p className="text-sm opacity-70 mb-6">{subtitle}</p>

          <div className="flex gap-8 items-end">
            <div>
              <div className="text-xs uppercase tracking-wide opacity-60 mb-1.5">Faixa de Preço Recomendada</div>
              <div
                className="text-[28px] font-bold transition-all duration-500"
                style={{ opacity: animate ? 1 : 0, transform: animate ? 'translateY(0)' : 'translateY(10px)' }}
              >
                {fmt(valuation.price_range_min_brl)} — {fmt(valuation.price_range_max_brl)}
              </div>
            </div>
            <div className="border-l pl-8" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
              <div className="text-xs uppercase tracking-wide opacity-60 mb-1.5">Preço Ideal de Anúncio</div>
              <div
                className="text-[34px] font-extrabold transition-all duration-500"
                style={{
                  color: '#6EE7B7',
                  opacity: animate ? 1 : 0,
                  transform: animate ? 'translateY(0)' : 'translateY(10px)',
                  transitionDelay: '0.15s',
                }}
              >
                {fmt(valuation.recommended_listing_price_brl)}
              </div>
            </div>
            <div className="ml-auto">
              <div
                className="px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: '#6EE7B7' }} />
                {valuation.confidence_score}% · {CONFIDENCE_LABEL(valuation.confidence_score)}
              </div>
              {valuation.confidence_score <= 59 && (
                <div className="text-[11px] opacity-60 mt-1 text-center">Amostra reduzida na região</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Radar + Breakdown */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-[15px] font-semibold mb-4 text-slate-900">Análise de Fatores de Preço</h3>
          <div className="flex justify-center">
            <RadarChart factors={radarFactors} size={240} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-[15px] font-semibold mb-5 text-slate-900">Detalhamento da Pontuação</h3>
          {valuation.price_factors.map((f, i) => {
            const colors = [PRIMARY, ACCENT, PRIMARY, '#F59E0B', ACCENT, '#8B5CF6', '#EC4899']
            return (
              <BarIndicator
                key={i}
                label={f.label}
                value={Math.round(f.score * 100)}
                color={colors[i % colors.length]}
                tooltip={TOOLTIPS[f.label]}
              />
            )
          })}
        </div>
      </div>

      {/* Neighborhood POIs */}
      {valuation.neighborhood_pois && valuation.neighborhood_pois.pois.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold m-0 text-slate-900">O que há por perto</h3>
              <p className="text-sm text-slate-400 mt-1">Serviços e comércios que valorizam o imóvel.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Pontuação de Vizinhança</span>
              <span className="text-lg font-bold" style={{ color: PRIMARY }}>
                {Math.round(valuation.neighborhood_pois.totalScore * 100)}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 p-6 gap-4">
            {valuation.neighborhood_pois.pois.map((cat, i) => {
              const count = cat.places.length
              const scorePct = Math.round(cat.score * 100)
              const barColor = count > 0 ? ACCENT : '#CBD5E1'
              const minDist = count > 0 ? Math.min(...cat.places.map((p) => p.distance_m)) : null
              const singular = {
                'Supermercados': 'Supermercado', 'Farmácias': 'Farmácia', 'Escolas': 'Escola',
                'Hospitais': 'Hospital', 'Parques': 'Parque', 'Academias': 'Academia',
                'Shoppings': 'Shopping', 'Restaurantes': 'Restaurante',
              }[cat.label] ?? cat.label.replace(/s$/, '')
              const label = count === 1 ? singular : cat.label
              return (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">
                      {count > 0 ? `${count} ${label}` : cat.label}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: barColor }}>{scorePct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ background: barColor, width: `${scorePct}%` }} />
                  </div>
                  {count > 0 ? (
                    <div className="text-xs text-slate-500 mt-0.5">
                      em até {minDist}m
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">Nenhum encontrado no raio de busca</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Comparables */}
      {valuation.comparables.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-[15px] font-semibold m-0 text-slate-900">Imóveis Comparáveis</h3>
            <p className="text-sm text-slate-400 mt-1">Vendidos ou anunciados recentemente na mesma região.</p>
          </div>
          <div className="grid grid-cols-5 divide-x divide-slate-100">
            {valuation.comparables.map((c, i) => {
              const visibleAmenities = c.amenities?.slice(0, 3) ?? []
              const overflowCount = (c.amenities?.length ?? 0) - visibleAmenities.length
              const CardWrapper = c.source_url ? 'a' : 'div'
              const wrapperProps = c.source_url
                ? { href: c.source_url, target: '_blank', rel: 'noopener noreferrer' }
                : {}

              return (
                <CardWrapper
                  key={i}
                  {...wrapperProps}
                  className="flex flex-col p-4 hover:bg-slate-50 transition-colors no-underline text-inherit"
                >
                  {/* Image */}
                  <div className="w-full aspect-[760/570] rounded-lg overflow-hidden mb-3 bg-slate-100 flex-shrink-0">
                    {c.images?.[0] ? (
                      <img
                        src={c.images[0]}
                        alt={c.neighborhood}
                        width={760}
                        height={570}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: 'repeating-linear-gradient(135deg, #E2E8F0, #E2E8F0 8px, #EEF2F7 8px, #EEF2F7 16px)',
                        }}
                      >
                        <span className="text-[10px] text-slate-400 font-mono">sem foto</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="text-sm font-semibold text-slate-900 mb-0.5 leading-snug">{c.neighborhood}</div>
                  <div className="text-xs text-slate-400 mb-2 truncate">{c.address}</div>

                  <div className="text-base font-bold mb-0.5" style={{ color: PRIMARY }}>{fmt(c.price_brl)}</div>
                  <div className="text-xs text-slate-500 mb-2">
                    {fmtM2(c.price_m2_brl)}
                    {c.area_m2 && ` · ${c.area_m2}m²`}
                    {c.bedrooms != null && ` · ${c.bedrooms} qto${c.bedrooms !== 1 ? 's' : ''}`}
                  </div>

                  {/* Status badge */}
                  <span
                    className="inline-block self-start px-2 py-0.5 rounded-full text-[11px] font-medium mb-2"
                    style={{
                      background: c.status === 'listed' ? '#ECFDF5' : '#F1F5F9',
                      color: c.status === 'listed' ? ACCENT : '#64748B',
                    }}
                  >
                    {c.status === 'listed' ? 'Anunciado' : 'Vendido'}
                  </span>

                  {/* Amenity chips */}
                  {visibleAmenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-2">
                      {visibleAmenities.map(a => (
                        <span
                          key={a}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: PRIMARY + '10', color: PRIMARY }}
                        >
                          {a}
                        </span>
                      ))}
                      {overflowCount > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: '#F1F5F9', color: '#64748B' }}
                        >
                          +{overflowCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ver anúncio link */}
                  {c.source_url && (
                    <div className="text-[11px] mt-2" style={{ color: PRIMARY }}>
                      Ver anúncio →
                    </div>
                  )}
                </CardWrapper>
              )
            })}
          </div>
        </div>
      )}

      {/* Method breakdown (informational) */}
      {valuation.method_estimates && valuation.method_estimates.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
          <h3 className="text-[15px] font-semibold mb-3 text-slate-900">Como foi calculado</h3>
          <div className="flex gap-4">
            {valuation.method_estimates.map((m, i) => (
              <div key={i} className="flex-1 p-3 bg-slate-50 rounded-lg">
                <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">{m.method.toUpperCase()}</div>
                <div className="text-sm font-semibold text-slate-900">{fmt(m.predicted_ppm2)}/m²</div>
                <div className="text-xs text-slate-500 mt-0.5">Peso: {(m.weight * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center pb-10">
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-px hover:shadow-md"
          style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit' }}
        >
          ← Voltar ao Painel
        </button>
        <button
          onClick={() => navigate('/nova-avaliacao')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-px hover:shadow-md"
          style={{ border: 'none', background: PRIMARY, color: '#fff', fontFamily: 'inherit' }}
        >
          + Nova Avaliação
        </button>
      </div>
    </div>
  )
}
