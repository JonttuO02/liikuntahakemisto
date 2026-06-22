# Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa - Research

**Researched:** 2026-06-22
**Domain:** Google Maps JS SDK integration (React) — draggable markers, new Places Autocomplete widget, client-side reverse geocoding
**Confidence:** MEDIUM (HIGH on AdvancedMarker/GPS/APIProvider patterns which are verified against this exact codebase; MEDIUM-LOW on `PlaceAutocompleteElement` because it is not yet GA — see Pitfall 1, this is the single biggest risk in the phase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Build the location picker as a standalone, reusable component (not inlined markup). Wire it into `ClaimSearchForm.tsx`'s existing `create` step now, replacing the plain `osoite` text input — don't wait for Phase 56. Rationale: avoids NULL lat/lng on newly created venues in the meantime, and Phase 56 reuses the same component rather than building it from scratch.
- **D-02:** Click-to-place pin, and the placed pin must also be draggable for fine-tuning (`@vis.gl/react-google-maps`'s `<AdvancedMarker>` supports `draggable` natively).
- **D-03:** Before the user places a pin or searches, the map centers on the user's GPS location if available (client-side only, consistent with the existing consumer-map GPS pattern per CLAUDE.md — never via URL params), falling back to a Tampere center if permission is denied/unavailable.
- **D-04:** Use `PlaceAutocompleteElement` (Google's newer recommended web-component widget), not the legacy `google.maps.places.Autocomplete`. It will need glue code to match the project's controlled-input styling conventions since it's a custom element, not a plain React-controlled `<input>`.
- **D-05:** Selecting an autocomplete suggestion sets the pin and pre-fills an editable text input with the formatted address — the user can still edit that text before saving. Whatever is in the text field at submit time is what gets persisted as the address (satisfies SIJAINTI-03's "user-typed address text" even when it originated from an autocomplete pick).
- **D-06:** Replace the manual `kaupunki` `<select>` (Tampere/Helsinki/Turku) in the create branch with an automatic lookup: when the pin is placed/dragged, reverse-geocode the lat/lng via the Google Geocoding API (already covered by the existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`/`MapProvider` — no new key or billing setup) and extract ONLY the locality (city) string from the response.
  - Hard constraint (ties to SIJAINTI-03): discard everything else from the Geocoding response — no `place_id`, no `formatted_address`, no address components beyond the single locality string, no viewport/bounds. Only the city name string and the lat/lng ever reach the database.
  - Considered alternative: OpenStreetMap Nominatim — rejected for this phase (1 req/sec rate limit, attribution requirements); revisit if Google dependency ever becomes a hard blocker.
  - Considered alternative: keep the manual dropdown — rejected, the auto-lookup removes a manual step for free.

### Claude's Discretion
- Exact glue-code approach for wrapping `PlaceAutocompleteElement` as a controlled-feeling input (event listener bridging, ref management) is left to the planner/executor.
- Whether the Geocoding API call for reverse-geocoding happens client-side (browser, same `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) or via a thin server route is an implementation detail — either is fine as long as only the locality string is extracted and nothing else is persisted.
- Exact component name/file location for the new location-picker component (e.g. `app/components/SijaintiPicker.tsx`) is left to the planner.

### Deferred Ideas (OUT OF SCOPE)
- **OpenStreetMap Nominatim as a Google-free geocoding alternative** — explicitly rejected for this phase (1 req/sec rate limit, attribution/User-Agent requirements); flagged as worth revisiting if a future phase wants to reduce Google dependency further. Not scheduled.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIJAINTI-01 | Käyttäjä voi sijoittaa paikan kartalle klikkaamalla onboardingissa | Pattern 2 (click-to-place via `Map onClick` + `AdvancedMarker`), Code Examples §1 |
| SIJAINTI-02 | Käyttäjä voi hakea osoitetta autocomplete-kentästä; valinta asettaa pinnin ja zoomaa karttaa | Pattern 1 (`PlaceAutocompleteElement` wrapping), Pitfall 1, Code Examples §2 |
| SIJAINTI-03 | Tallennetaan vain lat/lng + käyttäjän kirjoittama osoiteteksti — ei pysyvää Google Places -datan tallennusta | Don't Hand-Roll table (field allowlisting), API route extension in Architecture Patterns, D-06 discard-list |
</phase_requirements>

## Summary

This phase adds a map-based location picker to the business onboarding "create from scratch" flow. The good news: every piece of infrastructure this phase needs already exists in the codebase and is current — `@vis.gl/react-google-maps@1.8.3` is installed (verified via `npm view`, current as of registry), the global `<APIProvider>` already wraps the whole app via `app/components/MapProvider.tsx`, `<AdvancedMarker draggable>` is already used in production code (`app/components/Etusivu.tsx`), and a reusable `useGPS()` hook (`hooks/useGPS.ts`) already implements the exact client-side-only GPS pattern CLAUDE.md mandates, including an `autoRequest` option that fits D-03 directly.

The one genuine risk in this phase is `PlaceAutocompleteElement` (D-04). As of the most current Google documentation checked in this research, **this widget is still in beta/weekly-channel rollout, not GA-stable** — it was alpha in early 2024, moved to beta, and reached the "weekly" release channel in April 2025, with the event model changing from `gmp-placeselect` to `gmp-select` along the way. The official current-documentation code samples use `gmp-select` + `place.fetchFields()`, and that is the pattern to implement — but the planner must budget a `checkpoint:human-verify` style verification step (visually confirm the widget renders and the event fires) because breaking changes in this API have shipped multiple times in the last two years, and `@types/google.maps` has known typing gaps for it (community reports require `@ts-ignore` in spots).

For D-06 (reverse geocoding), `google.maps.Geocoder` is part of the core Maps JavaScript API (no extra `libraries` entry needed) but the **Geocoding API must be separately enabled** in Google Cloud Console on the same project as the Maps JavaScript API key — this is a distinct, billable API even though it reuses the same client-side key. This should be confirmed as already-enabled (or enabled) before implementation, since a disabled API fails silently with a `REQUEST_DENIED` status rather than a build-time error.

**Primary recommendation:** Add `'places'` to a single `libraries` array on the existing `<APIProvider>` in `MapProvider.tsx` (do not add a second provider), build the picker as a new `app/components/SijaintiPicker.tsx` that composes `<Map>` + `<AdvancedMarker draggable>` + a `PlaceAutocompleteElement`-wrapping subcomponent + `useGPS()` + `google.maps.Geocoder`, and extend `create-paikka/route.ts` to accept and persist `latitude`/`longitude` alongside the existing fields — discarding everything else the Places/Geocoding responses return.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Map rendering / pin placement | Browser / Client | — | `<Map>`/`<AdvancedMarker>` are client-only web components requiring `'use client'`; no SSR value, matches existing `Etusivu.tsx`/`map/page.tsx` pattern |
| Address autocomplete widget | Browser / Client | — | `PlaceAutocompleteElement` is a browser custom element; must run client-side, cannot SSR |
| GPS default-center lookup | Browser / Client | — | `navigator.geolocation` is browser-only API; `useGPS()` hook already enforces this boundary |
| Reverse geocoding (lat/lng → city) | Browser / Client | API / Backend (optional) | `google.maps.Geocoder` works client-side with the existing public key; a server route is optional (Claude's Discretion) but adds no required value here since the key is already public-safe (HTTP-referrer restricted) |
| Persisting lat/lng + address + city | API / Backend | Database / Storage | `create-paikka/route.ts` is the existing JWT-verified write path; must validate/sanitize body fields server-side regardless of where geocoding ran (never trust client-supplied city/address blindly — trim/slice as already done for `nimi`/`osoite`/`kaupunki`) |
| Discarding non-essential Places/Geocoding fields | Browser / Client AND API / Backend | — | Defense in depth: client should only ever request the minimal `fields` array; server should also only accept the 4-5 allowed body keys, ignoring/rejecting anything else — this is the SIJAINTI-03 hard constraint and deserves enforcement at both tiers |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vis.gl/react-google-maps` | `1.8.3` (already installed — `npm view` confirms this is current) [VERIFIED: npm registry] | React bindings for Maps JS SDK: `<APIProvider>`, `<Map>`, `<AdvancedMarker>`, `useMap()`, `useMapsLibrary()` | Already the project's chosen Maps wrapper since at least Phase 30-ish (`Etusivu.tsx`, `business/map/page.tsx`); no reason to introduce a second wrapper |
| Google Maps JavaScript API (`places` + core `geometry`/`geocoding`) | loaded dynamically via `<APIProvider>`'s bootstrap loader | Places Autocomplete widget, AdvancedMarker, Geocoder | Already the project's only maps provider per CLAUDE.md / MapProvider.tsx |

### Supporting
No new npm packages required for this phase — `PlaceAutocompleteElement` and `google.maps.Geocoder` are both loaded dynamically from the Google Maps JS bootstrap script, not via npm. `@types/google.maps@^3.64.1` (already installed) provides TypeScript types for the stable parts of the SDK, but has known gaps for `PlaceAutocompleteElement`'s newer event types — expect to need a few `@ts-ignore` or hand-rolled ambient type declarations (see Pitfall 1).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `PlaceAutocompleteElement` (D-04 locked) | Legacy `google.maps.places.Autocomplete` | Legacy widget is fully GA/stable and has complete TS types, but Google has deprecated it for new integrations and it renders as an unstyleable native `<input>` dropdown — D-04 explicitly rejected this |
| `PlaceAutocompleteElement` (D-04 locked) | `AutocompleteSuggestion.fetchAutocompleteSuggestions()` + a fully custom dropdown UI | More control over styling/glassmorphism consistency, avoids the beta web-component entirely, but is significantly more code (a full custom suggestion list, keyboard nav, debouncing) — explicitly the maintainer-recommended fallback in `visgl/react-google-maps` discussion #707 if `PlaceAutocompleteElement` proves too unstable; document this as the fallback plan, not the primary plan |
| Client-side `google.maps.Geocoder` (Claude's discretion, recommended) | Server-side REST Geocoding API call from a Route Handler | Server route would hide the key entirely, but the key is already public client-side everywhere else in this app (HTTP-referrer restricted per CLAUDE.md env var table) — no security benefit, and adds a network hop; client-side is simpler and consistent |

**Installation:**
No installation needed — all required libraries are already present in `package.json` and loaded dynamically by the existing `<APIProvider>`.

**Version verification:** `npm view @vis.gl/react-google-maps version` returned `1.8.3`, matching the already-installed version in `package.json` exactly — already current, no upgrade needed [VERIFIED: npm registry].

## Package Legitimacy Audit

No external packages are being newly installed in this phase — `@vis.gl/react-google-maps`, `@googlemaps/markerclusterer`, and `@types/google.maps` are all pre-existing dependencies, already vetted in prior phases. The Package Legitimacy Gate is not applicable.

**Packages removed due to [SLOP] verdict:** none — no new packages proposed
**Packages flagged as suspicious [SUS]:** none — no new packages proposed

## Architecture Patterns

### System Architecture Diagram

```
Business user (browser)
   │
   ├─ 1. Onboarding "create" step loads ──▶ SijaintiPicker mounts
   │                                            │
   │                                            ├─ useGPS({autoRequest:true})
   │                                            │     └─ navigator.geolocation ──▶ {lat,lng} or denial
   │                                            │
   │                                            ├─ <Map> centers on GPS coords, else Tampere fallback
   │                                            │
   │   2. User clicks map ─────────────────────▶ Map onClick(event) ──▶ setPin({lat,lng})
   │                                            │
   │   2b. User drags placed pin ──────────────▶ AdvancedMarker onDragEnd(event) ──▶ setPin({lat,lng})
   │                                            │
   │   3. User types in autocomplete input ────▶ PlaceAutocompleteElement (web component)
   │                                            │     └─ gmp-select event ──▶ placePrediction.toPlace()
   │                                            │           └─ place.fetchFields({fields:['formattedAddress','location']})
   │                                            │                 ├─ setPin({lat,lng} from place.location)
   │                                            │                 ├─ map.panTo + map.setZoom (or fitBounds)
   │                                            │                 └─ setAddressText(place.formattedAddress)  ◀── editable from here on
   │                                            │
   │   4. Pin changes (click/drag/autocomplete) ──▶ reverse-geocode trigger
   │                                            │     └─ new google.maps.Geocoder().geocode({location:{lat,lng}})
   │                                            │           └─ extract ONLY locality address_component
   │                                            │                 └─ setCity(localityString)  ── discard rest of response
   │                                            │
   │   5. User edits address text field (optional) ──▶ setAddressText(value)  ── always wins at submit
   │                                            │
   │   6. User submits create form ─────────────▶ POST /api/business/create-paikka
   │                                                  body: { nimi, osoite: addressText, kaupunki: city, latitude, longitude }
   │                                                       │
   │                                                       ▼
   │                                            JWT verify (supabaseAdmin.auth.getUser)
   │                                                       │
   │                                                       ▼
   │                                            INSERT liikuntapaikat (nimi, osoite, kaupunki, latitude, longitude, laji:'Muu', published:false)
   │                                                       │
   │                                                       ▼
   │                                            INSERT business_paikka_links (link_type:'created', claim_status:'pending')
   │                                                       │
   │                                                       ▼
   │                                            UPDATE liikuntapaikat SET is_claimed = true
   │                                                       │
   └────────────────────────────────────────────────────  redirect → /business/onboarding?paikka_id=...
```

### Recommended Project Structure
```
app/components/
├── MapProvider.tsx          # MODIFIED — add libraries=['places'] to APIProvider
├── ClaimSearchForm.tsx       # MODIFIED — create step wires in SijaintiPicker, drops osoite <input> + kaupunki <select>
├── SijaintiPicker.tsx        # NEW — standalone picker: Map + AdvancedMarker + autocomplete glue + geocode trigger
└── PlaceAutocompleteInput.tsx  # NEW (optional sub-split) — isolates the web-component ref/event glue from the map logic, keeps SijaintiPicker readable

app/api/business/create-paikka/route.ts   # MODIFIED — accept + validate + persist latitude/longitude
```

### Pattern 1: Wrapping `PlaceAutocompleteElement` as a controlled-feeling React input
**What:** `PlaceAutocompleteElement` is a custom element (`<gmp-place-autocomplete>` style API surface, but instantiated via `google.maps.importLibrary('places')` then `new PlaceAutocompleteElement()` and appended to the DOM), not a React component with props. React cannot pass `value`/`onChange` to it directly.
**When to use:** Whenever D-04 calls for the new Places widget instead of the legacy `Autocomplete` class.
**Example:**
```typescript
// Source: https://developers.google.com/maps/documentation/javascript/examples/place-autocomplete-element
// and https://github.com/visgl/react-google-maps/discussions/707
'use client'
import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

type PlaceAutocompleteInputProps = {
  onPlaceSelected: (place: { lat: number; lng: number; formattedAddress: string }) => void
}

export default function PlaceAutocompleteInput({ onPlaceSelected }: PlaceAutocompleteInputProps) {
  const placesLib = useMapsLibrary('places') // loads 'places' lazily without re-triggering APIProvider reload
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
```
Note: `useMapsLibrary('places')` (from `@vis.gl/react-google-maps`) is preferred over adding `'places'` to the `<APIProvider libraries>` array if you want to lazy-load only when this component mounts — but per D-04/ROADMAP criterion 4 ("no double-load"), the simplest and most reliable option given there is exactly one `<APIProvider>` in this app is to declare `libraries={['places']}` on `MapProvider.tsx` once, at the top level, since onboarding always needs it. Either approach avoids the double-load warning; `useMapsLibrary` exists specifically so libraries can be added incrementally without re-triggering the bootstrap script.

### Pattern 2: Click-to-place + drag-to-adjust pin
**What:** A controlled `AdvancedMarker` whose `position` is driven by React state, updated by both the `Map`'s `onClick` and the marker's `onDragEnd`.
**When to use:** SIJAINTI-01 (click-to-place) and D-02 (drag fine-tuning).
**Example:**
```typescript
// Source: @vis.gl/react-google-maps docs (https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker)
// and existing project pattern in app/components/Etusivu.tsx (AdvancedMarker usage already in this codebase)
'use client'
import { useState } from 'react'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'

const TAMPERE_CENTER = { lat: 61.4978, lng: 23.7610 } // matches existing constant in Etusivu.tsx / business/map/page.tsx

function PinMap({ pin, onPinChange, defaultCenter }: {
  pin: { lat: number; lng: number } | null
  onPinChange: (coords: { lat: number; lng: number }) => void
  defaultCenter: { lat: number; lng: number }
}) {
  return (
    <Map
      defaultCenter={defaultCenter}
      defaultZoom={13}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
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
  )
}
```
Note the asymmetry: `<Map onClick>`'s event gives `event.detail.latLng` as a plain `{lat, lng}` literal (vis.gl wraps it), while `<AdvancedMarker onDragEnd>` gives a raw `google.maps.MapMouseEvent` whose `latLng` is a `google.maps.LatLng` object requiring `.lat()`/`.lng()` method calls. This asymmetry is a known source of bugs — see Pitfall 2.

### Pattern 3: Reverse geocoding with field allowlisting (SIJAINTI-03 enforcement)
**What:** Call `google.maps.Geocoder` and extract only the `locality` component, discarding the rest of the response immediately (never store the `GeocoderResult` object itself in state beyond the extraction).
**When to use:** D-06, triggered whenever the pin changes (click, drag, or autocomplete select).
**Example:**
```typescript
// Source: https://developers.google.com/maps/documentation/javascript/geocoding (core Maps JS SDK, no extra library)
async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  const geocoder = new google.maps.Geocoder()
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } })
    if (!results.length) return null
    // SIJAINTI-03 hard constraint: extract ONLY the locality string, discard
    // place_id, formatted_address, all other address_components, geometry/viewport.
    for (const result of results) {
      const locality = result.address_components.find(c => c.types.includes('locality'))
      if (locality) return locality.long_name
    }
    return null
  } catch {
    return null // geocoding failure must not block submission — kaupunki can be empty/manual fallback
  }
}
```
`google.maps.Geocoder` is part of the core Maps JavaScript API bootstrap (no `libraries=['geocoding']` entry needed — geocoding has never been a separate JS-SDK "library" the way `places`/`marker`/`geometry` are). However, the **Geocoding API must be enabled as a distinct product** in the same Google Cloud project as the Maps JavaScript API key, or every `geocode()` call resolves with status `REQUEST_DENIED` (silent at build time, only visible at runtime in the browser console/network tab).

### Anti-Patterns to Avoid
- **Storing the raw `Place` or `GeocoderResult` object in component state:** Even temporarily, this risks accidentally serializing more than the locality/address/lat-lng into a later `JSON.stringify(formData)` or React DevTools leak. Extract only the 3-4 needed primitives (`lat`, `lng`, `formattedAddress`, `locality`) into state immediately after the async call resolves.
- **Passing `place_id` anywhere, even as a "just in case" cache key:** SIJAINTI-03 is explicit — no `place_id` ever reaches the database. Don't add it to component state either, since state can leak into network requests via spread operators.
- **Adding a second `<APIProvider>` for this feature:** ROADMAP success criterion 4 explicitly forbids this. Reuse `MapProvider.tsx`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Address autocomplete suggestion fetching/ranking | A custom debounced fetch-and-rank suggestion list | `PlaceAutocompleteElement` (D-04) or, if it proves too unstable, `AutocompleteSuggestion.fetchAutocompleteSuggestions()` | Google's ranking/session-token billing logic and debouncing are non-trivial to replicate correctly and reliably |
| GPS permission state machine (idle/requesting/granted/denied/timeout) | A new hook | `hooks/useGPS.ts` (already exists in this codebase) | Already implements exactly this state machine with the `autoRequest` option D-03 needs — do not duplicate |
| Reverse geocoding / locality extraction | A custom regex/string-parsing approach against `formatted_address` | `google.maps.Geocoder` + `address_components.find(c => c.types.includes('locality'))` | `formatted_address` string format varies by country/locale; `address_components` with `types` is the structured, locale-safe way to get just the city |
| Draggable marker drag-state tracking | Custom mousedown/mousemove/mouseup handlers on a plain `<img>` pin | `<AdvancedMarker draggable onDragEnd>` | Already used elsewhere in this codebase (`Etusivu.tsx`); handles touch/mobile drag, accessibility, and z-index stacking that a hand-rolled solution would need to reinvent |

**Key insight:** Every "don't hand-roll" item in this phase already has either a first-party Google API or an existing in-repo hook covering it. The actual engineering risk in this phase is not building too much — it's correctly gluing together a still-evolving beta web component (`PlaceAutocompleteElement`), not reinventing functionality.

## Common Pitfalls

### Pitfall 1: `PlaceAutocompleteElement` is not GA-stable and has shipped breaking changes
**What goes wrong:** The event name changed from `gmp-placeselect` to `gmp-select` during 2024-2025, and the widget moved through alpha → beta → "weekly" release channels. Code copied from older blog posts/Stack Overflow answers may use the deprecated `gmp-placeselect` event and the older `event.place` payload shape, which silently does nothing on a current bootstrap-loaded SDK.
**Why it happens:** Google ships the new Places API widget at a faster cadence than its documentation/community content updates, and `@types/google.maps` lags behind, occasionally requiring `@ts-ignore`/`@ts-expect-error` around the constructor and event listener.
**How to avoid:** Use only `gmp-select` (not `gmp-placeselect`) and `placePrediction.toPlace().fetchFields(...)` (not `event.place`) — confirmed as the current pattern in Google's own up-to-date documentation samples as of this research. Add a `checkpoint:human-verify` task in the plan specifically to manually click through the autocomplete flow in a real browser before considering this phase done, since type-checking alone will not catch a stale event name.
**Warning signs:** TypeScript errors on `PlaceAutocompleteElement` constructor or `gmp-select` not being a recognized event name in `@types/google.maps` — expect to need local ambient type augmentation or scoped `@ts-expect-error` comments, not a sign that the approach is wrong.

### Pitfall 2: `Map onClick` and `AdvancedMarker onDragEnd` return differently-shaped lat/lng
**What goes wrong:** `<Map onClick>` (vis.gl wrapper) gives `event.detail.latLng` as a plain `{lat, lng}` object; `<AdvancedMarker onDragEnd>` gives a raw `google.maps.MapMouseEvent` whose `.latLng` is a `google.maps.LatLng` instance requiring `.lat()`/`.lng()` method calls. Treating them identically causes a `TypeError: lat is not a function` or silently `NaN` coordinates.
**Why it happens:** vis.gl/react-google-maps wraps some native Maps events but not all consistently across component types.
**How to avoid:** Write two small, explicitly-typed handler functions (as shown in Pattern 2) rather than one shared handler; verify in dev tools that both paths produce the same final `{lat: number, lng: number}` shape before wiring up the geocode trigger.
**Warning signs:** Reverse geocoding works after a click but produces `null`/garbage after a drag (or vice versa).

### Pitfall 3: Geocoding API not enabled on the Cloud project → silent `REQUEST_DENIED`
**What goes wrong:** `google.maps.Geocoder().geocode()` resolves with a rejected promise / `REQUEST_DENIED` status if the "Geocoding API" product (distinct from "Maps JavaScript API" and "Places API") isn't separately enabled in Google Cloud Console for the project tied to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. This fails at runtime, not build time, and the failure mode (silent `kaupunki: null`) can look like a frontend bug rather than a Cloud Console configuration gap.
**Why it happens:** Google bills/gates Geocoding, Places, and Maps JS as separate API products even though they share one client-side key.
**How to avoid:** Before implementing, verify in Google Cloud Console (APIs & Services → Enabled APIs) that "Geocoding API" is enabled for the project. Document this as a pre-flight check in the plan, not an assumption.
**Warning signs:** `geocode()` call's promise resolves but `status !== 'OK'`; check `status === 'REQUEST_DENIED'` explicitly and surface it in dev console logging during implementation, even though production should swallow it gracefully (kaupunki falls back to empty/manual entry).

### Pitfall 4: `libraries` prop changes after first `<APIProvider>` render do nothing (or warn)
**What goes wrong:** If `'places'` is added to `MapProvider.tsx`'s `<APIProvider libraries={[...]}>` array conditionally, or added in a way that causes a re-render with a different array reference/contents after the Maps JS bootstrap script has already loaded, the change either has no effect or triggers a console warning about reloading the API — exactly what ROADMAP success criterion 4 forbids.
**Why it happens:** The underlying Maps JS bootstrap script can only be configured once per page load; this is a Google platform constraint, not a vis.gl bug.
**How to avoid:** Set the final `libraries` array value on `<APIProvider>` once, unconditionally, at its single mount point in `MapProvider.tsx` (e.g. `libraries={['places']}`), since `MapProvider` wraps the entire app including onboarding — there's no need for it to be conditional. Do not derive the array inline as a new literal on every render if you ever introduce conditional logic; keep it a stable module-level constant.
**Warning signs:** Console warning mentioning the Maps API being loaded multiple times, or `PlaceAutocompleteElement`/`google.maps.places` being `undefined` despite the import seemingly succeeding.

### Pitfall 5: Persisting more than lat/lng + user-typed address (SIJAINTI-03 violation)
**What goes wrong:** It's tempting to also send `place_id` or the full Geocoder `address_components` array to the backend "for future use" or debugging. This directly violates SIJAINTI-03 and the milestone's entire premise (Google Places data decoupling, Phase 53's predecessor work).
**Why it happens:** Convenience — these fields are already in memory after the API calls, so passing them along "just in case" feels harmless.
**How to avoid:** The `create-paikka` API route must use an explicit allowlist when destructuring the request body (mirroring its existing `nimi`/`osoite`/`kaupunki` trim+slice pattern) — add only `latitude: number` and `longitude: number` as new accepted fields, and never read `place_id`, `formatted_address`, or any nested address-components object from the body even if the client accidentally sends them.
**Warning signs:** Code review or `grep -r "place_id" app/api` turning up a hit in the create-paikka route.

## Code Examples

### Extending `create-paikka/route.ts` to accept lat/lng (SIJAINTI-03-compliant body parsing)
```typescript
// Source: pattern mirrors existing trim+slice validation already in this exact file
// (app/api/business/create-paikka/route.ts lines 27-41)
let nimi: string
let osoite: string
let kaupunki: string
let latitude: number | null
let longitude: number | null
try {
  const body = await request.json()
  nimi = typeof body.nimi === 'string' ? body.nimi.trim().slice(0, 500) : ''
  osoite = typeof body.osoite === 'string' ? body.osoite.trim().slice(0, 500) : ''
  kaupunki = typeof body.kaupunki === 'string' ? body.kaupunki.trim().slice(0, 500) : ''
  latitude = typeof body.latitude === 'number' && Number.isFinite(body.latitude) ? body.latitude : null
  longitude = typeof body.longitude === 'number' && Number.isFinite(body.longitude) ? body.longitude : null

  if (!nimi || !osoite || !kaupunki) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  // Note: latitude/longitude are NOT required-blocking in this snippet — planner should decide
  // whether SIJAINTI-01/02 implies they are mandatory (likely yes, since the whole point of this
  // phase is to stop creating venues with NULL coordinates) and add a 400 if either is null.
} catch {
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
}

// Insert: extend the existing .insert({ nimi, osoite, kaupunki, laji: 'Muu', published: false })
// to also include latitude, longitude.
```

### Test pattern for the extended route (mirrors existing `update-paikka.test.ts`)
```typescript
// Source: tests/api/update-paikka.test.ts (existing pattern in this repo, lines 1-58)
// Apply the same vi.mock('next/server', ...) + vi.mock('@/lib/supabaseAdmin.server', ...)
// chainable-builder approach to test create-paikka's new latitude/longitude handling:
// - assert a request with latitude: 61.5, longitude: 23.7 results in an insert call
//   whose payload includes { latitude: 61.5, longitude: 23.7 }
// - assert a request with latitude omitted/non-numeric does NOT crash and either
//   defaults to null or 400s, per planner's chosen validation strictness
// - assert the insert payload NEVER contains a place_id key even if the request body
//   includes one (regression guard for SIJAINTI-03)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `google.maps.places.Autocomplete` (legacy class-based widget) | `PlaceAutocompleteElement` (web component) | Google announced legacy Autocomplete deprecated for new customers in March 2025 per official migration guide; `PlaceAutocompleteElement` itself iterating beta→weekly channel through 2024-2025 | Legacy widget still works and is fully stable/typed, but isn't the path Google recommends for new code (D-04 already locks in the new widget) |
| `gmp-placeselect` event + `event.place` | `gmp-select` event + `placePrediction.toPlace().fetchFields()` | Alpha channel change, ~Feb 2025 per release notes | Any tutorial/blog content predating this date uses the wrong event name |

**Deprecated/outdated:**
- `google.maps.places.AutocompleteService` (the older suggestion-fetching service): superseded by `AutocompleteSuggestion.fetchAutocompleteSuggestions()` — relevant only if the fallback custom-dropdown path (see Alternatives Considered) is ever taken instead of `PlaceAutocompleteElement`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gmp-select` + `place.fetchFields(['formattedAddress','location'])` is the exact current (June 2026) stable event/field contract for `PlaceAutocompleteElement` | Pattern 1, Pitfall 1 | If Google has shipped another breaking change since the last indexed documentation, the event listener silently never fires; mitigated by the recommended `checkpoint:human-verify` task in the plan |
| A2 | The Geocoding API is not yet enabled on this project's Google Cloud console (vs. already enabled from an earlier phase) | Pitfall 3 | If it's actually already enabled, the pre-flight check is a no-op (harmless); if it's not enabled and this isn't checked, reverse geocoding silently fails for every venue |
| A3 | `useMapsLibrary('places')` vs. a static `libraries={['places']}` on `<APIProvider>` are both viable without triggering ROADMAP criterion 4's double-load warning, but a static array on the existing single `MapProvider.tsx` mount is simpler and lower-risk | Pattern 1, Pitfall 4 | If wrong, the planner should default to the static-array approach since it's unconditional and verified by vis.gl's own documented guidance about not changing props post-mount |

## Open Questions

1. **Is `latitude`/`longitude` mandatory or optional on submit?**
   - What we know: SIJAINTI-01/02's whole point is to stop creating venues with NULL coordinates; the existing `create-paikka` route currently has zero lat/lng concept.
   - What's unclear: Whether the planner should make the picker UI block form submission until a pin is placed (hard requirement) or allow submission with a manual address typed but no pin placed (soft requirement, lat/lng nullable).
   - Recommendation: Make pin placement a hard requirement for the create-from-scratch flow (disable the submit button until `pin !== null`) — this is consistent with the phase's stated goal ("ja vain käyttäjän hyväksymä lat/lng... tallennetaan") and avoids reintroducing the NULL-coordinate problem D-01's rationale explicitly calls out.

2. **Should the reverse-geocoded city be user-editable before submit, like the address text is (D-05)?**
   - What we know: D-06 says the city lookup is "automatic" and replaces the manual dropdown; D-05 explicitly makes the address text editable.
   - What's unclear: CONTEXT.md doesn't say whether the auto-derived city should be shown as a read-only label or an editable field (in case the Geocoder's locality classification is wrong/imprecise near city borders, which does happen at Tampere/Kangasala or Helsinki/Espoo boundaries).
   - Recommendation: Show the derived city as an editable text input pre-filled by the geocode result (not a hidden/読み取り専用 value) — for consistency with D-05's "always editable" philosophy and as a safety net against Geocoder misclassification at municipal boundaries. This is a planner decision, not locked by CONTEXT.md.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@vis.gl/react-google-maps` | All map/marker/autocomplete rendering | ✓ | 1.8.3 (already installed, current per registry) | — |
| Google Maps JavaScript API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) | Map rendering, AdvancedMarker, Geocoder, PlaceAutocompleteElement | ✓ (per CLAUDE.md env var table) | — | — |
| Google Cloud "Places API" enabled on project | `PlaceAutocompleteElement` | Unverified — recommend a pre-flight manual check in Cloud Console | — | If disabled, autocomplete silently returns no suggestions; no code-level fallback exists short of switching to legacy `Autocomplete` |
| Google Cloud "Geocoding API" enabled on project | Reverse geocoding for city auto-fill (D-06) | Unverified — recommend a pre-flight manual check in Cloud Console | — | If disabled, `geocode()` returns `REQUEST_DENIED`; plan should make city field gracefully fall back to empty/manually-typed rather than blocking submission |
| `navigator.geolocation` (browser API) | D-03 default map center | ✓ (browser-native, already used by `useGPS.ts`/`Etusivu.tsx`) | — | Falls back to Tampere center per D-03 — already the established pattern, no new fallback code needed |

