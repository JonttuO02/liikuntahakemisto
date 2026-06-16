---
phase: 48-logo-v-ri-ja-galleriavalinta
plan: 03
subsystem: frontend
tags: [nextjs, react, onboarding, branding, autosave, quick-accept]

# Dependency graph
requires:
  - phase: 48-logo-v-ri-ja-galleriavalinta
    plan: 01
    provides: Validated PATCH /api/business/branding (logo/color/gallery membership), reshaped BrandingResult (image_urls, logo_candidates)
  - phase: 48-logo-v-ri-ja-galleriavalinta
    plan: 02
    provides: paikkaId threaded through AnalysoiSivusto, selectedLogoUrl picker state (server-validated), patchBranding autosave helper
provides:
  - Gallery checkbox picker (up to 8 thumbnails, first 5 pre-checked, 5-cap) with autosave PATCH
  - Awaited handleConfirm save-step write closing the WizardInner on-mount draft-fetch race, so gallery/logo selections reliably pre-fill StepMediat
  - Quick-accept ("Hyväksy ja lähetä") — maps AI results + selections into onboarding_draft via the unchanged save-step route, then calls the unchanged submit route
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Awaited pre-navigation write: handleConfirm in page.tsx is now async and awaits the save-step POST before setPagePhase('wizard'), preventing a child component's on-mount data fetch from racing ahead of a parent-triggered write — generalizable pattern for any future 'persist then navigate into a re-fetching child' integration point"
    - "Quick-accept draft mapping: client-side function maps raw_analysis fields into the exact onboarding_draft field shapes (hinnasto array, aukioloajat record, yhteystiedot, media_urls) and writes them via sequential awaited save-step calls (step 6 = final), then calls the existing submit route unmodified — no new write path introduced for an accelerated flow"

key-files:
  created: []
  modified:
    - app/business/onboarding/AnalysoiSivusto.tsx
    - app/business/onboarding/page.tsx

key-decisions:
  - "paikkaId resolved inside PrePhase (page.tsx) is threaded up to the parent OnboardingWizardPage via a new onPaikkaIdResolved callback, since handleConfirm (which performs the awaited save-step write) lives in the parent and needs the same paikkaId AnalysoiSivusto already has, without re-deriving it a second time."
  - "Quick-accept's save-step failure handling stops the sequence immediately and does not call submit — per the plan's explicit partial-failure design, this is recoverable via idempotent retry (re-click) or by falling back to 'Jatka velhoon →' or one of mid-sequence (no transactional rollback attempted, none needed)."
  - "Quick-accept's post-submit navigation target (/business) mirrors StepEsikatselu's existing full-wizard submit success path exactly, so quick-accept and full-wizard completion land the user in the same place."

patterns-established:
  - "Gallery picker mirrors StepMediat's corner-badge thumbnail pattern (absolute -top-1 -right-1 rounded-full badge) but swaps the delete '×' for a lucide Check icon and the action from delete to toggle-select — reusable visual precedent for any future selectable (not just deletable) thumbnail grid."

requirements-completed: [ONBOARD-16, FLOW-02, FLOW-03]

# Metrics
duration: 24min
completed: 2026-06-16
---

# Phase 48 Plan 03: Gallery Picker + Quick-Accept Summary

