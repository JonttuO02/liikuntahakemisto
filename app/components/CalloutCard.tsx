'use client'

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { lajiKonfig } from '@/lib/lajit'
import { SportIcon } from '@/lib/sportIcons'
import { hintateksti } from '@/lib/utils'
import { isMembershipOnly, priceItemList } from '@/lib/priceUtils'
import { useOverflowMarquee } from '@/lib/useOverflowMarquee'
import { getContrastColor, darkenHex, lightenHex } from '@/lib/branding/brandingResult'
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

// Generous on purpose: a thin margin is sensitive to any sub-pixel rounding/antialiasing
// mismatch between the card's clip-path and the backdrop's scaled-up copy, which can leave
// a hairline gap. A wider margin makes the visible ring more tolerant of that.
const RING_WIDTH = 8

export default function CalloutCard({
  p,
  brandColor,
  accentColor,
}: {
  p: Liikuntapaikka & { latitude: number; longitude: number }
  /** Optional user-selected brand background color (Phase 48). When provided, tints the
   * card surface and adjusts text contrast — mirrors DiagonaalKortti's existing `brandColor`
   * prop. Omitted entirely on the live map today, so default rendering is unchanged. */
  brandColor?: string
  /** Optional user-selected accent color (Phase 48/onboarding follow-up). When provided,
   * adds a rotating conic-gradient ring around the card's outer edge — same technique as
   * the map pin's `.pin-arc` (globals.css), recolored to the brand's accent and traced
   * around the card's actual notched silhouette instead of a plain circle. */
  accentColor?: string
}) {
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
  // Derived contrast text colour for the brand-coloured card surface — mirrors
  // DiagonaalKortti's existing brandColor handling. Undefined (no override) when
  // brandColor is not supplied, leaving default Tailwind text colours unchanged.
  const contrastText = brandColor ? getContrastColor(brandColor) : undefined

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
    <div className="relative" style={{ width: 160, height: 171 }}>
      {accentColor && clipPath && (
        // Same idea as the map pin's `.pin-arc`: a same-shaped, slightly bigger object sits
        // BEHIND the card, so only a thin sliver peeks out around the edge. The object
        // itself stays perfectly still (no transform other than the static scale-up) — only
        // the gradient's `from` angle animates (via the --ring-angle custom property
        // registered in globals.css), sweeping the light/dark color band around it. Unlike
        // `.pin-arc` (a perfect circle, where the whole element CAN safely rotate because a
        // circle's boundary is rotationally symmetric), this card's notched boundary is not
        // symmetric — actually rotating the element would spin its silhouette into a
        // moving diamond, so the boundary must stay static while only the colors move.
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: `path('${clipPath}')`,
            background: `conic-gradient(from var(--ring-angle), ${lightenHex(accentColor, 0.55)} 0deg, ${darkenHex(accentColor, 0.45)} 90deg, ${accentColor} 180deg, ${darkenHex(accentColor, 0.45)} 270deg, ${lightenHex(accentColor, 0.55)} 360deg)`,
            transform: `scale(${1 + RING_WIDTH / 80})`,
            animation: 'ringAngleSpin 3s linear infinite',
          } as React.CSSProperties}
        />
      )}
      <div
        ref={ref}
        className="glass cursor-pointer relative"
        style={{
          width: 160,
          height: 171,
          paddingTop: 12,
          paddingLeft: 12,
          paddingRight: 12,
          paddingBottom: 23,
          clipPath: clipPath ? `path('${clipPath}')` : undefined,
          borderRadius: clipPath ? 0 : 10,
          // `box-shadow` is NOT clipped by `clip-path` the same way background/border are —
          // it follows the element's full rectangular box, so .glass's outer shadow bleeds out
          // past the notch as a visible rectangle once a path is active. `filter: drop-shadow()`
          // follows the actual painted (clipped) silhouette instead, so swap to that for the two
          // outer shadows once we have a real notch shape; keep the inset highlight as box-shadow
          // since drop-shadow has no inset form and the inset sheen clips correctly as-is.
          // Shared with the main customer-facing map (Etusivu.tsx uses this same component) —
          // this branch was originally motivated by a bug found on the admin venue map's
          // clip-path-rounded container, but it's a latent-bug fix here too, not a behavior change.
          ...(clipPath ? {
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,1)',
            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.09)) drop-shadow(0 1px 4px rgba(0,0,0,0.05))',
          } : {}),
          // Override the FULL `background` (not just backgroundColor) so brandColor fully
          // replaces .glass's white gradient background-image — setting backgroundColor alone
          // leaves the gradient layered on top, visibly washing the brand color out toward
          // white. The .glass class's border/box-shadow (gloss highlight, edge sheen) are
          // untouched, so the card keeps its glossy feel without lightening the actual color.
          ...(brandColor ? { background: brandColor } : {}),
          // .glass's 1px white border (border-top/left/right/bottom) AND its top-edge inset
          // box-shadow sheen (`inset 0 1px 0 rgba(255,255,255,1)`, a glassmorphism highlight
          // line) are both normally invisible against the page's white background — but
          // with the accent ring sitting directly behind/around the card, both become a
          // visible white seam (the box-shadow specifically explained a seam on the TOP
          // edge only, since it's a one-sided inset). Removing both when the ring is
          // present lets the ring sit flush against the card with no gap anywhere.
          ...(accentColor ? { border: 'none', boxShadow: 'none' } : {}),
        }}
      >
      <div className="flex flex-col gap-2 h-full">
        {p.logo_url ? (
          // rounded-xl + object-contain (not rounded-full + object-cover) so logos of any
          // aspect ratio are always shown in full, never cropped to fill a circular mask —
          // padding gives differently-shaped logos breathing room against the box edge.
          <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-[rgba(0,0,0,0.06)] overflow-hidden p-1">
            <img
              src={p.logo_url}
              alt=""
              aria-hidden
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: sportColor }}
          >
            <span className="text-base font-bold text-white">{p.nimi[0]?.toUpperCase() ?? '?'}</span>
          </div>
        )}
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
                style={contrastText ? { color: contrastText } : undefined}
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
                <span className="flex items-center text-lg font-bold text-[#111111]" style={contrastText ? { color: contrastText } : undefined}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
    </div>
  )
}
