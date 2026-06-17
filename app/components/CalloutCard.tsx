'use client'

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { lajiKonfig } from '@/lib/lajit'
import { SportIcon } from '@/lib/sportIcons'
import { hintateksti } from '@/lib/utils'
import { isMembershipOnly, priceItemList } from '@/lib/priceUtils'
import { useOverflowMarquee } from '@/lib/useOverflowMarquee'
import { getContrastColor } from '@/lib/branding/brandingResult'
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

const RING_WIDTH = 5

// Builds the card's notched-tooltip silhouette as an SVG path, optionally offset outward
// by `o` pixels on every edge (corner radius and notch depth/width grow with it too, so the
// result is a true parallel outline rather than a scaled copy). A scaled copy distorts an
// asymmetric shape — its off-center notch moves disproportionately relative to the
// rectangle as it scales from the element's center, leaving visible gaps on some sides and
// overlap on others. o=0 reproduces the card's own exact shape.
function buildCardClipPath(hRect: number, o: number): string {
  const r = 10 + o
  const xR = 160 + 2 * o
  const yB = hRect + 2 * o
  const notchHalfW = 10 + o
  const notchDepth = 11 + o
  const cx = o + 80
  return `M ${r},0 L ${xR - r},0 Q ${xR},0 ${xR},${r} L ${xR},${yB - r} Q ${xR},${yB} ${xR - r},${yB} L ${cx + notchHalfW},${yB} L ${cx},${yB + notchDepth} L ${cx - notchHalfW},${yB} L ${r},${yB} Q 0,${yB} 0,${yB - r} L 0,${r} Q 0,0 ${r},0 Z`
}

// Darkens a #rrggbb hex color by `amount` (0-1) — used to build the accent ring's
// conic-gradient stops (light/mid/dark shades of a single user-picked color), mirroring
// .pin-arc's light→dark→light blue sweep in globals.css but derived from one input color
// instead of three hardcoded blues.
function darkenHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 0xff) * (1 - amount))
  const g = Math.round(((n >> 8) & 0xff) * (1 - amount))
  const b = Math.round((n & 0xff) * (1 - amount))
  return `#${[r, g, b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`
}

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
  // The rounded-rectangle height (card's total height minus the 11px notch tip) — kept as a
  // raw number rather than a pre-built path string so both the card's own clip-path (o=0)
  // and the accent ring's offset clip-path (o=RING_WIDTH) can share buildCardClipPath.
  const [cardH, setCardH] = useState<number | null>(null)
  const [showName, setShowName] = useState(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => setCardH(el.offsetHeight - 11)
    const obs = new ResizeObserver(compute)
    obs.observe(el)
    compute()
    return () => obs.disconnect()
  }, [])

  const clipPath = cardH !== null ? buildCardClipPath(cardH, 0) : ''

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
      {accentColor && cardH !== null && (
        // Conic-gradient ring traced as a TRUE parallel offset of the card's silhouette
        // (buildCardClipPath with o=RING_WIDTH), not a scaled copy — scaling from center
        // distorts the off-center notch relative to the rectangle, leaving visible gaps on
        // some sides. Positioned via `inset: -RING_WIDTH` so its own local coordinate
        // origin lines up exactly with the offset path's (0,0). Unlike the map pin's
        // `.pin-arc` (a perfect circle, where rotating the whole element via
        // `transform: rotate()` is safe since a circle's boundary is rotationally
        // symmetric), this card's boundary is NOT symmetric — rotating the element itself
        // would visibly spin its notched silhouette into a moving diamond. Instead, only
        // the gradient's `from` angle animates (via the --ring-angle custom property
        // registered in globals.css), sweeping the light/dark color band around a
        // perfectly static boundary.
        <div
          className="absolute pointer-events-none"
          style={{
            inset: -RING_WIDTH,
            clipPath: `path('${buildCardClipPath(cardH, RING_WIDTH)}')`,
            background: `conic-gradient(from var(--ring-angle), ${accentColor}59 0deg, ${darkenHex(accentColor, 0.45)} 90deg, ${accentColor} 180deg, ${darkenHex(accentColor, 0.45)} 270deg, ${accentColor}59 360deg)`,
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
          // Override the FULL `background` (not just backgroundColor) so brandColor fully
          // replaces .glass's white gradient background-image — setting backgroundColor alone
          // leaves the gradient layered on top, visibly washing the brand color out toward
          // white. The .glass class's border/box-shadow (gloss highlight, edge sheen) are
          // untouched, so the card keeps its glossy feel without lightening the actual color.
          ...(brandColor ? { background: brandColor } : {}),
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
