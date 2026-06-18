---
phase: 51-live-esikatselu-velhossa
plan: 07
subsystem: ui
tags: [react, context, reducer, typescript, onboarding-wizard, live-preview]

# Dependency graph
requires:
  - phase: 51-live-esikatselu-velhossa (plans 01-06)
    provides: LivePreviewContext.tsx reducer/Provider skeleton and StepHinnasto/StepAukioloajat/StepYhteystiedot dispatch wiring
provides:
  - "Branding branch of livePreviewPaikka now overlays live state.hinnasto/aukioloajat/yhteystiedot onto buildBrandingPreview's AI-scraped base, with per-field fallback"
affects: [51-live-esikatselu-velhossa verification, future onboarding-wizard live-preview work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Caller-side overlay pattern: capture a shared builder's output as `base`, then spread + override specific fields with live state and a `?? base.<field>` fallback — keeps the shared builder's signature untouched while satisfying a caller-specific live-data requirement"

key-files:
  created: []
  modified:
    - lib/livePreview/LivePreviewContext.tsx

key-decisions:
  - "Overlay live state in the caller (LivePreviewContext.tsx) rather than adding parameters to buildBrandingPreview, since that shared builder is also called by StepEsikatselu and the pre-phase esikatseluruutu, which must keep their current (non-live) behavior unchanged"

patterns-established:
  - "Per-field `?? base.<field>` fallback to mirror buildDraftAsPaikka's existing merge-with-fallback semantics in the branding branch, so both branches of livePreviewPaikka now behave consistently"

requirements-completed: [LIVEPREV-01, LIVEPREV-02, LIVEPREV-03, LIVEPREV-04]

# Metrics
duration: 10min
completed: 2026-06-18
status: complete
---

# Phase 51 Plan 07: Live state overlay on branding-branch preview Summary

**Branding branch of `livePreviewPaikka` now overlays live `state.hinnasto`/`state.aukioloajat`/`state.yhteystiedot` onto `buildBrandingPreview`'s AI-scraped base, fixing CR-01 so AI-website-analysis-onboarded venues see live pricing/hours/contact edits in the wizard preview.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments
- `lib/livePreview/LivePreviewContext.tsx`'s branding branch (`if (brandingData && paikkaInfo && ...)`) now captures `buildBrandingPreview(...)`'s result as `base`, then returns `{ ...base, hinta_kuvaus, aukioloajat, puhelin, kuvaus, varauslinkki }` overlaid with live state, each falling back to `base` when the corresponding live state field is null/empty
- `hinnastaToHintaKuvaus` added to the existing `@/lib/onboardingUtils` import (single import statement, not a new line)
- `buildBrandingPreview`'s shared signature and `lib/onboardingUtils.ts` are untouched — verified via `git diff --stat` showing zero changes to either file
- Non-branding branch (`buildDraftAsPaikka`) and EditMode path remain unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Overlay live hinnasto/aukioloajat/yhteystiedot onto buildBrandingPreview's output** - `3bf5a67` (fix)

_Note: single-task plan, single commit._

## Files Created/Modified
- `lib/livePreview/LivePreviewContext.tsx` - Branding branch of `livePreviewPaikka` useMemo overlays live state onto `buildBrandingPreview`'s base object; added `hinnastaToHintaKuvaus` import

## Decisions Made
- Overlay confined to the caller (LivePreviewContext.tsx) rather than modifying `buildBrandingPreview`'s signature, preserving StepEsikatselu and the pre-phase esikatseluruutu's existing (non-live) behavior — see key-decisions above

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Self-Verification

- `npx tsc --noEmit -p tsconfig.json` — zero errors
- `grep -c "from '@/lib/onboardingUtils'" lib/livePreview/LivePreviewContext.tsx` → `1` (single import statement)
- `grep -n "\.\.\.base" lib/livePreview/LivePreviewContext.tsx` → spread present in branding branch (line 147)
- `grep -n "hinnastaToHintaKuvaus" lib/livePreview/LivePreviewContext.tsx` → import (line 26) and usage in `hinta_kuvaus` overlay (line 148)
- `git diff --stat lib/branding/brandingResult.ts lib/onboardingUtils.ts` → no output (zero changes to either file)
- Non-branding branch (`return buildDraftAsPaikka(state as OnboardingDraft, paikkaInfo)`) and final `return null` are byte-identical to before
- useMemo dependency array unchanged: `[state, paikkaInfo, brandingData]`
- File line count: 192 (exceeds the 180 min_lines artifact requirement)
- No `RESET` dispatch introduced

## Next Phase Readiness

This was the last remaining failing path for LIVEPREV-01/04 (criteria #1/#4). All 5 phase truths for Phase 51 are now satisfiable; LIVEPREV-01..04 can be checked off in REQUIREMENTS.md by the orchestrator. Human spot-check (per plan's `<human_verification>` section) recommended before final sign-off: start AI-website-analysis onboarding, edit pricing/hours/contact, confirm live preview updates and untouched steps still show AI-scraped data.

---
*Phase: 51-live-esikatselu-velhossa*
*Completed: 2026-06-18*
