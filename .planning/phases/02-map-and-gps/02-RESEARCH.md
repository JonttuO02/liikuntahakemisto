# Phase 2: Map & GPS — Research

**Researched:** 2026-05-20
**Domain:** Google Maps / React / Browser Geolocation API
**Confidence:** HIGH (all core API claims verified via official docs and npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Migrate from `@react-google-maps/api` to `@vis.gl/react-google-maps` with `AdvancedMarker`
- GPS is client-side only — never URL params, never auto-request on mount
- Map component is lazy-loaded: `const Kartta = lazy(() => import('./Kartta'))`
- URL routing always uses `?nakyma=kartta`
- Animations follow Emil Kowalski principles (fast, purposeful, no decoration)
- Tampere center is the silent fallback when GPS is denied

### Claude's Discretion
- Architecture: one map component or two (wire Kartta.tsx vs. keep Etusivu integrated)
- `getCurrentPosition` vs. `watchPosition` for GPS hook
- Distance formatting thresholds (< 100 m vs. km display)
- Memoization strategy for distance calculations

### Deferred Ideas (OUT OF SCOPE)
- PostGIS spatial index for location queries
- Clustering algorithm tuning (v1 just needs to not crash)
- GDPR geolocation consent banner (v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAP-01 | User can request location; map centers on user position with nearby pins; Tampere silent fallback if denied | useGPS hook design, Geolocation API error codes, APIProvider double-load prevention |
| MAP-02 | Every venue card shows distance string ("1,2 km") that updates when location changes | haversineKm() implementation, Finnish number formatter, useMemo memoization pattern |
| MAP-03 | Migrate to @vis.gl/react-google-maps with AdvancedMarker, no double-load flash | Full APIProvider + Map + AdvancedMarker migration guide, mapId requirement, styles prop |
</phase_requirements>

---

## Summary

Phase 2 migrates the map component from `@react-google-maps/api` (which uses `useJsApiLoader` and fires a new script tag every time the component mounts) to `@vis.gl/react-google-maps` v1.8.3, which uses Google's Dynamic Library Import API and prevents double-loading by detecting an existing `google.maps.importLibrary` function. The `<APIProvider>` wraps the entire page and the `<Map>` component replaces `<GoogleMap>`.

The critical constraint is that `<AdvancedMarker>` requires a `mapId` to be set on the parent `<Map>` component. This is a hard requirement from Google's API — there is no workaround that uses AdvancedMarker without mapId. However, Google provides `mapId: "DEMO_MAP_ID"` as a free test identifier. For production, a real Map ID must be created in Google Cloud Console (free, no extra billing for JavaScript maps). The existing day/night custom styles (Aubergine) can still be applied via `map.setOptions({ styles })` using the `useMap()` hook imperatively, though they only apply to the light/raster layer.

The architecture recommendation is to wire `/?nakyma=kartta` to `Kartta.tsx` (currently dead code). `Etusivu.tsx`'s integrated preview map should remain using `@vis.gl/react-google-maps` primitives but without GPS — only the full-screen `Kartta.tsx` gets the GPS button. This preserves the CLAUDE.md contract (`lazy(() => import('./Kartta'))`), eliminates dead code, and keeps GPS logic isolated.

**Primary recommendation:** Place `<APIProvider>` in `app/layout.tsx`, migrate both maps simultaneously (preview + full-screen), wire `/?nakyma=kartta` to `Kartta.tsx`, add GPS hook to `Kartta.tsx` only, and implement `haversineKm()` as a pure utility in `lib/geo.ts`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GPS permission request | Browser / Client | — | `navigator.geolocation` is browser API only; must be triggered by user gesture (tap) |
| Map rendering | Browser / Client | — | `@vis.gl/react-google-maps` is a client-side library; Map cannot be SSR'd |
| Distance calculation | Browser / Client | — | Uses user coords from GPS, runs on every location update; pure client computation |
| Venue data with lat/lng | API / Backend (already done) | — | `supabase.from('liikuntapaikat').select(...)` in `app/page.tsx` — no change needed |
| API key management | Frontend Server (env var) | — | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` already in env; safe to expose (HTTP referrer restriction on key) |
| Map script loading | Browser / Client (APIProvider) | — | `<APIProvider>` uses Dynamic Library Import, a browser-side mechanism |

---

## @vis.gl/react-google-maps Migration Guide

### Package

```bash
npm install @vis.gl/react-google-maps
npm uninstall @react-google-maps/api
```

[VERIFIED: npm registry] — `@vis.gl/react-google-maps` v1.8.3 (published 2023-09-04, last modified 2026-04-09), repo: github.com/visgl/react-google-maps

### Core API — Component Mapping

| Old (`@react-google-maps/api`) | New (`@vis.gl/react-google-maps`) | Notes |
|-------------------------------|-----------------------------------|-------|
| `useJsApiLoader({ googleMapsApiKey })` | `<APIProvider apiKey={...}>` in layout | Moves loading to layout; one-time load |
| `<GoogleMap mapContainerStyle center zoom options onLoad>` | `<Map style center zoom {...options}>` | `style` prop replaces `mapContainerStyle` |
| `<Marker position icon onClick>` | `<AdvancedMarker position onClick>` with JSX children | Requires `mapId` on parent `<Map>` |
| `<OverlayView position getPixelPositionOffset>` | `<AdvancedMarker position>` with JSX children | No `getPixelPositionOffset` needed — anchor is bottom-center by default |
| `onLoad={map => mapRef.current = map}` | `const map = useMap()` inside child component | Hook-based access |
| `window.google.maps.event.trigger(map, 'resize')` | Not needed — `@vis.gl` handles resize automatically | Remove this entirely |

### APIProvider — Prevents Double-Load Flash

The double-load flash with `@react-google-maps/api` happens because `useJsApiLoader` injects a new `<script>` tag on every fresh component mount. `@vis.gl/react-google-maps` uses Google's Dynamic Library Import API (`google.maps.importLibrary`). `<APIProvider>` checks if `google.maps.importLibrary` already exists — if it does, it skips loading entirely. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/api-provider]

**Place `<APIProvider>` in `app/layout.tsx`** — not inside the lazy-loaded `Kartta.tsx`. This means the Maps JS API is loaded once when the page first renders, before the user ever opens the map. By the time they tap the map, the script is already there.

```tsx
// app/layout.tsx
import { APIProvider } from '@vis.gl/react-google-maps'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
          {children}
        </APIProvider>
      </body>
    </html>
  )
}
```

`<APIProvider>` renders children immediately without waiting for the script — it does not block render. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/api-provider]

### Map Component

```tsx
// Inside Kartta.tsx or Etusivu.tsx — APIProvider is in layout, not here
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'

