---
phase: 15-arvostelut
plan: "03"
subsystem: frontend-components
tags: [react, framer-motion, glassmorphism, reviews, auth, upsert, supabase]

requires:
  - phase: 15-arvostelut
    plan: "01"
    provides: lib/reviewUtils.ts (resolveDisplayName, computeAvgRating), reviews table migration
  - phase: 15-arvostelut
    plan: "02"
    provides: app/components/StarPicker.tsx, app/components/ReviewSection.tsx (ReviewForm import slot)

provides:
  - app/components/ReviewForm.tsx: Auth-gated review form with four-state machine, INSERT/UPDATE upsert, router.refresh()

affects:
  - 15-02 (ReviewSection.tsx TS2307 missing-module error now resolved — ReviewForm.tsx exists)
  - 15-04 (page.tsx can now render ReviewSection without build errors; router.refresh() revalidates server fetch after submit)

tech-stack:
  added: []
  patterns:
    - "Auth machine: subscribeToAuthUser + useRef for async-safe submit handler (HeartButton pattern)"
    - "Upsert with onConflict: 'user_id,paikka_id' (composite UNIQUE) — prevents duplicate review"
    - "router.refresh() after success revalidates server component data (Pitfall 6 from RESEARCH.md)"
    - "2500ms auto-clear success message via setTimeout (ProfiiliClient pattern)"
    - "Locked form overlay: opacity-60 pointer-events-none + absolute CTA button (D-02)"
    - "Existing review read+edit mode with 'Muokkaa arvostelu' toggle (D-03)"

key-files:
  created:
    - app/components/ReviewForm.tsx
  modified: []

key-decisions:
  - "buildForm({ disabled }) helper function renders both the locked overlay form and the interactive form from the same code — avoids duplication"
  - "ExistingReviewView rendered as inline component within the file — no separate file needed for this small read-only display"
  - "today constant declared at module scope for max={today} on date input — safe because hydration is per-request"
  - "isAnonymous default false (show name) per D-03 and REVIEW-02"
  - "CrowdRatingPills tap-to-deselect: setCrowdRating(isActive ? null : opt.value) — field is optional per schema"

metrics:
  duration: 10min
  completed: 2026-05-28
  tasks: 1/1
  files: 1
---

# Phase 15 Plan 03: ReviewForm Implementation Summary

**Auth-gated review submission form with four-state machine (loading/unauthenticated/new-review/edit-review), Supabase upsert with composite onConflict, and router.refresh() cache invalidation — verify script passes, TypeScript clean, 63 tests green**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Tasks:** 1/1 complete
- **Files created:** 1

## Accomplishments

- `ReviewForm.tsx`: Four-state auth machine driven by `subscribeToAuthUser` + `useRef` (HeartButton pattern)
  - **Loading:** Single skeleton bar `h-10 rounded-xl bg-[rgba(17,17,17,0.05)] animate-pulse`
  - **Unauthenticated:** Locked form (opacity-60, pointer-events-none) with absolute 'Kirjaudu arvostellaksesi' CTA opening AuthModal
  - **Authenticated, no review:** Full interactive form with StarPicker, textarea, date input (max={today}), CrowdRatingPills, AnonymousToggle, submit button
  - **Authenticated, has review:** Read-only ExistingReviewView + 'Muokkaa arvostelu' outlined button toggling edit mode
- Upsert: `supabase.from('reviews').upsert(payload, { onConflict: 'user_id,paikka_id' })` — composite UNIQUE match
- `reviewer_name = user.email?.split('@')[0]` — T-15-02 email-prefix mitigation
- `router.refresh()` triggers server component re-fetch after success
- Success message 'Arvostelu tallennettu' auto-clears after 2500ms
- Error message 'Tallennus epäonnistui. Yritä uudelleen.' persists until next submit
- All ARIA attributes: `aria-pressed` on CrowdRatingPills + AnonymousToggle, `aria-label` on textarea + date input, `aria-disabled` on disabled submit button
- Verify script: exits 0, prints OK
- `npx tsc --noEmit`: exits 0 (no errors)
- `npx vitest run`: 63/63 tests passing (no regressions)

## Task Commits

1. **Task 1: Create ReviewForm.tsx** - `63f126f` (feat)

## Files Created/Modified

- `/app/components/ReviewForm.tsx` — Auth-gated form: `subscribeToAuthUser` auth machine, `buildForm()` helper, `ExistingReviewView` inline component, upsert submit handler, CrowdRatingPills + AnonymousToggle sub-widgets

## Decisions Made

- `buildForm({ disabled })` renders both locked and interactive form variants from the same JSX tree — avoids code duplication while preserving the visual locked overlay structure
- `ExistingReviewView` declared as an inline named function before the default export — co-located, no separate file
- `today` at module scope: `new Date().toISOString().split('T')[0]` — safe, stripped to YYYY-MM-DD for `<input type="date">` (Pitfall 4 resolved)
- `isAnonymous` defaults to `false` — show name is the default per D-03 and REVIEW-02
- Tap-to-deselect on CrowdRatingPills: tapping active pill sets crowdRating to null (field is optional per DB schema)

## Deviations from Plan

None — plan executed exactly as written. All must-have truth statements satisfied, all verify script checks pass.

## Known Stubs

None — ReviewForm.tsx is complete and fully wired. The ReviewSection stub from Plan 02 (TS2307 missing ./ReviewForm) is now resolved.

## Threat Flags

No new threat surface beyond the plan's threat model.

- T-15-01 mitigated: `currentUser.current.id` from `subscribeToAuthUser` (server-validated session) populates `user_id` in payload — cannot be forged by client input
- T-15-02 mitigated: `reviewer_name = user.email?.split('@')[0]` strips domain; `user_id` not rendered anywhere
- T-15-03 mitigated: `onConflict: 'user_id,paikka_id'` turns second submit into UPDATE
- T-15-04 mitigated: `max={today}` on date input enforces upper bound at browser
- T-15-05 mitigated: `review.teksti` rendered as React text node in ExistingReviewView — no `dangerouslySetInnerHTML`

## Self-Check: PASSED

- `app/components/ReviewForm.tsx` exists: FOUND
- Commit `63f126f`: FOUND
- Verify script: OK
- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: 63/63 passing

---
*Phase: 15-arvostelut*
*Completed: 2026-05-28*
