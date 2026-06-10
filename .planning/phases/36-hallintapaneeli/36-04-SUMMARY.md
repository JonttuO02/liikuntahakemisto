---
phase: 36-hallintapaneeli
plan: "04"
subsystem: ui
tags: [next.js, server-component, auth-guard, supabase, next-intl, useSearchParams]

dependency_graph:
  requires:
    - phase: 36-01
      provides: [i18n keys editTitle, editStep2-5Label, editBackToList, editLockedStep1, stepPlaceName]
    - phase: 36-02
      provides: [POST /api/business/update-paikka]
  provides:
    - app/business/[id]/page.tsx — SSR auth guard + ownership check + paikka fetch
    - app/business/[id]/EditWizardInner.tsx — 5-tab wizard shell with step routing
  affects: [36-05, 36-06, 36-07]

tech-stack:
  added: []
  patterns:
    - Server component auth guard using createServerSupabase + supabaseAdmin (ownership via business_paikka_links)
    - useSearchParams in client component wrapped in Suspense by server parent (mirrors onboarding pattern)
    - Tab-bar navigation via router.push with ?step=N query param

key-files:
  created:
    - app/business/[id]/page.tsx
    - app/business/[id]/EditWizardInner.tsx
  modified: []

key-decisions:
  - "Suspense wrapper added to server page so useSearchParams in EditWizardInner is safe (mirrors onboarding/page.tsx pattern)"
  - "Step 1 locked read-only using paikka prop data — no form inputs, shows editLockedStep1 notice"
  - "Steps 2-5 render Lataa... placeholder with TODO comments for wave 3/4 wiring"

patterns-established:
  - "Business [id] route: server page handles auth/ownership, client EditWizardInner handles tab routing"

requirements-completed: [BIZPANEL-01, BIZPANEL-02]

duration: 10min
completed: 2026-06-10
---

# Phase 36 Plan 04: /business/[id] server page + EditWizardInner client shell Summary

**SSR-guarded /business/[id] route with ownership check and 5-tab wizard shell using useSearchParams step routing**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-10T20:29:45Z
- **Completed:** 2026-06-10T20:39:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `app/business/[id]/page.tsx`: server component with full auth guard chain (session → business_accounts → business_paikka_links ownership → paikka fetch), Suspense wrapper for client child
- `app/business/[id]/EditWizardInner.tsx`: client component with `useSearchParams`-based step routing, 5-tab bar (step 1 locked read-only, steps 2-5 placeholder Lataa...), back link, all text from next-intl `useTranslations('Business')`
- TypeScript compiles cleanly with no errors

## Task Commits

1. **Task 1 + Task 2: server page + client wizard shell** - `ba46a4c` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app/business/[id]/page.tsx` - Server component with SSR auth guard, business account check, paikka ownership check, paikka fetch, Suspense wrapper
- `app/business/[id]/EditWizardInner.tsx` - Client wizard shell with useSearchParams step routing, 5-tab bar, step 1 read-only locked view

## Decisions Made

- Added Suspense wrapper in server page around EditWizardInner — required because `useSearchParams()` needs Suspense boundary in Next.js 14. Pattern mirrors `app/business/onboarding/page.tsx`.
- Used `stepPlaceName` i18n key for tab 1 (key exists in fi.json as "Paikkasi" — confirmed before implementation).

## Deviations from Plan

None — plan executed exactly as written. The Suspense wrapper was specified in the plan prompt as a required pattern.

## Issues Encountered

None.

## Known Stubs

Steps 2-5 in `EditWizardInner.tsx` render `Lataa...` placeholder text with TODO comments. These are intentional per the plan and will be wired in:
- Step 2 (Mediat): Plan 36-05
- Steps 3-5 (Hinnasto, Aukioloajat, Yhteystiedot): Plan 36-06

## Next Phase Readiness

- `/business/[id]` route is live and guarded — the "Muokkaa" links added in Plan 36-03 now resolve
- Wave 3 (36-05) can wire StepMediat into step 2 slot
- Wave 4 (36-06) can wire steps 3-5

---
*Phase: 36-hallintapaneeli*
*Completed: 2026-06-10*
