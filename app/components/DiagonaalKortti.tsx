'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Check, Building2, Camera } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { SportIcon } from '@/lib/sportIcons'
import { hintateksti } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly, marqueePriceLines } from '@/lib/priceUtils'
import type { Liikuntapaikka } from '@/lib/types'

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
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const openStatus   = getOpenStatus(paikka.aukioloajat)
  const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const membershipOnly = isMembershipOnly(paikka)
  const priceLines   = marqueePriceLines(paikka.hinta_kuvaus, membershipOnly)
  const priceText    = membershipOnly ? null : (paikka.hinta_kuvaus?.split('\n')[0] ?? (hintaTeksti !== '' ? hintaTeksti : null))
  const hasCoords    = paikka.latitude != null && paikka.longitude != null

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
          className="absolute inset-0 z-10 flex flex-col p-3"
          style={{ clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)' }}
        >
          <div className="flex items-start gap-2 self-start">
            {/* Logo placeholder — 40×40px rounded box */}
            <div className="w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-[rgba(0,0,0,0.25)]" />
            </div>
            {/* Sport pill */}
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white truncate max-w-full mt-1"
              style={{ backgroundColor: laji.color }}
            >
              <SportIcon laji={paikka.laji} size={16} className="shrink-0" />
              {laji.label}
            </span>
          </div>

          {/* Name + price grouped tight, mt-1.5 gives minimal breathing room from badge */}
          <div className="flex flex-col gap-0.5 mt-1.5 min-w-0">
            <p className="font-bold text-[#111111] text-sm leading-snug line-clamp-1 overflow-hidden">
              {paikka.nimi}
            </p>
            {membershipOnly ? (
              <span className="text-xs text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
            ) : (priceLines && priceLines.length >= 2) ? (
              <div className="overflow-hidden">
                <div
                  className="flex whitespace-nowrap text-xs font-bold text-[#111111] tabular-nums"
                  style={{ animation: 'marquee 8s linear infinite', willChange: 'transform' }}
                >
                  {[...priceLines, ...priceLines].map((line, i) => (
                    <span key={i} className="flex items-center shrink-0">
                      {line}
                      <span className="mx-1.5 text-[rgba(17,17,17,0.3)]">·</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : priceText ? (
              <span className="text-xs font-bold text-[#111111] tabular-nums truncate">{priceText}</span>
            ) : (
              <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
            )}
          </div>

          {/* Bottom row: mt-auto pins it to the bottom; pl-7 clears the map button */}
          <div className="flex items-center gap-3 pl-7 mt-auto min-w-0">
            {distanceStr && (
              <span className="text-xs tabular-nums text-[rgba(17,17,17,0.4)] shrink-0">{distanceStr}</span>
            )}
            {openStatus.status === 'open' && (
              <span className="text-xs font-bold text-green-700 truncate">
                Auki · {openStatus.hours}
              </span>
            )}
            {openStatus.status === 'closed' && (
              <span className="text-xs text-[rgba(17,17,17,0.45)] truncate">Suljettu</span>
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
          aria-label="Näytä kartalla"
          className="absolute bottom-2 left-2 z-20 w-7 h-7 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_ease]"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
      )}
      {onToggleTodo && (
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleTodo(paikka.id) }}
          aria-label={isSaved ? 'Poista TO DO -listalta' : 'Lisää TO DO -listaan'}
          className="absolute bottom-3 right-3 z-20 w-7 h-7 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_ease]"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
      </div>
    </motion.div>
  )
}
