'use client'

import { useEffect, useState } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import SportPin from '@/app/components/SportPin'
import type { MapMouseEvent } from '@vis.gl/react-google-maps'
import { motion } from 'framer-motion'
import { Locate } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useGPS } from '@/hooks/useGPS'
import PlaceAutocompleteInput from '@/app/components/PlaceAutocompleteInput'

const TAMPERE_CENTER = { lat: 61.4978, lng: 23.7610 }
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

const INPUT_CLASS =
  'flex-1 border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-10 px-3 text-sm outline-none [transition:border-color_150ms_var(--ease-out)]'

type Pin = { lat: number; lng: number }

type SijaintiPickerProps = {
  onChange: (value: { lat: number | null; lng: number | null; address: string; city: string }) => void
}

async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  const geocoder = new google.maps.Geocoder()
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } })
    if (!results.length) return null
    for (const result of results) {
      const locality = result.address_components.find(c => c.types.includes('locality'))
      if (locality) return locality.long_name
    }
    return null
  } catch {
    return null
  }
}

function RecenterButton({ coords }: { coords: Pin | null }) {
  const map = useMap()
  if (!coords) return null
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={() => { if (map) map.panTo(coords) }}
      className="absolute bottom-3 right-3 z-10 w-10 h-10 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.6)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
      aria-label="Keskitä sijaintiin"
    >
      <Locate className="w-4 h-4" />
    </motion.button>
  )
}

function AutocompleteZoomHandler({
  target,
}: {
  target: Pin | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo(target)
    map.setZoom(16)
  }, [map, target])
  return null
}

export default function SijaintiPicker({ onChange }: SijaintiPickerProps) {
  const t = useTranslations('Business')
  const { coords } = useGPS({ autoRequest: true })
  const defaultCenter = coords ?? TAMPERE_CENTER

  const [pin, setPin] = useState<Pin | null>(null)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [autocompleteTarget, setAutocompleteTarget] = useState<Pin | null>(null)
  const [geocodeError, setGeocodeError] = useState(false)

  async function handlePinChange(coords: Pin) {
    setPin(coords)
    const result = await reverseGeocodeCity(coords.lat, coords.lng)
    setGeocodeError(result === null)
    setCity(result ?? '')
  }

  function handleMapClick(event: MapMouseEvent) {
    // vis.gl's <Map onClick> gives a plain {lat,lng} literal via event.detail.latLng
    if (!event.detail.latLng) return
    handlePinChange({ lat: event.detail.latLng.lat, lng: event.detail.latLng.lng })
  }

  function handleDragEnd(event: google.maps.MapMouseEvent) {
    if (!event.latLng) return
    handlePinChange({ lat: event.latLng.lat(), lng: event.latLng.lng() })
  }

  function handlePlaceSelected(place: { lat: number; lng: number; formattedAddress: string }) {
    const coords = { lat: place.lat, lng: place.lng }
    setAddress(place.formattedAddress)
    setAutocompleteTarget(coords)
    handlePinChange(coords)
  }

  useEffect(() => {
    onChange({ lat: pin?.lat ?? null, lng: pin?.lng ?? null, address, city })
  }, [pin, address, city, onChange])

  return (
    <div className="flex flex-col gap-3">
      {pin === null && (
        <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('sijaintiHint')}</p>
      )}

      <div className="relative rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.07)]" style={{ width: '100%', height: '320px' }}>
        <Map
          mapId={MAP_ID}
          defaultCenter={defaultCenter}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: '100%', height: '320px' }}
          onClick={handleMapClick}
        >
          {pin && (
            <AdvancedMarker position={pin} draggable onDragEnd={handleDragEnd}>
              <div style={{ position: 'relative', width: 0, height: 0 }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}>
                  <SportPin />
                </div>
              </div>
            </AdvancedMarker>
          )}
          <AutocompleteZoomHandler target={autocompleteTarget} />
        </Map>
        <RecenterButton coords={coords} />
      </div>

      <PlaceAutocompleteInput onPlaceSelected={handlePlaceSelected} />

      {geocodeError && (
        <p role="alert" className="text-sm text-red-600">{t('sijaintiVirhe')}</p>
      )}

      <input
        type="text"
        placeholder={t('createAddressPlaceholder')}
        className={INPUT_CLASS}
        value={address}
        onChange={e => setAddress(e.target.value)}
      />

      <input
        type="text"
        placeholder={t('kaupunkiAutoPlaceholder')}
        className={INPUT_CLASS}
        value={city}
        onChange={e => setCity(e.target.value)}
      />
    </div>
  )
}
