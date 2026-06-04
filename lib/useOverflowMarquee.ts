'use client'
import { useRef, useState, useEffect } from 'react'

/**
 * Mittaa DOM:ista ylivuotaako teksti kontistaan ja palauttaa marquee-lipun.
 * Reagoi kontin koon muutoksiin ResizeObserverilla.
 */
export function useOverflowMarquee(text: string | null) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef   = useRef<HTMLDivElement>(null)
  const [shouldMarquee, setShouldMarquee] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const measure   = measureRef.current
    if (!container || !measure || !text) { setShouldMarquee(false); return }
    const check = () => setShouldMarquee(measure.scrollWidth > container.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(container)
    return () => ro.disconnect()
  }, [text])

  return { containerRef, measureRef, shouldMarquee }
}
