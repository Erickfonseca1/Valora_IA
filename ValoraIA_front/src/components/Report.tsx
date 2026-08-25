import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { ValuationRecord, ValuationPhoto } from '../types'
import { getValuation } from '../api'
import { FRONT_CATALOG } from '../amenities'
import ValueWaterfall from './ValueWaterfall'
import LiveValuationHero from './LiveValuationHero'
import { pdf } from '@react-pdf/renderer'
import LaudoPDF from './LaudoPDF'
import { toPng } from 'html-to-image'

const PRIMARY = '#111827'
const ACCENT = '#C9A227'

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

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const fmtM2 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/m²'

function valueRange(value: number, confidenceScore: number | null, intervalWidthPct?: number): string {
  const pct = confidenceScore == null ? 50 : confidenceScore <= 1 ? confidenceScore * 100 : confidenceScore
  const width = intervalWidthPct != null && intervalWidthPct > 0
    ? intervalWidthPct / 200
    : 0.20 - (Math.max(0, Math.min(100, pct)) / 100) * 0.12
  return `${fmt(value * (1 - width))} – ${fmt(value * (1 + width))}`
}

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')

function displayPhotoUrl(photo: ValuationPhoto): string {
  return /\.(heic|heif)(?:\?|$)/i.test(photo.photo_url)
    ? `${API_BASE}/api/valuation-photos/${encodeURIComponent(photo.id)}/image`
    : photo.photo_url
}

// ─── Photo thumbnail with natural aspect ratio ────────────────────────────────
// Fixed width on desktop; flexible on small screens so the photo never
// overflows the viewport. Height follows the intrinsic aspect ratio.

const PHOTO_WIDTH = 200

function PhotoThumb({ src, alt }: { src: string; alt: string }) {
  const [height, setHeight] = useState<number | null>(null)

  return (
    <img
      src={src}
      alt={alt}
      onLoad={(e) => {
        const img = e.currentTarget
        if (img.naturalWidth > 0) {
          const w = Math.min(PHOTO_WIDTH, img.naturalWidth)
          setHeight(Math.round((w * img.naturalHeight) / img.naturalWidth))
        }
      }}
      style={{
        width: 'min(200px, calc(100vw - 72px))',
        height: height ?? 200,
        objectFit: height ? undefined : 'contain',
        background: '#F7F4EE',
        borderRadius: 6,
        border: '1px solid #E8E0CF',
      }}
    />
  )
}

async function waitForMapTiles(mapEl: HTMLElement): Promise<void> {
  const tiles = Array.from(mapEl.querySelectorAll('img.leaflet-tile')) as HTMLImageElement[]
  if (tiles.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return
  }

  await Promise.race([
    Promise.all(tiles.map((tile) => tile.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          tile.addEventListener('load', () => resolve(), { once: true })
          tile.addEventListener('error', () => resolve(), { once: true })
        })
    )),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ])
}

// ─── Photos per room (grouped, rooms in submission order) ─────────────────────

function groupPhotosByRoom(photos: ValuationPhoto[]): [string, ValuationPhoto[]][] {
  const order = ['Fachada', 'Sala', 'Cozinha', 'Quartos', 'Banheiros', 'Área de Serviço', 'Área Externa', 'Outros']
  const map = new Map<string, ValuationPhoto[]>()
  for (const p of photos) {
    const room = p.room ?? 'Outros'
    if (!map.has(room)) map.set(room, [])
    map.get(room)!.push(p)
  }
  const known = order.filter(r => map.has(r)).map(r => [r, map.get(r)!] as [string, ValuationPhoto[]])
  const rest = [...map.keys()].filter(r => !order.includes(r)).map(r => [r, map.get(r)!] as [string, ValuationPhoto[]])
  return [...known, ...rest]
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{
      borderLeft: '3px solid #C9A227',
      paddingLeft: 16,
      paddingTop: 10,
      paddingBottom: 10,
      borderBottom: '1px solid #E8E0CF',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'transparent',
    }}>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#C9A227',
        letterSpacing: 1,
        minWidth: 20,
      }}>{number}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#1A1A1A',
        letterSpacing: '-0.2px',
        textTransform: 'uppercase',
      }}>{title}</span>
    </div>
  )
}

function SectionCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8E0CF',
      borderRadius: 12,
      marginBottom: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    if (!id) { navigate('/app'); return }
    getValuation(id)
      .then(v => setValuation(v))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, navigate])

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

  if (error || !valuation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-slate-400 text-sm">Avaliação não encontrada</div>
        {error && <div className="text-xs text-red-400">{error}</div>}
        <button
          onClick={() => navigate('/app')}
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
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })
  const laudoId = `ES-${valuation.id.slice(-6).toUpperCase()}`

  const handleDownloadPdf = async () => {
    if (!valuation) return
    setPdfLoading(true)
    try {
      // Capture the live Leaflet map (same visual as the web report) and
      // embed it in the PDF as an image.
      let mapImage: string | null = null
      const mapEl = document.querySelector('[data-report-map] .leaflet-container') as HTMLElement | null
      if (mapEl) {
        try {
          await waitForMapTiles(mapEl)
          mapImage = await toPng(mapEl, {
            pixelRatio: 2,
            backgroundColor: '#fff',
            cacheBust: true,
          })
        } catch (e) {
          console.error('[report] map capture failed:', e)
        }
      }

      const blob = await pdf(<LaudoPDF valuation={valuation} mapImage={mapImage} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${laudoId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }
  const comparables = valuation.comparables ?? []
  const isPriorOnly = comparables.length === 0 && !!valuation.market_reference
  const priorBairro = valuation.market_reference?.neighborhood ?? ''
  const confidenceDiagnostics = valuation.confidence_diagnostics

  const fichaRows: { label: string; value: string }[] = [
    { label: 'Nº do Estudo', value: laudoId },
    { label: 'Data de Emissão', value: laudoDate },
    { label: 'Tipo de Imóvel', value: propertyLabel },
    { label: 'Área construída', value: `${(valuation.area_construida_m2 ?? valuation.area_m2).toLocaleString('pt-BR')} m²` },
    ...(valuation.area_terreno_m2 != null ? [{ label: 'Área do terreno', value: `${valuation.area_terreno_m2.toLocaleString('pt-BR')} m²` }] : []),
    ...(valuation.bedrooms != null ? [{ label: 'Quartos', value: String(valuation.bedrooms) }] : []),
    ...(valuation.bathrooms != null ? [{ label: 'Banheiros', value: String(valuation.bathrooms) }] : []),
    ...(valuation.parking_spaces != null ? [{ label: 'Vagas de Garagem', value: String(valuation.parking_spaces) }] : []),
    { label: 'Estado de Conservação', value: CONSERVATION_LABELS[valuation.conservation_state] ?? valuation.conservation_state },
    ...(valuation.construction_age != null ? [{ label: 'Idade da Construção', value: `${valuation.construction_age} anos` }] : []),
    { label: 'Topografia', value: SLOPE_LABELS[valuation.terrain_slope] ?? valuation.terrain_slope },
    { label: 'Nível em Relação à Rua', value: LEVEL_LABELS[valuation.street_level] ?? valuation.street_level },
    ...(valuation.is_corner ? [{ label: 'Situação', value: 'Imóvel de Esquina' }] : []),
    { label: 'Finalidade', value: 'Subsídio técnico para construção do PTAM' },
    { label: 'Metodologia', value: 'Método Comparativo Direto de Dados de Mercado — referência NBR 14.653-1' },
  ]

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', fontFamily: 'inherit' }}>

      {/* ── DOCUMENT LETTERHEAD ─────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{
          background: PRIMARY,
          padding: '18px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Estudo Técnico de Avaliação — Subsídio para Elaboração de PTAM
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: 0.5 }}>
              AVALIA
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 }}>
              Metodologia referenciada na ABNT NBR 14.653 · resultado para análise do avaliador
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Nº do Estudo</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: 1.5 }}>{laudoId}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 6 }}>{laudoDate}</div>
          </div>
        </div>
        <div style={{ padding: '10px 16px', background: '#F7F4EE', borderTop: '1px solid #E8E0CF', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Imóvel:</span>
          <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 600 }}>{valuation.address}</span>
        </div>
      </div>

      {/* ── NATUREZA DO DOCUMENTO ──────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 8,
        marginBottom: 14,
        fontSize: 12,
        color: '#92400E',
        lineHeight: 1.65,
      }}>
        <strong style={{ color: '#92400E' }}>Natureza deste documento:</strong>{' '}
        Este estudo foi gerado por IA com dados de anúncios públicos. Não constitui PTAM/laudo legal — o valor
        depende de vistoria, análise crítica e julgamento do profissional habilitado.
      </div>

      {/* ── 01. FICHA TÉCNICA ───────────────────────────────────── */}
      <SectionCard>
        <SectionHeader number="01" title="Ficha Técnica do Estudo" />
        <div>
          {fichaRows.map((row, i) => (
            <div key={i} style={{ borderBottom: '1px solid #E8E0CF', background: i % 2 === 0 ? '#FAFBFD' : '#fff', display: 'flex', flexWrap: 'wrap', gap: '2px 12px', padding: '9px 16px' }}>
              <span style={{ color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, minWidth: 140 }}>
                {row.label}
              </span>
              <span style={{ color: '#1E293B', fontWeight: 500, fontSize: 13 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
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

      {/* ── 02. VALOR DE MERCADO INDICATIVO ────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <LiveValuationHero record={valuation} mode="static" />
      </div>
      <SectionCard>
        <SectionHeader number="02" title="Valor de Mercado Indicativo" />
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 0 }}>
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #E8E0CF' }} className="sm:border-b-0 sm:border-r sm:border-slate-100 sm:!p-[24px_28px]">
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Valor de Mercado Indicativo (Método Comparativo)
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: PRIMARY, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
              {valuation.static_market_value_brl != null ? fmt(valuation.static_market_value_brl) : '—'}
            </div>
            {valuation.price_per_m2_homogenized != null && (
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>
                {fmtM2(Math.round(valuation.price_per_m2_homogenized))} · homogeneizado
              </div>
            )}
            {isPriorOnly && (
              <div style={{ fontSize: 11, color: '#B45309', marginTop: 8, fontWeight: 600 }}>
                Baseado no R$/m² verificado do bairro {priorBairro} (sem comparáveis diretos)
              </div>
            )}
          </div>
          <div style={{ padding: '20px 16px' }} className="sm:!p-[24px_28px]">
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Faixa indicativa (Método Comparativo)
            </div>
            <div style={{ fontSize: 24, color: PRIMARY, fontWeight: 800, marginTop: 5, fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>
              {valuation.static_market_value_brl != null
                ? valueRange(
                    valuation.static_market_value_brl,
                    valuation.confidence_score,
                    confidenceDiagnostics?.confidence_interval_width_pct,
                  )
                : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.55, marginTop: 12 }}>
              O valor central à esquerda é o resultado do cálculo comparativo; esta faixa mostra o espaço de interpretação da amostra. Use ambos junto ao imóvel, ao mercado local e à negociação.
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 10 }}>
              {confidenceDiagnostics
                ? `${confidenceDiagnostics.sample_size} comparáveis usados · ${confidenceDiagnostics.displayed_sample_size} principais exibidos · amostra efetiva ${confidenceDiagnostics.effective_sample_size}`
                : `Baseado em ${comparables.length} imóvel${comparables.length !== 1 ? 'is' : ''} comparável${comparables.length !== 1 ? 'is' : ''}`} · Fator de oferta −10% aplicado
            </div>
            {confidenceDiagnostics && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderLeft: '2px solid #C9A227', background: '#FEFCF5', color: '#64748B', fontSize: 11, lineHeight: 1.55 }}>
                <strong style={{ color: '#1F2937' }}>Contexto da amostra</strong>
                <div style={{ marginTop: 4 }}>{confidenceDiagnostics.reasons.join(' ')}</div>
                <div style={{ marginTop: 4 }}>Intervalo estatístico: {confidenceDiagnostics.confidence_interval_width_pct.toLocaleString('pt-BR')}% do valor estimado.</div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── 02a. COMO USAR ESTE ESTUDO ─────────────────────────── */}
      <SectionCard>
        <SectionHeader number="02a" title="Como usar este estudo" />
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          {[
            { n: '01', t: 'Vistoria e confirmação visual', d: 'Confirme no imóvel as características usadas no cálculo e registre o relatório fotográfico.' },
            { n: '02', t: 'Validação dos comparáveis', d: 'Revise os anúncios selecionados e descarte os que não refletem o mercado local.' },
            { n: '03', t: 'Ajustes pelo seu julgamento', d: 'Aplique os fatores de homogeneização que considerar necessários com base na sua análise.' },
            { n: '04', t: 'Conclusão do PTAM', d: 'Estruture o parecer final com ART/RRT ou selo CNAI, assumindo a responsabilidade técnica.' },
          ].map(s => (
            <div key={s.n} style={{ background: '#F7F4EE', border: '1px solid #E8E0CF', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#C9A227', fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>{s.n}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', marginBottom: 3 }}>{s.t}</div>
              <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.55 }}>{s.d}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 20px 14px', fontSize: 11, color: '#94A3B8', lineHeight: 1.55 }}>
          Este estudo adianta a pesquisa e os cálculos; a conclusão do valor é responsabilidade do avaliador habilitado.
        </div>
      </SectionCard>

      {/* ── 02b. MEMÓRIA DE CÁLCULO ─────────────────────────────── */}
      {valuation.homogenization_factors && (
        <SectionCard>
          <SectionHeader number="02b" title="Base Comparável Homogeneizada" />
          <ValueWaterfall factors={valuation.homogenization_factors} />
        </SectionCard>
      )}

      {/* ── 02c. REFERÊNCIA DE MERCADO VERIFICADA ────────────────── */}
      {valuation.market_reference && (
        <SectionCard>
          <SectionHeader number="02c" title="Âncora Local e Composição do Resultado" />
          <div style={{ padding: '12px 20px', background: '#FEFCF5', borderBottom: '1px solid #E8D99A', fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
            <strong style={{ color: '#1E293B' }}>Como ler esta etapa:</strong> a 02b mostra a base
            calculada pelos comparáveis. Esta etapa mostra uma referência independente do bairro,
            usada para ancorar o resultado quando a amostra direta é fraca ou pouco representativa.
            Ela não é um segundo valor do imóvel.
          </div>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>
                Referência independente · R$/m² do bairro {valuation.market_reference.neighborhood}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY, fontFamily: "'DM Mono', monospace" }}>
                {fmtM2(valuation.market_reference.price_per_m2)}
                <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', marginLeft: 8 }}>
                  (anúncio: {fmtM2(valuation.market_reference.raw_price_per_m2)})
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Fator de oferta de 10% aplicado · Dados verificados 2025/2026
              </div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 6 }}>Peso desta âncora no resultado:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#334155', fontFamily: "'DM Mono', monospace" }}>
                  {Math.round(valuation.market_reference.blend_weight * 100)}%
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 6 }}>Qualidade dos comparáveis diretos:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#334155', fontFamily: "'DM Mono', monospace" }}>
                  {Math.round(valuation.market_reference.sample_quality * 100)}%
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: '0 20px 14px', fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
            Este R$/m² vem de pesquisa de mercado verificada e funciona como referência locacional.
            O resultado final combina a base da 02b com esta âncora conforme o peso indicado acima;
            quanto maior esse peso, maior a influência da referência do bairro sobre o resultado.
          </div>
        </SectionCard>
      )}

      {/* ── 03. IMÓVEIS REFERENCIAIS ─────────────────────────────── */}
      {isPriorOnly && valuation.market_reference && (
        <SectionCard>
          <SectionHeader number="03" title="Fundamentação da Avaliação — Referência de Mercado" />
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E8E0CF' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <span style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Avaliação referencial
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.7 }}>
              No momento desta avaliação não havia disponível um conjunto mínimo de anúncios
              comparáveis da mesma tipologia no bairro <strong>{priorBairro}</strong>.
              Para não deixar o imóvel sem parâmetro de mercado, o valor foi fundamentado no
              <strong> preço médio verificado do metro quadrado</strong> para{' '}
              {PROPERTY_TYPE_LABELS[valuation.property_type] ?? valuation.property_type}s no bairro,
              levantado em pesquisa de mercado verificada de 2025/2026.
            </div>
          </div>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E0CF', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
                R$/m² verificado no bairro
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: PRIMARY, fontFamily: "'DM Mono', monospace" }}>
                {fmtM2(valuation.market_reference.raw_price_per_m2)}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                após fator de oferta (−10%): {fmtM2(valuation.market_reference.price_per_m2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
                Bairro de referência
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{valuation.market_reference.neighborhood}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
                Confiança da estimativa
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B', fontFamily: "'DM Mono', monospace" }}>
                {valuation.confidence_score ?? 0}%
              </div>
            </div>
          </div>
          <div style={{ padding: '14px 20px', background: '#F7F4EE', fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
            <strong style={{ color: '#1E293B' }}>Nota metodológica:</strong> o R$/m² de referência foi obtido
            por <strong style={{ color: '#1E293B' }}>curadoria especializada</strong> — pesquisa de mercado
            conduzida por especialistas com apoio de ferramentas de IA e validação técnica, conferindo
            grau de confiabilidade próprio à referência. A determinação do valor segue os princípios da
            ABNT NBR 14.653; quando novos anúncios comparáveis da tipologia e bairro forem coletados,
            esta avaliação poderá ser atualizada para o enquadramento pleno do Método Comparativo
            Direto de Dados de Mercado.
          </div>
        </SectionCard>
      )}

      {/* ── 03b. IMÓVEIS REFERENCIAIS (com comparáveis) ───────────── */}
      {comparables.length > 0 && (
        <SectionCard>
          <SectionHeader number="03" title="Tabela de Imóveis Referenciais Homogeneizados" />
          <div style={{ padding: '10px 20px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E8E0CF' }}>
            <span style={{ background: '#F7F4EE', borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: 10, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Homogeneizados
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Fator de oferta de 10% já aplicado em todos os comparáveis · Conforme NBR 14.653-1
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#F7F4EE', borderBottom: '2px solid #E8E0CF' }}>
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
                      borderBottom: '1px solid #E8E0CF',
                      background: i % 2 === 0 ? '#fff' : '#FAFBFD',
                      cursor: c.source_url ? 'pointer' : 'default',
                    }}
                    onClick={() => c.source_url && window.open(c.source_url, '_blank')}
                  >
                    <td style={{ padding: '10px 12px 10px 20px', textAlign: 'center', color: '#94A3B8', fontWeight: 700, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
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
                        background: c.status === 'listed' ? '#ECFDF5' : '#F7F4EE',
                        color: c.status === 'listed' ? ACCENT : '#64748B',
                        textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        {c.status === 'listed' ? 'Oferta' : 'Venda'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: PRIMARY, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                      {fmtM2(c.price_m2_brl)}
                    </td>
                    <td style={{ padding: '10px 20px 10px 12px', textAlign: 'right', color: '#1E293B', fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
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
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E0CF', display: 'flex', gap: 36, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Área Construível Máxima</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY, fontFamily: "'DM Mono', monospace" }}>
                {valuation.max_buildable_area_m2.toLocaleString('pt-BR')} m²
              </div>
            </div>
            {valuation.zoning_params && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Índice de Aproveitamento (IA)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY, fontFamily: "'DM Mono', monospace" }}>{valuation.zoning_params.IAmax}×</div>
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
                  <tr style={{ background: '#F7F4EE', borderBottom: '2px solid #E8E0CF' }}>
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
                      borderBottom: '1px solid #E8E0CF',
                      background: i === 1 ? '#FEFCF5' : i % 2 === 0 ? '#fff' : '#FAFBFD',
                    }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{s.description}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{fmt(s.VGV_total)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#475569', fontFamily: "'DM Mono', monospace" }}>{fmt(s.VGV_total * 0.5)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontFamily: "'DM Mono', monospace", color: s.residual > 0 ? ACCENT : '#DC2626' }}>
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
              <div style={{ background: '#F7F4EE', border: '1px solid #E8E0CF', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                  Venda Direta ao Mercado
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: PRIMARY, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
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
                <div style={{ fontSize: 26, fontWeight: 800, color: ACCENT, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
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
                <span style={{ fontSize: 15, fontWeight: 900, color: '#92400E', fontFamily: "'DM Mono', monospace" }}>
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
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #E8E0CF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Levantamento de serviços e equipamentos urbanos no entorno imediato do imóvel.
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Score de Vizinhança:</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: PRIMARY, fontFamily: "'DM Mono', monospace" }}>
                {Math.round(valuation.neighborhood_pois.totalScore * 100)}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E8E0CF]">
            {valuation.neighborhood_pois.pois.map((cat, i) => {
              const count = cat.places.length
              const scorePct = Math.round(cat.score * 100)
              const minDist = count > 0 ? Math.min(...cat.places.map(p => p.distance_m)) : null
              return (
                <div
                  key={i}
                  className="bg-white"
                  style={{ padding: '14px 16px' }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 6 }}>{cat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: count > 0 ? PRIMARY : '#CBD5E1', fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                    {count}
                  </div>
                  <div style={{ height: 3, background: '#F7F4EE', borderRadius: 2, marginBottom: 4 }}>
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

      {/* ── 07. DOCUMENTAÇÃO FOTOGRÁFICA ────────────────────────── */}
      {valuation.photos && valuation.photos.length > 0 && (
        <SectionCard>
          <SectionHeader number="07" title="Documentação Fotográfica" />
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #E8E0CF', fontSize: 12, color: '#64748B' }}>
            Registro fotográfico do imóvel organizado por cômodo, conforme levantamento em vistoria.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {groupPhotosByRoom(valuation.photos!).map(([room, photos], gi) => (
              <div key={gi} style={{ padding: '14px 20px', borderBottom: gi < groupPhotosByRoom(valuation.photos!).length - 1 ? '1px solid #E8E0CF' : undefined }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  {room}
                  <span style={{ color: '#94A3B8', fontWeight: 400, marginLeft: 8, textTransform: 'none' }}>
                    {photos.length} foto{photos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {photos.map((p, i) => (
                    <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer" title="Abrir foto">
                      <PhotoThumb src={displayPhotoUrl(p)} alt={`${room} ${i + 1}`} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── AVISO LEGAL ─────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        background: '#F7F4EE',
        border: '1px solid #E8E0CF',
        borderRadius: 8,
        marginBottom: 14,
        fontSize: 11,
        color: '#94A3B8',
        lineHeight: 1.75,
      }}>
        <strong style={{ color: '#64748B' }}>Aviso Legal:</strong> Este estudo foi gerado por sistema de inteligência artificial com base em dados públicos de oferta e transação imobiliária.
        Os valores apresentados têm caráter informativo e não substituem PTAM nem laudo técnico final elaborado e assinado
        pelo profissional habilitado responsável, conforme a finalidade e o conselho profissional aplicáveis.
      </div>

      {/* ── AÇÕES ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-center pb-10">
        <button
          onClick={() => navigate('/app')}
          style={{ padding: '10px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #E8E0CF', background: '#fff', color: '#475569', fontFamily: 'inherit' }}
        >
          ← Voltar ao Painel
        </button>
        <button
          onClick={() => navigate('/app/nova-avaliacao')}
          style={{ padding: '10px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: PRIMARY, color: '#fff', fontFamily: 'inherit' }}
        >
          + Nova Avaliação
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          style={{
            border: '1px solid #E8E0CF',
            background: '#FFFFFF',
            color: '#1A1A1A',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: pdfLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#C9A227'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#C9A227'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8E0CF'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A'
          }}
        >
          {pdfLoading ? 'Gerando PDF…' : 'Baixar PDF'}
        </button>
      </div>
    </div>
  )
}
