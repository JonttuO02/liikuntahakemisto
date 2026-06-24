---
phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt
plan: 02
subsystem: frontend
tags: [react, nextjs, next-intl, framer-motion, i18n]

# Dependency graph
requires:
  - phase: 56-01
    provides: "create-paikka route accepting {yritysNimi, toimipisteNimi, osoite, kaupunki, latitude, longitude}; 23505->409 conflict handling"
provides:
  - "ClaimSearchForm.tsx rewritten as a create-only two-name form (CLAIM-04, CLAIM-05)"
  - "Business i18n namespace cleaned of all search/claim-step-only keys; new name-field keys added in fi.json and en.json"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component already wired to SijaintiPicker (Phase 54) reused unchanged — only the name-field/state portion of the form was restructured"

key-files:
  created: []
  modified:
    - app/components/ClaimSearchForm.tsx
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "Kept selectedVenueLabel and createAddressPlaceholder i18n keys despite the plan's deletion list naming them — both are still consumed by unrelated components (app/business/onboarding/StepPaikka.tsx and app/components/SijaintiPicker.tsx respectively); deleting them would have orphaned those consumers (Rule 1 fix, caught via tsc type-checking against next-intl's typed message keys)"
  - "Dropped the in-form <h2> heading entirely per UI-SPEC discretion, since the page-level h1 (claimTitle) already sits directly above the form at both call sites"
  - "Removed AnimatePresence mode='wait' step-switching wrapper since only one render branch (the create form) remains; kept the existing duration:0.15 crossfade on the error block unchanged, no new transition introduced"
  - "Deleted SELECT_CLASS constant (only used by the removed search step's city dropdown) and the createBrowserSupabase import (only used by the removed debounced search effect)"

patterns-established: []

requirements-completed: [CLAIM-04, CLAIM-05]

# Metrics
duration: 20min
completed: 2026-06-24
status: complete
---

# Phase 56 Plan 02: Frontend rework — create-only form + i18n cleanup Summary

**`ClaimSearchForm.tsx` rewritten as a create-only form with two name fields (`yritysNimi` required, `toimipisteNimi` optional) wired to the 56-01 `create-paikka` contract, including 409 handling; both locale files updated with new name-field keys and reworded heading/error copy, with all claim/search-only keys removed.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 of 3 completed (Task 3 is a checkpoint:human-verify gate — execution paused there per plan frontmatter `autonomous: false`)
- **Files modified:** 3

## Accomplishments

- Deleted the `search` and `claim` steps from `ClaimSearchForm.tsx` entirely — `Step`/`SearchResult` types, debounce search `useEffect`, `handleClaim`, `SELECT_CLASS`, and the back-to-search button are all gone. The component is now create-only (CLAIM-04).
- Split the single `createNimi` field into two controlled inputs: `yritysNimi` (required) and `toimipisteNimi` (optional, with a muted helper line) (CLAIM-05).
- Reused `SijaintiPicker` unchanged (per Phase 54 integration) — no rebuild.
- Updated `handleCreate`'s POST body to the new shape `{ yritysNimi, toimipisteNimi, osoite, kaupunki, latitude, longitude }`, matching the 56-01 `create-paikka` contract exactly.
- Added a 409 branch to `handleCreate` (previously absent — only the now-deleted `handleClaim` handled 409) using the reworded support-pointer copy.
- Dropped the redundant in-form `<h2>` heading and the now-unnecessary `AnimatePresence mode="wait"` step wrapper, since only one render branch remains; the existing `duration: 0.15` error-block crossfade was kept unchanged.
- Updated the `Business` namespace in both `messages/fi.json` and `messages/en.json`: added `yritysNimiLabel/Placeholder`, `toimipisteNimiLabel/Placeholder/Helper`; reworded `claimTitle` ("Luo paikka" / "Create a venue"), `errorNameRequired`, and `errorClaimAlreadyTaken`; deleted all search/claim-step-only keys (`searchNamePlaceholder`, `searchAllCities`, `searchHelperText`, `createInstead`, `searchNoResults`, `searchMinChars`, `resultSelectCta`, `resultAlreadyClaimed`, `backToSearch`, `claimCta`, `claiming`, `createTitle`, `createNamePlaceholder`, `errorClaimFailed`).
- Caught and fixed a scope gap during Task 2: the plan's deletion list named `selectedVenueLabel` and `createAddressPlaceholder` for removal, but `tsc` (via next-intl's typed message keys) revealed both are still consumed by `app/business/onboarding/StepPaikka.tsx` and `app/components/SijaintiPicker.tsx` respectively — unrelated components outside this plan's scope. Both keys were restored to avoid orphaning those consumers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite ClaimSearchForm.tsx as a create-only two-name form** - `26a5a22` (feat)
2. **Task 2: Update Business namespace in messages/fi.json and messages/en.json** - `45bf585` (feat)

