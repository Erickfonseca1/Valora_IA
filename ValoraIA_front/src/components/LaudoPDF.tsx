import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { ValuationRecord, ValuationPhoto } from '../types'
import { FRONT_CATALOG } from '../amenities'
import { enquadrar } from '../lib/nbr146532'

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

const PRIMARY = '#111827'
const ACCENT = '#C9A227'
const MUTED = '#94A3B8'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento', house: 'Casa', commercial: 'Comercial', land: 'Terreno',
}
const CONSERVATION_LABELS: Record<string, string> = {
  novo: 'Novo', entre_novo_e_regular: 'Entre Novo e Regular', regular: 'Regular',
  reparos_simples: 'Reparos Simples', reparos_importantes: 'Reparos Importantes', critico: 'Crítico',
}
const SCOPE_TITLES: Record<string, string> = {
  interno: 'Diferencial do Imóvel', condo: 'Infra do Condomínio', proximo: 'Entorno',
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPpm2 = (v: number) => fmtBRL(Math.round(v)) + '/m²'
const fmtMult = (v: number) => '× ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Estimated value band (same logic as LiveValuationHero) ───────────────────

function valueRange(value: number, score: number | null, intervalWidthPct?: number): [number, number] | null {
  if (!value) return null
  const pct = score == null ? 50 : score <= 1 ? score * 100 : score
  const bandPct = intervalWidthPct != null && intervalWidthPct > 0
    ? intervalWidthPct / 200
    : 0.20 - (Math.max(0, Math.min(100, pct)) / 100) * 0.12
  return [value * (1 - bandPct), value * (1 + bandPct)]
}

// ─── Static map URL (proxied by the backend so the API key never leaks) ──────

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')

function buildStaticMapUrl(v: ValuationRecord): string {
  const comps = (v.comparables ?? [])
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => `${c.lat},${c.lng}`)
    .join(',')
  const url = new URL(`${API_BASE}/api/map-static`)
  url.searchParams.set('lat', String(v.lat))
  url.searchParams.set('lng', String(v.lng))
  url.searchParams.set('zoom', '13')
  if (comps) url.searchParams.set('comps', comps)
  return url.toString()
}

// Photos are served through the backend proxy (private storage bucket).
// The proxy handles both storage paths (new rows) and legacy public URLs.
function displayPhotoUrl(photo: ValuationPhoto): string {
  return `${API_BASE}/api/valuation-photos/${encodeURIComponent(photo.id)}/image`
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: '#1E293B', fontFamily: 'Helvetica' },
  header: { backgroundColor: PRIMARY, padding: 16, marginBottom: 14, borderRadius: 4 },
  headerEyebrow: { color: '#FFFFFF', opacity: 0.6, fontSize: 7, letterSpacing: 2, marginBottom: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#FFFFFF', opacity: 0.55, fontSize: 8, marginTop: 3 },
  headerMeta: { color: '#FFFFFF', fontSize: 9, marginTop: 8 },
  sectionTitle: { backgroundColor: PRIMARY, color: '#FFFFFF', fontSize: 9, fontFamily: 'Helvetica-Bold', padding: '5 10', marginTop: 12, marginBottom: 0, letterSpacing: 1 },
  card: { border: '1 solid #E2E8F0', borderTop: 'none' },
  row: { flexDirection: 'row', borderBottom: '1 solid #F1F5F9', padding: '4 10' },
  rowLabel: { width: '40%', color: '#64748B', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  rowValue: { width: '60%' },
  valueBig: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  waterLine: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '1 solid #F1F5F9', padding: '5 10' },
  waterFinal: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ECFDF5', padding: '8 10', marginTop: 4 },
  mono: { fontFamily: 'Helvetica-Bold' },
  sub: { color: MUTED, fontSize: 7, marginTop: 2 },
  disclaimer: { marginTop: 16, fontSize: 7, color: MUTED, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: MUTED, borderTop: '1 solid #E2E8F0', paddingTop: 6 },
})

function FichaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

