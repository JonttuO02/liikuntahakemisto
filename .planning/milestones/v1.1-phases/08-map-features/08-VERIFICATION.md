---
phase: 08-map-features
verified: 2026-05-22T10:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the fullscreen map and observe the user location dot"
    expected: "A white ring pulses outward from the GPS dot with scale animation 0.5→2 and opacity 0.6→0, repeating infinitely"
    why_human: "CSS/Framer Motion animation cannot be verified by static grep; requires visual inspection"
  - test: "Zoom the map below level 16 and tap a venue pin"
    expected: "Map pans to the venue and zooms to level 16 without opening the bottom sheet; venue pin crossfades to mini-card"
    why_human: "Interactive map behavior (pan+zoom imperative effect, AnimatePresence crossfade) cannot be tested without a running browser"
  - test: "On a venue profile page (/paikat/<id>), tap 'Näytä kartalla →'"
    expected: "App navigates to /?id=<id>, the fullscreen map opens automatically and centers on the venue at zoom 16; the bottom sheet does NOT open"
    why_human: "Next.js client-side navigation + useSearchParams effect is runtime behavior"
  - test: "On the fullscreen map at zoom >= 16, tap a glass mini-card"
    expected: "Bottom sheet slides up showing: sport badge, name, open status, price, address, hours table, phone (tel: link), booking URL, description; sheet is scrollable and capped at 90vh"
    why_human: "Bottom-sheet scroll and content rendering require a real device/browser to verify layout"
---

# Phase 8: Map Features Verification Report

