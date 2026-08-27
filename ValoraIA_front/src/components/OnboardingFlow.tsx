import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile, updateOrganization, uploadLogo, createOrganization } from '../api'

const PRIMARY = '#111827'
const GOLD = '#C9A227'

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 14, padding: '22px 24px' }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: PRIMARY, margin: '0 0 4px' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

export default function OnboardingFlow({ onClose, onStartTour }: { onClose: () => void; onStartTour: () => void }) {
  const { profile, organizations, memberships, activeOrg, refreshMe, setActiveOrg } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [creci, setCreci] = useState(profile?.creci ?? '')
  const [cnai, setCnai] = useState(profile?.cnai ?? '')
  const [orgName, setOrgName] = useState(activeOrg?.name ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(activeOrg?.logo_url ?? null)
  const [teamName, setTeamName] = useState('')
  const [teamCreated, setTeamCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const soloOrg = organizations.find((o) => o.type === 'solo')
  const canRenameOrg = Boolean(activeOrg && (memberships.find((m) => m.organization_id === activeOrg.id)?.role === 'owner' || memberships.find((m) => m.organization_id === activeOrg.id)?.role === 'admin'))
  void soloOrg

  const handleLogo = async (file: File | null) => {
    if (!file || !activeOrg) return
    setError(null)
    try {
      const { url } = await uploadLogo(file)
      setLogoUrl(url)
      await updateOrganization(activeOrg.id, { logo_url: url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload da logo')
    }
  }

  const handleTeam = async (e: FormEvent) => {
    e.preventDefault()
    const name = teamName.trim()
    if (!name) return
    setError(null)
    try {
      const { organization } = await createOrganization(name, 'imobiliaria')
      setActiveOrg(organization.id)
      setTeamName('')
      setTeamCreated(true)
      await refreshMe()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar equipe')
    }
  }

  const finish = async () => {
    // Marca o onboarding como concluído (mesmo quando o usuário pula).
    try {
      await updateProfile({ onboarding_completed_at: new Date().toISOString() })
      await refreshMe()
    } catch { /* best-effort */ }
    onClose()
  }

  const handleContinue = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({ full_name: fullName.trim() || 'Usuário', creci: creci.trim() || null, cnai: cnai.trim() || null })
      if (canRenameOrg && activeOrg && orgName.trim() && orgName.trim() !== activeOrg.name) {
        await updateOrganization(activeOrg.id, { name: orgName.trim() })
      }
      await refreshMe()
      // Apresentação é montada pelo AppShell (fundo = plataforma real).
      onStartTour()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    {
      title: 'Perfil profissional',
      subtitle: 'Como você quer aparecer nos estudos e futuros pareceres?',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Label>
            Nome completo
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ex.: Erick Fonseca" style={inputStyle} />
          </Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Label>
              CRECI
              <input value={creci} onChange={(e) => setCreci(e.target.value)} placeholder="Ex.: 12.345-F" style={inputStyle} />
            </Label>
            <Label>
              CNAI (opcional)
              <input value={cnai} onChange={(e) => setCnai(e.target.value)} placeholder="Avaliador imobiliário" style={inputStyle} />
            </Label>
          </div>
        </div>
      ),
    },
    {
      title: 'Sua marca nos estudos',
      subtitle: 'Nome e logo aparecem no cabeçalho do estudo e do PDF. Ajuste como preferir.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Label>
            Nome da organização
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={!canRenameOrg} placeholder="Ex.: Erick Fonseca Avaliações" style={inputStyle} />
          </Label>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 140, height: 46, borderRadius: 8, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ height: 30, maxWidth: 110, objectFit: 'contain' }} />
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>sem logo</span>
              )}
            </div>
            <label style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}>
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => handleLogo(e.target.files?.[0] ?? null)} />
              {logoUrl ? 'Trocar logo' : 'Enviar logo'} (PNG/JPEG/WebP ≤ 500 KB, min 256×256)
            </label>
          </div>
        </div>
      ),
    },
    {
      title: 'Trabalha em equipe?',
      subtitle: 'Crie uma imobiliária/escritório para convidar corretores. sua organização individual continua intacta.',
      body: (
        <form onSubmit={handleTeam} style={{ display: 'flex', gap: 10 }}>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Nome da imobiliária ou escritório" style={inputStyle} />
          <button type="submit" style={{ border: 'none', background: PRIMARY, color: '#fff', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Criar equipe
          </button>
        </form>
      ),
      footer: teamCreated ? (
        <div style={{ fontSize: 12, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>
          Equipe criada. Você pode alterá-la depois em Configurações → Membros.
        </div>
      ) : undefined,
    },
  ]

  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const last = stepIndex === steps.length - 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 998, background: '#F7F4EE', overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 800, color: GOLD, letterSpacing: 1 }}>
            BOAS-VINDAS · PASSO {stepIndex + 1} DE {steps.length}
          </span>
        </div>

        <Card title={step.title} subtitle={step.subtitle}>
          {step.body}
          {step.footer && <div style={{ marginTop: 12 }}>{step.footer}</div>}
        </Card>

        {error && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button onClick={() => finish()} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: 12, fontFamily: 'inherit' }}>
            Pular apresentação
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {stepIndex > 0 && (
              <button onClick={() => setStepIndex((i) => i - 1)} style={{ border: '1px solid #E8E0CF', background: '#fff', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                Voltar
              </button>
            )}
            {last ? (
              <button onClick={handleContinue} disabled={saving} style={{ border: 'none', background: PRIMARY, color: '#fff', borderRadius: 8, padding: '10px 20px', cursor: saving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                {saving ? 'Salvando…' : 'Começar apresentação →'}
              </button>
            ) : (
              <button onClick={() => setStepIndex((i) => i + 1)} style={{ border: 'none', background: PRIMARY, color: '#fff', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                Próximo →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}