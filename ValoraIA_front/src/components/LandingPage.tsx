import { useState, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  FileDown,
  FileSearch,
  FileText,
  GitCompareArrows,
  House,
  Layers3,
  Lock,
  MapPinned,
  Mic,
  Ruler,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import ConfidenceGauge from './ConfidenceGauge'

interface BrandMarkProps {
  inverse?: boolean
}

function BrandMark({ inverse = false }: BrandMarkProps) {
  return (
    <a href="/" className={`marketing-brand ${inverse ? 'marketing-brand-inverse' : ''}`} aria-label="AVALIA, página inicial">
      <span className="marketing-brand-wordmark">
        <svg width="64" height="7" viewBox="0 0 64 7" aria-hidden="true">
          <path d="M 1 6 Q 32 0 63 6" fill="none" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>AVALIA</span>
      </span>
      <span className="marketing-brand-subtitle">Avaliação imobiliária</span>
    </a>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string
  title: string
  description: string
  light?: boolean
}) {
  return (
    <div className={`marketing-section-heading ${light ? 'marketing-section-heading-light' : ''}`}>
      <span className="marketing-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

function ProductPreview() {
  const pins = [
    { left: '19%', top: '28%', delay: '0s' },
    { left: '42%', top: '19%', delay: '0.12s' },
    { left: '67%', top: '35%', delay: '0.2s' },
    { left: '76%', top: '68%', delay: '0.28s' },
    { left: '31%', top: '72%', delay: '0.36s' },
  ]

  return (
    <div className="marketing-preview-wrap">
      <div className="marketing-preview-label">
        <span className="marketing-preview-status"><span /> Prévia ilustrativa</span>
        <span className="font-mono">AVALIA / 01</span>
      </div>
      <div className="marketing-product-preview" aria-label="Prévia ilustrativa do resultado de uma avaliação imobiliária">
        <div className="marketing-preview-toolbar">
          <div className="marketing-preview-dots" aria-hidden="true"><span /><span /><span /></div>
          <span>Resultado da avaliação</span>
          <span className="marketing-preview-toolbar-icon"><FileDown size={14} /></span>
        </div>
        <div className="marketing-preview-body">
          <div className="marketing-preview-result">
            <div className="marketing-preview-kicker">Valor de mercado estimado</div>
            <div className="marketing-preview-value">R$ 842.000</div>
            <div className="marketing-preview-range">Faixa indicativa · R$ 810 mil a R$ 875 mil</div>
            <div className="marketing-preview-divider" />
            <div className="marketing-preview-confidence">
              <ConfidenceGauge score={86} size={96} />
              <div>
                <span className="marketing-mini-label">Consistência da amostra</span>
                <strong>Boa cobertura local</strong>
                <span className="marketing-mini-copy">Comparáveis selecionados por localização, área e tipologia.</span>
              </div>
            </div>
            <div className="marketing-preview-tags">
              <span><Check size={12} /> Apartamento</span>
              <span><Check size={12} /> 3 quartos</span>
              <span><Check size={12} /> 112 m²</span>
            </div>
          </div>
          <div className="marketing-preview-map-panel">
            <div className="marketing-preview-map-heading">
              <div>
                <span className="marketing-mini-label">Mercado ao redor</span>
                <strong>Comparáveis próximos</strong>
              </div>
              <MapPinned size={17} />
            </div>
            <div className="marketing-preview-map" aria-hidden="true">
              <span className="preview-map-road preview-road-one" />
              <span className="preview-map-road preview-road-two" />
              <span className="preview-map-road preview-road-three" />
              <span className="preview-map-block preview-block-one" />
              <span className="preview-map-block preview-block-two" />
              <span className="preview-map-block preview-block-three" />
              {pins.map(pin => (
                <span
                  className="preview-map-pin"
                  key={`${pin.left}-${pin.top}`}
                  style={{ left: pin.left, top: pin.top, animationDelay: pin.delay }}
                />
              ))}
              <span className="preview-map-target"><Target size={17} /></span>
              <div className="preview-map-legend"><span /><span>Imóvel avaliado</span><i /><span>Comparável</span></div>
            </div>
          </div>
        </div>
        <div className="marketing-preview-footer">
          <span><BarChart3 size={14} /> 3 métodos disponíveis conforme a amostra</span>
          <span className="font-mono">R$ 7.518/m²</span>
        </div>
      </div>
      <div className="marketing-preview-float marketing-preview-float-top">
        <Sparkles size={15} />
        <span>Dados organizados para decidir</span>
      </div>
      <div className="marketing-preview-float marketing-preview-float-bottom">
        <TrendingUp size={15} />
        <span>+12,4% · tendência observada</span>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <article className="marketing-feature-card">
      <div className="marketing-feature-icon"><Icon size={19} strokeWidth={1.7} /></div>
      <h3>{title}</h3>
      <p>{children}</p>
      <span className="marketing-card-arrow"><ArrowDownRight size={16} /></span>
    </article>
  )
}

function StepCard({ number, icon: Icon, title, children }: { number: string; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <article className="marketing-step-card">
      <div className="marketing-step-topline">
        <span className="marketing-step-number">{number}</span>
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  )
}

function MethodCard({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="marketing-method-card">
      <div className="marketing-method-icon"><Icon size={17} strokeWidth={1.7} /></div>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  )
}

function ReportPreview() {
  return (
    <div className="marketing-report-shell" aria-label="Prévia ilustrativa de um relatório de avaliação">
      <div className="marketing-report-paper">
        <div className="marketing-report-header">
          <div>
            <div className="marketing-report-arc" />
            <strong>AVALIA</strong>
            <span>Avaliação imobiliária</span>
          </div>
          <span className="marketing-report-code">ESTUDO · 01</span>
        </div>
        <div className="marketing-report-title">
          <span>Resultado da avaliação</span>
          <strong>Av. Epitácio Pessoa, Manaíra</strong>
          <small>João Pessoa · PB · Apartamento · 112 m²</small>
        </div>
        <div className="marketing-report-value-row">
          <div>
            <span>Valor de mercado estimado</span>
            <strong>R$ 842.000</strong>
          </div>
          <div className="marketing-report-score"><span>Confiança indicativa</span><strong>86%</strong></div>
        </div>
        <div className="marketing-report-section-title"><span>01</span><strong>Memória de cálculo</strong></div>
        <div className="marketing-report-bars">
          <div><span>Mercado comparável</span><i><b style={{ width: '76%' }} /></i><strong>R$ 7.240/m²</strong></div>
          <div><span>Fatores físicos</span><i><b style={{ width: '84%' }} /></i><strong>× 1,06</strong></div>
          <div><span>Comodidades e entorno</span><i><b style={{ width: '68%' }} /></i><strong>× 1,02</strong></div>
        </div>
        <div className="marketing-report-signature"><span>Estimativa automatizada e informativa</span><span>AVALIA · 2026</span></div>
      </div>
      <div className="marketing-report-side-note"><FileText size={18} /><span>Um resultado que pode ser consultado, explicado e exportado.</span></div>
    </div>
  )
}

// ─── Pricing section ──────────────────────────────────────────────────────────

type Billing = 'monthly' | 'yearly'

interface Plan {
  name: string
  audience: string
  monthly: number
  yearlyTotal: number
  yearlyMonthly: number
  highlight?: boolean
  features: string[]
  cta: string
}

const PLANS: Plan[] = [
  {
    name: 'Solo Pro',
    audience: 'Corretor avaliador individual',
    monthly: 129,
    yearlyTotal: 1290,
    yearlyMonthly: 107,
    features: [
      '1 usuário',
      '30 estudos por mês',
      'Logo e nome da sua marca no estudo',
      'Trend do bairro e da cidade',
      'Análise de fotos por IA',
      'Exportação em PDF completa',
    ],
    cta: 'Começar teste de 7 dias',
  },
  {
    name: 'Imobiliária',
    audience: 'Equipes de até 5 corretores',
    monthly: 279,
    yearlyTotal: 2790,
    yearlyMonthly: 232,
    highlight: true,
    features: [
      'Até 3 cadeiras incluídas (+ R$ 39 por cadeira)',
      '150 estudos por mês',
      'Membros com papéis (avaliador/admin)',
      'Painel do gestor com a produção da equipe',
      'Convites por e-mail com link de aceite',
      'Suporte por WhatsApp',
    ],
    cta: 'Começar teste de 7 dias',
  },
  {
    name: 'Imobiliária+',
    audience: 'Corretoras e escritórios em crescimento',
    monthly: 549,
    yearlyTotal: 5490,
    yearlyMonthly: 458,
    features: [
      'Até 10 cadeiras',
      '300 estudos por mês',
      'Tudo do plano Imobiliária',
      'Treinamento da equipe incluso',
      'Suporte prioritário',
      'Acompanhamento de onboarding',
    ],
    cta: 'Falar com especialista',
  },
]

function PricingSection() {
  const [billing, setBilling] = useState<Billing>('monthly')

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

  return (
    <section className="marketing-section marketing-pricing-section">
      <div className="marketing-container">
        <SectionHeading
          eyebrow="PLANOS E PREÇOS"
          title="Um preço por organização — não por usuário."
          description="Cada plano acompanha o tamanho do seu time e o volume de estudos do mês. Comece grátis, cresça sem mudar de plataforma e cancele quando quiser."
        />

        {/* Billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--marketing-border)', borderRadius: 999, padding: 4 }}>
            {(['monthly', 'yearly'] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 22px', borderRadius: 999,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  background: billing === b ? '#111827' : 'transparent',
                  color: billing === b ? '#fff' : 'var(--marketing-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {b === 'monthly' ? 'Mensal' : 'Anual'}
                {b === 'yearly' && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                    background: billing === b ? 'rgba(201,162,39,0.25)' : '#FEFCF5',
                    color: '#92720A', letterSpacing: 0.4,
                  }}>
                    2 meses grátis
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 40, alignItems: 'stretch' }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                display: 'flex', flexDirection: 'column',
                background: '#fff',
                border: plan.highlight ? '1.5px solid #C9A227' : `1px solid var(--marketing-border)`,
                borderRadius: 16,
                padding: '26px 24px',
                boxShadow: plan.highlight ? '0 18px 45px rgba(201,162,39,0.14)' : '0 6px 24px rgba(17,24,39,0.05)',
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: '#C9A227', color: '#111827', fontSize: 10, fontWeight: 800,
                  letterSpacing: 1.2, textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999,
                }}>
                  Mais escolhido
                </span>
              )}
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--marketing-gold-dark)', marginBottom: 4 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--marketing-muted)', marginBottom: 18 }}>
                {plan.audience}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--marketing-ink)' }}>
                  {fmt(billing === 'monthly' ? plan.monthly : plan.yearlyMonthly)}
                </span>
                <span style={{ fontSize: 14, color: 'var(--marketing-muted)', fontWeight: 600 }}>/mês</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--marketing-faint)', minHeight: 18, marginBottom: 16 }}>
                {billing === 'yearly'
                  ? `cobrado anualmente: ${fmt(plan.yearlyTotal)} (2 meses grátis)`
                  : 'sem fidelidade · cancele quando quiser'}
              </div>

              <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: 'flex', gap: 9, fontSize: 12.5, color: 'var(--marketing-muted)', lineHeight: 1.5 }}>
                    <Check size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--marketing-gold-dark)' }} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/login"
                style={{
                  display: 'block', textAlign: 'center', padding: '13px 16px', borderRadius: 10,
                  background: plan.name === 'Imobiliária+' ? '#F7F4EE' : '#111827',
                  color: plan.name === 'Imobiliária+' ? '#111827' : '#fff',
                  fontWeight: 700, fontSize: 13.5, textDecoration: 'none', border: plan.name === 'Imobiliária+' ? '1px solid var(--marketing-border)' : 'none',
                }}
              >
                {plan.cta} <ArrowRight size={14} style={{ verticalAlign: '-2px', marginLeft: 4 }} />
              </a>
            </div>
          ))}
        </div>

        {/* Free + institutional */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 16, marginTop: 16 }} className="pricing-bottom">
          <div style={{ background: '#FEFCF5', border: '1px solid #E8D99A', borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Comece grátis</div>
            <div style={{ fontSize: 12.5, color: 'var(--marketing-muted)', lineHeight: 1.6, marginTop: 4 }}>
              <strong style={{ color: '#111827' }}>R$ 0</strong> — 2 estudos por mês, valores indicativos com faixa e memória de cálculo. Sem cartão.
            </div>
            <a href="/login" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, fontWeight: 700, color: '#111827', textDecoration: 'none', borderBottom: '1.5px solid #C9A227', paddingBottom: 2, width: 'fit-content' }}>
              Criar conta grátis →
            </a>
          </div>
          <div style={{ background: '#111827', borderRadius: 16, padding: '24px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C9A227', marginBottom: 5 }}>
                Institucional
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Bancos, consórcios e escritórios credenciados</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginTop: 4 }}>
                Quotas sob medida, API, SSO e conformidade para produção de laudos em escala — a partir de R$ 1.500/mês, sob contrato.
              </div>
            </div>
            <a href="/login" style={{ whiteSpace: 'nowrap', padding: '12px 18px', borderRadius: 10, background: '#C9A227', color: '#111827', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
              Falar com especialista
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', margin: '28px 0 0', fontSize: 12, color: 'var(--marketing-faint)' }}>
          Pagamento via Pix ou cartão · 7 dias grátis nos planos pagos · O preço é por organização, não por usuário.
        </p>
      </div>
    </section>
  )
}

const FAQ_ITEMS = [  {
    question: 'O que é a AVALIA?',
    answer: 'A AVALIA é uma plataforma de avaliação imobiliária assistida por inteligência artificial. Ela organiza os dados do imóvel, compara anúncios da região e apresenta uma estimativa informativa com os fatores que sustentam o resultado.',
  },
  {
    question: 'Como funciona a cobrança e posso cancelar?',
    answer: 'A assinatura é por organização (não por usuário) e pode ser paga mensal ou anualmente — o plano anual dá 2 meses grátis. Não há fidelidade: cancele quando quiser e, se a cota de estudos do mês acabar, você pode comprar créditos avulsos sem mudar de plano.',
  },
  {
    question: 'O estudo substitui o PTAM?',
     answer: 'Não. A AVALIA adianta a pesquisa e os cálculos, mas não substitui o PTAM nem um laudo elaborado e assinado por profissional habilitado. O avaliador permanece responsável pela análise crítica, vistoria e conclusão do valor.',
  },
  {
    question: 'De onde vêm os dados comparáveis?',
    answer: 'A plataforma trabalha principalmente com anúncios imobiliários georreferenciados e referências de mercado organizadas por região. A disponibilidade e a qualidade da amostra variam conforme a cidade, o bairro e a tipologia.',
  },
  {
    question: 'Quais imóveis podem ser avaliados?',
    answer: 'O fluxo contempla apartamentos, casas, imóveis comerciais e terrenos. Para terrenos, a plataforma também pode apresentar cenários ilustrativos baseados nas premissas configuradas, sem substituir uma análise urbanística oficial.',
  },
  {
    question: 'Como a AVALIA trata a privacidade e a LGPD?',
    answer: 'A plataforma coleta apenas o necessário para a avaliação, remove metadados de localização das fotos, restringe o acesso por conta e organização e mantém logs de auditoria. A AVALIA atua como operadora dos dados; o corretor ou a imobiliária é o controlador e responde pela autorização do proprietário do imóvel.',
  },
  {
    question: 'Como a inteligência artificial participa do processo?',
    answer: 'A IA pode transformar uma descrição em texto ou áudio em dados estruturados para revisão. O cálculo combina métodos estatísticos e regras de homogeneização quando há dados suficientes para isso.',
  },
]

export default function LandingPage() {
  return (
    <div className="marketing-page">
      <header className="marketing-header">
        <div className="marketing-container marketing-header-inner">
          <BrandMark />
          <nav className="marketing-desktop-nav" aria-label="Navegação principal">
            <a href="#produto">O produto</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#metodologia">Metodologia</a>
            <a href="#relatorio">Relatório</a>
          </nav>
          <div className="marketing-header-actions">
            <a href="/app" className="marketing-header-login">Acessar plataforma</a>
            <a href="#como-funciona" className="marketing-button marketing-button-dark marketing-button-small">
              Conhecer a AVALIA <ArrowRight size={14} />
            </a>
          </div>
          <details className="marketing-mobile-menu">
            <summary aria-label="Abrir menu"><span /><span /><span /></summary>
            <nav aria-label="Navegação móvel">
              <a href="#produto">O produto</a>
              <a href="#como-funciona">Como funciona</a>
              <a href="#metodologia">Metodologia</a>
              <a href="#relatorio">Relatório</a>
              <a href="/app">Acessar plataforma</a>
            </nav>
          </details>
        </div>
      </header>

      <main>
        <section className="marketing-hero">
          <div className="marketing-container marketing-hero-grid">
            <div className="marketing-hero-copy">
              <div className="marketing-hero-eyebrow"><span className="marketing-live-dot" /> Avaliação imobiliária assistida por IA</div>
              <h1>O valor do imóvel, <em>explicado</em> pelos dados que o sustentam.</h1>
              <p className="marketing-hero-lead">Estime um valor de mercado indicativo usando anúncios comparáveis, localização e características do imóvel. Veja a faixa, os fatores considerados e o grau de confiança em um só lugar.</p>
              <div className="marketing-hero-actions">
                <a href="#como-funciona" className="marketing-button marketing-button-primary">Conheça como funciona <ArrowRight size={16} /></a>
                <a href="#relatorio" className="marketing-text-link">Ver prévia do relatório <ArrowDownRight size={16} /></a>
              </div>
              <div className="marketing-hero-note"><ShieldCheck size={15} /> Estimativa informativa. Não substitui laudo assinado por profissional habilitado.</div>
            </div>
            <ProductPreview />
          </div>
          <div className="marketing-hero-gridline marketing-container" aria-hidden="true"><span /><span /><span /><span /></div>
        </section>

        <section className="marketing-proof-strip" aria-label="Recursos da plataforma">
          <div className="marketing-container marketing-proof-grid">
            <div><MapPinned size={17} /><span><strong>Anúncios comparáveis</strong><small>Georreferenciados por região</small></span></div>
            <div><Ruler size={17} /><span><strong>Valor por m²</strong><small>Homogeneização do imóvel</small></span></div>
            <div><ScanSearch size={17} /><span><strong>Memória de cálculo</strong><small>Fatores visíveis no resultado</small></span></div>
            <div><FileDown size={17} /><span><strong>Relatório exportável</strong><small>Consulta clara e organizada</small></span></div>
          </div>
        </section>

        <section id="produto" className="marketing-section marketing-product-section">
          <div className="marketing-container">
            <SectionHeading
              eyebrow="DECISÃO COM CONTEXTO"
              title="Mais do que um número: uma leitura do mercado ao redor."
              description="A AVALIA transforma informações dispersas em uma visão organizada do imóvel, da vizinhança e dos fatores que movem o valor."
            />
            <div className="marketing-feature-grid">
              <FeatureCard icon={MapPinned} title="Localização que informa">Veja comparáveis próximos e pontos de interesse para entender o contexto em que o imóvel está inserido.</FeatureCard>
              <FeatureCard icon={GitCompareArrows} title="Métodos que se complementam">O motor pode combinar diferentes abordagens estatísticas quando a quantidade e a qualidade dos dados permitem.</FeatureCard>
              <FeatureCard icon={Layers3} title="Resultado que você explica">A estimativa vem acompanhada dos fatores, ajustes e referências que ajudam a sustentar a decisão.</FeatureCard>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="marketing-section marketing-process-section">
          <div className="marketing-container">
            <SectionHeading
              eyebrow="DO IMÓVEL AO RELATÓRIO"
              title="Um processo técnico sem tornar a decisão complicada."
              description="A experiência foi desenhada para que você comece com as informações que já tem e refine o resultado ao longo do caminho."
              light
            />
            <div className="marketing-steps-grid">
              <StepCard number="01" icon={Mic} title="Descreva">Comece por texto, áudio ou preenchimento manual. A IA ajuda a organizar os dados para sua revisão.</StepCard>
              <StepCard number="02" icon={House} title="Contextualize">Informe área, tipologia, conservação, comodidades e características que diferenciam o imóvel.</StepCard>
              <StepCard number="03" icon={MapPinned} title="Compare">O motor busca referências próximas e ajusta a leitura conforme localização, área e tipologia.</StepCard>
              <StepCard number="04" icon={FileText} title="Interprete">Receba valor, faixa indicativa, confiança, comparáveis e memória de cálculo em um relatório organizado.</StepCard>
            </div>
            <div className="marketing-process-callout"><Sparkles size={18} /><span><strong>IA no lugar certo:</strong> acelera a entrada e a organização dos dados, enquanto você mantém a revisão e o contexto da decisão.</span></div>
          </div>
        </section>

        <section id="metodologia" className="marketing-section marketing-methodology-section">
          <div className="marketing-container marketing-methodology-grid">
            <div>
              <SectionHeading
                eyebrow="METODOLOGIA TRANSPARENTE"
                title="Confiança não é uma promessa. É contexto para interpretar o resultado."
                description="A AVALIA mostra a amostra disponível, os métodos utilizados e os ajustes aplicados. Assim, você entende quando o mercado oferece uma leitura mais consistente e quando é preciso ter cautela."
              />
              <div className="marketing-method-list">
                <MethodCard icon={BarChart3} title="MCD + IDW" detail="Ponderação por distância dos comparáveis" />
                <MethodCard icon={TrendingUp} title="WLS" detail="Regressão ponderada quando há amostra suficiente" />
                <MethodCard icon={Sparkles} title="GBDT" detail="Modelo complementar conforme disponibilidade de dados" />
              </div>
              <p className="marketing-footnote">Metodologia inspirada em referências da ABNT NBR 14.653. O resultado é informativo e depende da disponibilidade de dados locais.</p>
            </div>
            <div className="marketing-method-visual">
              <div className="marketing-method-visual-header"><span>Construção do valor</span><span className="font-mono">R$/m²</span></div>
              <div className="marketing-method-visual-value">R$ 7.518<span>/m²</span></div>
              <div className="marketing-method-chart" aria-label="Visualização ilustrativa dos ajustes do valor">
                <div className="marketing-chart-row"><span>Comparáveis ajustados</span><i><b style={{ width: '81%' }} /></i><strong>R$ 7.240</strong></div>
                <div className="marketing-chart-row"><span>Fatores físicos</span><i><b style={{ width: '67%' }} /></i><strong>× 1,06</strong></div>
                <div className="marketing-chart-row"><span>Comodidades e entorno</span><i><b style={{ width: '53%' }} /></i><strong>× 1,02</strong></div>
                <div className="marketing-chart-row"><span>Oferta e tipologia</span><i><b style={{ width: '42%' }} /></i><strong>contexto</strong></div>
              </div>
              <div className="marketing-method-visual-footer"><span><span className="marketing-small-gold-dot" /> Ajustes visíveis</span><span><Check size={13} /> Leitura comparável</span></div>
            </div>
          </div>
        </section>

        <section id="relatorio" className="marketing-section marketing-report-section">
          <div className="marketing-container marketing-report-grid">
            <ReportPreview />
            <div className="marketing-report-copy">
              <SectionHeading
                eyebrow="UM RESULTADO QUE CONTINUA ÚTIL"
                title="O relatório organiza a conversa em torno do imóvel."
                description="Consulte o valor estimado, compare referências e explique os ajustes sem depender de uma planilha solta ou de um número sem origem."
              />
              <ul className="marketing-check-list">
                <li><Check size={16} /> Ficha técnica do imóvel e valor por m²</li>
                <li><Check size={16} /> Comparáveis e contexto da vizinhança</li>
                <li><Check size={16} /> Faixa indicativa e indicador de confiança</li>
                <li><Check size={16} /> Memória de cálculo e exportação em PDF</li>
              </ul>
              <a href="/app" className="marketing-button marketing-button-dark">Explorar a plataforma <ArrowRight size={16} /></a>
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-audience-section">
          <div className="marketing-container">
            <SectionHeading
              eyebrow="PARA QUEM TRABALHA COM VALOR"
              title="Uma base de decisão para diferentes momentos do mercado."
              description="A plataforma ajuda quem precisa formar, revisar ou comunicar uma opinião de valor com mais contexto."
            />
            <div className="marketing-audience-grid">
              <div className="marketing-audience-card"><Building2 size={20} /><strong>Corretores</strong><span>Agilize a precificação e leve uma conversa mais fundamentada para o proprietário.</span></div>
              <div className="marketing-audience-card"><Target size={20} /><strong>Avaliadores</strong><span>Organize comparáveis, fatores e memória de cálculo em uma única experiência.</span></div>
              <div className="marketing-audience-card"><BarChart3 size={20} /><strong>Imobiliárias</strong><span>Crie uma linguagem comum para decisões de preço e acompanhamento de mercado.</span></div>
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-security-section">
          <div className="marketing-container">
            <SectionHeading
              eyebrow="SEGURANÇA E PRIVACIDADE"
              title="Tratamento de dados com responsabilidade."
              description="A AVALIA adota medidas técnicas e organizacionais para proteger os dados tratados na plataforma, com transparência alinhada à LGPD."
            />
            <div className="marketing-audience-grid">
              <div className="marketing-audience-card"><Lock size={20} /><strong>Armazenamento privado</strong><span>Fotos e estudos ficam em ambiente com controle de acesso; imagens são entregues por URLs de curta duração.</span></div>
              <div className="marketing-audience-card"><ShieldCheck size={20} /><strong>Privacidade por padrão</strong><span>Metadados de localização (GPS) das fotos são removidos no envio, e apenas o necessário é coletado.</span></div>
              <div className="marketing-audience-card"><FileSearch size={20} /><strong>LGPD</strong><span>Transparência sobre o tratamento, responsabilidade técnica do avaliador e canais para direitos do titular.</span></div>
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="marketing-section marketing-faq-section">
          <div className="marketing-container marketing-faq-grid">
            <SectionHeading
              eyebrow="PERGUNTAS FREQUENTES"
              title="Clareza também é parte da metodologia."
              description="As respostas abaixo explicam o que a plataforma faz e onde termina o alcance de uma estimativa automatizada."
            />
            <div className="marketing-faq-list">
              {FAQ_ITEMS.map(item => (
                <details key={item.question}>
                  <summary>{item.question}<ChevronDown size={18} /></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-closing-section">
          <div className="marketing-container marketing-closing-inner">
            <div>
              <span className="marketing-eyebrow">AVALIA</span>
              <h2>Decisões imobiliárias começam com uma boa leitura do valor.</h2>
            </div>
            <a href="/app" className="marketing-button marketing-button-light">Acessar a plataforma <ArrowRight size={16} /></a>
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="marketing-container">
          <div className="marketing-footer-top">
            <BrandMark inverse />
            <div className="marketing-footer-links"><a href="#produto">O produto</a><a href="#metodologia">Metodologia</a><a href="#relatorio">Relatório</a><a href="/app">Plataforma</a></div>
          </div>
          <div className="marketing-footer-bottom">
            <span>© 2026 AVALIA. Avaliação imobiliária assistida por IA.</span>
            <span>Estimativa automatizada e informativa. Não substitui laudo assinado por profissional habilitado.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
