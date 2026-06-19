import type {
  ValuationForm,
  ExtractionResult,
  AmenitySelection,
  AmenityScope,
  PropertyType,
  FieldSource,
  FormFieldSource,
} from '../types'
import { FRONT_CATALOG } from '../amenities'

export function inferScopeForItem(
  item: string,
  propertyType: PropertyType,
  inGatedCommunity: boolean
): AmenityScope | null {
  const entry = FRONT_CATALOG[item]
  if (!entry) return null

  const can = (s: AmenityScope) => entry.scopes.includes(s)

  if (propertyType === 'land') return null
  if (entry.scopes.length === 1) return entry.scopes[0]

  if (propertyType === 'apartment') {
    return can('condo') ? 'condo' : can('interno') ? 'interno' : null
  }

  // house / commercial
  if (inGatedCommunity && can('condo')) return 'condo'
  return can('interno') ? 'interno' : can('condo') ? 'condo' : null
}

export function mergeExtraction(
  form: ValuationForm,
  result: ExtractionResult,
  currentSource: FormFieldSource
): { form: ValuationForm; source: FormFieldSource } {
  const newForm = { ...form }
  const newSource = { ...currentSource }

  function trySet<K extends keyof ValuationForm>(
    key: K,
    value: ValuationForm[K] | null | undefined,
    incoming: FieldSource
  ) {
    if (value == null) return
    const existing = newSource[key]
    if (existing === 'manual') return
    if (existing === 'audio' && incoming === 'photo') return
    newForm[key] = value
    newSource[key] = incoming
  }

  const { fields } = result

  if (fields.address?.value != null)
    trySet('address', fields.address.value, 'audio')
  if (fields.property_type?.value != null)
    trySet('propertyType', fields.property_type.value, 'audio')
  if (fields.area_m2?.value != null)
    trySet('area', String(fields.area_m2.value) as ValuationForm['area'], 'audio')
  if (fields.bedrooms?.value != null)
    trySet('bedrooms', String(fields.bedrooms.value) as ValuationForm['bedrooms'], 'audio')
  if (fields.bathrooms?.value != null)
    trySet('bathrooms', String(fields.bathrooms.value) as ValuationForm['bathrooms'], 'audio')
  if (fields.parking_spaces?.value != null)
    trySet('parking_spaces', String(fields.parking_spaces.value) as ValuationForm['parking_spaces'], 'audio')
  if (fields.construction_age?.value != null)
    trySet('construction_age', String(fields.construction_age.value) as ValuationForm['construction_age'], 'audio')
  if (fields.conservation_state?.value != null)
    trySet('conservation_state', fields.conservation_state.value, 'audio')
  if (fields.terrain_slope?.value != null)
    trySet('terrain_slope', fields.terrain_slope.value, 'audio')
  if (fields.street_level?.value != null)
    trySet('street_level', fields.street_level.value, 'audio')
  if (fields.is_corner?.value != null)
    trySet('is_corner', fields.is_corner.value, 'audio')
  if (fields.in_gated_community?.value != null)
    trySet('in_gated_community', fields.in_gated_community.value, 'audio')

  // Amenidades: inferir escopo e dedup
  // Use original form's propertyType/inGated so amenity scope reflects the starting context
  // (the updated propertyType may not be committed yet when the extraction was triggered)
  const propertyType = form.propertyType
  const inGated = form.in_gated_community
  const toAdd: AmenitySelection[] = []

  for (const a of result.amenities) {
    const scope = inferScopeForItem(a.item, propertyType, inGated)
    if (!scope) continue
    const alreadyIn = newForm.amenities.some(e => e.item === a.item && e.scope === scope)
    if (!alreadyIn) toAdd.push({ item: a.item, scope })
  }

  if (toAdd.length > 0) {
    newForm.amenities = [...newForm.amenities, ...toAdd]
  }

  return { form: newForm, source: newSource }
}
