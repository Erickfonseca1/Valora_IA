import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ValuationForm, PropertyType } from '../types'
import type { ConservationState, TerrainSlope, StreetLevel } from '../types'
import { createValuation, uploadPhotos, analyzePhotos } from '../api'

const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'Apartamento', value: 'apartment' },
  { label: 'Casa', value: 'house' },
  { label: 'Comercial', value: 'commercial' },
  { label: 'Terreno', value: 'land' },
]

const APARTMENT_AMENITIES = [
  'Piscina', 'Rooftop', 'Vista Mar', 'Cobertura',
  'Academia', 'Portaria 24h', 'Portaria', 'Segurança 24h', 'Elevador', 'Salão de Festas', 'Área Gourmet',
  'Varanda', 'Sacada', 'Churrasqueira', 'Playground', 'Salão de Jogos',
  'Espaço Kids', 'Coworking', 'Quadra', 'Quadra Esportiva',
  'Portão eletrônico', 'Interfone', 'Câmeras de segurança',
  'Área de serviço', 'Armários planejados', 'Ar condicionado', 'Pet friendly',
]

const HOUSE_AMENITIES = [
  'Piscina', 'Quintal', 'Jardim', 'Lareira',
  'Academia', 'Salão de Festas', 'Área Gourmet',
  'Varanda', 'Sacada', 'Churrasqueira', 'Playground',
  'Quadra', 'Quadra Esportiva',
  'Portão eletrônico', 'Interfone', 'Câmeras de segurança',
  'Área de serviço', 'Armários planejados', 'Ar condicionado', 'Pet friendly',
]

const AMENITIES_BY_TYPE: Record<PropertyType, string[]> = {
  apartment: APARTMENT_AMENITIES,
  house: HOUSE_AMENITIES,
  commercial: [],
  land: [],
}

// Steps for apartment/house (4 steps)
const STEPS_APT_HOUSE = ['Detalhes do Imóvel', 'Conservação & Fotos', 'Comodidades', 'Revisão & Envio']
// Steps for commercial/land (3 steps)
const STEPS_OTHER = ['Detalhes do Imóvel', 'Conservação & Fotos', 'Revisão & Envio']

const STEPS_BY_TYPE: Record<PropertyType, string[]> = {
  apartment: STEPS_APT_HOUSE,
  house: STEPS_APT_HOUSE,
  commercial: STEPS_OTHER,
  land: STEPS_OTHER,
}

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

function SkeletonStep({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDone(true), delay + 800)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white transition-all duration-300"
        style={{ background: done ? ACCENT : '#E2E8F0' }}
      >
        {done ? '✓' : ''}
      </div>
      <span
        className="text-sm transition-all duration-300"
        style={{ color: done ? '#0F172A' : '#94A3B8', fontWeight: done ? 500 : 400 }}
      >
        {label}
      </span>
    </div>
  )
}

const ROOM_FIELDS = {
  apartment: { beds: true, baths: true, parking: true },
  house: { beds: true, baths: true, parking: true },
  commercial: { beds: false, baths: true, parking: true },
  land: { beds: false, baths: false, parking: false },
} as const satisfies Record<PropertyType, { beds: boolean; baths: boolean; parking: boolean }>

const DEFAULT_ROOMS = { beds: '2', baths: '1', parking: '1' }

