'use client'

import { useRef, useState, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Check, Building2, Camera, BadgeCheck } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { SportIcon } from '@/lib/sportIcons'
import { hintateksti } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly, priceItemList } from '@/lib/priceUtils'
import { useOverflowMarquee } from '@/lib/useOverflowMarquee'
import type { Liikuntapaikka } from '@/lib/types'
import { useTranslations } from 'next-intl'

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export const diagonaalKorttiVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}

interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  isSaved?: boolean
  onShowMap?: (paikka: Liikuntapaikka) => void
  onCardClick?: () => void
  onToggleTodo?: (id: number) => void
}

export default function DiagonaalKortti({ paikka, distanceStr, isSaved, onShowMap, onCardClick, onToggleTodo }: DiagonaalKorttiProps) {
  const t = useTranslations('PaikkaKortti')
  const tLajit = useTranslations('Lajit')
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const openStatus   = getOpenStatus(paikka.aukioloajat)
  const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const membershipOnly = isMembershipOnly(paikka)
  const priceItems   = priceItemList(paikka.hinta_kuvaus, membershipOnly, hintaTeksti)
  const { containerRef, measureRef, shouldMarquee } = useOverflowMarquee(priceItems?.join('\n') ?? null)
  const hasCoords    = paikka.latitude != null && paikka.longitude != null

  // Dynaaminen hinta-alueen leveys — lasketaan kortin todellisen leveyden mukaan.
  // Vasen paneeli on leikattu diagonaalipolygonilla (0 0, 62% 0, 57% 100%, 0 100%).
  // Hintatekstin kohdalla (y ≈ 55% kortin korkeudesta) leikkausraja ≈ 59,25% kortin leveydestä.
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const [priceAreaW, setPriceAreaW] = useState(120)
  useLayoutEffect(() => {
    const el = leftPanelRef.current
    if (!el) return
    const compute = () => {
      // 57% = polygon-leikkauksen alin piste (kuvan vasen alareuna).
      // Käytetään tätä tiukimpana rajana niin että sisältö ei koskaan mene
      // kuvan päälle riippumatta siitä millä korkeudella teksti on.
      const w = Math.floor(el.offsetWidth * 0.57) - 12 - 4
      setPriceAreaW(Math.max(60, w))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div
      variants={diagonaalKorttiVariants}
      className="relative glass glass-hover rounded-2xl h-36 cursor-pointer"
      whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.12, ease: 'easeOut' } }}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
      {/* z-10 ensures the MapPin button's z-20 always wins the stacking context */}
      <Link href={`/paikat/${paikka.id}`} className="absolute inset-0 block z-10" onClick={() => onCardClick?.()}>

        {/* LEFT: info panel */}
        <div
          ref={leftPanelRef}
          className="absolute inset-0 z-10 flex flex-col p-3 overflow-hidden"
          style={{ clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)' }}
        >
          <div className="flex items-start gap-2 self-start">
            {/* Logo slot — shows uploaded logo when available, falls back to Building2 */}
            <div className="w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
              {paikka.logo_url ? (
                <img
                  src={paikka.logo_url}
                  alt=""
                  aria-hidden
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Building2 size={20} className="text-[rgba(0,0,0,0.25)]" />
              )}
            </div>
            {/* Sport pill */}
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white truncate max-w-full mt-1"
              style={{ backgroundColor: laji.color }}
            >
              <SportIcon laji={paikka.laji} size={16} className="shrink-0" />
              {tLajit(paikka.laji as any)}
            </span>
          </div>

          {/* Name + price grouped tight, mt-1.5 gives minimal breathing room from badge */}
          <div className="flex flex-col gap-0.5 mt-1.5 min-w-0">
            <p className="font-bold text-[#111111] text-sm leading-snug line-clamp-1 overflow-hidden">
              {paikka.nimi}
              {paikka.business_managed && (
                <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />
              )}
            </p>
            {membershipOnly ? (
              <span className="text-xs text-[rgba(17,17,17,0.5)]">{t('membershipOnly')}</span>
            ) : priceItems ? (
              <div
                ref={containerRef}
                className="overflow-hidden relative"
                style={{
                  maxWidth: priceAreaW,
                  // Maski on aina päällä. Fade LOPPUU 78%:iin kontista — jättää 22% tyhjää
                  // puskuritilaa ennen kontin fyysistä reunaa (joka on lähellä diagonaalia).
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 70%, transparent 86%)',
                  maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 70%, transparent 86%)',
                }}
              >
                {/* Piilotettu mittausdiv — oikea pillileveys, rajataan priceAreaW:n mukaan */}
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
                    style={{ animation: 'marquee 8s linear infinite', willChange: 'transform' }}
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
              </div>
            ) : (
              <span className="text-xs text-[rgba(17,17,17,0.35)]">{t('priceComingSoon')}</span>
            )}
          </div>

          {/* Bottom row: mt-auto pins it to the bottom; pl-7 clears the map button */}
          <div className="flex items-center gap-3 pl-7 mt-auto min-w-0">
            {distanceStr && (
              <span className="text-xs tabular-nums text-[rgba(17,17,17,0.4)] shrink-0">{distanceStr}</span>
            )}
            {openStatus.status === 'open' && (
              <span className="text-xs font-bold text-green-700 truncate">
                {t('openNow')} · {openStatus.hours}
              </span>
            )}
            {openStatus.status === 'closed' && (
              <span className="text-xs text-[rgba(17,17,17,0.45)] truncate">{t('closed')}</span>
            )}
          </div>
        </div>

        {/* RIGHT: venue photo or sport-color fallback */}
        <div
          className="absolute top-0 right-0 bottom-0 overflow-hidden"
          style={{ left: '50%', clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 4% 100%)' }}
        >
          {paikka.image_url ? (
            <img
              src={paikka.image_url}
              alt={`Kuva: ${paikka.nimi}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget
                img.style.display = 'none'
                const fallback = img.parentElement?.querySelector('[data-fallback]') as HTMLElement | null
                if (fallback) fallback.hidden = false
              }}
            />
          ) : null}
          <div
            className="w-full h-full flex items-center justify-center bg-[rgba(0,0,0,0.06)]"
            aria-hidden
            data-fallback
            hidden={!!paikka.image_url}
          >
            <Camera size={24} className="text-[rgba(0,0,0,0.2)]" />
          </div>
        </div>

      </Link>
      {hasCoords && (
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); onShowMap?.(paikka) }}
          aria-label={t('showOnMap')}
          className="absolute bottom-2 left-2 z-20 w-7 h-7 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_ease]"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
      )}
      {onToggleTodo && (
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleTodo(paikka.id) }}
          aria-label={isSaved ? t('removeFromTodo') : t('addToTodo')}
          className="absolute bottom-3 right-3 z-20 w-7 h-7 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_ease]"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
      </div>
    </motion.div>
  )
}
