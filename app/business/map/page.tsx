'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { motion, AnimatePresence } from 'framer-motion'
import { Locate } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Supercluster from 'supercluster'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import SportPin from '@/app/components/SportPin'
import PaikkaSheet from '@/app/components/PaikkaSheet'
import CalloutCard from '@/app/components/CalloutCard'
import MapAutoZoom from '@/app/components/MapAutoZoom'
import { haversineKm } from '@/lib/geo'
import type { Liikuntapaikka } from '@/lib/types'

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
const TAMPERE_CENTER = { lat: 61.4978, lng: 23.7610 }

type VenuePoint = { paikka: Liikuntapaikka & { latitude: number; longitude: number } }

function MapClusterZoom({ target, onComplete }: {
  target: { zoom: number; center: { lat: number; lng: number } } | null
  onComplete: () => void
}) {
  const map = useMap()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  useEffect(() => {
    if (!map || !target) return
    map.moveCamera({ center: target.center, zoom: target.zoom })
    const id = setTimeout(() => onCompleteRef.current(), 0)
    return () => clearTimeout(id)
  }, [map, target])
  return null
}

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
  const [mapCenter, setMapCenter] = useState(TAMPERE_CENTER)
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null)
  const [autoZoomTarget, setAutoZoomTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [clusterZoomTarget, setClusterZoomTarget] = useState<{ zoom: number; center: { lat: number; lng: number } } | null>(null)
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

  const sc = useMemo(() => {
    const instance = new Supercluster<VenuePoint>({ radius: 60, maxZoom: 16, minPoints: 2 })
    instance.load(
      venuesWithCoords.map(v => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [v.longitude, v.latitude] },
        properties: { paikka: v },
      }))
    )
    return instance
  }, [venuesWithCoords])

  const mapItems = useMemo(() => {
    if (!bounds) return []
    const items = sc.getClusters(bounds, Math.round(zoomLevel))
    return items.sort((a, b) => b.geometry.coordinates[1] - a.geometry.coordinates[1])
  }, [sc, bounds, zoomLevel])

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
        clickableIcons={false}
        keyboardShortcuts={false}
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
        onCameraChanged={ev => {
          const newZoom = ev.detail.zoom
          const b = ev.detail.bounds
          if (Math.round(newZoom) !== Math.round(zoomRef.current)) setZoomLevel(Math.round(newZoom))
          zoomRef.current = newZoom
          if (b) setBounds([b.west, b.south, b.east, b.north])
          if (newZoom >= 16) setMapCenter(ev.detail.center)
        }}
      >
        {mapItems.map((item, index) => {
          const [lng, lat] = item.geometry.coordinates

          if (!('cluster' in item.properties && item.properties.cluster)) {
            const v = (item.properties as VenuePoint).paikka
            return (
              <AdvancedMarker key={v.id} position={{ lat: v.latitude, lng: v.longitude }} zIndex={index}>
                <div style={{ position: 'relative', width: 0, height: 0 }}>
                  <AnimatePresence initial={false}>
                    {(zoomLevel < 16 || nearestCardId !== v.id) && selected?.id !== v.id && (
                      <motion.div
                        key="pin"
                        style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setAutoZoomTarget({ lat: v.latitude, lng: v.longitude })}
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
            )
          }

          // cluster marker
          const clusterId = item.id as number
          const count = (item.properties as Supercluster.ClusterProperties).point_count
          return (
            <AdvancedMarker key={`cluster-${clusterId}`} position={{ lat, lng }} zIndex={index}>
              <div style={{ position: 'relative', width: 0, height: 0 }}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)', width: 36, height: 49, cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    const expansionZoom = sc.getClusterExpansionZoom(clusterId)
                    setClusterZoomTarget({ zoom: expansionZoom, center: { lat, lng } })
                  }}
                >
                  <svg viewBox="0 0 28 38" width="36" height="49" style={{ display: 'block' }}>
                    <path d="M14 0C6.268 0 0 6.268 0 14c0 5.25 2.875 9.83 7.125 12.3L14 38l6.875-11.7C25.125 23.83 28 19.25 28 14 28 6.268 21.732 0 14 0Z" fill="#1e40af" />
                    <circle cx="14" cy="14" r="10" fill="white" />
                    <text x="14" y="18" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0284c7" fontFamily="sans-serif">
                      {count > 99 ? '99+' : String(count)}
                    </text>
                  </svg>
                </motion.div>
              </div>
            </AdvancedMarker>
          )
        })}

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
        <MapClusterZoom
          target={clusterZoomTarget}
          onComplete={() => setClusterZoomTarget(null)}
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
  const router = useRouter()
  const [allVenues, setAllVenues] = useState<Liikuntapaikka[] | null>(null)
  const [myPaikkaIds, setMyPaikkaIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      const bizSb = createBusinessBrowserClient()
      const { data: { user } } = await bizSb.auth.getUser()
      if (!user) {
        router.replace('/business/kirjaudu')
        return
      }

      const sb = createBrowserSupabase()
      const { data } = await sb
        .from('liikuntapaikat')
        .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, hinta_kuvaus, puhelin, varauslinkki, kuvaus, aukioloajat, image_url, logo_url, photo_urls, business_managed, is_claimed')
        .eq('published', true)
        .order('nimi')
      setAllVenues((data as Liikuntapaikka[]) ?? [])

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

  return <BusinessMapInner allVenues={allVenues} myPaikkaIds={myPaikkaIds} />
}
