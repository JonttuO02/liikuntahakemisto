---
phase: 06-ui-polish-and-data-foundation
verified: 2026-05-22T06:40:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "City filter dropdown visibility — single-city dataset"
    expected: "With current Tampere-only data the city dropdown is intentionally hidden (kaupungit.length <= 1). Verify dropdown appears when multi-city data is loaded (e.g., after Phase 10 Helsinki/Turku sync)."
    why_human: "The dropdown is conditionally hidden — grep confirms the guard is correct but behaviour requires live multi-city data to observe."
  - test: "Sponsoroitu badge on list card for a featured venue"
    expected: "A venue with featured=true in the DB shows the amber Sponsoroitu badge in the list card badge row, between the sport pill and Kertakäynti OK."
    why_human: "Requires a featured=true row in the Supabase database to verify rendering end-to-end."
  - test: "Sponsoroitu badge in map bottom-sheet for a featured venue"
    expected: "Tapping a map pin for a venue with featured=true shows the amber Sponsoroitu badge next to the sport pill in the bottom-sheet."
    why_human: "Requires a featured=true row in the Supabase database to verify rendering end-to-end."
  - test: "vain jäsenyys fallback in list card"
    expected: "A venue whose hinta_kuvaus contains 'jäsenyys' AND both hinta_min/hinta_max are null shows muted 'vain jäsenyys' text at price position 4, not a bold price."
    why_human: "Requires a qualifying row in the Supabase database; logic is verified by unit tests but visual rendering needs confirmation."
  - test: "AI weather widget shows city name"
    expected: "Homepage (map/Etusivu view) shows e.g. '7° Tampere' in the weather widget, with Tampere in muted gray immediately after the degree symbol."
    why_human: "Requires the Open-Meteo API to return a temp value and the dev server to be running."
---

# Phase 6: UI Polish and Data Foundation — Verification Report

