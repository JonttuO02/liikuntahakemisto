import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TAMPERE } from '@/lib/constants'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

interface PlaceDetailsResult {
  website: string | null
  puhelin: string | null
  aukioloajat: Record<string, { open: string; close: string }> | null
}

interface OpeningHoursPeriod {
  open: { day: number; time: string }
  close?: { day: number; time: string }
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function parseAukioloajat(
  periods: OpeningHoursPeriod[] | undefined
): Record<string, { open: string; close: string }> | null {
  if (!periods?.length) return null
  const result: Record<string, { open: string; close: string }> = {}
  const fmt = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`
  for (const p of periods) {
    if (!p.open || !p.close) continue
    const day = DAY_NAMES[p.open.day]
    if (!day || result[day]) continue
    result[day] = { open: fmt(p.open.time), close: fmt(p.close.time) }
  }
  return Object.keys(result).length > 0 ? result : null
}

function parseOsoite(name: string, formattedAddress: string): string | null {
  const parts = formattedAddress.split(', ')
  const ilmanNimea = parts[0] === name ? parts.slice(1) : parts
  const filtered = ilmanNimea.filter(
    p => p !== 'Finland' && p !== 'Suomi' && !/tampere/i.test(p)
  )
  return filtered[0]?.trim() ?? null
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'website,formatted_phone_number,opening_hours')
  url.searchParams.set('language', 'fi')
  url.searchParams.set('key', API_KEY!)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return { website: null, puhelin: null, aukioloajat: null }
    const data = await res.json()
    return {
      website: data.result?.website ?? null,
      puhelin: data.result?.formatted_phone_number ?? null,
      aukioloajat: parseAukioloajat(data.result?.opening_hours?.periods),
    }
  } catch {
    return { website: null, puhelin: null, aukioloajat: null }
  }
}

interface SportQuery {
  hakutermi: string
  laji: string
}

const SPORT_QUERIES: SportQuery[] = [
  { hakutermi: 'padel Tampere',               laji: 'padel' },
  { hakutermi: 'uimahalli Tampere',            laji: 'uinti' },
  { hakutermi: 'jooga Tampere',                laji: 'jooga' },
  { hakutermi: 'kiipeily bouldering Tampere',  laji: 'kiipeily' },
  { hakutermi: 'jääkiekko halli Tampere',      laji: 'jääkiekko' },
  { hakutermi: 'kuntosali fitness Tampere',    laji: 'kuntosali' },
  { hakutermi: 'tennis Tampere',               laji: 'tennis' },
  { hakutermi: 'liikuntahalli Tampere',        laji: 'liikuntahalli' },
]

interface PlacesResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  types: string[]
}

async function fetchSportQuery(
  hakutermi: string,
  laji: string,
  apiKey: string
): Promise<Array<PlacesResult & { assignedLaji: string }>> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', hakutermi)
  url.searchParams.set('location', `${TAMPERE.lat},${TAMPERE.lng}`)
  url.searchParams.set('radius', '15000')
  url.searchParams.set('language', 'fi')
  url.searchParams.set('region', 'fi')
  url.searchParams.set('key', apiKey)
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = await res.json()
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return []
    return (data.results ?? []).map((r: PlacesResult) => ({ ...r, assignedLaji: laji }))
  } catch {
    return []
  }
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

  // Run all sport queries in parallel
  const queryResults = await Promise.all(
    SPORT_QUERIES.map(({ hakutermi, laji }) => fetchSportQuery(hakutermi, laji, API_KEY!))
  )

  // Deduplicate by place_id — first occurrence wins (preserves the assigned laji)
  const seen = new Set<string>()
  const allResults: Array<PlacesResult & { assignedLaji: string }> = []
  for (const batch of queryResults) {
    for (const r of batch) {
      if (!seen.has(r.place_id)) {
        seen.add(r.place_id)
        allResults.push(r)
      }
    }
  }

  if (allResults.length === 0) {
    return NextResponse.json({ loydetty: 0, tallennettu: 0, website_loydetty: 0 })
  }

  // Fetch Place Details for all results in parallel
  const details = await Promise.all(allResults.map(p => fetchPlaceDetails(p.place_id)))

  const rivit = allResults.map((p, i) => ({
    place_id:     p.place_id,
    nimi:         p.name,
    laji:         p.assignedLaji,
    osoite:       parseOsoite(p.name, p.formatted_address),
    kaupunki:     'Tampere',
    latitude:     p.geometry?.location?.lat ?? null,
    longitude:    p.geometry?.location?.lng ?? null,
    varauslinkki: details[i].website,
    puhelin:      details[i].puhelin,
    aukioloajat:  details[i].aukioloajat,
  }))

  const websiteLoydetty = details.filter(d => d.website !== null).length

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
    loydetty:         allResults.length,
    tallennettu:      tallennettu?.length ?? 0,
    website_loydetty: websiteLoydetty,
  })
}
