'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Bookmark, BookmarkCheck, BadgeCheck } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly, priceItemList } from '@/lib/priceUtils'
import { useOverflowMarquee } from '@/lib/useOverflowMarquee'
import type { Liikuntapaikka } from '@/lib/types'
import { SportIcon } from '@/lib/sportIcons'
import { useTranslations } from 'next-intl'

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export const korttiVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}

interface PaikkaKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  aukinyt?: boolean
  isTodo?: boolean
  onToggleTodo?: (id: number) => void
}

export default function PaikkaKortti({ paikka, distanceStr, aukinyt = false, isTodo, onToggleTodo }: PaikkaKorttiProps) {
  const t = useTranslations('PaikkaKortti')
  const tLajit = useTranslations('Lajit')
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const openStatus   = getOpenStatus(paikka.aukioloajat)
  const hasDropIn    = paikka.hinta_kuvaus?.toLowerCase().includes('kertakäynti') ?? false
  const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const membershipOnly = isMembershipOnly(paikka)
  const priceItems   = priceItemList(paikka.hinta_kuvaus, membershipOnly, hintaTeksti)
  const { containerRef, measureRef, shouldMarquee } = useOverflowMarquee(priceItems?.join('\n') ?? null)
  const osoite       = [paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')

  return (
    <motion.div
      variants={korttiVariants}
      className="relative glass glass-hover rounded-2xl flex flex-col overflow-hidden cursor-default"
      whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
    >
      {onToggleTodo && (
        <motion.button
          whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleTodo(paikka.id) }}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full glass-btn flex items-center justify-center"
          aria-label={isTodo ? t('removeFromTodo') : t('addToTodo')}
        >
          {isTodo
            ? <BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
            : <Bookmark className="w-4 h-4 text-[rgba(17,17,17,0.35)]" />
          }
        </motion.button>
      )}
      <div className="p-4 flex flex-col gap-2.5 flex-1">

        {/* Badge row: [sport pill] [Sponsoroitu?] [Kertakäynti OK?] */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: laji.color }}
          >
            <SportIcon laji={paikka.laji} size={12} className="shrink-0" />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {tLajit(paikka.laji as any)}
          </span>
          {paikka.featured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {t('sponsored')}
            </span>
          )}
          {hasDropIn && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-[rgba(17,17,17,0.06)] text-[rgba(17,17,17,0.55)]">
              {t('dropIn')}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/paikat/${paikka.id}`}>
          <h3 className="font-bold text-[#111111] text-sm leading-snug hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]">
            {paikka.nimi}
            {paikka.business_managed && (
              <BadgeCheck className="w-3.5 h-3.5 ml-1 inline-block align-middle" />
            )}
          </h3>
        </Link>

        {/* Open status */}
        {openStatus.status === 'open' && (
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-xs font-bold text-green-700">
              {t('openNow')} · {openStatus.hours}
            </span>
          </div>
        )}
        {openStatus.status === 'closed' && (
          <div className="inline-flex items-center gap-2">
            <span className="text-xs text-[rgba(17,17,17,0.45)]">{t('closed')}</span>
          </div>
        )}
        {openStatus.status === 'no-data' && (
          <span className="text-xs text-[rgba(17,17,17,0.35)]">
            {aukinyt ? t('hoursUnknown') : t('hoursComingSoon')}
          </span>
        )}

        {/* Price / Marquee — aktivoituu DOM-ylivuodon perusteella */}
        {membershipOnly ? (
          <span className="text-sm text-[rgba(17,17,17,0.5)]">{t('membershipOnly')}</span>
        ) : priceItems ? (
          <div
            ref={containerRef}
            className="border-t border-[rgba(0,0,0,0.07)] overflow-hidden pt-2 relative"
            style={shouldMarquee ? {
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 82%, transparent 100%)',
              maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 82%, transparent 100%)',
            } : undefined}
          >
            {/* Piilotettu mittausdiv — oikea pillileveys arviota varten */}
            <div
              ref={measureRef}
              className="absolute invisible flex items-center gap-2 pointer-events-none"
              aria-hidden="true"
            >
              {priceItems.map((item, i) => (
                <span key={i} className="text-sm font-bold tabular-nums bg-[rgba(0,0,0,0.05)] px-2 py-0.5 rounded-md whitespace-nowrap">
                  {item}
                </span>
              ))}
            </div>
            {shouldMarquee ? (
              <div
                className="flex items-center gap-4 whitespace-nowrap"
                style={{ animation: 'marquee 8s linear infinite', willChange: 'transform' }}
              >
                {[...priceItems, ...priceItems].map((item, i) => (
                  <span key={i} className="shrink-0 text-sm font-bold text-[#111111] tabular-nums bg-[rgba(0,0,0,0.05)] px-2 py-0.5 rounded-md">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {priceItems.map((item, i) => (
                  <span key={i} className="text-sm font-bold text-[#111111] tabular-nums bg-[rgba(0,0,0,0.05)] px-2 py-0.5 rounded-md whitespace-nowrap">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-[rgba(17,17,17,0.35)]">{t('priceComingSoon')}</span>
        )}

        {/* Address */}
        {osoite && (
          <div className="flex items-center gap-1.5 text-sm text-[rgba(17,17,17,0.45)]">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{osoite}</span>
          </div>
        )}

        {/* Description */}
        {paikka.kuvaus && (
          <p className="text-sm text-[rgba(17,17,17,0.5)] line-clamp-2 leading-relaxed">{paikka.kuvaus}</p>
        )}

        {/* Bottom row: CTA + optional distance string */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-[rgba(0,0,0,0.07)]">
          <motion.div whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}>
            <Link
              href={`/paikat/${paikka.id}`}
              className="border border-[rgba(0,0,0,0.12)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.25)] text-sm font-bold py-2 px-4 rounded-full [transition:color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
            >
              {t('showDetails')}
            </Link>
          </motion.div>

          {distanceStr && (
            <span className="text-xs text-[rgba(17,17,17,0.4)] tabular-nums flex items-center gap-0.5 shrink-0">
              <MapPin className="w-3 h-3 shrink-0" />
              {distanceStr}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
