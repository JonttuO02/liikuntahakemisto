# Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa - Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 5 (2 new, 3 modified)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/components/SijaintiPicker.tsx` (NEW) | component (map widget) | event-driven (click/drag/select → state) | `app/business/map/page.tsx` | role-match (Map+AdvancedMarker composition, GPS-coords-driven center) |
| `app/components/PlaceAutocompleteInput.tsx` (NEW, optional sub-split) | component (web-component wrapper) | event-driven | none in codebase (genuinely new pattern) | no analog — see "No Analog Found" |
| `app/components/MapProvider.tsx` (MODIFIED) | provider | config | itself (single-line addition) | exact (modifying in place) |
| `app/components/ClaimSearchForm.tsx` (MODIFIED — `create` step only) | component (form step) | request-response (form submit → fetch POST) | itself (modifying `create` step in place); secondary analog `handleCreate`/`step==='create'` block | exact (modifying in place) |
| `app/api/business/create-paikka/route.ts` (MODIFIED) | route (API handler) | CRUD (insert) | itself (extending existing trim+slice body-parsing block) | exact (modifying in place) |
| `tests/api/create-paikka.test.ts` (NEW) | test | request-response | `tests/api/update-paikka.test.ts` | exact (same mock-builder pattern, same Supabase admin mocking style) |

## Pattern Assignments

### `app/components/SijaintiPicker.tsx` (NEW — component, event-driven)

**Analog:** `app/business/map/page.tsx` (Map + AdvancedMarker composition) and `hooks/useGPS.ts` (GPS default-center)

**Imports pattern** (`app/business/map/page.tsx` lines 1-17):
```typescript
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { motion, AnimatePresence } from 'framer-motion'
import { Locate } from 'lucide-react'
```
Adapt: drop `useMemo`/`Supercluster`/`haversineKm` (not needed for a single pin), add `useGPS` from `@/hooks/useGPS`, add `useMapsLibrary` from `@vis.gl/react-google-maps` if going the lazy-load route for `places` (research recommends static `libraries={['places']}` on `MapProvider.tsx` instead — see Shared Patterns).

**Map center constant** (`app/business/map/page.tsx` line 20):
```typescript
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
const TAMPERE_CENTER = { lat: 61.4978, lng: 23.7610 }
```
Reuse this exact constant/value for D-03's fallback — do not redefine with different precision.

