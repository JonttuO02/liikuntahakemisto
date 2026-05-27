# Phase 8: Map Features - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver three map capabilities built on the Phase 7 AdvancedMarker foundation:
1. A decorative white pulsing ring on the user location marker (MAP-05)
2. Zoom-dependent pin→mini-card transformation at zoom 16, with auto-zoom on pin tap and an expanded 90vh bottom sheet when the mini-card is tapped (MAP-06)
3. "Näytä kartalla" on the venue profile page links to `/?id=<paikka_id>` (in-app, no external Google Maps), centering and zooming the map to that venue at zoom 16 (MAP-07)

Requirements: MAP-05, MAP-06, MAP-07.

**Out of scope:** Marker clustering (explicitly replaced by zoom-based card transformation), multi-city filter on map, any auth or favorites work.

</domain>

<decisions>
## Implementation Decisions

### GPS Accuracy Ring (MAP-05)
- **D-01:** Fixed decorative ring — no real GPS accuracy math. `useGPS` hook does NOT need to be changed; the `accuracy` field from the Geolocation API is NOT used.
- **D-02:** Ring color: white. Animation style: outward ripple (scale 0.5→2.0 + opacity 0.6→0, `repeat: Infinity`). Uses Framer Motion `animate` on a `<motion.div>` ring element.
- **D-03:** Ring is added inside the AdvancedMarker user location `<div>` — same element that currently holds the translucent blue ring + inner solid blue circle (from Phase 7 CONTEXT.md `<specifics>`). The white ripple ring layers on top of / around the existing blue dot.

### Zoom-Based Pin→Card Transformation (MAP-06)
- **D-04:** Zoom threshold = **16**. At `zoom >= 16`, each venue AdvancedMarker renders a mini-card instead of the pin `<img>`. Below 16, renders the pin as before.
- **D-05:** Mini-card content: venue name (`font-bold text-sm text-[#111111]`) + sport pill (colored via `lajiKonfig[laji].color`) + price from `hintateksti()`.
- **D-06:** Pin→card transition: **fade crossfade** via `AnimatePresence`. Pin `exit={{ opacity: 0 }}`, card `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`. Stable `key` on each variant.
- **D-07:** **Auto-zoom on pin tap**: Tapping a pin at zoom < 16 triggers `map.panTo(pin.position)` + `map.setZoom(16)`. The pin transforms to a mini-card once zoom reaches the threshold. Replaces the current `setValittu(p)` call on pin click (setValittu is now triggered by the mini-card click, not the pin click).
- **D-08:** **Mini-card tap → big sheet**: Tapping a mini-card opens the large 90% height bottom sheet (calls `setValittu(p)`). Replaces the current bottom-sheet behavior.
- **D-09:** **Big bottom sheet redesign**: The bottom sheet expands to ~90vh (up from the current smaller size). Content includes everything on the current venue profile page: name, sport badge, open status, price, address, hours (HoursTable), phone, booking URL, description. No page navigation needed — all content is fetched from the `paikat` prop. Note: `aukiolo_json` (for hours) is already in `Liikuntapaikka` type — verify it passes through to Etusivu props.

### Map Focus via URL (MAP-07)
- **D-10:** "Näytä kartalla →" on `app/paikat/[id]/page.tsx` changes from an external `<a href="https://maps.google.com/...">` to an internal `<Link href={`/?id=${paikka.id}`}>`. Same Row/icon pattern stays.
- **D-11:** URL: `/?id=<paikka_id>`. **No `?nakyma=kartta`** — that param is dead per CLAUDE.md constraint. Etusivu is already the map homepage.
- **D-12:** `Etusivu.tsx` reads `id` from `useSearchParams()` on mount. If `id` matches a paikka: auto-open the fullscreen map (`setKartaAuki(true)` or equivalent), call `map.panTo(paikka.position)` + `map.setZoom(16)`. The mini-card for that venue is then visible.
- **D-13:** Big sheet does **NOT** auto-open when arriving via `/?id=`. Mini-card is visible; user taps it to expand the full sheet. This preserves intentionality.
- **D-14:** Fullscreen map opens automatically when `id` param is present (same as if user tapped the map toggle manually).

### Claude's Discretion
- Exact ring size (outer diameter), animation duration (~1.5–2s), and whether to stack 1 or 2 staggered rings for the ripple effect.
- Mini-card width cap and text truncation strategy for long venue names (suggest `max-w-[120px] truncate` or similar).
- How to pass `aukiolo_json` into Etusivu's big sheet if it's not currently in the paikat props (may need to add to the `app/page.tsx` SELECT).
- Exact threshold for `map.getZoom()` polling — recommend `onCameraChanged` from vis.gl to read zoom reactively without polling.
- Whether to extract the big bottom sheet into a separate component (e.g., `VenueSheet.tsx`) for readability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary component
- `app/components/Etusivu.tsx` — primary target for all three features. Contains both map instances, user location AdvancedMarker, pin render logic, bottom-sheet JSX (~lines 448–503), `useGPS` usage, `useMap` usage.

### Hooks and utilities
- `hooks/useGPS.ts` — NOT modified for Phase 8 (D-01). Returns `{ status, coords, requestLocation }`. No `accuracy` field needed.
- `lib/utils.ts` — `hintateksti()` for price display in mini-cards.
- `lib/lajit.ts` — `lajiKonfig` for sport pill colors in mini-cards.

