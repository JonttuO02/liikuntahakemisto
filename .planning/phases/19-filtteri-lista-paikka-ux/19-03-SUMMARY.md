---
plan: "19-03"
phase: 19-filtteri-lista-paikka-ux
status: completed
completed_at: "2026-05-30"
---

# Plan 19-03 Summary — Etusivu filters + AI widget + Karuselli

## What was done

### Etusivu.tsx
- Added `isMembershipOnly` import from `@/lib/priceUtils`
- Removed `HINTA_FILTTERI` constant and `searchHinta` state
- Added `searchKertakaynti` boolean state (default `false`)
- Updated `searchSuodatettu` useMemo: replaced `matchesHinta` with `matchesKertakaynti = !searchKertakaynti || !isMembershipOnly(p)`
- Updated `isFilterActive` to use `searchKertakaynti` instead of `searchHinta !== null`
- Replaced HINTA_FILTTERI.map filter pills with single "Kertakäynti OK" toggle button
- Updated "Tyhjennä haku" to call `setSearchKertakaynti(false)` instead of `setSearchHinta(null)`
- Added `onShowMap` prop to `DiagonaalKortti` that calls `setSearchOpen(false)` + `setAutoZoomTarget` + `pendingValittuRef.current`
- Restructured AI widget from single-row to two-row flex-col: Row 1 = weather + toggle, Row 2 = aiTeksti (conditional)

### Karuselli.tsx
- Changed card `bottom` from `'10%'` to `'5%'`
- Added `maxHeight: 160` to card style

## Verification

- `HINTA_FILTTERI` count: 0, `searchHinta` count: 0
- `searchKertakaynti` count: 6
- "Kertakäynti OK" button present with aria-label
- `matchesKertakaynti` in useMemo filter + return
- AI widget: `flex flex-col gap-1 px-4 py-4`
- `onShowMap=` on DiagonaalKortti
- Karuselli: `bottom: '5%'` and `maxHeight: 160`
- `npx tsc --noEmit` exits 0
