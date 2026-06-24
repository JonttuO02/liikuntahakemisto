# Phase 58: Admin-sijaintikartta - Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 1 modified (`app/admin/[id]/page.tsx`), 0 new files required (component extraction left to executor discretion per CONTEXT.md)
**Analogs found:** 4 / 4 (all strong matches — this phase composes existing, already-built primitives)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/admin/[id]/page.tsx` (add "Sijainti" section) | component (page section) | request-response (data already loaded client-side via existing `fetch`) | `app/admin/[id]/page.tsx` itself — existing "Listakortti/Diagonaalikortti/Profiilisivu" sections (lines 175-198) | exact (self-pattern reuse) |
| Map container markup inside new section | component (map viewer) | event-driven (click toggles local state) | `app/components/SijaintiPicker.tsx` lines 115-130 (container sizing/style) | exact |
| Marker/pin/card composition inside new section | component (map marker) | event-driven | `app/components/Etusivu.tsx` lines 883-930 (AdvancedMarker + SportPin + CalloutCard composition) — **must omit the onClick-opens-sheet handler at line 911** | role-match (behavioral subset) |

No new files are strictly required — CONTEXT.md leaves "whether to extract a small `AdminVenueMap` component or inline it" to executor discretion. If extracted, treat it as a `component` with the same analogs above (e.g. `app/components/AdminVenueMap.tsx`).

## Pattern Assignments

### `app/admin/[id]/page.tsx` — new "Sijainti" section (component, request-response/event-driven)

**Analog 1 (page section structure):** `app/admin/[id]/page.tsx` lines 174-198 (existing Listakortti/Diagonaalikortti/Profiilisivu sections)

```tsx
{/* Venue preview — same components as onboarding StepEsikatselu */}
{paikka && (
  <>
    <div className="flex flex-col gap-2">
      <SectionLabel>Listakortti</SectionLabel>
      <PaikkaKortti paikka={paikka} />
    </div>

    <div className="flex flex-col gap-2">
      <SectionLabel>Diagonaalikortti</SectionLabel>
      <DiagonaalKortti paikka={paikka} />
    </div>

    <div className="flex flex-col gap-2">
      <SectionLabel>Profiilisivu</SectionLabel>
      <PaikkaSheet
        paikka={paikka}
        preview={true}
        todo={false}
        onClose={() => {}}
        onToggleTodo={() => {}}
      />
    </div>
  </>
)}
```

The new "Sijainti" section must follow this exact shape — `<div className="flex flex-col gap-2"><SectionLabel>Sijainti</SectionLabel>{/* map */}</div> — and per UI-SPEC.md placement, it goes **first**, before "Listakortti" (between the "Toiminnot" block ending at line 172 and this `{paikka && (` block at line 175). `SectionLabel` is defined locally in this same file at lines 204-206:

```tsx
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">{children}</p>
}
```

The `paikka` variable is already destructured at line 97 (`const paikka = link.liikuntapaikat`) and is `Liikuntapaikka | null`, so the new section can reuse the same `{paikka && (...)}` guard — no new loading/error state needed.

**Analog 2 (map container sizing):** `app/components/SijaintiPicker.tsx` lines 115-130

```tsx
<div className="relative rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.07)]" style={{ width: '100%', height: '320px' }}>
  <Map
    mapId={MAP_ID}
    defaultCenter={defaultCenter}
    defaultZoom={13}
    gestureHandling="greedy"
    style={{ width: '100%', height: '320px' }}
    onClick={handleMapClick}
  >
    {pin && (
      <AdvancedMarker position={pin} draggable onDragEnd={handleDragEnd} />
    )}
    <AutocompleteZoomHandler target={autocompleteTarget} />
  </Map>
  <RecenterButton coords={coords} />
</div>
```

Module-level `MAP_ID` constant pattern (`SijaintiPicker.tsx` line 13):

```tsx
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
```

