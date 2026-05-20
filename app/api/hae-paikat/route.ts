import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TAMPERE } from '@/lib/constants'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

const HAKU_RADIUS_M = 15000

function detectLaji(types: string[]): string {
  if (types.some(t => t === 'gym' || t === 'fitness_center')) return 'kuntosali'
  if (types.includes('swimming_pool'))                         return 'uinti'
  if (types.includes('tennis_court'))                         return 'tennis'
  if (types.some(t => t === 'sports_club' || t === 'stadium')) return 'liikuntahalli'
  return 'liikunta'
}

function parseOsoite(name: string, formattedAddress: string): string | null {
  const parts = formattedAddress.split(', ')
  const ilmanNimea = parts[0] === name ? parts.slice(1) : parts
  const filtered = ilmanNimea.filter(
    p => p !== 'Finland' && p !== 'Suomi' && !/tampere/i.test(p)
  )
  return filtered[0]?.trim() ?? null
}

async function fetchPlaceDetails(
  placeId: string
): Promise<{ website: string | null; puhelin: string | null }> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'website,formatted_phone_number')
  url.searchParams.set('language', 'fi')
  url.searchParams.set('key', API_KEY!)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return { website: null, puhelin: null }
    const data = await res.json()
    return {
      website: data.result?.website ?? null,
      puhelin: data.result?.formatted_phone_number ?? null,
    }
  } catch {
    return { website: null, puhelin: null }
  }
}

interface PlacesResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  types: string[]
}

export async function GET(req: Request) {
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'GOOGLE_PLACES_API_KEY puuttuu ympäristömuuttujista' },
      { status: 500 }
    )
  }

  // Text Search
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', 'liikuntapaikat Tampere')
  url.searchParams.set('location', `${TAMPERE.lat},${TAMPERE.lng}`)
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
    return NextResponse.json({ loydetty: 0, tallennettu: 0, ohitettu: 0, website_loydetty: 0 })
  }

  // Haetaan Place Details kaikille paikoille rinnakkain
  const details = await Promise.all(results.map(p => fetchPlaceDetails(p.place_id)))

  const rivit = results.map((p, i) => ({
    place_id:     p.place_id,
    nimi:         p.name,
    laji:         detectLaji(p.types),
    osoite:       parseOsoite(p.name, p.formatted_address),
    kaupunki:     'Tampere',
    latitude:     p.geometry?.location?.lat ?? null,
    longitude:    p.geometry?.location?.lng ?? null,
    varauslinkki: details[i].website,
    puhelin:      details[i].puhelin,
  }))

  const websiteLoydetty = details.filter(d => d.website !== null).length

  // Upsert: päivitä olemassa olevat, lisää uudet
  const { data: tallennettu, error } = await supabaseAdmin
    .from('liikuntapaikat')
    .upsert(rivit, { onConflict: 'place_id', ignoreDuplicates: false })
    .select('id')

  if (error) {
    return NextResponse.json(
      { error: `Supabase-virhe: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    loydetty:        results.length,
    tallennettu:     tallennettu?.length ?? 0,
    website_loydetty: websiteLoydetty,
  })
}
