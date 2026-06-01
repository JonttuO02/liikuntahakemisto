'use client'

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Moon, Sun, Locate, Search, Bookmark, MoreHorizontal, LogOut, User, LayoutList } from 'lucide-react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { LAJIT_FILTTERI, lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import Karuselli from './Karuselli'
import type { Liikuntapaikka } from '@/lib/types'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly } from '@/lib/priceUtils'
import { isNightHour } from '@/lib/mapStyles'
import { TAMPERE } from '@/lib/constants'
import { nearestKaupunki, haversineKm, formatDistance } from '@/lib/geo'
import { useGPS } from '@/hooks/useGPS'
import SportPin from './SportPin'
import AktiiviLogo from './AktiiviLogo'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'
import { deriveKaupungit } from '@/lib/cityFilter'
import DiagonaalKortti from './DiagonaalKortti'
import PaikkaSheet from './PaikkaSheet'

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
const HANDLE_H = 44 // visible sheet tab height when closed

const pinAnimDelay = (id: number | string): number =>
  typeof id === 'string' ? (id.charCodeAt(0) % 10) / 10 : (id % 10) / 10

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
    try {
      if (sessionStorage.getItem('gps-pan-done')) return
      sessionStorage.setItem('gps-pan-done', '1')
    } catch {}
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
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  useEffect(() => {
    if (!map || !target) return
    const m = map
    const tgt = target
    const fromCenter = m.getCenter()
    const fromZoom = m.getZoom() ?? 14
    if (!fromCenter) return
    const fromLat = fromCenter.lat()
    const fromLng = fromCenter.lng()
    const toZoom = Math.max(fromZoom, 16)
    const duration = 700
    // easeInOutCubic — snappy start, smooth landing
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
    let start: number | null = null
    let raf: number
    function step(ts: number) {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const e = ease(t)
      m.moveCamera({
        center: { lat: fromLat + (tgt.lat - fromLat) * e, lng: fromLng + (tgt.lng - fromLng) * e },
        zoom: fromZoom + (toZoom - fromZoom) * e,
      })
      if (t < 1) raf = requestAnimationFrame(step)
      else onCompleteRef.current()
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [map, target])
  return null
}

function CalloutCard({ p }: { p: Liikuntapaikka & { latitude: number; longitude: number } }) {
  const ref = useRef<HTMLDivElement>(null)
  const [clipPath, setClipPath] = useState('')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const h = el.offsetHeight - 11
      setClipPath(
        `M 10,0 L 120,0 Q 130,0 130,10 L 130,${h - 10} Q 130,${h} 120,${h} L 75,${h} L 65,${h + 11} L 55,${h} L 10,${h} Q 0,${h} 0,${h - 10} L 0,10 Q 0,0 10,0 Z`
      )
    }
    const obs = new ResizeObserver(compute)
    obs.observe(el)
    compute()
    return () => obs.disconnect()
  }, [])

  const hinta = p.hinta_kuvaus || hintateksti(p.hinta_min, p.hinta_max)

  return (
    <div
      ref={ref}
      className="glass px-2.5 py-2 flex flex-col gap-1 cursor-pointer"
      style={{
        width: 130,
        paddingBottom: 11,
        clipPath: clipPath ? `path('${clipPath}')` : undefined,
        borderRadius: clipPath ? 0 : 10,
      }}
    >
      <span
        className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white truncate"
        style={{ backgroundColor: lajiKonfig[p.laji]?.color ?? '#6b7280' }}
      >
        {lajiKonfig[p.laji]?.label ?? p.laji}
      </span>
      <span className="font-bold text-sm text-[#111111] truncate leading-tight">{p.nimi}</span>
      {hinta && (
        <span className="text-[10px] text-[rgba(17,17,17,0.55)] truncate">{hinta}</span>
      )}
    </div>
  )
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
  const [expandedCluster, setExpandedCluster] = useState<(Liikuntapaikka & { latitude: number; longitude: number })[] | null>(null)
  // 'open' → 'sliding' (y to contentH) → onAnimationComplete → 'closed' (pill)
  const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('closed')
  const [rightOpen, setRightOpen]   = useState(false)
  const [fullH, setFullH]           = useState(700)
  const [fullW, setFullW]           = useState(390)
  const [isDark, setIsDark]         = useState(false)
  const [zoomLevel, setZoomLevel]   = useState(14)
  const [mapCenter, setMapCenter]   = useState<{ lat: number; lng: number }>(TAMPERE)
  const [autoZoomTarget, setAutoZoomTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [todoIds, setTodoIds]               = useState<Set<number>>(new Set())
  const [kotikaupunki, setKotikaupunki]     = useState<string>('')
  const [kiinnostukset, setKiinnostukset]   = useState<string[]>([])
  const [supabaseUser, setSupabaseUser]     = useState<{ id: string; email?: string } | null>(null)
  const [isAuthReady, setIsAuthReady]       = useState(false)
  const [authModalOpen, setAuthModalOpen]   = useState(false)
  const [pendingFavoriteId, setPendingFavoriteId] = useState<number | null>(null)
  const [weatherKaupunki, setWeatherKaupunki] = useState<string>('Tampere')
  const [searchOpen, setSearchOpen]           = useState(false)
  const [searchHaku, setSearchHaku]           = useState('')
  const [searchLaji, setSearchLaji]           = useState('Kaikki')
  const [searchAukinyt, setSearchAukinyt]     = useState(false)
  const [searchKertakaynti, setSearchKertakaynti] = useState(false)
  const [searchKaupunki, setSearchKaupunki]   = useState('Kaikki')
  const [searchFocused, setSearchFocused]     = useState(false)
  const inFlight = useRef<Set<number>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rightOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingValittuRef = useRef<Liikuntapaikka | null>(null)
  const zoomRef = useRef(14)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const suppressAutoOpenRef = useRef(false)
  const [sheetVisible, setSheetVisible] = useState(false)
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
    setRightOpen(false)
  }

  function openSearch(focused: boolean) {
    closeOverlays()
    setValittu(null)
    setSearchHaku('')
    setSearchFocused(focused)
    setSheetVisible(true)
    if (sheetPhase === 'open') setSheetPhase('sliding')
    setSearchOpen(true)
  }

  function handleCardClick() {
    try {
      const scrollTop = searchResultsRef.current?.scrollTop ?? 0
      const state = {
        scrollTop,
        searchHaku,
        searchLaji,
        searchKertakaynti,
        searchAukinyt,
        searchKaupunki,
        searchOpen: true,
      }
      sessionStorage.setItem('etusivu-scroll-state', JSON.stringify(state))
    } catch {}
  }

  async function toggleTodo(id: number) {
    if (inFlight.current.has(id)) return   // debounce concurrent taps
    inFlight.current.add(id)
    const user = supabaseUser

    if (!user) {
      inFlight.current.delete(id)
      setPendingFavoriteId(id)
      setAuthModalOpen(true)
      return
    }
    const supabase = createBrowserSupabase()

    try {
      const isCurrentlySaved = todoIds.has(id)
      setTodoIds(prev => {
        const next = new Set(prev)
        if (isCurrentlySaved) next.delete(id)
        else next.add(id)
        return next
      })

      if (isCurrentlySaved) {
        const { error } = await supabase.from('suosikit').delete().eq('user_id', user.id).eq('paikka_id', id)
        if (error) {
          console.error('[toggleTodo] delete error:', error)
          setTodoIds(prev => { const next = new Set(prev); next.add(id); return next })
        }
      } else {
        const { error } = await supabase.from('suosikit').insert({ user_id: user.id, paikka_id: id })
        if (error) {
          console.error('[toggleTodo] insert error:', error)
          setTodoIds(prev => { const next = new Set(prev); next.delete(id); return next })
        }
      }
    } finally {
      inFlight.current.delete(id)
    }
  }

  // Restore scroll position and search state when returning from a venue profile (NAV-01)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('etusivu-scroll-state')
      if (!raw) return
      sessionStorage.removeItem('etusivu-scroll-state')
      if (focusId) return  // "Näytä kartalla" route — clear key but don't reopen search list
      const s = JSON.parse(raw)
      if (typeof s !== 'object' || s === null) return
      if (typeof s.searchHaku === 'string') setSearchHaku(s.searchHaku)
      if (typeof s.searchLaji === 'string') setSearchLaji(s.searchLaji)
      if (typeof s.searchKertakaynti === 'boolean') setSearchKertakaynti(s.searchKertakaynti)
      if (typeof s.searchAukinyt === 'boolean') setSearchAukinyt(s.searchAukinyt)
      if (typeof s.searchKaupunki === 'string') setSearchKaupunki(s.searchKaupunki)
      if (s.searchOpen === true) {
        suppressAutoOpenRef.current = true
        setSheetVisible(true)
        setSearchOpen(true)
      }
      if (typeof s.scrollTop === 'number' && s.scrollTop > 0) {
        requestAnimationFrame(() => {
          if (searchResultsRef.current) {
            searchResultsRef.current.scrollTop = s.scrollTop
          }
        })
      }
    } catch (err) {
      console.warn('[Etusivu] Failed to restore scroll state', err)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clear debounce timer on unmount to prevent stale state update after navigation
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Clear right-open timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (rightOpenTimerRef.current) clearTimeout(rightOpenTimerRef.current)
    }
  }, [])

  useEffect(() => { setIsDark(isNightHour()) }, [])

  useEffect(() => {
    const id = setInterval(() => setIsDark(isNightHour()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const supabase = createBrowserSupabase()
    return subscribeToAuthUser(async (user) => {
      setSupabaseUser(user)
      if (user) {
        const { data } = await supabase.from('suosikit').select('paikka_id').eq('user_id', user.id)
        if (data) setTodoIds(new Set(data.map((s: { paikka_id: number }) => s.paikka_id)))
        // Load kotikaupunki and kiinnostukset from profiles (PGRST116 = no row yet for new users, safe to ignore)
        const { data: profileData } = await supabase.from('profiles').select('kotikaupunki, kiinnostukset').eq('user_id', user.id).single()
        setKotikaupunki(profileData?.kotikaupunki ?? '')
        setKiinnostukset(profileData?.kiinnostukset ?? [])
      } else {
        setTodoIds(new Set())
        setKotikaupunki('')
        setKiinnostukset([])
      }
      setIsAuthReady(true)
    })
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
    () => Array.from(todoIds).sort((a, b) => a - b).join(','),
    [todoIds]
  )

  const kiinnostuksetKey = useMemo(
    () => [...kiinnostukset].sort().join(','),
    [kiinnostukset]
  )

  useEffect(() => {
    if (!isAuthReady) return
    const key = 'saasuositus-' + new Date().toISOString().slice(0, 10)
      + '-' + weatherKaupunki
      + (todoIds.size > 0 ? '-' + suosikitSizeAndIds : '')
      + (kotikaupunki ? '-hk:' + kotikaupunki : '')
      + (kiinnostuksetKey ? '-ki:' + kiinnostuksetKey : '')
    try {
      const cached = sessionStorage.getItem(key)
      if (cached) { setAiTeksti(cached); return }
    } catch {}

    const todoNimet = Array.from(todoIds)
      .slice(0, 10)
      .map(id => paikat.find(p => p.id === id)?.nimi)
      .filter(Boolean) as string[]

    const fetchPromise = supabaseUser !== null
      ? fetch('/api/saasuositus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suosikit: todoNimet, kaupunki: weatherKaupunki, ...(kotikaupunki ? { kotikaupunki } : {}), kiinnostukset }) })
      : fetch('/api/saasuositus?kaupunki=' + encodeURIComponent(weatherKaupunki))

    fetchPromise
      .then(r => r.json())
      .then((d: { text: string; temp: number; code: number; fallback?: boolean }) => {
        setAiTeksti(d.text)
        try { sessionStorage.setItem(key, d.text) } catch {}
      })
      .catch(() => setAiTeksti(getTimeBasedFallback()))
  // paikat is intentionally excluded — it's a stable server-fetched prop and its reference
  // changing on router.refresh() would cause spurious AI calls; suosikitSizeAndIds and kiinnostuksetKey
  // (stable strings) cover the meaningful dependencies without creating new references on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suosikitSizeAndIds, weatherKaupunki, kotikaupunki, kiinnostuksetKey, isAuthReady])

  // Auto-open sheet on homepage load unless /?id=X is present (NAV-03)
  // or unless we're restoring a search session (suppressAutoOpenRef set by scroll restore).
  // Delay gives the map tiles time to render before the sheet slides up.
  useEffect(() => {
    if (focusId) return
    if (suppressAutoOpenRef.current) return
    const t = setTimeout(() => { setSheetVisible(true); setSheetPhase('open') }, 700)
    return () => clearTimeout(t)
  // Run once on mount only — focusId from useSearchParams is stable at initial render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focusId) return
    const id = Number(focusId)
    const target = paikat.find(p => p.id === id)
    if (!target || target.latitude == null || target.longitude == null) return
    setSheetVisible(true)
    setAutoZoomTarget({ lat: target.latitude, lng: target.longitude })
    setSheetPhase('sliding')
  // setAutoZoomTarget and setSheetPhase are stable useState setters — omitted intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, paikat])

  const lajitKartalla = useMemo(
    () => new Set(LAJIT_FILTTERI.filter(l => l !== 'Kaikki').map(l => l.toLowerCase())),
    []
  )

  const paikatKartalla = useMemo(
    () => paikat.filter(
      (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
        (searchLaji === 'Kaikki' || p.laji.toLowerCase() === searchLaji.toLowerCase()) &&
        p.latitude != null && p.longitude != null &&
        lajitKartalla.has(p.laji.toLowerCase())
    ),
    [paikat, searchLaji, lajitKartalla]
  )

  const mapItems = useMemo(() => {
    const groups: Record<string, (Liikuntapaikka & { latitude: number; longitude: number })[]> = {}
    for (const p of paikatKartalla) {
      const key = Math.round(p.latitude * 10000) + ',' + Math.round(p.longitude * 10000)
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return Object.values(groups).map(items =>
      items.length === 1
        ? { type: 'single' as const, paikka: items[0] }
        : {
            type: 'cluster' as const,
            lat: items.reduce((s, p) => s + p.latitude, 0) / items.length,
            lng: items.reduce((s, p) => s + p.longitude, 0) / items.length,
            items,
          }
    )
  }, [paikatKartalla])

  const anyOverlayOpen = rightOpen

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

  // At zoom >= 16 show a callout card only for the venue nearest to map center,
  // provided it's within 500 m. Outside that radius everything shows as a pin.
  const nearestCardId = useMemo<number | null>(() => {
    if (zoomLevel < 16) return null
    let minDist = Infinity
    let nearestId: number | null = null
    for (const p of paikatKartalla) {
      const d = haversineKm(mapCenter.lat, mapCenter.lng, p.latitude, p.longitude)
      if (d < minDist) { minDist = d; nearestId = p.id }
    }
    return minDist <= 0.5 ? nearestId : null
  }, [zoomLevel, mapCenter, paikatKartalla])

  const searchSuodatettu = useMemo(() =>
    paikat.filter(p => {
      const matchesLaji        = searchLaji === 'Kaikki' || p.laji.toLowerCase() === searchLaji.toLowerCase()
      const q                  = searchHaku.toLowerCase()
      const matchesHaku        = !searchHaku || p.nimi.toLowerCase().includes(q) || p.kuvaus?.toLowerCase().includes(q) || p.osoite?.toLowerCase().includes(q)
      const matchesKertakaynti = !searchKertakaynti || !isMembershipOnly(p)
      const matchesAuki        = !searchAukinyt || getOpenStatus(p.aukioloajat).status !== 'closed'
      const matchesKaupunki    = searchKaupunki === 'Kaikki' || p.kaupunki === searchKaupunki
      return matchesLaji && matchesHaku && matchesKertakaynti && matchesAuki && matchesKaupunki
    }),
    [paikat, searchLaji, searchHaku, searchKertakaynti, searchAukinyt, searchKaupunki]
  )

  const isFilterActive = searchLaji !== 'Kaikki' || searchKertakaynti || searchAukinyt || searchKaupunki !== 'Kaikki'

  return (
    <LayoutGroup>
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
          onClick={() => { setValittu(null); setExpandedCluster(null) }}
          onCameraChanged={ev => {
            const newZoom = ev.detail.zoom
            if ((zoomRef.current < 16) !== (newZoom < 16)) setZoomLevel(newZoom)
            zoomRef.current = newZoom
            const center = ev.detail.center
            setMapCenter(center)
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
              const nearest = nearestKaupunki(center.lat, center.lng)
              setWeatherKaupunki(prev => nearest !== prev ? nearest : prev)
            }, 3000)
          }}
        >
          {mapItems.map(item => {
            if (item.type === 'single') {
              const p = item.paikka
              return (
                <AdvancedMarker key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={valittu?.id === p.id ? 10 : 1}>
                  {/* 0×0 anchor — AdvancedMarker pins its bottom-center here, so neither pin
                      nor card can shift the anchor point when transitioning between them */}
                  <div style={{ position: 'relative', width: 0, height: 0 }}>
                    <AnimatePresence initial={false}>
                      {(zoomLevel < 16 || nearestCardId !== p.id) && valittu?.id !== p.id && (
                        <motion.div key="pin"
                          style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}
                          exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                          onClick={() => {
                            setAutoZoomTarget({ lat: p.latitude, lng: p.longitude })
                            setSearchOpen(false)
                          }}>
                          <SportPin laji={p.laji} animDelay={pinAnimDelay(p.id)} />
                        </motion.div>
                      )}
                      {zoomLevel >= 16 && nearestCardId === p.id && valittu?.id !== p.id && (
                        <motion.div key="card"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                          style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)', overflow: 'visible' }}>
                          <motion.div
                            layoutId={`vc-${p.id}`}
                            onClick={e => {
                              e.stopPropagation()
                              pendingValittuRef.current = p
                              setAutoZoomTarget({ lat: p.latitude, lng: p.longitude })
                              setSearchOpen(false)
                            }}>
                            <CalloutCard p={p} />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </AdvancedMarker>
              )
            }
            // cluster
            return (
              <AdvancedMarker
                key={'cluster-' + item.items.map(p => p.id).join('-')}
                position={{ lat: item.lat, lng: item.lng }}
                zIndex={expandedCluster === item.items ? 20 : 2}
              >
                <div style={{ position: 'relative' }}>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <div
                      style={{ position: 'relative', width: 34, height: 34, cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); setExpandedCluster(expandedCluster === item.items ? null : item.items); setSearchOpen(false) }}
                    >
                      {/* Pin body — solid blue circle */}
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#0284c7', boxShadow: '0 2px 8px rgba(2,132,199,0.35)' }} />
                      {/* Count label */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', color: 'white' }}>
                        {item.items.length > 9 ? '9+' : String(item.items.length)}
                      </div>
                      {/* Glint orbit */}
                      <div className="pin-orbit-wrapper">
                        <div className="pin-glint" />
                      </div>
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {expandedCluster === item.items && (
                      <motion.div
                        key="cluster-popup"
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className="glass rounded-2xl py-2"
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 8px)',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 200,
                          maxHeight: 240,
                          overflowY: 'auto',
                          zIndex: 10,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {item.items.map(venue => (
                          <button
                            key={venue.id}
                            onClick={() => { setValittu(venue); setExpandedCluster(null); setSearchOpen(false) }}
                            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[rgba(0,0,0,0.04)] [transition:background-color_150ms_ease]"
                          >
                            <span
                              className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                              style={{ backgroundColor: lajiKonfig[venue.laji]?.color ?? '#6b7280' }}
                            >
                              {lajiKonfig[venue.laji]?.label ?? venue.laji}
                            </span>
                            <span className="font-bold text-xs text-[#111111] truncate leading-tight">{venue.nimi}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
          <MapPanController coords={focusId ? null : coords} />
          {sheetPhase !== 'open' && <RecenterButton coords={coords} />}
          <MapAutoZoom
            target={autoZoomTarget}
            onComplete={() => {
              setAutoZoomTarget(null)
              if (pendingValittuRef.current) {
                setValittu(pendingValittuRef.current)
                pendingValittuRef.current = null
              }
            }}
          />
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

      {/* ── Top-left toolbar — search (always) + list toggle (only when search open) */}
      <div
        className="fixed"
        style={{
          top: 'max(12px, env(safe-area-inset-top))',
          left: 16,
          zIndex: 64,
        }}
      >
        <div className="glass rounded-full flex items-center overflow-hidden" style={{ height: 40 }}>
          {/* Search button — always visible */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => searchOpen ? setSearchOpen(false) : openSearch(true)}
            className="w-10 h-10 shrink-0 flex items-center justify-center [transition:color_150ms_ease] relative"
            style={{ color: isFilterActive || searchOpen ? '#111111' : 'rgba(17,17,17,0.7)' }}
            aria-label="Haku ja filtterit"
          >
            <Search className="w-4 h-4" />
            {isFilterActive && (
              <span
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#111111]"
                aria-hidden="true"
              />
            )}
          </motion.button>

          {/* LayoutList — slides in when search opens, slides out when search closes */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                key="list-toggle"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 41, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex items-center overflow-hidden shrink-0"
              >
                <div className="w-px h-4 bg-[rgba(0,0,0,0.1)] shrink-0" />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSearchFocused(f => !f)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center [transition:color_150ms_ease]"
                  style={{ color: !searchFocused ? '#111111' : 'rgba(17,17,17,0.7)' }}
                  aria-label="Näytä lista"
                >
                  <LayoutList className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
        <div
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
                  href="/profiili"
                  onClick={closeOverlays}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                >
                  <User className="w-3.5 h-3.5" />
                  Profiili
                </Link>
                <Link
                  href="/suosikit"
                  onClick={closeOverlays}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  TO DO
                </Link>
                {supabaseUser ? (
                  <button
                    onClick={() => {
                      // Optimistic clears before signOut — prevents a narrow window
                      // where supabaseUser is non-null but session is being torn down
                      setSupabaseUser(null)
                      setTodoIds(new Set())
                      closeOverlays()
                      createBrowserSupabase().auth.signOut().then(() => router.refresh())
                    }}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Kirjaudu ulos
                  </button>
                ) : (
                  <button
                    onClick={() => { setAuthModalOpen(true); closeOverlays() }}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                  >
                    <User className="w-3.5 h-3.5" />
                    Kirjaudu
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger button */}
          <button
            onClick={() => {
              if (searchOpen) {
                setSearchOpen(false)
                if (rightOpenTimerRef.current) clearTimeout(rightOpenTimerRef.current)
                rightOpenTimerRef.current = setTimeout(() => setRightOpen(true), 180)
              } else {
                setRightOpen(r => !r)
              }
            }}
            className="w-10 h-10 shrink-0 flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main bottom sheet ──────────────────────────────────────────── */}
      {/* Tab (HANDLE_H) stays visible at bottom when closed — no separate FAB */}
      {/*
        Intentional exception to CLAUDE.md "no layout animations" rule:
        `left`/`right` are animated here to achieve the pill→full-sheet transition.
        The sheet narrows to a centred pill when closed and expands to full width
        when open. Replacing this with scaleX/translateX would require restructuring
        the drag-constraint system and sheet content layout. Reflow jank is
        acceptable on this one transition given the architectural constraints.
      */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        initial={{ left: 0, right: 0, y: 800, borderRadius: '24px 24px 0px 0px' }}
        animate={{
          y:            sheetVisible ? sheetAnimY      : 800,
          left:         sheetVisible ? sheetAnimLeft   : 0,
          right:        sheetVisible ? sheetAnimRight  : 0,
          borderRadius: sheetVisible ? sheetAnimRadius : '24px 24px 0px 0px',
        }}
        transition={sheetTransition}
        onAnimationComplete={() => { if (sheetPhase === 'sliding') setSheetPhase('closed') }}
        onDragEnd={(_, info) => {
          if (info.velocity.y > 300 || info.offset.y > 80) setSheetPhase('sliding')
          else if (info.velocity.y < -300 || info.offset.y < -80) { setSheetVisible(true); setSheetPhase('open'); setSearchOpen(false) }
        }}
        className="glass"
        style={{ position: 'fixed', bottom: 0, height: contentH, zIndex: 60, overflow: 'hidden' }}
      >
        {/* Drag handle — also tap to open when closed */}
        <div
          className="flex justify-center pt-3 pb-2"
          style={{ position: 'relative', zIndex: 1, cursor: sheetPhase === 'open' ? 'grab' : 'pointer' }}
          onClick={() => { if (sheetPhase !== 'open') { setSheetVisible(true); setSheetPhase('open'); setSearchOpen(false) } }}
        >
          <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
        </div>

        {/* Logo watermark — redesigned AktiiviLogo with blue sweep auto-loop (UI-23) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.15,
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
            maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
          }}
        >
          <AktiiviLogo />
        </div>

        {/* Sheet content — fades out during slide-down so text doesn't squish during narrowing */}
        <motion.div
          animate={{ opacity: sheetPhase === 'open' ? 1 : 0 }}
          transition={{ duration: 0.18, ease: 'easeIn' }}
          className="flex flex-col gap-3 px-4 overflow-y-auto"
          style={{
            position: 'relative',
            zIndex: 1,
            height: 'calc(100% - 40px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          }}
        >
          {/* AI Widget */}
          <div className="glass rounded-2xl flex flex-col gap-1 px-4 py-4 shrink-0">
            {/* Row 1: weather info + day/night toggle */}
            <div className="flex items-center gap-2">
              {saa && (
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none select-none" aria-hidden>{getWeatherEmoji(saa.code)}</span>
                  <span className="text-sm font-bold text-[#111111] tabular-nums">
                    {saa.temp}°{' '}<span className="font-normal text-[rgba(17,17,17,0.45)]">{weatherKaupunki}</span>
                  </span>
                </div>
              )}
              <div className="ml-auto shrink-0">
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
            {/* Row 2: AI recommendation text */}
            {aiTeksti && (
              <span className="text-sm font-normal text-[#111111]">{aiTeksti}</span>
            )}
          </div>

          {/* Ad carousel */}
          <Karuselli isDark={isDark} />
        </motion.div>
      </motion.div>

      {/* ── Search overlay ──────────────────────────────────── */}
      {/* ── Search input bar — between toolbar pills, same row ──────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed"
            style={{
              top: 'max(12px, env(safe-area-inset-top))',
              left: 104,
              right: 64,
              height: 40,
              zIndex: 64,
            }}
          >
            <div className="glass rounded-full flex items-center gap-2 px-3 h-full">
              <Search className="w-3.5 h-3.5 text-[rgba(17,17,17,0.4)] shrink-0 pointer-events-none" />
              <input
                autoFocus={searchFocused}
                type="search"
                placeholder="Hae liikuntapaikkaa..."
                value={searchHaku}
                onChange={e => setSearchHaku(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.4)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search results — transparent container, cards float over map ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-results"
            ref={searchResultsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed overflow-y-auto"
            style={{
              top: 'calc(max(12px, env(safe-area-inset-top)) + 52px)',
              left: 0,
              right: 0,
              maxHeight: `calc(100dvh - max(12px, env(safe-area-inset-top)) - 52px - ${HANDLE_H + 8}px)`,
              zIndex: 61,
            }}
          >
            <div className="px-4 pb-4 mx-auto" style={{ maxWidth: 480 }}>
              {/* Compact filter pills */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {kaupungit.length > 2 && (
                  <select
                    value={searchKaupunki}
                    onChange={e => setSearchKaupunki(e.target.value)}
                    aria-label="Suodata kaupungin mukaan"
                    className="glass h-8 rounded-full px-3 text-xs font-bold text-[#111111] border-0 outline-none cursor-pointer"
                  >
                    {kaupungit.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                )}
                <select
                  value={searchLaji}
                  onChange={e => setSearchLaji(e.target.value)}
                  aria-label="Suodata lajin mukaan"
                  className="glass h-8 rounded-full px-3 text-xs font-bold text-[#111111] border-0 outline-none cursor-pointer"
                >
                  {LAJIT_FILTTERI.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <motion.button
                  onClick={() => setSearchKertakaynti(v => !v)}
                  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                  className={`h-8 px-3 rounded-full text-xs font-bold [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)] ${searchKertakaynti ? 'bg-[#111111] text-white' : 'glass text-[rgba(17,17,17,0.45)] hover:text-[#111111]'}`}
                  aria-label={searchKertakaynti ? 'Poista kertakäynti-suodatin' : 'Näytä vain kertakäynnin mahdollistavat paikat'}
                >
                  Kertakäynti OK
                </motion.button>
                <motion.button
                  onClick={() => setSearchAukinyt(v => !v)}
                  whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
                  className={`h-8 px-3 rounded-full text-xs font-bold [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
                    ${searchAukinyt ? 'bg-[#111111] text-white' : 'glass text-[rgba(17,17,17,0.6)] hover:text-[#111111]'}`}
                >
                  Auki nyt
                </motion.button>
                <span className="text-xs text-[rgba(17,17,17,0.4)] tabular-nums ml-auto">
                  {searchSuodatettu.length} paikkaa
                </span>
              </div>

              {/* Card list — only in browse mode (LayoutList), not when typing (Search) */}
              {!searchFocused && (searchSuodatettu.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {searchSuodatettu.map(p => (
                    <DiagonaalKortti
                      key={p.id}
                      paikka={p}
                      distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
                      onShowMap={(paikka) => {
                        setSearchOpen(false)
                        if (sheetPhase === 'open') setSheetPhase('sliding')
                        if (paikka.latitude != null && paikka.longitude != null) {
                          setAutoZoomTarget({ lat: paikka.latitude, lng: paikka.longitude })
                        }
                      }}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12">
                  <p className="glass rounded-2xl px-6 py-4 text-[rgba(17,17,17,0.5)] text-sm">Ei tuloksia</p>
                  <motion.button
                    onClick={() => {
                      setSearchHaku('')
                      setSearchLaji('Kaikki')
                      setSearchKertakaynti(false)
                      setSearchAukinyt(false)
                      setSearchKaupunki('Kaikki')
                    }}
                    whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                    className="mt-3 text-[#111111] text-sm font-medium underline underline-offset-2"
                  >
                    Tyhjennä haku
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        pendingPaikkaId={pendingFavoriteId}
        onSuccess={id => {
          if (id) toggleTodo(id)
          setAuthModalOpen(false)
        }}
      />

      {/* ── Venue sheet — grows from callout card via layoutId ─────────── */}
      {valittu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 65 }}
          onClick={() => setValittu(null)}
        />
      )}
      <AnimatePresence>
        {valittu && (
          <PaikkaSheet
            paikka={valittu}
            todo={todoIds.has(valittu.id)}
            distanceKm={distancesMap[valittu.id]}
            onClose={() => setValittu(null)}
            onToggleTodo={toggleTodo}
          />
        )}
      </AnimatePresence>

    </LayoutGroup>
  )
}
