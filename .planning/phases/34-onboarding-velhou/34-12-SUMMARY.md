---
phase: 34-onboarding-velhou
plan: 12
status: awaiting-human-verify
completed: "2026-06-10"
commits:
  - 7abebe7
  - ad5cb4f
  - cf17649
subsystem: onboarding-wizard
tags: [gap-closure, uat, image-preview, draft-state, db-migration]
dependency-graph:
  requires: ["34-11"]
  provides: ["image_url on liikuntapaikat", "logo_url preview pipeline", "draft freshness on back-nav", "completedSteps off-by-one fix"]
  affects: ["StepEsikatselu preview", "DiagonaalKortti", "PaikkaSheet", "save-step API"]
tech-stack:
  added: []
  patterns: ["conditional image rendering with fallback", "async re-fetch on step advance", "useEffect step-guard for preview refresh"]
key-files:
  created:
    - supabase/migrations/20260610000000_add_image_url_to_liikuntapaikat.sql
  modified:
    - lib/types.ts
    - lib/onboardingUtils.ts
    - app/components/DiagonaalKortti.tsx
    - app/components/PaikkaSheet.tsx
    - app/api/business/onboarding/save-step/route.ts
    - app/business/onboarding/OnboardingWizardInner.tsx
    - app/business/onboarding/StepEsikatselu.tsx
decisions:
  - "Use IF NOT EXISTS in migration so it is idempotent on environments where column was added manually"
  - "saveAndAdvance re-fetches full draft row (not partial merge) — each step saves its own JSONB field and partial merges would require refactoring all step components"
  - "Second useEffect([step]) for step-6 refresh is defense-in-depth; saveAndAdvance re-fetch alone would miss the case where user back-navigates without triggering saveAndAdvance"
  - "res.clone().json() in error handler preserves response body for any downstream reads"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-10"
  tasks: 3
  files: 7
---

# Phase 34 Plan 12: UAT Gap-Closure Summary

Gap-closure plan fixing 3 UAT failures: logo/photos absent from preview cards, HTTP 500 on submit (missing image_url column), and aukioloajat lost on back-nav with step 5 never reaching done-state.

## What Was Built

**Task 1 - DB migration + type system + buildDraftAsPaikka logo mapping**

New migration `supabase/migrations/20260610000000_add_image_url_to_liikuntapaikat.sql` adds `image_url TEXT` to `liikuntapaikat` with `IF NOT EXISTS` guard. The previous migration (`20260530000000_add_image_url_to_paikat.sql`) targeted the wrong table (`paikat`) — the submit route writing `image_url` to `liikuntapaikat` caused a Postgres "column does not exist" HTTP 500.

`lib/types.ts` gains `logo_url?: string | null` on `Liikuntapaikka`. `lib/onboardingUtils.ts` `buildDraftAsPaikka` return object gains `logo_url: draft.media_urls?.logo ?? null` completing the upload to preview pipeline.

**Task 2 - DiagonaalKortti logo slot + PaikkaSheet carousel real images**

`DiagonaalKortti.tsx` logo slot (40x40 rounded box): renders `<img src={paikka.logo_url}>` when set, falls back to Building2. No new imports needed.

`PaikkaSheet.tsx` builds a `carouselSlides: (string | null)[]` array `[paikka.image_url ?? null, null, null]` above the return statement. Carousel maps this array - slide 0 shows real `<img>` when `src` is non-null; slides 1 and 2 render Camera placeholder. Gradient overlay logo slot gets the same conditional: `<img>` when `paikka.logo_url` set, Building2 fallback otherwise.

**Task 3 - Draft state freshness + off-by-one fix + diagnostic logging**

`save-step/route.ts` changed from `current_step: step` to `current_step: step + 1`. Completing step 5 now writes `current_step = 6`. The `completedSteps` formula then produces `[1,2,3,4,5]` - step 5 appears done in the progress bar.

`OnboardingWizardInner.tsx` `saveAndAdvance` converted to async: re-fetches the full draft row from Supabase after each step save so back-navigation passes up-to-date `initialDraftAukioloajat` / `initialHinnasto` / `initialYhteystiedot` props. A second `useEffect([step])` re-fetches on step 6 entry as defense-in-depth.

`StepEsikatselu.tsx` error path logs `res.clone().json()` to `console.error` before showing the Finnish error string.

## Deviations from Plan

None - all changes match the plan exactly.

## Known Stubs

None - all preview pipelines are wired to real data.

## Threat Flags

None - no new network endpoints, auth paths, or trust-boundary schema changes beyond what the plan's threat model already covers.

## Self-Check: PASSED

- `supabase/migrations/20260610000000_add_image_url_to_liikuntapaikat.sql` exists and contains "ALTER TABLE liikuntapaikat" (not "ALTER TABLE paikat")
- `lib/types.ts` Liikuntapaikka has `logo_url?: string | null`
- `lib/onboardingUtils.ts` buildDraftAsPaikka return includes `logo_url: draft.media_urls?.logo ?? null`
- DiagonaalKortti: conditional `<img>` / Building2 fallback in logo slot
- PaikkaSheet: `carouselSlides` array built from `paikka.image_url`; carousel maps it; gradient overlay logo slot conditional
- save-step route: `current_step: step + 1`
- OnboardingWizardInner: `saveAndAdvance` is async with Supabase re-fetch; second `useEffect([step])` for step-6 refresh
- StepEsikatselu: `res.clone().json()` logging added
- `npx tsc --noEmit` exits 0
- `npx vitest run lib/onboardingUtils.test.ts` - 21/21 tests pass
- All 3 task commits present: 7abebe7, ad5cb4f, cf17649

## Checkpoint: Awaiting Human Verification

Task 4 is a `checkpoint:human-verify` - UAT must be re-run end-to-end by the developer after applying the Supabase migration (`npx supabase db push`). See `34-12-PLAN.md` Task 4 for the 9-step verification checklist.
