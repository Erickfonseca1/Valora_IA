import { describe, it, expect } from 'vitest'
import { enquadrar } from '../lib/nbr146532'
import type { ValuationRecord } from '../types'

function baseValuation(over: Partial<ValuationRecord> = {}): ValuationRecord {
  return {
    id: 'val_1',
    address: 'Rua A, 100, João Pessoa',
    lat: -7.1,
    lng: -34.8,
    property_type: 'apartment',
    area_m2: 80,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    construction_age: 10,
    conservation_state: 'regular',
    terrain_slope: 'plano',
    street_level: 'no_nivel',
    is_corner: false,
    static_market_value_brl: 500000,
    price_per_m2_homogenized: 6250,
    confidence_score: 85,
    residual_land_value_brl: null,
    max_buildable_area_m2: null,
    zoning_params: null,
    viability_scenarios: null,
    comparables: [],
    neighborhood_pois: null,
    amenities: [],
    in_gated_community: false,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  } as ValuationRecord
}

describe('enquadrar (NBR 14653-2 informativo)', () => {
  it('retorna null sem diagnostics', () => {
    expect(enquadrar(baseValuation())).toBeNull()
  })

  it('grau III com amostra robusta, venda e precisão alta', () => {
    const enc = enquadrar(baseValuation({
      confidence_diagnostics: {
        sample_size: 18,
        displayed_sample_size: 5,
        effective_sample_size: 14,
        same_typology_count: 18,
        same_neighborhood_count: 10,
        confidence_interval_width_pct: 22,
        reasons: [],
      },
      comparables: [
        { address: 'A', neighborhood: 'Manaíra', price_brl: 500000, area_m2: 80, bedrooms: 3, price_m2_brl: 6250, status: 'sold', transaction_date: '2026-01-01', lat: null, lng: null },
      ],
      method_estimates: [
        { method: 'mcd_idw', predicted_ppm2: 6200, weight: 0.6, meta: {} },
        { method: 'wls', predicted_ppm2: 6300, weight: 0.4, meta: {} },
      ],
    }))
    expect(enc).not.toBeNull()
    expect(enc!.grau).toBe(3)
    expect(enc!.items.every((i) => i.met)).toBe(true)
  })

  it('grau I com amostra fraca e sem vendas', () => {
    const enc = enquadrar(baseValuation({
      confidence_diagnostics: {
        sample_size: 5,
        displayed_sample_size: 5,
        effective_sample_size: 4,
        same_typology_count: 5,
        same_neighborhood_count: 3,
        confidence_interval_width_pct: 55,
        reasons: [],
      },
      comparables: [
        { address: 'A', neighborhood: 'Manaíra', price_brl: 500000, area_m2: 80, bedrooms: 3, price_m2_brl: 6250, status: 'listed', transaction_date: '2026-01-01', lat: null, lng: null },
      ],
      method_estimates: [{ method: 'mcd_idw', predicted_ppm2: 6200, weight: 1, meta: {} }],
    }))
    expect(enc).not.toBeNull()
    expect(enc!.grau).toBe(1)
  })
})