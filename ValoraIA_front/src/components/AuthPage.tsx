import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

const PRIMARY = '#111827'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
        setNotice('Conta criada. Verifique seu e-mail para confirmar e entrar.')
        setMode('login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#F7F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #E8E0CF', borderRadius: 16, padding: '32px 28px' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <svg width="72" height="8" viewBox="0 0 72 8" style={{ display: 'block', margin: '0 auto 6px' }}>
            <path d="M 1 7 Q 36 1 71 7" fill="none" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 20, fontWeight: 800, color: PRIMARY, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.5px' }}>
            AVALIA
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Avaliação imobiliária assistida por IA</div>
        </div>

        <div style={{ display: 'flex', background: '#F7F4EE', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); setNotice(null) }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? PRIMARY : '#64748B',
                fontWeight: mode === m ? 700 : 500,
                fontSize: 13, fontFamily: 'inherit',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
            Senha
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
            />
          </label>

          {error && <div style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          {notice && <div style={{ fontSize: 12, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>{notice}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 0', borderRadius: 8, border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: PRIMARY, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
              marginTop: 4,
            }}
          >
            {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar na plataforma' : 'Criar conta'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6, marginTop: 18, textAlign: 'center' }}>
          Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade da AVALIA
          (tratamento de dados conforme a LGPD).
        </p>
      </div>
    </div>
  )
}