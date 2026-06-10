import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { ValuationRecord } from '../types'
import { getValuation } from '../api'
import { FRONT_CATALOG } from '../amenities'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

const SCOPE_TITLES: Record<string, string> = {
  interno: 'Diferencial do Imóvel',
  condo: 'Infra do Condomínio',
  proximo: 'Entorno',
}

function AmenityScopes({ amenities }: { amenities?: { item: string; scope: string }[] }) {
  if (!amenities?.length) return null
  const byScope: Record<string, string[]> = {}
  for (const a of amenities) {
    const label = FRONT_CATALOG[a.item]?.label ?? a.item
    ;(byScope[a.scope] ??= []).push(label)
  }
  const hasAny = (['interno', 'condo', 'proximo'] as const).some(s => byScope[s]?.length)
  if (!hasAny) return null
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['interno', 'condo', 'proximo'] as const).map(s =>
        byScope[s]?.length ? (
          <div key={s}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              {SCOPE_TITLES[s]}
            </div>
            <div style={{ fontSize: 13, color: '#334155' }}>{byScope[s].join(' · ')}</div>
          </div>
        ) : null
      )}
    </div>
  )
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
}

const CONSERVATION_LABELS: Record<string, string> = {
  novo: 'Novo',
  entre_novo_e_regular: 'Entre Novo e Regular',
  regular: 'Regular',
  reparos_simples: 'Reparos Simples',
  reparos_importantes: 'Reparos Importantes',
  critico: 'Crítico',
}

const SLOPE_LABELS: Record<string, string> = {
  plano: 'Plano',
  aclive_leve: 'Aclive Leve',
  declive_leve: 'Declive Leve',
  aclive_acentuado: 'Aclive Acentuado',
  declive_acentuado: 'Declive Acentuado',
}

const LEVEL_LABELS: Record<string, string> = {
  no_nivel: 'No nível da rua',
  acima_nivel: 'Acima do nível da rua',
  abaixo_nivel: 'Abaixo do nível da rua',
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

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{
      background: PRIMARY,
      color: '#fff',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 2,
        opacity: 0.55,
        fontFamily: 'monospace',
        minWidth: 20,
      }}>{number}</span>
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>{title}</span>
    </div>
  )
}

function SectionCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: 8,
      marginBottom: 14,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [valuation, setValuation] = useState<ValuationRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { navigate('/'); return }
    getValuation(id)
      .then(v => setValuation(v))
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

  const propertyLabel = PROPERTY_TYPE_LABELS[valuation.property_type] ?? valuation.property_type
  const laudoDate = new Date(valuation.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const laudoId = `PTAM-${valuation.id.slice(-6).toUpperCase()}`
  const confidenceScore = valuation.confidence_score ?? 0
  const comparables = valuation.comparables ?? []

  const fichaRows: { label: string; value: string }[] = [
    { label: 'Nº do Laudo', value: laudoId },
    { label: 'Data de Emissão', value: laudoDate },
    { label: 'Tipo de Imóvel', value: propertyLabel },
    { label: 'Área', value: `${valuation.area_m2.toLocaleString('pt-BR')} m²` },
    ...(valuation.bedrooms != null ? [{ label: 'Quartos', value: String(valuation.bedrooms) }] : []),
    ...(valuation.bathrooms != null ? [{ label: 'Banheiros', value: String(valuation.bathrooms) }] : []),
    ...(valuation.parking_spaces != null ? [{ label: 'Vagas de Garagem', value: String(valuation.parking_spaces) }] : []),
    { label: 'Estado de Conservação', value: CONSERVATION_LABELS[valuation.conservation_state] ?? valuation.conservation_state },
    ...(valuation.construction_age != null ? [{ label: 'Idade da Construção', value: `${valuation.construction_age} anos` }] : []),
    { label: 'Topografia', value: SLOPE_LABELS[valuation.terrain_slope] ?? valuation.terrain_slope },
    { label: 'Nível em Relação à Rua', value: LEVEL_LABELS[valuation.street_level] ?? valuation.street_level },
    ...(valuation.is_corner ? [{ label: 'Situação', value: 'Imóvel de Esquina' }] : []),
    { label: 'Finalidade', value: 'Determinação do Valor de Mercado' },
    { label: 'Metodologia', value: 'Método Comparativo Direto de Dados de Mercado — NBR 14.653-1' },
  ]

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', fontFamily: 'inherit' }}>

      {/* ── DOCUMENT LETTERHEAD ─────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{
          background: PRIMARY,
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Parecer Técnico de Avaliação Mercadológica
            </div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: 0.5 }}>
              ValoraIA
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 }}>
              Avaliação por Inteligência Artificial · Conforme ABNT NBR 14.653
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Nº do Laudo</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1.5 }}>{laudoId}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 6 }}>{laudoDate}</div>
          </div>
        </div>
        <div style={{ padding: '10px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Imóvel:</span>
          <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 600 }}>{valuation.address}</span>
        </div>
      </div>

      {/* ── 01. FICHA TÉCNICA ───────────────────────────────────── */}
      <SectionCard>
        <SectionHeader number="01" title="Ficha Técnica do Laudo" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {fichaRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FAFBFD' : '#fff' }}>
                <td style={{ padding: '9px 20px', color: '#64748B', fontWeight: 700, width: '32%', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {row.label}
                </td>
                <td style={{ padding: '9px 20px', color: '#1E293B', fontWeight: 500 }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ── 01b. COMODIDADES POR ESCOPO ─────────────────────────── */}
      {valuation.amenities?.length > 0 && (
        <SectionCard>
          <SectionHeader number="01b" title="Comodidades do Imóvel por Escopo" />
          <div style={{ padding: '16px 20px' }}>
            <AmenityScopes amenities={valuation.amenities} />
          </div>
        </SectionCard>
      )}

      {/* ── 02. VALOR DE MERCADO DETERMINADO ───────────────────── */}
      <SectionCard>
        <SectionHeader number="02" title="Valor de Mercado Determinado" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ padding: '24px 28px', borderRight: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Valor de Mercado (Método Comparativo)
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: PRIMARY, fontFamily: 'monospace', lineHeight: 1 }}>
              {valuation.static_market_value_brl != null ? fmt(valuation.static_market_value_brl) : '—'}
            </div>
            {valuation.price_per_m2_homogenized != null && (
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>
                {fmtM2(Math.round(valuation.price_per_m2_homogenized))} · homogeneizado
              </div>
            )}
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Grau de Confiança da Estimativa
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: confidenceScore >= 75 ? ACCENT : '#F59E0B', fontFamily: 'monospace', lineHeight: 1 }}>
                {confidenceScore}%
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>
                {CONFIDENCE_LABEL(confidenceScore)}
              </div>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
              <div style={{ height: '100%', background: confidenceScore >= 75 ? ACCENT : '#F59E0B', borderRadius: 3, width: `${confidenceScore}%`, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
              Baseado em {comparables.length} imóvel{comparables.length !== 1 ? 'is' : ''} comparável{comparables.length !== 1 ? 'is' : ''} · Fator de oferta −10% aplicado
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── 03. IMÓVEIS REFERENCIAIS ─────────────────────────────── */}
      {comparables.length > 0 && (
        <SectionCard>
          <SectionHeader number="03" title="Tabela de Imóveis Referenciais Homogeneizados" />
          <div style={{ padding: '10px 20px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ background: '#F1F5F9', borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: 10, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Homogeneizados
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Fator de oferta de 10% já aplicado em todos os comparáveis · Conforme NBR 14.653-1
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '9px 12px 9px 20px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, width: 36 }}>Nº</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Endereço / Bairro</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Área</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Qtos</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Situação</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Val./m²</th>
                  <th style={{ padding: '9px 20px 9px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {comparables.map((c, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: i % 2 === 0 ? '#fff' : '#FAFBFD',
                      cursor: c.source_url ? 'pointer' : 'default',
                    }}
                    onClick={() => c.source_url && window.open(c.source_url, '_blank')}
                  >
                    <td style={{ padding: '10px 12px 10px 20px', textAlign: 'center', color: '#94A3B8', fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>{c.neighborhood}</div>
                      <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 1, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.address}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>{c.area_m2}m²</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{c.bedrooms ?? '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                        background: c.status === 'listed' ? '#ECFDF5' : '#F1F5F9',
                        color: c.status === 'listed' ? ACCENT : '#64748B',
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        {c.status === 'listed' ? 'Oferta' : 'Venda'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: PRIMARY, fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                      {fmtM2(c.price_m2_brl)}
                    </td>
                    <td style={{ padding: '10px 20px 10px 12px', textAlign: 'right', color: '#1E293B', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                      {fmt(c.price_brl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── 04. ANÁLISE INVOLUTIVA (land only) ─────────────────── */}
      {valuation.max_buildable_area_m2 != null && (
        <SectionCard>
          <SectionHeader number="04" title="Análise Involutiva — Potencial Construtivo" />
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 36, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Área Construível Máxima</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY, fontFamily: 'monospace' }}>
                {valuation.max_buildable_area_m2.toLocaleString('pt-BR')} m²
              </div>
            </div>
            {valuation.zoning_params && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Índice de Aproveitamento (IA)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY, fontFamily: 'monospace' }}>{valuation.zoning_params.IAmax}×</div>
                {valuation.zoning_params.IAb != null && (
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>IAb: {valuation.zoning_params.IAb}×</div>
                )}
              </div>
            )}
          </div>
          {valuation.viability_scenarios && valuation.viability_scenarios.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '9px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Cenário</th>
                    <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>VGV Total</th>
                    <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Custo Obra (50%)</th>
                    <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Valor Residual</th>
                    <th style={{ padding: '9px 20px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {valuation.viability_scenarios.map((s, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: i === 1 ? `${ACCENT}09` : i % 2 === 0 ? '#fff' : '#FAFBFD',
                    }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{s.description}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 600, fontFamily: 'monospace' }}>{fmt(s.VGV_total)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#475569', fontFamily: 'monospace' }}>{fmt(s.VGV_total * 0.5)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: s.residual > 0 ? ACCENT : '#DC2626' }}>
                        {fmt(s.residual)}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: s.roi_pct > 15 ? ACCENT : '#F59E0B' }}>
                        {s.roi_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── 05. ABISMO DE VALOR ─────────────────────────────────── */}
      {valuation.static_market_value_brl != null && valuation.residual_land_value_brl != null && (
        <SectionCard>
          <SectionHeader number="05" title="Abismo de Valor — Análise Comparativa de Uso" />
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, marginTop: 0, lineHeight: 1.75 }}>
              A análise involutiva revela o "abismo de valor" entre a venda direta do imóvel no mercado
              e seu potencial como ativo de desenvolvimento. O Valor Residual do Terreno representa o
              preço máximo que um incorporador pagaria pelo imóvel para viabilizar um empreendimento,
              mantendo as margens mínimas do setor.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                  Venda Direta ao Mercado
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: PRIMARY, fontFamily: 'monospace', marginBottom: 6 }}>
                  {fmt(valuation.static_market_value_brl)}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  Método Comparativo Direto (MCDDM) · NBR 14.653-2
                </div>
              </div>
              <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 22, padding: '0 4px' }}>⇄</div>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                  Valor de Incorporação (Residual)
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: ACCENT, fontFamily: 'monospace', marginBottom: 6 }}>
                  {fmt(valuation.residual_land_value_brl)}
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  Método Involutivo · Cenário Base (IA máximo)
                </div>
              </div>
            </div>
            {valuation.residual_land_value_brl > 0 && (
              <div style={{ marginTop: 14, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>Relação Incorporação / Venda Direta:</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#92400E', fontFamily: 'monospace' }}>
                  {(valuation.residual_land_value_brl / valuation.static_market_value_brl).toFixed(2)}×
                </span>
                <span style={{ fontSize: 12, color: '#92400E' }}>
                  — {valuation.residual_land_value_brl > valuation.static_market_value_brl
                    ? 'O potencial de desenvolvimento supera a venda direta'
                    : 'A venda direta é mais vantajosa que o desenvolvimento'}
                </span>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── 06. VIZINHANÇA ──────────────────────────────────────── */}
      {valuation.neighborhood_pois && valuation.neighborhood_pois.pois.length > 0 && (
        <SectionCard>
          <SectionHeader number="06" title="Análise de Vizinhança e Infraestrutura Urbana" />
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Levantamento de serviços e equipamentos urbanos no entorno imediato do imóvel.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Score de Vizinhança:</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: PRIMARY, fontFamily: 'monospace' }}>
                {Math.round(valuation.neighborhood_pois.totalScore * 100)}%
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {valuation.neighborhood_pois.pois.map((cat, i) => {
              const count = cat.places.length
              const scorePct = Math.round(cat.score * 100)
              const minDist = count > 0 ? Math.min(...cat.places.map(p => p.distance_m)) : null
              return (
                <div
                  key={i}
                  style={{
                    padding: '14px 16px',
                    borderRight: (i + 1) % 4 !== 0 ? '1px solid #F1F5F9' : undefined,
                    borderBottom: i < valuation.neighborhood_pois!.pois.length - 4 ? '1px solid #F1F5F9' : undefined,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{cat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: count > 0 ? PRIMARY : '#CBD5E1', fontFamily: 'monospace', marginBottom: 4 }}>
                    {count}
                  </div>
                  <div style={{ height: 3, background: '#F1F5F9', borderRadius: 2, marginBottom: 4 }}>
                    <div style={{ height: '100%', background: count > 0 ? ACCENT : '#CBD5E1', borderRadius: 2, width: `${scorePct}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    {minDist != null ? `Mais próximo: ${minDist}m` : 'Não encontrado'}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* ── AVISO LEGAL ─────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        marginBottom: 14,
        fontSize: 11,
        color: '#94A3B8',
        lineHeight: 1.75,
      }}>
        <strong style={{ color: '#64748B' }}>Aviso Legal:</strong> Este parecer foi gerado por sistema de inteligência artificial com base em dados públicos de oferta e transação imobiliária.
        Os valores apresentados têm caráter informativo e não substituem laudo de avaliação assinado por profissional habilitado pelo IBAPE/CONFEA,
        conforme exigido pela NBR 14.653-1 para laudos com fins legais, judiciais ou de garantia.
      </div>

      {/* ── AÇÕES ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', paddingBottom: 40 }}>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '10px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit' }}
        >
          ← Voltar ao Painel
        </button>
        <button
          onClick={() => navigate('/nova-avaliacao')}
          style={{ padding: '10px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: PRIMARY, color: '#fff', fontFamily: 'inherit' }}
        >
          + Nova Avaliação
        </button>
        <button
          onClick={() => window.print()}
          style={{ padding: '10px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit' }}
        >
          Imprimir / PDF
        </button>
      </div>
    </div>
  )
}
