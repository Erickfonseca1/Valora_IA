import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import AppShell from './components/AppShell'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import { AuthProvider, useAuth } from './context/AuthContext'

const Dashboard = lazy(() => import('./components/Dashboard'))
const ValuationFlow = lazy(() => import('./components/ValuationFlow'))
const Report = lazy(() => import('./components/Report'))
const Relatorios = lazy(() => import('./components/Relatorios'))
const Configuracoes = lazy(() => import('./components/Configuracoes'))
const AcceptInvite = lazy(() => import('./components/AcceptInvite'))

function ProductRoute({ children }: { children: ReactNode }) {
  const { sessionReady, user, loading } = useAuth()

  if (!sessionReady || loading) {
    return (
      <div className="flex items-center justify-center h-screen" aria-label="Carregando plataforma">
        <svg width="40" height="40" viewBox="0 0 40 40" className="animate-spin-slow" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#E8E0CF" strokeWidth="3" />
          <path d="M 20 3 A 17 17 0 0 1 37 20" fill="none" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell>
      <Suspense fallback={(
        <div className="flex items-center justify-center h-64" aria-label="Carregando plataforma">
          <svg width="40" height="40" viewBox="0 0 40 40" className="animate-spin-slow" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="#E8E0CF" strokeWidth="3" />
            <path d="M 20 3 A 17 17 0 0 1 37 20" fill="none" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}>
        {children}
      </Suspense>
    </AppShell>
  )
}

function AuthGate() {
  const { sessionReady, user, loading } = useAuth()
  if (!sessionReady || loading) {
    return (
      <div className="flex items-center justify-center h-screen" aria-label="Carregando plataforma">
        <svg width="40" height="40" viewBox="0 0 40 40" className="animate-spin-slow" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#E8E0CF" strokeWidth="3" />
          <path d="M 20 3 A 17 17 0 0 1 37 20" fill="none" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  if (user) return <Navigate to="/app" replace />
  return <AuthPage />
}

function LegacyReportRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={id ? `/app/resultado/${id}` : '/app'} replace />
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthGate />} />
        <Route path="/app" element={<ProductRoute><Dashboard /></ProductRoute>} />
        <Route path="/app/nova-avaliacao" element={<ProductRoute><ValuationFlow /></ProductRoute>} />
        <Route path="/app/relatorios" element={<ProductRoute><Relatorios /></ProductRoute>} />
        <Route path="/app/resultado/:id" element={<ProductRoute><Report /></ProductRoute>} />
        <Route path="/app/configuracoes" element={<ProductRoute><Configuracoes /></ProductRoute>} />
        <Route path="/aceitar-convite" element={<ProductRoute><AcceptInvite /></ProductRoute>} />

        {/* Legacy product URLs remain valid after the public homepage move. */}
        <Route path="/nova-avaliacao" element={<Navigate to="/app/nova-avaliacao" replace />} />
        <Route path="/relatorios" element={<Navigate to="/app/relatorios" replace />} />
        <Route path="/resultado/:id" element={<LegacyReportRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}