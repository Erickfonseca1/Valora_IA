import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ValuationForm, PropertyType } from '../types'
import { createValuation } from '../api'

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

const STEPS_BY_TYPE: Record<PropertyType, string[]> = {
  apartment: ['Detalhes do Imóvel', 'Comodidades', 'Revisão & Preço'],
  house: ['Detalhes do Imóvel', 'Comodidades', 'Revisão & Preço'],
  commercial: ['Detalhes do Imóvel', 'Revisão & Preço'],
  land: ['Detalhes do Imóvel', 'Revisão & Preço'],
}

const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'

function SkeletonStep({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = useState(false)

  useState(() => {
    const t = setTimeout(() => setDone(true), delay + 800)
    return () => clearTimeout(t)
  })

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
  })
  const [processing, setProcessing] = useState(false)
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
  const isAmenitiesStep = maxStep === 2 && step === 1

  const canAdvance = step === 0
    ? form.address.trim().length > 0 && form.area.trim().length > 0 && parseFloat(form.area) > 0
    : true

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
          </div>
        ) : isAmenitiesStep ? (
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
        ) : (
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
        )}
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
            onClick={() => step < maxStep ? setStep(s => s + 1) : handleSubmit()}
            disabled={!canAdvance}
            className="px-6 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: PRIMARY, fontFamily: 'inherit' }}
          >
            {step < maxStep ? 'Continuar' : '✦ Gerar Avaliação IA'}
          </button>
        </div>
      )}
    </div>
  )
}
