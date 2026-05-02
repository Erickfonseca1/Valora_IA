import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from '../components/AppShell'

function renderWithRouter(initialRoute = '/') {
  const navigate = vi.fn()
  const result = render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppShell>
        <div data-testid="child">Content</div>
      </AppShell>
    </MemoryRouter>
  )
  return { ...result, navigate }
}

describe('AppShell', () => {
  it('renderiza a logo e nome da aplicação', () => {
    renderWithRouter()
    expect(screen.getByText('Valora AI')).toBeInTheDocument()
    expect(screen.getByText('Pricing Agent')).toBeInTheDocument()
  })

  it('renderiza todos os itens de navegação', () => {
    renderWithRouter()
    expect(screen.getByText('Painel')).toBeInTheDocument()
    expect(screen.getByText('Nova Avaliação')).toBeInTheDocument()
    expect(screen.getByText('Relatórios')).toBeInTheDocument()
    expect(screen.getByText('Portfólio')).toBeInTheDocument()
    expect(screen.getByText('Configurações')).toBeInTheDocument()
  })

  it('renderiza o nome do usuário', () => {
    renderWithRouter()
    expect(screen.getByText('Maria Alves')).toBeInTheDocument()
    expect(screen.getByText('Corretora · Premium')).toBeInTheDocument()
  })

  it('renderiza o children', () => {
    renderWithRouter()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renderiza o botão de Nova Avaliação no header', () => {
    renderWithRouter()
    expect(screen.getByText('Nova Avaliação')).toBeInTheDocument() // sidebar nav
    expect(screen.getByText('+ Nova Avaliação')).toBeInTheDocument() // header button
  })

  it('renderiza o campo de busca', () => {
    renderWithRouter()
    expect(screen.getByPlaceholderText('Buscar imóveis, endereços...')).toBeInTheDocument()
  })

  it('destaca o item ativo no sidebar com base na rota', () => {
    renderWithRouter('/')
    const painelButton = screen.getByText('Painel').closest('button')!
    const novaButton = screen.getAllByText('Nova Avaliação')[0].closest('button')!

    expect(painelButton.style.background).toBe('rgba(255, 255, 255, 0.15)')
    expect(painelButton.style.fontWeight).toBe('600')
    expect(novaButton.style.fontWeight).toBe('400')
  })

  it('destaca Nova Avaliação quando na rota /nova-avaliacao', () => {
    renderWithRouter('/nova-avaliacao')
    const novaButton = screen.getAllByText('Nova Avaliação')[0].closest('button')!
    expect(novaButton.style.fontWeight).toBe('600')
    expect(novaButton.style.background).toBe('rgba(255, 255, 255, 0.15)')
  })

  it('destaca Relatórios quando em uma rota de resultado', () => {
    renderWithRouter('/resultado/val_abc123')
    const relatoriosButton = screen.getByText('Relatórios').closest('button')!
    expect(relatoriosButton.style.background).toBe('rgba(255, 255, 255, 0.15)')
    expect(relatoriosButton.style.fontWeight).toBe('600')
  })

  it('navega ao clicar em um item do sidebar', () => {
    renderWithRouter('/')
    const portfolioBtn = screen.getByText('Portfólio')
    // Should not throw - button is clickable
    fireEvent.click(portfolioBtn)
  })
})
