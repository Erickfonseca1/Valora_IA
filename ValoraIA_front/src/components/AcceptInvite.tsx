import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { acceptInvite } from '../api'

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<'loading' | 'done' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('Link de convite inválido (sem token).')
      return
    }
    acceptInvite(token)
      .then(({ organization }) => {
        setState('done')
        setMessage(`Você entrou em "${organization.name}". Já pode criar avaliações na organização.`)
      })
      .catch((err) => {
        setState('error')
        setMessage(err instanceof Error ? err.message : 'Erro ao aceitar o convite')
      })
  }, [token])

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #E8E0CF', borderRadius: 16, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Convite de organização</div>
        {state === 'loading' && <div className="text-sm text-slate-400 py-6">Aceitando convite…</div>}
        {state === 'done' && (
          <div>
            <div style={{ fontSize: 13, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 14px', lineHeight: 1.6 }}>
              {message}
            </div>
            <Link to="/app" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', borderRadius: 8, background: '#111827', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Ir para a plataforma
            </Link>
          </div>
        )}
        {state === 'error' && (
          <div>
            <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', lineHeight: 1.6 }}>
              {message}
            </div>
            <Link to="/app" style={{ display: 'inline-block', marginTop: 16, color: '#111827', fontSize: 13, fontWeight: 600 }}>
              Voltar para a plataforma
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}