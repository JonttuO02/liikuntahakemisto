'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
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

export default function PaikkaKortti({ paikka }: { paikka: Liikuntapaikka }) {
  const laji   = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const hinta  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const osoite = [paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')
  const Icon   = SPORT_ICONS[paikka.laji] ?? Activity

  return (
    <motion.div
      variants={korttiVariants}
      className="glass glass-hover rounded-2xl flex flex-col overflow-hidden cursor-default"
      whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
    >
      <div className="p-4 flex flex-col gap-2.5 flex-1">

        {/* Badge with sport icon */}
        <span
          className="self-start inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
          style={{ backgroundColor: laji.color }}
        >
          <Icon className="w-3 h-3" />
          {laji.label}
        </span>

        {/* Name */}
        <Link href={`/paikat/${paikka.id}`}>
          <h3 className="font-semibold text-[#111111] text-[15px] leading-snug hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]">
            {paikka.nimi}
          </h3>
        </Link>

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

        {/* Bottom row */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2.5 border-t border-[rgba(0,0,0,0.07)]">
          {paikka.varauslinkki ? (
            <motion.a
              href={paikka.varauslinkki}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="bg-[#111111] hover:bg-[#333333] text-white text-sm font-semibold py-2 px-4 rounded-full [transition:background-color_150ms_var(--ease-out)]"
            >
              Varaa →
            </motion.a>
          ) : (
            <motion.div whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}>
              <Link
                href={`/paikat/${paikka.id}`}
                className="border border-[rgba(0,0,0,0.12)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.25)] text-sm font-medium py-2 px-4 rounded-full [transition:color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
              >
                Näytä tiedot
              </Link>
            </motion.div>
          )}

          {hinta ? (
            <span className="text-sm font-semibold text-[#111111] shrink-0 tabular-nums">
              {hinta}
            </span>
          ) : (
            <span className="text-xs text-[rgba(17,17,17,0.35)] shrink-0">
              Lisätään pian
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
