import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExtractionCard from '../components/ExtractionCard'
import type { ExtractionResult } from '../types'

const FULL_RESULT: ExtractionResult = {
  summary: 'Apartamento de 3 quartos em Manaíra com piscina.',
  fields: {
    address: { value: 'Av. Epitácio Pessoa, 1000', confidence: 0.9 },
    property_type: { value: 'apartment', confidence: 0.9 },
    area_m2: { value: 98, confidence: 0.9 },
    bedrooms: { value: 3, confidence: 0.7 },
    conservation_state: { value: 'regular', confidence: 0.4 },
  },
  amenities: [{ item: 'piscina', confidence: 0.9 }],
  gaps: ['parking_spaces'],
}

describe('ExtractionCard', () => {
  it('exibe o summary da IA', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Apartamento de 3 quartos em Manaíra com piscina.')).toBeDefined()
  })

  it('exibe campos extraídos com label PT-BR', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Endereço')).toBeDefined()
    expect(screen.getByText('Tipo')).toBeDefined()
    expect(screen.getByText('Área (m²)')).toBeDefined()
    expect(screen.getByText('Apartamento')).toBeDefined()
  })

  it('badge Alta para confidence >= 0.75', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    const badges = screen.getAllByText('Alta')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('badge Baixa para confidence < 0.5', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Baixa')).toBeDefined()
  })

  it('exibe chip de amenidade com label do catálogo', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Piscina')).toBeDefined()
  })

  it('exibe bloco âmbar de gaps com campos obrigatórios', () => {
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText(/Faltou informar/)).toBeDefined()
    expect(screen.getByText(/Vagas/)).toBeDefined()
  })

  it('sem gaps: bloco âmbar não aparece', () => {
    const noGaps: ExtractionResult = { ...FULL_RESULT, gaps: [] }
    render(<ExtractionCard result={noGaps} onUse={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.queryByText(/Faltou informar/)).toBeNull()
  })

  it('botão "Usar e revisar" chama onUse', () => {
    const onUse = vi.fn()
    render(<ExtractionCard result={FULL_RESULT} onUse={onUse} onRedo={vi.fn()} />)
    fireEvent.click(screen.getByText('Usar e revisar'))
    expect(onUse).toHaveBeenCalledOnce()
  })

  it('botão "Regravar" chama onRedo', () => {
    const onRedo = vi.fn()
    render(<ExtractionCard result={FULL_RESULT} onUse={vi.fn()} onRedo={onRedo} />)
    fireEvent.click(screen.getByText('Regravar'))
    expect(onRedo).toHaveBeenCalledOnce()
  })
})
