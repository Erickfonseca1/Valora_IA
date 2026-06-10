import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ValueWaterfall, { buildWaterfallRows } from '../components/ValueWaterfall'
import type { HomogenizationFactors } from '../types'

const hf: HomogenizationFactors = {
  ensemble_ppm2: 5000,
  offer_factor: 0.9,
  typology_factor: 1.02,
  corner_factor: 1.05,
  slope_factor: 1.0,
  level_factor: 1.0,
  physical_factor: 1.05,
  amenity_internal: 1.06,
  amenity_condo: 1.0,
  amenity_proximo: 1.0,
  amenity_factor: 1.06,
  combined_factor: 1.113,
  ppm2_homogenized: 5565,
  area_m2: 100,
  market_value: 556500,
}

describe('buildWaterfallRows', () => {
  it('acumula até o ppm² homogeneizado', () => {
    const rows = buildWaterfallRows(hf)
    const last = rows[rows.length - 1]
    expect(last.runningPpm2).toBeCloseTo(hf.ppm2_homogenized, 2)
  })

  it('marca passo neutro quando multiplicador é 1', () => {
    const neutralHf = { ...hf, amenity_factor: 1.0 }
    const rows = buildWaterfallRows(neutralHf)
    const amenityRow = rows.find(r => r.key === 'amenity')!
    expect(amenityRow.neutral).toBe(true)
  })
})

describe('<ValueWaterfall>', () => {
  it('renderiza título e valor de mercado final', () => {
    render(<ValueWaterfall factors={hf} />)
    expect(screen.getByText(/Como Chegamos a Este Valor/i)).toBeInTheDocument()
    expect(screen.getByText(/556\.500/)).toBeInTheDocument()
  })
})
