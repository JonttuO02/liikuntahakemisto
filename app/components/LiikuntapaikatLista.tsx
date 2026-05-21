'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Clock } from 'lucide-react'
import { useGPS } from '@/hooks/useGPS'
import { haversineKm, formatDistance } from '@/lib/geo'
import { Input } from '@/components/ui/input'
import { LAJIT_FILTTERI } from '@/lib/lajit'
import { getOpenStatus } from '@/lib/aukiolo'
import PaikkaKortti, { korttiVariants } from './PaikkaKortti'

import type { Liikuntapaikka } from '@/lib/types'
export type { Liikuntapaikka } from '@/lib/types'

const HINTA_FILTTERI: { label: string; max: number | null }[] = [
  { label: 'Kaikki hinnat', max: null },
  { label: '≤10 €', max: 10 },
  { label: '≤20 €', max: 20 },
  { label: '≤30 €', max: 30 },
]

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export default function LiikuntapaikatLista({ paikat }: { paikat: Liikuntapaikka[] }) {
  const [haku, setHaku]               = useState('')
  const [aktiivinen, setAktiivinen]   = useState('Kaikki')
  const [aktiivHinta, setAktiivHinta] = useState<number | null>(null)
  const [aukinyt, setAukinyt]         = useState(false)

  const { status, coords, requestLocation } = useGPS()

  const distancesMap = useMemo<Record<string, number>>(() => {
    if (!coords) return {}
    return Object.fromEntries(
      paikat
        .filter((p): p is typeof p & { latitude: number; longitude: number } =>
          p.latitude != null && p.longitude != null)
        .map(p => [p.id, haversineKm(coords.lat, coords.lng, p.latitude, p.longitude)])
    )
  }, [coords, paikat])

  const suodatettu = useMemo(() =>
    paikat.filter(p => {
      const matchesLaji  = aktiivinen === 'Kaikki' || p.laji.toLowerCase() === aktiivinen.toLowerCase()
      const q            = haku.toLowerCase()
      const matchesHaku  = !haku || p.nimi.toLowerCase().includes(q) || p.kuvaus?.toLowerCase().includes(q) || p.osoite?.toLowerCase().includes(q)
      const hintaRef     = p.hinta_min ?? p.hinta_max
      const matchesHinta = aktiivHinta === null || hintaRef == null || hintaRef <= aktiivHinta
      const matchesAuki  = !aukinyt || getOpenStatus(p.aukioloajat).status !== 'closed'
      return matchesLaji && matchesHaku && matchesHinta && matchesAuki
    }),
    [paikat, aktiivinen, haku, aktiivHinta, aukinyt]
  )

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[rgba(0,0,0,0.07)]">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-7 sm:pt-14 sm:pb-9">

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <h1 className="font-serif text-4xl sm:text-6xl font-bold text-[#111111] leading-tight tracking-tight">
              Löydä liikuntasi
            </h1>
            <p className="mt-2 text-[rgba(17,17,17,0.45)] text-sm sm:text-base">
              Tampere &nbsp;·&nbsp; {paikat.length} paikkaa
            </p>

            {/* Search bar */}
            <div className="mt-5 relative max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(17,17,17,0.4)] pointer-events-none" />
              <Input
                type="search"
                placeholder="Hae liikuntapaikkaa..."
                value={haku}
                onChange={e => setHaku(e.target.value)}
                className="pl-11 h-12 rounded-full bg-white border border-[rgba(0,0,0,0.12)] text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-[#111111] focus-visible:ring-offset-0"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-2">
        <div className="flex flex-col gap-3">

          {/* Row 1: sport filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">

            {/* Sport filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <p className="sr-only">LAJIT</p>
              {LAJIT_FILTTERI.map(laji => (
                <motion.button
                  key={laji}
                  onClick={() => setAktiivinen(laji)}
                  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold
                    [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                    ${aktiivinen === laji
                      ? 'bg-[#111111] text-white'
                      : 'glass-btn text-[rgba(17,17,17,0.6)] hover:text-[#111111]'
                    }`}
                >
                  {laji}
                </motion.button>
              ))}
              <motion.button
                onClick={requestLocation}
                disabled={status === 'requesting'}
                whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold
                  [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                  disabled:opacity-50
                  ${status === 'granted'
                    ? 'bg-[#111111] text-white'
                    : 'border border-[rgba(0,0,0,0.1)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.2)]'
                  }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {status === 'requesting' ? 'Haetaan...' : status === 'granted' ? 'Sijainti päällä' : 'Etäisyydet'}
              </motion.button>
            </div>
          </div>

          {/* Row 2: price filters + result count */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {HINTA_FILTTERI.map(({ label, max }) => (
                <motion.button
                  key={label}
                  onClick={() => setAktiivHinta(max)}
                  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold
                    [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                    ${aktiivHinta === max
                      ? 'bg-[#111111] text-white'
                      : 'glass-btn text-[rgba(17,17,17,0.6)] hover:text-[#111111]'
                    }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>
            <motion.span
              key={suodatettu.length}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="shrink-0 text-xs font-medium text-[rgba(17,17,17,0.4)] tabular-nums"
            >
              {suodatettu.length} paikkaa
            </motion.span>
          </div>

          {/* Row 3: Auki nyt toggle */}
          <div>
            <motion.button
              onClick={() => setAukinyt(v => !v)}
              whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold
                [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                ${aukinyt
                  ? 'bg-[#111111] text-white'
                  : 'glass-btn text-[rgba(17,17,17,0.6)] hover:text-[#111111]'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Auki nyt
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {suodatettu.length > 0 ? (
          <motion.div
            key={`grid-${aktiivinen}-${aktiivHinta ?? 'all'}-${aukinyt}`}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4"
            variants={gridVariants}
            initial="hidden"
            animate="show"
          >
            {suodatettu.map(p => (
              <PaikkaKortti
                key={p.id}
                paikka={p}
                distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
                aukinyt={aukinyt}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            variants={korttiVariants}
            initial="hidden"
            animate="show"
            className="text-center py-24"
          >
            <p className="text-[rgba(17,17,17,0.5)] text-lg">Ei tuloksia</p>
            <motion.button
              onClick={() => { setHaku(''); setAktiivinen('Kaikki'); setAktiivHinta(null); setAukinyt(false) }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="mt-3 text-[#111111] text-sm font-medium underline underline-offset-2"
            >
              Tyhjennä haku
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