**Missing dependencies with no fallback:**
- None — every dependency either has a documented graceful-degradation path already established in this codebase (GPS → Tampere fallback) or a low-cost pre-flight verification step (Cloud Console API enablement check).

**Missing dependencies with fallback:**
- Places API / Geocoding API enablement status — unverified in this research session (no API access to the project's Google Cloud Console); the plan should include a pre-flight verification task.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | none found at root — uses `vitest run` directly per `package.json` `"test"` script; existing test mocks Next.js/Supabase manually per-file (see `tests/api/update-paikka.test.ts`) |
| Quick run command | `npx vitest run tests/api/create-paikka.test.ts` (new file, see Wave 0 Gaps) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIJAINTI-01 | Clicking the map places a pin and sets lat/lng state | unit/component (React) — likely manual-only given Google Maps JS SDK is hard to mock meaningfully in jsdom | manual UAT walkthrough | ❌ Wave 0 (component-level Maps interaction tests are low-value here; recommend manual-only with justification) |
| SIJAINTI-02 | Selecting an autocomplete suggestion sets pin + zooms map | manual-only | manual UAT walkthrough — the `PlaceAutocompleteElement` web component cannot be meaningfully simulated in jsdom/vitest without a real Maps JS bootstrap | n/a |
| SIJAINTI-03 | Only lat/lng + user-typed address persist; no `place_id`/raw Places data reaches the DB | unit (API route) | `npx vitest run tests/api/create-paikka.test.ts -t "does not persist place_id"` | ❌ Wave 0 — new test file needed, mirrors `tests/api/update-paikka.test.ts`'s mock pattern |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/create-paikka.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/api/create-paikka.test.ts` — new file, covers SIJAINTI-03 (lat/lng persisted, place_id/raw Places fields never persisted even if present in request body), mirroring the existing `tests/api/update-paikka.test.ts` mock-builder pattern (mock `supabaseAdmin.auth.getUser`, mock chainable `.from('liikuntapaikat').insert(...)`)
- [ ] SIJAINTI-01/SIJAINTI-02 (map click, drag, autocomplete-select, GPS default-center, reverse-geocode-on-pin-change) are best covered as **manual-only UAT scenarios** — Google Maps JS SDK behavior (real tile rendering, real autocomplete predictions, real geocoding responses) is not practically unit-testable in jsdom/vitest without an excessive, low-value mocking investment. Document this justification explicitly in the plan rather than skipping silently.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged — `create-paikka` already JWT-verifies via `supabaseAdmin.auth.getUser(token)` |
| V3 Session Management | no | Unchanged |
| V4 Access Control | no | Unchanged — existing business-account check stays untouched per CONTEXT.md canonical refs |
| V5 Input Validation | yes | Server-side allowlist + type/range validation on `latitude`/`longitude` (must be `number`, finite, and ideally range-checked to plausible lat ∈ [-90,90] / lng ∈ [-180,180] bounds) before insert — mirrors the existing trim+slice pattern for string fields |
| V6 Cryptography | no | Not applicable to this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client sends arbitrary/out-of-range lat/lng (e.g. spoofed GPS-spoofing-style abuse, or malformed `NaN`/`Infinity` injection) | Tampering | Server-side `typeof === 'number' && Number.isFinite(...)` check (shown in Code Examples) plus optional range validation; reject rather than silently coercing |
| Client sends `place_id` or other Places/Geocoding raw fields in the POST body hoping the server persists them (data-minimization bypass, directly undermines the v3.0 milestone's "Google Places -irtautuminen" goal) | Tampering / Information Disclosure (of Google's TOS-restricted cached data) | Server-side explicit allowlist destructuring (only read `nimi`, `osoite`, `kaupunki`, `latitude`, `longitude` from `body` — never spread the rest, never read `body.place_id`) |
| `PlaceAutocompleteElement`/Geocoder client-side key exposure | Information Disclosure | Already mitigated — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is intentionally public and HTTP-referrer restricted per CLAUDE.md's existing env var table; no new exposure introduced by this phase |

## Sources

### Primary (HIGH confidence)
- `app/components/MapProvider.tsx`, `app/components/ClaimSearchForm.tsx`, `app/components/Etusivu.tsx`, `app/business/map/page.tsx`, `hooks/useGPS.ts`, `app/api/business/create-paikka/route.ts`, `lib/types.ts`, `tests/api/update-paikka.test.ts` — read directly from this codebase [VERIFIED: local file read]
- `npm view @vis.gl/react-google-maps version` — registry check confirming installed version is current [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Google Maps JS API official docs: "Place Autocomplete Element (No Map)" example page (`developers.google.com/maps/documentation/javascript/examples/place-autocomplete-element`) — confirms `gmp-select` event + `fetchFields()` pattern [CITED: developers.google.com]
- Google Maps JS API official docs: "Geocoding Service" (`developers.google.com/maps/documentation/javascript/geocoding`) — confirms Geocoding API must be separately enabled in Cloud Console [CITED: developers.google.com]
- `visgl/react-google-maps` GitHub Discussion #707 — confirms `gmp-select` event status, typing gaps, and the `AutocompleteCustom` fallback approach if the widget proves unworkable [CITED: github.com/visgl/react-google-maps]
- `<APIProvider>` official docs (`visgl.github.io/react-google-maps/docs/api-reference/components/api-provider`) — confirms props must be final at first render; recommends `useMapsLibrary()` for incremental library loading [CITED: visgl.github.io]

### Tertiary (LOW confidence)
- WebSearch-aggregated summaries on `PlaceAutocompleteElement` alpha/beta/weekly-channel timeline (Feb 2024 beta, Feb 2025 event rename, April 2025 weekly channel) — dates and version numbers are search-engine-summarized, not independently re-verified against the primary release-notes page line-by-line; treat the *qualitative* conclusion ("not yet GA, has shipped breaking changes") as MEDIUM confidence but individual dates/version numbers as LOW confidence [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified current via `npm view`; no new dependencies
- Architecture: HIGH — every pattern is either already live in this exact codebase (`AdvancedMarker`, `useGPS`, `APIProvider`) or directly sourced from current official Google documentation
- Pitfalls: MEDIUM — `PlaceAutocompleteElement`'s exact current stability status (Pitfall 1) could not be fully cross-verified against a single authoritative "this is GA now" statement; treat as a known open risk requiring a manual verification checkpoint in the plan, not a blocker

**Research date:** 2026-06-22
**Valid until:** 7 days (Places Autocomplete widget is actively iterating per its release-notes history; re-verify the `gmp-select` event contract if planning is delayed beyond a week)
