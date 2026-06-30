---
phase: 62-venuepage-konsolidaatio
plan: 01
subsystem: ui
tags: [react, nextjs, next-intl, i18n, lucide-react]

# Dependency graph
requires: []
provides:
  - "PaikkaSheet renders a conditional 'Näytä kartalla' (show-on-map) SheetRow, content-migration prerequisite for deleting app/paikat/[id]"
  - "PaikkaSheet i18n namespace (fi+en) carries location + showOnMap keys"
affects: [62-02-venuepage-konsolidaatio, 62-03-venuepage-konsolidaatio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional SheetRow gated on coordinate presence + !preview, mirrors existing Phone/Hours/Description row pattern"

key-files:
  created: []
  modified:
    - app/components/PaikkaSheet.tsx
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "Used w-4 h-4 icon size (not UI-SPEC's w-5 h-5) per plan override — matches every other existing SheetRow icon in PaikkaSheet.tsx, CLAUDE.md consistency rule wins over UI-SPEC code sample"
  - "FI showOnMap value omits the trailing arrow (→) that the old PaikkaPage.showOnMap key had — new PaikkaSheet.showOnMap is a clean 'Näytä kartalla'"

patterns-established:
  - "Migrating unique content from a page-route component into PaikkaSheet via SheetRow before the source route is deleted (content-migration-before-deletion pattern), to be repeated for any other future unique page-route content"

requirements-completed: [VENUEPAGE-02]

coverage:
  - id: D1
    description: "PaikkaSheet shows a 'Näytä kartalla' (show-on-map) SheetRow with MapPin icon when the venue has latitude/longitude and the sheet is not in preview mode"
    requirement: "VENUEPAGE-02"
    verification:
      - kind: unit
        ref: "grep -n 'paikka.latitude != null && paikka.longitude != null && !preview' app/components/PaikkaSheet.tsx — match found at line 265"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit — no PaikkaSheet.tsx type errors after t('location')/t('showOnMap') keys added"
        status: pass
    human_judgment: true
    rationale: "Visual rendering behavior (row appears/absent correctly across coordinate-present, coordinate-absent, and preview=true states) requires a human to open PaikkaSheet in the browser and confirm — no automated UI test framework exists in this project (RESEARCH: no test framework installed, manual UAT only)."
  - id: D2
    description: "PaikkaSheet i18n namespace (fi.json + en.json) carries location and showOnMap keys, resolved via useTranslations('PaikkaSheet'), with no trailing arrow on the FI showOnMap value"
    requirement: "VENUEPAGE-02"
    verification:
      - kind: unit
        ref: "node -e JSON.parse(...) on messages/fi.json and messages/en.json — both valid JSON"
        status: pass
      - kind: unit
        ref: "grep -n '\"location\"' messages/fi.json messages/en.json — present under PaikkaSheet block at lines 34/before PaikkaPage block at line ~309"
        status: pass
    human_judgment: false

# Metrics
duration: 18min
completed: 2026-06-30
status: complete
---

# Phase 62 Plan 01: Migrate show-on-map content into PaikkaSheet Summary

**Added a conditional "Näytä kartalla" SheetRow (MapPin icon, `/?id=X` anchor) to PaikkaSheet plus matching `location`/`showOnMap` i18n keys in fi+en, completing the content-migration prerequisite for deleting `app/paikat/[id]`**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-30T21:48:00Z
- **Completed:** 2026-06-30T22:06:15Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- PaikkaSheet.tsx now imports `MapPin` and renders a new conditional SheetRow ("SIJAINTI" label) between the Description row and the Reviews section, guarded by `paikka.latitude != null && paikka.longitude != null && !preview`
- The row's anchor (`<a href="/?id=${paikka.id}">`) reuses the existing Etusivu `focusId` URL-param mechanism that centers the map on the venue — no new navigation logic introduced
- `messages/fi.json` and `messages/en.json` both gained `PaikkaSheet.location` and `PaikkaSheet.showOnMap` keys; the FI value intentionally omits the trailing arrow (`→`) the old `PaikkaPage.showOnMap` key had

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MapPin import and the show-on-map SheetRow to PaikkaSheet** - `417438c` (feat)
2. **Task 2: Add location + showOnMap keys to the PaikkaSheet i18n namespace (fi + en)** - `387e2ff` (feat)

_Note: Both tasks needed to land together before `npm run build`'s TypeScript pass would succeed — next-intl's `NamespacedMessageKeys` type augmentation requires the message keys to exist before `t('location')`/`t('showOnMap')` type-checks cleanly. Verified the full build after both edits, then committed each task's files separately per the per-task commit protocol._

## Files Created/Modified
- `app/components/PaikkaSheet.tsx` - Added `MapPin` to lucide-react import; added conditional "Näytä kartalla" SheetRow after Description, before Reviews
- `messages/fi.json` - Added `PaikkaSheet.location` = "Sijainti", `PaikkaSheet.showOnMap` = "Näytä kartalla" (no arrow)
- `messages/en.json` - Added `PaikkaSheet.location` = "Location", `PaikkaSheet.showOnMap` = "Show on map"

## Decisions Made
- **Icon size: `w-4 h-4` not `w-5 h-5`.** The plan explicitly calls out that the UI-SPEC code sample uses `w-5 h-5` (matching the old page's `Row` component), but every existing SheetRow icon in PaikkaSheet.tsx (Info, Phone, Clock, CircleDollarSign) uses `w-4 h-4`. Followed the plan's instruction to use `w-4 h-4` for consistency — CLAUDE.md's consistency rule wins over the UI-SPEC sample (RESEARCH anti-pattern 3).
- **No new text-color class on the MapPin glyph.** SheetRow's icon wrapper already applies `text-[rgba(17,17,17,0.5)]` muted color, matching the existing `<Info className="w-4 h-4" />` usage pattern (no per-icon color override).
- **Plain `<a>` tag, not Next.js `<Link>`.** Per plan instruction and RESEARCH Pattern 1 — the click triggers a full URL context change (`/?id=X`) consumed by Etusivu's existing `focusId` handler, which is intentional, not an oversight.

## Deviations from Plan

None — plan executed exactly as written. One verification-script discrepancy worth noting (not a deviation in implementation):

- The plan's Task 2 acceptance criteria expected `grep -c "showOnMap" messages/fi.json` to return 2 (one in `PaikkaSheet`, one in `PaikkaPage`). The actual count is 3, because the pre-existing `PaikkaKortti` namespace (unrelated to this plan, added in an earlier phase) already has its own `showOnMap` key that the RESEARCH document's grep count missed. Confirmed via line-by-line inspection that the three occurrences are: `PaikkaKortti.showOnMap` (line 21, pre-existing, untouched), `PaikkaSheet.showOnMap` (line 35, new, no arrow — this plan's deliverable), and `PaikkaPage.showOnMap` (line 310, old, with trailing arrow, untouched until Plan 03). The intended keys (`PaikkaSheet.location` / `PaikkaSheet.showOnMap`, no arrow) are correctly in place; this is purely an outdated grep-count expectation in the plan, not an implementation bug.

## Issues Encountered

- `npm run build` reported a pre-existing ESLint error unrelated to this plan's files: `app/business/onboarding/page.tsx:205 — 'paikkaInfo' is assigned a value but never used`. Confirmed via `git log` that this file was last modified in Phase 61 (commit `096f218`) and is untouched by this plan. Per the SCOPE BOUNDARY rule, this was NOT fixed here — logged to `.planning/phases/62-venuepage-konsolidaatio/deferred-items.md` for a future cleanup phase. Verified the actual acceptance criteria (TypeScript compilation of `PaikkaSheet.tsx` itself) passed cleanly via `npx tsc --noEmit` with zero errors referencing `PaikkaSheet.tsx`, and the webpack compile step reported "Compiled successfully" before the unrelated lint error halted the build's exit code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PaikkaSheet is now feature-complete with the "Näytä kartalla" content that previously lived only on `app/paikat/[id]`, satisfying the content-migration prerequisite (VENUEPAGE-02) that Plan 03 (route deletion) depends on
- Plan 02 (DiagonaalKortti `onOpen` wiring) is independent of this plan's changes and can proceed in parallel
- Plan 03 (route deletion + `PaikkaPage` namespace cleanup) can now safely delete `app/paikat/[id]/` and remove the `PaikkaPage` i18n block once Plan 02 also lands, since this plan's `PaikkaSheet` row covers the only unique content that page provided
- No blockers

---
*Phase: 62-venuepage-konsolidaatio*
*Completed: 2026-06-30*
