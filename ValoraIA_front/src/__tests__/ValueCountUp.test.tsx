import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ValueCountUp from '../components/ValueCountUp'

describe('ValueCountUp', () => {
  it('renderiza o valor final formatado em BRL quando animate=false', () => {
    render(<ValueCountUp value={487300} animate={false} />)
    expect(screen.getByText(/R\$\s?487\.300/)).toBeInTheDocument()
  })

  it('renderiza 0 formatado quando value é 0', () => {
    render(<ValueCountUp value={0} animate={false} />)
    expect(screen.getByText(/R\$\s?0/)).toBeInTheDocument()
  })
})
