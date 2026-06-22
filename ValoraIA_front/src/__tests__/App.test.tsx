import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import type {
  DashboardMetrics,
  DashboardValuationsResponse,
  MarketTrendResponse,
  ValuationRecord,
} from '../types'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('../api', () => ({
  getDashboardMetrics: vi.fn(),
  getDashboardValuations: vi.fn(),
  getMarketTrend: vi.fn(),
  getValuation: vi.fn(),
  createValuation: vi.fn(),
  uploadPhotos: vi.fn(),
  analyzePhotos: vi.fn(),
  extractProperty: vi.fn(),
}))

import {
  getDashboardMetrics,
  getDashboardValuations,
  getMarketTrend,
  getValuation,
} from '../api'

const mockMetrics: DashboardMetrics = {
  valuations_this_month: 12,
  valuations_prev_month: 10,
  avg_confidence: 85.5,
  market_temperature: 'warm',
  market_city: 'João Pessoa',
}

const mockValuationsResponse: DashboardValuationsResponse = {
  total: 1,
  items: [
    {
      id: 'val_001',
      address: 'Av. Epitácio Pessoa, 1000',
      property_type: 'apartment',
      static_market_value_brl: 500000,
      confidence_score: 85,
      created_at: new Date().toISOString(),
      area_m2: 80,
    },
  ],
}

const mockTrend: MarketTrendResponse = {
  city: 'João Pessoa',
  period_months: 12,
  current_price_m2: 5500,
  yearly_change_pct: 3.5,
  data_points: [5000, 5100, 5200, 5300, 5400, 5500],
}

const mockValuation: ValuationRecord = {
  id: 'val_abc123',
  address: 'Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB',
  lat: -7.1,
  lng: -34.8,
  property_type: 'apartment',
  area_m2: 80,
  bedrooms: 3,
  bathrooms: 2,
  parking_spaces: 1,
  construction_age: 15,
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
  created_at: new Date().toISOString(),
}

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(getDashboardMetrics).mockResolvedValue(mockMetrics)
    vi.mocked(getDashboardValuations).mockResolvedValue(mockValuationsResponse)
    vi.mocked(getMarketTrend).mockResolvedValue(mockTrend)
    vi.mocked(getValuation).mockResolvedValue(mockValuation)
  })

  it('renderiza Dashboard na rota /', async () => {
    renderApp('/')
    // "Painel" appears in the sidebar (2x, desktop+mobile nav) and in the Dashboard h1
    await waitFor(() => {
      expect(screen.getAllByText('Painel')).toHaveLength(3)
    })
  })

  it('renderiza ValuationFlow na rota /nova-avaliacao', () => {
    renderApp('/nova-avaliacao')
    expect(screen.getAllByText('Nova Avaliação').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Detalhes do Imóvel')).toBeInTheDocument()
  })

  it('renderiza Report na rota /resultado/:id', async () => {
    renderApp('/resultado/val_abc123')
    expect(
      await screen.findByText('Parecer Técnico de Avaliação Mercadológica'),
    ).toBeInTheDocument()
  })

  it('redireciona rota desconhecida para /', async () => {
    renderApp('/rota-inexistente')
    // "Painel" appears in sidebar (2x) + Dashboard h1 after redirect
    await waitFor(() => {
      expect(screen.getAllByText('Painel')).toHaveLength(3)
    })
  })

  it('sempre renderiza o AppShell com sidebar', () => {
    renderApp('/')
    // AppShell sidebar content appears twice in jsdom (desktop + mobile drawer)
    // because CSS is not applied, both variants are visible in the DOM
    expect(screen.getAllByText('Valora AI').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Agente de Precificação').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Edizio Peixoto').length).toBeGreaterThanOrEqual(1)
  })
})
