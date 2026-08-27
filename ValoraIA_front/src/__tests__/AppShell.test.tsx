import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from '../components/AppShell'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    profile: { id: 'u_1', full_name: 'Edizio Peixoto', creci: null, cnai: null, avatar_url: null, onboarding_completed_at: '2026-01-01T00:00:00Z', created_at: '' },
    organizations: [
      { id: 'org_1', name: 'Avaliações de Edizio', slug: 'edizio', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
    ],
    activeOrg: { id: 'org_1', name: 'Avaliações de Edizio', slug: 'edizio', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
    memberships: [{ id: 'm_1', organization_id: 'org_1', user_id: 'u_1', role: 'owner', invited_by: null, created_at: '' }],
    user: { id: 'u_1', email: 'edizio@exemplo.com' },
    sessionReady: true,
    setActiveOrg: vi.fn(),
    signOut: vi.fn(),
    refreshMe: vi.fn().mockResolvedValue(undefined),
  })),
}))

import { useAuth } from '../context/AuthContext'

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
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockImplementation(() => ({
      profile: { id: 'u_1', full_name: 'Edizio Peixoto', creci: null, cnai: null, avatar_url: null, onboarding_completed_at: '2026-01-01T00:00:00Z', created_at: '' },
      organizations: [
        { id: 'org_1', name: 'Avaliações de Edizio', slug: 'edizio', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
      ],
      activeOrg: { id: 'org_1', name: 'Avaliações de Edizio', slug: 'edizio', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
      memberships: [{ id: 'm_1', organization_id: 'org_1', user_id: 'u_1', role: 'owner', invited_by: null, created_at: '' }],
      user: { id: 'u_1', email: 'edizio@exemplo.com' },
      sessionReady: true,
      setActiveOrg: vi.fn(),
      signOut: vi.fn(),
      refreshMe: vi.fn().mockResolvedValue(undefined),
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
    }))
  })

  it('renderiza o onboarding quando a flag não foi concluída', async () => {
    vi.mocked(useAuth).mockImplementation(() => ({
      profile: { id: 'u_1', full_name: 'Novo Usuário', creci: null, cnai: null, avatar_url: null, onboarding_completed_at: null, created_at: '' },
      organizations: [
        { id: 'org_1', name: 'Avaliações de Novo', slug: 'novo', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
      ],
      activeOrg: { id: 'org_1', name: 'Avaliações de Novo', slug: 'novo', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
      memberships: [{ id: 'm_1', organization_id: 'org_1', user_id: 'u_1', role: 'owner', invited_by: null, created_at: '' }],
      user: { id: 'u_1', email: 'novo@exemplo.com' },
      sessionReady: true,
      setActiveOrg: vi.fn(),
      signOut: vi.fn(),
      refreshMe: vi.fn().mockResolvedValue(undefined),
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
    }))

    renderWithRouter()
    expect(await screen.findByText('Perfil profissional')).toBeInTheDocument()
  })

  it('renderiza a logo e nome da aplicação', () => {
    renderWithRouter()
    expect(screen.getAllByText('AVALIA').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Avaliação Imobiliária').length).toBeGreaterThan(0)
  })

  it('renderiza os itens de navegação', () => {
    renderWithRouter()
    expect(screen.getAllByText('Painel').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nova Avaliação').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Relatórios').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Configurações').length).toBeGreaterThan(0)
  })

  it('renderiza o nome do usuário e a organização', () => {
    renderWithRouter()
    expect(screen.getAllByText('Edizio Peixoto').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Avaliações de Edizio').length).toBeGreaterThan(0)
  })

  it('renderiza o children', () => {
    renderWithRouter()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renderiza o botão de Nova Avaliação no header', () => {
    renderWithRouter()
    expect(screen.getAllByText('Nova Avaliação').length).toBeGreaterThan(0)
  })

  it('destaca o item ativo no sidebar com base na rota', () => {
    renderWithRouter('/app')
    const painelButton = screen.getAllByText('Painel')[0].closest('button')!
    const novaButton = screen.getAllByText('Nova Avaliação')[0].closest('button')!

    expect(painelButton.style.background).toBe('rgba(201, 162, 39, 0.12)')
    expect(painelButton.style.fontWeight).toBe('600')
    expect(novaButton.style.fontWeight).toBe('400')
  })

  it('destaca Nova Avaliação quando na rota /app/nova-avaliacao', () => {
    renderWithRouter('/app/nova-avaliacao')
    const novaButton = screen.getAllByText('Nova Avaliação')[0].closest('button')!
    expect(novaButton.style.fontWeight).toBe('600')
    expect(novaButton.style.background).toBe('rgba(201, 162, 39, 0.12)')
  })

  it('destaca Relatórios quando em uma rota de resultado', () => {
    renderWithRouter('/app/resultado/val_123')
    const relatoriosButton = screen.getAllByText('Relatórios')[0].closest('button')!
    expect(relatoriosButton.style.background).toBe('rgba(201, 162, 39, 0.12)')
    expect(relatoriosButton.style.fontWeight).toBe('600')
  })
})