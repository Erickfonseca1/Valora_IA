import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface NavItem {
  icon: string
  label: string
  path: string
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: '⊞', label: 'Painel', path: '/' },
  { icon: '⊕', label: 'Nova Avaliação', path: '/nova-avaliacao' },
  { icon: '◉', label: 'Relatórios', path: '/relatorios' },
  { icon: '☰', label: 'Portfólio', path: '/portfolio', disabled: true },
  { icon: '⚙', label: 'Configurações', path: '/configuracoes', disabled: true },
]

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex h-screen font-sans bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-[220px] flex flex-col flex-shrink-0 py-6" style={{ background: '#1E3A8A' }}>
        <div className="px-5 pb-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-lg font-bold"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              V
            </div>
            <div>
              <div className="font-bold text-base text-white" style={{ letterSpacing: '-0.3px' }}>Valora AI</div>
              <div className="text-xs text-white/60 mt-px">Agente de Precificação</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2.5 mt-4">
          {NAV_ITEMS.map(item => {
            const active = !item.disabled && (
              location.pathname === item.path ||
              (item.path === '/relatorios' && location.pathname.startsWith('/relatorios'))
            )
            return (
              <button
                key={item.path}
                onClick={() => !item.disabled && navigate(item.path)}
                disabled={item.disabled}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border-none text-sm text-left mb-0.5 transition-all duration-150"
                style={{
                  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: '#fff',
                  fontWeight: active ? 600 : 400,
                  opacity: item.disabled ? 0.3 : active ? 1 : 0.7,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (!active && !item.disabled) {
                    e.currentTarget.style.opacity = '0.9'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active && !item.disabled) {
                    e.currentTarget.style.opacity = '0.7'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span className="text-base w-[22px] text-center">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="px-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              EP
            </div>
            <div>
              <div className="text-xs font-medium text-white">Edizio Peixoto</div>
              <div className="text-[11px] text-white/50">Corretor · Premium</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[60px] px-7 flex items-center justify-end bg-white border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => navigate('/nova-avaliacao')}
            className="px-4 py-2 rounded-lg border-none cursor-pointer text-sm font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: '#1E3A8A', fontFamily: 'inherit' }}
          >
            + Nova Avaliação
          </button>
        </header>

        <main className="flex-1 overflow-auto p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
