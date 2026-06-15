'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { motion } from 'framer-motion'
import { Locate } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import SportPin from '@/app/components/SportPin'
import PaikkaSheet from '@/app/components/PaikkaSheet'
import MapProvider from '@/app/components/MapProvider'
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

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  const venues = filter === 'mine'
    ? allVenues.filter(v => myPaikkaIds.has(v.id))
    : allVenues

  return (
    <div className="relative w-full h-screen">
      <Map
        mapId={MAP_ID}
        defaultCenter={TAMPERE_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: '100%', height: '100%' }}
      >
        {venues.map(v => (
          v.latitude && v.longitude ? (
            <AdvancedMarker
              key={v.id}
              position={{ lat: v.latitude, lng: v.longitude }}
              onClick={() => setSelected(v)}
            >
              <div style={{ transform: selected?.id === v.id ? 'scale(1.25)' : 'scale(1)', transition: 'transform 150ms ease' }}>
                <SportPin laji={v.laji} />
              </div>
            </AdvancedMarker>
          ) : null
        ))}
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
