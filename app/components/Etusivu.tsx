'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Moon, Sun, Locate, SlidersHorizontal, Search, Heart, MoreHorizontal, LogOut, User } from 'lucide-react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LAJIT_FILTTERI, lajiKonfig } from '@/lib/lajit'
import { hintateksti, cn } from '@/lib/utils'
import Karuselli from './Karuselli'
import HoursTable from './HoursTable'
import type { Liikuntapaikka } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { formatGroupedHours, getOpenStatus } from '@/lib/aukiolo'
import { isNightHour } from '@/lib/mapStyles'
import { TAMPERE } from '@/lib/constants'
import { isSafeUrl } from '@/lib/urlUtils'
import { useGPS } from '@/hooks/useGPS'
import { pinUrl } from '@/lib/sportPins'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]
const WEATHER_CITY = 'Tampere'
const HANDLE_H = 44 // visible sheet tab height when closed

const SPORT_ICONS: Record<string, LucideIcon> = {
  padel: Zap, kuntosali: Dumbbell, jooga: Leaf,
  uinti: Waves, tennis: Target, liikuntahalli: Building2, liikunta: Activity,
}

interface SaaTiedot { temp: number; code: number }

function getWeatherEmoji(code: number): string {
  if (code === 0)  return '☀️'
  if (code <= 3)   return '⛅'
  if (code <= 48)  return '⛅'
  if (code <= 67)  return '🌧️'
  if (code <= 77)  return '❄️'
  return '⛅'
}

function MapPanController({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !coords) return
    map.panTo(coords)
  }, [map, coords])
  return null
}

function RecenterButton({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap()
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => { if (map && coords) map.panTo(coords) }}
      className="absolute bottom-20 right-4 z-10 w-10 h-10 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.6)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
      aria-label="Palaa omalle sijainnille"
    >
      <Locate className="w-4 h-4" />
    </motion.button>
  )
}

function MapAutoZoom({ target, onComplete }: { target: { lat: number; lng: number } | null; onComplete: () => void }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo(target)
    map.setZoom(16)
    onComplete()
  }, [map, target])
  return null
}

function getTimeBasedFallback(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 11)  return 'Huomenta · Löydä paras liikuntapaikka Tampereelta'
  if (h >= 11 && h < 17) return 'Hei · Löydä paras liikuntapaikka Tampereelta'
  return 'Iltaa · Löydä paras liikuntapaikka Tampereelta'
}