<Map
  mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'}
  defaultCenter={TAMPERE}
  defaultZoom={14}
  style={{ width: '100%', height: '100%' }}
  disableDefaultUI
  gestureHandling="greedy"
  onClick={() => setValittu(null)}
>
  {paikatKartalla.map((p, i) => (
    <AdvancedMarker
      key={p.id}
      position={{ lat: p.latitude, lng: p.longitude }}
      onClick={() => setValittu(p)}
      zIndex={valittu?.id === p.id ? 10 : 1}
    >
      <SportPin paikka={p} isActive={valittu?.id === p.id} isDark={isDark} index={i} />
    </AdvancedMarker>
  ))}
</Map>
```

**Key differences from `<GoogleMap>`:**
- `mapContainerStyle` → `style` prop
- `options={{ ... }}` → props spread directly on `<Map>` (MapProps extends `google.maps.MapOptions`)
- `onLoad` → use `useMap()` hook in a child component instead
- `center`/`zoom` are controlled (cause pan/zoom on every update); use `defaultCenter`/`defaultZoom` for uncontrolled initial position [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/map]

### mapId Requirement

`<AdvancedMarker>` **requires** the parent `<Map>` to have a `mapId`. Without it, the AdvancedMarker element is not created. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker]

- `mapId: "DEMO_MAP_ID"` — works in development and production; Google provides this as a testing constant
- Production: create a Map ID in Google Cloud Console → Maps → Map Management (free for JavaScript maps, no billing impact) [CITED: developers.google.com/maps/documentation/javascript/map-ids/get-map-id]
- Add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to env and pass it to `<Map mapId={...}>`

**Critical limitation of mapId + custom styles:** When a `mapId` is set, legacy JSON `styles` (the Aubergine night style) only apply to the light color scheme on raster roadmap types. The `setOptions({ styles })` imperative call still works but behavior depends on map type. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/map] This is an existing design constraint — the project already uses this pattern and it works on raster maps.

### Applying Day/Night Styles with useMap

```tsx
// StyleController.tsx — a child component inside <Map>
import { useMap } from '@vis.gl/react-google-maps'

function MapStyleController({ isDark }: { isDark: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    map.setOptions({
      styles: (isDark ? NIGHT_MAP_STYLES : DAY_MAP_STYLES) as google.maps.MapTypeStyle[],
    })
  }, [map, isDark])
  return null
}
```

This replaces the `mapInstanceRef.current?.setOptions({ styles })` pattern from `Etusivu.tsx`. [CITED: visgl.github.io/react-google-maps/docs/guides/interacting-with-google-maps-api]

### AdvancedMarker with Custom JSX Children

`<AdvancedMarker>` renders JSX children as the pin's DOM content — it creates a div container and places the children inside it via React portal. The map positions the marker such that the **bottom-center** of the content element aligns to the lat/lng coordinate. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker]

This eliminates the need for `<OverlayView>` entirely. The existing `SportPin` component from `Kartta.tsx` can be used directly as a child:

```tsx
<AdvancedMarker position={{ lat: p.latitude, lng: p.longitude }} onClick={() => setValittu(p)}>
  <SportPin paikka={p} isActive={isActive} isDark={isDark} index={i} />
