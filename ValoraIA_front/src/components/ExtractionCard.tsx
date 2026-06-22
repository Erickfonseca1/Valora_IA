import { useState, useRef } from 'react'
import type { ExtractionResult, PropertyType, ConservationState, TerrainSlope, StreetLevel } from '../types'
import { FRONT_CATALOG } from '../amenities'
import { extractProperty } from '../api'

const NAVY = '#111827'
const GOLD = '#C9A227'

interface Props {
  result: ExtractionResult
  onUse: (gapFills: Record<string, string>) => void
  onRedo: () => void
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.75) return { label: 'Alta', bg: '#FEFCF5', color: '#92720A' }
  if (confidence >= 0.5) return { label: 'Média', bg: '#FFFBEB', color: '#92400E' }
  return { label: 'Baixa', bg: '#F1F5F9', color: '#475569' }
}

const FIELD_LABELS: Record<string, string> = {
  address: 'Endereço',
  property_type: 'Tipo de imóvel',
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

// ── SVG Icons ────────────────────────────────────────────────────────────────

function MicIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function StopIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

function SpinnerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spinner{animation:spin .8s linear infinite; transform-origin:center}`}</style>
      <g className="spinner">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </g>
    </svg>
  )
}

// ── Per-field input with inline audio recording ───────────────────────────────

type FieldState = 'idle' | 'recording' | 'processing'

function GapFieldInput({
  gap,
  value,
  onChange,
}: {
  gap: string
  value: string
  onChange: (v: string) => void
}) {
  const [fieldState, setFieldState] = useState<FieldState>('idle')
  const [audioError, setAudioError] = useState<string | null>(null)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    setAudioError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType })
      mrRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setFieldState('processing')
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType })
          const result = await extractProperty(blob)
          const extracted = result.fields[gap as keyof typeof result.fields]
          if (extracted?.value != null) {
            onChange(String(extracted.value))
          } else {
            setAudioError('Não identifiquei esse campo no áudio. Preencha manualmente.')
          }
        } catch {
          setAudioError('Erro ao processar áudio. Tente novamente.')
        } finally {
          setFieldState('idle')
        }
      }
      mr.start()
      setFieldState('recording')
    } catch {
      setAudioError('Microfone não disponível. Preencha manualmente.')
    }
  }

  const stopRecording = () => {
    mrRef.current?.stop()
    mrRef.current = null
  }

  const isRecording = fieldState === 'recording'
  const isProcessing = fieldState === 'processing'

  const inputBase = {
    className: 'flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-all',
    style: {
      fontFamily: 'inherit',
      borderColor: isRecording ? '#EF4444' : '#FCD34D',
      boxShadow: isRecording ? '0 0 0 2px #FEE2E2' : undefined,
    } as React.CSSProperties,
    disabled: isProcessing,
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-800 tracking-wide uppercase">
        {FIELD_LABELS[gap] ?? gap}
      </label>

      {gap === 'property_type' ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={isProcessing}
          className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none"
          style={{ fontFamily: 'inherit', borderColor: '#FCD34D' }}
        >
          <option value="">Selecionar tipo</option>
          <option value="apartment">Apartamento</option>
          <option value="house">Casa</option>
          <option value="commercial">Comercial</option>
          <option value="land">Terreno</option>
        </select>
      ) : (
        <div className="flex items-center gap-2">
          {gap === 'area_m2' ? (
            <>
              <input
                type="number"
                min={1}
                placeholder="Ex: 140"
                value={value}
                onChange={e => onChange(e.target.value)}
                {...inputBase}
              />
              <span className="text-xs text-amber-700 font-semibold shrink-0">m²</span>
            </>
          ) : (
            <input
              type="text"
              placeholder={gap === 'address' ? 'Rua, número, bairro, cidade' : ''}
              value={value}
              onChange={e => onChange(e.target.value)}
              {...inputBase}
            />
          )}

          {/* Mic / Stop / Spinner button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            title={isRecording ? 'Parar gravação' : 'Ditar este campo'}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer transition-all duration-200"
            style={{
              background: isRecording ? '#EF4444' : '#FEF3C7',
              color: isRecording ? 'white' : '#92400E',
              opacity: isProcessing ? 0.6 : 1,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              boxShadow: isRecording ? '0 0 0 3px #FEE2E2' : undefined,
            }}
          >
            {isProcessing
              ? <SpinnerIcon />
              : isRecording
                ? <StopIcon />
                : <MicIcon />
            }
          </button>
        </div>
      )}

      {audioError && (
        <p className="text-xs text-red-600">{audioError}</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExtractionCard({ result, onUse, onRedo }: Props) {
  const [gapValues, setGapValues] = useState<Record<string, string>>({})

  const setGap = (key: string, val: string) =>
    setGapValues(v => ({ ...v, [key]: val }))

  const extractedEntries = Object.entries(result.fields).filter(
    ([, field]) => field && field.value != null
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="p-4 rounded-xl" style={{ background: '#F7F4EE', border: '1px solid #E8E0CF' }}>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: GOLD, fontSize: 16 }}>✦</span>
          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Resumo da IA</span>
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
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{
                    background: '#FEFCF5',
                    borderLeft: '2px solid #C9A227',
                  }}
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
                style={{ background: '#FEFCF5', color: '#92720A', border: '1px solid #E8D99A' }}
              >
                {FRONT_CATALOG[a.item]?.label ?? a.item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gaps — inline per-field inputs */}
      {result.gaps.length > 0 && (
        <div
          className="p-4 rounded-xl flex flex-col gap-4"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Completar campos obrigatórios</p>
              <p className="text-xs text-amber-600 mt-0.5">Digite ou dite cada campo individualmente</p>
            </div>
          </div>

          {result.gaps.map(gap => (
            <GapFieldInput
              key={gap}
              gap={gap}
              value={gapValues[gap] ?? ''}
              onChange={v => setGap(gap, v)}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onUse(gapValues)}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer"
          style={{ background: NAVY, fontFamily: 'inherit' }}
        >
          Usar e revisar
        </button>
        <button
          onClick={onRedo}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 cursor-pointer"
          style={{ fontFamily: 'inherit' }}
        >
          <MicIcon size={14} />
          Regravar
        </button>
      </div>
    </div>
  )
}
