'use client'

import { useState, useMemo, lazy, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { LAJIT_FILTTERI } from '@/lib/lajit'
import PaikkaKortti, { korttiVariants } from './PaikkaKortti'

const Kartta = lazy(() => import('./Kartta'))

export type Liikuntapaikka = {
  id: number
  nimi: string
  laji: string
  osoite: string | null
  kaupunki: string | null
  latitude: number | null
  longitude: number | null
  hinta_min: number | null
  hinta_max: number | null
  varauslinkki: string | null
  kuvaus: string | null
  puhelin: string | null
}

type Nakyma = 'lista' | 'kartta'

const HINTA_FILTTERI: { label: string; max: number | null }[] = [
  { label: 'Kaikki hinnat', max: null },
  { label: '≤10 €', max: 10 },
  { label: '≤20 €', max: 20 },
  { label: '≤30 €', max: 30 },
]

// Stagger 50ms — within skill's 30–80ms window
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}

// Strong ease-out per skill
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export default function LiikuntapaikatLista({ paikat }: { paikat: Liikuntapaikka[] }) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const nakyma = (searchParams.get('nakyma') as Nakyma) ?? 'lista'

  const [haku, setHaku]             = useState('')
  const [aktiivinen, setAktiivinen] = useState('Kaikki')
  const [aktiivHinta, setAktiivHinta] = useState<number | null>(null)

  const setNakyma = (v: Nakyma) => {
    const params = new URLSearchParams(searchParams.toString())
    if (v === 'lista') params.delete('nakyma')
    else params.set('nakyma', v)
    const qs = params.toString()
    router.push(`${pathname}${qs ? '?' + qs : ''}`)
  }

  const suodatettu = useMemo(() =>
    paikat.filter(p => {
      const matchesLaji = aktiivinen === 'Kaikki' ||
        p.laji.toLowerCase() === aktiivinen.toLowerCase()
      const q = haku.toLowerCase()
      const matchesHaku = !haku ||
        p.nimi.toLowerCase().includes(q) ||
        p.kuvaus?.toLowerCase().includes(q) ||
        p.osoite?.toLowerCase().includes(q)
      const hintaRef = p.hinta_min ?? p.hinta_max
      const matchesHinta = aktiivHinta === null || hintaRef == null || hintaRef <= aktiivHinta
      return matchesLaji && matchesHaku && matchesHinta
    }),
    [paikat, aktiivinen, haku, aktiivHinta]
  )

  return (
    <div className="min-h-screen bg-[#EEF2FF]">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative bg-[#4F46E5] pb-16">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-6 sm:pt-14 sm:pb-8">

          {/* Heading — enters with purpose */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Löydä liikuntasi
            </h1>
            <p className="mt-1.5 text-indigo-200 text-sm sm:text-base font-medium tracking-wide">
              Tampere &nbsp;·&nbsp; {paikat.length} paikkaa
            </p>

            {/* Search bar */}
            <div className="mt-5 relative max-w-lg">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="search"
                placeholder="Hae liikuntapaikkaa..."
                value={haku}
                onChange={e => setHaku(e.target.value)}
                className="pl-12 h-12 rounded-full bg-white border-0 text-base shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-300"
              />
            </div>
          </motion.div>
        </div>

        {/* Wave divider — fill matches page background */}
        <svg
          className="absolute bottom-0 left-0 w-full h-16"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,32 C240,0 480,64 720,32 C960,0 1200,64 1440,32 L1440,64 L0,64 Z"
            fill="#EEF2FF"
          />
        </svg>
      </section>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-2">
        <div className="flex flex-col gap-3">

          {/* Row 1: toggle + sport filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">

            {/* Lista / Kartta toggle */}
            <div className="flex bg-white rounded-xl border border-indigo-100 p-1 shadow-sm shrink-0">
              {(['lista', 'kartta'] as Nakyma[]).map(v => (
                <motion.button
                  key={v}
                  onClick={() => setNakyma(v)}
                  whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold
                    [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                    ${nakyma === v
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'text-gray-500 hover:text-indigo-700'
                    }`}
                >
                  {v === 'lista' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </motion.button>
              ))}
            </div>

            {/* Sport filters — horizontally scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {LAJIT_FILTTERI.map(laji => (
                <motion.button
                  key={laji}
                  onClick={() => setAktiivinen(laji)}
                  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold
                    [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out),border-color_150ms_var(--ease-out),box-shadow_150ms_var(--ease-out)]
                    ${aktiivinen === laji
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'bg-white text-[#6B7280] border border-indigo-100 hover:border-indigo-300 hover:text-indigo-700 shadow-sm'
                    }`}
                >
                  {laji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Row 2: price filters + result count */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {HINTA_FILTTERI.map(({ label, max }) => (
                <motion.button
                  key={label}
                  onClick={() => setAktiivHinta(max)}
                  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold
                    [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]
                    ${aktiivHinta === max
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'bg-white text-[#6B7280] border border-indigo-100 hover:border-indigo-300 hover:text-indigo-700 shadow-sm'
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
              className="shrink-0 text-xs font-medium text-[#6B7280] tabular-nums"
            >
              {suodatettu.length} paikkaa
            </motion.span>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {/* Fast crossfade — 150ms, opacity only (no layout shift) */}
        <AnimatePresence mode="wait">

          {nakyma === 'kartta' && (
            <motion.div
              key="kartta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Suspense fallback={
                <div className="w-full h-[520px] bg-white rounded-2xl flex items-center justify-center shadow-sm mt-4">
                  <p className="text-[#6B7280] text-sm">Ladataan karttaa…</p>
                </div>
              }>
                <Kartta paikat={suodatettu} />
              </Suspense>
            </motion.div>
          )}

          {nakyma === 'lista' && (
            <motion.div
              key="lista"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {suodatettu.length > 0 ? (
                <motion.div
                  key={`grid-${aktiivinen}-${aktiivHinta ?? 'all'}`}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4"
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                >
                  {suodatettu.map(p => (
                    <PaikkaKortti key={p.id} paikka={p} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  variants={korttiVariants}
                  initial="hidden"
                  animate="show"
                  className="text-center py-24"
                >
                  <p className="text-[#6B7280] text-lg">Ei tuloksia</p>
                  <motion.button
                    onClick={() => { setHaku(''); setAktiivinen('Kaikki'); setAktiivHinta(null) }}
                    whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                    className="mt-3 text-[#6366F1] text-sm font-medium hover:underline"
                  >
                    Tyhjennä haku
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
