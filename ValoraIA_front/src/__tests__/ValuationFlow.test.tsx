import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ValuationFlow from '../components/ValuationFlow'

const { mockValuationResult } = vi.hoisted(() => ({
  mockValuationResult: {
    id: 'val_new123',
    address: 'Av. Paulista, 1000, Bela Vista, São Paulo, SP',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    property_type: 'apartment' as const,
    area_m2: 120,
    bedrooms: 3,
    bathrooms: 2,
    parking_spots: 2,
    amenities: ['Piscina', 'Academia'],
    price_range_min_brl: 950000,
    price_range_max_brl: 1050000,
    recommended_listing_price_brl: 1000000,
    confidence_score: 90,
    price_factors: [] as { label: string; score: number }[],
    comparables: [] as { address: string; neighborhood: string; price_brl: number; area_m2: number; bedrooms: number | null; price_m2_brl: number; status: 'sold' | 'listed'; transaction_date: string; source_url?: string; images?: string[]; amenities?: string[] }[],
    created_at: '2025-05-01T10:00:00Z',
  },
}))

const createValuationMock = vi.fn().mockResolvedValue(mockValuationResult)

vi.mock('../api', () => ({
  createValuation: vi.fn().mockResolvedValue(mockValuationResult),
  getValuation: vi.fn(),
  getDashboardMetrics: vi.fn(),
  getDashboardValuations: vi.fn(),
  getMarketTrend: vi.fn(),
}))

import { createValuation } from '../api'

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/nova-avaliacao']}>
      <ValuationFlow />
    </MemoryRouter>
  )
}

async function fillStep0AndAdvance() {
  const addressInput = screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB')
  const areaInput = screen.getByPlaceholderText('ex. 98')

  fireEvent.change(addressInput, { target: { value: 'Av. Paulista, 1000, São Paulo, SP' } })
  fireEvent.change(areaInput, { target: { value: '120' } })

  const continuarBtn = screen.getByText('Continuar')
  await act(async () => {
    fireEvent.click(continuarBtn)
  })
}

describe('ValuationFlow', () => {
  it('renderiza o título da página', () => {
    renderFlow()
    expect(screen.getByText('Nova Avaliação')).toBeInTheDocument()
    expect(screen.getByText('Insira os detalhes do imóvel e deixe a IA determinar o preço ideal.')).toBeInTheDocument()
  })

  it('renderiza os indicadores de passo', () => {
    renderFlow()
    expect(screen.getByText('Detalhes do Imóvel')).toBeInTheDocument()
    expect(screen.getByText('Comodidades')).toBeInTheDocument()
    expect(screen.getByText('Revisão & Preço')).toBeInTheDocument()
  })

  it('começa no passo 0 com formulário de detalhes', () => {
    renderFlow()
    expect(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ex. 98')).toBeInTheDocument()
  })

  it('botão Continuar fica desabilitado sem endereço', () => {
    renderFlow()
    const btn = screen.getByText('Continuar')
    expect(btn).toBeDisabled()
  })

  it('botão Continuar fica desabilitado sem área', () => {
    renderFlow()
    fireEvent.change(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB'), {
      target: { value: 'Rua Teste, 123' },
    })
    const btn = screen.getByText('Continuar')
    expect(btn).toBeDisabled()
  })

  it('botão Continuar fica habilitado com endereço e área preenchidos', () => {
    renderFlow()
    fireEvent.change(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB'), {
      target: { value: 'Rua Teste, 123' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex. 98'), {
      target: { value: '100' },
    })
    const btn = screen.getByText('Continuar')
    expect(btn).not.toBeDisabled()
  })

  it('navega para passo 1 após preencher passo 0', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    expect(screen.getByText('Selecione as Comodidades')).toBeInTheDocument()
  })

  it('passo 1 exibe amenities para seleção', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    expect(screen.getByText('Piscina')).toBeInTheDocument()
    expect(screen.getByText('Academia')).toBeInTheDocument()
    expect(screen.getByText('Elevador')).toBeInTheDocument()
  })

  it('navega para passo 2 (revisão) após passo 1', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    const continuarBtn = screen.getByText('Continuar')
    await act(async () => {
      fireEvent.click(continuarBtn)
    })
    expect(screen.getByText('Revisar Detalhes')).toBeInTheDocument()
  })

  it('passo 2 exibe todos os dados preenchidos', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await act(async () => {
      fireEvent.click(screen.getByText('Continuar'))
    })
    expect(screen.getByText('Av. Paulista, 1000, São Paulo, SP')).toBeInTheDocument()
    expect(screen.getByText('120m²')).toBeInTheDocument()
  })

  it('exibe o texto do botão de submit na revisão', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await act(async () => {
      fireEvent.click(screen.getByText('Continuar'))
    })
    expect(screen.getByText('✦ Gerar Avaliação IA')).toBeInTheDocument()
  })

  it('chama a API ao submeter e exibe processing', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await act(async () => {
      fireEvent.click(screen.getByText('Continuar'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('✦ Gerar Avaliação IA'))
    })

    expect(createValuation).toHaveBeenCalledWith({
      address: 'Av. Paulista, 1000, São Paulo, SP',
      property_type: 'apartment',
      area_m2: 120,
      bedrooms: 2,
      bathrooms: 1,
      parking_spots: 1,
      amenities: undefined,
    })

    expect(screen.getByText('A IA está analisando o imóvel...')).toBeInTheDocument()
  })

  it('exibe mensagem de erro da API', async () => {
    vi.mocked(createValuation).mockRejectedValueOnce(new Error('Endereço não encontrado'))
    renderFlow()

    await fillStep0AndAdvance()
    await act(async () => {
      fireEvent.click(screen.getByText('Continuar'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('✦ Gerar Avaliação IA'))
    })

    await waitFor(() => {
      expect(screen.getByText('Endereço não encontrado')).toBeInTheDocument()
    })
  })

  it('botão Cancelar no passo 0 é exibido', () => {
    renderFlow()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
  })

  it('botão Voltar aparece nos passos > 0', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    expect(screen.getByText('Voltar')).toBeInTheDocument()
  })

  it('botão Voltar retorna ao passo anterior', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    fireEvent.click(screen.getByText('Voltar'))
    expect(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB')).toBeInTheDocument()
  })
})
