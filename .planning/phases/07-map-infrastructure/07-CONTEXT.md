# Phase 7: Map Infrastructure - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate both map instances in `Etusivu.tsx` (3D preview + fullscreen) from the legacy `Marker` component to `AdvancedMarker` from `@vis.gl/react-google-maps`. Add day/night Map ID env vars and switch the `<Map>` component to use them dynamically. Remove `MapStyleController` (styles are now baked into Google Cloud Console Map IDs). Implement a floating re-center button (MAP-04) on the fullscreen map.

Requirements: MAP-04.

**Out of scope for Phase 7:** GPS accuracy ring (Phase 8), zoom-based pin→card transformation (Phase 8), in-app map focus from venue detail page (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### AdvancedMarker Migration — Pins
- **D-01:** Keep `pinUrl()` in `lib/sportPins.ts` UNCHANGED. The function and its SVG output are correct. Use the returned SVG data URL as `<img src={pinUrl(color, laji)} />` inside `<AdvancedMarker>` children. Do NOT rebuild pins as HTML/CSS or use the vis.gl `<Pin>` component.
- **D-02:** CRITICAL CONTEXT — a previous migration attempt destroyed the map's visual appearance. The `<img>` approach (D-01) is explicitly chosen to avoid this. Do not deviate from it.
- **D-03:** The user location marker also migrates to AdvancedMarker. Render as an HTML `<div>` with the same visual as `userLocationPinUrl()`: outer translucent blue ring + inner solid blue circle. The `userLocationPinUrl()` function can be deleted or kept unused — Claude's discretion.

### Map Styling — Day/Night Map IDs
- **D-04:** Two separate env vars replace the single `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`: `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT`. Both Map IDs already exist in Google Cloud Console.
- **D-05:** The `<Map>` component in both preview and fullscreen instances receives `mapId={isDark ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT : process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY}`.
- **D-06:** `MapStyleController` is REMOVED from both map instances. Map visual styles (day/night) are baked into the Map IDs in Cloud Console, not applied via `map.setOptions({ styles })`. The `DAY_MAP_STYLES` / `NIGHT_MAP_STYLES` exports in `lib/mapStyles.ts` become unused — Claude's discretion whether to delete them.

### mapId Env Handling
- **D-07:** No fallback logic for a missing mapId. Let `undefined` flow through — Google Maps gives a console warning; AdvancedMarker won't render. A missing mapId is a developer config error, not a runtime edge case to handle gracefully. Document both env vars in `.env.local.example` (or equivalent).

### Re-center Button (MAP-04)
- **D-08:** Fullscreen map only — NOT on the 3D preview map (preview uses `gestureHandling="none"` and is non-interactive).
- **D-09:** Position: bottom-right floating button, same style as the existing X close button: `glass-btn rounded-full w-10 h-10 flex items-center justify-center`.
- **D-10:** Icon: Lucide `Locate`.
- **D-11:** Always visible in the fullscreen map, regardless of GPS availability.
- **D-12:** Tap behavior: calls `map.panTo(coords)` if `coords` is non-null; silent no-op if `coords` is null. No error message or visual feedback for the null case.
- **D-13:** `MapPanController` is KEPT — it auto-pans when GPS first resolves. The re-center button provides a manual trigger after the user pans away. Both coexist.

### Claude's Discretion
- Whether to delete `DAY_MAP_STYLES`, `NIGHT_MAP_STYLES`, and `isNightHour` from `lib/mapStyles.ts` now that `MapStyleController` is removed (`isNightHour` is still used in `Etusivu.tsx` for `isDark` state initialization — do NOT delete it).
- Whether to delete `userLocationPinUrl()` from `lib/sportPins.ts` after replacing its usage with a React HTML marker.
- Exact vertical spacing / `bottom` offset for the re-center button to avoid overlapping filter pills.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Components to modify
- `app/components/Etusivu.tsx` — primary target; both map instances live here. Contains `Marker` imports, `MapStyleController`, `MapPanController`, two `<Map>` components, and all marker render logic.

### Libraries
- `@vis.gl/react-google-maps` v1.8.3 — already installed. Exports `AdvancedMarker` (use this), `Pin` (do NOT use — D-01 says keep pinUrl SVG), `useMap` (existing pattern for re-center hook).
- `lucide-react` — Lucide `Locate` icon for re-center button.

### Utility files
- `lib/sportPins.ts` — `pinUrl(color, laji)` and `userLocationPinUrl()`. `pinUrl()` must NOT be changed (D-01). `userLocationPinUrl()` may be deleted after its usage is replaced.
- `lib/mapStyles.ts` — `DAY_MAP_STYLES`, `NIGHT_MAP_STYLES`, `isNightHour`. `isNightHour` is still used in `Etusivu.tsx` and must be kept. Style constants may be deleted if MapStyleController is removed.

### Design system
- `CLAUDE.md` — glassmorphism utilities and button styles. Re-center button uses `glass-btn rounded-full w-10 h-10`.

### Requirements
- `.planning/REQUIREMENTS.md` — MAP-04 (re-center button).

### Env var documentation
- `.env.local.example` (or equivalent) — add `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT`. Both Map IDs are ready in Google Cloud Console; user must add values to local `.env.local`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useMap()` hook (vis.gl) — already used in `MapPanController`; re-center button uses the same pattern to call `map.panTo(coords)` imperatively.
- `MapPanController` — kept unchanged; auto-pans on GPS resolution. Re-center button is a separate manual trigger.
- `glass-btn rounded-full w-10 h-10` — existing button pattern for X close button and night toggle; re-center uses identical sizing.
- `Lucide` imports already in `Etusivu.tsx` — add `Locate` to the existing import line.

### Established Patterns
- `Marker` → `AdvancedMarker` replacement: swap the component name, change `icon` prop to `<img>` child, keep all other props (`position`, `zIndex`, `onClick`, `clickable`).
- `isDark` state already in `Etusivu.tsx` — map ID selection reads from this: `mapId={isDark ? NIGHT_ID : DAY_ID}`.
- Both `<Map>` instances (preview at line ~254, fullscreen at line ~320) need identical mapId and AdvancedMarker migration.

### Integration Points
- `app/components/Etusivu.tsx` imports `{ Map, Marker, useMap }` from `@vis.gl/react-google-maps` — change to `{ Map, AdvancedMarker, useMap }`.
- Preview map: `gestureHandling="none"`, no onClick handlers on markers — still must migrate to AdvancedMarker (success criteria 1).
- Re-center button lives inside the fullscreen `<motion.div>` wrapper, alongside the X close button and night toggle.

</code_context>

<specifics>
## Specific Ideas

- Re-center button click handler pattern (inside a useMap-powered inner component or via ref):
  ```tsx
  const map = useMap()
  <button onClick={() => { if (map && coords) map.panTo(coords) }}>
    <Locate className="w-4 h-4" />
  </button>
  ```
- Map ID reading pattern: `const DAY_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` at the top of `Etusivu.tsx`.
- AdvancedMarker venue pin:
  ```tsx
  <AdvancedMarker key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={...} onClick={() => setValittu(p)}>
    <img src={pinUrl(color, p.laji)} width={28} height={38} alt="" />
  </AdvancedMarker>
  ```
- AdvancedMarker user location pin (HTML replacement for userLocationPinUrl):
  ```tsx
  <AdvancedMarker position={coords} zIndex={20}>
    <div style={{ width: 24, height: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(66,133,244,0.18)' }} />
      <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#4285F4', border: '2.5px solid white' }} />
    </div>
  </AdvancedMarker>
  ```

</specifics>

<deferred>
## Deferred Ideas

- GPS accuracy ring (translucent circle scaled to accuracy radius) — Phase 8 (MAP-05).
- Zoom-based pin→card transformation — Phase 8 (MAP-06).
- In-app map focus from venue detail page — Phase 8 (MAP-07).

</deferred>

---

*Phase: 07-map-infrastructure*
*Context gathered: 2026-05-22*
