import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import ComparablesMap from '../components/ComparablesMap'
import type { FrontendComparable, NeighborhoodData } from '../types'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tiles" />,
  CircleMarker: ({ children, pathOptions }: { children?: ReactNode; pathOptions?: { className?: string } }) => (
    <div data-testid="marker" data-cls={pathOptions?.className}>{children}</div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

const SUBJECT = { lat: -7.11, lng: -34.86 }

const COMPS: FrontendComparable[] = [
  { address: 'A', neighborhood: 'Manaíra', price_brl: 500000, area_m2: 100, bedrooms: 3, price_m2_brl: 5000, status: 'listed', transaction_date: '2026-06-01', source_url: 'https://x/1', lat: -7.112, lng: -34.861 },
  { address: 'B', neighborhood: 'Tambaú', price_brl: 600000, area_m2: 120, bedrooms: 3, price_m2_brl: 5000, status: 'listed', transaction_date: '2026-06-01', lat: null, lng: null },
]

const POIS: NeighborhoodData = {
  totalScore: 0.7,
  pois: [{ category: 'supermarket', label: 'Supermercados', score: 0.9, weight: 0.15, places: [
    { name: 'Mercado', vicinity: 'Rua A', type: 'supermarket', distance_m: 200, lat: -7.113, lng: -34.862 },
  ] }],
}

describe('ComparablesMap', () => {
  it('retorna null quando o alvo não tem coordenadas', () => {
    const { container } = render(<ComparablesMap subject={{ lat: null, lng: null }} comparables={COMPS} pois={POIS} />)
    expect(container.querySelector('[data-testid="map"]')).toBeNull()
  })

  it('renderiza marcador do alvo + apenas comparáveis com coords + POIs', () => {
    render(<ComparablesMap subject={SUBJECT} comparables={COMPS} pois={POIS} />)
    const markers = screen.getAllByTestId('marker')
    // 1 alvo + 1 comparável com coord (B é descartado) + 1 POI = 3
    expect(markers).toHaveLength(3)
  })

  it('popup do comparável mostra preço por m²', () => {
    render(<ComparablesMap subject={SUBJECT} comparables={COMPS} pois={null} />)
    expect(screen.getByText(/5\.000/)).toBeInTheDocument()
  })
})
