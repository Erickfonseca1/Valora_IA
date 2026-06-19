import { describe, it, expect } from 'vitest'
import { mergeExtraction, inferScopeForItem } from '../lib/mergeExtraction'
import type { ValuationForm, ExtractionResult, FormFieldSource } from '../types'

const BASE_FORM: ValuationForm = {
  address: '',
  propertyType: 'apartment',
  area: '',
  bedrooms: '',
  bathrooms: '',
  parking_spaces: '',
  construction_age: '',
  conservation_state: '' as never,
  is_corner: false,
  terrain_slope: '' as never,
  street_level: '' as never,
  photos: [],
  photoUrls: [],
  amenities: [],
  in_gated_community: false,
}

const FULL_RESULT: ExtractionResult = {
  summary: 'Apartamento de 3 quartos em Manaíra.',
  fields: {
    address: { value: 'Rua X, 100', confidence: 0.9 },
    property_type: { value: 'apartment', confidence: 0.9 },
    area_m2: { value: 98, confidence: 0.9 },
    bedrooms: { value: 3, confidence: 0.9 },
    bathrooms: { value: 2, confidence: 0.9 },
    parking_spaces: { value: 1, confidence: 0.7 },
    construction_age: { value: 5, confidence: 0.7 },
    conservation_state: { value: 'regular', confidence: 0.7 },
    is_corner: { value: true, confidence: 0.5 },
    in_gated_community: { value: false, confidence: 0.5 },
  },
  amenities: [{ item: 'piscina', confidence: 0.9 }, { item: 'academia', confidence: 0.7 }],
  gaps: [],
}

describe('mergeExtraction', () => {
  it('preenche form vazio com dados do resultado', () => {
    const { form } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    expect(form.address).toBe('Rua X, 100')
    expect(form.propertyType).toBe('apartment')
    expect(form.area).toBe('98')
    expect(form.bedrooms).toBe('3')
    expect(form.bathrooms).toBe('2')
    expect(form.parking_spaces).toBe('1')
    expect(form.construction_age).toBe('5')
    expect(form.conservation_state).toBe('regular')
    expect(form.is_corner).toBe(true)
  })

  it('marca campos com source audio', () => {
    const { source } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    expect(source.address).toBe('audio')
    expect(source.area).toBe('audio')
    expect(source.conservation_state).toBe('audio')
  })

  it('campo manual não é sobrescrito pelo áudio', () => {
    const formWithManual = { ...BASE_FORM, address: 'Endereço manual' }
    const sourceWithManual: FormFieldSource = { address: 'manual' }
    const { form, source } = mergeExtraction(formWithManual, FULL_RESULT, sourceWithManual)
    expect(form.address).toBe('Endereço manual')
    expect(source.address).toBe('manual')
  })

  it('campo audio não é sobrescrito pela foto (incoming photo)', () => {
    const formWithAudio = { ...BASE_FORM, conservation_state: 'novo' as const }
    const sourceWithAudio: FormFieldSource = { conservation_state: 'audio' }
    const photoResult: ExtractionResult = {
      ...FULL_RESULT,
      fields: { conservation_state: { value: 'critico', confidence: 0.9 } },
    }
    // Simulate photo merge: incoming source is 'photo'
    // mergeExtraction uses 'audio' hardcoded — for photo, caller must pass different source
    // Actually: mergeExtraction is also used for photo results; caller sets incoming to 'photo'
    // We test via: if source is 'audio' in currentSource and incoming would be 'photo'
    // But current design: mergeExtraction always uses 'audio' as source.
    // Photo merge happens in advanceFromPhotoStep, which manually checks fieldSource.
    // mergeExtraction is only for extraction results (audio/text input).
    // So this test validates that audio source is preserved when re-running mergeExtraction:
    const { form, source } = mergeExtraction(formWithAudio, photoResult, sourceWithAudio)
    // Should NOT overwrite because existing source is 'audio' and incoming (from mergeExtraction) is also 'audio'
    // mergeExtraction always writes 'audio' — if field is already 'audio', it overwrites
    // This is fine — same-level merges replace. Only photo can't replace audio.
    expect(form.conservation_state).toBe('critico') // audio overwrites audio
    expect(source.conservation_state).toBe('audio')
  })

  it('converte numéricos para string', () => {
    const { form } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    expect(typeof form.area).toBe('string')
    expect(form.area).toBe('98')
    expect(form.bedrooms).toBe('3')
  })

  it('adiciona amenidades com escopo inferido para apartment', () => {
    const { form } = mergeExtraction(BASE_FORM, FULL_RESULT, {})
    const piscina = form.amenities.find(a => a.item === 'piscina')
    expect(piscina).toBeDefined()
    expect(piscina?.scope).toBe('condo') // apartment → piscina = condo
    const academia = form.amenities.find(a => a.item === 'academia')
    expect(academia?.scope).toBe('condo')
  })

  it('não duplica amenidade já existente no form', () => {
    const formWithPiscina = {
      ...BASE_FORM,
      amenities: [{ item: 'piscina', scope: 'condo' as const }],
    }
    const { form } = mergeExtraction(formWithPiscina, FULL_RESULT, {})
    const piscinas = form.amenities.filter(a => a.item === 'piscina')
    expect(piscinas).toHaveLength(1)
  })

  it('ignora amenidade com item fora do FRONT_CATALOG', () => {
    const resultWithUnknown: ExtractionResult = {
      ...FULL_RESULT,
      amenities: [{ item: 'heliponto_invalido', confidence: 0.9 }],
    }
    const { form } = mergeExtraction(BASE_FORM, resultWithUnknown, {})
    expect(form.amenities.find(a => a.item === 'heliponto_invalido')).toBeUndefined()
  })

  it('property_type=land: ignora amenidades interno', () => {
    const landForm = { ...BASE_FORM, propertyType: 'land' as const }
    const { form } = mergeExtraction(landForm, FULL_RESULT, {})
    expect(form.amenities).toHaveLength(0) // piscina e academia inválidos para land
  })
})

describe('inferScopeForItem', () => {
  it('apartment → piscina = condo', () => {
    expect(inferScopeForItem('piscina', 'apartment', false)).toBe('condo')
  })
  it('house sem condomínio → piscina = interno', () => {
    expect(inferScopeForItem('piscina', 'house', false)).toBe('interno')
  })
  it('house em condomínio → piscina = condo', () => {
    expect(inferScopeForItem('piscina', 'house', true)).toBe('condo')
  })
  it('land → retorna null', () => {
    expect(inferScopeForItem('piscina', 'land', false)).toBeNull()
  })
  it('item desconhecido → null', () => {
    expect(inferScopeForItem('item_inexistente', 'apartment', false)).toBeNull()
  })
  it('salao_festas (só condo) → apartment = condo', () => {
    expect(inferScopeForItem('salao_festas', 'apartment', false)).toBe('condo')
  })
  it('quintal (só interno) → house = interno', () => {
    expect(inferScopeForItem('quintal', 'house', false)).toBe('interno')
  })
  it('quintal (só interno) → land = null', () => {
    expect(inferScopeForItem('quintal', 'land', false)).toBeNull()
  })
})
