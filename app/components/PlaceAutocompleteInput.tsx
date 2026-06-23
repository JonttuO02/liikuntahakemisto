'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

type PlaceAutocompleteInputProps = {
  onPlaceSelected: (place: { lat: number; lng: number; formattedAddress: string }) => void
}

type Suggestion = {
  id: string
  label: string
  prediction: google.maps.places.PlacePrediction
}

export default function PlaceAutocompleteInput({ onPlaceSelected }: PlaceAutocompleteInputProps) {
  const placesLib = useMapsLibrary('places')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!placesLib) return
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken()
    }
  }, [placesLib])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!placesLib || !query.trim()) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { suggestions: results } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current ?? undefined,
        })
        const placeResults = (results ?? []).filter(s => s.placePrediction)
        setSuggestions(
          placeResults.map((s, i) => ({
            id: `${i}-${s.placePrediction!.placeId}`,
            label: s.placePrediction!.text.toString(),
            prediction: s.placePrediction!,
          }))
        )
      } catch {
        setSuggestions([])
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [placesLib, query])

  async function handleSelect(suggestion: Suggestion) {
    const place = suggestion.prediction.toPlace()
    await place.fetchFields({ fields: ['formattedAddress', 'location'] })
    if (!place.location) return
    setQuery('')
    setSuggestions([])
    sessionTokenRef.current = placesLib ? new placesLib.AutocompleteSessionToken() : null
    onPlaceSelected({
      lat: place.location.lat(),
      lng: place.location.lng(),
      formattedAddress: place.formattedAddress ?? '',
    })
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-10 px-3 text-sm outline-none [transition:border-color_150ms_var(--ease-out)]"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-20 top-full left-0 right-0 mt-1 glass rounded-xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 [transition:background-color_150ms_var(--ease-out)]"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
