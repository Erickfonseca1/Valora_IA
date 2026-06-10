import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ValuationRecord } from '../types'
import { FRONT_CATALOG } from '../amenities'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'
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

export default function LaudoPDF({ valuation: v }: { valuation: ValuationRecord }) {
  const laudoId = `PTAM-${v.id.slice(-6).toUpperCase()}`
  const laudoDate = new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const propertyLabel = PROPERTY_TYPE_LABELS[v.property_type] ?? v.property_type
  const hf = v.homogenization_factors

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
          <Text style={s.headerEyebrow}>PARECER TÉCNICO DE AVALIAÇÃO MERCADOLÓGICA</Text>
          <Text style={s.headerTitle}>ValoraIA</Text>
          <Text style={s.headerSub}>Avaliação por Inteligência Artificial · Conforme ABNT NBR 14.653</Text>
          <Text style={s.headerMeta}>{laudoId} · {laudoDate}</Text>
          <Text style={s.headerMeta}>Imóvel: {v.address}</Text>
        </View>

        {/* Ficha técnica */}
        <Text style={s.sectionTitle}>01 · FICHA TÉCNICA</Text>
        <View style={s.card}>
          <FichaRow label="Nº do Laudo" value={laudoId} />
          <FichaRow label="Tipo de Imóvel" value={propertyLabel} />
          <FichaRow label="Área" value={`${v.area_m2.toLocaleString('pt-BR')} m²`} />
          {v.bedrooms != null && <FichaRow label="Quartos" value={String(v.bedrooms)} />}
          {v.bathrooms != null && <FichaRow label="Banheiros" value={String(v.bathrooms)} />}
          {v.parking_spaces != null && <FichaRow label="Vagas" value={String(v.parking_spaces)} />}
          <FichaRow label="Estado de Conservação" value={CONSERVATION_LABELS[v.conservation_state] ?? v.conservation_state} />
          {v.is_corner && <FichaRow label="Situação" value="Imóvel de Esquina" />}
          <FichaRow label="Metodologia" value="Método Comparativo Direto de Dados de Mercado — NBR 14.653" />
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
        <Text style={s.sectionTitle}>02 · VALOR DE MERCADO DETERMINADO</Text>
        <View style={[s.card, { padding: 12 }]}>
          <Text style={{ fontSize: 7, color: MUTED, letterSpacing: 1, marginBottom: 4 }}>VALOR DE MERCADO (MÉTODO COMPARATIVO)</Text>
          <Text style={s.valueBig}>{v.static_market_value_brl != null ? fmtBRL(v.static_market_value_brl) : '—'}</Text>
          {v.price_per_m2_homogenized != null && (
            <Text style={{ fontSize: 9, color: '#64748B', marginTop: 4 }}>
              {fmtPpm2(v.price_per_m2_homogenized)} · homogeneizado · Confiança {v.confidence_score ?? 0}%
            </Text>
          )}
        </View>

        {/* Memória de cálculo */}
        {hf && (
          <>
            <Text style={s.sectionTitle}>02b · COMO CHEGAMOS A ESTE VALOR</Text>
            <View style={s.card}>
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
                <Text style={{ fontFamily: 'Helvetica-Bold', color: '#15803D' }}>VALOR DE MERCADO</Text>
                <Text style={[s.mono, { color: ACCENT, fontSize: 12 }]}>{fmtBRL(hf.market_value)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Comparáveis */}
        {(v.comparables?.length ?? 0) > 0 && (
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

        <Text style={s.disclaimer}>
          Aviso Legal: Este parecer foi gerado por sistema de inteligência artificial com base em dados públicos
          de oferta e transação imobiliária. Os valores têm caráter informativo e não substituem laudo de avaliação
          assinado por profissional habilitado pelo IBAPE/CONFEA, conforme NBR 14.653-1.
        </Text>

        <View style={s.footer} fixed>
          <Text>ValoraIA · {laudoId}</Text>
          <Text render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
