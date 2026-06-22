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