</AdvancedMarker>
```

No `getPixelPositionOffset` needed. No `mapPaneName` needed. Framer Motion animations on the children work exactly the same — AdvancedMarker does not interfere with DOM animations inside its children.

---

## Architecture Recommendation: One Map or Two?

### Current State (confirmed by code inspection)

- `app/page.tsx` routes: `?nakyma=lista` → `LiikuntapaikatLista`, everything else → `Etusivu`
- `/?nakyma=kartta` → renders `Etusivu`, NOT `Kartta.tsx` — Kartta.tsx is dead code
- `BottomNav.tsx` has a "Lista" tab (`?nakyma=lista`) — there is NO "Kartta" tab (CLAUDE.md mentions `?nakyma=kartta` but the current BottomNav links to `?nakyma=lista`)
- `Etusivu.tsx` contains: preview map (3D tilted), fullscreen map expansion, filter pills, bottom sheet — all integrated at 526 lines

### Recommendation: Wire Kartta.tsx + Keep Etusivu Preview

**Wire `/?nakyma=kartta`** in `app/page.tsx` to render `<Kartta>` (currently unreachable). Update `BottomNav.tsx` to have a Kartta tab (`?nakyma=kartta`).

**Keep `Etusivu.tsx`'s preview map** but migrate it to `@vis.gl/react-google-maps` primitives.

**Rationale:**

1. CLAUDE.md explicitly says `const Kartta = lazy(() => import('./Kartta'))` — this contract must be honored for the lazy-loading to work. If the map stays inside `Etusivu.tsx`, the lazy-load is meaningless because Etusivu is always loaded.

2. `Kartta.tsx` already has the better `SportPin` component (animated Framer Motion SVG pins with `OverlayView`) vs. `Etusivu.tsx`'s SVG URL data URIs injected via `getMarkerIcon`. `Kartta.tsx` is the right base for the target state.

3. GPS state (`userLocation`) belongs in `Kartta.tsx` only — it should not be in `Etusivu.tsx` because the preview map does not need GPS centering.

4. `Etusivu.tsx`'s preview map stays as a decorative teaser (static, Tampere-centered, no GPS, no interaction) — only migrating away from `<GoogleMap>/<Marker>` to `<Map>/<AdvancedMarker>`.

### File Actions

| File | Action | What Changes |
|------|--------|-------------|
| `app/layout.tsx` | Add `<APIProvider>` | Wraps body, loads Maps JS API once |
| `app/page.tsx` | Add `?nakyma=kartta` route | `searchParams.nakyma === 'kartta'` → render `<Kartta>` |
| `app/components/Kartta.tsx` | **Rewrite** (keep SportPin) | Remove `useJsApiLoader`, replace `GoogleMap`/`OverlayView` with `Map`/`AdvancedMarker`, add `useGPS` hook + GPS button, add distance display |
| `app/components/Etusivu.tsx` | **Partial migrate** | Remove `useJsApiLoader`, replace `<GoogleMap>/<Marker>` with `<Map>/<AdvancedMarker>` in preview + fullscreen map; keep all other logic intact |
| `app/components/BottomNav.tsx` | Update | Add/change tab to `?nakyma=kartta` |
| `lib/geo.ts` | **New file** | `haversineKm()`, `formatDistance()` |
| `lib/constants.ts` | **New file** | `TAMPERE` constant (deduplicate from 4 files) |
| `hooks/useGPS.ts` | **New file** | GPS state machine hook |

---

## useGPS Hook Design

### TypeScript Interface

```typescript
// hooks/useGPS.ts

export type GPSStatus =
  | 'idle'          // initial state — user has not tapped the GPS button yet
  | 'requesting'    // browser prompt shown or waiting for position
  | 'granted'       // position received successfully
  | 'denied'        // PERMISSION_DENIED (error code 1)
  | 'unavailable'   // POSITION_UNAVAILABLE (error code 2)
  | 'timeout'       // TIMEOUT (error code 3)

export interface GPSState {
  status: GPSStatus
  coords: { lat: number; lng: number } | null
  /** Call this from a user gesture (button onClick). Never call on mount. */
  requestLocation: () => void
}

export function useGPS(): GPSState
```

### State Machine Implementation

```typescript
// hooks/useGPS.ts
'use client'

import { useState, useCallback } from 'react'

export type GPSStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'timeout'

export interface GPSState {
  status: GPSStatus
  coords: { lat: number; lng: number } | null
  requestLocation: () => void
}

export function useGPS(): GPSState {
  const [status, setStatus] = useState<GPSStatus>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      // Browser does not support geolocation (old browser, file:// origin)
      setStatus('unavailable')
      return
    }

    setStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setStatus('granted')
      },
      (error) => {
        setCoords(null)
        switch (error.code) {
          case 1: // GeolocationPositionError.PERMISSION_DENIED
            setStatus('denied')
            break
          case 2: // GeolocationPositionError.POSITION_UNAVAILABLE
            setStatus('unavailable')
            break
          case 3: // GeolocationPositionError.TIMEOUT
            setStatus('timeout')
            break
          default:
            setStatus('unavailable')
        }
      },
      {
        enableHighAccuracy: true,  // Request GPS-level accuracy
        timeout: 10_000,           // 10 second max wait
        maximumAge: 30_000,        // Reuse cached position if < 30s old
      }
    )
  }, [])

  return { status, coords, requestLocation }
}
```

### Why getCurrentPosition, Not watchPosition

- Phase 2 success criteria says "user taps button → map centers" — a one-shot read fulfills this
- `watchPosition` fires continuously, causing map re-centers and distance recalculations on every GPS update (battery drain, jank)
- Finnish venues do not move; a 30-second cached position (`maximumAge: 30_000`) is sufficient
- CONSTRAINT: no auto-request on mount — `watchPosition` started on mount would violate this

[ASSUMED] — `getCurrentPosition` with `maximumAge: 30_000` is the right choice for this UX pattern. Continuous tracking can be added in v2 if needed.

### Map Integration Pattern

```tsx
// Inside Kartta.tsx
const { status, coords, requestLocation } = useGPS()

