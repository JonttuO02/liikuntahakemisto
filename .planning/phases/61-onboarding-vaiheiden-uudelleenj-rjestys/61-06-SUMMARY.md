---
phase: 61-onboarding-vaiheiden-uudelleenj-rjestys
plan: "06"
subsystem: onboarding-wizard
tags: [map, SijaintiPicker, AdvancedMarker, visual-parity, UAT-fix]
dependency_graph:
  requires: ["61-02"]
  provides: []
  affects: ["app/components/SijaintiPicker.tsx"]
tech_stack:
  added: []
  patterns:
    - "disableDefaultUI on Map — same pattern as Etusivu.tsx, business/map/page.tsx, admin/[id]/page.tsx"
    - "0x0 anchor div + inline SVG teardrop pin — same pattern as business/map/page.tsx"
key_files:
  created: []
  modified:
    - app/components/SijaintiPicker.tsx
decisions:
  - "Custom teardrop SVG uses pointerEvents:none so drag events fall through to AdvancedMarker"
  - "SVG positioned with left:-12px bottom:0 so teardrop tip anchors to the map coordinate"
metrics:
  duration: "3min"
  completed: "2026-06-26"
  tasks_completed: 1
  tasks_total: 1
status: complete
requirements: [ONBOARD-20]
---

# Phase 61 Plan 06: SijaintiPicker — disableDefaultUI ja räätälöity pin Summary

SijaintiPicker sai visuaalisen pariteettiin muun sovelluksen karttakomponenttien kanssa: disableDefaultUI piilottaa oletuskontrollit ja AdvancedMarker käyttää nyt räätälöityä mustaa teardrop-piniä.

## What Was Built

**Task 1 — Add disableDefaultUI and custom location pin to SijaintiPicker**
Commit: `88ca288`

Kaksi muutosta `app/components/SijaintiPicker.tsx`-tiedostoon:

1. **`disableDefaultUI`-prop** lisätty `<Map>`-komponenttiin `gestureHandling="greedy"`-propin jälkeen. Piilottaa satelliittivaihtokytkimen, fullscreen-painikkeen ja pegmanin — sama malli kuin `Etusivu.tsx`, `app/business/map/page.tsx` ja `app/admin/[id]/page.tsx`.

2. **Räätälöity teardrop-pini** — self-closing `<AdvancedMarker />` korvattu versiolla, joka sisältää:
   - 0x0 ankkuridiv (`position: relative, width: 0, height: 0`)
   - Inline SVG (24x32, viewBox "0 0 24 32"), asemoitu `left: -12, bottom: 0` niin että pinin kärki osoittaa tarkasti kartassa olevaan pisteeseen
   - Teardrop-polku (`M12 0C5.373 0...`) täytteellä `#111111` (brändiprimääri)
   - Valkoinen ympyrä (cx 12, cy 12, r 4) pinin sisällä
   - `pointerEvents: 'none'` jotta drag-tapahtumat läpäisevät SVG:n AdvancedMarkerille

## Verification

- `npx tsc --noEmit` läpäisee ilman virheitä
- Ei odottamattomia tiedostopoistoJa commitissa

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Inline SVG on staattinen markup ilman ulkoista `src`/`href`-attribuuttia — ei XSS-vektoria (T-61-13 accept-disposition, kuten suunniteltu).

## Self-Check: PASSED

- [x] `app/components/SijaintiPicker.tsx` muokattu (worktree-polku)
- [x] Commit `88ca288` olemassa
- [x] TypeScript ei tuota uusia virheitä
