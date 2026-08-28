import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import ValuationFlow from '../components/ValuationFlow'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tiles" />,
  CircleMarker: ({ children }: { children?: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

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
    static_market_value_brl: 1000000,
    confidence_score: 90,
    lat: null,
    lng: null,
    price_factors: [] as { label: string; score: number }[],
    comparables: [] as { address: string; neighborhood: string; price_brl: number; area_m2: number; bedrooms: number | null; price_m2_brl: number; status: 'sold' | 'listed'; transaction_date: string; source_url?: string; images?: string[]; amenities?: string[]; lat?: number | null; lng?: number | null }[],
    created_at: '2025-05-01T10:00:00Z',
    conservation_state: 'regular',
    terrain_slope: 'plano',
    street_level: 'no_nivel',
    is_corner: false,
  },
}))

vi.mock('../api', () => ({
  createValuation: vi.fn().mockResolvedValue(mockValuationResult),
  getValuation: vi.fn(),
  getDashboardMetrics: vi.fn(),
  getDashboardValuations: vi.fn(),
  getMarketTrend: vi.fn(),
  uploadPhotos: vi.fn().mockResolvedValue({ urls: [] }),
  uploadPhotosByRoom: vi.fn().mockResolvedValue([]),
  analyzePhotos: vi.fn().mockResolvedValue({
    padrao_construtivo: 'Médio',
    estado_conservacao_sugerido: 'B',
    comodidades_detectadas: [],
  }),
  extractProperty: vi.fn().mockResolvedValue({}),
}))

import { createValuation, analyzePhotos, uploadPhotosByRoom } from '../api'

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/nova-avaliacao']}>
      <ValuationFlow />
    </MemoryRouter>
  )
}

// Step 0 is now IntakeStep — skip it to land on step 1 (Detalhes do Imóvel)
async function skipIntakeStep() {
  const pularBtn = screen.getByText('Pular')
  await act(async () => {
    fireEvent.click(pularBtn)
  })
}

// Fill step 1 (Detalhes do Imóvel) and advance to step 2 (Conservação & Fotos)
async function fillStep1AndAdvance() {
  const addressInput = screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB')
  const areaInput = screen.getByPlaceholderText('ex. 98')

  fireEvent.change(addressInput, { target: { value: 'Av. Paulista, 1000, São Paulo, SP' } })
  fireEvent.change(areaInput, { target: { value: '120' } })

  const continuarBtn = screen.getByText('Continuar')
  await act(async () => {
    fireEvent.click(continuarBtn)
  })
}

// Combined: skip IntakeStep + fill details step
async function fillStep0AndAdvance() {
  await skipIntakeStep()
  await fillStep1AndAdvance()
}

// After fillStep0AndAdvance, we are on step 2 (Conservação & Fotos).
// This helper advances through that photo step to reach step 3 (Revisão & Envio).
async function advanceThroughPhotoStep() {
  const continuarBtn = screen.getByText('Continuar')
  await act(async () => {
    fireEvent.click(continuarBtn)
  })
}