// Map center: use user coords if granted, else TAMPERE
const mapCenter = coords ?? TAMPERE

// GPS button — triggers on tap only
<button onClick={requestLocation} disabled={status === 'requesting'}>
  {status === 'requesting' ? (
    <span>Haetaan sijaintia...</span>
  ) : (
    <span>Käytä sijaintiani</span>
  )}
</button>
```

**Silent Tampere fallback:** When `coords` is `null` (status: idle, denied, unavailable, timeout), `mapCenter` resolves to `TAMPERE`. No error message shown to user. This satisfies MAP-01: "if permission denied, Tampere center is the silent default."

### iOS Safari Notes

- iOS Safari requires HTTPS for `navigator.geolocation` — dev server must be HTTPS or use localhost (localhost is granted special geolocation permission)
- iOS 12.2+ requires a user gesture to trigger the prompt — `onClick` satisfies this
- iOS Safari may show the permission dialog twice on first visit — this is platform behavior, not a bug [ASSUMED from training knowledge — not verified against Safari release notes]

---

## Distance Calculation

### haversineKm() — Pure Utility

```typescript
// lib/geo.ts

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Haversine formula — returns distance in kilometers.
 * Accurate to ~0.3% for distances under 1000km (adequate for city-scale use).
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}
```

### Finnish Distance Formatter

```typescript
// lib/geo.ts (continued)

/**
 * Format distance for Finnish locale (comma as decimal separator).
 * < 100 m:   "< 100 m"
 * < 1000 m:  "450 m"
 * < 10 km:   "1,2 km"  (1 decimal)
 * >= 10 km:  "12 km"   (no decimal)
 */
export function formatDistance(km: number): string {
  const meters = km * 1000

  if (meters < 100) return '< 100 m'
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`  // round to 50m
  if (km < 10) {
    // Finnish locale: comma as decimal separator
    return `${km.toFixed(1).replace('.', ',')} km`
  }
  return `${Math.round(km)} km`
}
```

### Memoization Strategy

50 venues × 1 GPS update = 50 haversine calls. Each call is ~10μs (pure trig, no I/O). Total: ~0.5ms — not a performance problem. However, memoize to avoid recalculation on unrelated re-renders:

```typescript
// In Kartta.tsx or a shared context
const distancesMap = useMemo<Record<string, number>>(() => {
  if (!coords) return {}
  return Object.fromEntries(
    paikatKartalla.map(p => [
      p.id,
      haversineKm(coords.lat, coords.lng, p.latitude, p.longitude)
    ])
  )
}, [coords, paikatKartalla])
```

Pass `distancesMap` as prop to venue cards. Cards render `formatDistance(distancesMap[p.id])` or nothing if key absent (no GPS).

**No external library needed** — the haversine formula is 10 lines. [ASSUMED] — this claim is based on the formula's well-known properties; no library verification done.

---

## Pin Design with AdvancedMarker

### Migrating SportPin from OverlayView

The existing `SportPin` component in `Kartta.tsx` uses `<OverlayView>` as a positioning wrapper. With `<AdvancedMarker>`, the wrapper is no longer needed — the entire `SportPin` body (the `motion.div` at line 44 through line 120) becomes the child:

**Before (Kartta.tsx lines 37–121):**
```tsx
<OverlayView
  position={{ lat: paikka.latitude, lng: paikka.longitude }}
  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
  getPixelPositionOffset={() => PIN_OFFSET}
>
  <motion.div initial={...} animate={...} ...>
    {/* pin SVG + label */}
  </motion.div>
</OverlayView>
```

**After:**
```tsx
// In the map render loop:
<AdvancedMarker
  key={paikka.id}
  position={{ lat: paikka.latitude, lng: paikka.longitude }}
  zIndex={isActive ? 999 : index + 1}
>
  <SportPin
    paikka={paikka}
    index={index}
    isActive={isActive}
    isDark={isDark}
    onClick={() => setValittu(valittu?.id === paikka.id ? null : paikka)}
  />
</AdvancedMarker>
```

**Update `SportPin` component — remove OverlayView wrapper, keep everything else:**

```tsx
// SportPin no longer uses OverlayView — remove the outer wrapper
// The entire motion.div block (lines 44–119 of Kartta.tsx) stays unchanged
// Remove: OverlayView import, PIN_OFFSET constant, OverlayView wrapper element
// Keep: motion.div with initial/animate/transition, label tooltip, SVG pin, Icon overlay
```

`<AdvancedMarker>` positions the child DOM such that its **bottom-center** is at the lat/lng. The existing `SportPin` SVG is 28×38px with the point at the bottom — this aligns correctly without `getPixelPositionOffset`. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker]

### Etusivu.tsx Simplified Pins

`Etusivu.tsx` uses `getMarkerIcon()` which builds SVG data URIs and passes them to `<Marker icon={...}>`. With `<AdvancedMarker>`, replace with a lightweight inline SVG child:

