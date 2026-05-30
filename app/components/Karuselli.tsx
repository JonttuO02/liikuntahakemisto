'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]
const AUTO_MS    = 4000
const CARD_W     = 0.62   // card width as fraction of container
const STEP       = 0.54   // x-offset per step as fraction of container

const MAINOKSET = [
  { id: '1', label: 'Mainos · A' },
  { id: '2', label: 'Mainos · B' },
  { id: '3', label: 'Mainos · C' },
  { id: '4', label: 'Mainos · D' },
]

function cardAnimate(offset: number, containerW: number) {
  const abs = Math.abs(offset)
  return {
    x:       offset * containerW * STEP,
    rotateY: offset * -40,
    scale:   1 - abs * 0.1,
    z:       -abs * 70,
    opacity: abs > 1.4 ? 0 : 1,
  }
}

export default function Karuselli({ isDark }: { isDark: boolean }) {
  const [current, setCurrent]     = useState(0)
  const [containerW, setW]        = useState(320)
  const containerRef              = useRef<HTMLDivElement>(null)
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)
  const n                         = MAINOKSET.length

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(e => setW(e[0].contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % n), AUTO_MS)
  }, [n])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  const go = useCallback((dir: 1 | -1) => {
    setCurrent(c => (c + dir + n) % n)
    resetTimer()
  }, [n, resetTimer])

  const onDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.x < -40 || info.velocity.x < -300) go(1)
    else if (info.offset.x > 40 || info.velocity.x > 300) go(-1)
  }, [go])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative min-h-0 overflow-hidden"
      style={{
        perspective: 900,
        WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
        maskImage:       'linear-gradient(to bottom, black 90%, transparent 100%)',
      }}
    >
      {MAINOKSET.map((m, i) => {
        const raw    = (i - current + n) % n
        const offset = raw > n / 2 ? raw - n : raw
        const isCenter = offset === 0

        return (
          <motion.div
            key={m.id}
            className={`absolute top-0 rounded-2xl flex items-center justify-center
              ${isCenter ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
              ${isDark ? 'glass-dark' : 'glass'}`}
            style={{
              width:  `${CARD_W * 100}%`,
              left:   `${((1 - CARD_W) / 2) * 100}%`,
              bottom: '5%',
              maxHeight: 160,
              zIndex: isCenter ? 10 : Math.abs(offset) === 1 ? 5 : 1,
            }}
            animate={cardAnimate(offset, containerW)}
            transition={{ duration: 0.45, ease: EASE }}
            drag={isCenter ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
            onClick={() => { if (!isCenter) go(offset > 0 ? 1 : -1) }}
          >
            <span className={`text-[11px] font-medium tracking-widest uppercase pointer-events-none
              ${isDark ? 'text-[rgba(255,255,255,0.18)]' : 'text-[rgba(17,17,17,0.28)]'}`}>
              {m.label}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