### Profile page
- `app/paikat/[id]/page.tsx` — "Näytä kartalla →" link target (D-10). Change from external anchor to internal Link.

### Map library
- `@vis.gl/react-google-maps` v1.8.3 — `AdvancedMarker`, `useMap`, `onCameraChanged` event for reactive zoom reading.

### Design system
- `CLAUDE.md` — glassmorphism utilities, color tokens, animation rules, typography. Mini-card and big sheet must use `.glass` surface.
- `app/globals.css` — `.glass`, `.glass-btn`, `.glass-hover` definitions.

### Phase 7 context (predecessor patterns)
- `.planning/phases/07-map-infrastructure/07-CONTEXT.md` — user location AdvancedMarker HTML structure (`<specifics>` section), `useMap` pattern, `RecenterButton` pattern.

### Requirements
- `.planning/REQUIREMENTS.md` — MAP-05, MAP-06, MAP-07.

### URL routing constraint
- `CLAUDE.md` — "?nakyma=kartta is a dead parameter, never generate it in new code". Map focus URL is `/?id=<paikka_id>` only (D-11).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useMap()` from vis.gl — already used in `MapPanController` and `RecenterButton`. Use the same pattern inside a child component to call `map.panTo()` + `map.setZoom()`.
- `RecenterButton` pattern — child component inside `<Map>` that calls `useMap()`. Same pattern applies for the auto-zoom on-focus behavior (needs to be a child of `<Map>` to access the map instance).
- `glass-btn` / `.glass` — existing glass surface classes. Mini-card uses `.glass rounded-xl` or similar; big sheet uses `.glass`.
- `AnimatePresence` — already used in Etusivu for other transitions. Add it around pin/card variants per marker.
- `korttiVariants` from `PaikkaKortti.tsx` — not directly reusable here (wrong context), but the animation pattern is the same.

### Established Patterns
- `isDark` state in Etusivu — already controls mapId. Big sheet can also adapt styling for dark map mode if desired (Claude's discretion).
- `valittu` state — currently set on pin click. After Phase 8, set on mini-card click instead (D-08). The rest of the bottom-sheet render logic can stay the same, just the trigger changes.
- `useSearchParams` — already used in Etusivu (via `useSearchParams` hook for `?nakyma=` handling). Reading `?id=` follows the same pattern.
- Framer Motion `animate` with `repeat: Infinity` — established in Phase 5 AI widget. The ripple ring uses the same API.

### Integration Points
- `app/page.tsx` SELECT query — may need `aukiolo_json` added if not already included (needed for HoursTable in the big sheet). Check existing SELECT before adding.
- `app/components/Etusivu.tsx` receives `paikat: Liikuntapaikka[]` prop from server. Venue data for mini-cards and big sheet comes from this prop — no extra API calls.
- Both map instances (preview at ~line 254, fullscreen at ~line 320) — only the fullscreen map needs the zoom-dependent card logic. The preview map stays as-is (gestureHandling="none", non-interactive).

</code_context>

<specifics>
## Specific Ideas

### GPS Ring animation pattern
```tsx
// White ripple ring — single or double-staggered around the blue dot
<motion.div
  style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)' }}
  animate={{ scale: [0.5, 2], opacity: [0.6, 0] }}
  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
/>
```

### Zoom-reactive state
```tsx
// Read zoom from onCameraChanged (vis.gl)
const [zoomLevel, setZoomLevel] = useState(12)
// On the fullscreen <Map>:
onCameraChanged={(ev) => setZoomLevel(ev.detail.zoom)}
```

### Auto-zoom on pin tap (replaces setValittu)
```tsx
// Inside a useMap-powered child component or via map ref
onClick={() => {
  if (zoomLevel < 16) {
    map.panTo({ lat: p.latitude, lng: p.longitude })
    map.setZoom(16)
  }
  // setValittu only from mini-card click, not here
}}
```

### In-app map focus link (profile page)
```tsx
// Replace the external Google Maps anchor with:
<Link
  href={`/?id=${paikka.id}`}
  className="text-[#111111] hover:text-[rgba(17,17,17,0.6)] text-sm font-bold underline underline-offset-2 [transition:color_150ms_var(--ease-out)]"
>
  Näytä kartalla →
</Link>
```

### URL id reading in Etusivu (on mount)
```tsx
const searchParams = useSearchParams()
const focusId = searchParams.get('id')
// useEffect: if focusId, find paikka, open fullscreen map, pan+zoom
```

</specifics>

<deferred>
## Deferred Ideas

- **Marker clustering** — explicitly out of scope per REQUIREMENTS.md; replaced by zoom-based card transformation.
- **City filter on map** — map view city filtering is a Phase 8/10 consideration; not in MAP-05/06/07 scope.
- **Mini-card overflow handling for dense areas** — if many cards overlap at zoom 16, this is a UX concern but not blocking for Phase 8. Can be addressed in a future iteration.
- **aukiolo_json in big sheet** — if the data isn't available in Etusivu props, showing hours in the big sheet may require adding the column to the SELECT. Flag as a plan-time discovery.

</deferred>

---

*Phase: 08-map-features*
*Context gathered: 2026-05-22*
