'use client'

import { useState } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import { getInfoWindowStyle } from '@/lib/lajit'
import type { Liikuntapaikka } from '@/lib/types'

const TAMPERE = { lat: 61.4978, lng: 23.761 }

export default function Kartta({ paikat }: { paikat: Liikuntapaikka[] }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  })

  const [valittu, setValittu] = useState<Liikuntapaikka | null>(null)

  const paikatKartalla = paikat.filter(
    (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
      p.latitude != null && p.longitude != null
  )

  if (!isLoaded) {
    return (
      <div className="w-full h-[520px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 text-sm">Ladataan karttaa...</p>
      </div>
    )
  }

  return (
    <div className="w-full h-[520px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={TAMPERE}
        zoom={12}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
        }}
        onClick={() => setValittu(null)}
      >
        {paikatKartalla.map(p => (
          <Marker
            key={p.id}
            position={{ lat: p.latitude, lng: p.longitude }}
            title={p.nimi}
            onClick={() => setValittu(p)}
          />
        ))}

        {valittu && valittu.latitude != null && valittu.longitude != null && (
          <InfoWindow
            position={{ lat: valittu.latitude, lng: valittu.longitude }}
            onCloseClick={() => setValittu(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -36) }}
          >
            <div style={{ padding: '4px 2px', maxWidth: '210px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#111827', margin: '0 0 6px' }}>
                {valittu.nimi}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  textTransform: 'capitalize',
                  ...getInfoWindowStyle(valittu.laji),
                  marginBottom: '6px',
                }}
              >
                {valittu.laji}
              </span>
              {(valittu.osoite || valittu.kaupunki) && (
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px' }}>
                  {[valittu.osoite, valittu.kaupunki].filter(Boolean).join(', ')}
                </p>
              )}
              {valittu.varauslinkki && (
                <a
                  href={valittu.varauslinkki}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: '6px',
                    fontSize: '12px',
                    color: '#2563eb',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Varaa aika →
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
