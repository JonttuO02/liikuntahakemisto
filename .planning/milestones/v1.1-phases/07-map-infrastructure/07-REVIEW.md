---
phase: 07-map-infrastructure
reviewed: 2026-05-22T10:00:04Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/components/Etusivu.tsx
  - app/components/LiikuntapaikatLista.tsx
  - lib/mapStyles.ts
  - lib/sportPins.ts
  - .env.local.example
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-22T10:00:04Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 7 migrated both Map instances from legacy `Marker` to `AdvancedMarker`, introduced `mapId`-based day/night styling via environment variables, removed `MapStyleController` and legacy style arrays from `mapStyles.ts`, deleted `userLocationPinUrl` from `sportPins.ts`, and added a `RecenterButton` inner component. The `LiikuntapaikatLista.tsx` fix (removing unused `AnimatePresence` import) is clean.

The core concern is structural: `RecenterButton` calls `useMap()` but is rendered outside the `<Map>` JSX subtree. During the 150ms `AnimatePresence` exit animation, two `<Map>` instances are simultaneously mounted and both register as `mapInstances['default']`. The fallback resolution used by `useMap()` when there is no `GoogleMapsContext` ancestor (i.e., outside `<Map>`) is `mapInstances['default']` — making it non-deterministic which map instance the button targets during that window. Three additional warnings cover accessibility, incomplete sport icon coverage, and dead code.

---

## Critical Issues

### CR-01: `RecenterButton` calls `useMap()` outside `<Map>` ancestor — ambiguous instance during transition

**File:** `app/components/Etusivu.tsx:356`

**Issue:** `RecenterButton` is rendered as a sibling of `<Map>`, not a descendant. The `useMap()` hook resolves the map instance by first checking `GoogleMapsContext` (the nearest `<Map>` ancestor). When called outside `<Map>`, it falls back to `mapInstances['default']` from the global `APIProviderContext`. During the 150ms `AnimatePresence` exit animation when `kartaAuki` transitions `false → true`, both the preview `<Map>` (exiting, no `id` prop) and the fullscreen `<Map>` (entering, no `id` prop) are simultaneously mounted — and both call `addMapInstance(map, 'default')`, clobbering each other. The last `addMapInstance` call wins, so the button may target the exiting preview map and have no visible effect.

Additionally, `MapPanController` is correctly placed inside `<Map>` at line 353 and uses `GoogleMapsContext` — there is no issue there. The problem is specific to `RecenterButton` being placed at line 356, after `</Map>` closes at line 354.

**Fix:** Move `RecenterButton` inside the `<Map>` subtree so it uses `GoogleMapsContext` for instance resolution:

```tsx
<Map
  defaultCenter={TAMPERE}
  defaultZoom={14}
  mapId={isDark ? NIGHT_ID : DAY_ID}
  style={{ width: '100%', height: '100%' }}
  disableDefaultUI
  gestureHandling="greedy"
  clickableIcons={false}
  keyboardShortcuts={false}
  onClick={() => setValittu(null)}
>
  {/* ... markers ... */}
  <MapPanController coords={coords} />
  <RecenterButton coords={coords} />   {/* moved inside Map */}
</Map>

{/* X close button — stays outside Map, does not need useMap() */}
<button
  onClick={() => setKartaAuki(false)}
  ...
>
```

---

## Warnings

### WR-01: Close button has no accessible name (icon-only button)

**File:** `app/components/Etusivu.tsx:359`

**Issue:** The fullscreen map close button renders only an `<X>` icon with no `aria-label`. Screen readers will announce this as an unlabeled button.

**Fix:**
```tsx
<button
  onClick={() => setKartaAuki(false)}
  aria-label="Sulje kartta"
  className="absolute top-4 right-4 z-10 w-10 h-10 glass-btn rounded-full ..."
>
  <X className="w-4 h-4" />
</button>
```

The same applies to the bottom sheet close button at line 452, which also uses only an `<X>` icon with no `aria-label`.

---

