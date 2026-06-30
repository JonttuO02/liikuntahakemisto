---
phase: 62-venuepage-konsolidaatio
plan: 03
subsystem: ui
tags: [react, nextjs, next-intl, i18n, routing]

# Dependency graph
requires:
  - phase: 62-venuepage-konsolidaatio (plan 01)
    provides: "Näytä kartalla SheetRow + i18n keys in PaikkaSheet — content-migration prerequisite for deletion"
  - phase: 62-venuepage-konsolidaatio (plan 02)
    provides: "DiagonaalKortti onOpen?: (paikka: Liikuntapaikka) => void prop replacing onCardClick"
provides:
  - "Both Etusivu DiagonaalKortti usages wired to onOpen -> setValittu, with the relevant overlay dismissed first"
  - "app/paikat/[id] route deleted entirely — Next.js auto-404s the path"
  - "PaikkaPage i18n namespace removed from messages/fi.json and messages/en.json"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dismiss-overlay-then-open-sheet handler pattern: setSearchOpen(false)/setTodoOpen(false) called before setValittu(p) so PaikkaSheet never layers under a still-visible overlay"
    - "Route deletion as automatic 404 (no not-found.tsx, no redirect) — Next.js App Router behavior relied on directly"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "Left the scroll-restore useEffect (~lines 598-622) and searchResultsRef in place as harmless dead code per plan's explicit minimal-cleanup discretion (D-06) — only handleCardClick and its single call site were removed"
  - "Copied .env.local from the main repo into this worktree (gitignored, untracked) so npm run build could complete page-data collection for API routes that read Supabase env vars at build time — required to get a true green build, not committed"

patterns-established: []

requirements-completed: [VENUEPAGE-01, VENUEPAGE-03, VENUEPAGE-04]

coverage:
  - id: D1
    description: "Both DiagonaalKortti usages in Etusivu.tsx (search list, TODO overlay) call onOpen wired to setValittu, with the relevant overlay (search/TODO) dismissed first"
    requirement: VENUEPAGE-03
    verification:
      - kind: unit
        ref: "grep -c handleCardClick app/components/Etusivu.tsx == 0; grep -c onOpen app/components/Etusivu.tsx == 2"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit — zero errors after wiring"
        status: pass
      - kind: unit
        ref: "npm run build — full production build green (33/33 static pages generated, /paikat/[id] absent from route table)"
        status: pass
    human_judgment: true
    rationale: "Clicking a card opening PaikkaSheet with the search/TODO overlay dismissed (not layered) requires visual confirmation in a running app — no automated UI test framework in this project (manual UAT only, per RESEARCH.md)."
  - id: D2
    description: "app/paikat/[id]/ directory is deleted entirely; the route returns Next.js's automatic 404 with no redirect"
    requirement: "VENUEPAGE-01, VENUEPAGE-04"
    verification:
      - kind: unit
        ref: "ls \"app/paikat/[id]\" 2>&1 reports does-not-exist; ls app/ | grep paikat returns nothing (parent dir also removed since it was empty)"
        status: pass
      - kind: unit
        ref: "npm run build route table — no /paikat/[id] entry (was present before this plan's Task 2, absent after)"
        status: pass
    human_judgment: true
    rationale: "Confirming the browser actually renders Next.js's default 404 page (not a blank error or stale cache) for /paikat/1 requires a manual navigation check — no test framework available."
  - id: D3
    description: "PaikkaPage i18n namespace removed from both message files; no PaikkaPage references remain in app/ source"
    requirement: VENUEPAGE-02
    verification:
      - kind: unit
        ref: "node -e JSON.parse(...) on messages/fi.json and messages/en.json — both remain valid JSON after the block removal"
        status: pass
      - kind: unit
        ref: "grep -rc PaikkaPage messages/fi.json messages/en.json == 0 for both; grep -rn PaikkaPage app/ --include=*.tsx --include=*.ts returns no results"
        status: pass
    human_judgment: false

# Metrics
duration: 30min
completed: 2026-06-30
status: complete
---

# Phase 62 Plan 03: Wire DiagonaalKortti onOpen, delete app/paikat/[id], remove PaikkaPage i18n Summary

**Completed the venuepage consolidation: both DiagonaalKortti card sites now open PaikkaSheet inline (dismissing the relevant overlay first), `app/paikat/[id]` is deleted so the route auto-404s, and the orphaned `PaikkaPage` i18n namespace is gone from both message files.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-06-30
- **Tasks:** 2 completed
- **Files modified:** 3 (Etusivu.tsx, messages/fi.json, messages/en.json) + 1 deleted (app/paikat/[id]/page.tsx)

## Accomplishments

- `Etusivu.tsx`'s search-list `DiagonaalKortti` now passes `onOpen={(p) => { setSearchOpen(false); setValittu(p) }}` — dismisses the search overlay before opening PaikkaSheet, matching the existing `onShowMap` dismiss-first pattern (RESEARCH pitfall 2)
- `Etusivu.tsx`'s TODO-overlay `DiagonaalKortti` now passes `onOpen={(p) => { setTodoOpen(false); setValittu(p) }}` — dismisses the TODO overlay before opening PaikkaSheet
- The dead `handleCardClick` function (sessionStorage scroll-state writer for a navigation that no longer occurs) and its sole call site (`onCardClick={handleCardClick}`) are removed entirely (D-06, minimal-cleanup discretion)
- `app/paikat/[id]/` directory deleted via `git rm -r` — the now-empty parent `app/paikat/` directory was removed automatically as a side effect. Next.js App Router auto-returns 404 for the path; confirmed by the route disappearing from the `npm run build` route table
- `PaikkaPage` namespace removed from both `messages/fi.json` and `messages/en.json` — all of its content (Hours, Phone, Price, BookNow, Description, Location/showOnMap) was already migrated to `PaikkaSheet` by Plan 01; both files remain valid JSON
- Full `npm run build` passes cleanly: TypeScript compiles with zero errors, ESLint reports only pre-existing unrelated `<img>`/hook-dependency warnings, and all 33 routes (including the now-absent `/paikat/[id]`) generate successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire onOpen at both DiagonaalKortti sites and remove handleCardClick** - `bd879f0` (feat)
2. **Task 2a: Delete app/paikat/[id] directory** - `0883759` (feat)
2. **Task 2b: Remove PaikkaPage i18n namespace from messages/fi.json and messages/en.json** - `0671e06` (feat)

