import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import LiveValuationHero from '../components/LiveValuationHero'
import type { ValuationRecord } from '../types'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tiles" />,
  CircleMarker: ({ children }: { children?: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

function makeRecord(over: Partial<ValuationRecord> = {}): ValuationRecord {
  return {
    id: 'val_1',
    address: 'Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB',
    lat: -7.11,
    lng: -34.86,
    property_type: 'apartment',
    area_m2: 98,
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    construction_age: 5,
    conservation_state: 'regular',
    terrain_slope: 'plano',
    street_level: 'no_nivel',
    is_corner: false,
    static_market_value_brl: 487300,
    price_per_m2_homogenized: 4972,
    confidence_score: 82,
    residual_land_value_brl: null,
    max_buildable_area_m2: null,
    zoning_params: null,
    viability_scenarios: null,
    comparables: [
      { address: 'A', neighborhood: 'Manaíra', price_brl: 500000, area_m2: 100, bedrooms: 3, price_m2_brl: 5000, status: 'listed', transaction_date: '2026-06-01', lat: -7.112, lng: -34.861 },
    ],
    neighborhood_pois: null,
    amenities: [],
    in_gated_community: false,
    created_at: '2026-06-01T10:00:00Z',
    ...over,
  } as ValuationRecord
}

describe('LiveValuationHero', () => {
  it('mostra o valor de mercado e o gauge', () => {
    render(<LiveValuationHero record={makeRecord()} mode="static" />)
    expect(screen.getByText(/R\$\s?487\.300/)).toBeInTheDocument()
    expect(screen.getByTestId('confidence-gauge')).toHaveAttribute('data-pct', '82')
  })

  it('renderiza o mapa quando há coordenadas do alvo', () => {
    render(<LiveValuationHero record={makeRecord()} mode="static" />)
    expect(screen.getByTestId('map')).toBeInTheDocument()
  })

  it('oculta o mapa quando o alvo não tem coordenadas', () => {
    const { container } = render(<LiveValuationHero record={makeRecord({ lat: null, lng: null })} mode="static" />)
    expect(container.querySelector('[data-testid="map"]')).toBeNull()
  })

  it('mode=reveal mostra CTA que chama onSeeReport', () => {
    const onSee = vi.fn()
    render(<LiveValuationHero record={makeRecord()} mode="reveal" onSeeReport={onSee} />)
    fireEvent.click(screen.getByRole('button', { name: /laudo completo/i }))
    expect(onSee).toHaveBeenCalledOnce()
  })

  it('mode=static não mostra CTA', () => {
    render(<LiveValuationHero record={makeRecord()} mode="static" />)
    expect(screen.queryByRole('button', { name: /laudo completo/i })).toBeNull()
  })
})
