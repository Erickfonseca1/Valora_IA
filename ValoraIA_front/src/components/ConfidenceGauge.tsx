const PRIMARY = '#1E3A8A'
const ACCENT = '#10B981'
const WARN = '#F59E0B'

interface Props {
  score: number | null
  size?: number
}

export default function ConfidenceGauge({ score, size = 120 }: Props) {
  if (score == null) return null

  const pct = Math.round(score <= 1 ? score * 100 : score)
  const clamped = Math.max(0, Math.min(100, pct))
  const color = clamped >= 75 ? ACCENT : WARN

  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped / 100)

  return (
    <svg
      data-testid="confidence-gauge"
      data-pct={String(clamped)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Grau de confiança ${clamped}%`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />
      <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.22} fontWeight={900} fill={PRIMARY}>
        {clamped}%
      </text>
      <text x="50%" y="66%" textAnchor="middle" fontSize={size * 0.1} fill="#64748B">
        confiança
      </text>
    </svg>
  )
}
