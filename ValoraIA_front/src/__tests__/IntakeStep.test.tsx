import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import IntakeStep from '../components/IntakeStep'
import type { ExtractionResult } from '../types'

vi.mock('../api', () => ({
  extractProperty: vi.fn().mockResolvedValue({
    summary: 'Apartamento de 3 quartos.',
    fields: { area_m2: { value: 98, confidence: 0.9 } },
    amenities: [],
    gaps: ['address', 'property_type'],
  }),
}))

describe('IntakeStep', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onExtracted: (result: ExtractionResult) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onSkip: () => void

  beforeEach(() => {
    onExtracted = vi.fn()
    onSkip = vi.fn()
    vi.clearAllMocks()
    // Mock MediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }) },
      writable: true,
    })
    // Mock MediaRecorder
    const MockMediaRecorder = class {
      ondataavailable: ((e: { data: Blob }) => void) | null = null
      onstop: (() => void) | null = null
      stream = { getTracks: () => [{ stop: vi.fn() }] }
      start() { this.ondataavailable?.({ data: new Blob(['a']) }) }
      stop() { this.onstop?.() }
      static isTypeSupported(mime: string) { return mime === 'audio/webm' }
    }
    vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  })

  it('renderiza botão de gravar e botão Pular', () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    expect(screen.getByLabelText('Iniciar gravação')).toBeDefined()
    expect(screen.getByText('Pular')).toBeDefined()
  })

  it('clique em Pular chama onSkip', () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Pular'))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('modo texto: textarea visível ao clicar em Texto', () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Texto'))
    expect(screen.getByRole('textbox')).toBeDefined()
  })

  it('modo texto: submit chama onExtracted com resultado', async () => {
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Texto'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Apartamento 3 quartos 98m²' } })
    fireEvent.click(screen.getByText('Extrair dados'))
    await waitFor(() => expect(onExtracted).toHaveBeenCalledOnce())
  })

  it('microfone negado: mostra aviso e muda para modo texto', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
    })
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByLabelText('Iniciar gravação'))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeDefined())
    expect(screen.getByText(/Microfone não disponível/)).toBeDefined()
  })

  it('grava áudio e chama onExtracted com resultado', async () => {
    const { extractProperty } = await import('../api')
    vi.mocked(extractProperty).mockResolvedValueOnce({
      summary: 'Casa gravada.',
      fields: { property_type: { value: 'house', confidence: 0.9 } },
      amenities: [],
      gaps: [],
    })
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)

    // Start recording (async: getUserMedia resolves before state updates)
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Iniciar gravação'))
    })

    // Stop recording
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Parar gravação'))
    })

    await waitFor(() => expect(onExtracted).toHaveBeenCalledOnce())
    expect(onExtracted).toHaveBeenCalledWith(expect.objectContaining({
      summary: 'Casa gravada.',
    }))
  })

  it('erro de API: mostra mensagem de erro e link para pular', async () => {
    const { extractProperty } = await import('../api')
    vi.mocked(extractProperty).mockRejectedValueOnce(new Error('Serviço indisponível'))
    render(<IntakeStep onExtracted={onExtracted} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Texto'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'texto qualquer' } })
    fireEvent.click(screen.getByText('Extrair dados'))
    await waitFor(() => expect(screen.getByText(/Serviço indisponível/)).toBeDefined())
  })
})
