'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import {
  motion, AnimatePresence,
  useScroll, useTransform, useMotionValueEvent,
} from 'framer-motion'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import Link from 'next/link'
import { LAJIT_FILTTERI, lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import type { Liikuntapaikka } from '@/lib/types'

const TAMPERE    = { lat: 61.4978, lng: 23.761 }
const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]
const SCROLL_END = 300
const NAV_H      = 56   // px — matches h-14 NavBar

/* ── Map style ────────────────────────────────────────────────────── */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',       stylers: [{ color: '#f0f0f0' }] },
  { featureType: 'water',          elementType: 'geometry', stylers: [{ color: '#c9dff0' }] },
  { featureType: 'road',           elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway',   elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road',           elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'poi',            stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',        stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#aaaaaa' }] },
]

/* ── Weather ──────────────────────────────────────────────────────── */
interface SaaTiedot { temp: number; code: number }

function parseSaa(code: number) {
  if (code === 0)  return { ikoni: '☀️', ehdotus: 'Täydellinen päivä ulkoliikunnalle 🎾' }
  if (code <= 3)   return { ikoni: '⛅', ehdotus: 'Hyvä päivä sisäliikunnalle 🏋️' }
  if (code <= 48)  return { ikoni: '🌫️', ehdotus: 'Hyvä päivä sisäliikunnalle 🏋️' }
  if (code <= 67)  return { ikoni: '🌧️', ehdotus: 'Uimahalli odottaa 🏊' }
  if (code <= 77)  return { ikoni: '❄️', ehdotus: 'Uimahalli odottaa 🏊' }
  return           { ikoni: '🌦️', ehdotus: 'Hyvä päivä sisäliikunnalle 🏋️' }
}

