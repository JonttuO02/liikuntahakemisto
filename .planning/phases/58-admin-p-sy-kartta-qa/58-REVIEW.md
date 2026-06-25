---
phase: 58-admin-p-sy-kartta-qa
reviewed: 2026-06-25T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - app/admin/[id]/page.tsx
  - app/components/CalloutCard.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 58: Code Review Report

**Reviewed:** 2026-06-25
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

This phase adds a read-only "Sijainti" venue-location map to `/admin/[id]`, reusing `Map`/`AdvancedMarker`/`SportPin`/`CalloutCard` from the customer-facing map, plus a shared fix in `CalloutCard.tsx` (box-shadow → filter: drop-shadow under clip-path). The plan's literal scope (simple click-toggle pin/card) was significantly expanded mid-execution into a zoom-driven interaction with a custom camera animation (`AdminCardZoom`), per operator direction during the human-verify checkpoint. TypeScript compiles cleanly and the core D-08 read-only requirement (no `onClick` on `CalloutCard` itself) is correctly implemented — verified by comparing against `Etusivu.tsx`'s `onClick`-wrapped equivalent, which is absent here as required.

However, the expanded zoom-driven implementation introduces a real correctness bug in the non-null assertion usage, several robustness gaps in the new `AdminCardZoom` animation component, and some duplicated/dead state. The shared `CalloutCard.tsx` change is narrowly scoped and low-risk but has a maintainability gap (no comment in the conditional cleanup path).

## Critical Issues

### CR-01: Unsafe non-null assertions on `paikka.latitude`/`paikka.longitude` bypass the type guard's actual scope