```tsx
// Replaces getMarkerIcon() in Etusivu.tsx
function SimplePin({ paikka }: { paikka: Liikuntapaikka }) {
  const color = lajiKonfig[paikka.laji]?.color ?? '#6b7280'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" width={28} height={38}>
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 5.25 2.875 9.83 7.125 12.3L14 38l6.875-11.7C25.125 23.83 28 19.25 28 14 28 6.268 21.732 0 14 0Z"
        fill={color}
      />
    </svg>
  )
}
```

No `isLoaded` guard needed around the marker — `<AdvancedMarker>` only renders after the Maps API is ready.

### Clustering with @googlemaps/markerclusterer

`@googlemaps/markerclusterer` v2.6.2 is already in `package.json`. [VERIFIED: npm registry]

The vis.gl documentation shows a callback-ref pattern where child markers report their `google.maps.marker.AdvancedMarkerElement` instances back to a parent via a `setMarkerRef` callback. The parent then passes all instances to `new MarkerClusterer({ map, markers })`. [CITED: visgl.github.io/react-google-maps/examples/marker-clustering]

**Note for Phase 2:** Clustering is a stretch goal. The 50-venue dataset does not need clustering. Implement basic AdvancedMarker pins first; add clustering only if pins overlap badly during UAT.

---

## Migration Sequence (Ordered Tasks)

The sequence is designed so the map remains functional at every step — no "map is broken mid-migration" state.

### Wave 0 — Setup (non-breaking additions)

1. Add `<APIProvider>` to `app/layout.tsx` — wrap the existing body. Nothing breaks; `@react-google-maps/api` still works in parallel temporarily.
2. Create `lib/constants.ts` with `TAMPERE` constant. Update all 4 files that duplicate it.
3. Create `lib/geo.ts` with `haversineKm()` and `formatDistance()`.
4. Create `hooks/useGPS.ts`.
5. Add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to `.env.local` (use `"DEMO_MAP_ID"` for dev).

### Wave 1 — Migrate Kartta.tsx

6. Rewrite `Kartta.tsx`:
   - Remove `useJsApiLoader` import and call.
   - Remove `OverlayView` wrapper from `SportPin` — keep the inner `motion.div` body.
   - Replace `<GoogleMap>` with `<Map mapId={...} defaultCenter defaultZoom>`.
   - Replace `<OverlayView>`-wrapped markers with `<AdvancedMarker>` + `<SportPin>`.
   - Add `<MapStyleController>` child for day/night styles.
   - Add `useGPS` hook + GPS button.
   - Add `distancesMap` useMemo for distance calculation.
7. Wire `app/page.tsx`: add `searchParams.nakyma === 'kartta'` → render `Kartta` (lazy-loaded).
8. Update `app/components/BottomNav.tsx`: add/update tab for `?nakyma=kartta`.
9. UAT: verify `/?nakyma=kartta` renders Kartta, GPS button works, Tampere fallback works, pins animate correctly.

### Wave 2 — Migrate Etusivu.tsx Preview + Fullscreen Map

10. In `Etusivu.tsx`:
    - Remove `useJsApiLoader` call (APIProvider is in layout now).
    - Remove `isLoaded` guard on map render — replace with `useApiIsLoaded()` hook if a loading guard is still needed.
    - Replace `<GoogleMap>` (preview) with `<Map mapId={...}>` + `<SimplePin>` as `<AdvancedMarker>` children.
    - Replace `<GoogleMap>` (fullscreen) with `<Map>` + `<AdvancedMarker>/<SportPin>`.
    - Remove `getMarkerIcon()` function (no longer needed).
    - Remove `mapInstanceRef`, `previewMapRef`, `onFullscreenMapLoad`, `onPreviewMapLoad` — replace with `<MapStyleController>` children.
    - Remove `window.google.maps.event.trigger(map, 'resize')` in `onAnimationComplete` — not needed.
11. Remove `@react-google-maps/api` from `package.json`.
12. Final UAT: no flash, preview map renders, fullscreen animation works, day/night toggle applies styles.

### Wave 3 — Distance Strings on Cards

13. Thread `userCoords` from `Kartta.tsx` up/down as needed, or use React context.
14. Display `formatDistance(distancesMap[p.id])` on venue cards (MAP-02).

---

## Risks and Mitigations

### Risk 1: mapId is required and DEMO_MAP_ID may not work in production

