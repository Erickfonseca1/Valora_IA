import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardMetrics, DashboardValuationItem, MarketTrendResponse } from '../types'
import { getDashboardMetrics, getDashboardValuations, getMarketTrend } from '../api'
import { ConfidenceBadge, MiniLineChart } from './Charts'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

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
        <div
          className="w-10 h-10 rounded-full border-[3px] border-slate-200 animate-spin"
          style={{ borderTopColor: PRIMARY }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-slate-400 text-sm">Erro ao carregar dados</div>
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
      icon: '⊞',
      color: PRIMARY,
    },
    {
      label: 'Confiança Média',
      value: `${metrics.avg_confidence.toFixed(1)}%`,
      sub: 'Em todas as avaliações',
      icon: '◉',
      color: ACCENT,
    },
    {
      label: 'Temperatura do Mercado',
      value: tempConfig!.label,
      sub: `${metrics.market_city} · ${metrics.market_temperature === 'hot' ? 'Tendência de alta' : metrics.market_temperature === 'warm' ? 'Mercado estável' : 'Mercado em baixa'}`,
      icon: '▲',
      color: tempConfig!.color,
    },
  ] : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold m-0 text-slate-900">Painel</h1>
        <p className="text-sm text-slate-500 mt-1">Bem-vinda de volta, Maria. Aqui está seu panorama de mercado.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {METRIC_CARDS.map((m, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{m.label}</span>
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: m.color + '20', color: m.color }}
              >
                {m.icon}
              </span>
            </div>
            <div className="text-[26px] font-bold text-slate-900 mb-1">{m.value}</div>
            <div className="text-xs text-slate-500">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Recent Valuations */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-[15px] font-semibold m-0 text-slate-900">Avaliações Recentes</h2>
            <span className="text-xs font-medium cursor-pointer" style={{ color: PRIMARY }}>Ver todas</span>
          </div>
          {valuations.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">Nenhuma avaliação encontrada.</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Imóvel', 'Tipo', 'Preço IA', 'Confiança', 'Data'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valuations.map(v => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/resultado/${v.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50 border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{v.address}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {v.neighborhood} · {v.bedrooms != null ? `${v.bedrooms} quarto${v.bedrooms !== 1 ? 's' : ''}` : 'N/A'} · {v.area_m2}m²
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{PROPERTY_TYPE_LABELS[v.property_type] ?? v.property_type}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{fmt(v.price_brl)}</td>
                    <td className="px-4 py-3"><ConfidenceBadge score={v.confidence_score} /></td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Market Trends */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold m-0 text-slate-900">Tendência Preço/m²</h2>
            <span className="text-xs text-slate-400 font-medium">
              {trend ? `${trend.city} · ${trend.period_months} meses` : '—'}
            </span>
          </div>
          <div className="flex-1 min-h-[160px]">
            {trend && <MiniLineChart data={trend.data_points} color={ACCENT} />}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Atual</div>
              <div className="text-lg font-bold text-slate-900">
                {trend ? fmt(trend.current_price_m2) : '—'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Variação Anual</div>
              {trend && (
                <div
                  className="text-lg font-bold"
                  style={{ color: trend.yearly_change_pct >= 0 ? ACCENT : '#EF4444' }}
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
