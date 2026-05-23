'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, Clock } from 'lucide-react'
import { useGPS } from '@/hooks/useGPS'
import { haversineKm, formatDistance } from '@/lib/geo'
import { Input } from '@/components/ui/input'
import { LAJIT_FILTTERI } from '@/lib/lajit'
import { deriveKaupungit } from '@/lib/cityFilter'
import { getOpenStatus } from '@/lib/aukiolo'
import Link from 'next/link'
import PaikkaKortti, { korttiVariants } from './PaikkaKortti'
import AuthModal from './AuthModal'
import { createBrowserSupabase } from '@/lib/supabaseSSR'

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
  const [aktiivKaupunki, setAktiivKaupunki] = useState('Kaikki')
  const [suosikitIds, setSuosikitIds] = useState<Set<number>>(new Set())
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingFavoriteId, setPendingFavoriteId] = useState<number | null>(null)
  const inFlight = useRef<Set<number>>(new Set())

  const { status, coords, requestLocation } = useGPS()

  useEffect(() => {
    const supabase = createBrowserSupabase()

    async function fetchFavorites() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)
        if (data) setSuosikitIds(new Set(data.map((s: { paikka_id: number }) => s.paikka_id)))
      }
    }

    fetchFavorites()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase.from('suosikit').select('paikka_id').eq('user_id', session.user.id)
        if (data) setSuosikitIds(new Set(data.map((s: { paikka_id: number }) => s.paikka_id)))
      } else {
        setSuosikitIds(new Set())
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function toggleSuosikki(id: number) {
    if (inFlight.current.has(id)) return   // debounce concurrent taps
    inFlight.current.add(id)
    const supabase = createBrowserSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      inFlight.current.delete(id)
      setPendingFavoriteId(id)
      setAuthModalOpen(true)
      return
    }

    try {
      const isCurrentlySaved = suosikitIds.has(id)
      // Optimistic update
      setSuosikitIds(prev => {
        const next = new Set(prev)
        if (isCurrentlySaved) next.delete(id)
        else next.add(id)
        return next
      })

      if (isCurrentlySaved) {
        const { error } = await supabase.from('suosikit').delete().eq('user_id', user.id).eq('paikka_id', id)
        if (error) {
          // Revert on error
          setSuosikitIds(prev => { const next = new Set(prev); next.add(id); return next })
        }
      } else {
        const { error } = await supabase.from('suosikit').insert({ user_id: user.id, paikka_id: id })
        if (error) {
          // Revert on error
          setSuosikitIds(prev => { const next = new Set(prev); next.delete(id); return next })
        }
      }
    } finally {
      inFlight.current.delete(id)
    }
  }

  const kaupungit = useMemo(() => deriveKaupungit(paikat), [paikat])

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
      const matchesLaji    = aktiivinen === 'Kaikki' || p.laji.toLowerCase() === aktiivinen.toLowerCase()
      const q              = haku.toLowerCase()
      const matchesHaku    = !haku || p.nimi.toLowerCase().includes(q) || p.kuvaus?.toLowerCase().includes(q) || p.osoite?.toLowerCase().includes(q)
      const hintaRef       = p.hinta_min ?? p.hinta_max
      const matchesHinta   = aktiivHinta === null
        || (hintaRef != null && hintaRef <= aktiivHinta)
      const matchesAuki    = !aukinyt || getOpenStatus(p.aukioloajat).status !== 'closed'
      const matchesKaupunki = aktiivKaupunki === 'Kaikki' || p.kaupunki === aktiivKaupunki
      return matchesLaji && matchesHaku && matchesHinta && matchesAuki && matchesKaupunki
    }),
    [paikat, aktiivinen, haku, aktiivHinta, aukinyt, aktiivKaupunki]
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
              {aktiivKaupunki === 'Kaikki' ? 'Kaikki kaupungit' : aktiivKaupunki}&nbsp;·&nbsp;{suodatettu.length} paikkaa
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

          {/* Row 1: city + sport dropdowns + Etäisyydet */}
          <div className="flex flex-wrap items-center gap-2">

            {/* City select (DATA-07) — kaupungit always includes 'Kaikki' sentinel at [0], so > 2 means 2+ real cities */}
            {kaupungit.length > 2 && (
              <select
                value={aktiivKaupunki}
                onChange={e => setAktiivKaupunki(e.target.value)}
                aria-label="Suodata kaupungin mukaan"
                className="h-10 rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 text-sm font-bold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] [transition:border-color_150ms_var(--ease-out)] cursor-pointer"
              >
                {kaupungit.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            )}

            {/* Sport select (UI-08) */}
            <select
              value={aktiivinen}
              onChange={e => setAktiivinen(e.target.value)}
              aria-label="Suodata lajin mukaan"
              className="h-10 rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 text-sm font-bold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] [transition:border-color_150ms_var(--ease-out)] cursor-pointer"
            >
              {LAJIT_FILTTERI.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {/* Etäisyydet */}
            <motion.button
              onClick={requestLocation}
              disabled={status === 'requesting'}
              whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold
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

          {/* Row 2: price filters + result count */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {HINTA_FILTTERI.map(({ label, max }) => (
                <motion.button
                  key={label}
                  onClick={() => setAktiivHinta(max)}
                  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold
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
            key={`grid-${aktiivKaupunki}-${aktiivinen}-${aktiivHinta ?? 'all'}-${aukinyt}`}
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
                isSuosikki={suosikitIds.has(p.id)}
                onToggleSuosikki={toggleSuosikki}
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
              onClick={() => { setHaku(''); setAktiivinen('Kaikki'); setAktiivHinta(null); setAukinyt(false); setAktiivKaupunki('Kaikki') }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="mt-3 text-[#111111] text-sm font-medium underline underline-offset-2"
            >
              Tyhjennä haku
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-6 pt-2 flex justify-center">
        <Link
          href="/tietosuoja"
          className="text-xs text-[rgba(17,17,17,0.35)] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
        >
          Tietosuoja
        </Link>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        pendingPaikkaId={pendingFavoriteId}
        onSuccess={id => {
          if (id) toggleSuosikki(id)
          setAuthModalOpen(false)
        }}
      />
    </div>
  )
}