### WR-02: `kiipeily` and `jääkiekko` map pins render fallback circle — sport icons missing from `SPORT_ICONS_SVG`

**File:** `lib/sportPins.ts:6`

**Issue:** `LAJIT_FILTTERI` contains `'Kiipeily'` and `'Jääkiekko'`, and `lajiKonfig` defines colored entries for both. However, `SPORT_ICONS_SVG` in `sportPins.ts` has no entries for `kiipeily` or `jääkiekko`. The `pinUrl()` function falls back to a generic white circle (`<circle cx="14" cy="14" r="5" fill="white" opacity="0.85"/>`) for any unrecognised sport key. Users will see undifferentiated pins for climbing and hockey venues on the map.

**Fix:** Add SVG icon content for `kiipeily` and `jääkiekko` to `SPORT_ICONS_SVG`. Lucide path data for Mountain (climbing) and an ice-hockey puck or similar:

```ts
const SPORT_ICONS_SVG: Record<string, string> = {
  // ... existing entries ...
  kiipeily: g(`<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>`),
  jääkiekko: g(`<ellipse cx="12" cy="12" rx="10" ry="5"/><path d="M2 12c0 2.76 4.48 5 10 5s10-2.24 10-5"/>`),
}
```

(Exact icon path content is a design decision; the important fix is adding entries for these two sports so `pinUrl` doesn't fall back to the generic circle.)

---

### WR-03: `data-active` attribute on preview-map pins is always `undefined` — dead code

**File:** `app/components/Etusivu.tsx:276`

**Issue:** The preview map (inside `!kartaAuki` branch) renders `AdvancedMarker` elements with:
```tsx
data-active={valittu?.id === p.id ? "true" : undefined}
```
However, `valittu` is always `null` when the preview map is visible, because the `useEffect` at line 140 calls `setValittu(null)` whenever `kartaAuki` is `false`. The `data-active` attribute will never be `"true"` on any preview pin. The CSS rule `.gmap-pin[data-active="true"]` (scale-up transform) will never trigger on the preview map.

**Fix:** Remove the `data-active` prop from the preview-map `AdvancedMarker`:
```tsx
{/* preview map — valittu is always null here */}
<AdvancedMarker key={p.id} position={{ lat: p.latitude, lng: p.longitude }}>
  <img src={pinUrl(color, p.laji)} width={28} height={38} alt="" className="gmap-pin" />
</AdvancedMarker>
```

---

## Info

### IN-01: `WEATHER_CITY` string literal duplicates location already expressed in `TAMPERE` constant

**File:** `app/components/Etusivu.tsx:26`

**Issue:** `const WEATHER_CITY = 'Tampere'` is a hardcoded string constant at the module level that is only used to render the city name next to the weather widget (line 206). The project already has a typed `TAMPERE` constant in `lib/constants.ts`. If the target city ever changes, `WEATHER_CITY` and the hardcoded coordinates in the weather `fetch` URL (line 103) would both need updating separately.

**Fix:** This is low-priority, but for consistency the city label could be co-located with the coordinates. No immediate change required — flag for the next constants cleanup.

---

### IN-02: Thunderstorm/shower WMO weather codes (80–99) map to partly-cloudy emoji

**File:** `app/components/Etusivu.tsx:35-41`

**Issue:** `getWeatherEmoji` handles codes 0–77 but falls through to return `'⛅'` for codes 80–99 (rain showers, thunderstorms). WMO code 95 is a thunderstorm — rendering it as partly cloudy is incorrect. This is a pre-existing issue, not introduced in Phase 7.

**Fix:**
```ts
function getWeatherEmoji(code: number): string {
  if (code === 0)       return '☀️'
  if (code <= 3)        return '⛅'
  if (code <= 48)       return '🌫️'
  if (code <= 67)       return '🌧️'
  if (code <= 77)       return '❄️'
  if (code <= 82)       return '🌦️'
  if (code <= 99)       return '⛈️'
  return '⛅'
}
```

---

_Reviewed: 2026-05-22T10:00:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
