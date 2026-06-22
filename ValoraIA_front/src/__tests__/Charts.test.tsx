import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MiniLineChart, RadarChart, ConfidenceBadge, BarIndicator } from '../components/Charts'

describe('MiniLineChart', () => {
  it('renderiza um SVG com polyline', () => {
    const { container } = render(<MiniLineChart data={[10, 20, 15, 25]} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg!.getAttribute('viewBox')).toBe('0 0 280 120')
    const polyline = svg!.querySelector('polyline')
    expect(polyline).toBeInTheDocument()
  })

  it('renderiza circle no último ponto', () => {
    const { container } = render(<MiniLineChart data={[10, 20, 30]} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(1)
  })

  it('aceita cor customizada', () => {
    const { container } = render(<MiniLineChart data={[5, 10]} color="#FF0000" width={200} height={100} />)
    const polyline = container.querySelector('polyline')
    expect(polyline!.getAttribute('stroke')).toBe('#FF0000')
  })

  it('renderiza com array de 1 elemento sem erro', () => {
    const { container } = render(<MiniLineChart data={[42]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('RadarChart', () => {
  const factors = [
    { label: 'Localização', value: 0.8 },
    { label: 'Condição', value: 0.6 },
    { label: 'Demanda', value: 0.9 },
  ]

  it('renderiza SVG com grid e polígono de dados', () => {
    const { container } = render(<RadarChart factors={factors} size={240} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    const polygons = svg!.querySelectorAll('polygon')
    expect(polygons.length).toBeGreaterThanOrEqual(2)
  })

  it('renderiza labels dos fatores', () => {
    render(<RadarChart factors={factors} />)
    expect(screen.getByText('Localização')).toBeInTheDocument()
    expect(screen.getByText('Condição')).toBeInTheDocument()
    expect(screen.getByText('Demanda')).toBeInTheDocument()
  })

  it('renderiza dots nos vértices dos dados', () => {
    const { container } = render(<RadarChart factors={factors} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(factors.length)
  })
})

describe('ConfidenceBadge', () => {
  it('exibe o score formatado', () => {
    render(<ConfidenceBadge score={85} />)
    expect(screen.getByText('85% Conf.')).toBeInTheDocument()
  })

  it('usa cor ouro para score >= 75', () => {
    const { container } = render(<ConfidenceBadge score={95} />)
    const span = container.firstElementChild as HTMLElement
    expect(span.style.color).toBe('rgb(201, 162, 39)')
  })

  it('usa cor ouro para score entre 75 e 89', () => {
    const { container } = render(<ConfidenceBadge score={80} />)
    const span = container.firstElementChild as HTMLElement
    expect(span.style.color).toBe('rgb(201, 162, 39)')
  })

  it('usa cor amarela para score entre 60 e 74', () => {
    const { container } = render(<ConfidenceBadge score={65} />)
    const span = container.firstElementChild as HTMLElement
    expect(span.style.color).toBe('rgb(245, 158, 11)')
  })

  it('usa cor vermelha para score < 60', () => {
    const { container } = render(<ConfidenceBadge score={50} />)
    const span = container.firstElementChild as HTMLElement
    expect(span.style.color).toBe('rgb(239, 68, 68)')
  })
})

describe('BarIndicator', () => {
  it('exibe label e valor percentual', () => {
    render(<BarIndicator label="Localização" value={75} />)
    expect(screen.getByText('Localização')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('renderiza barra com a largura correta', () => {
    const { container } = render(<BarIndicator label="Condição" value={60} color="#10B981" />)
    const bar = container.querySelector('div > div > div:nth-child(2) > div') as HTMLElement
    expect(bar.style.width).toBe('60%')
    expect(bar.style.background).toBe('rgb(16, 185, 129)')
  })
})