export default function Etusivu({ paikat }: { paikat: Liikuntapaikka[] }) {
  const [saa, setSaa]               = useState<SaaTiedot | null>(null)
  const [aiTeksti, setAiTeksti]     = useState<string | null>(null)
  const [valittu, setValittu]       = useState<Liikuntapaikka | null>(null)
  const [aktiivinen, setAktiivinen] = useState('Kaikki')
  // 'open' → 'sliding' (y to contentH) → onAnimationComplete → 'closed' (pill)
  const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('open')
  const [leftOpen, setLeftOpen]     = useState(false)
  const [rightOpen, setRightOpen]   = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [fullH, setFullH]           = useState(700)
  const [fullW, setFullW]           = useState(390)
  const [isDark, setIsDark]         = useState(false)
  const [zoomLevel, setZoomLevel]   = useState(14)
  const [autoZoomTarget, setAutoZoomTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [suosikitIds, setSuosikitIds]       = useState<Set<number>>(new Set())
  const [supabaseUser, setSupabaseUser]     = useState<SupabaseUser | null>(null)
  const [authModalOpen, setAuthModalOpen]   = useState(false)
  const [pendingFavoriteId, setPendingFavoriteId] = useState<number | null>(null)
  const inFlight = useRef<Set<number>>(new Set())
  const { coords }                  = useGPS({ autoRequest: true })
  const searchParams = useSearchParams()
  const focusId = searchParams.get('id')
  const router = useRouter()

  const contentH  = Math.round(fullH * 0.82)
  const PILL_W    = 160
  const pillInset = Math.round((fullW - PILL_W) / 2)

  // Per-phase animation targets
  const sheetAnimY      = sheetPhase === 'open' ? 0 : sheetPhase === 'sliding' ? contentH : contentH - HANDLE_H
  const sheetAnimLeft   = sheetPhase === 'closed' ? pillInset : 0
  const sheetAnimRight  = sheetPhase === 'closed' ? pillInset : 0
  const sheetAnimRadius = sheetPhase === 'closed' ? '24px 24px 24px 24px' : '24px 24px 0px 0px'

  // Transition differs per phase
  const sheetTransition = sheetPhase === 'sliding'
    ? { y: { type: 'spring' as const, damping: 28, stiffness: 280 } }
    : sheetPhase === 'closed'
    ? {
        // narrowing happens off-screen first, then y pops the pill into view
        y:            { type: 'spring' as const, damping: 32, stiffness: 350, delay: 0.18 },
        left:         { type: 'spring' as const, damping: 28, stiffness: 280 },
        right:        { type: 'spring' as const, damping: 28, stiffness: 280 },
        borderRadius: { duration: 0.2, ease: 'easeInOut' as const },
      }
    : { // open
        y:            { type: 'spring' as const, damping: 28, stiffness: 280, delay: 0.1 },
        left:         { duration: 0.15, ease: 'easeOut' as const },
        right:        { duration: 0.15, ease: 'easeOut' as const },
        borderRadius: { duration: 0.15, ease: 'easeOut' as const },
      }

  function closeOverlays() {
    setLeftOpen(false)
    setRightOpen(false)
    setFilterOpen(false)
  }

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
      setSuosikitIds(prev => {
        const next = new Set(prev)
        if (isCurrentlySaved) next.delete(id)
        else next.add(id)
        return next
      })

      if (isCurrentlySaved) {
        const { error } = await supabase.from('suosikit').delete().eq('user_id', user.id).eq('paikka_id', id)
        if (error) {
          setSuosikitIds(prev => { const next = new Set(prev); next.add(id); return next })
        }
      } else {
        const { error } = await supabase.from('suosikit').insert({ user_id: user.id, paikka_id: id })
        if (error) {
          setSuosikitIds(prev => { const next = new Set(prev); next.delete(id); return next })
        }
      }
    } finally {
      inFlight.current.delete(id)
    }
  }

  useEffect(() => { setIsDark(isNightHour()) }, [])

  useEffect(() => {
    const id = setInterval(() => setIsDark(isNightHour()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const supabase = createBrowserSupabase()

    // Immediate load — avoids race where INITIAL_SESSION async DB query overwrites optimistic updates
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSupabaseUser(user)
      if (user) {
        supabase.from('suosikit').select('paikka_id').eq('user_id', user.id).then(({ data }) => {
          if (data) setSuosikitIds(new Set(data.map((s: { paikka_id: number }) => s.paikka_id)))
        })
      }
    })

    // Handle subsequent login/logout — skip INITIAL_SESSION to avoid overwriting optimistic updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return
      const u = session?.user ?? null
      setSupabaseUser(u)
      if (u) {
        const { data } = await supabase.from('suosikit').select('paikka_id').eq('user_id', u.id)
        if (data) setSuosikitIds(new Set(data.map((s: { paikka_id: number }) => s.paikka_id)))
      } else {
        setSuosikitIds(new Set())
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const update = () => { setFullH(window.innerHeight); setFullW(window.innerWidth) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=61.4978&longitude=23.7610&current=temperature_2m,weather_code')
      .then(r => r.json())
      .then(d => setSaa({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code }))
      .catch(() => {})
  }, [])

  const suosikitSizeAndIds = useMemo(
    () => Array.from(suosikitIds).sort((a, b) => a - b).join(','),
    [suosikitIds]
  )

  useEffect(() => {
    const key = 'saasuositus-' + new Date().toISOString().slice(0, 10)
      + (suosikitIds.size > 0 ? '-' + suosikitIds.size : '')
    try {
      const cached = sessionStorage.getItem(key)
      if (cached) { setAiTeksti(cached); return }
    } catch {}

    const suosikkiNimet = Array.from(suosikitIds)
      .slice(0, 10)
      .map(id => paikat.find(p => p.id === id)?.nimi)
      .filter(Boolean) as string[]

    const fetchOptions: RequestInit = suosikkiNimet.length > 0
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suosikit: suosikkiNimet }) }
      : { method: 'GET' }

    fetch('/api/saasuositus', fetchOptions)
      .then(r => r.json())
      .then((d: { text: string; temp: number; code: number; fallback?: boolean }) => {
        setAiTeksti(d.text)
        try { sessionStorage.setItem(key, d.text) } catch {}
      })
      .catch(() => setAiTeksti(getTimeBasedFallback()))
  // paikat is intentionally excluded — it's a stable server-fetched prop and its reference
  // changing on router.refresh() would cause spurious AI calls; suosikitSizeAndIds (a stable string) already covers
  // the meaningful dependency without creating a new reference on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suosikitSizeAndIds])

  useEffect(() => {
    if (sheetPhase !== 'open') setValittu(null)
  }, [sheetPhase])

  useEffect(() => {
    if (!focusId) return
    const id = Number(focusId)
    const target = paikat.find(p => p.id === id)
    if (!target || target.latitude == null || target.longitude == null) return
    setAutoZoomTarget({ lat: target.latitude, lng: target.longitude })
    setSheetPhase('sliding')
  }, [focusId, paikat]) // eslint-disable-line react-hooks/exhaustive-deps

  const suodatettu = useMemo(
    () => paikat.filter(p => aktiivinen === 'Kaikki' || p.laji.toLowerCase() === aktiivinen.toLowerCase()),
    [paikat, aktiivinen]
  )

  const lajitKartalla = useMemo(
    () => new Set(LAJIT_FILTTERI.filter(l => l !== 'Kaikki').map(l => l.toLowerCase())),
    []
  )

  const paikatKartalla = useMemo(
    () => suodatettu.filter(
      (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
        p.latitude != null && p.longitude != null &&
        lajitKartalla.has(p.laji.toLowerCase())
    ),
    [suodatettu, lajitKartalla]
  )

  const anyOverlayOpen = leftOpen || rightOpen || filterOpen

  return (
    <>
      {/* Night mode overlays — behind map */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 48,
          background: 'linear-gradient(to bottom, #dde0ef 0%, #8a94b3 32%, #1d2038 62%, #07090f 100%)',
          backgroundAttachment: 'fixed',
          opacity: isDark ? 1 : 0,
          transition: 'opacity 800ms ease',
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 pointer-events-none night-stars"
        style={{ zIndex: 48, opacity: isDark ? 1 : 0, transition: 'opacity 1000ms ease' }}
        aria-hidden
      />

      {/* Map — z-50 covers NavBar (z-40) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
        <Map
          defaultCenter={TAMPERE}
          defaultZoom={14}
          mapId={MAP_ID}
          colorScheme={isDark ? 'DARK' : 'LIGHT'}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI
          gestureHandling={sheetPhase === 'open' ? 'none' : 'greedy'}
          clickableIcons={false}
          keyboardShortcuts={false}
          onClick={() => setValittu(null)}
          onCameraChanged={ev => setZoomLevel(ev.detail.zoom)}
        >
          {paikatKartalla.map(p => {
            const color = (lajiKonfig as Record<string, { color: string }>)[p.laji]?.color ?? '#6b7280'
            return (
              <AdvancedMarker key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={valittu?.id === p.id ? 10 : 1}>
                <AnimatePresence mode="wait" initial={false}>
                  {zoomLevel < 16 ? (
                    <motion.div key="pin" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      onClick={() => setAutoZoomTarget({ lat: p.latitude, lng: p.longitude })}>
                      <img src={pinUrl(color, p.laji)} width={28} height={38} alt="" className="gmap-pin" data-active={valittu?.id === p.id ? "true" : undefined} />
                    </motion.div>
                  ) : (
                    <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
                      className="glass rounded-xl px-2.5 py-2 flex flex-col gap-1 cursor-pointer"
                      style={{ minWidth: 100, maxWidth: 140 }}
                      onClick={e => { e.stopPropagation(); setValittu(p) }}>
                      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white truncate" style={{ backgroundColor: lajiKonfig[p.laji]?.color ?? '#6b7280' }}>
                        {lajiKonfig[p.laji]?.label ?? p.laji}
                      </span>
                      <span className="font-bold text-sm text-[#111111] truncate leading-tight">{p.nimi}</span>
                      {(p.hinta_kuvaus || hintateksti(p.hinta_min, p.hinta_max)) && (
                        <span className="text-[10px] text-[rgba(17,17,17,0.55)] truncate">{p.hinta_kuvaus || hintateksti(p.hinta_min, p.hinta_max)}</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </AdvancedMarker>
            )
          })}
          {coords && (
            <AdvancedMarker position={coords} zIndex={20}>
              <div style={{ width: 24, height: 24, position: 'relative', overflow: 'visible' }}>
                <motion.div
                  style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)', pointerEvents: 'none' }}
                  animate={{ scale: [0.5, 2], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(66,133,244,0.18)' }} />
                <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#4285F4', border: '2.5px solid white' }} />
              </div>
            </AdvancedMarker>
          )}
          <MapPanController coords={coords} />
          {sheetPhase !== 'open' && <RecenterButton coords={coords} />}
          <MapAutoZoom target={autoZoomTarget} onComplete={() => setAutoZoomTarget(null)} />
        </Map>
      </div>

      {/* Tap-to-close sheet overlay — covers map area above the open sheet */}
      {sheetPhase === 'open' && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: contentH, zIndex: 56, cursor: 'pointer' }}
          onClick={() => { closeOverlays(); setSheetPhase('sliding') }}
        />
      )}

      {/* Backdrop for toolbars / filter dropdown */}
      {anyOverlayOpen && (
        <div className="fixed inset-0" style={{ zIndex: 63 }} onClick={closeOverlays} />
      )}

      {/* ── Top-left toolbar — filter + count ──────────────────────────── */}
      <div
        className="fixed"
        style={{
          top: 'max(12px, env(safe-area-inset-top))',
          left: 16,
          zIndex: 64,
        }}
      >
        <motion.div
          layout
          transition={{ layout: { type: 'spring', damping: 30, stiffness: 350 } }}
          className="glass rounded-full flex items-center overflow-hidden"
          style={{ height: 40 }}
        >
          {/* Trigger button */}
          <button
            onClick={() => { setLeftOpen(l => !l); setRightOpen(false); setFilterOpen(false) }}
            className="w-10 h-10 shrink-0 flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Expanded content */}
          <AnimatePresence>
            {leftOpen && (
              <motion.div
                key="left-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, delay: 0.06 }}
                className="flex items-center gap-2.5 pr-4 whitespace-nowrap"
              >
                {/* Filter selector */}
                <button
                  onClick={() => setFilterOpen(f => !f)}
                  className="flex items-center gap-1 text-sm font-bold text-[#111111] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_ease]"
                >
                  {aktiivinen === 'Kaikki' ? 'Kaikki lajit' : aktiivinen}
                  <motion.span
                    animate={{ rotate: filterOpen ? 180 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex"
                  >
                    ▾
                  </motion.span>
                </button>

                {/* Divider */}
                <div className="w-px h-4 bg-[rgba(0,0,0,0.1)]" />

                {/* Count */}
                <span className="text-sm text-[rgba(17,17,17,0.5)]">
                  {suodatettu.length} kohdetta
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Filter dropdown */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 mt-2 glass rounded-2xl py-1.5 min-w-[160px] shadow-xl"
              style={{ zIndex: 65 }}
            >
              {LAJIT_FILTTERI.map(laji => (
                <button
                  key={laji}
                  onClick={() => { setAktiivinen(laji); setFilterOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold [transition:color_100ms_ease]
                    ${aktiivinen === laji
                      ? 'text-[#111111]'
                      : 'text-[rgba(17,17,17,0.5)] hover:text-[#111111] hover:bg-[rgba(0,0,0,0.03)]'
                    }`}
                >
                  {laji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Top-right toolbar — search + favorites ─────────────────────── */}
      <div
        className="fixed flex items-center"
        style={{
          top: 'max(12px, env(safe-area-inset-top))',
          right: 16,
          zIndex: 64,
        }}
      >
        <motion.div
          layout
          transition={{ layout: { type: 'spring', damping: 30, stiffness: 350 } }}
          className="glass rounded-full flex items-center overflow-hidden"
          style={{ height: 40 }}
        >
          {/* Expanded content — appears to the left of trigger */}
          <AnimatePresence>
            {rightOpen && (
              <motion.div
                key="right-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, delay: 0.06 }}
                className="flex items-center gap-1 pl-2"
              >
                <Link
                  href="/?nakyma=lista"
                  onClick={closeOverlays}
                  className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                  aria-label="Haku"
                >
                  <Search className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/suosikit"
                  onClick={closeOverlays}
                  className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                  aria-label="Suosikit"
                >
                  <Heart className="w-3.5 h-3.5" />
                </Link>
                {supabaseUser ? (
                  <button
                    onClick={() => {
                      createBrowserSupabase().auth.signOut().then(() => {
                        setSupabaseUser(null)
                        setSuosikitIds(new Set())
                        router.refresh()
                      })
                      closeOverlays()
                    }}
                    className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                    aria-label="Kirjaudu ulos"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => { setAuthModalOpen(true); closeOverlays() }}
                    className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                    aria-label="Kirjaudu"
                  >
                    <User className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger button */}
          <button
            onClick={() => { setRightOpen(r => !r); setLeftOpen(false); setFilterOpen(false) }}
            className="w-10 h-10 shrink-0 flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* ── Main bottom sheet ──────────────────────────────────────────── */}
      {/* Tab (HANDLE_H) stays visible at bottom when closed — no separate FAB */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        initial={{ left: 0, right: 0, y: 0, borderRadius: '24px 24px 0px 0px' }}
        animate={{ y: sheetAnimY, left: sheetAnimLeft, right: sheetAnimRight, borderRadius: sheetAnimRadius }}
        transition={sheetTransition}
        onAnimationComplete={() => { if (sheetPhase === 'sliding') setSheetPhase('closed') }}
        onDragEnd={(_, info) => {
          if (info.velocity.y > 300 || info.offset.y > 80) setSheetPhase('sliding')
          else if (info.velocity.y < -300 || info.offset.y < -80) setSheetPhase('open')
        }}
        className="glass"
        style={{ position: 'fixed', bottom: 0, height: contentH, zIndex: 60, overflow: 'hidden' }}
      >
        {/* Drag handle — also tap to open when closed */}
        <div
          className="flex justify-center pt-3 pb-2"
          style={{ cursor: sheetPhase === 'open' ? 'grab' : 'pointer' }}
          onClick={() => { if (sheetPhase !== 'open') setSheetPhase('open') }}
        >
          <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
        </div>

        {/* Sheet content — fades out during slide-down so text doesn't squish during narrowing */}
        <motion.div
          animate={{ opacity: sheetPhase === 'open' ? 1 : 0 }}
          transition={{ duration: 0.18, ease: 'easeIn' }}
          className="flex flex-col gap-3 px-4 overflow-y-auto"
          style={{
            height: 'calc(100% - 40px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          }}
        >
          {/* AI Widget */}
          <div className="glass rounded-2xl flex items-center px-4 py-3.5 gap-3 shrink-0">
            <div className="flex-1 min-w-0 flex items-center">
              {aiTeksti && <span className="text-sm font-medium text-[#111111]">{aiTeksti}</span>}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {saa && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none select-none" aria-hidden>{getWeatherEmoji(saa.code)}</span>
                  <span className="text-sm font-bold text-[#111111] tabular-nums">
                    {saa.temp}°{' '}<span className="font-normal text-[rgba(17,17,17,0.45)]">{WEATHER_CITY}</span>
                  </span>
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setIsDark(d => !d)}
                className="glass-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
                style={{ color: isDark ? '#a0a0cc' : '#475569' }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDark ? (
                    <motion.span key="sun" className="flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                      <Sun className="w-3 h-3" /> Päivä
                    </motion.span>
                  ) : (
                    <motion.span key="moon" className="flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                      <Moon className="w-3 h-3" /> Yö
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Ad carousel */}
          <Karuselli isDark={isDark} />
        </motion.div>
      </motion.div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        pendingPaikkaId={pendingFavoriteId}
        onSuccess={id => {
          if (id) toggleSuosikki(id)
          setAuthModalOpen(false)
        }}
      />

      {/* ── Selected venue bottom sheet ────────────────────────────────── */}
      <AnimatePresence>
        {valittu && (
          <motion.div
            key={valittu.id}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.38, ease: EASE_DRAWER }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 300 || info.offset.y > 80) setValittu(null)
            }}
            className="fixed bottom-0 inset-x-0 rounded-t-3xl"
            style={{
              zIndex: 70,
              background:           'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop:            '1px solid rgba(255,255,255,1)',
              boxShadow:            '0 -8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1)',
              paddingBottom:        'max(env(safe-area-inset-bottom), 80px)',
              maxHeight:            '90vh',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
            </div>
            <button
              onClick={() => setValittu(null)}
              className="glass-btn absolute top-3 right-4 w-7 h-7 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="px-5 pt-2 pb-2" style={{ overflowY: 'auto' as const }}>
              {(() => {
                const laji = lajiKonfig[valittu.laji] ?? { label: valittu.laji, color: '#6b7280' }
                const Icon = SPORT_ICONS[valittu.laji] ?? Activity
                return (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: laji.color }}>
                    <Icon className="w-3 h-3" />{laji.label}
                  </span>
                )
              })()}
              {valittu.featured && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 ml-1.5">
                  Sponsoroitu
                </span>
              )}

              <div className="mt-2 flex items-start justify-between gap-2">
                <h2 className="font-serif text-xl font-bold text-[#111111] leading-snug flex-1">{valittu.nimi}</h2>
                <motion.button
                  whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
                  onClick={() => toggleSuosikki(valittu.id)}
                  className="shrink-0 w-8 h-8 rounded-full glass-btn flex items-center justify-center"
                  aria-label={suosikitIds.has(valittu.id) ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
                >
                  <Heart className={cn('w-4 h-4', suosikitIds.has(valittu.id) ? 'fill-[#111111] text-[#111111]' : 'text-[rgba(17,17,17,0.35)]')} />
                </motion.button>
              </div>

              {(valittu.osoite || valittu.kaupunki) && (
                <p className="mt-1.5 text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[valittu.osoite, valittu.kaupunki].filter(Boolean).join(', ')}
                </p>
              )}

              {(() => {
                const status = getOpenStatus(valittu.aukioloajat)
                if (status.status === 'no-data') return null
                return (
                  <p className="mt-1.5 text-sm">
                    {status.status === 'open'
                      ? <span className="text-green-700 font-bold">● Auki nyt{status.hours ? ` · ${status.hours}` : ''}</span>
                      : <span className="text-[rgba(17,17,17,0.45)]">Suljettu{status.hours ? ` · ${status.hours}` : ''}</span>
                    }
                  </p>
                )
              })()}

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  {(() => {
                    const priceStr = hintateksti(valittu.hinta_min, valittu.hinta_max)
                    const displayPrice = valittu.hinta_kuvaus || priceStr || null
                    return displayPrice
                      ? <p className="font-serif text-xl font-bold text-[#111111] tabular-nums">{displayPrice}</p>
                      : <p className="text-sm text-[rgba(17,17,17,0.4)]">Lisätään pian</p>
                  })()}
                </div>
                {isSafeUrl(valittu.varauslinkki) ? (
                  <motion.a href={valittu.varauslinkki} target="_blank" rel="noopener noreferrer" whileTap={{ scale: 0.97 }}
                    className="shrink-0 bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-3 rounded-full [transition:background-color_150ms_var(--ease-out)]">
                    Varaa →
                  </motion.a>
                ) : (
                  <Link href={`/paikat/${valittu.id}`}
                    className="shrink-0 border border-[rgba(0,0,0,0.15)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.3)] font-medium text-sm px-5 py-3 rounded-full [transition:color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]">
                    Näytä tiedot
                  </Link>
                )}
              </div>

              {(() => {
                const groups = formatGroupedHours(valittu.aukioloajat)
                if (groups.length === 0) return null
                return (
                  <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.07)]">
                    <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-2">Aukioloajat</p>
                    <HoursTable groups={groups} />
                  </div>
                )
              })()}

              {valittu.puhelin && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">Puhelin</p>
                  <a href={`tel:${valittu.puhelin}`} className="text-sm font-bold text-[#111111] hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]">
                    {valittu.puhelin}
                  </a>
                </div>
              )}

              {isSafeUrl(valittu.varauslinkki) && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">Varaussivu</p>
                  <a href={valittu.varauslinkki!} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-[#111111] font-bold underline underline-offset-2 break-all hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]">
                    {valittu.varauslinkki}
                  </a>
                </div>
              )}

              {valittu.kuvaus && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">Kuvaus</p>
                  <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{valittu.kuvaus}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
