---
phase: 34-onboarding-velhou
plan: "03"
subsystem: ui
tags: [i18n, next-intl, routing, onboarding, business]

# Dependency graph
requires:
  - phase: 34-01
    provides: onboarding utility library (buildDraftAsPaikka, hinnastaToHintaKuvaus)
provides:
  - 34 wizard i18n keys under Business namespace in fi.json and en.json
  - ClaimSearchForm redirect to /business/onboarding on claim/create success (D-01)
  - business/page.tsx onboarding_completed gate with router.push to /business/onboarding (D-03)
affects:
  - 34-04 (wizard scaffold needs i18n keys)
  - 34-05 (step components need i18n keys)
  - 34-06 (submit handler expects onboarding_completed gate to be in place)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Onboarding gate: check business_accounts.onboarding_completed before rendering dashboard; redirect to /business/onboarding when false"
    - "Post-claim/create redirect: router.push('/business/onboarding') instead of window.location.reload()"

key-files:
  created: []
  modified:
    - messages/fi.json
    - messages/en.json
    - app/components/ClaimSearchForm.tsx
    - app/business/page.tsx

key-decisions:
  - "D-01: ClaimSearchForm uses router.push('/business/onboarding') after successful claim; handleCreate passes optional paikka_id query param from API response"
  - "D-03: business/page.tsx checks onboarding_completed before showing dashboard; if false redirects to wizard; null account row is skipped (no row = not a business account)"

patterns-established:
  - "Onboarding gate pattern: supabase.from('business_accounts').select('onboarding_completed').eq('user_id', user.id).maybeSingle() — null skips gate"

requirements-completed:
  - ONBOARD-01
  - ONBOARD-02

# Metrics
duration: 15min
completed: 2026-06-06
---

# Phase 34 Plan 03: i18n Keys, ClaimSearchForm Redirect, and Onboarding Gate Summary

**34 wizard i18n keys added to fi.json/en.json, ClaimSearchForm window.location.reload() replaced with router.push('/business/onboarding'), and onboarding_completed gate added to business/page.tsx**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-06T00:00:00Z
- **Completed:** 2026-06-06T00:15:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- All 34 wizard i18n strings added under Business namespace — both fi.json and en.json are valid JSON with no duplicate keys
- ClaimSearchForm handleClaim: window.location.reload() replaced by router.push('/business/onboarding') (no paikka_id needed — wizard looks it up via business_paikka_links)
- ClaimSearchForm handleCreate: window.location.reload() replaced by router.push with optional ?paikka_id query param (avoids DB roundtrip on first wizard load)
- business/page.tsx: useRouter import added, onboarding_completed check inserted in checkLinks() before business_paikka_links query

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 34 wizard i18n keys to fi.json and en.json** - `342d4f1` (feat)
2. **Task 2: Fix ClaimSearchForm redirect (D-01) and add onboarding gate (D-03)** - `a3495ea` (feat)

## Files Created/Modified
- `messages/fi.json` - 34 new wizard keys appended to Business namespace
- `messages/en.json` - 34 new wizard keys appended to Business namespace (English)
- `app/components/ClaimSearchForm.tsx` - handleClaim and handleCreate redirect to /business/onboarding
- `app/business/page.tsx` - useRouter import + onboarding_completed gate in checkLinks()

## Decisions Made
- handleCreate passes paikka_id as URL query param (?paikka_id=N) so the wizard can skip a DB roundtrip on first mount; the wizard always re-verifies ownership via business_paikka_links regardless
- onboarding gate uses .maybeSingle() — if account row is null (not a business account), gate is skipped and existing logic handles the flow

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Worktree was initialized from an older commit (phase 28, d8ebb4e) and did not have the messages/ directory. Applied git reset --hard to the correct base commit (05a2c82) as specified in the worktree_branch_check step. No code impact.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All wizard i18n keys ready; wizard scaffold (34-04) can reference them immediately
- Integration point fixes (D-01, D-03) complete; claim/create flow will route to /business/onboarding
- business/page.tsx gate requires business_accounts.onboarding_completed column from 34-02 migration to be applied before gate is active

## Self-Check: PASSED

- messages/fi.json: FOUND, valid JSON, onboardingTitle = "Tietojesi täydentäminen"
- messages/en.json: FOUND, valid JSON, submitCta = "Submit for approval"
- app/components/ClaimSearchForm.tsx: 2x router.push('/business/onboarding'), 0x window.location.reload()
- app/business/page.tsx: 2x onboarding_completed references
- commits 342d4f1 and a3495ea: FOUND

---
*Phase: 34-onboarding-velhou*
*Completed: 2026-06-06*
