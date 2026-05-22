'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly } from '@/lib/priceUtils'
import type { Liikuntapaikka } from '@/lib/types'

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export const korttiVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}

const SPORT_ICONS: Record<string, LucideIcon> = {
  padel:         Zap,
  kuntosali:     Dumbbell,
  jooga:         Leaf,
  uinti:         Waves,
  tennis:        Target,
  liikuntahalli: Building2,
  liikunta:      Activity,
}

interface PaikkaKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  aukinyt?: boolean
}

export default function PaikkaKortti({ paikka, distanceStr, aukinyt = false }: PaikkaKorttiProps) {
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const openStatus   = getOpenStatus(paikka.aukioloajat)
  const hasDropIn    = paikka.hinta_kuvaus?.toLowerCase().includes('kertakäynti') ?? false
  const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const membershipOnly = isMembershipOnly(paikka)
  const priceLines   = paikka.hinta_kuvaus?.includes('\n')
    ? paikka.hinta_kuvaus.split('\n')
    : null
  const priceText    = paikka.hinta_kuvaus ?? (hintaTeksti !== '' ? hintaTeksti : null)
  const osoite       = [paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')
  const Icon         = SPORT_ICONS[paikka.laji] ?? Activity

  return (
    <motion.div
      variants={korttiVariants}
      className="glass glass-hover rounded-2xl flex flex-col overflow-hidden cursor-default"
      whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
    >
      <div className="p-4 flex flex-col gap-2.5 flex-1">

        {/* Badge row: [sport pill] [Sponsoroitu?] [Kertakäynti OK?] */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: laji.color }}
          >
            <Icon className="w-3 h-3" />
            {laji.label}
          </span>
          {paikka.featured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Sponsoroitu
            </span>
          )}
          {hasDropIn && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-[rgba(17,17,17,0.06)] text-[rgba(17,17,17,0.55)]">
              Kertakäynti OK
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/paikat/${paikka.id}`}>
          <h3 className="font-bold text-[#111111] text-sm leading-snug hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]">
            {paikka.nimi}
          </h3>
        </Link>

        {/* Open status */}
        {openStatus.status === 'open' && (
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-xs font-bold text-green-700">
              Auki nyt · {openStatus.hours}
            </span>
          </div>
        )}
        {openStatus.status === 'closed' && (
          <div className="inline-flex items-center gap-2">
            <span className="text-xs text-[rgba(17,17,17,0.45)]">Suljettu</span>
          </div>
        )}
        {openStatus.status === 'no-data' && (
          <span className="text-xs text-[rgba(17,17,17,0.35)]">
            {aukinyt ? 'Aukioloajat tuntematon' : 'Aukioloajat lisätään pian'}
          </span>
        )}

        {/* Price block (position 4 — between open-status and address) */}
        <div>
          {membershipOnly ? (
            <span className="text-sm text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
          ) : priceLines ? (
            <span className="text-sm font-bold text-[#111111] tabular-nums">
              {priceLines.map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </span>
          ) : priceText ? (
            <span className="text-sm font-bold text-[#111111] tabular-nums">{priceText}</span>
          ) : (
            <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
          )}
        </div>

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
              Näytä tiedot
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