**Added an autosaving 5-cap gallery checkbox picker that reliably pre-fills the wizard's Mediat step (via an awaited save-step write that closes a draft-fetch race), and a "Hyväksy ja lähetä" quick-accept path that maps AI results + user selections into the existing onboarding_draft and reuses the unmodified submit route.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-06-16T19:31:00Z (continued from Plan 02 context)
- **Completed:** 2026-06-16T19:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Gallery picker added to `AnalysoiSivusto.tsx`'s preview block: renders up to 8 scraped thumbnails in a 4-column grid, first 5 (or fewer) start checked, 5-cap enforced by dimming + disabling unselected thumbnails once 5 are chosen, `{n}/5 valittu` counter, each toggle autosaves via `patchBranding({ image_urls })` (validated server-side by Plan 01's PATCH route)
- `onConfirm` signature extended to `(brandingData, { logoUrl, gallery })`, carrying the server-validated `selectedLogoUrl` and the gallery selection forward from the preview screen
- `page.tsx`'s `handleConfirm` is now `async` and **awaits** the `media_urls` save-step write before calling `setPagePhase('wizard')` — this closes the race where `WizardInner`'s on-mount draft re-fetch could read a stale draft and silently drop the gallery/logo prefill; `paikkaId` is threaded from `PrePhase` up to the parent via a new `onPaikkaIdResolved` callback so `handleConfirm` can target the correct draft row
- `handleQuickAccept` added: maps `raw_analysis.prices` → `hinnasto` array (`{kategoria,hinta,lisatieto:''}`), `raw_analysis.opening_hours` → `aukioloajat` record, `raw_analysis.website_url` → `yhteystiedot`, and `{selectedLogoUrl, selectedGallery}` → `media_urls`; writes all four fields sequentially via the **unchanged** `save-step` route (step 6), then calls the **unchanged** `submit` route — no parallel write path
- Footer gained a second equal-weight `PrimaryButton` ("Hyväksy ja lähetä" / "Lähetetään..." loading state) next to "Jatka velhoon →"; both buttons disable while `submittingQuick` to prevent double-submit
- Partial save-step failure stops the sequence before calling submit, surfaces `Lähetys epäonnistui. Yritä uudelleen tai jatka velhon kautta.` (`role="alert"`), and is documented as recoverable via idempotent retry (each save-step is an UPSERT) or full-wizard fallback — no compensation/rollback logic added

## Task Commits

Each task was committed atomically:

1. **Task 1: Gallery checkbox picker with autosave + prefill into the wizard's Mediat step** - `8bf56ad` (feat)
2. **Task 2: Quick-accept ("Hyväksy ja lähetä") — map to draft, call existing submit unmodified** - `4d08e3a` (feat)

**Plan metadata:** (this commit, made by orchestrator after wave merge)

## Files Created/Modified
- `app/business/onboarding/AnalysoiSivusto.tsx` - gallery picker UI + `selectedGallery` state + `toggleGalleryImage`; `handleQuickAccept` quick-accept logic; `submittingQuick`/`quickError` state; footer gains the "Hyväksy ja lähetä" button and error display; `onConfirm` signature carries `{logoUrl, gallery}`
- `app/business/onboarding/page.tsx` - `handleConfirm` is now `async` and awaits the `media_urls` save-step POST before `setPagePhase('wizard')`; `PrePhase` gained an `onPaikkaIdResolved` callback so the parent can track `paikkaId` for the awaited write

## Decisions Made
- Threaded `paikkaId` from `PrePhase` to the parent via callback rather than re-resolving it in `OnboardingWizardPage`, avoiding a duplicate `business_paikka_links` lookup
- Quick-accept stops immediately on any save-step failure (no partial submit) — recovery is via idempotent retry or the full-wizard fallback, matching the plan's explicit accepted-risk disposition for T-48-14
- Quick-accept's success redirect target (`/business`) matches the full wizard's `StepEsikatselu` submit success path exactly, so both flows converge on the same post-submission screen

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria (verified via the plan's own grep/typecheck gates) passed without requiring any auto-fixes.

## Issues Encountered
None beyond the pre-existing environment limitation already documented in Plan 02's summary (missing `.env.local` in this worktree breaks `npm run build`'s page-data-collection step for an unrelated route — `npx tsc --noEmit` and `npx next lint` both ran clean against this plan's files, which is the plan's actual verification gate).

## User Setup Required
None for this plan.

## Next Phase Readiness
- Phase 48 is now complete: logo picker (Plan 02), color picker (Plan 02), gallery picker + prefill (Plan 03), and quick-accept (Plan 03) are all wired against the validated PATCH route and unchanged save-step/submit routes from Plan 01
- Manual verification still recommended before considering the phase fully shippable: (1) select ≤5 gallery images, click "Jatka velhoon →", confirm the Mediat step shows the prefilled grid with no flicker; (2) click "Hyväksy ja lähetä" end-to-end and confirm `claim_status` resets to `pending` and the draft is deleted; (3) simulate a mid-sequence save-step failure and confirm the dual-recovery error path and idempotent retry work as described

---
*Phase: 48-logo-v-ri-ja-galleriavalinta*
*Completed: 2026-06-16*