**GPS-driven default center pattern** (`hooks/useGPS.ts` lines 12-44, full file — already implements D-03's exact state machine):
```typescript
export function useGPS({ autoRequest = false }: { autoRequest?: boolean } = {}): GPSState {
  const [status, setStatus] = useState<GPSStatus>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setStatus('unavailable'); return }
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('granted') },
      (err) => { setCoords(null); /* maps err.code 1/2/3 to denied/unavailable/timeout */ },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    )
  }, [])
  useEffect(() => { if (autoRequest) requestLocation() }, [])
  return { status, coords, requestLocation }
}
```
Use `const { coords } = useGPS({ autoRequest: true })` in `SijaintiPicker`; derive `defaultCenter = coords ?? TAMPERE_CENTER`. Do NOT write a new GPS hook — this satisfies D-03 exactly as-is. Note `app/business/map/page.tsx` itself does NOT use this hook (it inlines `navigator.geolocation.getCurrentPosition` directly, lines 67-72) — prefer the hook for new code since it's the more current, reusable abstraction per CLAUDE.md's GPS constraint.

**Map + click-to-place + draggable marker pattern** (`app/business/map/page.tsx` lines 116-134, 141 — adapt cluster logic away, keep the `<Map>`/`<AdvancedMarker>` shell):
```typescript
<Map
  mapId={MAP_ID}
  defaultCenter={defaultCenter}
  defaultZoom={13}
  gestureHandling="greedy"
  disableDefaultUI
  style={{ width: '100%', height: '320px' }}
  onClick={(event) => {
    if (!event.detail.latLng) return
    onPinChange({ lat: event.detail.latLng.lat, lng: event.detail.latLng.lng })
  }}
>
  {pin && (
    <AdvancedMarker
      position={pin}
      draggable
      onDragEnd={(event) => {
        if (!event.latLng) return
        onPinChange({ lat: event.latLng.lat(), lng: event.latLng.lng() })
      }}
    />
  )}
</Map>
```
**Critical asymmetry (per RESEARCH.md Pitfall 2):** `Map onClick`'s `event.detail.latLng` is a plain `{lat, lng}` literal; `AdvancedMarker onDragEnd`'s `event.latLng` is a `google.maps.LatLng` requiring `.lat()`/`.lng()` calls. Keep two explicitly-typed handlers, do not share one function blindly.

**Recenter/GPS button visual pattern** (`app/business/map/page.tsx` lines 40-52):
```typescript
function RecenterButton({ coords }: { coords: { lat: number; lng: number } | null }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => { if (map && coords) map.panTo(coords) }}
      className="absolute bottom-6 right-4 z-10 w-10 h-10 glass-btn rounded-full flex items-center justify-center text-[rgba(17,17,17,0.6)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
      aria-label="Keskitä sijaintiin"
    >
      <Locate className="w-4 h-4" />
    </motion.button>
  )
}
```
Reusable as-is if SijaintiPicker wants a "recenter to GPS" affordance — uses `.glass-btn` per CLAUDE.md design system, `whileTap={{ scale: 0.95 }}` only (no hover scale) matching Animation Principles.

**Reverse-geocode trigger + field allowlisting (D-06, SIJAINTI-03):** No existing in-repo analog (this is a new integration point) — use RESEARCH.md's Pattern 3 verbatim:
```typescript
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
    return null // failure must not block submission
  }
}
```
**Anti-pattern guard:** never store the raw `results`/`GeocoderResult` in component state — extract `locality.long_name` into a plain string immediately and discard the rest.

---

### `app/components/PlaceAutocompleteInput.tsx` (NEW — web-component wrapper)

**Analog:** None in codebase (genuinely new web-component-wrapping pattern). Follow RESEARCH.md Pattern 1 verbatim — already vetted against current Google docs:
```typescript
'use client'
import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

export default function PlaceAutocompleteInput({ onPlaceSelected }: {
  onPlaceSelected: (place: { lat: number; lng: number; formattedAddress: string }) => void
}) {
  const placesLib = useMapsLibrary('places')
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)

  useEffect(() => {
    if (!placesLib || !containerRef.current || elementRef.current) return
    // @ts-expect-error — PlaceAutocompleteElement typings incomplete in @types/google.maps
    const autocomplete = new placesLib.PlaceAutocompleteElement()
    containerRef.current.appendChild(autocomplete)
    elementRef.current = autocomplete

    const listener = async (event: any) => {
      const place = event.placePrediction.toPlace()
      await place.fetchFields({ fields: ['formattedAddress', 'location'] })
      if (!place.location) return
      onPlaceSelected({ lat: place.location.lat(), lng: place.location.lng(), formattedAddress: place.formattedAddress ?? '' })
    }
    autocomplete.addEventListener('gmp-select', listener) // NOT the deprecated 'gmp-placeselect'

    return () => {
      autocomplete.removeEventListener('gmp-select', listener)
      autocomplete.remove()
      elementRef.current = null
    }
  }, [placesLib, onPlaceSelected])

  return <div ref={containerRef} className="w-full" />
}
```
Styling glue: the rendered custom element cannot take Tailwind classes directly the way a plain `<input>` can — wrap it in a container styled to match `INPUT_CLASS`'s box (border, height, radius) from `ClaimSearchForm.tsx`, and expect to need a `<style>` block or CSS custom properties supported by the widget (`--gmpx-color-surface`, etc., per Google's current theming API) to match the glassmorphism look. Budget a `checkpoint:human-verify` task — type-checking will not catch a stale `gmp-select` vs `gmp-placeselect` event name (RESEARCH.md Pitfall 1).

---

### `app/components/MapProvider.tsx` (MODIFIED — provider/config)

**Current file (full, 11 lines):**
```typescript
'use client'
import { APIProvider } from '@vis.gl/react-google-maps'

export default function MapProvider({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
      {children}
    </APIProvider>
  )
}
```
**Required change:** add a stable, module-level `libraries` array (per RESEARCH.md Pitfall 4 — must not be an inline literal re-created on every render, and must be set unconditionally at the single mount point):
```typescript
const LIBRARIES = ['places'] as const

export default function MapProvider({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''} libraries={LIBRARIES}>
      {children}
    </APIProvider>
  )
}
```
This is the only provider in the app (confirmed via grep — `MapProvider.tsx` wraps `app/layout.tsx`); ROADMAP success criterion 4 forbids a second `<APIProvider>`. Do not add one in `SijaintiPicker.tsx`.

---

### `app/components/ClaimSearchForm.tsx` (MODIFIED — `create` step, lines ~396-474)