**Phase Goal:** Users see tighter card information, a legal privacy page, sponsored badges, and can filter by city
**Verified:** 2026-05-22T06:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can navigate to /tietosuoja and read the GDPR privacy policy before logging in | VERIFIED | `app/tietosuoja/page.tsx` exists, 118 lines, server component (no `'use client'`), default export `TietosuojaPage`, all 6 Finnish sections present |
| 2 | Featured venues show a "Sponsoroitu" badge on both list cards and map pins | VERIFIED | `PaikkaKortti.tsx` line 70: `{paikka.featured && <span ...>Sponsoroitu</span>}` with `bg-amber-100 text-amber-700 border-amber-200`; `Etusivu.tsx` lines 463-467: `{valittu.featured && <span ...>Sponsoroitu</span>}` identical styling in bottom-sheet |
| 3 | List card shows a single-select sport dropdown instead of pill filters | VERIFIED | `LiikuntapaikatLista.tsx` lines 123-132: native `<select>` with `value={aktiivinen}`, `onChange`, `aria-label="Suodata lajin mukaan"`, populated from `LAJIT_FILTTERI.map(l => <option>)` |
| 4 | Card displays walk-in price at the top if available, or "vain jäsenyys"; "Varaa aika" button is absent from list cards | VERIFIED | `PaikkaKortti.tsx` lines 109-124: price `<div>` at position 4; `isMembershipOnly(paikka)` guards "vain jäsenyys" span; `grep Varaa aika` returns 0 matches in PaikkaKortti.tsx; "Näytä tiedot" always rendered |
| 5 | AI widget shows the city name next to the temperature reading | VERIFIED | `Etusivu.tsx` line 21: `const WEATHER_CITY = 'Tampere'`; lines 192-194: `{saa.temp}°{' '}<span className="font-normal text-[rgba(17,17,17,0.45)]">{WEATHER_CITY}</span>` |
| 6 | User can filter venues by city using a city selector in the UI | VERIFIED | `LiikuntapaikatLista.tsx` lines 37, 41, 61, 109-120, 205, 229, 241-246: `aktiivKaupunki` state, `kaupungit = useMemo(() => deriveKaupungit(paikat))`, `matchesKaupunki` in filter, conditional city `<select>`, grid key includes `aktiivKaupunki`, Tyhjennä haku resets city, `/tietosuoja` footer link |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/page.tsx` | SELECT includes `featured` column | VERIFIED | Line 13: explicit 15-column SELECT ending with `, featured`; no `select('*')` |
| `app/tietosuoja/page.tsx` | Static GDPR privacy page | VERIFIED | 118 lines; server component; 6 sections; both placeholder tokens literal; `export default function TietosuojaPage()` |
| `app/paikat/[id]/page.tsx` | Varaussivu Row, no Varaa aika button | VERIFIED | Lines 106-117: `ExternalLink` icon, `label="Varaussivu"`, `target="_blank" rel="noopener noreferrer"`; no `Varaa aika` string in file |
| `lib/priceUtils.ts` | `isMembershipOnly` helper | VERIFIED | 22 lines; exports `isMembershipOnly(p)` with 3-condition rule; Pitfall 2 handled by `if (!kuvaus) return false` |
| `lib/priceUtils.test.ts` | Unit tests for isMembershipOnly | VERIFIED | 9 test cases covering all boundary conditions; `describe('isMembershipOnly', ...)` |
| `lib/cityFilter.ts` | `deriveKaupungit` helper | VERIFIED | 30 lines; exports `deriveKaupungit(paikat)`; Set dedup; `delete('Kaikki')` sentinel; alphabetical sort |
| `lib/cityFilter.test.ts` | Unit tests for deriveKaupungit | VERIFIED | 9 test cases including Pitfall 6 (null, empty, whitespace); `describe('deriveKaupungit', ...)` |
| `app/components/PaikkaKortti.tsx` | Badge, price-at-top, CTA simplification | VERIFIED | `isMembershipOnly` imported; Sponsoroitu badge; price block at position 4; always "Näytä tiedot"; no font-semibold; no font-medium |
| `app/components/LiikuntapaikatLista.tsx` | City + sport dropdowns, footer link | VERIFIED | `deriveKaupungit` imported and used; sport and city selects; `aktiivKaupunki`; dynamic hero subtitle; reset handler; `/tietosuoja` footer Link |
| `app/components/Etusivu.tsx` | WEATHER_CITY constant, city label, bottom-sheet badge | VERIFIED | `WEATHER_CITY = 'Tampere'` at line 21; city label rendered at lines 192-194; `valittu.featured` badge at lines 463-467 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `app/page.tsx` | Supabase SELECT | explicit `featured` in column list | VERIFIED | Line 13 contains `, featured` in the select string |
| `app/tietosuoja/page.tsx` | Next.js App Router `/tietosuoja` | `export default function TietosuojaPage()` | VERIFIED | Default export present; file at correct App Router path |
| `PaikkaKortti.tsx` | `lib/priceUtils.ts` | `import { isMembershipOnly } from '@/lib/priceUtils'` | VERIFIED | Line 10 of PaikkaKortti.tsx; called at line 45 |
| `PaikkaKortti.tsx` | `paikka.featured` | conditional render guard | VERIFIED | Line 70: `{paikka.featured && (` |
| `LiikuntapaikatLista.tsx` | `lib/cityFilter.ts` | `import { deriveKaupungit } from '@/lib/cityFilter'` | VERIFIED | Line 10; called at line 41 in useMemo |
| `LiikuntapaikatLista.tsx footer` | `/tietosuoja` route | `<Link href="/tietosuoja">` | VERIFIED | Lines 241-246 |
| `Etusivu.tsx weather row` | `WEATHER_CITY` constant | JSX expression `{WEATHER_CITY}` | VERIFIED | Line 193: `{WEATHER_CITY}` inside nested span |
| `Etusivu.tsx bottom-sheet` | `valittu.featured` boolean | conditional render guard | VERIFIED | Lines 463: `{valittu.featured && (` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `PaikkaKortti.tsx` price block | `paikka.hinta_kuvaus`, `paikka.hinta_min/max` | Supabase SELECT in `app/page.tsx` via `paikat` prop | Yes — real DB columns | FLOWING |
| `PaikkaKortti.tsx` badge | `paikka.featured` | Supabase SELECT includes `featured` (Plan 01 fix) | Yes — real DB boolean | FLOWING |
| `LiikuntapaikatLista.tsx` city select | `kaupungit` derived from `paikat[].kaupunki` | Supabase SELECT includes `kaupunki`; `deriveKaupungit` processes it | Yes — real DB strings | FLOWING |
| `Etusivu.tsx` weather | `saa.temp` + `WEATHER_CITY` | Open-Meteo API fetch in `useEffect`; `WEATHER_CITY` is a compile-time constant | `saa.temp` is real API data; city is hardcoded Tampere per D-24 | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — all checks require running dev server or live Supabase data. Unit tests cover the pure logic; visual rendering requires human verification.

### Probe Execution

Step 7c: No probe scripts declared in any PLAN.md file. No conventional `scripts/*/tests/probe-*.sh` files found. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LEGAL-01 | 06-02, 06-06 | GDPR privacy page at /tietosuoja | SATISFIED | `app/tietosuoja/page.tsx` exists as server component; footer link in LiikuntapaikatLista wires navigation |
| ADS-02 | 06-01, 06-05, 06-07 | Sponsoroitu badge on list cards and map | SATISFIED | Badge in PaikkaKortti.tsx (list) and Etusivu.tsx bottom-sheet (map); `featured` column in SELECT |
| AI-04 | 06-07 | City name in AI weather widget | SATISFIED | `WEATHER_CITY = 'Tampere'`; rendered in temperature span |
| UI-05 | 06-04, 06-05 | Walk-in price shown; "vain jäsenyys" fallback | SATISFIED | `isMembershipOnly` helper; price block at position 4; unit tests green |
| UI-06 | 06-04, 06-05 | Price at card top; multi-line prices | SATISFIED | Price block at position 4 (between open-status and address); `priceLines` split on `\n` |
| UI-07 | 06-03, 06-05 | "Varaa aika" removed from list; profile page shows URL as text in Row | SATISFIED | No "Varaa aika" in PaikkaKortti.tsx; profile page has Varaussivu Row with ExternalLink |
| UI-08 | 06-06 | Sport filter is a single-select dropdown | SATISFIED | Native `<select>` with `LAJIT_FILTTERI.map()` replacing motion.button pill loop |
| DATA-07 | 06-04, 06-06 | City filter with `deriveKaupungit` | SATISFIED | `deriveKaupungit` implemented and tested; city select in LiikuntapaikatLista; `matchesKaupunki` filter logic |

All 8 Phase 6 requirement IDs are accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `LiikuntapaikatLista.tsx` | 160 | `font-semibold` on price pill buttons (HINTA_FILTTERI) | Info | Pre-existing; untouched by Phase 6 plans (HINTA_FILTTERI pill buttons in Row 2 were out of scope). CLAUDE.md violation but not introduced in this phase. |
| `Etusivu.tsx` | 200, 361, 394, 455, 497 | `font-semibold` in various UI elements | Info | Pre-existing in untouched code paths (map filter pills, fullscreen controls, bottom-sheet sport pill, Varaa → CTA). Plans explicitly scoped fixes to only the lines they touched. The Varaa → CTA at line 497 was required by D-17 to remain unchanged. |

No `TBD`, `FIXME`, or `XXX` debt markers found in any Phase 6 modified file.

### Human Verification Required

### 1. City Filter Dropdown Visibility

**Test:** Load the app with the current Tampere-only dataset and navigate to the list view. Confirm the city dropdown is hidden (expected: `kaupungit.length === 1` so `kaupungit.length > 1` guard suppresses it). Then load with a multi-city dataset and confirm the dropdown appears with sorted city options.
**Expected:** Dropdown hidden for single-city data; visible and functional for multi-city data.
**Why human:** The conditional guard `{kaupungit.length > 1 && (...)}` is correct in the code, but verifying the UX in both states requires live data.

### 2. Sponsoroitu Badge — List Card

**Test:** Ensure at least one venue row has `featured = true` in the Supabase `liikuntapaikat` table. Open the list view (`/?nakyma=lista`). Find the featured venue's card.
**Expected:** Amber "Sponsoroitu" badge appears in the badge row between the sport pill and "Kertakäynti OK" (if applicable). No badge appears on non-featured cards.
**Why human:** Requires a `featured=true` DB row; cannot be verified from code alone.

### 3. Sponsoroitu Badge — Map Bottom-Sheet

**Test:** With a `featured=true` venue, open the map view (default `/`). Tap that venue's map pin. The bottom-sheet rises.
**Expected:** Amber "Sponsoroitu" badge appears next to the sport pill in the bottom-sheet. The "Varaa →" CTA is still present (per D-17).
**Why human:** Requires a `featured=true` DB row and live map interaction.

### 4. vain jäsenyys Fallback

**Test:** Ensure a venue row has `hinta_kuvaus` containing "jäsenyys", `hinta_min = null`, `hinta_max = null`. Open the list view.
**Expected:** That venue's card shows muted gray "vain jäsenyys" text at price position 4 (between open-status and address). A venue with a numeric price shows bold price text instead.
**Why human:** Requires qualifying DB data to confirm the `isMembershipOnly` path renders correctly in-browser.

### 5. AI Weather Widget City Label

**Test:** Open the homepage (default `/`, map view). Wait for the AI widget to load weather data.
**Expected:** Temperature display reads e.g. "7° Tampere" with "Tampere" in muted gray (`rgba(17,17,17,0.45)`) immediately after the degree symbol, on the same line.
**Why human:** Requires Open-Meteo API response and running dev server.

### Gaps Summary

No gaps found. All 6 roadmap success criteria are verified in the codebase. All 8 requirement IDs are satisfied. The 5 items above are human-verification items requiring live data or a running server — they are not code gaps.

---

_Verified: 2026-05-22T06:40:00Z_
_Verifier: Claude (gsd-verifier)_
