---
phase: 57-dashboard-redirect-korjaus-kesken-tila
plan: 01
subsystem: ui
tags: [next-intl, react, business-dashboard, supabase]

# Dependency graph
requires:
  - phase: 56-claim-create-rework
    provides: reworked create/claim onboarding entry point that this plan's dashboard depends on (does not modify it)
provides:
  - deriveVenueStatus pure helper encoding the four-state (kesken/approved/rejected/pending) precedence
  - /business dashboard that no longer auto-redirects to onboarding
  - per-venue Kesken badge + Jatka resume CTA replacing the blanket redirect
affects: [business-dashboard, onboarding-resume]

# Tech tracking
tech-stack:
  added: []
  patterns: ["pure status-derivation helper extracted for unit testing client-component branching logic"]

key-files:
  created: [lib/venueStatus.ts, lib/venueStatus.test.ts]
  modified: [app/business/page.tsx, messages/fi.json, messages/en.json]

key-decisions:
  - "deriveVenueStatus checks hasDraft FIRST (before any claim_status comparison) so draft existence always wins (D-02/D-04 invariant)"
  - "isKesken passed to VenueRow as a precomputed boolean derived from a Set<number> of draft paikka_ids, not via deriveVenueStatus directly inside the component (Claude's discretion, both acceptable per plan)"
  - "useRouter import and const router removed entirely since router.push was the only usage"

patterns-established:
  - "Pure derivation helpers for client-component status branching should live in lib/ and be unit-tested with Vitest in node environment, mirroring lib/normalizeNimi.ts convention"

requirements-completed: [BIZPANEL-04, BIZPANEL-05]

# Metrics
duration: ~20min
completed: 2026-06-24
status: complete
---

# Phase 57 Plan 01: Dashboard redirect fix & Kesken state Summary

**Removed the unconditional /business → /business/onboarding redirect and replaced it with a per-venue gray "Kesken" badge + "Jatka" resume CTA, driven by a unit-tested deriveVenueStatus precedence helper.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3 of 4 completed (Task 4 is a blocking human-verify checkpoint, not yet resolved)
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `lib/venueStatus.ts` — `deriveVenueStatus(claimStatus, hasDraft)` pure helper, draft-existence-first precedence, fully unit-tested (7 Vitest assertions, all passing)
- `app/business/page.tsx` — `checkState()` no longer redirects on draft existence; fetches the full set of draft `paikka_id`s into `keskenPaikkaIds` state instead, enabling per-row branching for multi-venue accounts
- `VenueRow` now renders a neutral gray "Kesken"/"In progress" badge (taking precedence over claim_status), disables the Esikatselu/Preview button, and swaps the action CTA to "Jatka"/"Continue" → `/business/onboarding?paikka_id=X` for any venue with an in-progress draft
- `messages/fi.json` / `messages/en.json` — `statusKesken` and `jatkaCta` keys added to both locales (full FI/EN coverage, CLEAN-06/07)

## Task Commits

Each task was committed atomically (TDD task 1 produced two commits — RED then GREEN):

1. **Task 1: Extract deriveVenueStatus pure helper** - `435d568` (test, RED) + `c2a4bb4` (feat, GREEN)
2. **Task 2: Remove auto-redirect, fetch draft paikka_ids, render Kesken badge + Jatka CTA** - `26c8180` (feat)
3. **Task 3: Add statusKesken + jatkaCta i18n keys** - `cdc7c1e` (feat)

Task 4 (checkpoint:human-verify, blocking) not yet resolved — see CHECKPOINT REACHED below.

## Files Created/Modified
- `lib/venueStatus.ts` - pure `deriveVenueStatus` status-precedence helper
- `lib/venueStatus.test.ts` - 7 Vitest assertions covering all precedence combinations including the approved+draft / rejected+draft invariant cases
- `app/business/page.tsx` - redirect removal, `keskenPaikkaIds` state, `VenueRow` `isKesken` prop wiring badge/CTA/disabled-button branches, `useRouter` import + `router` const removed
- `messages/fi.json` - added `statusKesken: "Kesken"`, `jatkaCta: "Jatka"`
- `messages/en.json` - added `statusKesken: "In progress"`, `jatkaCta: "Continue"`

## Decisions Made
- None beyond plan/PATTERNS.md guidance — implementation followed the exact replacement patterns from `57-PATTERNS.md` (badge ternary, action-button block, draft query shape).

## Deviations from Plan

None - plan executed exactly as written. Line numbers in the live file matched PATTERNS.md's noted drift (redirect block at 189-200, badge ternary at 110-122) within the expected tolerance; no further drift encountered.

One unplanned-but-anticipated type fix was required: the plan's `read_first` for Task 2 anticipated possible TS strictness around the `useRouter` removal; in practice the only type issues were an implicit `any` on the drafts `.map()` callback and an inferred `Set<unknown>` vs `Set<number>` mismatch on `keskenSet` (both fixed inline with an explicit `(d: { paikka_id: number })` parameter type and `new Set<number>(...)` — Rule 1, bug, same-task scope, no separate commit needed since it was part of Task 2's single edit pass).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

Tasks 1-3 are complete, committed, and verified:
- `npx vitest run lib/venueStatus.test.ts` — 7/7 passing
- `npx tsc --noEmit` — clean (zero errors)
- `node -e` JSON key check — both locale files valid, both keys present with correct FI/EN copy
- All Task 2 acceptance-criteria greps confirmed (no `router.push` remains, draft query has no `.limit(`, `keskenPaikkaIds.has` threaded to VenueRow, Kesken badge colors present, Jatka href present, Esikatselu disabled expression includes `isKesken`)

**Task 4 is a blocking `checkpoint:human-verify` gate** covering all four Phase 57 ROADMAP success criteria (no auto-redirect, Kesken badge, Jatka resume, multi-draft rows) plus EN-locale spot check and no-regression check on non-draft venues. This plan is NOT complete until that checkpoint is resolved by a human verifier in a continuation session — see CHECKPOINT REACHED section returned to the orchestrator.

---
*Phase: 57-dashboard-redirect-korjaus-kesken-tila*
*Completed: 2026-06-24 (Tasks 1-3; Task 4 checkpoint pending)*

## Self-Check: PASSED

All claimed files and commit hashes verified present on disk / in git log.
