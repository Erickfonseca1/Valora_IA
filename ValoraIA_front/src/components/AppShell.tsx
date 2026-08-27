import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, FileText, Settings, Plus, ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import OnboardingFlow from './OnboardingFlow'
import OnboardingTour from './OnboardingTour'
import { updateProfile } from '../api'
import type { Organization } from '../types'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  tour?: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel', path: '/app', tour: 'dashboard' },
  { icon: PlusCircle, label: 'Nova Avaliação', path: '/app/nova-avaliacao', tour: 'new' },
  { icon: FileText, label: 'Relatórios', path: '/app/relatorios', tour: 'reports' },
  { icon: Settings, label: 'Configurações', path: '/app/configuracoes', tour: 'config' },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function AvaliaWordmark() {
  return (
    <div>
      <svg width="76" height="7" viewBox="0 0 76 7" style={{ display: 'block', marginBottom: 3, marginLeft: 1 }}>
        <path d="M 0 6 Q 38 0 76 6" fill="none" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 16,
        fontWeight: 800,
        color: '#FFFFFF',
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        AVALIA
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3, letterSpacing: '0.02em' }}>
        Avaliação Imobiliária
      </div>
    </div>
  )
}

function OrgSwitcher({ organizations, activeOrg, onSelect }: {
  organizations: Organization[]
  activeOrg: Organization | null
  onSelect: (orgId: string) => void
}) {
  const [open, setOpen] = useState(false)

  if (organizations.length <= 1) {
    return (
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', padding: '0 2px' }}>
        {activeOrg?.name ?? 'Sem organização'}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#fff', fontSize: 11, fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
          {activeOrg?.name ?? 'Sem organização'}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
          background: '#1F2937', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: 4, minWidth: 180, zIndex: 50,
        }}>
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => { onSelect(org.id); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                background: org.id === activeOrg?.id ? 'rgba(201,162,39,0.15)' : 'transparent',
                border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff',
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, organizations, activeOrg, setActiveOrg, signOut, user, sessionReady, refreshMe } = useAuth()
  const [onboarding, setOnboarding] = useState<'none' | 'data' | 'tour'>('none')

  useEffect(() => {
    if (!sessionReady || !user) return
    // Dispara mesmo quando o profile ainda não carregou (refresh lento/falho);
    // se o onboarding já foi concluído em algum momento, não re-apresenta.
    if (profile?.onboarding_completed_at) {
      setOnboarding('none')
      return
    }
    const t = setTimeout(() => setOnboarding('data'), 900)
    return () => clearTimeout(t)
  }, [sessionReady, user, profile])

  const completeOnboarding = () => {
    // Fecha o overlay imediatamente (sem esperar rede) e marca a flag em
    // segundo plano. Se a gravação falhar, o onboarding volta no próximo
    // acesso — comportamento aceitável e recuperável.
    setOnboarding('none')
    updateProfile({ onboarding_completed_at: new Date().toISOString() })
      .then(() => refreshMe())
      .catch(() => { /* best-effort */ })
  }

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'Usuário'

  const Sidebar = (
    <aside
      className="flex flex-col flex-shrink-0 py-6"
      style={{ background: '#111827', width: 220, height: '100%' }}
    >
      <div className="px-5 pb-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <AvaliaWordmark />
      </div>

      <nav className="flex-1 p-2.5 mt-4">
        {NAV_ITEMS.map(item => {
          const active = (
            location.pathname === item.path ||
            (item.path === '/app/relatorios' && (location.pathname.startsWith('/app/relatorios') || location.pathname.startsWith('/app/resultado/'))) ||
            (item.path === '/app/configuracoes' && location.pathname.startsWith('/app/configuracoes'))
          )
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-tour={item.tour}
              className="sidebar-nav-item flex items-center gap-2.5 w-full py-2.5 rounded-lg border-none text-sm text-left mb-0.5 transition-all duration-150"
              style={{
                paddingLeft: active ? 9 : 12,
                paddingRight: 12,
                background: active ? 'rgba(201,162,39,0.12)' : 'transparent',
                borderLeft: active ? '3px solid #C9A227' : '3px solid transparent',
                color: '#fff',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={17} strokeWidth={1.5} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              initials(displayName)
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="text-xs font-medium text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <OrgSwitcher
              organizations={organizations}
              activeOrg={activeOrg}
              onSelect={(orgId) => setActiveOrg(orgId)}
            />
          </div>
        </div>
        <button
          onClick={() => signOut()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'inherit',
          }}
        >
          <LogOut size={12} /> Sair
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen font-sans text-slate-900" style={{ background: '#F7F4EE' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        {Sidebar}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className="fixed top-0 left-0 h-full z-50 md:hidden transition-transform duration-300"
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {Sidebar}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-[60px] px-4 md:px-7 flex items-center justify-between bg-white flex-shrink-0 gap-3" style={{ borderBottom: '1px solid #E8E0CF' }}>
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer text-slate-600 hover:bg-slate-100 flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
            style={{ fontFamily: 'inherit', fontSize: 18 }}
          >
            ☰
          </button>

          {/* Logo mobile */}
          <div className="md:hidden font-bold text-slate-900 flex-1 text-sm" style={{ letterSpacing: '-0.3px', fontWeight: 800 }}>
            AVALIA
          </div>

          {/* Spacer desktop */}
          <div className="hidden md:flex flex-1" />

          <button
            onClick={() => navigate('/app/nova-avaliacao')}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg border-none cursor-pointer text-xs md:text-sm font-semibold text-white transition-opacity hover:opacity-85 whitespace-nowrap flex-shrink-0"
            style={{ background: '#111827', fontFamily: 'inherit' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Nova Avaliação
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-7">
          {children}
        </main>
      </div>

      {onboarding === 'data' && (
        <OnboardingFlow
          onClose={completeOnboarding}
          onStartTour={() => setOnboarding('tour')}
        />
      )}
      {onboarding === 'tour' && (
        <OnboardingTour onFinish={completeOnboarding} onSkip={completeOnboarding} />
      )}
    </div>
  )
}