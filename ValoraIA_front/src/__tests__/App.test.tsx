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
  completeOnboarding: vi.fn().mockResolvedValue({}),
  fetchMe: vi.fn(),
  listValuations: vi.fn(),
  deleteValuation: vi.fn(),
  restoreValuation: vi.fn(),
  createOrganization: vi.fn(),
  getOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  inviteMember: vi.fn(),
  acceptInvite: vi.fn(),
  changeMemberRole: vi.fn(),
  removeMember: vi.fn(),
  updateProfile: vi.fn(),
  uploadLogo: vi.fn(),
}))

vi.mock('../lib/supabase', () => {
  const session = {
    user: { id: 'u_1', email: 'teste@avalia.com' },
    access_token: 'fake-token',
  }
  return {
    supabase: () => ({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    }),
  }
})

import {
  getDashboardMetrics,
  getDashboardValuations,
  getMarketTrend,
  getValuation,
  fetchMe,
} from '../api'

const mockMetrics: DashboardMetrics = {
  valuations_this_month: 12,
  valuations_prev_month: 10,
  avg_confidence: 85.5,
  market_temperature: 'warm',
  market_city: 'João Pessoa',
  valuations_per_day: [
    { date: '2025-07-01', count: 1 },
    { date: '2025-07-02', count: 3 },
    { date: '2025-07-03', count: 0 },
  ],
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
    vi.mocked(fetchMe).mockResolvedValue({
      profile: { id: 'u_1', full_name: 'Usuário Teste', creci: null, cnaI: null, avatar_url: null, created_at: '' },
      organizations: [
        { id: 'org_1', name: 'Avaliações de Teste', slug: 'teste', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
      ],
      memberships: [
        { id: 'm_1', organization_id: 'org_1', user_id: 'u_1', role: 'owner', invited_by: null, created_at: '' },
      ],
    })
  })

  it('renderiza a landing page na rota /', async () => {
    renderApp('/')
    expect(await screen.findByText('Conheça como funciona')).toBeInTheDocument()
    expect(screen.getByText('O estudo substitui o PTAM?')).toBeInTheDocument()
  })

  it('renderiza Dashboard na rota /app', async () => {
    renderApp('/app')
    // "Painel" appears in the sidebar (2x, desktop+mobile nav) and in the Dashboard h1
    await waitFor(() => {
      expect(screen.getAllByText('Painel')).toHaveLength(3)
    })
  })

  it('renderiza ValuationFlow na rota /app/nova-avaliacao', async () => {
    renderApp('/app/nova-avaliacao')
    expect(await screen.findByText('Detalhes do Imóvel')).toBeInTheDocument()
    expect(screen.getAllByText('Nova Avaliação').length).toBeGreaterThanOrEqual(2)
  })

  it('renderiza Report na rota /app/resultado/:id', async () => {
    renderApp('/app/resultado/val_abc123')
    expect(
       await screen.findByText('Estudo Técnico de Avaliação — Subsídio para Elaboração de PTAM'),
    ).toBeInTheDocument()
  })

  it('redireciona rota de produto legada para /app', async () => {
    renderApp('/nova-avaliacao')
    expect(await screen.findByText('Detalhes do Imóvel')).toBeInTheDocument()
  })

  it('redireciona rota desconhecida para /', async () => {
    renderApp('/rota-inexistente')
    expect(await screen.findByText('Conheça como funciona')).toBeInTheDocument()
  })

  it('sempre renderiza o AppShell com sidebar', async () => {
    renderApp('/app')
    // AppShell sidebar content appears twice in jsdom (desktop + mobile drawer)
    // because CSS is not applied, both variants are visible in the DOM
    expect(await screen.findAllByText('Usuário Teste').then((els) => els.length)).toBeGreaterThanOrEqual(1)
  })
})
