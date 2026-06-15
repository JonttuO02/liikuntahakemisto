'use client'

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { lajiKonfig } from '@/lib/lajit'
import { SportIcon } from '@/lib/sportIcons'
import { hintateksti } from '@/lib/utils'
import { isMembershipOnly, priceItemList } from '@/lib/priceUtils'
import { useOverflowMarquee } from '@/lib/useOverflowMarquee'
import type { Liikuntapaikka } from '@/lib/types'

const CHAR_VARIANTS = {
  initial: { x: 16, opacity: 0 },
  enter:   { x: 0,  opacity: 1, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
  exit:    { x: -16, opacity: 0, transition: { duration: 0.1,  ease: 'easeIn' as const } },
}

const TEXT_CONTAINER_VARIANTS = {
  enter: { transition: { staggerChildren: 0.022 } },
  exit:  { transition: { staggerChildren: 0.014 } },
}

export default function CalloutCard({ p }: { p: Liikuntapaikka & { latitude: number; longitude: number } }) {
  const t = useTranslations('PaikkaKortti')
  const tLajit = useTranslations('Lajit')
  const ref = useRef<HTMLDivElement>(null)
  const [clipPath, setClipPath] = useState('')
  const [showName, setShowName] = useState(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const h = el.offsetHeight - 11
      setClipPath(
        `M 10,0 L 150,0 Q 160,0 160,10 L 160,${h - 10} Q 160,${h} 150,${h} L 90,${h} L 80,${h + 11} L 70,${h} L 10,${h} Q 0,${h} 0,${h - 10} L 0,10 Q 0,0 10,0 Z`
      )
    }
    const obs = new ResizeObserver(compute)
    obs.observe(el)
    compute()
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setShowName(v => !v), 2000)
    return () => clearInterval(id)
  }, [])

  const sportColor     = lajiKonfig[p.laji]?.color ?? '#6b7280'
  const membershipOnly = isMembershipOnly(p)
  const hintaTekstiCC  = hintateksti(p.hinta_min, p.hinta_max)
  const priceItems     = priceItemList(p.hinta_kuvaus, membershipOnly, hintaTekstiCC)
  const { containerRef, measureRef, shouldMarquee } = useOverflowMarquee(priceItems?.join('\n') ?? null)

  const chars = (text: string) =>
    text.split(' ').flatMap((word, wi) => [
      ...(wi > 0 ? [
        <motion.span key={`sp-${wi}`} className="inline-block" variants={CHAR_VARIANTS}>{' '}</motion.span>,
      ] : []),
      <span key={`w-${wi}`} className="whitespace-nowrap">
        {word.split('').map((char, ci) => (
          <motion.span key={ci} className="inline-block" variants={CHAR_VARIANTS}>{char}</motion.span>
        ))}
      </span>,
    ])

  return (
    <div
      ref={ref}
      className="glass cursor-pointer"
      style={{
        width: 160,
        height: 171,
        paddingTop: 12,
        paddingLeft: 12,
        paddingRight: 12,
        paddingBottom: 23,
        clipPath: clipPath ? `path('${clipPath}')` : undefined,
        borderRadius: clipPath ? 0 : 10,
      }}
    >
      <div className="flex flex-col gap-2 h-full">
        <div
          className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: sportColor }}
        >
          <span className="text-base font-bold text-white">{p.nimi[0]?.toUpperCase() ?? '?'}</span>
        </div>
        <div className="w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {showName ? (
              <motion.div
                key="name"
                variants={TEXT_CONTAINER_VARIANTS}
                initial="initial"
                animate="enter"
                exit="exit"
                className="font-bold text-lg text-[#111111] leading-snug"
              >
                {chars(p.nimi)}
              </motion.div>
            ) : (
              <motion.div
                key="sport"
                variants={TEXT_CONTAINER_VARIANTS}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex flex-wrap items-center gap-1"
              >
                <motion.span variants={CHAR_VARIANTS} className="flex items-center">
                  <span style={{ color: sportColor }}><SportIcon laji={p.laji} size={16} className="flex-shrink-0" /></span>
                </motion.span>
                <span className="flex items-center text-lg font-bold text-[#111111]">
                  {chars(tLajit(p.laji as any))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div
          ref={containerRef}
          className="mt-auto overflow-hidden relative"
          style={shouldMarquee ? {
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 82%, transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 82%, transparent 100%)',
          } : undefined}
        >
          {membershipOnly ? (
            <span className="text-xs text-[rgba(17,17,17,0.5)]">{t('membershipOnly')}</span>
          ) : priceItems ? (
            <>
              <div
                ref={measureRef}
                className="absolute invisible flex items-center gap-1.5 pointer-events-none"
                aria-hidden="true"
              >
                {priceItems.map((item, i) => (
                  <span key={i} className="text-xs font-bold tabular-nums bg-[rgba(0,0,0,0.05)] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {item}
                  </span>
                ))}
              </div>
              {shouldMarquee ? (
                <div
                  className="flex items-center gap-3 whitespace-nowrap"
                  style={{ animation: 'marquee 7s linear infinite', willChange: 'transform' }}
                >
                  {[...priceItems, ...priceItems].map((item, i) => (
                    <span key={i} className="shrink-0 text-xs font-bold text-[#111111] tabular-nums bg-[rgba(0,0,0,0.05)] px-1.5 py-0.5 rounded">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {priceItems.map((item, i) => (
                    <span key={i} className="text-xs font-bold text-[#111111] tabular-nums bg-[rgba(0,0,0,0.05)] px-1.5 py-0.5 rounded whitespace-nowrap">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
