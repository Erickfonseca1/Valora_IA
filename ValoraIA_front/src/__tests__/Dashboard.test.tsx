import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../components/Dashboard'

const { mockMetrics, mockValuations, mockTrend } = vi.hoisted(() => ({
  mockMetrics: {
    valuations_this_month: 24,
    valuations_prev_month: 18,
    avg_confidence: 82.3,
    market_temperature: 'hot' as const,
    market_city: 'São Paulo',
  },
  mockValuations: {
    total: 3,
    items: [
      {
        id: 'val_001',
        address: 'Av. Paulista, 1000',
        neighborhood: 'Bela Vista',
        property_type: 'apartment' as const,
        price_brl: 850000,
        confidence_score: 92,
        created_at: '2025-05-01T10:00:00Z',
        bedrooms: 3,
        area_m2: 120,
      },
      {
        id: 'val_002',
        address: 'Rua Augusta, 500',
        neighborhood: 'Consolação',
        property_type: 'apartment' as const,
        price_brl: 620000,
        confidence_score: 78,
        created_at: '2025-04-30T14:00:00Z',
        bedrooms: 2,
        area_m2: 75,
      },
      {
        id: 'val_003',
        address: 'Alameda Santos, 200',
        neighborhood: 'Jardim Paulista',
        property_type: 'commercial' as const,
        price_brl: 1200000,
        confidence_score: 88,
        created_at: '2025-04-28T09:00:00Z',
        bedrooms: null,
        area_m2: 200,
      },
    ],
  },
  mockTrend: {
    city: 'São Paulo',
    period_months: 12,
    current_price_m2: 9500,
    yearly_change_pct: 5.2,
    data_points: [8000, 8200, 8400, 8500, 8700, 9000, 9200, 9100, 9300, 9400, 9500, 9500],
  },
}))

vi.mock('../api', () => ({
  getDashboardMetrics: vi.fn().mockResolvedValue(mockMetrics),
  getDashboardValuations: vi.fn().mockResolvedValue(mockValuations),
  getMarketTrend: vi.fn().mockResolvedValue(mockTrend),
  createValuation: vi.fn(),
  getValuation: vi.fn(),
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard', () => {
  it('renderiza o título e subtítulo após carregar', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Painel')).toBeInTheDocument()
      expect(screen.getByText('Bem-vinda de volta, Maria. Aqui está seu panorama de mercado.')).toBeInTheDocument()
    })
  })

  it('exibe as métricas após carregar', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('24')).toBeInTheDocument()
    })
    expect(screen.getByText('Avaliações Este Mês')).toBeInTheDocument()
    expect(screen.getByText('82.3%')).toBeInTheDocument()
    expect(screen.getByText('Confiança Média')).toBeInTheDocument()
    expect(screen.getByText('Aquecido')).toBeInTheDocument()
    expect(screen.getByText('Temperatura do Mercado')).toBeInTheDocument()
  })

  it('exibe variação mensal percentual', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('+33% em relação ao mês anterior')).toBeInTheDocument()
    })
  })

  it('exibe a tabela de avaliações recentes', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Av. Paulista, 1000')).toBeInTheDocument()
      expect(screen.getByText('Rua Augusta, 500')).toBeInTheDocument()
      expect(screen.getByText('Alameda Santos, 200')).toBeInTheDocument()
    })
  })

  it('exibe os tipos de imóvel traduzidos', async () => {
    renderDashboard()
    await waitFor(() => {
      const apartamentos = screen.getAllByText('Apartamento')
      expect(apartamentos.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('Comercial')).toBeInTheDocument()
    })
  })

  it('exibe badges de confiança na tabela', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('92% Conf.')).toBeInTheDocument()
      expect(screen.getByText('78% Conf.')).toBeInTheDocument()
      expect(screen.getByText('88% Conf.')).toBeInTheDocument()
    })
  })

  it('exibe o gráfico de tendência de mercado', async () => {
    const { container } = renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Tendência Preço/m²')).toBeInTheDocument()
    })
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('exibe preço atual e variação anual no gráfico', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Atual')).toBeInTheDocument()
      expect(screen.getByText('Variação Anual')).toBeInTheDocument()
    })
  })
})
