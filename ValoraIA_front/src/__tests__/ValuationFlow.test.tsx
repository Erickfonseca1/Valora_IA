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

vi.mock('../api', () => ({
  createValuation: vi.fn().mockResolvedValue(mockValuationResult),
  getValuation: vi.fn(),
  getDashboardMetrics: vi.fn(),
  getDashboardValuations: vi.fn(),
  getMarketTrend: vi.fn(),
  uploadPhotos: vi.fn().mockResolvedValue({ urls: [] }),
  analyzePhotos: vi.fn().mockResolvedValue({
    padrao_construtivo: 'Médio',
    estado_conservacao_sugerido: 'B',
    comodidades_detectadas: [],
  }),
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

// After fillStep0AndAdvance, we are on step 1 (Conservação & Fotos).
// This helper advances through that photo step to reach step 2 (Revisão & Envio).
async function advanceThroughPhotoStep() {
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
    expect(screen.getByText('Conservação & Fotos')).toBeInTheDocument()
    expect(screen.getByText('Revisão & Envio')).toBeInTheDocument()
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

  it('navega para passo 1 (Conservação & Fotos) após preencher passo 0', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    expect(screen.getByText('Fotos do Imóvel')).toBeInTheDocument()
  })

  it('navega para passo 2 (revisão) após passo 1', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await advanceThroughPhotoStep()
    expect(screen.getByText('Revisar Detalhes')).toBeInTheDocument()
  })

  it('passo 0 exibe comodidades para seleção', () => {
    renderFlow()
    expect(screen.getByText('Comodidades & Diferenciais')).toBeInTheDocument()
    // Piscina appears in both "interno" and "condo" scopes for apartment
    expect(screen.getAllByText('Piscina').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Academia').length).toBeGreaterThan(0)
    expect(screen.getByText('Elevador')).toBeInTheDocument()
  })

  it('passo 2 exibe todos os dados preenchidos', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await advanceThroughPhotoStep()
    expect(screen.getByText('Av. Paulista, 1000, São Paulo, SP')).toBeInTheDocument()
    expect(screen.getByText('120m²')).toBeInTheDocument()
  })

  it('exibe o texto do botão de submit na revisão', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await advanceThroughPhotoStep()
    expect(screen.getByText('✦ Gerar Avaliação IA')).toBeInTheDocument()
  })

  it('chama a API ao submeter e exibe processing', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await advanceThroughPhotoStep()
    await act(async () => {
      fireEvent.click(screen.getByText('✦ Gerar Avaliação IA'))
    })

    expect(createValuation).toHaveBeenCalledWith(expect.objectContaining({
      address: 'Av. Paulista, 1000, São Paulo, SP',
      property_type: 'apartment',
      area_m2: 120,
    }))

    expect(screen.getByText('A IA está analisando o imóvel...')).toBeInTheDocument()
  })

  it('exibe mensagem de erro da API', async () => {
    vi.mocked(createValuation).mockRejectedValueOnce(new Error('Endereço não encontrado'))
    renderFlow()

    await fillStep0AndAdvance()
    await advanceThroughPhotoStep()
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

  it('exibe campos de quartos/banheiros/vagas para Apartamento', () => {
    renderFlow()
    expect(screen.getByText('Quartos')).toBeInTheDocument()
    expect(screen.getByText('Banheiros')).toBeInTheDocument()
    expect(screen.getByText('Vagas')).toBeInTheDocument()
  })

  it('exibe mesmos campos para Casa', () => {
    renderFlow()
    fireEvent.click(screen.getByText('Casa'))
    expect(screen.getByText('Quartos')).toBeInTheDocument()
    expect(screen.getByText('Banheiros')).toBeInTheDocument()
    expect(screen.getByText('Vagas')).toBeInTheDocument()
  })

  it('Comercial não mostra Quartos, Banheiros nem Vagas', () => {
    renderFlow()
    fireEvent.click(screen.getByText('Comercial'))
    expect(screen.queryByText('Quartos')).not.toBeInTheDocument()
    expect(screen.queryByText('Banheiros')).not.toBeInTheDocument()
    expect(screen.queryByText('Vagas')).not.toBeInTheDocument()
  })

  it('Terreno não mostra Quartos, Banheiros nem Vagas', () => {
    renderFlow()
    fireEvent.click(screen.getByText('Terreno'))
    expect(screen.queryByText('Quartos')).not.toBeInTheDocument()
    expect(screen.queryByText('Banheiros')).not.toBeInTheDocument()
    expect(screen.queryByText('Vagas')).not.toBeInTheDocument()
  })

  it('Terreno envia bedrooms/bathrooms/parking como undefined', async () => {
    renderFlow()

    fireEvent.click(screen.getByText('Terreno'))
    fireEvent.change(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB'), {
      target: { value: 'Loteamento Alphaville, Barueri, SP' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex. 98'), {
      target: { value: '500' },
    })

    // Step 0 → Step 1 (Conservação & Fotos)
    await act(async () => { fireEvent.click(screen.getByText('Continuar')) })
    // Step 1 → Step 2 (Revisão)
    await act(async () => { fireEvent.click(screen.getByText('Continuar')) })
    await act(async () => { fireEvent.click(screen.getByText('✦ Gerar Avaliação IA')) })

    expect(createValuation).toHaveBeenCalledWith(expect.objectContaining({
      address: 'Loteamento Alphaville, Barueri, SP',
      property_type: 'land',
      area_m2: 500,
    }))
  })

  it('review step não exibe campos ocultos para Terreno', async () => {
    renderFlow()

    fireEvent.click(screen.getByText('Terreno'))
    fireEvent.change(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB'), {
      target: { value: 'Rua Teste, 100' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex. 98'), {
      target: { value: '300' },
    })

    // Step 0 → Step 1 (Conservação & Fotos)
    await act(async () => { fireEvent.click(screen.getByText('Continuar')) })
    // Step 1 → Step 2 (Revisão)
    await act(async () => { fireEvent.click(screen.getByText('Continuar')) })

    expect(screen.queryByText('Quartos')).not.toBeInTheDocument()
    expect(screen.queryByText('Banheiros')).not.toBeInTheDocument()
    expect(screen.queryByText('Vagas')).not.toBeInTheDocument()
    expect(screen.getByText('300m²')).toBeInTheDocument()
  })

  it('exibe campos de conservação no passo 0', () => {
    renderFlow()
    expect(screen.getByText(/Estado de Conservação/i)).toBeTruthy()
    expect(screen.getByText(/Imóvel de esquina/i)).toBeTruthy()
    expect(screen.getByText(/Topografia/i)).toBeTruthy()
  })

  it('exibe etapa de fotos após avançar do passo 0', async () => {
    renderFlow()
    // Fill required fields in step 0
    const addressInput = screen.getByPlaceholderText(/Epitácio/i)
    const areaInput = screen.getByPlaceholderText(/ex\. 98/i)
    fireEvent.change(addressInput, { target: { value: 'Rua Teste, 100, São Paulo, SP' } })
    fireEvent.change(areaInput, { target: { value: '80' } })

    // Click continue
    const btn = screen.getByRole('button', { name: /continuar/i })
    await act(async () => { fireEvent.click(btn) })

    // Should now be on Conservação & Fotos step
    expect(screen.getByText(/Fotos do Imóvel/i)).toBeTruthy()
  })

  it('mostra comodidades de condomínio para apartamento e oculta para casa sem flag', async () => {
    render(<MemoryRouter><ValuationFlow /></MemoryRouter>)
    // apartment é default → "Do condomínio" visível
    expect(screen.getByText('Do condomínio')).toBeInTheDocument()
    // troca para Casa → some
    fireEvent.click(screen.getByText('Casa'))
    expect(screen.queryByText('Do condomínio')).not.toBeInTheDocument()
    // marca condomínio fechado → reaparece
    fireEvent.click(screen.getByLabelText('Imóvel em condomínio fechado'))
    expect(screen.getByText('Do condomínio')).toBeInTheDocument()
  })
})