export default function LaudoPDF({ valuation: v, mapImage }: { valuation: ValuationRecord; mapImage?: string | null }) {
  const laudoId = `ES-${v.id.slice(-6).toUpperCase()}`
  const laudoDate = new Date(v.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })
  const propertyLabel = PROPERTY_TYPE_LABELS[v.property_type] ?? v.property_type
  const hf = v.homogenization_factors
  const isPriorOnly = (v.comparables?.length ?? 0) === 0 && !!v.market_reference
  const priorBairro = v.market_reference?.neighborhood ?? ''
  const range = valueRange(
    v.static_market_value_brl ?? 0,
    v.confidence_score,
    v.confidence_diagnostics?.confidence_interval_width_pct,
  )

  const amenitiesByScope: Record<string, string[]> = {}
  for (const a of v.amenities ?? []) {
    const label = FRONT_CATALOG[a.item]?.label ?? a.item
    ;(amenitiesByScope[a.scope] ??= []).push(label)
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Letterhead */}
        <View style={s.header}>
          <Text style={s.headerEyebrow}>ESTUDO TÉCNICO DE AVALIAÇÃO — SUBSÍDIO PARA ELABORAÇÃO DE PTAM</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {v.organization?.logo_url ? (
              <Image
                src={v.organization.logo_url}
                style={{ height: 30, maxWidth: 110, objectFit: 'contain', borderRadius: 4 }}
              />
            ) : null}
            <View style={{ flex: 1, flexDirection: 'column', marginLeft: v.organization?.logo_url ? 10 : 0 }}>
              <Text style={s.headerTitle}>{v.organization?.name ?? 'AVALIA'}</Text>
              {v.organization && (
                <Text style={{ color: '#FFFFFF', opacity: 0.4, fontSize: 7, marginTop: 1 }}>
                  por meio da plataforma AVALIA
                </Text>
              )}
            </View>
          </View>
          <Text style={s.headerSub}>Metodologia referenciada na ABNT NBR 14.653 · resultado para análise do avaliador</Text>
          <Text style={s.headerMeta}>{laudoId} · {laudoDate}</Text>
          <Text style={s.headerMeta}>Imóvel: {v.address}</Text>
        </View>

        <View style={{ padding: 8, backgroundColor: '#FFFBEB', border: '1 solid #FDE68A', borderRadius: 3, marginBottom: 10 }}>
          <Text style={{ fontSize: 7, color: '#92400E', lineHeight: 1.5 }}>
            Natureza deste documento: este estudo foi gerado com dados de anúncios públicos. Não constitui
            PTAM/laudo legal — o valor depende de vistoria, análise crítica e julgamento do profissional habilitado.
          </Text>
        </View>

        {/* Localização — primeiro elemento pós-cabeçalho para preservar a
            leitura espacial do laudo e evitar uma quebra logo após o mapa. */}
        {v.lat != null && v.lng != null && (
          <View wrap={false}>
            <Text style={s.sectionTitle}>01a · LOCALIZAÇÃO E ENTORNO</Text>
            <View style={[s.card, { padding: 8 }]}>
              <Image
                src={mapImage ?? buildStaticMapUrl(v)}
                style={{ width: '100%', borderRadius: 3 }}
              />
              <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#111827' }} />
                  <Text style={{ fontSize: 7, color: MUTED }}>Imóvel avaliado</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#C9A227' }} />
                  <Text style={{ fontSize: 7, color: MUTED }}>Imóveis comparáveis</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                  <Text style={{ fontSize: 7, color: MUTED }}>Pontos de valorização (POIs)</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Ficha técnica */}
        <Text style={s.sectionTitle}>01 · FICHA TÉCNICA</Text>
          <View style={s.card}>
            <FichaRow label="Nº do Estudo" value={laudoId} />
          <FichaRow label="Tipo de Imóvel" value={propertyLabel} />
          <FichaRow label="Área construída" value={`${(v.area_construida_m2 ?? v.area_m2).toLocaleString('pt-BR')} m²`} />
          {v.area_terreno_m2 != null && <FichaRow label="Área do terreno" value={`${v.area_terreno_m2.toLocaleString('pt-BR')} m²`} />}
          {v.bedrooms != null && <FichaRow label="Quartos" value={String(v.bedrooms)} />}
          {v.bathrooms != null && <FichaRow label="Banheiros" value={String(v.bathrooms)} />}
          {v.parking_spaces != null && <FichaRow label="Vagas" value={String(v.parking_spaces)} />}
          <FichaRow label="Estado de Conservação" value={CONSERVATION_LABELS[v.conservation_state] ?? v.conservation_state} />
          {v.is_corner && <FichaRow label="Situação" value="Imóvel de Esquina" />}
            <FichaRow label="Metodologia" value="Método Comparativo Direto de Dados de Mercado — referência NBR 14.653" />
          {v.author && (
            <>
              <FichaRow label="Avaliador" value={v.author.full_name} />
              <FichaRow label="Registro" value={[v.author.creci && `CRECI ${v.author.creci}`, v.author.cnai && `CNAI ${v.author.cnai}`].filter(Boolean).join(' · ') || '—'} />
            </>
          )}
        </View>

        {/* Comodidades por escopo */}
        {(v.amenities?.length ?? 0) > 0 && (
          <>
            <Text style={s.sectionTitle}>01b · COMODIDADES POR ESCOPO</Text>
            <View style={s.card}>
              {(['interno', 'condo', 'proximo'] as const).map(sc =>
                amenitiesByScope[sc]?.length ? (
                  <View key={sc} style={s.row}>
                    <Text style={s.rowLabel}>{SCOPE_TITLES[sc]}</Text>
                    <Text style={s.rowValue}>{amenitiesByScope[sc].join(' · ')}</Text>
                  </View>
                ) : null
              )}
            </View>
          </>
        )}

        {/* Valor de mercado */}
        <Text style={s.sectionTitle}>02 · VALOR DE MERCADO INDICATIVO</Text>
        <View style={[s.card, { padding: 12 }]}> 
          <Text style={{ fontSize: 7, color: MUTED, letterSpacing: 1, marginBottom: 4 }}>VALOR CENTRAL DE REFERÊNCIA {isPriorOnly ? '(AVALIAÇÃO REFERENCIAL)' : '(MÉTODO COMPARATIVO)'}</Text>
          <Text style={s.valueBig}>{v.static_market_value_brl != null ? fmtBRL(v.static_market_value_brl) : '—'}</Text>
          {v.price_per_m2_homogenized != null && (
            <Text style={{ fontSize: 9, color: '#64748B', marginTop: 4 }}>
              {fmtPpm2(v.price_per_m2_homogenized)} · homogeneizado
            </Text>
          )}
          {range && (
            <View style={{ marginTop: 9, padding: 8, borderLeft: '2 solid #C9A227', backgroundColor: '#FEFCF5' }}>
              <Text style={{ fontSize: 7, color: '#92720A', letterSpacing: 1, marginBottom: 3 }}>FAIXA INDICATIVA DE MERCADO</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: PRIMARY }}>
                {fmtBRL(range[0])} – {fmtBRL(range[1])}
              </Text>
            </View>
          )}
          {!isPriorOnly && v.market_reference && v.homogenization_factors && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#F7F4EE', borderRadius: 3 }}>
              <Text style={{ fontSize: 7, color: '#475569', fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 3 }}>
                COMPOSIÇÃO DO VALOR (A → B → RESULTADO)
              </Text>
              <Text style={{ fontSize: 7, color: '#64748B', lineHeight: 1.5 }}>
                A · Base dos comparáveis: {fmtBRL(v.homogenization_factors.market_value)} · {' '}
                B · Referência do bairro ({v.market_reference.neighborhood}):{' '}
                {fmtBRL(v.market_reference.price_per_m2 * v.homogenization_factors.area_m2)} · peso no resultado {Math.round(v.market_reference.blend_weight * 100)}% →{' '}
                Resultado: {fmtBRL(v.static_market_value_brl ?? 0)}
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 8, color: '#64748B', lineHeight: 1.5, marginTop: 8 }}>
            O valor central é o resultado do cálculo; a faixa mostra o espaço de interpretação da amostra.
            Use ambos junto ao imóvel, ao mercado local e à negociação.
          </Text>
          {v.confidence_diagnostics && (
            <Text style={{ fontSize: 7, color: MUTED, marginTop: 5 }}>
              {v.confidence_diagnostics.sample_size} comparáveis usados · {v.confidence_diagnostics.displayed_sample_size} principais exibidos · amostra efetiva {v.confidence_diagnostics.effective_sample_size}
            </Text>
          )}
        </View>

        <Text style={s.sectionTitle}>02a · COMO USAR ESTE ESTUDO</Text>
        <View style={s.card}>
          {[
            ['01', 'Vistoria e confirmação visual', 'Confirme no imóvel as características usadas no cálculo e registre o relatório fotográfico.'],
            ['02', 'Validação dos comparáveis', 'Revise os anúncios selecionados e descarte os que não refletem o mercado local.'],
            ['03', 'Ajustes pelo seu julgamento', 'Aplique os fatores de homogeneização necessários com base na sua análise crítica.'],
            ['04', 'Conclusão do PTAM', 'Estruture o parecer final com a identificação profissional aplicável e assuma a responsabilidade técnica.'],
          ].map(([number, title, description]) => (
            <View key={number} style={s.row}>
              <Text style={{ width: '8%', color: ACCENT, fontFamily: 'Helvetica-Bold' }}>{number}</Text>
              <View style={{ width: '92%' }}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{title}</Text>
                <Text style={s.sub}>{description}</Text>
              </View>
            </View>
          ))}
          <View style={{ padding: '8 10', backgroundColor: '#FEFCF5' }}>
            <Text style={{ fontSize: 7, color: '#64748B', lineHeight: 1.5 }}>
              Este estudo adianta a pesquisa e os cálculos; a conclusão do valor é responsabilidade do avaliador habilitado.
            </Text>
          </View>
        </View>

        {/* Enquadramento NBR (resumo técnico-informativo) */}
        {(() => {
          const enc = enquadrar(v)
          if (!enc) return null
          return (
            <>
              <Text style={s.sectionTitle}>02d · ENQUADRAMENTO NBR 14653-2</Text>
              <View style={s.card}>
                <View style={s.row}>
                  <Text style={s.rowLabel}>Grau (itens principais da Tabela 1)</Text>
                  <Text style={[s.rowValue, { fontFamily: 'Helvetica-Bold' }]}>
                    {enc.grau === 3 ? 'Grau III' : enc.grau === 2 ? 'Grau II' : enc.grau === 1 ? 'Grau I' : '—'}
                  </Text>
                </View>
                <View style={s.row}>
                  <Text style={s.rowLabel}>Precisão (IC 80%)</Text>
                  <Text style={s.rowValue}>{enc.precisaoPct != null ? `${enc.precisaoPct.toLocaleString('pt-BR')}% do valor` : '—'}</Text>
                </View>
                <View style={[s.row, { borderBottom: 'none' }]}>
                  <Text style={s.rowLabel}>Itens avaliados</Text>
                  <Text style={s.rowValue}>
                    {enc.items.map((i) => `${i.met ? '✓' : '–'} ${i.label}`).join(' · ')}
                  </Text>
                </View>
                <View style={{ padding: '6 10', backgroundColor: '#F8FAFC' }}>
                  <Text style={{ fontSize: 7, color: MUTED, lineHeight: 1.5 }}>
                    Enquadramento técnico-informativo; classificação oficial é do avaliador habilitado.
                  </Text>
                </View>
              </View>
            </>
          )
        })()}

        {/* Fundamentação referencial (prior-only) */}
        {isPriorOnly && v.market_reference && (
          <>
            <Text style={s.sectionTitle}>02c · ÂNCORA LOCAL — AVALIAÇÃO REFERENCIAL</Text>
            <View style={s.card}>
              <View style={{ padding: 10 }}>
                <Text style={{ fontSize: 8, color: '#92400E', fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
                  AVALIAÇÃO REFERENCIAL
                </Text>
                <Text style={{ fontSize: 8, lineHeight: 1.6, color: '#1E293B' }}>
                  No momento desta avaliação não havia um conjunto mínimo de anúncios comparáveis da
                  mesma tipologia no bairro {priorBairro}. Para fundamentar o valor, foi utilizado o
                  preço médio verificado do metro quadrado para {propertyLabel}s no bairro, levantado
                  em pesquisa de mercado verificada de 2025/2026.
                </Text>
                <Text style={{ fontSize: 8, lineHeight: 1.5, color: '#64748B', marginTop: 6 }}>
                  Esta é uma referência independente do bairro, usada na ausência de uma amostra direta mínima.
                  Não representa um segundo valor do imóvel.
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 8, borderTop: '1 solid #F1F5F9', paddingTop: 8 }}>
                  <View style={{ width: '40%' }}>
                    <Text style={s.sub}>R$/m² verificado no bairro</Text>
                    <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: PRIMARY }}>{fmtPpm2(v.market_reference.raw_price_per_m2)}</Text>
                  </View>
                  <View style={{ width: '35%' }}>
                    <Text style={s.sub}>Bairro de referência</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{v.market_reference.neighborhood}</Text>
                  </View>
                  <View style={{ width: '25%' }}>
                    <Text style={s.sub}>Peso no resultado</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: PRIMARY }}>{Math.round(v.market_reference.blend_weight * 100)}%</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 7, color: MUTED, lineHeight: 1.5, marginTop: 8 }}>
                  Nota metodológica: o R$/m² de referência foi obtido por curadoria especializada —
                  pesquisa de mercado conduzida por especialistas com apoio de ferramentas de IA e
                  validação técnica, conferindo grau de confiabilidade próprio à referência. A
                  determinação segue os princípios da ABNT NBR 14.653; com a coleta de novos anúncios
                  comparáveis da tipologia e bairro, esta avaliação poderá ser atualizada para o
                  enquadramento pleno do Método Comparativo Direto de Dados de Mercado.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Memória de cálculo */}
        {hf && !isPriorOnly && (
          <>
            <Text style={s.sectionTitle}>02b · BASE COMPARÁVEL HOMOGENEIZADA</Text>
            <View style={s.card}>
              <View style={{ padding: '8 10', backgroundColor: '#F8FAFC' }}>
                <Text style={{ fontSize: 8, color: '#64748B', lineHeight: 1.5 }}>
                  Esta etapa mostra a base técnica formada pelos comparáveis e os ajustes do imóvel.
                  Ela é um resultado intermediário, não um segundo valor final de mercado.
                </Text>
              </View>
              <View style={s.waterLine}>
                <View>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Valor unitário de mercado (ensemble)</Text>
                  <Text style={s.sub}>Comparáveis já ajustados por oferta (−{Math.round((1 - hf.offer_factor) * 100)}%) e tipologia.</Text>
                </View>
                <Text style={[s.mono, { color: PRIMARY }]}>{fmtPpm2(hf.ensemble_ppm2)}</Text>
              </View>
              <View style={s.waterLine}>
                <View>
                  <Text>Fatores físicos</Text>
                  <Text style={s.sub}>Esquina {hf.corner_factor.toFixed(2)} · Topografia {hf.slope_factor.toFixed(2)} · Nível {hf.level_factor.toFixed(2)}</Text>
                </View>
                <Text style={[s.mono, { color: hf.physical_factor === 1 ? MUTED : ACCENT }]}>{fmtMult(hf.physical_factor)}</Text>
              </View>
              <View style={s.waterLine}>
                <View>
                  <Text>Comodidades por escopo</Text>
                  <Text style={s.sub}>Interno {hf.amenity_internal.toFixed(2)} · Condomínio {hf.amenity_condo.toFixed(2)} · Entorno {hf.amenity_proximo.toFixed(2)}</Text>
                </View>
                <Text style={[s.mono, { color: hf.amenity_factor === 1 ? MUTED : ACCENT }]}>{fmtMult(hf.amenity_factor)}</Text>
              </View>
              <View style={s.waterLine}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>R$/m² homogeneizado  ×  {hf.area_m2.toLocaleString('pt-BR')} m²</Text>
                <Text style={[s.mono, { color: PRIMARY }]}>{fmtPpm2(hf.ppm2_homogenized)}</Text>
              </View>
              <View style={s.waterFinal}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#92720A' }}>RESULTADO DA BASE COMPARÁVEL</Text>
                <Text style={[s.mono, { color: ACCENT, fontSize: 12 }]}>{fmtBRL(hf.market_value)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Referência de mercado verificada (blend com amostra de comparáveis) */}
        {!isPriorOnly && v.market_reference && (
          <>
            <Text style={s.sectionTitle}>02c · ÂNCORA LOCAL E COMPOSIÇÃO DO RESULTADO</Text>
            <View style={s.card}>
              <View style={{ padding: '8 10', backgroundColor: '#FEFCF5', borderBottom: '1 solid #E8D99A' }}>
                <Text style={{ fontSize: 8, color: '#64748B', lineHeight: 1.5 }}>
                  A 02b mostra a base calculada pelos comparáveis. Esta referência independente do bairro
                  funciona como âncora local quando a amostra direta é fraca ou pouco representativa;
                  ela não é um segundo valor do imóvel.
                </Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>Referência independente · R$/m² do bairro {v.market_reference.neighborhood}</Text>
                <Text style={[s.rowValue, { fontFamily: 'Helvetica-Bold', color: PRIMARY }]}>
                  {fmtPpm2(v.market_reference.price_per_m2)}
                  <Text style={{ color: MUTED, fontFamily: 'Helvetica', fontSize: 7 }}>
                    {' '}(anúncio: {fmtPpm2(v.market_reference.raw_price_per_m2)})
                  </Text>
                </Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>Peso desta âncora no resultado</Text>
                <Text style={s.rowValue}>{Math.round(v.market_reference.blend_weight * 100)}%</Text>
              </View>
              <View style={s.row}>
                <Text style={s.rowLabel}>Qualidade dos comparáveis diretos</Text>
                <Text style={s.rowValue}>{Math.round(v.market_reference.sample_quality * 100)}%</Text>
              </View>
              <View style={[s.row, { borderBottom: 'none' }]}>
                <Text style={s.rowLabel}>Origem</Text>
                <Text style={s.rowValue}>
                  Curadoria especializada — pesquisa de especialistas com apoio de IA, dados 2025/2026
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Comparáveis */}
        {(v.comparables?.length ?? 0) > 0 && !isPriorOnly && (
          <>
            <Text style={s.sectionTitle}>03 · IMÓVEIS REFERENCIAIS HOMOGENEIZADOS</Text>
            <View style={s.card}>
              {v.comparables!.map((c, i) => (
                <View key={i} style={s.row}>
                  <Text style={{ width: '50%' }}>{c.neighborhood} — {c.address}</Text>
                  <Text style={{ width: '20%', textAlign: 'right' }}>{c.area_m2}m²</Text>
                  <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>{fmtBRL(c.price_brl)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Análise de vizinhança — POIs por categoria */}
        {v.neighborhood_pois && v.neighborhood_pois.pois.length > 0 && (
          <>
            <Text style={s.sectionTitle}>04 · ANÁLISE DE VIZINHANÇA E INFRAESTRUTURA URBANA</Text>
            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.rowLabel}>Score de Vizinhança</Text>
                <Text style={[s.rowValue, { fontFamily: 'Helvetica-Bold', color: PRIMARY }]}>
                  {Math.round(v.neighborhood_pois.totalScore * 100)}%
                </Text>
              </View>
              <View style={s.row}>
                <Text style={{ width: '30%', color: '#64748B', fontFamily: 'Helvetica-Bold', fontSize: 8 }}>Serviço / Equipamento</Text>
                <Text style={{ width: '12%', textAlign: 'center', color: '#64748B', fontFamily: 'Helvetica-Bold', fontSize: 8 }}>Qtd.</Text>
                <Text style={{ width: '20%', textAlign: 'center', color: '#64748B', fontFamily: 'Helvetica-Bold', fontSize: 8 }}>Dist. mínima</Text>
                <Text style={{ width: '38%', color: '#64748B', fontFamily: 'Helvetica-Bold', fontSize: 8 }}>Estabelecimentos</Text>
              </View>
              {v.neighborhood_pois.pois.map((cat, i) => {
                const minDist = cat.places.length > 0 ? Math.min(...cat.places.map((p) => p.distance_m)) : null
                const names = cat.places.slice(0, 3).map((p) => p.name).join(', ')
                return (
                  <View key={i} style={[s.row, { backgroundColor: i % 2 === 0 ? undefined : '#FAFAFA' }]}>
                    <Text style={{ width: '30%', fontSize: 8 }}>{cat.label}</Text>
                    <Text style={{ width: '12%', textAlign: 'center', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{cat.places.length}</Text>
                    <Text style={{ width: '20%', textAlign: 'center', fontSize: 8 }}>
                      {minDist != null ? `${minDist}m` : '—'}
                    </Text>
                    <Text style={{ width: '38%', fontSize: 7, color: MUTED }}>{names || 'Não encontrado'}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Documentação fotográfica por cômodo */}
        {(v.photos?.length ?? 0) > 0 && (
          <>
            <Text style={s.sectionTitle}>04 · DOCUMENTAÇÃO FOTOGRÁFICA</Text>
            {groupPhotosByRoom(v.photos!).map(([room, photos], gi) => (
              <View key={gi} style={[s.card, { marginTop: 8, padding: 8 }]}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569', marginBottom: 6 }}>
                  {room} <Text style={{ color: MUTED, fontFamily: 'Helvetica' }}>({photos.length} foto{photos.length !== 1 ? 's' : ''})</Text>
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {photos.map((p) => (
                    <Image key={p.id} src={displayPhotoUrl(p)} style={{ width: 140, borderRadius: 3 }} />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={s.disclaimer}>
           Aviso Legal: Este estudo foi gerado com base em dados públicos
           de oferta e transação imobiliária. Os valores têm caráter informativo e não substituem PTAM nem laudo técnico
           final elaborado e assinado pelo profissional habilitado responsável, conforme a finalidade e o conselho profissional aplicáveis.
        </Text>

        <View style={s.footer} fixed>
          <Text>AVALIA · {laudoId}</Text>
          <Text render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
