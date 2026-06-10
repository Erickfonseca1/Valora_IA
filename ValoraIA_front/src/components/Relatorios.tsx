import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardValuationItem } from '../types'
import { getDashboardValuations } from '../api'
import { ConfidenceBadge } from './Charts'

const PRIMARY = '#1E3A8A'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
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

const PAGE_SIZE = 20

export default function Relatorios() {
  const navigate = useNavigate()
  const [all, setAll] = useState<DashboardValuationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    getDashboardValuations(PAGE_SIZE, page * PAGE_SIZE)
      .then(r => { setAll(r.items); setTotal(r.total) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [page])

  const filtered = query.trim()
    ? all.filter(v =>
        v.address.toLowerCase().includes(query.toLowerCase()) ||
        (PROPERTY_TYPE_LABELS[v.property_type] ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : all

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ letterSpacing: '-0.3px' }}>Relatórios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Histórico de avaliações geradas</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-5" style={{ maxWidth: 400 }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(0) }}
          placeholder="Buscar por endereço ou tipo de imóvel..."
          className="w-full py-2.5 pl-9 pr-4 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-blue-400 transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer text-base leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Estado de carregamento / erro */}
      {loading && (
        <div className="text-sm text-slate-400 py-10 text-center">Carregando avaliações…</div>
      )}
      {error && !loading && (
        <div className="text-sm text-red-500 py-10 text-center">{error}</div>
      )}

      {/* Tabela */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center">
              {query ? 'Nenhum resultado para essa busca.' : 'Nenhuma avaliação encontrada.'}
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {filtered.map(v => (
                  <div
                    key={v.id}
                    onClick={() => navigate(`/resultado/${v.id}`)}
                    className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 cursor-pointer active:bg-slate-50"
                  >
                    <div className="font-medium text-slate-800 text-sm truncate">{v.address}</div>
                    <div className="text-xs text-slate-400 mt-0.5 mb-2">{v.area_m2} m² · {PROPERTY_TYPE_LABELS[v.property_type] ?? v.property_type}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm" style={{ color: PRIMARY }}>
                        {v.static_market_value_brl != null ? fmt(v.static_market_value_brl) : '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        {v.confidence_score != null && <ConfidenceBadge score={v.confidence_score} />}
                        <span className="text-xs text-slate-400">{fmtDate(v.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet+: tabela */}
              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Imóvel</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Confiança</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => (
                      <tr
                        key={v.id}
                        onClick={() => navigate(`/resultado/${v.id}`)}
                        className="cursor-pointer transition-colors"
                        style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', background: 'white' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800 truncate max-w-xs">{v.address}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{v.area_m2} m²</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{PROPERTY_TYPE_LABELS[v.property_type] ?? v.property_type}</td>
                        <td className="px-4 py-3.5 text-right font-semibold" style={{ color: PRIMARY }}>
                          {v.static_market_value_brl != null ? fmt(v.static_market_value_brl) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {v.confidence_score != null ? <ConfidenceBadge score={v.confidence_score} /> : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-400 text-xs whitespace-nowrap">
                          {fmtDate(v.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Paginação */}
          {!query && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>{total} avaliações no total</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-default hover:bg-slate-50 transition-colors"
                  style={{ fontFamily: 'inherit' }}
                >
                  ← Anterior
                </button>
                <span className="px-2">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-default hover:bg-slate-50 transition-colors"
                  style={{ fontFamily: 'inherit' }}
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