**File:** `app/admin/[id]/page.tsx:212`
**Issue:** Line 212's `onClick={() => setAutoZoomTarget({ lat: paikka.latitude!, lng: paikka.longitude! })}` uses non-null assertions (`!`) instead of relying on the outer `paikka.latitude != null && paikka.longitude != null` guard at line 190. The SUMMARY explicitly acknowledges this was necessary because "TypeScript cannot narrow a nullable field through a nested arrow-function closure even when the outer guard covers it at render time" — but this is a narrowing problem caused by reading `paikka.latitude` fresh from the outer closure variable inside a *new* closure created on every render, not a fundamental impossibility. The `!` assertion silences the compiler without proving the invariant — if `paikka` is ever replaced by a new object reference between render and click (e.g. via a future feature that updates `link`/`paikka` after the Sijainti section first mounted, or a race during `setLink` after approve/reject), this can throw `Cannot read properties of null` at runtime inside `AdminCardZoom`'s `new google.maps.LatLng(target.lat, target.lng)` (line 272), since `null` would be passed to a `LatLng` constructor that expects numbers.
**Fix:** Capture narrowed primitives once, outside the closure, e.g.:
```tsx
{paikka.latitude != null && paikka.longitude != null && (() => {
  const lat = paikka.latitude as number
  const lng = paikka.longitude as number
  return (
    <div className="flex flex-col gap-2">
      ...
      onClick={() => setAutoZoomTarget({ lat, lng })}
      ...
    </div>
  )
})()}
```
or simply destructure `const { latitude, longitude } = paikka` right after the guard and use `latitude`/`longitude` (proven non-null by TS at that point) everywhere instead of re-reading `paikka.latitude!` repeatedly (it's also used 3 separate times: lines 199, 207, 212, 222).

## Warnings

### WR-01: `AdminCardZoom`'s effect has incomplete dependencies and can drop in-flight animations silently

**File:** `app/admin/[id]/page.tsx:264-298`
**Issue:** The `useEffect` dependency array is `[map, target]` but the animation closure captures `fromCenter`/`fromZoom`/`projection` freshly computed inside the effect — that part is fine — but `onCompleteRef.current()` calls happen on multiple early-return paths (no `projection`, no `venuePoint`, no `adjusted`) without ever calling `cancelAnimationFrame` because `raf` is unassigned in those paths; this is harmless since no `raf` was scheduled, but it means `onComplete` (which sets `setAutoZoomTarget(null)`) fires synchronously inside the effect body when those guards fail, while `target` is still the stale just-set value. If `map.getProjection()` is `null` momentarily during the camera-changed render cycle (transient timing during Maps' async tile loading is a real and reasonably common occurrence), the click effectively does nothing visually (no animation) but discards the zoom target — leaving the user with no feedback and no retry path, since clicking is the only entry point to `autoZoomTarget`.
**Fix:** On a missing projection, fall back to the existing simpler behavior (e.g. `map.panTo(target)` + `map.setZoom(16)`, the same as `SijaintiPicker.tsx`'s `AutocompleteZoomHandler`) rather than silently no-op'ing:
```tsx
if (!fromCenter || !projection) {
  map.panTo(target)
  map.setZoom(Math.max(fromZoom, 16))
  onCompleteRef.current()
  return
}
```

### WR-02: No way to return from CalloutCard view to pin view without manually zooming out

**File:** `app/admin/[id]/page.tsx:190-231`
**Issue:** Once the camera zooms in past 16 (via the pin click → `AdminCardZoom`), the only way back to the pin view is for the admin to manually scroll/pinch the map back below zoom 16 — there is no click-to-dismiss on the `CalloutCard`'s wrapping div, the `Map`, or any visible affordance, unlike `Etusivu.tsx`'s main map which has `onClick={() => { setValittu(null) }}` on the `Map` itself (line 865) to collapse open state. This is a minor but real UX dead-end specific to this phase's expanded zoom-driven design (not present in the plan's original simple-toggle spec, where unclicking the pin div would have been the natural reverse action).
**Fix:** Add a `Map`-level `onClick` (or a small recenter affordance) that resets `setZoomLevel`-driven UI, e.g. `map.setZoom(15)` to return to the pin view, mirroring `Etusivu.tsx`'s dismiss pattern (the plan's own "Optional" suggestion in 58-01-PLAN.md line 101 anticipated exactly this).

### WR-03: Duplicate/redundant lat-lng spread in CalloutCard prop construction

**File:** `app/admin/[id]/page.tsx:222`
**Issue:** `<CalloutCard p={{ ...paikka, latitude: paikka.latitude, longitude: paikka.longitude }} />` spreads `paikka` (which already contains `latitude`/`longitude` as `number | null`) and then re-overwrites them with the exact same expression. This is dead code that achieves nothing — the override values are byte-identical to what the spread already produced — and it does not perform the type narrowing the comment in 58-01-SUMMARY.md implies (TypeScript still sees `number | null` here since `paikka.latitude` is the same nullable field). This line type-checks only because the outer guard at line 190 narrows `paikka.latitude`/`longitude` for the whole JSX subtree (not because of this spread), so the redundant override is pure noise.
**Fix:** Remove the no-op override entirely (`<CalloutCard p={paikka} />`) once `paikka.latitude`/`longitude` are narrowed once via destructuring per CR-01's fix, or keep the override only if actually narrowing via `as number` casts (in which case make that intent explicit, e.g. `latitude: lat, longitude: lng}` using the destructured constants).

### WR-04: `disableDefaultUI` + `gestureHandling="greedy"` combination not cross-checked against D-06's "standard Google Maps gestures" requirement

**File:** `app/admin/[id]/page.tsx:201-202`
**Issue:** `disableDefaultUI` removes all default UI controls (zoom buttons, fullscreen, street view, map type) including the zoom +/- buttons that exist on `SijaintiPicker.tsx`'s map (which does not set `disableDefaultUI`). This was an explicit deviation (#2 in SUMMARY) to match the main map's controls — but the main map (`Etusivu.tsx`) and this read-only admin viewer have different interaction needs: the main map's `disableDefaultUI` is justified by its custom recenter/search UI replacing the defaults, while the admin Sijainti map has no replacement controls at all (no recenter button, no zoom buttons), so an admin without a scroll wheel or pinch-capable trackpad (e.g. a keyboard-only or some remote-desktop admin session) has no way to zoom the map in/out. This isn't necessarily a bug, but it's a quality/accessibility regression worth flagging since the plan only required "zoomable and pannable via standard Google Maps gestures (not a static image)" — it did not require visually matching the main map's exact control set, and `disableDefaultUI` was added purely for visual parity per a deviation, at the cost of removing a usable fallback.
**Fix:** Consider `zoomControl: true` alongside `disableDefaultUI` (Maps JS API supports re-enabling individual controls), or confirm via the dev console that gesture-based zoom is reliably available in all admin browser/input environments before treating this as final.

## Info

### IN-01: `CALLOUT_CARD_HALF_HEIGHT_PX` is a magic number tied to current CalloutCard render dimensions, with no enforcement if CalloutCard's height changes

**File:** `app/admin/[id]/page.tsx:16`
**Issue:** `103` (half of the CalloutCard's ~206px rendered height) is hardcoded as a constant with a comment, but `CalloutCard.tsx` itself defines its outer wrapper as `height: 171` (line 123) and inner card height also `171` (line 149) — not 206. There's a mismatch between the comment's stated basis ("~206px tall / 2") and the component's actual fixed height (171px) — if 206 was an empirically measured rendered height (e.g. including transform/shadow bleed) rather than CalloutCard's literal CSS height, that's fine, but the discrepancy isn't explained and will silently go stale if `CalloutCard`'s `height: 171` constant ever changes, since there's no shared constant or computed measurement linking the two values.
**Fix:** Either compute the offset from CalloutCard's actual rendered `offsetHeight` (the component already has a `ResizeObserver` measuring this internally for `clipPath`) via a shared export, or add a comment clarifying exactly which 206px figure was measured and why it diverges from the literal `height: 171` in CalloutCard.tsx.

### IN-02: Unused/no-op `overflow: 'visible'` style on card wrapper div

**File:** `app/admin/[id]/page.tsx:216`
**Issue:** `style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateX(-50%)', overflow: 'visible' }}` sets `overflow: 'visible'`, which is the CSS default for a `div` with no other `overflow` ancestor styling in this subtree — it has no visible effect here since nothing in the ancestor chain sets `overflow: hidden` that would need overriding. It's likely a defensive leftover from the iterative debugging session (per SUMMARY's account of multiple CSS-compositing fix attempts).
**Fix:** Remove if confirmed to have no effect, or add a comment if it was left in deliberately to guard against a future regression.

### IN-03: `CalloutCard.tsx`'s new `filter`/`boxShadow` branch has no inline comment cross-referencing the admin map's clip-path container that motivated it

**File:** `app/components/CalloutCard.tsx:162-165`
**Issue:** The comment at lines 156-161 explains *why* `filter: drop-shadow` replaces `box-shadow`, but doesn't mention that this is also a behavior change for the customer-facing `Etusivu.tsx` map (which also sets a clip-path-derived `clipPath` value via the same component) — the SUMMARY explicitly flags this as "a latent-bug fix, not a behavior change" for the main map, but a future maintainer reading only this file has no way to know the change is intentionally shared/dual-purpose without reading the phase's planning artifacts.
**Fix:** Add a one-line comment noting this branch is shared with the main customer-facing map (`Etusivu.tsx`) and was originally motivated by a bug found in the admin map's `clip-path` container.

---

_Reviewed: 2026-06-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
