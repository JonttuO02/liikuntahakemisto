'use client'

import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

export default function MapAutoZoom({ target, onComplete }: {
  target: { lat: number; lng: number } | null
  onComplete: () => void
}) {
  const map = useMap()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!map || !target) return
    const m = map
    const tgt = target
    const fromCenter = m.getCenter()
    const fromZoom = m.getZoom() ?? 14
    if (!fromCenter) return
    const fromLat = fromCenter.lat()
    const fromLng = fromCenter.lng()
    const toZoom = Math.max(fromZoom, 16)
    const duration = 700
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    let start: number | null = null
    let raf: number
    function step(ts: number) {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const e = ease(t)
      m.moveCamera({
        center: { lat: fromLat + (tgt.lat - fromLat) * e, lng: fromLng + (tgt.lng - fromLng) * e },
        zoom: fromZoom + (toZoom - fromZoom) * e,
      })
      if (t < 1) raf = requestAnimationFrame(step)
      else onCompleteRef.current()
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [map, target])

  return null
}