_Note: Task 2's directory deletion and the message-file edits landed as two separate commits because the `git rm -r "app/paikat/[id]"` staged the deletion immediately, and a subsequent `git add` invocation that mixed the (now nonexistent) deleted path with the message files only partially staged — the deletion committed alone first, then the message-file edits were staged and committed in a follow-up commit. Both commits are part of Task 2's single logical change and together satisfy its acceptance criteria._

## Files Created/Modified

- `app/components/Etusivu.tsx` - Wired `onOpen` on both `DiagonaalKortti` usages (search list line ~1460, TODO overlay line ~1074); removed `handleCardClick` function and its call site
- `app/paikat/[id]/page.tsx` - DELETED (and the now-empty `app/paikat/` directory was removed as a result)
- `messages/fi.json` - Removed `PaikkaPage` object
- `messages/en.json` - Removed `PaikkaPage` object

## Decisions Made

- **Minimal handleCardClick cleanup (D-06), as planned.** Only the `handleCardClick` function and its single `onCardClick={handleCardClick}` call site were removed. The scroll-restore `useEffect` (~lines 598-622) and `searchResultsRef` (~line 427, still attached to the search-results container at ~line 1438) were deliberately left in place as harmless dead code — the restore effect early-returns because `sessionStorage.getItem('etusivu-scroll-state')` will never be set again, and `searchResultsRef` stays referenced so no unused-variable error appears. This follows the plan's explicit instruction to do the minimal cleanup rather than the broader removal RESEARCH.md's "Open Questions" section suggested as an alternative.
- **Copied `.env.local` into the worktree (not committed).** The worktree, being a fresh git worktree, did not have the gitignored `.env.local` file that the main repo has. Without it, `npm run build`'s "Collecting page data" step failed with `Error: supabaseUrl is required` while trying to statically analyze API routes that instantiate a Supabase client at module scope (e.g. `/api/business/access-request/approve`). Copying the file (already gitignored, confirmed untracked via `git check-ignore`) allowed a true, complete `npm run build` verification rather than relying solely on `npx tsc --noEmit`. This is a local verification-environment fix, not a deviation in implementation — no plan files reference environment configuration.

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed with no auto-fixes needed; DiagonaalKortti's `onOpen` prop (added in Plan 02) and `onCardClick`'s absence matched the plan's stated pre-conditions exactly.

## Issues Encountered

None blocking. The previously-noted Phase 61 ESLint error (`paikkaInfo` unused in `app/business/onboarding/page.tsx`, logged in Plans 01/02's deferred-items.md) no longer appears in this plan's `npm run build` output — it appears to have been resolved by intervening work between Plan 02 and this plan's execution; not something this plan touched or needed to fix.

## User Setup Required

None — no external service configuration required. (The `.env.local` copy noted above was an internal worktree-verification step, not a user-facing setup requirement; the file already exists in the main repository checkout.)

## Next Phase Readiness

- Phase 62 (venuepage-konsolidaatio) is now feature-complete: VENUEPAGE-01 (route deleted), VENUEPAGE-02 (content migrated, Plan 01), VENUEPAGE-03 (card-to-sheet wiring, Plans 02+03), and VENUEPAGE-04 (404 with no redirect) are all satisfied.
- `npm run build` is fully green with the route table confirming `/paikat/[id]` is absent.
- The accepted residual from D-07 stands: `PaikkaKortti.tsx`'s two `/paikat/` links (used only in the business-side `PreviewModal`) will now 404. This is explicitly deferred to Phase 63 (PREV-04 removes `PaikkaKortti` from `PreviewModal` entirely).
- No blockers for Phase 63.

## Known Stubs

None.

## Threat Flags

None — this plan only rewires an existing client-side callback (onOpen -> setValittu), deletes a server-rendered page that displayed only public venue data, and removes unused i18n keys. No new network endpoints, auth paths, file access patterns, or schema changes were introduced. Matches the plan's own `<threat_model>`: T-62-05 (info disclosure, accept), T-62-06 (residual PaikkaKortti links, accept, deferred), T-62-07 (malformed JSON DoS, mitigated by `npm run build`'s JSON parse during static analysis + this plan's explicit `node -e JSON.parse` verification), T-62-SC (no package installs, accept).

---
*Phase: 62-venuepage-konsolidaatio*
*Completed: 2026-06-30*

## Self-Check: PASSED

- FOUND: app/components/Etusivu.tsx
- FOUND: messages/fi.json
- FOUND: messages/en.json
- CONFIRMED ABSENT: app/paikat/[id]
- FOUND: .planning/phases/62-venuepage-konsolidaatio/62-03-SUMMARY.md
- FOUND: commit bd879f0 (Task 1)
- FOUND: commit 0883759 (Task 2a — directory deletion)
- FOUND: commit 0671e06 (Task 2b — i18n cleanup)