For the admin map: reuse this container/style exactly, but `defaultZoom={15}` per D-07/UI-SPEC (not 13), no `draggable`, no `RecenterButton`/GPS, and `onClick` on `<Map>` is optional (UI-SPEC line 101 — left to executor discretion, mirrors `Etusivu.tsx`'s `onClick={() => setValittu(null)}` dismiss-on-background-click pattern if implemented).

**Analog 3 (marker/pin/card composition — what to replicate AND what to omit):** `app/components/Etusivu.tsx` lines 883-930

```tsx
{mapItems.map((item, index) => {
  const [lng, lat] = item.geometry.coordinates

  if (!('cluster' in item.properties && item.properties.cluster)) {
    const p = (item.properties as VenuePoint).paikka
    return (
      <AdvancedMarker key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={index}>
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          <AnimatePresence initial={false}>
            {(zoomLevel < 16 || nearestCardId !== p.id) && valittu?.id !== p.id && (
              <motion.div key="pin"
                style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)' }}
                exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                onClick={() => {
                  setAutoZoomTarget({ lat: p.latitude, lng: p.longitude })
                  setSearchOpen(false)
                }}>
                <SportPin laji={p.laji} animDelay={pinAnimDelay(p.id)} />
              </motion.div>
            )}
            {zoomLevel >= 16 && nearestCardId === p.id && valittu?.id !== p.id && (
              <motion.div key="card"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)', overflow: 'visible' }}>
                <motion.div
                  layoutId={`vc-${p.id}`}
                  onClick={e => {
                    e.stopPropagation()
                    setSearchOpen(false)
                    if (zoomRef.current >= 16) {
                      setValittu(p)
                    } else {
                      pendingValittuRef.current = p
                      setAutoZoomTarget({ lat: p.latitude, lng: p.longitude })
                    }
                  }}>
                  <CalloutCard p={p} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AdvancedMarker>
    )
  }
  // ...cluster branch — NOT applicable, admin map has no clustering
})}
```

**Critical deviation for the admin map (per D-08/UI-SPEC lines 88, 96-100):**
- Only ONE `AdvancedMarker` (no `.map()` over a collection, no cluster branch, no `mapItems`/Supercluster).
- Pin→card swap driven by simple local `useState<boolean>` toggle on click, NOT by `zoomLevel`/`nearestCardId` logic (no AnimatePresence/zoom-level logic required — UI-SPEC line 99 explicitly says a simple show/hide is sufficient).
- The `onClick` that opens `PaikkaSheet`/`setValittu` (Etusivu.tsx line 911-921) **must be omitted entirely** — the `CalloutCard` wrapper here gets NO `onClick` prop at all (not even a no-op stopPropagation-only handler). Per UI-SPEC line 88/100: implement as the *absence* of a handler.
- The pin's own `onClick` (Etusivu.tsx line 898, which normally pans/zooms) is replaced with the show/hide toggle for `CalloutCard`.

**Imports needed** (combine from `Etusivu.tsx` lines 8, 19-20 and `SijaintiPicker.tsx` lines 1-4):

```tsx
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import SportPin from '@/app/components/SportPin'
import CalloutCard from '@/app/components/CalloutCard'
```

(If inlined directly in `app/admin/[id]/page.tsx`, adjust import paths to relative `./` or `@/app/components/...` per existing file's style — note the page already imports sibling components with the `@/app/components/...` alias, e.g. line 6-8: `import PaikkaKortti from '@/app/components/PaikkaKortti'`.)

**CalloutCard prop shape** — `CalloutCard` requires `p: Liikuntapaikka & { latitude: number; longitude: number }` (`CalloutCard.tsx` lines 58-63). Since `paikka.latitude`/`longitude` are typed nullable (`number | null`) in `lib/types.ts` but confirmed always populated (D-10), the executor will need a type-narrowing pattern (e.g. a local guard or non-null assertion) when passing `paikka` to `CalloutCard` — Etusivu.tsx doesn't show this exact narrowing since its `VenuePoint` type already guarantees non-null. No analog has this exact narrowing; flag as **no analog found** — executor's discretion (simple `paikka.latitude != null && paikka.longitude != null` guard, or non-null assertion, suffices since D-10 confirms data is never null in practice).

---

## Shared Patterns

### APIProvider — already mounted globally
**Source:** `app/components/MapProvider.tsx`
**Apply to:** New map section — no setup needed, it inherits the provider as a descendant.
```tsx
'use client'
import { APIProvider } from '@vis.gl/react-google-maps'
const LIBRARIES: string[] = ['places']
export default function MapProvider({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''} libraries={LIBRARIES}>
      {children}
    </APIProvider>
  )
}
```
Confirmed mounted in `app/layout.tsx` (wraps the whole app) — no action needed for this phase.

### Map container styling (SijaintiPicker precedent)
**Source:** `app/components/SijaintiPicker.tsx` lines 13, 115-122
**Apply to:** New map section's outer `<div>` and `<Map>` style props — exact match required per D-09/UI-SPEC.
```tsx
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
// ...
<div className="relative rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.07)]" style={{ width: '100%', height: '320px' }}>
  <Map mapId={MAP_ID} defaultCenter={...} defaultZoom={15} gestureHandling="greedy" style={{ width: '100%', height: '320px' }}>
    ...
  </Map>
</div>
```

### SectionLabel + bare-div section pattern (no glass wrapper)
**Source:** `app/admin/[id]/page.tsx` lines 177-198, 204-206
**Apply to:** The new "Sijainti" section's wrapper — explicitly does NOT use `glass rounded-2xl p-5` (UI-SPEC line 46 — avoids double-bordering since the map container supplies its own border).
```tsx
<div className="flex flex-col gap-2">
  <SectionLabel>Sijainti</SectionLabel>
  {/* map container */}
</div>
```

### Data already available — no new fetch needed
**Source:** `app/api/admin/applications/[id]/route.ts` line 24
```
.select(`...liikuntapaikat(id, nimi, osoite, kaupunki, laji, kuvaus, puhelin, varauslinkki, hinta_min, hinta_max, hinta_kuvaus, aukioloajat, image_url, photo_urls, logo_url, latitude, longitude)`)
```
`latitude`/`longitude` are already selected and returned to the admin detail page's `paikka` object (`app/admin/[id]/page.tsx` line 97). No API route changes needed for this phase.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Type-narrowing `paikka.latitude`/`longitude` (nullable) → `CalloutCard`'s non-null prop type | utility/type-guard | transform | No existing call site narrows `Liikuntapaikka`'s nullable lat/lng before passing to `CalloutCard` — `Etusivu.tsx`'s `VenuePoint` type already guarantees non-null at the type level. Executor should add a simple null check or non-null assertion since D-10 confirms data is always populated in practice. |
| Single-marker show/hide toggle (no zoom-level/clustering logic) | event-driven state | transform | No existing map component in the codebase does a *simple* click-to-toggle pin↔card without the zoom-level/AnimatePresence machinery in `Etusivu.tsx`. This is a deliberately simplified subset per UI-SPEC line 99 — executor should write a plain `useState<boolean>` toggle, no analog to copy verbatim. |

## Metadata

**Analog search scope:** `app/admin/[id]/page.tsx`, `app/components/Etusivu.tsx`, `app/components/SijaintiPicker.tsx`, `app/components/SportPin.tsx`, `app/components/CalloutCard.tsx`, `app/components/MapProvider.tsx`, `app/api/admin/applications/[id]/route.ts`
**Files scanned:** 7 (all named explicitly in CONTEXT.md's `<canonical_refs>` — no additional Glob/Grep discovery needed since the phase scope is fully pre-mapped by the discussion phase)
**Pattern extraction date:** 2026-06-24
