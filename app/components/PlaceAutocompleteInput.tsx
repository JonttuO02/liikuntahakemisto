'use client'

import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

type PlaceAutocompleteInputProps = {
  onPlaceSelected: (place: { lat: number; lng: number; formattedAddress: string }) => void
}

export default function PlaceAutocompleteInput({ onPlaceSelected }: PlaceAutocompleteInputProps) {
  const placesLib = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)

  useEffect(() => {
    if (!placesLib || !containerRef.current || elementRef.current) return

    // @ts-expect-error — PlaceAutocompleteElement typings are incomplete in @types/google.maps as of this writing
    const autocomplete = new placesLib.PlaceAutocompleteElement()
    containerRef.current.appendChild(autocomplete)
    elementRef.current = autocomplete

    const listener = async (event: any) => {
      const place = event.placePrediction.toPlace()
      await place.fetchFields({ fields: ['formattedAddress', 'location'] })
      if (!place.location) return
      onPlaceSelected({
        lat: place.location.lat(),
        lng: place.location.lng(),
        formattedAddress: place.formattedAddress ?? '',
      })
    }
    autocomplete.addEventListener('gmp-select', listener)

    return () => {
      autocomplete.removeEventListener('gmp-select', listener)
      autocomplete.remove()
      elementRef.current = null
    }
  }, [placesLib, onPlaceSelected])

  return <div ref={containerRef} className="w-full" />
}
