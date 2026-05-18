import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

// Tampere keskusta
const TAMPERE_LAT = 61.4978
const TAMPERE_LNG = 23.761
const HAKU_RADIUS_M = 15000

const googleTypesToLaji: Record<string, string> = {
  gym:             'kuntosali',
  swimming_pool:   'uinti',
  stadium:         'liikunta',
  sports_complex:  'liikunta',
  health:          'liikunta',
}

function detectLaji(types: string[]): string {
  for (const t of types) {
    if (googleTypesToLaji[t]) return googleTypesToLaji[t]
  }
  return 'liikunta'
}

function parseOsoite(name: string, formattedAddress: string): string | null {
  const parts = formattedAddress.split(', ')
  // Poistetaan paikannimi alusta jos se toistuu osoitteessa
  const ilmanNimea = parts[0] === name ? parts.slice(1) : parts
  // Poistetaan maa ja kaupunki lopusta
  const filtered = ilmanNimea.filter(
    p => p !== 'Finland' && p !== 'Suomi' && !/tampere/i.test(p)
  )
  return filtered[0]?.trim() ?? null
}

interface PlacesResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  types: string[]
}

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'GOOGLE_PLACES_API_KEY puuttuu ympäristömuuttujista' },
      { status: 500 }
    )
  }

  // Google Places Text Search
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', 'liikuntapaikat Tampere')
  url.searchParams.set('location', `${TAMPERE_LAT},${TAMPERE_LNG}`)
  url.searchParams.set('radius', String(HAKU_RADIUS_M))
  url.searchParams.set('language', 'fi')
  url.searchParams.set('region', 'fi')
  url.searchParams.set('key', API_KEY)

  let placesVastaus: Response
  try {
    placesVastaus = await fetch(url.toString())
  } catch {
    return NextResponse.json(
      { error: 'Google Places API -yhteys epäonnistui' },
      { status: 502 }
    )
  }

  if (!placesVastaus.ok) {
    return NextResponse.json(
      { error: `Google Places API HTTP-virhe: ${placesVastaus.status}` },
      { status: 502 }
    )
  }

  const data = await placesVastaus.json()

  if (data.status === 'REQUEST_DENIED') {
    return NextResponse.json(
      { error: 'API-avain hylätty', detail: data.error_message },
      { status: 403 }
    )
  }

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json(
      { error: `Google Places virhe: ${data.status}`, detail: data.error_message },
      { status: 500 }
    )
  }

  const results: PlacesResult[] = data.results ?? []

  if (results.length === 0) {
    return NextResponse.json({ loydetty: 0, tallennettu: 0, ohitettu: 0 })
  }

  // Muodostetaan rivit Supabase-tauluun
  const rivit = results.map(p => ({
    place_id:  p.place_id,
    nimi:      p.name,
    laji:      detectLaji(p.types),
    osoite:    parseOsoite(p.name, p.formatted_address),
    kaupunki:  'Tampere',
    latitude:  p.geometry?.location?.lat ?? null,
    longitude: p.geometry?.location?.lng ?? null,
  }))

  // Upsert: päivitä jos place_id on jo kannassa, lisää muuten
  const { data: tallennettu, error } = await supabase
    .from('liikuntapaikat')
    .upsert(rivit, { onConflict: 'place_id', ignoreDuplicates: true })
    .select('id')

  if (error) {
    return NextResponse.json(
      { error: `Supabase-virhe: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    loydetty:   results.length,
    tallennettu: tallennettu?.length ?? 0,
    ohitettu:   results.length - (tallennettu?.length ?? 0),
  })
}
