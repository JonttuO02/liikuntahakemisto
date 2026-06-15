'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { motion, AnimatePresence } from 'framer-motion'
import { Locate } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import SportPin from '@/app/components/SportPin'
import PaikkaSheet from '@/app/components/PaikkaSheet'
import MapProvider from '@/app/components/MapProvider'
import CalloutCard from '@/app/components/CalloutCard'
import MapAutoZoom from '@/app/components/MapAutoZoom'
import { haversineKm } from '@/lib/geo'
import type { Liikuntapaikka } from '@/lib/types'

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
const TAMPERE_CENTER = { lat: 61.4978, lng: 23.7610 }

function RecenterButton({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap()
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => { if (map && coords) map.panTo(coords) }}
      className="absolute bottom-6 right-4 z-10 w-10 h-10 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.6)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
      aria-label="Keskitä sijaintiin"
    >
      <Locate className="w-4 h-4" />
    </motion.button>
  )
}

function BusinessMapInner({ allVenues, myPaikkaIds }: { allVenues: Liikuntapaikka[]; myPaikkaIds: Set<number> }) {
  const t = useTranslations('Business')
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [selected, setSelected] = useState<Liikuntapaikka | null>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(12)
  const zoomRef = useRef(12)
  const [mapCenter, setMapCenter] = useState({ lat: 61.4978, lng: 23.7610 })
  const [autoZoomTarget, setAutoZoomTarget] = useState<{ lat: number; lng: number } | null>(null)
  const pendingSelectedRef = useRef<Liikuntapaikka | null>(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  const venues = filter === 'mine'
    ? allVenues.filter(v => myPaikkaIds.has(v.id))
    : allVenues

  const venuesWithCoords = useMemo(
    () => venues.filter((v): v is Liikuntapaikka & { latitude: number; longitude: number } =>
      v.latitude != null && v.longitude != null
    ),
    [venues]
  )

  const nearestCardId = useMemo<number | null>(() => {
    if (zoomLevel < 16) return null
    let minDist = Infinity
    let nearestId: number | null = null
    for (const v of venuesWithCoords) {
      const d = haversineKm(mapCenter.lat, mapCenter.lng, v.latitude, v.longitude)
      if (d < minDist) { minDist = d; nearestId = v.id }
    }
    return minDist <= 0.5 ? nearestId : null
  }, [zoomLevel, mapCenter, venuesWithCoords])

  return (
    <div className="relative w-full h-screen">
      <Map
        mapId={MAP_ID}
        defaultCenter={TAMPERE_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
        onCameraChanged={ev => {
          const newZoom = ev.detail.zoom
          if (Math.round(newZoom) !== Math.round(zoomRef.current)) setZoomLevel(Math.round(newZoom))
          zoomRef.current = newZoom
          if (newZoom >= 16) setMapCenter(ev.detail.center)
        }}
      >
        {venuesWithCoords.map(v => (
          <AdvancedMarker
            key={v.id}
            position={{ lat: v.latitude, lng: v.longitude }}
          >
            <div style={{ position: 'relative', width: 0, height: 0 }}>
              <AnimatePresence initial={false}>
                {(zoomLevel < 16 || nearestCardId !== v.id) && selected?.id !== v.id && (
                  <motion.div
                    key="pin"
                    style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      setAutoZoomTarget({ lat: v.latitude, lng: v.longitude })
                    }}
                  >
                    <SportPin laji={v.laji} />
                  </motion.div>
                )}
                {zoomLevel >= 16 && nearestCardId === v.id && selected?.id !== v.id && (
                  <motion.div
                    key="card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)', overflow: 'visible' }}
                    onClick={e => {
                      e.stopPropagation()
                      if (zoomRef.current >= 16) {
                        setSelected(v)
                      } else {
                        pendingSelectedRef.current = v
                        setAutoZoomTarget({ lat: v.latitude, lng: v.longitude })
                      }
                    }}
                  >
                    <CalloutCard p={v} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AdvancedMarker>
        ))}
        <MapAutoZoom
          target={autoZoomTarget}
          onComplete={() => {
            setAutoZoomTarget(null)
            if (pendingSelectedRef.current) {
              setSelected(pendingSelectedRef.current)
              pendingSelectedRef.current = null
            }
          }}
        />
      </Map>

      {/* Kaikki / Omat toggle pill — top center */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 glass rounded-full flex items-center p-1 gap-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 h-8 rounded-full text-sm font-bold [transition:background-color_150ms_ease,color_150ms_ease] ${
            filter === 'all'
              ? 'bg-[#111111] text-white'
              : 'text-[rgba(17,17,17,0.6)] hover:text-[#111111]'
          }`}
        >
          {t('mapToggleAll')}
        </button>
        <button
          type="button"
          onClick={() => setFilter('mine')}
          className={`px-4 h-8 rounded-full text-sm font-bold [transition:background-color_150ms_ease,color_150ms_ease] ${
            filter === 'mine'
              ? 'bg-[#111111] text-white'
              : 'text-[rgba(17,17,17,0.6)] hover:text-[#111111]'
          }`}
        >
          {t('mapToggleMine')}
        </button>
      </div>

      <RecenterButton coords={userCoords} />

      {selected && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <PaikkaSheet
            paikka={selected}
            todo={false}
            onToggleTodo={() => {}}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  )
}

export default function BusinessMapPage() {
  const t = useTranslations('Business')
  const router = useRouter()
  const [allVenues, setAllVenues] = useState<Liikuntapaikka[] | null>(null)
  const [myPaikkaIds, setMyPaikkaIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      // Auth gate — redirect unauthenticated visitors to business login
      const bizSb = createBusinessBrowserClient()
      const { data: { user } } = await bizSb.auth.getUser()
      if (!user) {
        router.replace('/business/kirjaudu')
        return
      }

      // Fetch all published venues (public, anon key)
      const sb = createBrowserSupabase()
      const { data } = await sb
        .from('liikuntapaikat')
        .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls, business_managed, is_claimed')
        .eq('published', true)
        .order('nimi')
      setAllVenues((data as Liikuntapaikka[]) ?? [])

      // Fetch business's own venue IDs
      const { data: links } = await bizSb
        .from('business_paikka_links')
        .select('paikka_id')
        .eq('business_account_id', user.id)
      setMyPaikkaIds(new Set((links ?? []).map((l: { paikka_id: number }) => l.paikka_id)))
    }
    load()
  }, [router])

  if (allVenues === null) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </main>
    )
  }

  return (
    <MapProvider>
      <BusinessMapInner allVenues={allVenues} myPaikkaIds={myPaikkaIds} />
    </MapProvider>
  )
}
