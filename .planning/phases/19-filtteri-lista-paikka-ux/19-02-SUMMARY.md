---
plan: "19-02"
phase: 19-filtteri-lista-paikka-ux
status: completed
completed_at: "2026-05-30"
---

# Plan 19-02 Summary — DiagonaalKortti overhaul

## What was done

- Removed Static Maps constants (`API_KEY`, `MAP_ID`) and `staticMapsUrl` function
- Added `onShowMap?: (paikka: Liikuntapaikka) => void` to `DiagonaalKorttiProps`
- Replaced Static Maps right panel with `image_url`-based venue photo + `onError` fallback to sport-color div
- Added pin button (MapPin, `absolute bottom-3 left-3 z-20`) outside `<Link>` tag that calls `onShowMap?.(paikka)` with `stopPropagation`/`preventDefault`
- Kept `hasCoords` for pin button condition

## Verification

- `grep -c "staticMapsUrl|API_KEY|MAP_ID"` → 0
- `onShowMap` appears 3 times (interface, destructure, call)
- `data-fallback` and `hidden={!!paikka.image_url}` on fallback div
- `aria-label="Näytä kartalla"` on pin button
- `npx tsc --noEmit` exits 0
