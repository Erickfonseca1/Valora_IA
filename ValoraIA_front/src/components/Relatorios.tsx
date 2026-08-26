import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DashboardValuationItem } from '../types'
import { listValuations, deleteValuation, restoreValuation } from '../api'
import { ConfidenceBadge } from './Charts'

const PRIMARY = '#111827'

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
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

const PAGE_SIZE = 20

export default function Relatorios() {
  const navigate = useNavigate()
  const [items, setItems] = useState<DashboardValuationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [status, setStatus] = useState<'active' | 'deleted'>('active')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setPage(0)
  }, [debouncedQuery, status])

  const load = useCallback(async (pageIndex: number) => {
    setLoading(true)
    setError(null)
    try {
      const r = await listValuations({
        limit: PAGE_SIZE,
        offset: pageIndex * PAGE_SIZE,
        q: debouncedQuery || undefined,
        status,
      })
      setItems(r.items)
      setTotal(r.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, status])

  useEffect(() => {
    load(page)
  }, [load, page])

  const handleDelete = async (v: DashboardValuationItem) => {
    if (!window.confirm(`Excluir a avaliação de ${v.address}? Ela vai para a lixeira e pode ser restaurada em até 30 dias.`)) return
    try {
      await deleteValuation(v.id)
      load(page)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const handleRestore = async (v: DashboardValuationItem) => {
    try {
      await restoreValuation(v.id)
      load(page)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao restaurar')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ letterSpacing: '-0.3px' }}>Relatórios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Histórico de estudos gerados</p>
        </div>
      </div>

      {/* Busca (backend) */}
      <div className="relative mb-3" style={{ maxWidth: 400 }}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value) }}
          placeholder="Buscar por endereço ou cidade..."
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

      {/* Tabs ativos / lixeira */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8E0CF', marginBottom: 18 }}>
        {([
          ['active', 'Ativos'],
          ['deleted', 'Lixeira'],
        ] as ['active' | 'deleted', string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            style={{
              padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              color: status === key ? PRIMARY : '#64748B',
              borderBottom: status === key ? '2px solid #C9A227' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-sm text-slate-400 py-10 text-center">Carregando…</div>
      )}
      {error && !loading && (
        <div className="text-sm text-red-500 py-10 text-center">{error}</div>
      )}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center">
              {status === 'deleted'
                ? 'A lixeira está vazia.'
                : (query ? 'Nenhum resultado para essa busca.' : 'Nenhuma avaliação encontrada. Crie a primeira no menu "Nova Avaliação".')}
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {items.map(v => (
                  <div
                    key={v.id}
                    onClick={() => status === 'active' && navigate(`/app/resultado/${v.id}`)}
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
                    {status === 'deleted' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(v) }}
                        style={{ marginTop: 10, border: '1px solid #E8E0CF', background: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}
                      >
                        Restaurar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Tablet+: tabela */}
              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Imóvel</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Confiança</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((v, i) => (
                        <tr
                          key={v.id}
                          onClick={() => status === 'active' && navigate(`/app/resultado/${v.id}`)}
                          className={status === 'active' ? 'cursor-pointer transition-colors' : ''}
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
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            {status === 'deleted' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRestore(v) }}
                                style={{ border: '1px solid #E8E0CF', background: '#fff', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569', fontFamily: 'inherit' }}
                              >
                                Restaurar
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(v) }}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#DC2626', fontSize: 12, fontFamily: 'inherit' }}
                              >
                                Excluir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {totalPages > 1 && (
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