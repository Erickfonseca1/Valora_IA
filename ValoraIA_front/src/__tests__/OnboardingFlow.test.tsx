import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OnboardingFlow from '../components/OnboardingFlow'
import { updateProfile, updateOrganization } from '../api'

vi.mock('../api', () => ({
  updateProfile: vi.fn().mockResolvedValue({}),
  updateOrganization: vi.fn().mockResolvedValue({}),
  uploadLogo: vi.fn().mockResolvedValue({ url: 'https://exemplo.com/logo.png' }),
  createOrganization: vi.fn().mockResolvedValue({ organization: { id: 'org_2' }, membership: { id: 'm2' } }),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u_1', full_name: '', creci: null, cnai: null, avatar_url: null, created_at: '' },
    organizations: [
      { id: 'org_1', name: 'Avaliações de teste', slug: 'teste', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
    ],
    memberships: [{ id: 'm_1', organization_id: 'org_1', user_id: 'u_1', role: 'owner', invited_by: null, created_at: '' }],
    activeOrg: { id: 'org_1', name: 'Avaliações de teste', slug: 'teste', type: 'solo', logo_url: null, created_by: 'u_1', plan: 'free', created_at: '' },
    user: { id: 'u_1', email: 'teste@avalia.com' },
    sessionReady: true,
    refreshMe: vi.fn().mockResolvedValue(undefined),
    applyMe: vi.fn(),
    setActiveOrg: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function renderFlow(onClose = vi.fn(), onStartTour = vi.fn()) {
  return {
    onClose,
    onStartTour,
    ...render(
      <MemoryRouter>
        <OnboardingFlow onClose={onClose} onStartTour={onStartTour} />
      </MemoryRouter>
    ),
  }
}

describe('OnboardingFlow', () => {
  it('mostra o passo 1 (perfil profissional) e avança para a marca', () => {
    renderFlow()
    expect(screen.getByText('Perfil profissional')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Próximo →'))
    expect(screen.getByText('Sua marca nos estudos')).toBeInTheDocument()
  })

  it('salva perfil e org e dispara o tour ao concluir', async () => {
    const { onStartTour } = renderFlow()

    fireEvent.change(screen.getByPlaceholderText('Ex.: Erick Fonseca'), { target: { value: 'Erick Fonseca' } })
    fireEvent.click(screen.getByText('Próximo →')) // marca
    fireEvent.click(screen.getByText('Próximo →')) // equipe
    fireEvent.click(screen.getByText(/Começar apresentação →/i))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Erick Fonseca' }))
      expect(updateOrganization).not.toHaveBeenCalled()
      expect(onStartTour).toHaveBeenCalled()
    })
  })

  it('pular a apresentação marca o onboarding como concluído', async () => {
    const onClose = vi.fn()
    renderFlow(onClose)
    fireEvent.click(screen.getByText('Pular apresentação'))
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})