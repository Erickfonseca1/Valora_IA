import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
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

  const refreshMe = useCallback(async () => {
    try {
      const me = await fetchMe() as MeData
      setProfile(me.profile)
      setOrganizations(me.organizations)
      setMemberships(me.memberships)
      const active = me.organizations.find((o) => o.id === activeOrgId) ?? me.organizations[0] ?? null
      if (active) {
        setActiveOrgId(active.id)
        localStorage.setItem(ORG_STORAGE_KEY, active.id)
      } else {
        localStorage.removeItem(ORG_STORAGE_KEY)
      }
    } catch {
      // Session exists but profile/orgs could not load; retry on next refresh.
    }
  }, [activeOrgId])

  useEffect(() => {
    let cancelled = false
    supabase()
      .auth.getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        const session = data.session
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? null })
          try {
            await completeOnboarding()
            await refreshMe()
          } catch {
            // Onboarding is best-effort; a later refresh recovers.
          }
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

    const { data: listener } = supabase().auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setOrganizations([])
        setMemberships([])
        setActiveOrgId(null)
        localStorage.removeItem(ORG_STORAGE_KEY)
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? null })
        try {
          await completeOnboarding()
          await refreshMe()
        } catch { /* best-effort */ }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? null })
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