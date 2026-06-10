import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { SUOMI_KAUPUNGIT } from '@/lib/constants'

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
    if (!p.open) continue
    const day = DAY_NAMES[p.open.day]
    if (!day || result[day]) continue
    if (!p.close) {
      // 24/7 open: Google encodes all-day as a period with no close field
      result[day] = { open: '00:00', close: '23:59' }
    } else {
      result[day] = { open: fmt(p.open.time), close: fmt(p.close.time) }
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

function parseOsoite(name: string, formattedAddress: string, kaupunki: string): string | null {
  const parts = formattedAddress.split(', ')
  const ilmanNimea = parts[0] === name ? parts.slice(1) : parts
  const filtered = ilmanNimea.filter(
    p => p !== 'Finland' && p !== 'Suomi' && p.toLowerCase() !== kaupunki.toLowerCase()
  )
  return filtered[0]?.trim() ?? null
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetailsResult> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'website,formatted_phone_number,opening_hours')
  url.searchParams.set('language', 'fi')
  url.searchParams.set('key', apiKey)

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

interface SportLaji {
  hakutermi: string
  laji: string
}

const SPORT_LAJIT: SportLaji[] = [
  { hakutermi: 'padel',               laji: 'padel' },
  { hakutermi: 'uimahalli',            laji: 'uinti' },
  { hakutermi: 'jooga',                laji: 'jooga' },
  { hakutermi: 'kiipeily bouldering',  laji: 'kiipeily' },
  { hakutermi: 'jääkiekko halli',      laji: 'jääkiekko' },
  { hakutermi: 'kuntosali fitness',    laji: 'kuntosali' },
  { hakutermi: 'tennis',               laji: 'tennis' },
  { hakutermi: 'liikuntahalli',        laji: 'liikuntahalli' },
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
  apiKey: string,
  coords: { lat: number; lng: number }
): Promise<Array<PlacesResult & { assignedLaji: string }>> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', hakutermi)
  url.searchParams.set('location', `${coords.lat},${coords.lng}`)
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

  const kaupunki = new URL(req.url).searchParams.get('kaupunki') ?? 'Tampere'
  const cityCoords = SUOMI_KAUPUNGIT.find(c => c.nimi === kaupunki) ?? { lat: 61.4978, lng: 23.7610 }

  // Run all sport queries in parallel, building query as `${hakutermi} ${kaupunki}`
  const queryResults = await Promise.all(
    SPORT_LAJIT.map(({ hakutermi, laji }) =>
      fetchSportQuery(`${hakutermi} ${kaupunki}`, laji, API_KEY!, cityCoords)
    )
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

  // Pre-filter: exclude venues managed by businesses (business_managed = true)
  // Note: upsert() cannot be WHERE-filtered — must exclude in TypeScript before building rivit
  const { data: managedRows } = await supabaseAdmin
    .from('liikuntapaikat')
    .select('place_id')
    .eq('business_managed', true)

  const managedSet = new Set((managedRows ?? []).map(r => r.place_id))
  const syncResults = allResults.filter(r => !managedSet.has(r.place_id))

  if (syncResults.length === 0) {
    return NextResponse.json({ loydetty: allResults.length, tallennettu: 0, website_loydetty: 0 })
  }

  // Fetch Place Details for all results in parallel
  const details = await Promise.all(syncResults.map(p => fetchPlaceDetails(p.place_id, API_KEY)))

  const rivit = syncResults.map((p, i) => ({
    place_id:     p.place_id,
    nimi:         p.name,
    laji:         p.assignedLaji,
    osoite:       parseOsoite(p.name, p.formatted_address, kaupunki),
    kaupunki:     kaupunki,
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