**Phase Goal:** The map shows rich contextual information at close zoom and links directly from venue detail pages
**Verified:** 2026-05-22T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User location marker (preview map) has white ripple ring — animate scale:[0.5,2] opacity:[0.6,0], repeat:Infinity | ✓ VERIFIED | `motion.div` at line 311–315 with exact animation values; `overflow:'visible'` on outer div (line 310) |
| 2 | User location marker (fullscreen map) has identical white ripple ring | ✓ VERIFIED | `motion.div` at line 404–408 with identical animation values; `overflow:'visible'` on outer div (line 403) |
| 3 | Fullscreen map tracks zoom level reactively via onCameraChanged | ✓ VERIFIED | `onCameraChanged={(ev) => setZoomLevel(ev.detail.zoom)}` at line 369 — on gestureHandling="greedy" Map only |
| 4 | zoomLevel state exists in Etusivu for downstream use | ✓ VERIFIED | `const [zoomLevel, setZoomLevel] = useState(14)` at line 95 |
| 5 | At zoom < 16, fullscreen map venue markers show sport pin image | ✓ VERIFIED | `{zoomLevel < 16 ? <motion.div key="pin">...<img ... className="gmap-pin">` at lines 376–381 |
| 6 | At zoom >= 16, fullscreen map venue markers show glass mini-card with name, sport pill, price | ✓ VERIFIED | `<motion.div key="card" ... className="glass rounded-xl ...">` at lines 383–395 with sport pill, nimi, price |
| 7 | Tapping pin at zoom < 16 calls setAutoZoomTarget (NOT setValittu) and MapAutoZoom pans+zooms to 16 | ✓ VERIFIED | Pin onClick calls `setAutoZoomTarget({lat, lng})` (line 378); MapAutoZoom at lines 69–78 calls `map.panTo(target); map.setZoom(16)`; `<MapAutoZoom>` wired at line 416 |
| 8 | Tapping mini-card at zoom >= 16 calls setValittu(p) | ✓ VERIFIED | Mini-card onClick: `(e) => { e.stopPropagation(); setValittu(p) }` at line 386 |
| 9 | Bottom sheet shows maxHeight:90vh with overflowY:auto and full content (name, sport, open status, price, address, hours, phone, booking URL, description) | ✓ VERIFIED | `maxHeight:'90vh'` at line 506; `overflowY:'auto'` at line 520; getOpenStatus (line 552), HoursTable (line 601), tel: link (line 606–613), isSafeUrl booking URL (lines 615–623), kuvaus (lines 625–630) |
| 10 | Profile page "Näytä kartalla" links to `/?id=<paikka.id>` (not maps.google.com); Etusivu reads ?id= via useSearchParams, calls setKartaAuki(true) + setAutoZoomTarget, does NOT call setValittu | ✓ VERIFIED | profile: `<Link href={\`/?id=${paikka.id}\`}>` at line 72 of page.tsx; Etusivu: `useSearchParams` (line 4,98), `focusId` (line 99), focus useEffect at lines 161–169 calling `setKartaAuki(true)` + `setAutoZoomTarget` with explicit comment "Do NOT call setValittu" |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/Etusivu.tsx` | GPS ring, zoomLevel, onCameraChanged, MapAutoZoom, AnimatePresence pin/card, bottom sheet 90vh, useSearchParams focus effect | ✓ VERIFIED | All features present; 638 lines; substantive implementation |
| `app/paikat/[id]/page.tsx` | Internal Link to `/?id=paikka.id` | ✓ VERIFIED | Line 71–76: `<Link href={.../?id=${paikka.id}...}>Näytä kartalla →</Link>`; no maps.google.com anchor remains |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Etusivu.tsx` fullscreen `<Map>` | `setZoomLevel` | `onCameraChanged` prop | ✓ WIRED | Line 369: `onCameraChanged={(ev) => setZoomLevel(ev.detail.zoom)}` |
| `Etusivu.tsx` pin onClick | `MapAutoZoom` pan+zoom | `setAutoZoomTarget` state | ✓ WIRED | Line 378 sets target; line 416 `<MapAutoZoom target={autoZoomTarget}>` calls `map.panTo + map.setZoom(16)` |
| `Etusivu.tsx` mini-card onClick | bottom sheet open | `setValittu(p)` | ✓ WIRED | Line 386 |
| `app/paikat/[id]/page.tsx` | `Etusivu` focus handler | `<Link href="/?id=...">` → useSearchParams | ✓ WIRED | Link at line 72; useSearchParams at line 98; focusId effect at lines 161–169 |
| focus useEffect | fullscreen map open + zoom | `setKartaAuki(true)` + `setAutoZoomTarget` | ✓ WIRED | Lines 166–167; NOT calling setValittu |
| bottom sheet | full venue content | `formatGroupedHours`, `getOpenStatus`, `isSafeUrl`, `HoursTable` | ✓ WIRED | All imported (lines 14,16,19); all used in bottom sheet render block |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Etusivu.tsx` mini-card | `p.nimi`, `p.laji`, `p.hinta_min/max` | `paikat` prop from server component `page.tsx` → Supabase query | Yes — typed `Liikuntapaikka[]` from DB | ✓ FLOWING |
| `Etusivu.tsx` bottom sheet | `valittu.aukioloajat`, `valittu.puhelin`, `valittu.varauslinkki`, `valittu.kuvaus` | same `paikat` prop | Yes — same DB source | ✓ FLOWING |
| `app/paikat/[id]/page.tsx` | `paikka.id` for Link href | Supabase `select('*').eq('id', id).single()` | Yes — real DB row | ✓ FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — map features require a running browser with Google Maps JS API; cannot test without starting the dev server and a display.

---

## Probe Execution

No probes declared in PLAN files. No `scripts/*/tests/probe-*.sh` files exist for this phase.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MAP-05 | 08-01 | GPS accuracy ring on user location marker | ✓ SATISFIED | `motion.div` ring with `scale:[0.5,2] opacity:[0.6,0] repeat:Infinity` on both map instances |
| MAP-06 | 08-01, 08-02 | Zoom-conditional pin→mini-card at threshold 16; full bottom sheet content | ✓ SATISFIED | `zoomLevel` state + `onCameraChanged`; AnimatePresence crossfade; MapAutoZoom; 90vh bottom sheet with all content sections |
| MAP-07 | 08-03 | "Näytä kartalla" opens in-app map centered on venue | ✓ SATISFIED | Profile Link to `/?id=N`; Etusivu useSearchParams + focus useEffect |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/components/Etusivu.tsx` | 266 | Comment contains "placeholder" | ℹ️ Info | Refers to a CSS layout spacer div (aria-hidden), not a stub — no behavioral impact |

No `TBD`, `FIXME`, `XXX` debt markers found in modified files. No stub implementations. No hardcoded empty data arrays/objects in render paths.

---

## Missing Artifact

`08-03-SUMMARY.md` was not created by the Plan 08-03 executor. This is a **documentation gap only** — all implementation code from Plan 08-03 is present and verified in both `app/paikat/[id]/page.tsx` and `app/components/Etusivu.tsx`. The absence of the SUMMARY does not affect the phase goal.

---

## Human Verification Required

### 1. GPS Ripple Ring Visual

**Test:** Open the app in a browser. On the main page, allow GPS access. Look at the user location dot (blue dot) on both the preview map and the fullscreen map.
**Expected:** A white ring pulses outward from the blue dot — starts at half size (scale 0.5), expands to double size (scale 2), fades from 0.6 opacity to transparent — repeating every 1.8 seconds.
**Why human:** Framer Motion animation execution requires a browser runtime; static analysis only confirms the props are correct.

### 2. Pin Tap Auto-Zoom Behavior

**Test:** Open the fullscreen map at zoom < 16 (default is 14). Tap any venue pin (sport-colored pin image).
**Expected:** The map pans to the venue and zooms to level 16. The bottom sheet does NOT open. After reaching zoom 16, the pin crossfades into a glass mini-card showing sport pill, venue name, and price.
**Why human:** Imperative map pan/zoom via `useMap()` hook and the AnimatePresence crossfade timing cannot be verified without a running Google Maps instance.

### 3. "Näytä kartalla" In-App Navigation

**Test:** Navigate to any venue profile page (e.g., `/paikat/1`). Scroll to the Sijainti row and tap "Näytä kartalla →".
**Expected:** The browser navigates to `/?id=1`. The fullscreen map opens automatically. The map pans and zooms to zoom 16 centered on that venue. The bottom sheet does NOT open automatically.
**Why human:** useSearchParams → useEffect → setKartaAuki + setAutoZoomTarget chain is client-side runtime behavior.

### 4. Bottom Sheet Content and Scroll

**Test:** On the fullscreen map, zoom in to level 16+ and tap a glass mini-card for a venue that has hours, phone, booking URL, and description.
**Expected:** Bottom sheet slides up showing: sport badge, venue name, open status indicator (green "Auki nyt" or muted "Suljettu"), price, address, separator, hours table, phone as tel: link, booking URL as text link, description paragraph. Sheet is limited to 90vh max height and scrolls if content overflows.
**Why human:** Content visibility and scroll behavior require real data and browser layout engine.

---

## Gaps Summary

No gaps found. All 10 observable truths are VERIFIED against the actual codebase. TypeScript compiles without errors (`npx tsc --noEmit` exits 0). The missing `08-03-SUMMARY.md` is a documentation artifact omission — not a code gap — and does not affect the phase goal.

Status is `human_needed` because four visual/interactive behaviors (GPS animation, map pan/zoom, in-app navigation effect, bottom sheet scroll) require browser runtime verification that grep-based analysis cannot provide.

---

_Verified: 2026-05-22T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
