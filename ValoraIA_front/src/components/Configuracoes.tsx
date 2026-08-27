import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getOrganization,
  updateOrganization,
  inviteMember,
  changeMemberRole,
  removeMember,
  updateProfile,
  createOrganization,
  uploadLogo,
} from '../api'
import { clearOnboardingDoneLocally } from './AppShell'
import type { OrganizationDetail, OrganizationMember, OrgInvite } from '../types'

const PRIMARY = '#111827'
const ACCENT = '#C9A227'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dono',
  admin: 'Admin',
  avaliador: 'Avaliador',
  pending: 'Pendente',
}

type Tab = 'org' | 'members' | 'profile'

export default function Configuracoes() {
  const { activeOrg, organizations, memberships, refreshMe, user } = useAuth()
  const [tab, setTab] = useState<Tab>('org')
  const [orgId, setOrgId] = useState<string>(activeOrg?.id ?? '')
  const [detail, setDetail] = useState<OrganizationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [replayLoading, setReplayLoading] = useState(false)

  const membership = memberships.find((m) => m.organization_id === orgId)
  const isManager = membership?.role === 'owner' || membership?.role === 'admin'

  useEffect(() => {
    if (!orgId) return
    getOrganization(orgId)
      .then(setDetail)
      .catch((e) => setError(e.message))
  }, [orgId])

  const handleReplayTour = async () => {
    setReplayLoading(true)
    setError(null)
    try {
      clearOnboardingDoneLocally()
      await updateProfile({ onboarding_completed_at: null })
      await refreshMe()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reiniciar apresentação')
      setReplayLoading(false)
    }
  }

  if (!user) return null

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-xl font-bold text-slate-900" style={{ letterSpacing: '-0.3px', marginBottom: 4 }}>Configurações</h1>
          <p className="text-sm text-slate-500" style={{ marginTop: 0, marginBottom: 20 }}>
            Organização, membros e perfil profissional
          </p>
        </div>
        <button
          onClick={handleReplayTour}
          disabled={replayLoading}
          style={{ border: '1px solid #E8E0CF', background: '#fff', borderRadius: 8, padding: '8px 14px', cursor: replayLoading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', fontFamily: 'inherit' }}
        >
          {replayLoading ? 'Recarregando…' : 'Ver apresentação novamente'}
        </button>
      </div>

      {/* Organization selector (when member of more than one) */}
      {organizations.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => { setOrgId(org.id); setDetail(null) }}
              style={{
                padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${org.id === orgId ? PRIMARY : '#E8E0CF'}`,
                background: org.id === orgId ? PRIMARY : '#fff',
                color: org.id === orgId ? '#fff' : '#475569',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8E0CF', marginBottom: 20 }}>
        {([
          ['org', 'Organização'],
          ['members', 'Membros'],
          ['profile', 'Perfil'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              color: tab === key ? PRIMARY : '#64748B',
              borderBottom: tab === key ? `2px solid ${ACCENT}` : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="ok">{notice}</Notice>}

      {tab === 'org' && (
        <OrgTab
          detail={detail}
          orgId={orgId}
          isManager={isManager}
          onSaved={(msg) => { setNotice(msg); refreshMe() }}
          onError={setError}
        />
      )}
      {tab === 'members' && (
        <MembersTab
          detail={detail}
          orgId={orgId}
          isManager={isManager}
          onSaved={() => setNotice('Membros atualizados')}
          onError={setError}
        />
      )}
      {tab === 'profile' && (
        <ProfileTab onSaved={() => { setNotice('Perfil atualizado'); refreshMe() }} onError={setError} />
      )}
    </div>
  )
}

function Notice({ tone, children }: { tone: 'error' | 'ok'; children: ReactNode }) {
  const style = tone === 'error'
    ? { color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }
    : { color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0' }
  return (
    <div style={{ fontSize: 12, borderRadius: 8, padding: '10px 14px', marginBottom: 14, ...style }}>{children}</div>
  )
}

// ─── Organization tab ─────────────────────────────────────────────────────────

function OrgTab({ detail, orgId, isManager, onSaved, onError }: {
  detail: OrganizationDetail | null
  orgId: string
  isManager: boolean
  onSaved: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [creatingTeam, setCreatingTeam] = useState(false)

  useEffect(() => {
    if (detail) {
      setName(detail.name)
      setLogoUrl(detail.logo_url)
    }
  }, [detail])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    onError('')
    try {
      await updateOrganization(orgId, { name, logo_url: logoUrl })
      onSaved('Organização atualizada')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleLogo = async (file: File | null) => {
    if (!file) return
    try {
      const { url } = await uploadLogo(file)
      setLogoUrl(url)
      await updateOrganization(orgId, { logo_url: url })
      onSaved('Logo atualizada')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro no upload da logo')
    }
  }

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault()
    setCreatingTeam(true)
    onError('')
    try {
      const form = new FormData(e.currentTarget as HTMLFormElement)
      const teamName = String(form.get('team_name') ?? '').trim()
      if (!teamName) throw new Error('Informe o nome da imobiliária/escritório')
      await createOrganization(teamName, 'imobiliaria')
      onSaved('Equipe criada. Use o seletor de organização no menu para alternar.')
      await new Promise((resolve) => setTimeout(resolve, 400))
      window.location.reload()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao criar equipe')
    } finally {
      setCreatingTeam(false)
    }
  }

  if (!detail) return <div className="text-sm text-slate-400 py-8 text-center">Carregando organização…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <form onSubmit={handleSave} style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: '0 0 14px' }}>Dados da organização</h3>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
          Nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isManager}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit' }}
          />
        </label>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
          Tipo: {detail.type === 'solo' ? 'Corretor individual' : detail.type === 'imobiliaria' ? 'Imobiliária' : 'Escritório'} · Plano: {detail.plan}
        </div>
        {isManager && (
          <button type="submit" disabled={saving} style={{
            marginTop: 14, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: PRIMARY, color: '#fff', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
          }}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        )}
      </form>

      {/* Logo + PDF preview */}
      <div style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>Logo do estudo</h3>
        <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px' }}>
          Esta logo será exibida no cabeçalho dos estudos e PDFs emitidos por esta organização.
          Sem logo, é usado o monograma com as iniciais.
        </p>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* PDF header preview */}
          <div style={{ width: 360, border: '1px solid #E8E0CF', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: PRIMARY, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ height: 30, maxWidth: 90, objectFit: 'contain' }} />
                ) : (
                  <div style={{
                    width: 30, height: 30, borderRadius: 6, background: 'rgba(201,162,39,0.25)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 12,
                  }}>
                    {(detail.name ?? 'AV').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{detail.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>Estudo Técnico de Avaliação</div>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace' }}>ES-000000</div>
            </div>
            <div style={{ padding: '10px 14px', fontSize: 10, color: '#64748B' }}>
              Valor de Mercado Indicativo — <strong>R$ 842.000</strong> · faixa de amostra e memória de cálculo abaixo.
            </div>
          </div>

          {isManager && (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed #CBD5E1', borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
              background: '#F8FAFC', gap: 6, fontSize: 12, color: '#475569', fontWeight: 600,
            }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
              />
              <span style={{ fontSize: 18 }}>⬆</span>
              {logoUrl ? 'Trocar logo' : 'Enviar logo'}
              <span style={{ fontWeight: 400, color: '#94A3B8', fontSize: 10 }}>PNG/JPEG/WebP · até 500 KB · mínimo 256×256px</span>
            </label>
          )}
        </div>
      </div>

      {/* Solo → Team upgrade */}
      {detail.type === 'solo' && isManager && (
        <form onSubmit={handleCreateTeam} style={{ background: '#FEFCF5', border: '1px solid #FDE68A', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>Criar equipe (imobiliária/escritório)</h3>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
            Cria uma nova organização compartilhada para você e seus corretores. Sua organização individual continua intacta.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              name="team_name"
              placeholder="Nome da imobiliária ou escritório"
              required
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit' }}
            />
            <button type="submit" disabled={creatingTeam} style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: PRIMARY, color: '#fff', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
            }}>
              {creatingTeam ? 'Criando…' : 'Criar equipe'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ detail, orgId, isManager, onSaved, onError }: {
  detail: OrganizationDetail | null
  orgId: string
  isManager: boolean
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'avaliador' | 'admin'>('avaliador')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    onError('')
    try {
      const { invite } = await inviteMember(orgId, email.trim(), role)
      setInviteToken(invite.token)
      setEmail('')
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao convidar')
    } finally {
      setBusy(false)
    }
  }

  const handleRoleChange = async (member: OrganizationMember, next: string) => {
    try {
      await changeMemberRole(orgId, member.user_id, next as 'owner' | 'admin' | 'avaliador')
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao alterar papel')
    }
  }

  const handleRemove = async (member: OrganizationMember) => {
    if (!window.confirm(`Remover ${member.full_name ?? member.email} da organização?`)) return
    try {
      await removeMember(orgId, member.user_id)
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao remover membro')
    }
  }

  if (!detail) return <div className="text-sm text-slate-400 py-8 text-center">Carregando membros…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {isManager && (
        <form onSubmit={handleInvite} style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: '0 0 12px' }}>Convidar membro</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@imobiliaria.com.br"
              style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit' }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'avaliador' | 'admin')}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
            >
              <option value="avaliador">Avaliador (só as próprias avaliações)</option>
              <option value="admin">Admin (vê todas as avaliações)</option>
            </select>
            <button type="submit" disabled={busy} style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: PRIMARY, color: '#fff', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
            }}>
              {busy ? 'Enviando…' : 'Convidar'}
            </button>
          </div>
          {inviteToken && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', lineHeight: 1.6 }}>
              Convite criado. Envie o link de aceite (o e-mail automático ainda não está ativo):
              <br />
              <code style={{ userSelect: 'all', wordBreak: 'break-all' }}>{inviteToken}</code>
              <br />
              O convidado deve estar logado na plataforma e acessar{' '}
              <code>/aceitar-convite?token={inviteToken}</code> — ou envie o token pelo WhatsApp.
            </div>
          )}
        </form>
      )}

      <div style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 12, overflow: 'hidden' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', padding: '16px 20px', margin: 0, borderBottom: '1px solid #E8E0CF' }}>
          Membros ({detail.members.length})
        </h3>
        {detail.members.length === 0 && (
          <div className="text-sm text-slate-400 py-8 text-center">Nenhum membro.</div>
        )}
        {detail.members.map((m) => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{m.full_name ?? m.email}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{m.email ?? '—'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isManager ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m, e.target.value)}
                  disabled={m.role === 'owner' || m.user_id === null}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E8E0CF', fontSize: 12, fontFamily: 'inherit', background: '#fff' }}
                >
                  <option value="owner" disabled={m.role !== 'owner'}>Dono</option>
                  <option value="admin">Admin</option>
                  <option value="avaliador">Avaliador</option>
                </select>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#F7F4EE', borderRadius: 6, padding: '4px 10px' }}>
                  {ROLE_LABELS[m.role]}
                </span>
              )}
              {isManager && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#DC2626', fontSize: 12, fontFamily: 'inherit' }}
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {detail.invites.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 12, overflow: 'hidden' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', padding: '16px 20px', margin: 0, borderBottom: '1px solid #E8E0CF' }}>
            Convites pendentes ({detail.invites.length})
          </h3>
          {detail.invites.map((invite: OrgInvite) => (
            <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{invite.email}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  {ROLE_LABELS[invite.role]} · expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <code style={{ fontSize: 10, color: '#64748B', userSelect: 'all' }}>{invite.token}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ onSaved, onError }: { onSaved: () => void; onError: (msg: string) => void }) {
  const { profile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [creci, setCreci] = useState(profile?.creci ?? '')
  const [cnai, setCnaI] = useState(profile?.cnai ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setCreci(profile?.creci ?? '')
    setCnaI(profile?.cnai ?? '')
  }, [profile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    onError('')
    try {
      await updateProfile({ full_name: fullName.trim(), creci: creci.trim() || null, cnai: cnai.trim() || null })
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #E8E0CF', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0 }}>Perfil profissional</h3>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
        Nome completo
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit' }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
        CRECI
        <input value={creci} onChange={(e) => setCreci(e.target.value)} placeholder="Ex.: 12.345-F"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit' }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
        CNAI (avaliador imobiliário)
        <input value={cnai} onChange={(e) => setCnaI(e.target.value)} placeholder="Opcional"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E0CF', fontSize: 14, fontFamily: 'inherit' }} />
      </label>
      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
        Estes dados identificam você como responsável técnico e serão usados na identificação do avaliador nos estudos.
      </p>
      <button type="submit" disabled={saving} style={{
        alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: PRIMARY, color: '#fff', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
      }}>
        {saving ? 'Salvando…' : 'Salvar perfil'}
      </button>
    </form>
  )
}