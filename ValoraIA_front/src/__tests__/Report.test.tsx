import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Report from '../components/Report'

const { mockValuation } = vi.hoisted(() => ({
  mockValuation: {
    id: 'val_abc123',
    address: 'Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB',
    neighborhood: 'Manaíra',
    city: 'João Pessoa',
    property_type: 'apartment' as const,
    area_m2: 98,
    bedrooms: 3,
    bathrooms: 2,
    parking_spots: 1,
    amenities: ['Piscina', 'Academia', 'Varanda'],
    price_range_min_brl: 485000,
    price_range_max_brl: 525000,
    recommended_listing_price_brl: 505000,
    confidence_score: 88,
    price_factors: [
      { label: 'Localização', score: 0.85 },
      { label: 'Condição', score: 0.72 },
      { label: 'Demanda', score: 0.91 },
      { label: 'Tamanho', score: 0.65 },
      { label: 'Comodidades', score: 0.78 },
      { label: 'Transporte', score: 0.60 },
    ],
    comparables: [
      {
        address: 'Rua João Câncio, 200',
        neighborhood: 'Manaíra',
        price_brl: 490000,
        area_m2: 95,
        bedrooms: 3,
        price_m2_brl: 5157,
        status: 'sold' as const,
        transaction_date: '2025-03-15',
        amenities: ['Piscina', 'Elevador'],
      },
      {
        address: 'Av. Epitácio Pessoa, 800',
        neighborhood: 'Manaíra',
        price_brl: 520000,
        area_m2: 100,
        bedrooms: 3,
        price_m2_brl: 5200,
        status: 'listed' as const,
        transaction_date: '2025-04-01',
        source_url: 'https://exemplo.com/anuncio',
        amenities: ['Piscina', 'Academia', 'Varanda'],
      },
    ],
    method_estimates: [
      { method: 'mcd_idw' as const, predicted_ppm2: 5100, weight: 0.5, meta: {} },
      { method: 'wls' as const, predicted_ppm2: 5200, weight: 0.3, meta: {} },
      { method: 'gbdt' as const, predicted_ppm2: 5050, weight: 0.2, meta: {} },
    ],
    primary_method: 'ensemble' as const,
    created_at: '2025-05-01T10:00:00Z',
  },
}))

vi.mock('../api', () => ({
  getValuation: vi.fn().mockResolvedValue(mockValuation),
  createValuation: vi.fn(),
  getDashboardMetrics: vi.fn(),
  getDashboardValuations: vi.fn(),
  getMarketTrend: vi.fn(),
}))

function renderReport(id = 'val_abc123') {
  return render(
    <MemoryRouter initialEntries={[`/resultado/${id}`]}>
      <Routes>
        <Route path="/resultado/:id" element={<Report />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Report', () => {
  it('exibe o endereço da avaliação', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB')).toBeInTheDocument()
    })
  })

  it('exibe o título do relatório', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Relatório de Avaliação IA')).toBeInTheDocument()
    })
  })

  it('exibe a faixa de preço recomendada', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Faixa de Preço Recomendada')).toBeInTheDocument()
    })
  })

  it('exibe o preço ideal de anúncio', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Preço Ideal de Anúncio')).toBeInTheDocument()
    })
  })

  it('exibe a confiança formatada', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/88%/)).toBeInTheDocument()
      expect(screen.getByText(/Alta/)).toBeInTheDocument()
    })
  })

  it('exibe a seção de fatores de preço', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Análise de Fatores de Preço')).toBeInTheDocument()
    })
  })

  it('renderiza o gráfico radar', async () => {
    const { container } = renderReport()
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('exibe os detalhamentos de pontuação', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Detalhamento da Pontuação')).toBeInTheDocument()
      expect(screen.getAllByText('Localização').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('Condição').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('Demanda').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('exibe a seção de comparáveis', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Imóveis Comparáveis')).toBeInTheDocument()
    })
  })

  it('exibe cards de comparáveis com status', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Anunciado')).toBeInTheDocument()
      expect(screen.getByText('Vendido')).toBeInTheDocument()
    })
  })

  it('exibe os métodos de estimativa', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Como foi calculado')).toBeInTheDocument()
      expect(screen.getByText('MCD_IDW')).toBeInTheDocument()
      expect(screen.getByText('WLS')).toBeInTheDocument()
      expect(screen.getByText('GBDT')).toBeInTheDocument()
    })
  })

  it('exibe botão para voltar ao painel', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('← Voltar ao Painel')).toBeInTheDocument()
      expect(screen.getByText('+ Nova Avaliação')).toBeInTheDocument()
    })
  })
})
