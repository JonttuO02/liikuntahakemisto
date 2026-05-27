---
phase: 07-map-infrastructure
verified: 2026-05-22T00:00:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the fullscreen map and tap the re-center button while GPS is active"
    expected: "Map pans smoothly to the user's GPS position"
    why_human: "map.panTo() behavior on a live device with real GPS requires visual confirmation"
  - test: "Open the fullscreen map and tap the re-center button while GPS is denied/unavailable (coords is null)"
    expected: "Button tap is a silent no-op — no error, no toast, map stays in place"
    why_human: "Cannot verify runtime GPS null-path behavior programmatically"
  - test: "Switch between day and night mode in the fullscreen map"
    expected: "Map visually changes theme — light for day, dark for night — confirming the Cloud Console Map IDs are configured and the mapId prop is wiring to the correct Cloud Console map style"
    why_human: "mapId values are runtime env vars not present in .env.local.example placeholder values; cannot verify Cloud Console configuration"
  - test: "Verify the re-center button is absent from the 3D preview map (collapsed state)"
    expected: "No circular locate-icon button appears on the 3D tilted preview map"
    why_human: "Visual confirmation needed that RecenterButton is only in the fullscreen AnimatePresence branch"
---

# Phase 7: Map Infrastructure Verification Report

**Phase Goal:** The map uses AdvancedMarker throughout, enabling all upcoming map feature work
**Verified:** 2026-05-22
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Both map instances render venue pins as AdvancedMarker with img child, not legacy Marker | VERIFIED | Lines 275-279 (preview), 340-343 (fullscreen): `<AdvancedMarker>` wraps `<img src={pinUrl(...)} className="gmap-pin" data-active={...}>`. No bare `<Marker` anywhere in Etusivu.tsx. |
| 2 | User location marker renders as AdvancedMarker with HTML div, not legacy Marker | VERIFIED | Lines 281-287 (preview), 346-352 (fullscreen): `<AdvancedMarker position={coords} zIndex={20}>` wraps inline HTML div with outer ring + inner dot. |
| 3 | Both Map components receive mapId from env vars, switching on isDark | VERIFIED | Line 265: `mapId={isDark ? NIGHT_ID : DAY_ID}` (preview Map). Line 329: `mapId={isDark ? NIGHT_ID : DAY_ID}` (fullscreen Map). Constants `DAY_ID` and `NIGHT_ID` at lines 20-21 read from `process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT`. |
| 4 | MapStyleController is removed — no setOptions({ styles }) calls remain | VERIFIED | Grep for `MapStyleController` and `setOptions` in Etusivu.tsx: zero matches. Function deleted. |
| 5 | New env var names are documented in .env.local.example | VERIFIED | `.env.local.example` lines 12, 14: `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` present with comments. |
| 6 | A re-center button is visible on the fullscreen map | VERIFIED | `RecenterButton` function defined at lines 53-65. Rendered at line 356 inside the fullscreen `motion.div` inner wrapper. `aria-label="Palaa omalle sijainnille"`, `glass-btn rounded-full w-10 h-10 bottom-16 right-4`, `whileTap={{ scale: 0.95 }}`. |
| 7 | Tapping the button moves the map view to the user's GPS position | VERIFIED (code path) | Line 58: `onClick={() => { if (map && coords) map.panTo(coords) }}`. `map` obtained via `useMap()` at line 54. Null-safety guard on both `map` and `coords`. Runtime behavior requires human confirmation. |

**Score:** 7/7 truths verified (code-level)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/components/Etusivu.tsx` | Migrated map component — AdvancedMarker + mapId + RecenterButton | VERIFIED | All AdvancedMarker usages confirmed; mapId props on both Map instances; RecenterButton function and render site present |
| `lib/mapStyles.ts` | Only isNightHour — no DAY/NIGHT style arrays | VERIFIED | File is 4 lines containing only `isNightHour` export. No `DAY_MAP_STYLES` or `NIGHT_MAP_STYLES`. |
| `lib/sportPins.ts` | pinUrl only — userLocationPinUrl deleted | VERIFIED | File contains only `pinUrl` export. `userLocationPinUrl` not found. |
| `.env.local.example` | Developer onboarding — both Map ID vars documented | VERIFIED | File exists with `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` with descriptive comments. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/components/Etusivu.tsx` | `@vis.gl/react-google-maps` | `AdvancedMarker` import | WIRED | Line 6: `import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'`. No `Marker` in import. |
| `app/components/Etusivu.tsx` | `process.env` | `mapId` prop | WIRED | Lines 20-21: `const DAY_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` / `NIGHT_ID = ...`. Used on both `<Map>` components at lines 265, 329. |
| `RecenterButton` | `useMap()` | `map.panTo(coords)` | WIRED (via APIProvider registry) | Line 54: `const map = useMap()`. Line 58: `map.panTo(coords)`. RecenterButton is rendered outside the `<Map>` JSX subtree (after `</Map>` at line 354-355) but inside the `APIProvider` context (`app/layout.tsx` wraps everything in `<MapProvider>` = `<APIProvider>`). `useMap()` with no arguments resolves via the global map registry maintained by `APIProvider`. Since only one `<Map>` is mounted at a time in the fullscreen state, this resolves to the correct map instance. See CR-01 note below. |

---

### CR-01 Note: RecenterButton Placement Outside `<Map>` Subtree

The code review flag is architecturally correct: `RecenterButton` is placed at Etusivu.tsx line 356, which is after the closing `</Map>` tag at line 354. It is NOT a JSX descendant of `<Map>`.