**What:** Google's `AdvancedMarker` requires a `mapId`. `DEMO_MAP_ID` is a testing constant.
**Evidence:** Official Google docs and @vis.gl docs both state mapId is mandatory. `DEMO_MAP_ID` is shown in examples without a production caveat. [CITED: developers.google.com/maps/documentation/javascript/advanced-markers/migration]
**Mitigation:** Create a real Map ID in Google Cloud Console before production deploy. It takes 30 seconds and has no billing impact for JavaScript maps. Add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` env var. Fall back to `DEMO_MAP_ID` in dev/preview environments.

### Risk 2: Legacy JSON styles (Aubergine night) may not apply with mapId

**What:** When `mapId` is set, legacy raster `styles` apply only to light color scheme. The existing Aubergine night style may be partially overridden.
**Evidence:** @vis.gl documentation notes this limitation. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/map]
**Mitigation:** Test during UAT. If styles are lost, consider Cloud-based styled maps (create a styled map in Cloud Console and reference its mapId). As fallback, use `colorScheme="DARK"` for night mode instead of legacy JSON styles.

### Risk 3: AdvancedMarker bottom-center anchor differs from OverlayView PIN_OFFSET

**What:** `Kartta.tsx` uses `PIN_OFFSET = { x: -14, y: -38 }` to offset the OverlayView so the pin SVG bottom-tip is at the coordinate. AdvancedMarker's default anchor is bottom-center of the content div.
**Evidence:** @vis.gl docs confirm bottom-center anchor. [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker]
**Mitigation:** The existing `SportPin` SVG is 28×38px. Bottom-center of a 28px-wide element is 14px from left, which matches `PIN_OFFSET.x = -14`. Height 38px with bottom anchor means the tip is at the coordinate. Alignment should be correct without additional offset. Verify visually during UAT.

### Risk 4: Framer Motion animations inside AdvancedMarker portals

**What:** AdvancedMarker places children in a DOM portal outside the normal React tree. Framer Motion's `AnimatePresence` and layout animations may not work across portal boundaries.
**Evidence:** [ASSUMED] — AdvancedMarker's portal behavior is documented but interaction with AnimatePresence is not explicitly tested in official docs.
**Mitigation:** The existing `SportPin` in `Kartta.tsx` uses `initial/animate/transition` on `motion.div` — these are CSS-property animations that do not require the React tree hierarchy. They should work in a portal. Do NOT use `layout` animations or `AnimatePresence` inside pins — these can break across portal boundaries. Keep `whileHover` and `animate` scale/opacity only.

### Risk 5: Google Maps JS API already loaded by another script

**What:** If the project ever adds a `<script src="maps.googleapis.com/maps/api/js">` tag manually (e.g., in `_document.tsx` or via next/script), it will conflict with APIProvider's Dynamic Library Import.
**Evidence:** APIProvider detects existing `google.maps.importLibrary` and skips its own load [CITED: visgl.github.io/react-google-maps/docs/api-reference/components/api-provider] — but a legacy script tag appended after APIProvider can still cause a conflict.
**Mitigation:** Grep for any existing Maps script tags before migration: `grep -r "maps.googleapis.com" app/`. The codebase currently has none (only the npm library is used).

### Risk 6: iOS Safari HTTPS requirement during development

**What:** iOS Safari blocks `navigator.geolocation` on non-HTTPS origins (except localhost).
**Evidence:** This is a well-documented platform policy. [ASSUMED — not verified against current Safari docs in this session]
**Mitigation:** Use `localhost` for local dev (always granted geolocation). Deploy to HTTPS. The Tampere fallback silently handles the unavailability case — the GPS button simply does not produce results.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vis.gl/react-google-maps` | 1.8.3 | Google Maps React wrapper | Official vis.gl / Google-endorsed; Dynamic Library Import prevents double-load |
| `@googlemaps/markerclusterer` | 2.6.2 | Marker clustering | Already in package.json; official Google library; works with AdvancedMarkerElement |

### Supporting (already installed, no change)
| Library | Version | Purpose |
|---------|---------|---------|
| `framer-motion` | 12.38.0 | Pin animations, bottom sheet |
| `lucide-react` | 1.16.0 | Sport icons inside pins |

### New Files (no extra packages)
| File | Purpose |
|------|---------|
| `lib/geo.ts` | `haversineKm()` + `formatDistance()` — pure functions, no dependency |
| `lib/constants.ts` | `TAMPERE` constant deduplication |
| `hooks/useGPS.ts` | GPS state machine — uses browser `navigator.geolocation` only |

**Installation:**
```bash
npm install @vis.gl/react-google-maps
npm uninstall @react-google-maps/api
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@vis.gl/react-google-maps` | npm | ~2 yrs (Sep 2023) | High (Google-endorsed) | github.com/visgl/react-google-maps | [OK] | Approved |
| `@googlemaps/markerclusterer` | npm | ~4 yrs (Sep 2021) | High (Google official) | github.com/googlemaps/js-markerclusterer | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No postinstall scripts found on either package. Both packages are owned by their respective organizations (vis.gl / Google). [VERIFIED: npm registry — both pass slopcheck [OK] as of 2026-05-20]

---

## Common Pitfalls

### Pitfall 1: Controlled center/zoom causes map pan on every render

**What goes wrong:** Using `center={mapCenter}` and `zoom={14}` (controlled) on `<Map>` causes the map to programmatically pan and zoom every time the parent component re-renders — even unrelated state updates.
**Why it happens:** `MapProps.center` is a controlled prop that triggers `map.panTo()` on every change.
**How to avoid:** Use `defaultCenter` and `defaultZoom` for initial position. Only use `center` (controlled) when you explicitly want to programmatically pan the map (e.g., after GPS resolves). Use `map.panTo()` via `useMap()` hook for explicit programmatic panning.
**Warning signs:** Map jumps back to Tampere when filter pills are clicked.

### Pitfall 2: APIProvider in layout.tsx but also useJsApiLoader in a component

**What goes wrong:** If `useJsApiLoader` calls from the old library are not fully removed, two separate loading mechanisms run simultaneously, causing "Google Maps already loaded" console errors and potentially a blank map.
**Why it happens:** Forgetting to remove `useJsApiLoader` calls in `Etusivu.tsx` or `Kartta.tsx` after placing `<APIProvider>` in layout.
**How to avoid:** Search for `useJsApiLoader` and `LoadScript` across all files before considering migration complete.
**Warning signs:** Console warning: "Google Maps JavaScript API loaded multiple times".

