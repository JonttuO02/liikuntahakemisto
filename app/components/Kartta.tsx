'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { Activity, Building2, Dumbbell, Leaf, MapPin, Moon, Sun, Target, Waves, X, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import type { Liikuntapaikka } from '@/lib/types'
import { DAY_MAP_STYLES, NIGHT_MAP_STYLES, isNightHour } from '@/lib/mapStyles'
import { TAMPERE } from '@/lib/constants'
import { useGPS } from '@/hooks/useGPS'
import { haversineKm, formatDistance } from '@/lib/geo'
import { pinUrl } from '@/lib/sportPins'

const SPORT_ICONS: Record<string, LucideIcon> = {
  padel: Zap, kuntosali: Dumbbell, jooga: Leaf,
  uinti: Waves, tennis: Target, liikuntahalli: Building2, liikunta: Activity,
}


function MapStyleController({ isDark }: { isDark: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    map.setOptions({ styles: isDark ? NIGHT_MAP_STYLES : DAY_MAP_STYLES })
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

export default function Kartta({ paikat }: { paikat: Liikuntapaikka[] }) {
  const [valittu, setValittu] = useState<Liikuntapaikka | null>(null)
  const [isDark, setIsDark]   = useState(isNightHour)
  const { status, coords, requestLocation } = useGPS()

  useEffect(() => {
    const id = setInterval(() => setIsDark(isNightHour()), 60_000)
    return () => clearInterval(id)
  }, [])

  const paikatKartalla = paikat.filter(
    (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
      p.latitude != null && p.longitude != null
  )

  return (
    <div className="relative w-full h-[calc(100svh-56px)] mt-0">
      <Map
        defaultCenter={TAMPERE}
        defaultZoom={14}
        style={{ width: '100%', height: '100%' }}
        disableDefaultUI
        gestureHandling="greedy"
        onClick={() => setValittu(null)}
      >
        {paikatKartalla.map((p, i) => {
          const color = lajiKonfig[p.laji]?.color ?? '#6b7280'
          return (
            <Marker
              key={p.id}
              position={{ lat: p.latitude, lng: p.longitude }}
              zIndex={valittu?.id === p.id ? 999 : i + 1}
              icon={pinUrl(color, p.laji)}
              onClick={() => setValittu(valittu?.id === p.id ? null : p)}
            />
          )
        })}
        <MapStyleController isDark={isDark} />
        <MapPanController coords={coords} />
      </Map>

      {/* Day / Night toggle */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setIsDark(d => !d)}
        className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-btn text-xs font-semibold"
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

      {/* GPS status indicators */}
      {status === 'requesting' && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-btn text-xs font-semibold text-[rgba(17,17,17,0.5)]">
          Haetaan sijaintia...
        </div>
      )}
      {(status === 'denied' || status === 'unavailable' || status === 'timeout') && (
        <button
          onClick={requestLocation}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-btn text-xs font-semibold text-[rgba(17,17,17,0.5)] hover:text-[#111111]"
        >
          Hae sijainti uudelleen
        </button>
      )}

      {/* Glass bottom sheet */}
      <AnimatePresence>
        {valittu && (
          <motion.div
            key={valittu.id}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="absolute bottom-0 left-0 right-0 glass rounded-b-2xl p-4"
          >
            <button
              onClick={() => setValittu(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center glass-btn text-[rgba(17,17,17,0.5)] hover:text-[#111111]"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {(() => {
              const laji  = lajiKonfig[valittu.laji] ?? { label: valittu.laji, color: '#6b7280' }
              const Icon  = SPORT_ICONS[valittu.laji] ?? Activity
              const hinta = hintateksti(valittu.hinta_min, valittu.hinta_max)
              return (
                <>
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: laji.color }}
                  >
                    <Icon className="w-3 h-3" />
                    {laji.label}
                  </span>

                  <h3 className="mt-2 font-semibold text-[#111111] text-base leading-snug pr-8">
                    {valittu.nimi}
                  </h3>

                  {(valittu.osoite || valittu.kaupunki) && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[rgba(17,17,17,0.45)]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {[valittu.osoite, valittu.kaupunki].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {coords && valittu?.latitude != null && valittu?.longitude != null && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[rgba(17,17,17,0.45)]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {formatDistance(haversineKm(coords.lat, coords.lng, valittu.latitude, valittu.longitude))}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    {hinta && (
                      <span className="text-sm font-semibold text-[#111111] tabular-nums">{hinta}</span>
                    )}
                    {valittu.varauslinkki ? (
                      <a
                        href={valittu.varauslinkki}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto bg-[#111111] hover:bg-[#333333] text-white text-xs font-semibold py-2 px-4 rounded-full [transition:background-color_150ms_var(--ease-out)]"
                      >
                        Varaa →
                      </a>
                    ) : (
                      <a
                        href={`/paikat/${valittu.id}`}
                        className="ml-auto text-[#111111] text-xs font-medium underline underline-offset-2"
                      >
                        Näytä tiedot
                      </a>
                    )}
                  </div>
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
