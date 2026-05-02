import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createValuation,
  getValuation,
  getDashboardMetrics,
  getDashboardValuations,
  getMarketTrend,
} from '../api'

const BASE = 'http://localhost:3000'

function mockFetch(response: unknown, success = true) {
  return vi.fn().mockResolvedValue({
    json: () => Promise.resolve(success ? { success: true, data: response } : { success: false, error: response }),
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('api', () => {
  it('createValuation envia POST com body correto', async () => {
    const mockVal = { id: 'val_abc', address: 'Rua Teste, 123', neighborhood: 'Centro', city: 'São Paulo', property_type: 'apartment', area_m2: 80, bedrooms: 2, bathrooms: 1, parking_spots: 1, amenities: ['Piscina'], price_range_min_brl: 400000, price_range_max_brl: 500000, recommended_listing_price_brl: 450000, confidence_score: 85, price_factors: [], comparables: [], created_at: '2025-01-01' }
    globalThis.fetch = mockFetch(mockVal)

    const result = await createValuation({
      address: 'Rua Teste, 123',
      property_type: 'apartment',
      area_m2: 80,
      bedrooms: 2,
      bathrooms: 1,
      parking_spots: 1,
      amenities: ['Piscina'],
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE}/api/valuations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: 'Rua Teste, 123',
        property_type: 'apartment',
        area_m2: 80,
        bedrooms: 2,
        bathrooms: 1,
        parking_spots: 1,
        amenities: ['Piscina'],
      }),
    })
    expect(result).toEqual(mockVal)
  })

  it('getValuation faz GET com o id correto', async () => {
    const mockVal = { id: 'val_xyz', address: 'Av. Paulista, 1000', neighborhood: 'Bela Vista', city: 'São Paulo', property_type: 'apartment', area_m2: 120, bedrooms: 3, bathrooms: 2, parking_spots: 2, amenities: [], price_range_min_brl: 800000, price_range_max_brl: 1000000, recommended_listing_price_brl: 900000, confidence_score: 92, price_factors: [], comparables: [], created_at: '2025-01-02' }
    globalThis.fetch = mockFetch(mockVal)

    const result = await getValuation('val_xyz')
    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE}/api/valuations/val_xyz`, undefined)
    expect(result).toEqual(mockVal)
  })

  it('getDashboardMetrics retorna métricas', async () => {
    const mockMetrics = { valuations_this_month: 15, valuations_prev_month: 10, avg_confidence: 82.5, market_temperature: 'warm' as const, market_city: 'São Paulo' }
    globalThis.fetch = mockFetch(mockMetrics)

    const result = await getDashboardMetrics()
    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE}/api/dashboard/metrics`, undefined)
    expect(result).toEqual(mockMetrics)
  })

  it('getDashboardValuations envia query params corretos', async () => {
    const mockResp = { total: 2, items: [] }
    globalThis.fetch = mockFetch(mockResp)

    const result = await getDashboardValuations(5, 10)
    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE}/api/dashboard/valuations?limit=5&offset=10`, undefined)
    expect(result).toEqual(mockResp)
  })

  it('getDashboardValuations usa defaults quando sem argumentos', async () => {
    const mockResp = { total: 0, items: [] }
    globalThis.fetch = mockFetch(mockResp)

    await getDashboardValuations()
    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE}/api/dashboard/valuations?limit=10&offset=0`, undefined)
  })

  it('getMarketTrend encoda city e envia months', async () => {
    const mockTrend = { city: 'Rio de Janeiro', period_months: 12, current_price_m2: 8500, yearly_change_pct: 3.5, data_points: [8000, 8200, 8500] }
    globalThis.fetch = mockFetch(mockTrend)

    const result = await getMarketTrend('Rio de Janeiro', 6)
    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE}/api/market/trend?city=Rio%20de%20Janeiro&months=6`, undefined)
    expect(result).toEqual(mockTrend)
  })

  it('lança erro quando a API retorna success: false', async () => {
    globalThis.fetch = mockFetch('Mensagem de erro do servidor', false)

    await expect(getValuation('val_fail')).rejects.toThrow('Mensagem de erro do servidor')
  })

  it('lança erro genérico quando a API retorna sem error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    })

    await expect(getValuation('val_fail')).rejects.toThrow('Unknown API error')
  })
})
