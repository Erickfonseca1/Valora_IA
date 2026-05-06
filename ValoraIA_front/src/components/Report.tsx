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

      {/* Análise de Valor — Abismo de Incorporação */}
      {(valuation.static_market_value != null || valuation.residual_land_value != null) && (
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
          padding: '24px 28px', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>
            Análise de Valor — Abismo de Incorporação
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>
                Venda Direta (Mercado)
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#1E3A8A' }}>
                {fmt(valuation.static_market_value ?? 0)}
              </div>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 8, marginBottom: 0 }}>
                Valor estimado pelo método comparativo direto (MCDDM).
              </p>
            </div>
            <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 20, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#16A34A', textTransform: 'uppercase', marginBottom: 8 }}>
                Valor de Incorporação (Terreno Residual)
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#10B981' }}>
                {fmt(valuation.residual_land_value ?? 0)}
              </div>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 8, marginBottom: 0 }}>
                Método involutivo — valor máximo a pagar pelo terreno para viabilizar o desenvolvimento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Potencial Construtivo */}
      {valuation.max_buildable_area != null && (
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
          padding: '24px 28px', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>
            Potencial Construtivo
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Área Construível Máx.
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1E293B' }}>
                {valuation.max_buildable_area.toLocaleString('pt-BR')} m²
              </div>
            </div>
            {valuation.zoning_info && (
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Índice de Aproveitamento
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1E293B' }}>
                  {valuation.zoning_info.IA_max}×
                </div>
              </div>
            )}
            {valuation.viability_scenarios?.[1] && (
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  VGV Estimado (Base)
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1E293B' }}>
                  {fmt(valuation.viability_scenarios[1].VGV_total)}
                </div>
              </div>
            )}
          </div>

          {valuation.viability_scenarios && valuation.viability_scenarios.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Cenário</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>VGV Total</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>Valor Residual</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>ROI</th>
                </tr>
              </thead>
              <tbody>
                {valuation.viability_scenarios.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, color: '#334155' }}>{s.label}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#475569' }}>{fmt(s.VGV_total)}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: s.residual > 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>{fmt(s.residual)}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#475569' }}>{s.roi_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', gridColumn: '1 / -1', padding: '0 16px' }}>
              <span style={{ background: '#F1F5F9', borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>
                Valores homogeneizados
              </span>
              <span>Fator de oferta 10% já aplicado</span>
              {valuation.ross_heidecke_result && (
                <span> · Depreciação Ross-Heidecke ({(valuation.ross_heidecke_result.depreciation_coefficient * 100).toFixed(1)}%) aplicada</span>
              )}
            </div>
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

                  <div className="text-base font-bold mb-0.5" style={{ color: PRIMARY }}>
                    {fmt(c.price_brl)}
                  </div>
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

      {/* Fatores de Homogeneização */}
      {valuation.homogenization_factors && (
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
          padding: '24px 28px', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>
            Fatores de Homogeneização Aplicados
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Fator</th>
                <th style={{ textAlign: 'center', padding: '8px 0', fontWeight: 600 }}>Valor</th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Desconto de Oferta',
                  value: `-${((1 - valuation.homogenization_factors.offer_factor) * 100).toFixed(0)}%`,
                  desc: 'Ajuste padrão NBR 14.653 — preço de oferta vs. transação efetiva',
                },
                {
                  label: 'Esquina',
                  value: valuation.homogenization_factors.corner_factor > 1 ? '+5%' : '—',
                  desc: 'Imóvel de esquina tem maior frente e melhor visibilidade comercial',
                },
                {
                  label: 'Topografia',
                  value: `${((valuation.homogenization_factors.slope_factor - 1) * 100).toFixed(0)}%`,
                  desc: 'Plano = 0%, Suave Declive = −5%, Acentuado = −20%',
                },
                {
                  label: 'Nível de Rua',
                  value: `${((valuation.homogenization_factors.level_factor - 1) * 100).toFixed(0)}%`,
                  desc: 'Mesmo nível = 0%, Acima = −5%, Abaixo = −20%',
                },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 0', fontWeight: 600, color: '#334155' }}>{row.label}</td>
                  <td style={{ padding: '10px 0', textAlign: 'center', color: '#1E3A8A', fontWeight: 700 }}>{row.value}</td>
                  <td style={{ padding: '10px 0', color: '#64748B' }}>{row.desc}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #E2E8F0', fontWeight: 700 }}>
                <td style={{ padding: '12px 0', color: '#1E293B' }}>Multiplicador Combinado</td>
                <td style={{ padding: '12px 0', textAlign: 'center', color: '#10B981', fontSize: 15 }}>
                  ×{valuation.homogenization_factors.combined_factor.toFixed(3)}
                </td>
                <td style={{ padding: '12px 0', color: '#64748B' }}>
                  Aplicado ao valor estimado pelo método comparativo
                </td>
              </tr>
            </tbody>
          </table>
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
