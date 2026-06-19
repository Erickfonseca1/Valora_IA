// ValoraIA_front/src/components/ExtractionCard.tsx

import type { ExtractionResult, PropertyType, ConservationState, TerrainSlope, StreetLevel } from '../types'
import { FRONT_CATALOG } from '../amenities'

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

interface Props {
  result: ExtractionResult
  onUse: () => void
  onRedo: () => void
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.75) {
    return { label: 'Alta', bg: '#D1FAE5', color: '#065F46' }
  }
  if (confidence >= 0.5) {
    return { label: 'Média', bg: '#FEF3C7', color: '#92400E' }
  }
  return { label: 'Baixa', bg: '#F1F5F9', color: '#475569' }
}

const FIELD_LABELS: Record<string, string> = {
  address: 'Endereço',
  property_type: 'Tipo',
  area_m2: 'Área (m²)',
  bedrooms: 'Quartos',
  bathrooms: 'Banheiros',
  parking_spaces: 'Vagas',
  construction_age: 'Idade (anos)',
  conservation_state: 'Conservação',
  terrain_slope: 'Topografia',
  street_level: 'Nível de rua',
  is_corner: 'Esquina',
  in_gated_community: 'Em condomínio fechado',
}

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
}

const CONSERVATION_LABELS: Record<ConservationState, string> = {
  novo: 'Novo',
  entre_novo_e_regular: 'Entre novo e regular',
  regular: 'Regular',
  reparos_simples: 'Reparos simples',
  reparos_importantes: 'Reparos importantes',
  critico: 'Crítico',
}

const SLOPE_LABELS: Record<TerrainSlope, string> = {
  plano: 'Plano',
  aclive_leve: 'Aclive leve',
  declive_leve: 'Declive leve',
  aclive_acentuado: 'Aclive acentuado',
  declive_acentuado: 'Declive acentuado',
}

const STREET_LABELS: Record<StreetLevel, string> = {
  no_nivel: 'No nível',
  abaixo_nivel: 'Abaixo do nível',
  acima_nivel: 'Acima do nível',
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (key === 'property_type') return PROPERTY_TYPE_LABELS[value as PropertyType] ?? String(value)
  if (key === 'conservation_state') return CONSERVATION_LABELS[value as ConservationState] ?? String(value)
  if (key === 'terrain_slope') return SLOPE_LABELS[value as TerrainSlope] ?? String(value)
  if (key === 'street_level') return STREET_LABELS[value as StreetLevel] ?? String(value)
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return String(value)
}

export default function ExtractionCard({ result, onUse, onRedo }: Props) {
  const extractedEntries = Object.entries(result.fields).filter(
    ([, field]) => field && field.value != null
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="p-4 rounded-xl" style={{ background: PRIMARY + '08', border: `1px solid ${PRIMARY}22` }}>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: PRIMARY, fontSize: 16 }}>✦</span>
          <span className="text-sm font-semibold" style={{ color: PRIMARY }}>Resumo da IA</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
      </div>

      {/* Extracted fields */}
      {extractedEntries.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Campos extraídos
          </h4>
          <div className="flex flex-col gap-2">
            {extractedEntries.map(([key, field]) => {
              if (!field) return null
              const badge = confidenceBadge(field.confidence)
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {FIELD_LABELS[key] ?? key}
                    </span>
                    <span className="text-sm text-slate-900">
                      {formatValue(key, field.value)}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Amenities */}
      {result.amenities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Comodidades detectadas
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.amenities.map(a => (
              <span
                key={a.item}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: ACCENT + '15', color: ACCENT, border: `1px solid ${ACCENT}33` }}
              >
                {FRONT_CATALOG[a.item]?.label ?? a.item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <div
          className="p-3 rounded-lg"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="text-xs font-semibold text-amber-700 mb-1">
            Faltou informar:
          </div>
          <div className="text-sm text-amber-800">
            {result.gaps.map(g => FIELD_LABELS[g] ?? g).join(', ')}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onUse}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer"
          style={{ background: PRIMARY, fontFamily: 'inherit' }}
        >
          Usar e revisar
        </button>
        <button
          onClick={onRedo}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 cursor-pointer"
          style={{ fontFamily: 'inherit' }}
        >
          Regravar
        </button>
      </div>
    </div>
  )
}
