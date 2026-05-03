import type { RadarFactor } from '../types'

interface MiniLineChartProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function MiniLineChart({ data, color = '#10B981', width = 280, height = 120 }: MiniLineChartProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 20) - 10
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v - min) / range) * (height - 20) - 10
        return i === data.length - 1 ? (
          <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#fff" strokeWidth="2" />
        ) : null
      })}
    </svg>
  )
}

interface RadarChartProps {
  factors: RadarFactor[]
  size?: number
}

export function RadarChart({ factors, size = 240 }: RadarChartProps) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 30
  const n = factors.length
  const angleStep = (Math.PI * 2) / n

  const getPoint = (i: number, val: number) => {
    const angle = angleStep * i - Math.PI / 2
    return {
      x: cx + Math.cos(angle) * r * val,
      y: cy + Math.sin(angle) * r * val,
    }
  }

  const gridLevels = [0.25, 0.5, 0.75, 1]
  const dataPoints = factors.map((f, i) => getPoint(i, f.value))

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: size }}>
      {gridLevels.map((level, li) => {
        const pts = factors.map((_, i) => getPoint(i, level))
        return (
          <polygon
            key={li}
            points={pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        )
      })}
      {factors.map((_, i) => {
        const p = getPoint(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E2E8F0" strokeWidth="1" />
      })}
      <polygon
        points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(16,185,129,0.15)"
        stroke="#10B981"
        strokeWidth="2"
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#10B981" stroke="#fff" strokeWidth="2" />
      ))}
      {factors.map((f, i) => {
        const p = getPoint(i, 1.18)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#64748B"
            fontWeight="500"
          >
            {f.label}
          </text>
        )
      })}
    </svg>
  )
}

interface ConfidenceBadgeProps {
  score: number
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const color = score >= 90 ? '#10B981' : score >= 75 ? '#F59E0B' : '#EF4444'
  const bg = score >= 90 ? '#ECFDF5' : score >= 75 ? '#FFFBEB' : '#FEF2F2'

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {score}% Conf.
    </span>
  )
}

interface BarIndicatorProps {
  label: string
  value: number
  color?: string
  tooltip?: string
}

export function BarIndicator({ label, value, color = '#1E3A8A', tooltip }: BarIndicatorProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 text-slate-500">
        <span className={`${tooltip ? 'cursor-help border-b border-dotted border-slate-300' : ''}`}>
          {tooltip ? (
            <span className="group relative inline-block">
              {label}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal w-56 z-50 text-center leading-relaxed">
                {tooltip}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800" />
              </span>
            </span>
          ) : (
            label
          )}
        </span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ background: color, width: `${value}%` }}
        />
      </div>
    </div>
  )
}