**Analog:** itself — the `create` step block being replaced, and `handleCreate` (lines 129-173)

**Current state to replace** (lines 49-52, 425-449):
```typescript
const [createNimi, setCreateNimi] = useState('')
const [createOsoite, setCreateOsoite] = useState('')
const [createKaupunki, setCreateKaupunki] = useState('Tampere')
// ...
<input type="text" placeholder={t('createAddressPlaceholder')} className={INPUT_CLASS}
  value={createOsoite} onChange={e => setCreateOsoite(e.target.value)} />
<select aria-label="Kaupunki" className={SELECT_CLASS} value={createKaupunki}
  onChange={e => setCreateKaupunki(e.target.value)}>
  <option value="Tampere">Tampere</option>
  <option value="Helsinki">Helsinki</option>
  <option value="Turku">Turku</option>
</select>
```
Replace with `<SijaintiPicker onChange={({ lat, lng, address, city }) => {...}} />` driving new `createLat`/`createLng` state, while keeping `createOsoite`/`createKaupunki` as controlled text inputs pre-filled from the picker (per D-05/D-06 — both stay editable, reuse `INPUT_CLASS` exactly as the existing `osoite` input does at line 433-439).

**Submit handler pattern to extend** (`handleCreate`, lines 129-173 — fetch+JSON body shape):
```typescript
const res = await fetch('/api/business/create-paikka', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    nimi: createNimi.trim(),
    osoite: createOsoite.trim(),
    kaupunki: createKaupunki,
    // ADD: latitude: createLat, longitude: createLng
  }),
})
```
Add a pre-submit guard mirroring the existing `errorNameRequired`/`errorAddressRequired` checks (lines 132-139) — block submit if `createLat === null` (per RESEARCH.md Open Question 1's recommendation: pin placement should be a hard requirement).

**Step transition / animation conventions to preserve** (lines 396-403): `AnimatePresence mode="wait"`, `key="create"`, `initial/animate/exit={{opacity:0/1/0}}`, `transition={{duration:0.2}}` — the new picker UI must live inside this same `motion.div`, no new transition pattern introduced.

---

### `app/api/business/create-paikka/route.ts` (MODIFIED — API route, lines 27-48)

**Analog:** itself — existing trim+slice body-parsing block

**Current parsing block** (lines 26-41):
```typescript
let nimi: string
let osoite: string
let kaupunki: string
try {
  const body = await request.json()
  nimi = typeof body.nimi === 'string' ? body.nimi.trim().slice(0, 500) : ''
  osoite = typeof body.osoite === 'string' ? body.osoite.trim().slice(0, 500) : ''
  kaupunki = typeof body.kaupunki === 'string' ? body.kaupunki.trim().slice(0, 500) : ''

  if (!nimi || !osoite || !kaupunki) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
} catch {
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
}
```
**Required extension** — add explicit allowlist for `latitude`/`longitude` only (never destructure/forward `place_id`, `formatted_address`, or any other Places/Geocoding field even if present in the request body — SIJAINTI-03 hard constraint):
```typescript
let latitude: number | null
let longitude: number | null
// inside the same try block:
latitude = typeof body.latitude === 'number' && Number.isFinite(body.latitude) ? body.latitude : null
longitude = typeof body.longitude === 'number' && Number.isFinite(body.longitude) ? body.longitude : null
// Optionally range-check: lat ∈ [-90,90], lng ∈ [-180,180]
if (!nimi || !osoite || !kaupunki || latitude === null || longitude === null) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
}
```

**Insert call to extend** (line 46-50):
```typescript
const { data: newPaikka, error: paikkaError } = await supabaseAdmin
  .from('liikuntapaikat')
  .insert({ nimi, osoite, kaupunki, laji: 'Muu', published: false })
  .select('id')
  .single()
```
Change to `.insert({ nimi, osoite, kaupunki, latitude, longitude, laji: 'Muu', published: false })`. Everything else in this file (JWT verification lines 9-14, business-account check lines 17-24, link insert lines 63-79, `is_claimed` update lines 84-91, admin email lines 94-123) is explicitly untouched per CONTEXT.md's canonical refs — do not modify.

---

### `tests/api/create-paikka.test.ts` (NEW — test)

**Analog:** `tests/api/update-paikka.test.ts` (lines 1-58 shown — full mock-builder pattern)

**Mock scaffolding pattern to copy** (lines 1-58):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

const mockGetUser = vi.fn()
// ... chainable builder mocks per table, following the same `from: (table) => {...}` switch pattern

vi.mock('@/lib/supabaseAdmin.server', () => ({
  supabaseAdmin: {
    auth: { getUser: (token: string) => mockGetUser(token) },
    from: (table: string) => { /* return appropriate chainable builder per table */ },
  },
}))
```
**New test cases to add** (per RESEARCH.md's Wave 0 Gaps and Code Examples section):
- assert request body with `latitude: 61.5, longitude: 23.7` results in an `.insert()` call whose payload includes `{ latitude: 61.5, longitude: 23.7 }`
- assert request with non-numeric/missing latitude/longitude either 400s or defaults to `null` per chosen validation strictness — do not crash
- **regression guard (SIJAINTI-03):** assert the insert payload object NEVER contains a `place_id` key even when the request body includes one — mirrors RESEARCH.md's explicit `grep -r "place_id" app/api` warning sign
- mock `@/lib/email`'s `sendAdminNotificationEmail` (the route imports it) the same way other create-paikka-adjacent tests would, to avoid unhandled side effects

## Shared Patterns

### Animation / step transitions
**Source:** `app/components/ClaimSearchForm.tsx` lines 179-186, 396-403 (`AnimatePresence mode="wait"` + opacity-only crossfade, `duration: 0.2`)
**Apply to:** `SijaintiPicker.tsx`'s internal states (e.g., showing/hiding the address text field after autocomplete select) and any sub-step transitions within the `create` step.

### Glassmorphism buttons
**Source:** `app/business/map/page.tsx` lines 40-52 (`.glass-btn`, `whileTap={{ scale: 0.95 }}` only, no hover scale)
**Apply to:** Any recenter-to-GPS button or map-overlay control added inside `SijaintiPicker.tsx`.

### Controlled-input styling constants
**Source:** `app/components/ClaimSearchForm.tsx` lines 25-32 (`INPUT_CLASS`, `SELECT_CLASS`, `CTA_CLASS`)
**Apply to:** The editable address-text input (D-05) and editable city input (D-06 per Open Question 2's recommendation) inside `SijaintiPicker.tsx` — reuse `INPUT_CLASS` verbatim for visual consistency; do not declare new input styling.

### GPS client-side-only pattern
**Source:** `hooks/useGPS.ts` (full file, 44 lines)
**Apply to:** `SijaintiPicker.tsx`'s D-03 default-center logic — call with `{ autoRequest: true }`, fall back to the `TAMPERE_CENTER` constant from `app/business/map/page.tsx` line 20 when `status !== 'granted'`.

### Server-side field allowlisting / data minimization
**Source:** `app/api/business/create-paikka/route.ts` lines 32-34 (existing `typeof === 'string'` trim+slice pattern)
**Apply to:** The new `latitude`/`longitude` fields — extend the same explicit-allowlist style (`typeof body.X === 'number' && Number.isFinite(...)`), and critically, never spread `...body` anywhere in the insert call. This is the SIJAINTI-03 enforcement point.

### Test mocking for Supabase-admin API routes
**Source:** `tests/api/update-paikka.test.ts` lines 1-58
**Apply to:** `tests/api/create-paikka.test.ts` — same `vi.mock('next/server', ...)` shape, same chainable-builder-per-table pattern keyed on `from(table)`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/components/PlaceAutocompleteInput.tsx` | component (web-component wrapper) | event-driven | No existing code in this repo wraps a non-React custom element (`PlaceAutocompleteElement`) with `useRef`+`appendChild`+manual event listener bridging — this is a genuinely new pattern category for the codebase. Use RESEARCH.md Pattern 1 verbatim (already grounded in current official Google docs) instead of an in-repo analog. |
| Reverse-geocoding call (`google.maps.Geocoder`) | utility (async function, not its own file) | request-response | No existing client-side Geocoder usage anywhere in the codebase (only `Etusivu.tsx`'s weather fetch hits an external API, unrelated shape). Use RESEARCH.md Pattern 3 verbatim. |

## Metadata

**Analog search scope:** `app/components/`, `app/business/`, `app/api/business/`, `hooks/`, `tests/api/`
**Files scanned:** `MapProvider.tsx`, `ClaimSearchForm.tsx`, `Etusivu.tsx` (lines 1-17, 860-985), `business/map/page.tsx` (full), `useGPS.ts` (full), `create-paikka/route.ts` (full), `update-paikka.test.ts` (lines 1-60)
**Pattern extraction date:** 2026-06-22
