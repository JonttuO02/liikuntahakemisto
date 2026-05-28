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

export const diagonaalKorttiVariants = {
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

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? ''

function staticMapsUrl(lat: number, lng: number, color: string): string {
  const markerColor = '0x' + color.replace('#', '')
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=12&size=200x128&scale=2` +
    (MAP_ID ? `&map_id=${MAP_ID}` : '&maptype=roadmap') +
    `&markers=color:${markerColor}%7Csize:mid%7C${lat},${lng}` +
    `&key=${API_KEY}`
  )
}

interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
}

export default function DiagonaalKortti({ paikka, distanceStr }: DiagonaalKorttiProps) {
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const openStatus   = getOpenStatus(paikka.aukioloajat)
  const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const membershipOnly = isMembershipOnly(paikka)
  const priceText    = membershipOnly ? null : (paikka.hinta_kuvaus?.split('\n')[0] ?? (hintaTeksti !== '' ? hintaTeksti : null))
  const hasCoords    = paikka.latitude != null && paikka.longitude != null
  const Icon         = SPORT_ICONS[paikka.laji] ?? Activity

  return (
    <motion.div
      variants={diagonaalKorttiVariants}
      className="relative glass glass-hover rounded-2xl h-32 cursor-pointer"
      whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.12, ease: 'easeOut' } }}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
      <Link href={`/paikat/${paikka.id}`} className="absolute inset-0 block">

        {/* LEFT: info panel */}
        <div
          className="absolute inset-0 z-10 flex flex-col gap-1 p-3"
          style={{ clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)' }}
        >
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white self-start truncate max-w-full"
            style={{ backgroundColor: laji.color }}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {laji.label}
          </span>

          <p className="font-bold text-[#111111] text-sm leading-snug line-clamp-1 overflow-hidden">
            {paikka.nimi}
          </p>

          {openStatus.status === 'open' && (
            <span className="text-xs font-bold text-green-700 truncate">
              Auki · {openStatus.hours}
            </span>
          )}
          {openStatus.status === 'closed' && (
            <span className="text-xs text-[rgba(17,17,17,0.45)] truncate">Suljettu</span>
          )}

          {membershipOnly ? (
            <span className="text-xs text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
          ) : priceText ? (
            <span className="text-xs font-bold text-[#111111] tabular-nums truncate">{priceText}</span>
          ) : (
            <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
          )}

          {distanceStr && (
            <div className="flex items-center gap-1 text-xs text-[rgba(17,17,17,0.4)] mt-auto">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="tabular-nums">{distanceStr}</span>
            </div>
          )}
        </div>

        {/* RIGHT: map image or fallback — starts at 50% so img center maps to visible panel center */}
        <div
          className="absolute top-0 right-0 bottom-0 overflow-hidden"
          style={{ left: '50%', clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 4% 100%)' }}
        >
          {hasCoords ? (
            <img
              src={staticMapsUrl(paikka.latitude!, paikka.longitude!, laji.color)}
              alt={`Karttakuva: ${paikka.nimi}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: laji.color }}
            >
              <Icon className="w-8 h-8 text-white opacity-80" />
            </div>
          )}
        </div>

      </Link>
      </div>
    </motion.div>
  )
}