/* ── Component ────────────────────────────────────────────────────── */
export default function Etusivu({ paikat }: { paikat: Liikuntapaikka[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: scrollRef })

  const [saa, setSaa]               = useState<SaaTiedot | null>(null)
  const [valittu, setValittu]       = useState<Liikuntapaikka | null>(null)
  const [aktiivinen, setAktiivinen] = useState('Kaikki')
  const [containerH, setContainerH] = useState(700)
  const [aiBlocked, setAiBlocked]   = useState(false)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })

  useEffect(() => {
    const update = () => setContainerH(window.innerHeight - NAV_H)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useMotionValueEvent(scrollY, 'change', v => {
    const blocked = v > 100
    if (blocked !== aiBlocked) setAiBlocked(blocked)
  })

  const tervehdys = useMemo(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 11)  return 'Huomenta 🌅'
    if (h >= 11 && h < 17) return 'Hei 👋'
    return 'Iltaa 🌙'
  }, [])

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=61.4978&longitude=23.7610&current=temperature_2m,weather_code')
      .then(r => r.json())
      .then(d => setSaa({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code }))
      .catch(() => {})
  }, [])

  const suodatettu = useMemo(
    () => paikat.filter(p =>
      aktiivinen === 'Kaikki' || p.laji.toLowerCase() === aktiivinen.toLowerCase()
    ),
    [paikat, aktiivinen]
  )

  const paikatKartalla = useMemo(
    () => suodatettu.filter(
      (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
        p.latitude != null && p.longitude != null
    ),
    [suodatettu]
  )

  const saaData = saa ? parseSaa(saa.code) : null

  const markerIcon = isLoaded
    ? { path: window.google.maps.SymbolPath.CIRCLE, scale: 9,  fillColor: '#6366F1', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 }
    : undefined
  const activeIcon = isLoaded
    ? { path: window.google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#4F46E5', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }
    : undefined

  /* ── Scroll-driven transforms ───────────────────────────────────── */

  // Map: narrow+short peek → full-width full-height
  const mapWidth        = useTransform(scrollY, [0, SCROLL_END], ['70%', '100%'])
  const mapLeft         = useTransform(scrollY, [0, SCROLL_END], ['15%', '0%'])
  const mapHeight       = useTransform(scrollY, [0, SCROLL_END], [184, containerH])
  const mapRadius       = useTransform(scrollY, [0, SCROLL_END], ['20px', '0px'])

  // AI widget: full card → invisible
  const aiOpacity       = useTransform(scrollY, [0, 180], [1, 0])
  const aiY             = useTransform(scrollY, [0, 180], [0, -16])

  // Pill: invisible → visible
  const pillOpacity     = useTransform(scrollY, [120, 240], [0, 1])
  const pillY           = useTransform(scrollY, [120, 240], [-12, 0])
  const pillScale       = useTransform(scrollY, [120, 240], [0.88, 1])

  // Map label (peek hint): fades out as map expands
  const labelOpacity    = useTransform(scrollY, [60, 200], [1, 0])

  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div
      ref={scrollRef}
      className="relative overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: `calc(100svh - ${NAV_H}px)` }}
    >

      {/* Sticky scene — everything visible; scrolls internally via transforms */}
      <div
        className="sticky top-0 overflow-hidden"
        style={{ height: `calc(100svh - ${NAV_H}px)` }}
      >

        {/* ── AI widget ─────────────────────────────────────────── */}
        <motion.div
          style={{ opacity: aiOpacity, y: aiY }}
          className={`px-4 pt-4 ${aiBlocked ? 'pointer-events-none' : ''}`}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
            <div className="px-5 pt-5 pb-4">

              {/* Greeting + weather */}
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight">
                  {tervehdys}
                </h1>
                {saaData && saa ? (
                  <>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <span className="text-4xl leading-none select-none">{saaData.ikoni}</span>
                      <span className="text-4xl font-extrabold text-[#1E1B4B] tabular-nums leading-none">
                        {saa.temp}°
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#6B7280] leading-snug">{saaData.ehdotus}</p>
                  </>
                ) : (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                      <div className="w-14 h-9 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                    <div className="w-44 h-4 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                )}
              </div>

              <div className="mt-4 mb-3 h-px bg-gray-100" />

              {/* Filter pills */}
              <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {LAJIT_FILTTERI.map(laji => (
                  <motion.button
                    key={laji}
                    onClick={() => setAktiivinen(laji)}
                    whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold
                      [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                      ${aktiivinen === laji
                        ? 'bg-[#6366F1] text-white shadow-sm'
                        : 'bg-gray-100 text-[#6B7280] hover:text-indigo-700 hover:bg-indigo-50'
                      }`}
                  >
                    {laji}
                  </motion.button>
                ))}
              </div>

              {/* Scroll hint */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[#9CA3AF]">
                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-xs">Selaa alas avataksesi kartan</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Dynamic Island pill ────────────────────────────────── */}
        <motion.button
          style={{ opacity: pillOpacity, y: pillY, scale: pillScale }}
          onClick={scrollToTop}
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-20
            flex items-center gap-2 px-4 py-2
            bg-[#4F46E5] rounded-full
            shadow-[0_4px_20px_rgba(79,70,229,0.45)]
            ${aiBlocked ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <span className="text-base leading-none select-none">{saaData?.ikoni ?? '⛅'}</span>
          {saa && (
            <span className="text-sm font-bold text-white tabular-nums">{saa.temp}°</span>
          )}
          <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        </motion.button>

        {/* ── Map: peek → full screen ────────────────────────────── */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: mapLeft,
            width: mapWidth,
            height: mapHeight,
            borderRadius: mapRadius,
            overflow: 'hidden',
          }}
        >
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={TAMPERE}
              zoom={13}
              options={{
                streetViewControl:  false,
                mapTypeControl:     false,
                fullscreenControl:  false,
                zoomControl:        false,
                disableDefaultUI:   true,
                clickableIcons:     false,
                gestureHandling:    'greedy',
                styles:             MAP_STYLES,
              }}
              onClick={() => setValittu(null)}
            >
              {paikatKartalla.map(p => (
                <Marker
                  key={p.id}
                  position={{ lat: p.latitude, lng: p.longitude }}
                  title={p.nimi}
                  icon={valittu?.id === p.id ? activeIcon : markerIcon}
                  zIndex={valittu?.id === p.id ? 10 : 1}
                  onClick={() => setValittu(p)}
                />
              ))}
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-[#f0f0f0] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-indigo-200 animate-pulse" />
            </div>
          )}

          {/* Peek label — fades as map expands */}
          <motion.div
            style={{ opacity: labelOpacity }}
            className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-semibold text-[#1E1B4B]">
                {paikatKartalla.length} paikkaa kartalla
              </span>
            </div>
          </motion.div>
        </motion.div>

      </div>

      {/* Scroll spacer — provides the 300 px we scroll through */}
      <div style={{ height: SCROLL_END }} aria-hidden className="pointer-events-none" />

      {/* ── Bottom sheet ──────────────────────────────────────────── */}
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
            className="fixed bottom-0 inset-x-0 z-[60] bg-white rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 80px)' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setValittu(null)}
              className="absolute top-3 right-4 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 [transition:background-color_150ms_var(--ease-out)]"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="px-5 pt-2 pb-2">
              {(() => {
                const laji = lajiKonfig[valittu.laji] ?? { label: valittu.laji, badgeTw: 'bg-gray-100 text-gray-600' }
                return (
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${laji.badgeTw}`}>
                    {laji.label}
                  </span>
                )
              })()}

              <h2 className="mt-2 text-xl font-extrabold text-[#1E1B4B] leading-snug">
                {valittu.nimi}
              </h2>

              {(valittu.osoite || valittu.kaupunki) && (
                <p className="mt-1.5 text-sm text-[#6B7280] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {[valittu.osoite, valittu.kaupunki].filter(Boolean).join(', ')}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  {hintateksti(valittu.hinta_min, valittu.hinta_max) ? (
                    <p className="text-xl font-bold text-indigo-600 tabular-nums">
                      {hintateksti(valittu.hinta_min, valittu.hinta_max)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Lisätään pian</p>
                  )}
                </div>

                {valittu.varauslinkki ? (
                  <motion.a
                    href={valittu.varauslinkki}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0 bg-[#6366F1] hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-full [transition:background-color_150ms_var(--ease-out)]"
                  >
                    Varaa aika →
                  </motion.a>
                ) : (
                  <Link
                    href={`/paikat/${valittu.id}`}
                    className="shrink-0 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium text-sm px-5 py-3 rounded-full [transition:background-color_150ms_var(--ease-out)]"
                  >
                    Näytä tiedot
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
