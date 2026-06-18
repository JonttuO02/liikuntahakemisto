---
phase: 51-live-esikatselu-velhossa
plan: 05
subsystem: ui
tags: [react, useEffect, live-preview, business-onboarding, blob-url]

# Dependency graph
requires:
  - phase: 51-live-esikatselu-velhossa
    provides: LivePreviewContext (SET_MEDIA reducer action), StepMediat instant SET_MEDIA wiring (plans 01-04)
provides:
  - Unmount-time SET_MEDIA fallback in StepMediat that replaces staged blob: URLs with last-known persisted (non-blob) media before the existing revocation effects run
affects: [business-onboarding-wizard, edit-mode-paikka]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unmount-only useEffect (empty deps, dispatch lives in returned cleanup) to reset shared context state before sibling cleanup effects revoke object URLs"

key-files:
  created: []
  modified:
    - app/business/onboarding/StepMediat.tsx

key-decisions:
  - "Used SET_MEDIA replacement (not a RESET dispatch) to clear stale blob URLs on unmount, matching the existing reducer action and avoiding the out-of-scope dead RESET path (WR-01)"

patterns-established:
  - "When a component stages object URLs for a shared context preview, pair the per-state revocation effect with one unmount-only effect (declared last) that dispatches the persisted fallback value, ensuring cleanup ordering prevents the shared context from ever referencing a revoked URL"

requirements-completed: [LIVEPREV-04]

# Metrics
duration: 10min
completed: 2026-06-18
status: complete
---

# Phase 51 Plan 05: Live Preview Blob URL Staleness Fix Summary

**Unmount-time SET_MEDIA dispatch in StepMediat clears staged blob: URLs from LivePreviewContext before the existing revocation effects fire, closing the CR-01/LIVEPREV-04 verification gap**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-18T07:10:00Z (approx)
- **Completed:** 2026-06-18
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added a new unmount-only `useEffect` (empty dependency array, dispatch in the returned cleanup) to `StepMediat.tsx`
- The new effect dispatches `SET_MEDIA` with `logo: existingLogoUrl ?? null` and `photos: existingPhotoUrls` — both non-blob, persisted values
- Declared after the two existing blob-revocation cleanup effects and the instant SET_MEDIA effect, so React's declaration-order cleanup ensures the context is reset to persisted data before — or alongside — the blobs being revoked
- Closes the only remaining gap (CR-01 / criterion #4 partial) for LIVEPREV-04: the live preview no longer renders a broken `blob:` image after a user leaves Mediat with unsaved staged media

## Task Commits

Each task was committed atomically:

1. **Task 1: Dispatch a non-blob fallback SET_MEDIA on StepMediat unmount so live preview never holds a revoked blob URL** - `22f0b74` (fix)

**Plan metadata:** (this commit, in worktree mode)

## Files Created/Modified
- `app/business/onboarding/StepMediat.tsx` - Added unmount-only `useEffect` dispatching `SET_MEDIA` with `existingLogoUrl`/`existingPhotoUrls` fallback values

## Decisions Made
- Followed the plan exactly: SET_MEDIA replacement chosen over introducing a RESET dispatch, since RESET (WR-01) is explicitly out of scope per the plan and the existing reducer's SET_MEDIA branch already supports full replacement when both `logo` and `photos` keys are supplied.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

LIVEPREV-04 is now fully satisfied across all field paths (pricing, hours, contact, and media). No known remaining gaps for Phase 51's live-preview feature. Human spot-check recommended per the plan's `<human_verification>` section: stage a logo on Mediat, navigate to Hinnasto before saving, confirm the preview shows persisted/no-media state rather than a broken blob image.

---
*Phase: 51-live-esikatselu-velhossa*
*Completed: 2026-06-18*

## Self-Check: PASSED
