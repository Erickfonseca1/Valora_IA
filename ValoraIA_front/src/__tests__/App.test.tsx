import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  }
})

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  )
}

describe('App', () => {
  it('renderiza Dashboard na rota /', () => {
    renderApp('/')
    expect(screen.getByText('Painel')).toBeInTheDocument()
  })

  it('renderiza ValuationFlow na rota /nova-avaliacao', () => {
    renderApp('/nova-avaliacao')
    expect(screen.getAllByText('Nova Avaliação').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Detalhes do Imóvel')).toBeInTheDocument()
  })

  it('renderiza Report na rota /resultado/:id', () => {
    renderApp('/resultado/val_abc123')
    expect(screen.getByText('Painel')).toBeInTheDocument()
  })

  it('redireciona rota desconhecida para /', () => {
    renderApp('/rota-inexistente')
    expect(screen.getByText('Painel')).toBeInTheDocument()
  })

  it('sempre renderiza o AppShell com sidebar', () => {
    renderApp('/')
    expect(screen.getByText('Valora AI')).toBeInTheDocument()
    expect(screen.getByText('Agente de Precificação')).toBeInTheDocument()
    expect(screen.getByText('Edizio Peixoto')).toBeInTheDocument()
  })
})