## Files Created/Modified

- `app/components/ClaimSearchForm.tsx` — create-only form; `yritysNimi`/`toimipisteNimi` state; new POST body shape; 409 handling; search/claim steps removed; in-form heading and step-switch `AnimatePresence` removed
- `messages/fi.json` — Business namespace: added 5 new name-field keys, reworded 3 keys, deleted 14 search/claim-only keys
- `messages/en.json` — same Business-namespace changes in English

## Decisions Made

- Kept `selectedVenueLabel` and `createAddressPlaceholder` (Rule 1 fix — see Deviations below)
- Dropped the in-form `<h2>` per UI-SPEC discretion (page `<h1>` already carries the heading at both call sites)
- Removed `AnimatePresence mode="wait"` entirely rather than keeping it for a single render branch — no future-proofing transition was added since the plan/UI-SPEC explicitly allow dropping it
- Component name `ClaimSearchForm` was kept unchanged (rename was discretionary per CONTEXT.md; both call sites in `app/business/page.tsx` import it by this name)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored `selectedVenueLabel` and `createAddressPlaceholder` i18n keys**
- **Found during:** Task 2, while running `npx tsc --noEmit` after the planned key deletions
- **Issue:** The plan's i18n deletion list (Task 2 `<action>`) named `selectedVenueLabel` and `createAddressPlaceholder` for removal, reasoning they belonged exclusively to the deleted `claim`/`create` steps in `ClaimSearchForm.tsx`. In fact, `selectedVenueLabel` is independently used by `app/business/onboarding/StepPaikka.tsx` (an unrelated onboarding-wizard summary step), and `createAddressPlaceholder` is independently used by `app/components/SijaintiPicker.tsx` (an unrelated address input, used by other forms beyond `ClaimSearchForm`). Deleting them would have broken `tsc`'s next-intl typed-key check for those two files and produced a runtime missing-translation gap.
- **Fix:** Re-added both keys (with their original FI/EN values) to both locale files.
- **Files modified:** `messages/fi.json`, `messages/en.json`
- **Commit:** `45bf585`

## Issues Encountered

None beyond the deviation above, which was caught immediately by the plan's own `npx tsc --noEmit` verification step before commit.

## User Setup Required

None — no external service configuration required.

## Checkpoint Reached

Task 3 (`checkpoint:human-verify`, `gate="blocking"`) has not been executed. Per the plan frontmatter (`autonomous: false`), execution stops here for human verification of the create-only flow, two-name behavior, 409/required-field copy, and the EN locale, as described in the plan's `<how-to-verify>` steps. See the orchestrator's checkpoint return for the exact verification steps to perform.

## Next Phase Readiness

- Both 56-01 (backend) and 56-02 Tasks 1-2 (frontend) are committed. The create-only flow is wired end-to-end: `ClaimSearchForm.tsx` → `/api/business/create-paikka` → `business_accounts.company_name` + `liikuntapaikat.nimi` (combined).
- Blocked on the Task 3 human-verify checkpoint before this plan can be marked fully complete.

---
*Phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt*
*Completed (Tasks 1-2 of 3): 2026-06-24*

## Self-Check: PASSED

- FOUND: app/components/ClaimSearchForm.tsx (contains yritysNimi, toimipisteNimi)
- FOUND: messages/fi.json (contains yritysNimiLabel)
- FOUND: messages/en.json (contains yritysNimiLabel)
- FOUND commit: 26a5a22 (feat: rewrite ClaimSearchForm)
- FOUND commit: 45bf585 (feat: update Business i18n namespace)
