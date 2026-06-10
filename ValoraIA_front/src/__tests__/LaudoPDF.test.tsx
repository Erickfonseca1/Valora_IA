import { describe, it, expect, vi } from 'vitest'
import { isValidElement } from 'react'

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  StyleSheet: { create: (s: any) => s },
}))

import LaudoPDF from '../components/LaudoPDF'
import type { ValuationRecord } from '../types'

const rec = {
  id: 'val_test01', address: 'Rua Teste, 100', lat: null, lng: null,
  property_type: 'apartment', area_m2: 98, bedrooms: 3, bathrooms: 2, parking_spaces: 1,
  construction_age: 5, conservation_state: 'regular', terrain_slope: 'plano',
  street_level: 'no_nivel', is_corner: true,
  static_market_value_brl: 545370, price_per_m2_homogenized: 5565, confidence_score: 88,
  residual_land_value_brl: null, max_buildable_area_m2: null, zoning_params: null,
  viability_scenarios: null, comparables: [], neighborhood_pois: null,
  amenities: [{ item: 'piscina', scope: 'condo' as const }], in_gated_community: false,
  homogenization_factors: {
    ensemble_ppm2: 5000, offer_factor: 0.9, typology_factor: 1.0,
    corner_factor: 1.05, slope_factor: 1.0, level_factor: 1.0, physical_factor: 1.05,
    amenity_internal: 1.0, amenity_condo: 1.06, amenity_proximo: 1.0, amenity_factor: 1.06,
    combined_factor: 1.113, ppm2_homogenized: 5565, area_m2: 98, market_value: 545370,
  },
  created_at: '2025-05-01T10:00:00Z',
} as unknown as ValuationRecord

describe('LaudoPDF', () => {
  it('constrói o documento sem lançar', () => {
    const el = LaudoPDF({ valuation: rec })
    expect(isValidElement(el)).toBe(true)
  })

  it('lida com avaliação sem homogenization_factors', () => {
    const el = LaudoPDF({ valuation: { ...rec, homogenization_factors: null } })
    expect(isValidElement(el)).toBe(true)
  })
})
