import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import Dashboard from './components/Dashboard'
import ValuationFlow from './components/ValuationFlow'
import Report from './components/Report'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nova-avaliacao" element={<ValuationFlow />} />
          <Route path="/resultado/:id" element={<Report />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
