'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Moon, Sun } from 'lucide-react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LAJIT_FILTTERI, lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import Karuselli from './Karuselli'
import type { Liikuntapaikka } from '@/lib/types'
import { DAY_MAP_STYLES, NIGHT_MAP_STYLES, isNightHour } from '@/lib/mapStyles'
import { TAMPERE } from '@/lib/constants'
import { useGPS } from '@/hooks/useGPS'
const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]
const EASE_MAP:   [number, number, number, number] = [0.4, 0, 0.2, 1]
const NAV_H      = 56

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

function MapStyleController({ isDark }: { isDark: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    map.setOptions({ styles: (isDark ? NIGHT_MAP_STYLES : DAY_MAP_STYLES) as google.maps.MapTypeStyle[] })
  }, [map, isDark])
  return null
}

function MapPanController({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !coords) return
    map.panTo(coords)
  }, [map, coords])
  return null
}

function SimplePin({ laji }: { laji: string }) {
  const color = (lajiKonfig as Record<string, { color: string }>)[laji]?.color ?? '#6b7280'
  const Icon = SPORT_ICONS[laji] ?? Activity
  return (
    <div style={{ position: 'relative', width: 32, height: 42 }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" width={32} height={42} style={{ display: 'block' }}>
        <path
          d="M14 0C6.268 0 0 6.268 0 14c0 5.25 2.875 9.83 7.125 12.3L14 38l6.875-11.7C25.125 23.83 28 19.25 28 14 28 6.268 21.732 0 14 0Z"
          fill={color}
        />
      </svg>
      <div style={{ position: 'absolute', top: 5, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Icon size={16} color="white" strokeWidth={2.5} />
      </div>
    </div>
  )
}

export default function Etusivu({ paikat }: { paikat: Liikuntapaikka[] }) {
  const [saa, setSaa]               = useState<SaaTiedot | null>(null)
  const [valittu, setValittu]       = useState<Liikuntapaikka | null>(null)
  const [aktiivinen, setAktiivinen] = useState('Kaikki')
  const [kartaAuki, setKartaAuki]   = useState(false)
  const [typedText, setTypedText]   = useState('')
  const [typedDone, setTypedDone]   = useState(false)
  const [fullH, setFullH]           = useState(600)
  const [isDark, setIsDark]         = useState(isNightHour)
  const { coords }                  = useGPS()

  useEffect(() => {
    const id = setInterval(() => setIsDark(isNightHour()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const update = () => {
      setFullH(window.innerHeight - NAV_H)
    }
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

  const aiTeksti = useMemo(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 11)  return 'Huomenta · Löydä paras liikuntapaikka Tampereelta'
    if (h >= 11 && h < 17) return 'Hei · Löydä paras liikuntapaikka Tampereelta'
    return 'Iltaa · Löydä paras liikuntapaikka Tampereelta'
  }, [])

  useEffect(() => {
    setTypedText('')
    setTypedDone(false)
    let i = 0
    const timer = setInterval(() => {
      i++
      setTypedText(aiTeksti.slice(0, i))
      if (i >= aiTeksti.length) { clearInterval(timer); setTypedDone(true) }
    }, 55)
    return () => clearInterval(timer)
  }, [aiTeksti])

  // Browser back closes fullscreen map
  useEffect(() => {
    if (!kartaAuki) return
    window.history.pushState(null, '')
    const close = () => setKartaAuki(false)
    window.addEventListener('popstate', close)
    return () => window.removeEventListener('popstate', close)
  }, [kartaAuki])

  // Clear selection when map closes
  useEffect(() => {
    if (!kartaAuki) setValittu(null)
  }, [kartaAuki])

  const suodatettu = useMemo(
    () => paikat.filter(p =>
      aktiivinen === 'Kaikki' || p.laji.toLowerCase() === aktiivinen.toLowerCase()
    ),
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

  return (
    <>
      {/* ── Night mode background overlays ──────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: 'linear-gradient(to bottom, #dde0ef 0%, #8a94b3 32%, #1d2038 62%, #07090f 100%)',
          backgroundAttachment: 'fixed',
          opacity: isDark ? 1 : 0,
          transition: 'opacity 800ms ease',
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 pointer-events-none night-stars"
        style={{
          zIndex: 0,
          opacity: isDark ? 1 : 0,
          transition: 'opacity 1000ms ease',
        }}
        aria-hidden
      />

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <div
        className="px-4 pt-4 pb-4 flex flex-col gap-3 relative z-[1]"
        style={{ height: `calc(100svh - ${NAV_H}px)` }}
      >

        {/* AI Widget — auto height, grows with content */}
        <div className="glass rounded-2xl flex items-center px-4 py-3.5 gap-3 shrink-0">
          <div className="flex-1 min-w-0 flex items-center">
            <span className="text-sm font-medium text-[#111111]">{typedText}</span>
            {!typedDone && <span className="typewriter-cursor ml-0.5 shrink-0" />}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {saa && (
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none select-none" aria-hidden>
                  {getWeatherEmoji(saa.code)}
                </span>
                <span className="text-sm font-semibold text-[#111111] tabular-nums">
                  {saa.temp}°
                </span>
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setIsDark(d => !d)}
              className="glass-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
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

        {/* Expansion space — absorbs AI widget growth (≈ 2 lines of text) */}
        <div className="shrink-0" style={{ height: 40 }} />

        {/* Ad carousel */}
        <Karuselli isDark={isDark} />

        {/* ── Map preview ─────────────────────────────────────────────
            Fixed height placeholder; the actual map is always position:fixed
            below and overlaps this space exactly.                      */}
        <div className="shrink-0 mx-0 sm:mx-16" style={{ height: 200 }} aria-hidden />
      </div>

      {/* ── Map widget — always fixed, animates from small to fullscreen */}
      <AnimatePresence>
        {!kartaAuki && (
          /* Small / 3-D preview state */
          <motion.div
            key="preview"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className={`fixed left-0 right-0 bottom-0 z-40 mx-0 sm:mx-16 cursor-pointer${isDark ? ' map-night-fade-top' : ''}`}
            style={{
              height: 370,
              borderRadius: 24,
              boxShadow: '0 40px 80px rgba(0,0,0,0.3)',
              transform: 'perspective(900px) rotateX(35deg) scale(0.85)',
              transformOrigin: 'bottom center',
            }}
            onClick={() => setKartaAuki(true)}
          >
            {/* clip-path clips at render level — the only reliable way to round Google Maps corners */}
            <div style={{ width: '100%', height: '100%', clipPath: 'inset(0 round 24px)', position: 'relative' }}>
              <Map
                mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                defaultCenter={TAMPERE}
                defaultZoom={12}
                style={{ width: '100%', height: '100%' }}
                disableDefaultUI
                gestureHandling="none"
                clickableIcons={false}
                keyboardShortcuts={false}
              >
                {paikatKartalla.map(p => (
                  <AdvancedMarker
                    key={p.id}
                    position={{ lat: p.latitude, lng: p.longitude }}
                  >
                    <SimplePin laji={p.laji} />
                  </AdvancedMarker>
                ))}
                <MapStyleController isDark={isDark} />
                <MapPanController coords={coords} />
              </Map>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {kartaAuki && (
          /* ── Wrapper: height 260 → fullH ──────────────────────────── */
          <motion.div
            key="fullscreen"
            className="fixed left-0 right-0 bottom-0 z-50 overflow-hidden"
            initial={{ height: 310 }}
            animate={{ height: fullH }}
            exit={{ height: 370, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_MAP }}
          >
            {/* ── Inner: 3-D unfolding transform ─────────────────────── */}
            <motion.div
              style={{ width: '100%', height: '100%', transformOrigin: 'bottom center' }}
              initial={{
                transform:   'perspective(900px) rotateX(35deg) scale(0.85)',
                boxShadow:   '0 40px 80px rgba(0,0,0,0.3)',
                borderRadius: 24,
              }}
              animate={{
                transform:   'perspective(900px) rotateX(0deg) scale(1)',
                boxShadow:   '0 0px 0px rgba(0,0,0,0)',
                borderRadius: 0,
              }}
              exit={{
                transform:   'perspective(900px) rotateX(35deg) scale(0.85)',
                boxShadow:   '0 40px 80px rgba(0,0,0,0.3)',
                borderRadius: 24,
              }}
              transition={{ duration: 0.45, ease: EASE_MAP }}
            >
              <Map
                mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                defaultCenter={TAMPERE}
                defaultZoom={14}
                style={{ width: '100%', height: '100%' }}
                disableDefaultUI
                gestureHandling="greedy"
                clickableIcons={false}
                keyboardShortcuts={false}
                onClick={() => setValittu(null)}
              >
                {paikatKartalla.map(p => (
                  <AdvancedMarker
                    key={p.id}
                    position={{ lat: p.latitude, lng: p.longitude }}
                    zIndex={valittu?.id === p.id ? 10 : 1}
                    onClick={() => setValittu(p)}
                  >
                    <SimplePin laji={p.laji} />
                  </AdvancedMarker>
                ))}
                <MapStyleController isDark={isDark} />
                <MapPanController coords={coords} />
              </Map>

              {/* X close button */}
              <button
                onClick={() => setKartaAuki(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.6)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Day / Night toggle */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setIsDark(d => !d)}
                className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full glass-btn text-xs font-semibold"
                style={{ color: isDark ? '#a0a0cc' : '#475569' }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDark ? (
                    <motion.span key="sun" className="flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                      <Sun className="w-3.5 h-3.5" /> Päivä
                    </motion.span>
                  ) : (
                    <motion.span key="moon" className="flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                      <Moon className="w-3.5 h-3.5" /> Yö
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Filter pills — bottom center, hidden when bottom sheet open */}
              <AnimatePresence>
                {!valittu && (
                  <motion.div
                    key="filters"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-4 inset-x-0 flex justify-center px-4 z-10 pointer-events-none"
                  >
                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto">
                      {LAJIT_FILTTERI.map(laji => (
                        <motion.button
                          key={laji}
                          onClick={() => setAktiivinen(laji)}
                          whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                          className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold
                            [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                            ${aktiivinen === laji
                              ? 'bg-[#111111] text-white shadow-lg'
                              : 'glass-btn text-[rgba(17,17,17,0.7)] hover:text-[#111111]'
                            }`}
                        >
                          {laji}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom sheet ─────────────────────────────────────────────── */}
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
            className="fixed bottom-0 inset-x-0 z-[60] rounded-t-3xl"
            style={{
              background:           'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop:            '1px solid rgba(255,255,255,1)',
              boxShadow:            '0 -8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1)',
              paddingBottom:        'max(env(safe-area-inset-bottom), 80px)',
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

            <div className="px-5 pt-2 pb-2">
              {(() => {
                const laji = lajiKonfig[valittu.laji] ?? { label: valittu.laji, color: '#6b7280' }
                const Icon = SPORT_ICONS[valittu.laji] ?? Activity
                return (
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: laji.color }}
                  >
                    <Icon className="w-3 h-3" />
                    {laji.label}
                  </span>
                )
              })()}

              <h2 className="mt-2 font-serif text-xl font-bold text-[#111111] leading-snug">
                {valittu.nimi}
              </h2>

              {(valittu.osoite || valittu.kaupunki) && (
                <p className="mt-1.5 text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[valittu.osoite, valittu.kaupunki].filter(Boolean).join(', ')}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  {hintateksti(valittu.hinta_min, valittu.hinta_max) ? (
                    <p className="font-serif text-xl font-bold text-[#111111] tabular-nums">
                      {hintateksti(valittu.hinta_min, valittu.hinta_max)}
                    </p>
                  ) : (
                    <p className="text-sm text-[rgba(17,17,17,0.4)]">Lisätään pian</p>
                  )}
                </div>

                {valittu.varauslinkki ? (
                  <motion.a
                    href={valittu.varauslinkki}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0 bg-[#111111] hover:bg-[#333333] text-white font-semibold text-sm px-6 py-3 rounded-full [transition:background-color_150ms_var(--ease-out)]"
                  >
                    Varaa →
                  </motion.a>
                ) : (
                  <Link
                    href={`/paikat/${valittu.id}`}
                    className="shrink-0 border border-[rgba(0,0,0,0.15)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.3)] font-medium text-sm px-5 py-3 rounded-full [transition:color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
                  >
                    Näytä tiedot
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
