import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConfidenceGauge from '../components/ConfidenceGauge'

describe('ConfidenceGauge', () => {
  it('normaliza score 0..1 para percentual', () => {
    render(<ConfidenceGauge score={0.82} />)
    const svg = screen.getByTestId('confidence-gauge')
    expect(svg).toHaveAttribute('data-pct', '82')
  })

  it('aceita score já em 0..100', () => {
    render(<ConfidenceGauge score={82} />)
    expect(screen.getByTestId('confidence-gauge')).toHaveAttribute('data-pct', '82')
  })

  it('não renderiza nada quando score é null', () => {
    const { container } = render(<ConfidenceGauge score={null} />)
    expect(container.querySelector('[data-testid="confidence-gauge"]')).toBeNull()
  })
})
