import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from '../components/AppShell'

function renderWithRouter(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppShell>
        <div data-testid="child">Content</div>
      </AppShell>
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  it('renderiza a logo e nome da aplicação', () => {
    renderWithRouter()
    expect(screen.getAllByText('Valora AI').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Agente de Precificação').length).toBeGreaterThan(0)
  })

  it('renderiza todos os itens de navegação', () => {
    renderWithRouter()
    expect(screen.getAllByText('Painel').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nova Avaliação').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Relatórios').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Portfólio').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Configurações').length).toBeGreaterThan(0)
  })

  it('renderiza o nome do usuário', () => {
    renderWithRouter()
    expect(screen.getAllByText('Edizio Peixoto').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Corretor · Premium').length).toBeGreaterThan(0)
  })

  it('renderiza o children', () => {
    renderWithRouter()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renderiza o botão de Nova Avaliação no header', () => {
    renderWithRouter()
    expect(screen.getAllByText('Nova Avaliação').length).toBeGreaterThan(0)
    expect(screen.getByText('+ Nova Avaliação')).toBeInTheDocument()
  })

  it('renderiza o campo de busca', () => {
    renderWithRouter()
    expect(screen.getByText('+ Nova Avaliação')).toBeInTheDocument()
  })

  it('destaca o item ativo no sidebar com base na rota', () => {
    renderWithRouter('/')
    const painelButton = screen.getAllByText('Painel')[0].closest('button')!
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
    renderWithRouter('/relatorios')
    const relatoriosButton = screen.getAllByText('Relatórios')[0].closest('button')!
    expect(relatoriosButton.style.background).toBe('rgba(255, 255, 255, 0.15)')
    expect(relatoriosButton.style.fontWeight).toBe('600')
  })

  it('navega ao clicar em um item do sidebar', () => {
    renderWithRouter('/')
    const portfolioBtn = screen.getAllByText('Portfólio')[0]
    fireEvent.click(portfolioBtn)
  })
})
