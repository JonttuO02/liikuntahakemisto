'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleMap, OverlayView, useJsApiLoader } from '@react-google-maps/api'
import { Activity, Building2, Dumbbell, Leaf, MapPin, Moon, Sun, Target, Waves, X, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti } from '@/lib/utils'
import type { Liikuntapaikka } from '@/lib/types'
import { DAY_MAP_STYLES, NIGHT_MAP_STYLES, isNightHour } from '@/lib/mapStyles'
import { TAMPERE } from '@/lib/constants'

const SPORT_ICONS: Record<string, LucideIcon> = {
  padel: Zap, kuntosali: Dumbbell, jooga: Leaf,
  uinti: Waves, tennis: Target, liikuntahalli: Building2, liikunta: Activity,
}

const PIN_OFFSET = { x: -14, y: -38 }

function SportPin({
  paikka, index, isActive, isDark, onClick,
}: {
  paikka: Liikuntapaikka & { latitude: number; longitude: number }
  index: number
  isActive: boolean
  isDark: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const laji  = lajiKonfig[paikka.laji]
  const Icon  = SPORT_ICONS[paikka.laji] ?? Activity
  const color = laji?.color ?? '#6b7280'

  return (
    <OverlayView
      position={{ lat: paikka.latitude, lng: paikka.longitude }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => PIN_OFFSET}
    >
      <motion.div
        initial={{ y: -20, scale: 0.6, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
        style={{ position: 'relative', zIndex: isActive ? 999 : index + 1 }}
      >
        <AnimatePresence>
          {(hovered || isActive) && (
            <motion.div
              key="label"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 4px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: isDark ? '#0d0d1a' : '#111111',
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 100,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: isDark
                  ? '0 2px 8px rgba(0,0,0,0.60)'
                  : '0 2px 8px rgba(0,0,0,0.20)',
              }}
            >
              {paikka.nimi}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{ scale: isActive ? 1.25 : 1 }}
          whileHover={{ scale: isActive ? 1.25 : 1.15 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          style={{ position: 'relative', cursor: 'pointer', transformOrigin: 'bottom center' }}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 28 38"
            width={28}
            height={38}
            style={{
              display: 'block',
              filter: isActive
                ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))'
                : 'drop-shadow(0 2px 5px rgba(0,0,0,0.30))',
            }}
          >
            <path
              d="M14 0C6.268 0 0 6.268 0 14c0 5.25 2.875 9.83 7.125 12.3L14 38l6.875-11.7C25.125 23.83 28 19.25 28 14 28 6.268 21.732 0 14 0Z"
              fill={color}
            />
          </svg>

          <div
            style={{
              position: 'absolute',
              top: 7,
              left: 7,
              width: 14,
              height: 14,
              pointerEvents: 'none',
            }}
          >
            <Icon style={{ width: 14, height: 14, color: 'white' }} />
          </div>
        </motion.div>
      </motion.div>
    </OverlayView>
  )
}

export default function Kartta({ paikat }: { paikat: Liikuntapaikka[] }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })

  const [valittu, setValittu] = useState<Liikuntapaikka | null>(null)
  const [isDark, setIsDark]   = useState(isNightHour)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    const id = setInterval(() => setIsDark(isNightHour()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setOptions({ styles: (isDark ? NIGHT_MAP_STYLES : DAY_MAP_STYLES) as google.maps.MapTypeStyle[] })
  }, [isDark])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const paikatKartalla = paikat.filter(
    (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
      p.latitude != null && p.longitude != null
  )

  if (!isLoaded) {
    return (
      <div className="w-full h-[520px] glass rounded-2xl flex items-center justify-center mt-4">
        <p className="text-[rgba(17,17,17,0.4)] text-sm">Ladataan karttaa...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.07)] shadow-sm mt-4">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={TAMPERE}
        zoom={14}
        options={{
          streetViewControl: false,
          mapTypeControl:    false,
          fullscreenControl: false,
          zoomControl:       true,
          styles:            (isDark ? NIGHT_MAP_STYLES : DAY_MAP_STYLES) as google.maps.MapTypeStyle[],
        }}
        onLoad={onMapLoad}
        onClick={() => setValittu(null)}
      >
        {paikatKartalla.map((p, i) => (
          <SportPin
            key={p.id}
            paikka={p}
            index={i}
            isActive={valittu?.id === p.id}
            isDark={isDark}
            onClick={() => setValittu(valittu?.id === p.id ? null : p)}
          />
        ))}
      </GoogleMap>

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
