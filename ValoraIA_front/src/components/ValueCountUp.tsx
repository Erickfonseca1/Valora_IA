import { useEffect, useRef, useState } from 'react'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

interface Props {
  value: number
  animate?: boolean
  className?: string
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export default function ValueCountUp({ value, animate = true, className }: Props) {
  const [display, setDisplay] = useState(animate && !prefersReducedMotion() ? 0 : value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setDisplay(value)
      return
    }
    const duration = 900
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(Math.round(value * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, animate])

  return <span className={className}>{BRL.format(display)}</span>
}