### Pitfall 3: AdvancedMarker without mapId silently renders nothing

**What goes wrong:** Map renders, no error, but all markers are invisible.
**Why it happens:** `<AdvancedMarker>` requires `mapId` on the parent `<Map>`. If omitted, the `AdvancedMarkerElement` is not created.
**How to avoid:** Always include `mapId` on `<Map>`. Use `mapId="DEMO_MAP_ID"` in development.
**Warning signs:** No markers visible, no console error.

### Pitfall 4: GPS auto-request on mount

**What goes wrong:** `useEffect(() => { requestLocation() }, [])` in `Kartta.tsx`.
**Why it happens:** Developer instinct to "preload" location data.
**How to avoid:** CONSTRAINT from CLAUDE.md — GPS must only be triggered by explicit user tap. `requestLocation()` should only ever be called from a button `onClick`. Never call it in `useEffect` with empty deps.
**Warning signs:** Browser location prompt appears immediately when navigating to map view.

### Pitfall 5: Styles lost after mapId is set

**What goes wrong:** Day/night map styles (Aubergine night theme) stop applying after `mapId` is added.
**Why it happens:** Cloud-based styled maps (mapId) and legacy raster JSON styles can conflict on certain map types/color schemes.
**How to avoid:** Test both day and night styles with the actual `mapId` during UAT. If styles are dropped, switch to a cloud-based styled map by creating a style in Google Cloud Console and linking the mapId to it.
**Warning signs:** Map ignores `setOptions({ styles })` calls, displays default Google styling.

---

## Code Examples

### APIProvider in layout.tsx

```tsx
// Source: visgl.github.io/react-google-maps/docs/api-reference/components/api-provider
import { APIProvider } from '@vis.gl/react-google-maps'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
          <NavBar />
          {children}
          <BottomNav />
        </APIProvider>
      </body>
    </html>
  )
}
```

### Basic Map with AdvancedMarker

```tsx
// Source: visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { TAMPERE } from '@/lib/constants'

<Map
  mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'}
  defaultCenter={TAMPERE}
  defaultZoom={14}
  style={{ width: '100%', height: '100%' }}
  disableDefaultUI
>
  {paikatKartalla.map((p, i) => (
    <AdvancedMarker
      key={p.id}
      position={{ lat: p.latitude, lng: p.longitude }}
      onClick={() => setValittu(p)}
    >
      <SportPin paikka={p} isActive={valittu?.id === p.id} isDark={isDark} index={i} onClick={() => {}} />
    </AdvancedMarker>
  ))}
  <MapStyleController isDark={isDark} />
</Map>
```

### useMap for day/night style switching

```tsx
// Source: visgl.github.io/react-google-maps/docs/guides/interacting-with-google-maps-api
import { useMap } from '@vis.gl/react-google-maps'
import { DAY_MAP_STYLES, NIGHT_MAP_STYLES } from '@/lib/mapStyles'

function MapStyleController({ isDark }: { isDark: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    map.setOptions({
      styles: (isDark ? NIGHT_MAP_STYLES : DAY_MAP_STYLES) as google.maps.MapTypeStyle[],
    })
  }, [map, isDark])
  return null
}
```

### Complete useGPS hook

```typescript
// hooks/useGPS.ts — see full implementation in ## useGPS Hook Design section above
```

### haversineKm + formatDistance

```typescript
// lib/geo.ts — see full implementation in ## Distance Calculation section above
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — project uses manual UAT pattern (see .planning/codebase/TESTING.md) |
| Config file | None |
| Quick run command | `npx tsc --noEmit` (type-check only) |
| Full suite command | `npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | GPS button triggers prompt; map centers on user; Tampere fallback if denied | Manual UAT | — (no automated framework) | ❌ Wave 0 |
| MAP-02 | Distance string "1,2 km" appears on venue cards and updates with location | Manual UAT | — | ❌ Wave 0 |
| MAP-03 | Map renders without double-load flash; pins appear in single paint | Manual UAT + TypeScript build | `npx tsc --noEmit` | ❌ Wave 0 |