**Why it still works:** `@vis.gl/react-google-maps` `useMap()` with no `mapId` argument resolves via the `APIProvider`'s internal map registry, not via React context inheritance from `<Map>`. The `APIProvider` wrapper in `app/layout.tsx` (via `MapProvider`) encloses the entire app, so `RecenterButton` is within `APIProvider`. With exactly one active `<Map>` at a time (the fullscreen map), `useMap()` returns that instance.

**Risk assessment:** The behavior is correct for this single-map scenario. The risk would materialize if multiple `<Map>` instances were active simultaneously — in that case `useMap()` with no arguments would return the default/first registered map, which might not be the fullscreen one. In this codebase, the preview and fullscreen maps are mutually exclusive (the preview uses `AnimatePresence` with `key="preview"` that exits before fullscreen mounts), so only one map is active when `RecenterButton` is visible.

**Impact on MAP-04:** MAP-04 is satisfied. The button correctly calls `map.panTo(coords)` on the fullscreen map. The architectural concern is a code-quality warning, not a functional blocker.

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| RecenterButton | `coords` (prop) | `useGPS({ autoRequest: true })` hook at line 82, passed through as prop | Yes — `useGPS` reads from browser Geolocation API | FLOWING |
| AdvancedMarker venue pins | `paikatKartalla` | Derived from `paikat` prop → `suodatettu` memo → `paikatKartalla` memo; `paikat` comes from server-side Supabase fetch in `app/page.tsx` | Yes — real DB records | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| No bare `<Marker` in Etusivu.tsx | grep `<Marker` Etusivu.tsx | 0 matches | PASS |
| AdvancedMarker imported, not Marker | grep import line | `{ Map, AdvancedMarker, useMap }` — no `Marker` | PASS |
| mapId on both Map instances | grep `mapId` Etusivu.tsx | 2 matches (lines 265, 329) | PASS |
| MapStyleController deleted | grep `MapStyleController\|setOptions` | 0 matches | PASS |
| RecenterButton render count | grep `<RecenterButton` | 1 match (line 356, fullscreen only) | PASS |
| isNightHour still in mapStyles.ts | read lib/mapStyles.ts | File contains only `isNightHour` (4 lines) | PASS |
| userLocationPinUrl deleted | grep `userLocationPinUrl` in sportPins.ts | 0 matches | PASS |
| .env.local.example has both Map ID vars | read .env.local.example | Both `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NIGHT` present | PASS |

Step 7b: Behavioral spot-checks run from file inspection. Build pass is claimed in both SUMMARY files (commits 13021d4, 2e73e47, 0157e8d) — runtime server cannot be started for this verification.

---

### Probe Execution

Step 7c: No probe scripts found in `scripts/*/tests/probe-*.sh`. No probe declarations in PLAN files. SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MAP-04 | 07-01-PLAN.md, 07-02-PLAN.md | Käyttäjä voi palata karttanäkymässä napilla takaisin omaan sijaintiinsa | SATISFIED | RecenterButton at line 53-65, rendered at line 356 in fullscreen map, calls `map.panTo(coords)` on tap when coords non-null |

No orphaned requirements: REQUIREMENTS.md Traceability table maps MAP-04 to Phase 7 only. MAP-05/06/07 are Phase 8 — not claimed and not implemented in Phase 7 (correct deferral).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/components/Etusivu.tsx` | 59 | `className` contains `[transition:color_150ms_var(--ease-out)]` — `--ease-out` CSS var used | Info | Only notable if CSS var is not defined in globals.css; not a stub — it is the established design system pattern from CLAUDE.md X close button |

No `TBD`, `FIXME`, `XXX` markers found in modified files. No stub patterns found. No `return null`, `return []`, `return {}` in render paths.

---

### Human Verification Required

#### 1. Re-center Button — Live GPS Pan

**Test:** Open the app on a mobile device or desktop with GPS enabled. Tap the map preview to open fullscreen. Pan the map away from your position. Tap the circular re-center button (bottom-right, Locate icon).
**Expected:** The map smoothly pans back to the user's current GPS position.
**Why human:** `map.panTo(coords)` behavior on a live Google Maps instance with real GPS coordinates requires visual confirmation. Cannot be verified with static code analysis.

#### 2. Re-center Button — GPS Unavailable Silent No-Op

**Test:** Deny location access in the browser. Open the fullscreen map. Tap the re-center button.
**Expected:** Nothing happens — no error message, no toast, no console error visible to the user.
**Why human:** Runtime null-path execution requires a real browser environment with GPS denied.

#### 3. Day/Night mapId Theme Switch

**Test:** Toggle day/night mode in the fullscreen map. Confirm the map visually changes between light and dark themes.
**Expected:** The map tile style changes — confirming Cloud Console Map IDs are configured and the `mapId` prop is correctly switching.
**Why human:** The `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` values are secret runtime env vars (placeholder values in `.env.local.example`). Cannot verify Cloud Console configuration from code alone.

#### 4. Preview Map — No Re-center Button

**Test:** View the 3D tilted preview map on the homepage (before tapping to expand).
**Expected:** No circular Locate-icon button appears on the preview map.
**Why human:** `RecenterButton` is in the `kartaAuki && (...)` branch — the preview map is the `!kartaAuki` branch. Visual confirmation ensures the AnimatePresence branching is correct in the browser.

---

### Gaps Summary

No code-level gaps found. All 7 must-have truths verified. All 4 required artifacts exist, are substantive, and are wired. MAP-04 is satisfied. The CR-01 architectural concern (RecenterButton outside `<Map>` subtree) is a code-quality note, not a functional failure — `useMap()` resolves correctly via the `APIProvider` global registry in this single-active-map scenario.

Phase status is `human_needed` because 4 runtime behaviors require device-level or browser-level verification that cannot be confirmed from static code analysis.

---

_Verified: 2026-05-22_
_Verifier: Claude (gsd-verifier)_