export default function ValuationFlow() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ValuationForm>({
    address: '',
    propertyType: 'apartment',
    beds: '2',
    baths: '1',
    parking: '1',
    area: '',
    amenities: [],
    construction_age: '',
    conservation_state: '' as ConservationState | '',
    is_corner: false,
    terrain_slope: '' as TerrainSlope | '',
    street_level: '' as StreetLevel | '',
    photos: [] as File[],
    photoUrls: [] as string[],
  })
  const [processing, setProcessing] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const showBeds = ROOM_FIELDS[form.propertyType].beds
  const showBaths = ROOM_FIELDS[form.propertyType].baths
  const showParking = ROOM_FIELDS[form.propertyType].parking

  const set = <K extends keyof ValuationForm>(k: K, v: ValuationForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handlePropertyTypeChange = (value: PropertyType) => {
    setForm(f => {
      const fields = ROOM_FIELDS[value]
      return {
        ...f,
        propertyType: value,
        beds: fields.beds ? (f.beds || DEFAULT_ROOMS.beds) : '',
        baths: fields.baths ? (f.baths || DEFAULT_ROOMS.baths) : '',
        parking: fields.parking ? (f.parking || DEFAULT_ROOMS.parking) : '',
        amenities: value === 'commercial' || value === 'land' ? [] : f.amenities,
      }
    })
    setStep(s => Math.min(s, STEPS_BY_TYPE[value].length - 1))
  }

  const toggleAmenity = (a: string) =>
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter(x => x !== a)
        : [...f.amenities, a],
    }))

  const advanceFromPhotoStep = async () => {
    if (form.photos.length === 0) {
      setStep(s => s + 1)
      return
    }
    setPhotoUploading(true)
    try {
      const { urls } = await uploadPhotos(form.photos)
      setForm(f => ({ ...f, photoUrls: urls }))

      // If conservation state not already set, try AI analysis (non-fatal)
      if (!form.conservation_state) {
        try {
          const analysis = await analyzePhotos(urls)
          if (analysis.estado_conservacao_sugerido) {
            setForm(f => ({ ...f, conservation_state: analysis.estado_conservacao_sugerido }))
          }
        } catch {
          // non-fatal — analysis failure doesn't block the flow
        }
      }

      setStep(s => s + 1)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Erro ao enviar fotos')
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleSubmit = async () => {
    setProcessing(true)
    setApiError(null)
    try {
      const bedsNum = showBeds ? (parseInt(form.beds) || null) : null
      const bathsNum = showBaths ? (parseInt(form.baths) || null) : null
      const parkingNum = showParking ? (parseInt(form.parking) || null) : null

      const result = await createValuation({
        address: form.address,
        property_type: form.propertyType,
        area_m2: parseFloat(form.area),
        bedrooms: bedsNum,
        bathrooms: bathsNum,
        parking_spots: parkingNum,
        amenities: form.amenities.length > 0 ? form.amenities : undefined,
        construction_age: form.construction_age ? parseInt(form.construction_age) : undefined,
        conservation_state: form.conservation_state || undefined,
        is_corner: form.is_corner || undefined,
        terrain_slope: (form.terrain_slope || undefined) as TerrainSlope | undefined,
        street_level: (form.street_level || undefined) as StreetLevel | undefined,
        property_photos: form.photoUrls.length > 0 ? form.photoUrls : undefined,
      })
      navigate(`/resultado/${result.id}`)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Erro desconhecido')
      setProcessing(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none bg-white transition-colors focus:border-primary'

  const pillStyle = (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: 20,
    border: `1.5px solid ${active ? PRIMARY : '#E2E8F0'}`,
    background: active ? PRIMARY + '0D' : '#fff',
    color: active ? PRIMARY : '#64748B',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  })

  const steps = STEPS_BY_TYPE[form.propertyType]
  const maxStep = steps.length - 1

  // For apt/house: 0=Details, 1=Conservação&Fotos, 2=Amenities, 3=Review
  // For commercial/land: 0=Details, 1=Conservação&Fotos, 2=Review
  const isAmenitiesStep = (form.propertyType === 'apartment' || form.propertyType === 'house') && step === 2
  const isReviewStep = step === maxStep

  const canAdvance = step === 0
    ? form.address.trim().length > 0 && form.area.trim().length > 0 && parseFloat(form.area) > 0
    : true

  const handleContinue = () => {
    if (step === 1) {
      advanceFromPhotoStep()
    } else if (step < maxStep) {
      setStep(s => s + 1)
    } else {
      handleSubmit()
    }
  }

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold m-0 text-slate-900">Nova Avaliação</h1>
        <p className="text-sm text-slate-500 mt-1">Insira os detalhes do imóvel e deixe a IA determinar o preço ideal.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex-1">
            <div
              className="h-[3px] rounded-sm mb-2 transition-all duration-300"
              style={{ background: i <= step ? PRIMARY : '#E2E8F0' }}
            />
            <span
              className="text-[11px] uppercase tracking-wide"
              style={{
                fontWeight: i === step ? 600 : 400,
                color: i <= step ? PRIMARY : '#94A3B8',
              }}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-7 min-h-[320px]">
        {processing ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] gap-4">
            <div
              className="w-12 h-12 rounded-full border-[3px] border-slate-200 animate-spin"
              style={{ borderTopColor: PRIMARY }}
            />
            <div className="text-base font-semibold text-slate-900">A IA está analisando o imóvel...</div>
            <div className="text-sm text-slate-500">Comparando com transações recentes na região</div>
            <div className="flex flex-col gap-2 mt-2 w-[300px]">
              {['Analisando dados de localização', 'Comparando tendências de mercado', 'Calculando índice de confiança'].map((t, i) => (
                <SkeletonStep key={i} label={t} delay={i * 800} />
              ))}
            </div>
          </div>
        ) : step === 0 ? (
          /* Step 0 — Details */
          <div className="flex flex-col gap-[18px]">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço do Imóvel</label>
              <input
                className={inputClass}
                placeholder="Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB"
                value={form.address}
                onChange={e => set('address', e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Use endereço completo com cidade e estado para melhor precisão.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Imóvel</label>
              <div className="flex gap-2">
                {PROPERTY_TYPES.map(t => (
                  <button key={t.value} onClick={() => handlePropertyTypeChange(t.value)} style={pillStyle(form.propertyType === t.value)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              {showBeds && (
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Quartos</label>
                  <select
                    className={inputClass + ' cursor-pointer'}
                    value={form.beds}
                    onChange={e => set('beds', e.target.value)}
                  >
                    {['1', '2', '3', '4', '5'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              {showBaths && (
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Banheiros</label>
                  <select
                    className={inputClass + ' cursor-pointer'}
                    value={form.baths}
                    onChange={e => set('baths', e.target.value)}
                  >
                    {['1', '2', '3', '4'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              {showParking && (
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vagas</label>
                  <select
                    className={inputClass + ' cursor-pointer'}
                    value={form.parking}
                    onChange={e => set('parking', e.target.value)}
                  >
                    {['0', '1', '2', '3'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Área (m²)</label>
                <input
                  className={inputClass}
                  type="number"
                  placeholder="ex. 98"
                  value={form.area}
                  onChange={e => set('area', e.target.value)}
                />
              </div>
            </div>

            {/* Construction age */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Idade da Construção (anos, opcional)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                placeholder="ex. 15"
                value={form.construction_age}
                onChange={e => setForm(f => ({ ...f, construction_age: e.target.value }))}
                style={{ width: '100%', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: '10px 14px', fontSize: 14 }}
              />
            </div>

            {/* Conservation state */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Estado de Conservação (opcional)
              </label>
              <select
                value={form.conservation_state}
                onChange={e => setForm(f => ({ ...f, conservation_state: e.target.value as ConservationState | '' }))}
                style={{ width: '100%', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: '10px 14px', fontSize: 14 }}
              >
                <option value="">Não informado</option>
                <option value="A">A — Novo</option>
                <option value="AB">AB — Ótimo</option>
                <option value="B">B — Muito Bom</option>
                <option value="BC">BC — Bom</option>
                <option value="C">C — Regular</option>
                <option value="CD">CD — Razoável</option>
                <option value="D">D — Deteriorado</option>
                <option value="DE">DE — Muito Deteriorado</option>
                <option value="E">E — Ruína</option>
              </select>
            </div>

            {/* Terrain slope + street level in a 2-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Topografia
                </label>
                <select
                  value={form.terrain_slope}
                  onChange={e => setForm(f => ({ ...f, terrain_slope: e.target.value as TerrainSlope | '' }))}
                  style={{ width: '100%', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: '10px 14px', fontSize: 14 }}
                >
                  <option value="">Não informado</option>
                  <option value="flat">Plano</option>
                  <option value="gentle">Suave Declive</option>
                  <option value="steep">Acentuado</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Nível em Relação à Rua
                </label>
                <select
                  value={form.street_level}
                  onChange={e => setForm(f => ({ ...f, street_level: e.target.value as StreetLevel | '' }))}
                  style={{ width: '100%', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: '10px 14px', fontSize: 14 }}
                >
                  <option value="">Não informado</option>
                  <option value="same">Mesmo nível da rua</option>
                  <option value="above">Acima da rua</option>
                  <option value="below">Abaixo da rua</option>
                </select>
              </div>
            </div>

            {/* Corner lot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <input
                type="checkbox"
                id="is_corner"
                checked={form.is_corner}
                onChange={e => setForm(f => ({ ...f, is_corner: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="is_corner" style={{ fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                Imóvel de esquina (fator +5%)
              </label>
            </div>
          </div>
        ) : step === 1 ? (
          /* Step 1 — Conservação & Fotos */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Fotos do Imóvel
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Opcional. Quando enviadas, a IA analisa o padrão construtivo e pode sugerir o estado de conservação.
            </p>

            {/* File input area */}
            <label
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', border: '2px dashed #CBD5E1', borderRadius: 12,
                padding: 32, cursor: 'pointer', background: '#F8FAFC', gap: 8,
              }}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const newFiles = Array.from(e.target.files ?? []);
                  setForm(f => ({ ...f, photos: [...f.photos, ...newFiles].slice(0, 10) }));
                }}
              />
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                Clique para adicionar fotos (máx. 10)
              </span>
            </label>

            {/* Thumbnails */}
            {form.photos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {form.photos.map((file, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`foto ${i + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        background: '#EF4444', color: '#fff', border: 'none',
                        borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {photoUploading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748B', fontSize: 13 }}>
                <div
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid #E2E8F0', borderTopColor: PRIMARY,
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Enviando fotos e analisando com IA...
              </div>
            )}

            {apiError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {apiError}
              </div>
            )}
          </div>
        ) : isAmenitiesStep ? (
          /* Step 2 (apt/house) — Amenities */
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Selecione as Comodidades</label>
            <p className="text-sm text-slate-400 mb-4">Selecione todas que se aplicam ao imóvel.</p>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_BY_TYPE[form.propertyType].map(a => (
                <button key={a} onClick={() => toggleAmenity(a)} style={pillStyle(form.amenities.includes(a))}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        ) : isReviewStep ? (
          /* Last step — Review */
          <div>
            <h3 className="text-base font-semibold mb-4 text-slate-900">Revisar Detalhes</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Endereço', value: form.address },
                { label: 'Tipo', value: PROPERTY_TYPES.find(t => t.value === form.propertyType)?.label ?? form.propertyType },
                ...(showBeds ? [{ label: 'Quartos', value: form.beds }] : []),
                ...(showBaths ? [{ label: 'Banheiros', value: form.baths }] : []),
                ...(showParking ? [{ label: 'Vagas', value: form.parking }] : []),
                { label: 'Área', value: form.area + 'm²' },
                ...(form.construction_age ? [{ label: 'Idade (anos)', value: form.construction_age }] : []),
                ...(form.conservation_state ? [{ label: 'Conservação', value: form.conservation_state }] : []),
                ...(form.terrain_slope ? [{ label: 'Topografia', value: form.terrain_slope }] : []),
                ...(form.street_level ? [{ label: 'Nível da Rua', value: form.street_level }] : []),
                ...(form.is_corner ? [{ label: 'Esquina', value: 'Sim' }] : []),
                ...(form.photos.length > 0 ? [{ label: 'Fotos', value: `${form.photos.length} foto(s)` }] : []),
              ].map((f, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">{f.label}</div>
                  <div className="text-sm font-medium text-slate-900">{f.value}</div>
                </div>
              ))}
            </div>
            {form.amenities.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-1.5">Comodidades</div>
                <div className="flex flex-wrap gap-1.5">
                  {form.amenities.map(a => (
                    <span
                      key={a}
                      className="px-2.5 py-1 rounded-xl text-xs font-medium"
                      style={{ background: ACCENT + '12', color: ACCENT }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {apiError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {apiError}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      {!processing && (
        <div className="flex justify-between mt-5">
          <button
            onClick={() => step === 0 ? navigate('/') : setStep(s => s - 1)}
            className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-sm font-medium transition-opacity"
            style={{ cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          <button
            onClick={handleContinue}
            disabled={!canAdvance || photoUploading}
            className="px-6 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: PRIMARY, fontFamily: 'inherit' }}
          >
            {photoUploading
              ? 'Enviando...'
              : step < maxStep
                ? 'Continuar'
                : '✦ Gerar Avaliação IA'}
          </button>
        </div>
      )}
    </div>
  )
}