**Note:** `haversineKm()` and `formatDistance()` are pure functions — they CAN be unit tested. Recommend adding `lib/geo.test.ts` with vitest (no browser needed). This is the one area where automated testing would provide real value in Phase 2.

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit && npm run lint`
- **Per wave merge:** Full manual UAT checklist
- **Phase gate:** All UAT items pass before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/geo.test.ts` — unit tests for `haversineKm()` and `formatDistance()` (optional but recommended)
- [ ] No framework install needed unless adding geo unit tests

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useJsApiLoader` injects `<script>` tag per mount | `<APIProvider>` uses Dynamic Library Import | @vis.gl v1.0 (Sep 2023) | Eliminates double-load flash |
| `<Marker icon={svgDataUri}>` | `<AdvancedMarker>` with JSX children | Google Maps JS API v3.55+ | Full React component trees as pins |
| `<OverlayView>` for custom HTML pins | `<AdvancedMarker>` with JSX children | @vis.gl v1.0 | No manual pixel-offset math |
| `onLoad` callback ref for map instance | `useMap()` hook | @vis.gl v1.0 | Cleaner hook-based access |

**Deprecated/outdated:**
- `<Marker>` (legacy): Deprecated by Google as of Maps JS API v3.55; will be removed in a future version. `<AdvancedMarker>` is the replacement.
- `getPixelPositionOffset` on `OverlayView`: Not a concept in @vis.gl — AdvancedMarker handles positioning declaratively.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install | ✓ | v24.15.0 | — |
| npm | Package install | ✓ | 11.12.1 | — |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps rendering | ✓ (assumed from Phase 1 UAT passing) | — | Map does not render |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | AdvancedMarker | ✗ (not yet in env) | — | Use `DEMO_MAP_ID` string literal |
| HTTPS | iOS GPS | ✓ (localhost works for dev) | — | GPS unavailable on HTTP non-localhost |

**Missing dependencies with no fallback:** None that block development.
**Missing dependencies with fallback:**
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` — not yet in `.env.local`; use `"DEMO_MAP_ID"` string for Wave 1 development. Add real Map ID before production deploy.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getCurrentPosition` with `maximumAge: 30_000` is sufficient (no `watchPosition` needed) | useGPS Hook Design | If users want real-time tracking, hook must be rebuilt. Low risk for Phase 2 MVP. |
| A2 | iOS Safari may show permission dialog twice on first visit | useGPS Hook Design — iOS Notes | Minor UX confusion; not a functional bug |
| A3 | Bottom-center anchor of AdvancedMarker aligns correctly with existing 28×38px SVG pin | Pin Design | If wrong, pins appear offset from venues. Visual UAT will catch it. Fix: `anchorPoint` prop on AdvancedMarker |
| A4 | Framer Motion `initial/animate/transition` animations work inside AdvancedMarker portals | Pin Design | If wrong, pins appear without animation. Fix: replace Framer Motion with CSS transitions inside pins |
| A5 | `DEMO_MAP_ID` works in production | mapId Requirement | If Google blocks it, all markers invisible in production. Mitigation: always create real mapId before deploy |
| A6 | iOS Safari blocks geolocation on non-HTTPS (except localhost) | useGPS — iOS Notes | If policy has changed, note may mislead. Functional fallback (Tampere) handles it regardless. |

---

## Open Questions

1. **Should the BottomNav "Lista" tab be changed to "Kartta"?**
   - What we know: Current BottomNav has Koti / Lista / Suosikit. CLAUDE.md says Kartta should be at `?nakyma=kartta`. There is no Kartta tab currently.
   - What's unclear: Should "Lista" be renamed to "Kartta", or should a 4th tab be added?
   - Recommendation: Replace "Lista" tab with "Kartta" (`?nakyma=kartta`). The list view (`?nakyma=lista`) is accessible via URL but does not need a dedicated bottom-nav slot in Phase 2.

2. **Where should GPS distance strings appear in Etusivu.tsx?**
   - What we know: MAP-02 requires distance on "every venue card". `Etusivu.tsx` does not show individual venue cards — it shows a fullscreen map with a bottom sheet.
   - What's unclear: Does MAP-02 require distance in the Etusivu bottom sheet, the Kartta bottom sheet, or both?
   - Recommendation: Show distance in Kartta.tsx bottom sheet (the tapped venue popup). The `Etusivu.tsx` bottom sheet can also show distance if `coords` are available. Phase 2 UAT success criteria #3 says "every venue card in list and map view" — implement in both.

---

## Sources

### Primary (HIGH confidence)
- `visgl.github.io/react-google-maps/docs/api-reference/components/api-provider` — APIProvider props, double-load prevention mechanism
- `visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker` — mapId requirement, JSX children, bottom-center anchor
- `visgl.github.io/react-google-maps/docs/api-reference/components/map` — Map props, styles prop, defaultCenter vs center
- `visgl.github.io/react-google-maps/docs/guides/interacting-with-google-maps-api` — useMap hook, setOptions pattern
- `developers.google.com/maps/documentation/javascript/advanced-markers/migration` — mapId requirement from Google
- `developer.mozilla.org/en-US/docs/Web/API/Geolocation_API/Using_the_Geolocation_API` — getCurrentPosition vs watchPosition, error codes, PositionOptions
- npm registry — `@vis.gl/react-google-maps` v1.8.3, `@googlemaps/markerclusterer` v2.6.2

### Secondary (MEDIUM confidence)
- `github.com/visgl/react-google-maps/discussions/689` — mapId workarounds, OverlayView as alternative (maintainer statement)
- `visgl.github.io/react-google-maps/examples/marker-clustering` — MarkerClusterer callback-ref pattern

### Tertiary (LOW confidence — see Assumptions Log)
- Training knowledge: iOS Safari HTTPS requirement, getCurrentPosition UX patterns, Framer Motion portal behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both packages verified on npm registry, slopcheck [OK], official documentation fetched
- Architecture: HIGH — based on direct code inspection of all 6 relevant files + official API docs
- Pitfalls: HIGH (pitfalls 1–4) / MEDIUM (pitfalls 5) — all derived from documented API behavior
- GPS hook: MEDIUM — API is standard MDN-documented; iOS-specific behavior is ASSUMED

**Research date:** 2026-05-20
**Valid until:** 2026-08-20 (stable APIs; @vis.gl releases minor updates but APIProvider/AdvancedMarker/Map are stable since v1.0)
