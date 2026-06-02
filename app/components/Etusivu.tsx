'use client'

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Moon, Sun, Locate, Search, Bookmark, X, MoreHorizontal, LogOut, User, LayoutList, Activity } from 'lucide-react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { LAJIT_FILTTERI, lajiKonfig, SPORT_ICONS } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import Karuselli from './Karuselli'
import type { Liikuntapaikka } from '@/lib/types'
import { isNightHour } from '@/lib/mapStyles'
import { TAMPERE } from '@/lib/constants'
import { nearestKaupunki, haversineKm, formatDistance } from '@/lib/geo'
import { useGPS } from '@/hooks/useGPS'
import SportPin from './SportPin'
import Supercluster from 'supercluster'
import AktiiviLogo from './AktiiviLogo'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'
import { deriveKaupungit } from '@/lib/cityFilter'
import DiagonaalKortti, { diagonaalKorttiVariants } from './DiagonaalKortti'
import PaikkaSheet from './PaikkaSheet'
import StarPicker from './StarPicker'

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

const CHAR_VARIANTS = {
  initial: { x: 16, opacity: 0 },
  enter:   { x: 0,  opacity: 1, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
  exit:    { x: -16, opacity: 0, transition: { duration: 0.1,  ease: 'easeIn' as const } },
}

const TEXT_CONTAINER_VARIANTS = {
  enter: { transition: { staggerChildren: 0.022 } },
  exit:  { transition: { staggerChildren: 0.014 } },
}

function CalloutCard({ p }: { p: Liikuntapaikka & { latitude: number; longitude: number } }) {
  const ref = useRef<HTMLDivElement>(null)
  const [clipPath, setClipPath] = useState('')
  const [showName, setShowName] = useState(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      const h = el.offsetHeight - 11
      setClipPath(
        `M 10,0 L 150,0 Q 160,0 160,10 L 160,${h - 10} Q 160,${h} 150,${h} L 90,${h} L 80,${h + 11} L 70,${h} L 10,${h} Q 0,${h} 0,${h - 10} L 0,10 Q 0,0 10,0 Z`
      )
    }
    const obs = new ResizeObserver(compute)
    obs.observe(el)
    compute()
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setShowName(v => !v), 2000)
    return () => clearInterval(id)
  }, [])

  const sportColor = lajiKonfig[p.laji]?.color ?? '#6b7280'
  const Icon = SPORT_ICONS[p.laji] ?? Activity

  const chars = (text: string) =>
    text.split(' ').flatMap((word, wi) => [
      ...(wi > 0 ? [
        <motion.span key={`sp-${wi}`} className="inline-block" variants={CHAR_VARIANTS}>{' '}</motion.span>,
      ] : []),
      <span key={`w-${wi}`} className="whitespace-nowrap">
        {word.split('').map((char, ci) => (
          <motion.span key={ci} className="inline-block" variants={CHAR_VARIANTS}>{char}</motion.span>
        ))}
      </span>,
    ])

  return (
    <div
      ref={ref}
      className="glass cursor-pointer"
      style={{
        width: 160,
        height: 171,
        paddingTop: 12,
        paddingLeft: 12,
        paddingRight: 12,
        paddingBottom: 23,
        clipPath: clipPath ? `path('${clipPath}')` : undefined,
        borderRadius: clipPath ? 0 : 10,
      }}
    >
      <div className="flex flex-col gap-2">
        <div
          className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: sportColor }}
        >
          <span className="text-base font-bold text-white">{p.nimi[0]?.toUpperCase() ?? '?'}</span>
        </div>
        <div className="w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {showName ? (
              <motion.div
                key="name"
                variants={TEXT_CONTAINER_VARIANTS}
                initial="initial"
                animate="enter"
                exit="exit"
                className="font-bold text-lg text-[#111111] leading-snug"
              >
                {chars(p.nimi)}
              </motion.div>
            ) : (
              <motion.div
                key="sport"
                variants={TEXT_CONTAINER_VARIANTS}
                initial="initial"
                animate="enter"
                exit="exit"
                className="flex flex-wrap items-center gap-1"
              >
                <motion.span variants={CHAR_VARIANTS} className="flex items-center">
                  <Icon className="w-4 h-4" style={{ color: sportColor }} />
                </motion.span>
                <span className="flex items-center text-lg font-bold text-[#111111]">
                  {chars(lajiKonfig[p.laji]?.label ?? p.laji)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function getTimeBasedFallback(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 11)  return 'Huomenta · Löydä paras liikuntapaikka Tampereelta'
  if (h >= 11 && h < 17) return 'Hei · Löydä paras liikuntapaikka Tampereelta'
  return 'Iltaa · Löydä paras liikuntapaikka Tampereelta'
}

interface FilterCarouselPillProps {
  label: string
  allItems: string[]
  selected: string[]
  onToggle: (item: string) => void
  singleSelect?: boolean
}

function FilterCarouselPill({ label, allItems, selected, onToggle, singleSelect }: FilterCarouselPillProps) {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIdx(0)
  }, [selected.join(',')])

  useEffect(() => {
    if (selected.length === 1) return
    const items = selected.length > 1 ? selected : allItems
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 2000)
    return () => clearInterval(id)
  }, [selected.length, allItems.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  const displayText = selected.length === 0
    ? allItems[idx % allItems.length]
    : selected.length === 1
      ? selected[0]
      : selected[idx % selected.length]

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 6, left: rect.left })
    }
    setOpen(v => !v)
  }

  const displayKey = displayText.toLowerCase()
  const DisplayIcon = SPORT_ICONS[displayKey]
  const displayColor = lajiKonfig[displayKey]?.color

  return (
    <div>
      <motion.button
        ref={buttonRef}
        whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
        onClick={handleToggle}
        aria-label={label}
        className="h-8 min-w-[7rem] px-3 rounded-full text-xs font-bold glass text-[rgba(17,17,17,0.45)] flex items-center justify-center gap-1.5 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={selected.length === 1 ? 'static' : idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none flex items-center gap-1.5 whitespace-nowrap"
          >
            {DisplayIcon && <DisplayIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: displayColor ?? 'currentColor' }} />}
            {displayText}
          </motion.span>
        </AnimatePresence>
        {selected.length > 1 && (
          <span className="text-[10px] font-bold bg-[rgba(17,17,17,0.12)] rounded-full px-1 flex-shrink-0">{selected.length}</span>
        )}
      </motion.button>
      <AnimatePresence>
        {open && dropdownPos && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
            className="fixed z-[65] glass rounded-2xl overflow-hidden min-w-[9rem] divide-y divide-[rgba(0,0,0,0.06)]"
          >
            {allItems.map(item => {
              const isSelected = selected.some(s => s.toLowerCase() === item.toLowerCase())
              return (
                <button
                  key={item}
                  onClick={() => {
                    onToggle(item)
                    if (singleSelect) setOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2.5 [transition:color_100ms] ${isSelected ? 'text-[#111111]' : 'text-[rgba(17,17,17,0.45)]'}`}
                >
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${isSelected ? 'bg-[#111111]' : 'border border-[rgba(0,0,0,0.15)]'}`} />
                  {item}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Etusivu({ paikat }: { paikat: Liikuntapaikka[] }) {
  const [saa, setSaa]               = useState<SaaTiedot | null>(null)
  const [aiTeksti, setAiTeksti]     = useState<string | null>(null)
  const [valittu, setValittu]       = useState<Liikuntapaikka | null>(null)
  const [expandedCluster, setExpandedCluster] = useState<{ id: number; items: (Liikuntapaikka & { latitude: number; longitude: number })[] } | null>(null)
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null)
  // 'open' → 'sliding' (y to contentH) → onAnimationComplete → 'closed' (pill)
  const [sheetPhase, setSheetPhase] = useState<'open' | 'sliding' | 'closed'>('closed')
  const [sheetReady, setSheetReady] = useState(false)
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
  const [searchLaji, setSearchLaji]           = useState<string[]>([])
  const [searchKaupunki, setSearchKaupunki]   = useState('Kaikki')
  const [todoOpen, setTodoOpen]               = useState(false)
  const [pendingReviewPaikkaId, setPendingReviewPaikkaId] = useState<number | null>(null)
  const [reviewPaikkaId, setReviewPaikkaId]   = useState<number | null>(null)
  const [inlineRating, setInlineRating]       = useState(0)
  const [inlineTeksti, setInlineTeksti]       = useState('')
  const [inlineSubmitting, setInlineSubmitting] = useState(false)
  const [inlineSubmitError, setInlineSubmitError] = useState<string | null>(null)
  const [inlineSubmitted, setInlineSubmitted] = useState(false)
  const [searchFocused, setSearchFocused]     = useState(false)
  const inFlight = useRef<Set<number>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rightOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reviewResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    setTodoOpen(false)
    setPendingReviewPaikkaId(null)
    setReviewPaikkaId(null)
  }

  function openTodoOverlay() {
    setRightOpen(false)
    setSearchOpen(false)
    setValittu(null)
    if (sheetPhase === 'open') {
      setSheetPhase('sliding')
      setTimeout(() => setTodoOpen(true), 260)
    } else {
      setTodoOpen(true)
    }
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
        _v: 2,
        scrollTop,
        searchHaku,
        searchLaji,
        searchKaupunki,
        searchOpen: true,
      }
      sessionStorage.setItem('etusivu-scroll-state', JSON.stringify(state))
    } catch {}
  }

  async function toggleTodo(id: number): Promise<boolean> {
    if (inFlight.current.has(id)) return false   // debounce concurrent taps
    inFlight.current.add(id)
    const user = supabaseUser

    if (!user) {
      inFlight.current.delete(id)
      setPendingFavoriteId(id)
      setAuthModalOpen(true)
      return false
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
    return true
  }

  function handleOverlayDelete(id: number) {
    if (supabaseUser !== null) {
      setPendingReviewPaikkaId(id)
    } else {
      toggleTodo(id)
    }
  }

  function resetInlineReview() {
    setReviewPaikkaId(null)
    setInlineRating(0)
    setInlineTeksti('')
    setInlineSubmitError(null)
    setInlineSubmitted(false)
  }

  async function handleInlineReviewSubmit() {
    if (!supabaseUser || inlineRating === 0 || !reviewPaikkaId) return
    setInlineSubmitting(true)
    setInlineSubmitError(null)
    const supabase = createBrowserSupabase()
    const payload = {
      user_id: supabaseUser.id,
      paikka_id: reviewPaikkaId,
      rating: inlineRating,
      teksti: inlineTeksti.trim(),
      is_anonymous: false,
      reviewer_name: supabaseUser.email?.split('@')[0] ?? null,
      visit_date: null,
      crowd_rating: null,
    }
    const { error } = await supabase.from('reviews').upsert(payload, { onConflict: 'user_id,paikka_id' })
    if (error) {
      setInlineSubmitting(false)
      setInlineSubmitError('Tallennus epäonnistui. Yritä uudelleen.')
    } else {
      setInlineSubmitting(false)
      setInlineSubmitted(true)
      const idToRemove = reviewPaikkaId
      reviewResetTimerRef.current = setTimeout(() => {
        setReviewPaikkaId(null)
        setInlineRating(0)
        setInlineTeksti('')
        setInlineSubmitted(false)
        if (idToRemove) toggleTodo(idToRemove)
      }, 1500)
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
      // D-11: if version mismatch, discard entire state — prevents dead filters from old sessions
      if (s._v !== 2) { sessionStorage.removeItem('etusivu-scroll-state'); return }
      if (typeof s.searchHaku === 'string') setSearchHaku(s.searchHaku)
      if (Array.isArray(s.searchLaji)) setSearchLaji(s.searchLaji)
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

  // Clear review reset timer on unmount to prevent stale state update after navigation
  useEffect(() => {
    return () => {
      if (reviewResetTimerRef.current) clearTimeout(reviewResetTimerRef.current)
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
        (searchLaji.length === 0 || searchLaji.some(s => s.toLowerCase() === p.laji.toLowerCase())) &&
        p.latitude != null && p.longitude != null &&
        lajitKartalla.has(p.laji.toLowerCase())
    ),
    [paikat, searchLaji, lajitKartalla]
  )

  type VenuePoint = { paikka: Liikuntapaikka & { latitude: number; longitude: number } }

  const sc = useMemo(() => {
    const instance = new Supercluster<VenuePoint>({ radius: 60, maxZoom: 16, minPoints: 2 })
    instance.load(
      paikatKartalla.map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        properties: { paikka: p },
      }))
    )
    return instance
  }, [paikatKartalla])

  // Close popup when filter/data changes (sc changes → cluster IDs invalidated)
  useEffect(() => { setExpandedCluster(null) }, [sc])

  const mapItems = useMemo(
    () => (bounds ? sc.getClusters(bounds, Math.round(zoomLevel)) : []),
    [sc, bounds, zoomLevel]
  )

  const anyOverlayOpen = rightOpen

  const todoContainerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

  const todoPaikat = paikat.filter(p => todoIds.has(p.id))

  const kaupungit = useMemo(() => deriveKaupungit(paikat), [paikat])
  const kaupunkiItems = kaupungit.filter(k => k !== 'Kaikki')

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
      const matchesLaji     = searchLaji.length === 0 || searchLaji.some(s => s.toLowerCase() === p.laji.toLowerCase())
      const q               = searchHaku.toLowerCase()
      const matchesHaku     = !searchHaku || p.nimi.toLowerCase().includes(q) || p.kuvaus?.toLowerCase().includes(q) || p.osoite?.toLowerCase().includes(q)
      const matchesKaupunki = searchKaupunki === 'Kaikki' || p.kaupunki === searchKaupunki
      return matchesLaji && matchesHaku && matchesKaupunki
    }),
    [paikat, searchLaji, searchHaku, searchKaupunki]
  )

  const isFilterActive = searchLaji.length > 0 || searchKaupunki !== 'Kaikki'

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
            const center = ev.detail.center
            const b = ev.detail.bounds
            // Update integer zoom (supercluster uses Math.round(zoom), nearestCard uses >= 16)
            if (Math.round(newZoom) !== Math.round(zoomRef.current)) setZoomLevel(Math.round(newZoom))
            zoomRef.current = newZoom
            if (b) setBounds([b.west, b.south, b.east, b.north])
            // mapCenter is only used at zoom ≥ 16 (nearestVenueInView); skip state update below that
            if (newZoom >= 16) setMapCenter(center)
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
              const nearest = nearestKaupunki(center.lat, center.lng)
              setWeatherKaupunki(prev => nearest !== prev ? nearest : prev)
            }, 3000)
          }}
        >
          {mapItems.map(item => {
            const [lng, lat] = item.geometry.coordinates

            if (!('cluster' in item.properties && item.properties.cluster)) {
              const p = (item.properties as VenuePoint).paikka
              return (
                <AdvancedMarker key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={valittu?.id === p.id ? 10 : nearestCardId === p.id ? 5 : 1}>
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
            const clusterId = item.id as number
            const count = (item.properties as Supercluster.ClusterProperties).point_count
            return (
              <AdvancedMarker
                key={`cluster-${clusterId}`}
                position={{ lat, lng }}
                zIndex={expandedCluster?.id === clusterId ? 20 : 2}
              >
                <div style={{ position: 'relative' }}>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <div
                      style={{ position: 'relative', width: 28, height: 38, cursor: 'pointer' }}
                      onClick={e => {
                        e.stopPropagation()
                        if (expandedCluster?.id === clusterId) {
                          setExpandedCluster(null)
                        } else {
                          const leaves = sc.getLeaves(clusterId, Infinity).map(f => f.properties.paikka)
                          setExpandedCluster({ id: clusterId, items: leaves })
                        }
                        setSearchOpen(false)
                      }}
                    >
                      <svg viewBox="0 0 28 38" width="28" height="38" style={{ display: 'block' }}>
                        <path d="M14 0C6.268 0 0 6.268 0 14c0 5.25 2.875 9.83 7.125 12.3L14 38l6.875-11.7C25.125 23.83 28 19.25 28 14 28 6.268 21.732 0 14 0Z" fill="#1e40af" />
                        <circle cx="14" cy="14" r="10" fill="white" />
                        <text x="14" y="18" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0284c7" fontFamily="sans-serif">
                          {count > 99 ? '99+' : String(count)}
                        </text>
                      </svg>
                      <div className="pin-arc" />
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {expandedCluster?.id === clusterId && (
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
                        {expandedCluster.items.map(venue => (
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

      {/* ── TodoOverlay — partial-screen, right side, scale from top-right ── */}
      <AnimatePresence>
        {todoOpen && (
          <motion.div
            key="todo-overlay"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed glass rounded-2xl overflow-y-auto p-4"
            style={{ transformOrigin: 'top right', top: 'max(60px, env(safe-area-inset-top) + 48px)', right: 12, bottom: 12, width: 'calc(100vw - 56px)', maxWidth: 420, zIndex: 62 }}
          >
            <p className="text-sm font-bold text-[#111111] uppercase tracking-widest mb-4">TO DO</p>
            {todoPaikat.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Bookmark className="w-8 h-8 text-[rgba(17,17,17,0.2)]" />
                <p className="text-sm font-bold text-[rgba(17,17,17,0.45)]">Lista on tyhjä</p>
                <p className="text-sm text-[rgba(17,17,17,0.35)] text-center leading-normal">Lisää paikkoja kirjanmerkkipainikkeella</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {todoPaikat.map(p => {
                  const LAYOUT_T = { layout: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } }
                  if (pendingReviewPaikkaId === p.id) {
                    return (
                      <motion.div key={p.id} layout transition={LAYOUT_T} className="glass rounded-2xl p-4 flex items-center justify-between">
                        <p className="text-sm font-bold text-[#111111]">Kävikö paikassa?</p>
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setReviewPaikkaId(p.id); setPendingReviewPaikkaId(null) }} className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-4 py-2 rounded-full [transition:background-color_150ms_ease]">Kyllä</motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={async () => { await toggleTodo(p.id); setPendingReviewPaikkaId(null) }} className="border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-4 py-2 rounded-full">Ei</motion.button>
                        </div>
                      </motion.div>
                    )
                  }
                  if (reviewPaikkaId === p.id) {
                    return (
                      <motion.div key={p.id} layout transition={LAYOUT_T} className="glass rounded-2xl flex flex-col gap-3 p-4">
                        {inlineSubmitted ? (
                          <p className="text-sm font-bold text-[#111111]">Arvostelu tallennettu</p>
                        ) : (
                          <>
                            <div className="flex flex-col gap-1">
                              <p className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">TÄHTIARVOSANA</p>
                              <StarPicker value={inlineRating} onChange={setInlineRating} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">KOMMENTTI</p>
                              <textarea className="w-full text-sm text-[#111111] bg-transparent border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-[rgba(0,0,0,0.25)]" rows={3} placeholder="Vapaaehtoinen kommentti" value={inlineTeksti} onChange={e => setInlineTeksti(e.target.value)} />
                            </div>
                            {inlineSubmitError && <p className="text-sm text-red-600">{inlineSubmitError}</p>}
                            <div className="flex items-center gap-3">
                              <button disabled={inlineRating === 0 || inlineSubmitting} onClick={handleInlineReviewSubmit} className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-4 py-2 rounded-full [transition:background-color_150ms_ease] disabled:opacity-40">{inlineSubmitting ? 'Tallennetaan…' : 'Jätä arvostelu'}</button>
                              <button onClick={() => { toggleTodo(p.id); resetInlineReview() }} className="text-sm text-[rgba(17,17,17,0.45)] underline">Ohita</button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )
                  }
                  return (
                    <motion.div key={p.id} layout transition={LAYOUT_T}>
                      <DiagonaalKortti paikka={p} isSaved={true} onShowMap={pk => { if (pk.latitude != null && pk.longitude != null) setAutoZoomTarget({ lat: pk.latitude, lng: pk.longitude }) }} onToggleTodo={handleOverlayDelete} />
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                <button
                  onClick={openTodoOverlay}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-full glass-btn text-sm font-bold text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  TO DO
                </button>
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

      {/* ── TodoButton — fixed below nav-pill, right side ─────────────── */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (todoOpen) { resetInlineReview(); setTodoOpen(false) }
          else openTodoOverlay()
        }}
        className={todoOpen
          ? 'w-10 h-10 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_ease]'
          : 'w-10 h-10 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]'
        }
        style={{ position: 'fixed', right: 16, top: 'calc(max(12px, env(safe-area-inset-top)) + 48px)', zIndex: 66 }}
        aria-label={todoOpen ? 'Sulje TO DO -lista' : 'Avaa TO DO -lista'}
      >
        <AnimatePresence mode="wait">
          {todoOpen
            ? <motion.span key="x" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}><X className="w-4 h-4" /></motion.span>
            : <motion.span key="bm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}><Bookmark className="w-4 h-4" /></motion.span>
          }
        </AnimatePresence>
      </motion.button>

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
        onAnimationComplete={() => {
          if (sheetPhase === 'sliding') setSheetPhase('closed')
          if (sheetPhase === 'open') setSheetReady(true)
        }}
        onAnimationStart={() => { if (sheetPhase !== 'open') setSheetReady(false) }}
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

          {/* AktiiviLogo + side lines — lines mount only when sheet opens so initial always fires */}
          <div
            aria-hidden="true"
            className="mt-auto flex items-center px-3 pb-2"
            style={{ pointerEvents: 'none', gap: 10 }}
          >
            {/* Left line wrapper — anchored right, line grows toward left */}
            <div className="flex-1" style={{ height: 2, position: 'relative', overflow: 'hidden' }}>
              {sheetReady && (
                <motion.div
                  className="absolute top-0 bottom-0 right-0 bg-[rgba(17,17,17,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
                />
              )}
            </div>
            <div style={{ width: '26%' }}>
              <AktiiviLogo />
            </div>
            {/* Right line wrapper — anchored left, line grows toward right */}
            <div className="flex-1" style={{ height: 2, position: 'relative', overflow: 'hidden' }}>
              {sheetReady && (
                <motion.div
                  className="absolute top-0 bottom-0 left-0 bg-[rgba(17,17,17,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
                />
              )}
            </div>
          </div>
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

      {/* ── Filter pills — centered below search bar ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="filter-pills"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed flex justify-center gap-2 py-2"
            style={{
              top: 'calc(max(12px, env(safe-area-inset-top)) + 52px)',
              left: 0,
              right: 0,
              zIndex: 62,
            }}
          >
            {kaupungit.length > 2 && (
              <FilterCarouselPill
                label="Suodata kaupungin mukaan"
                allItems={kaupunkiItems}
                selected={searchKaupunki === 'Kaikki' ? [] : [searchKaupunki]}
                singleSelect={true}
                onToggle={(item) => setSearchKaupunki(item === searchKaupunki ? 'Kaikki' : item)}
              />
            )}
            <FilterCarouselPill
              label="Suodata lajin mukaan"
              allItems={LAJIT_FILTTERI.filter(l => l !== 'Kaikki')}
              selected={searchLaji}
              singleSelect={false}
              onToggle={(item) => setSearchLaji(prev => prev.includes(item) ? prev.filter(l => l !== item) : [...prev, item])}
            />
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
              top: 'calc(max(12px, env(safe-area-inset-top)) + 100px)',
              left: 0,
              right: 0,
              maxHeight: `calc(100dvh - max(12px, env(safe-area-inset-top)) - 100px - ${HANDLE_H + 8}px)`,
              zIndex: 61,
            }}
          >
            <div className="px-4 pb-4 mx-auto" style={{ maxWidth: 480 }}>

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
                      setSearchLaji([])
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
