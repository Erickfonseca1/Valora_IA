import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase, getSupabase } from '../lib/supabase'
import type { Profile, Organization, Membership, MembershipRole, MeData } from '../types'
import { fetchMe, completeOnboarding } from '../api'

interface AuthState {
  loading: boolean
  sessionReady: boolean
  user: { id: string; email: string | null } | null
  profile: Profile | null
  organizations: Organization[]
  memberships: Membership[]
  activeOrg: Organization | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setActiveOrg: (orgId: string) => void
  refreshMe: () => Promise<void>
  // Aplica um MeData já carregado (ex.: resposta do PATCH /api/me) no estado
  // — evita esperar um novo GET e mantém sidebar/perfil sincronizados.
  applyMe: (me: MeData) => void
}

const AuthContext = createContext<AuthState | null>(null)

const ORG_STORAGE_KEY = 'avalia.active-org'

function roleOf(memberships: Membership[], orgId: string): MembershipRole | null {
  return memberships.find((m) => m.organization_id === orgId)?.role ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() =>
    localStorage.getItem(ORG_STORAGE_KEY)
  )

  const applyMe = useCallback((me: MeData) => {
    // Nunca derruba o perfil existente com null (evita regressão do nome no
    // form/sidebar quando o GET /me sofre algum erro transitório).
    setProfile(prev => me.profile ?? prev)
    setOrganizations(me.organizations)
    setMemberships(me.memberships)
    const active = me.organizations.find((o) => o.id === activeOrgId) ?? me.organizations[0] ?? null
    if (active) {
      setActiveOrgId(active.id)
      localStorage.setItem(ORG_STORAGE_KEY, active.id)
    } else {
      localStorage.removeItem(ORG_STORAGE_KEY)
    }
  }, [activeOrgId])

  const refreshMe = useCallback(async () => {
    try {
      const me = await fetchMe() as MeData
      // Fallback: se o perfil ainda não existe no servidor, usa o nome do
      // signup (user_metadata) para não exibir o prefixo do e-mail.
      const meta = (userMetaRef.current?.full_name as string | undefined) ?? null
      applyMe(
        me.profile
          ? me
          : { ...me, profile: meta ? { id: userMetaRef.current!.id, full_name: meta, creci: null, cnai: null, avatar_url: null, created_at: '' } : null }
      )
    } catch (err) {
      // Session exists but profile/orgs could not load; retry on next refresh.
      console.warn('[auth] refreshMe falhou (perfil/nome podem não aparecer):', err)
    }
  }, [activeOrgId, applyMe])

  // Guarda o user_metadata da sessão (nome do signup) para o fallback acima.
  const userMetaRef = useRef<{ id: string; full_name?: unknown } | null>(null)

  const syncFromSession = (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
    userMetaRef.current = {
      id: sessionUser.id,
      full_name: sessionUser.user_metadata?.full_name ?? sessionUser.user_metadata?.name,
    }
    setUser({ id: sessionUser.id, email: sessionUser.email ?? null })
  }

  useEffect(() => {
    let cancelled = false
    const client = getSupabase()
    if (!client) {
      // Supabase não configurado (dev sem .env): app roda sem autenticação.
      setLoading(false)
      setSessionReady(true)
      return
    }

    client.auth.getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        const session = data.session
        if (session?.user) {
          syncFromSession(session.user)
          // Onboarding e carga do perfil são independentes: uma falha na outra
          // não pode impedir o nome/organizações de carregarem.
          try { await completeOnboarding() } catch { /* best-effort */ }
          try { await refreshMe() } catch { /* refreshMe já loga */ }
        }
        setLoading(false)
        setSessionReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setSessionReady(true)
        }
      })

    const { data: listener } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setOrganizations([])
        setMemberships([])
        setActiveOrgId(null)
        localStorage.removeItem(ORG_STORAGE_KEY)
      } else if (event === 'SIGNED_IN' && session?.user) {
        syncFromSession(session.user)
        try { await completeOnboarding() } catch { /* best-effort */ }
        try { await refreshMe() } catch { /* refreshMe já loga */ }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        syncFromSession(session.user)
      }
      setLoading(false)
      setSessionReady(true)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [refreshMe])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase().auth.signUp({ email, password })
    if (error) throw new Error(error.message)
  }

  const signOut = async () => {
    await supabase().auth.signOut()
  }

  const setActiveOrg = (orgId: string) => {
    setActiveOrgId(orgId)
    localStorage.setItem(ORG_STORAGE_KEY, orgId)
  }

  const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? organizations[0] ?? null

  const value: AuthState = {
    loading,
    sessionReady,
    user,
    profile,
    organizations,
    memberships,
    activeOrg,
    signIn,
    signUp,
    signOut,
    setActiveOrg,
    refreshMe,
    applyMe,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useOrgRole(orgId: string): MembershipRole | null {
  const { memberships } = useAuth()
  return roleOf(memberships, orgId)
}