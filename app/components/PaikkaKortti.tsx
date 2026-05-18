'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { lajiKonfig } from '@/lib/lajit'
import type { Liikuntapaikka } from './LiikuntapaikatLista'

// Strong ease-out: starts fast, decelerates naturally
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

// Entry: never from scale(0) — start from 0.97 + opacity per skill
export const korttiVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: EASE_OUT },
  },
}

function hintateksti(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `alkaen ${min} €`
  if (max != null) return `max ${max} €`
  return ''
}

export default function PaikkaKortti({ paikka }: { paikka: Liikuntapaikka }) {
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'bg-gray-100 text-gray-600', accentBg: 'bg-gray-400' }
  const hinta        = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const osoite       = [paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      variants={korttiVariants}
      // Lift + shadow deepening — only on pointer devices, respects reduced-motion
      whileHover={
        reduceMotion
          ? undefined
          : { y: -4, transition: { duration: 0.18, ease: EASE_OUT } }
      }
      // Shadow via CSS (off main thread), transform via Framer Motion
      className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_24px_rgba(79,70,229,0.15)] [transition:box-shadow_200ms_var(--ease-out)] flex flex-col overflow-hidden"
    >
      {/* Sport colour bar */}
      <div className={`h-2 w-full ${laji.accentBg}`} />

      <div className="p-5 flex flex-col gap-2.5 flex-1">
        {/* Badge */}
        <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full ${laji.badgeTw}`}>
          {laji.label}
        </span>

        {/* Name — links to detail page */}
        <Link href={`/paikat/${paikka.id}`}>
          <h3 className="font-bold text-[#1E1B4B] text-[17px] leading-snug tracking-tight hover:text-indigo-600 [transition:color_150ms_var(--ease-out)]">
            {paikka.nimi}
          </h3>
        </Link>

        {/* Address */}
        {osoite && (
          <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
            <svg className="w-3.5 h-3.5 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{osoite}</span>
          </div>
        )}

        {/* Description */}
        {paikka.kuvaus && (
          <p className="text-sm text-[#6B7280] line-clamp-2 leading-relaxed">{paikka.kuvaus}</p>
        )}

        {/* Bottom row: CTA + price — price big and right-aligned per spec */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-gray-50">
          {paikka.varauslinkki ? (
            <motion.a
              href={paikka.varauslinkki}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="bg-[#6366F1] hover:bg-indigo-600 text-white text-sm font-semibold py-2 px-5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
            >
              Varaa aika →
            </motion.a>
          ) : (
            <motion.div whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}>
              <Link
                href={`/paikat/${paikka.id}`}
                className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm font-medium py-2 px-5 rounded-full [transition:background-color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
              >
                Näytä tiedot
              </Link>
            </motion.div>
          )}

          {hinta ? (
            <span className="text-lg font-bold text-indigo-600 shrink-0 tabular-nums">
              {hinta}
            </span>
          ) : (
            <span className="text-xs text-[#9CA3AF] shrink-0 italic">
              Lisätään pian
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
