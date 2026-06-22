import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, FileText, Briefcase, Settings, Plus } from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel', path: '/' },
  { icon: PlusCircle, label: 'Nova Avaliação', path: '/nova-avaliacao' },
  { icon: FileText, label: 'Relatórios', path: '/relatorios' },
  { icon: Briefcase, label: 'Portfólio', path: '/portfolio', disabled: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', disabled: true },
]

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

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
          const active = !item.disabled && (
            location.pathname === item.path ||
            (item.path === '/relatorios' && location.pathname.startsWith('/relatorios'))
          )
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => !item.disabled && navigate(item.path)}
              disabled={item.disabled}
              className="sidebar-nav-item flex items-center gap-2.5 w-full py-2.5 rounded-lg border-none text-sm text-left mb-0.5 transition-all duration-150"
              style={{
                paddingLeft: active ? 9 : 12,
                paddingRight: 12,
                background: active ? 'rgba(201,162,39,0.12)' : 'transparent',
                borderLeft: active ? '3px solid #C9A227' : '3px solid transparent',
                color: '#fff',
                fontWeight: active ? 600 : 400,
                opacity: item.disabled ? 0.25 : 1,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
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
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            EP
          </div>
          <div>
            <div className="text-xs font-medium text-white">Edizio Peixoto</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Corretor · Premium</div>
          </div>
        </div>
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
            onClick={() => navigate('/nova-avaliacao')}
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
    </div>
  )
}
