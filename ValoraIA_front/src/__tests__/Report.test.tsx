import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'
import Report from '../components/Report'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div />,
  CircleMarker: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

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
    amenities: [
      { item: 'piscina', scope: 'condo' as const },
      { item: 'academia', scope: 'condo' as const },
      { item: 'varanda', scope: 'interno' as const },
    ],
    in_gated_community: false,
    price_range_min_brl: 485000,
    price_range_max_brl: 525000,
    recommended_listing_price_brl: 505000,
    static_market_value_brl: 505000,
    confidence_score: 88,
    lat: null,
    lng: null,
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
    // V2 fields
    static_market_value: 505000,
    residual_land_value: 180000,
    residual_land_value_brl: 180000,
    max_buildable_area: 392,
    max_buildable_area_m2: 392,
    viability_scenarios: [
      { label: 'Conservador', description: 'IA 70% do máximo', VGV_total: 1100000, residual: 125000, roi_pct: 22.7 },
      { label: 'Base',        description: 'IA máximo',         VGV_total: 1570000, residual: 180000, roi_pct: 22.9 },
      { label: 'Otimista',   description: 'IA 120%',            VGV_total: 1884000, residual: 215000, roi_pct: 22.8 },
    ],
    zoning_info: { zone_code: 'ZR-2', IA_max: 2.0, land_use: 'Residencial' },
    homogenization_factors: {
      ensemble_ppm2: 5000, offer_factor: 0.9, typology_factor: 1.0,
      corner_factor: 1.05, slope_factor: 1.0, level_factor: 1.0, physical_factor: 1.05,
      amenity_internal: 1.06, amenity_condo: 1.0, amenity_proximo: 1.0, amenity_factor: 1.06,
      combined_factor: 1.113, ppm2_homogenized: 5565, area_m2: 98, market_value: 545370,
    },
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
      expect(screen.getByTestId('live-hero')).toBeInTheDocument()
    })
  })

  it('exibe o título do relatório', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Parecer Técnico de Avaliação Mercadológica/i)).toBeInTheDocument()
    })
  })

  it('exibe a faixa de preço recomendada', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/faixa estimada/i)).toBeInTheDocument()
    })
  })

  it('exibe o preço ideal de anúncio', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Valor de Mercado \(Método Comparativo\)/i)).toBeInTheDocument()
    })
  })

  it('exibe a confiança formatada', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Grau de Confiança/i)).toBeInTheDocument()
      expect(screen.getAllByText(/88%/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('exibe a seção de fatores de preço', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Fatores físicos/i)).toBeInTheDocument()
      expect(screen.getByText(/Comodidades por escopo/i)).toBeInTheDocument()
    })
  })

  it('renderiza o gráfico radar', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Valor unitário de mercado \(ensemble\)/i)).toBeInTheDocument()
    })
  })

  it('exibe os detalhamentos de pontuação', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Esquina 1\.05/i)).toBeInTheDocument()
      expect(screen.getByText(/Interno 1\.06/i)).toBeInTheDocument()
    })
  })

  it('exibe a seção de comparáveis', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Tabela de Imóveis Referenciais/i)).toBeInTheDocument()
    })
  })

  it('exibe cards de comparáveis com status', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Oferta')).toBeInTheDocument()
      expect(screen.getByText('Venda')).toBeInTheDocument()
    })
  })

  it('exibe os métodos de estimativa', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Valor unitário de mercado \(ensemble\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Comparáveis já ajustados por oferta/i)).toBeInTheDocument()
    })
  })

  it('exibe botão para voltar ao painel', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('← Voltar ao Painel')).toBeInTheDocument()
      expect(screen.getByText('+ Nova Avaliação')).toBeInTheDocument()
    })
  })

  it('exibe seção Análise de Valor quando static_market_value disponível', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getAllByText(/Abismo de Valor/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Venda Direta ao Mercado/i)).toBeInTheDocument()
      expect(screen.getByText(/Valor de Incorporação/i)).toBeInTheDocument()
    })
  })

  it('exibe seção Potencial Construtivo quando max_buildable_area disponível', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText(/Potencial Construtivo/i)).toBeInTheDocument()
      expect(screen.getByText(/392/)).toBeInTheDocument()
    })
  })

  it('exibe tabela de homogeneização quando fatores disponíveis', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('R$/m² homogeneizado')).toBeInTheDocument()
      expect(screen.getByText('Área útil')).toBeInTheDocument()
      expect(screen.getByText(/Fator de oferta de 10%/i)).toBeInTheDocument()
    })
  })

  it('agrupa comodidades por escopo no relatório', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getByText('Diferencial do Imóvel')).toBeInTheDocument()
      expect(screen.getByText('Infra do Condomínio')).toBeInTheDocument()
    })
  })

  it('mostra a seção de memória de cálculo quando há fatores', async () => {
    renderReport()
    await waitFor(() => {
      expect(screen.getAllByText('Como Chegamos a Este Valor').length).toBeGreaterThanOrEqual(1)
    })
  })
})