describe('ValuationFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o título da página', () => {
    renderFlow()
    expect(screen.getByText('Nova Avaliação')).toBeInTheDocument()
    expect(screen.getByText('Insira os detalhes do imóvel e deixe a IA determinar o preço ideal.')).toBeInTheDocument()
  })

  it('renderiza os indicadores de passo', () => {
    renderFlow()
    expect(screen.getByText('Entrada por IA')).toBeInTheDocument()
    expect(screen.getByText('Detalhes do Imóvel')).toBeInTheDocument()
    expect(screen.getByText('Conservação & Fotos')).toBeInTheDocument()
    expect(screen.getByText('Revisão & Envio')).toBeInTheDocument()
  })

  it('começa no passo 0 com IntakeStep (Entrada por IA)', () => {
    renderFlow()
    expect(screen.getByText('Descreva o imóvel')).toBeInTheDocument()
    expect(screen.getByText('Pular')).toBeInTheDocument()
  })

  it('passo 1 exibe formulário de detalhes após pular IntakeStep', async () => {
    renderFlow()
    await skipIntakeStep()
    expect(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ex. 98')).toBeInTheDocument()
  })

  it('botão Continuar fica desabilitado sem endereço no passo 1', async () => {
    renderFlow()
    await skipIntakeStep()
    const btn = screen.getByText('Continuar')
    expect(btn).toBeDisabled()
  })

  it('botão Continuar fica desabilitado sem área no passo 1', async () => {
    renderFlow()
    await skipIntakeStep()
    fireEvent.change(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB'), {
      target: { value: 'Rua Teste, 123' },
    })
    const btn = screen.getByText('Continuar')
    expect(btn).toBeDisabled()
  })

  it('botão Continuar fica habilitado com endereço e área preenchidos no passo 1', async () => {
    renderFlow()
    await skipIntakeStep()
    fireEvent.change(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB'), {
      target: { value: 'Rua Teste, 123' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex. 98'), {
      target: { value: '100' },
    })
    const btn = screen.getByText('Continuar')
    expect(btn).not.toBeDisabled()
  })

  it('navega para passo 2 (Conservação & Fotos) após preencher passo 1', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    expect(screen.getByText('Fotos do Imóvel por Cômodo')).toBeInTheDocument()
  })

  it('navega para passo 3 (revisão) após passo 2', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await advanceThroughPhotoStep()
    expect(screen.getByText('Revisar Detalhes')).toBeInTheDocument()
  })

  it('passo 1 exibe comodidades para seleção', async () => {
    renderFlow()
    await skipIntakeStep()
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

  it('chama a API ao submeter e revela o herói com o valor', async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId('live-hero')).toBeInTheDocument()
    })
  })

  it('após submeter, o CTA do herói navega para o laudo', async () => {
    renderFlow()
    await fillStep0AndAdvance()
    await advanceThroughPhotoStep()
    await act(async () => {
      fireEvent.click(screen.getByText('✦ Gerar Avaliação IA'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('live-hero')).toBeInTheDocument()
    })

    await act(async () => {
       fireEvent.click(screen.getByText('Ver estudo completo →'))
    })
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

  it('nav não exibe botões no passo 0 (IntakeStep)', () => {
    renderFlow()
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument()
    expect(screen.queryByText('Voltar')).not.toBeInTheDocument()
    expect(screen.queryByText('Continuar')).not.toBeInTheDocument()
  })

  it('botão Voltar aparece nos passos > 0', async () => {
    renderFlow()
    await skipIntakeStep()
    expect(screen.getByText('Voltar')).toBeInTheDocument()
  })

  it('botão Voltar retorna ao IntakeStep', async () => {
    renderFlow()
    await skipIntakeStep()
    fireEvent.click(screen.getByText('Voltar'))
    expect(screen.getByText('Descreva o imóvel')).toBeInTheDocument()
    expect(screen.getByText('Pular')).toBeInTheDocument()
  })

  it('exibe campos de quartos/banheiros/vagas para Apartamento no passo 1', async () => {
    renderFlow()
    await skipIntakeStep()
    expect(screen.getByText('Quartos')).toBeInTheDocument()
    expect(screen.getByText('Banheiros')).toBeInTheDocument()
    expect(screen.getByText('Vagas')).toBeInTheDocument()
  })

  it('exibe mesmos campos para Casa no passo 1', async () => {
    renderFlow()
    await skipIntakeStep()
    fireEvent.click(screen.getByText('Casa'))
    expect(screen.getByText('Quartos')).toBeInTheDocument()
    expect(screen.getByText('Banheiros')).toBeInTheDocument()
    expect(screen.getByText('Vagas')).toBeInTheDocument()
  })

  it('Comercial e Terreno ficam desabilitados (em breve)', async () => {
    renderFlow()
    await skipIntakeStep()
    const comercialBtn = screen.getByText('Comercial').closest('button') as HTMLButtonElement
    const terrenoBtn = screen.getByText('Terreno').closest('button') as HTMLButtonElement
    expect(comercialBtn.disabled).toBe(true)
    expect(terrenoBtn.disabled).toBe(true)
    // Clicar não altera o tipo selecionado (apartamento é o default):
    // "Do condomínio" continua visível (só aparece para apartamento)
    fireEvent.click(terrenoBtn)
    fireEvent.click(comercialBtn)
    expect(screen.getByText('Do condomínio')).toBeInTheDocument()
  })

  it('review step exibe os dados do imóvel (apartamento default)', async () => {
    renderFlow()

    // Step 0 → Step 1 (skip IntakeStep)
    await act(async () => { fireEvent.click(screen.getByText('Pular')) })

    fireEvent.change(screen.getByPlaceholderText('Ex: Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB'), {
      target: { value: 'Rua Teste, 100' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex. 98'), {
      target: { value: '300' },
    })

    // Step 1 → Step 2 (Conservação & Fotos)
    await act(async () => { fireEvent.click(screen.getByText('Continuar')) })
    // Step 2 → Step 3 (Revisão)
    await act(async () => { fireEvent.click(screen.getByText('Continuar')) })

    expect(screen.getByText('300m²')).toBeInTheDocument()
  })

  it('exibe campos de conservação no passo 1', async () => {
    renderFlow()
    await skipIntakeStep()
    expect(screen.getByText(/Estado de Conservação/i)).toBeTruthy()
    expect(screen.getByText(/Imóvel de esquina/i)).toBeTruthy()
    expect(screen.getByText(/Topografia/i)).toBeTruthy()
  })

  it('exibe etapa de fotos após avançar do passo 1', async () => {
    renderFlow()
    await skipIntakeStep()

    // Fill required fields in step 1
    const addressInput = screen.getByPlaceholderText(/Epitácio/i)
    const areaInput = screen.getByPlaceholderText(/ex\. 98/i)
    fireEvent.change(addressInput, { target: { value: 'Rua Teste, 100, São Paulo, SP' } })
    fireEvent.change(areaInput, { target: { value: '80' } })

    // Click continue
    const btn = screen.getByRole('button', { name: /continuar/i })
    await act(async () => { fireEvent.click(btn) })

    // Should now be on Conservação & Fotos step
    expect(screen.getByText(/Fotos do Imóvel por Cômodo/i)).toBeTruthy()
  })

  it('mostra comodidades de condomínio para apartamento e oculta para casa sem flag', async () => {
    render(<MemoryRouter><ValuationFlow /></MemoryRouter>)
    await skipIntakeStep()
    // apartment é default → "Do condomínio" visível
    expect(screen.getByText('Do condomínio')).toBeInTheDocument()
    // troca para Casa → some
    fireEvent.click(screen.getByText('Casa'))
    expect(screen.queryByText('Do condomínio')).not.toBeInTheDocument()
    // marca condomínio fechado → reaparece
    fireEvent.click(screen.getByLabelText('Imóvel em condomínio fechado'))
    expect(screen.getByText('Do condomínio')).toBeInTheDocument()
  })

  it('envia fotos por cômodo sem análise de IA e avança para a revisão', async () => {
    const fakeFile = new File(['fake'], 'foto.jpg', { type: 'image/jpeg' })

    renderFlow()
    await fillStep0AndAdvance()

    // On step 2 (Conservação & Fotos), add a photo to the active room
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [fakeFile] } })
    })

    // Advance through photo step → uploads, does NOT call analyzePhotos
    await act(async () => {
      fireEvent.click(screen.getByText('Continuar'))
    })

    expect(uploadPhotosByRoom).toHaveBeenCalled()
    expect(analyzePhotos).not.toHaveBeenCalled()
    expect(screen.getByText('Revisar Detalhes')).toBeInTheDocument()
  })

  it('pula a etapa de fotos sem enviar arquivos', async () => {
    const fakeFile = new File(['fake'], 'foto.jpg', { type: 'image/jpeg' })

    renderFlow()
    await fillStep0AndAdvance()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [fakeFile] } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Pular etapa (fotos opcionais)'))
    })

    expect(uploadPhotosByRoom).not.toHaveBeenCalled()
    expect(screen.getByText('Revisar Detalhes')).toBeInTheDocument()
  })
})
