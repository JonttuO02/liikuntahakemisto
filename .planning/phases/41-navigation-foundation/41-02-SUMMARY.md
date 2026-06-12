---
phase: 41-navigation-foundation
plan: 02
subsystem: ui
tags: [next-intl, supabase-ssr, business-nav, rsc, kirjaudu-redirect]

# Dependency graph
requires:
  - phase: 41-01
    provides: BusinessNav client component (app/components/BusinessNav.tsx)
  - phase: 39-auth-separaatio
    provides: createBusinessServerClient() for RSC session check

provides:
  - app/business/layout.tsx — RSC layout rendering BusinessNav on all /business/* pages
  - app/business/kirjaudu/page.tsx — async RSC wrapper with already-logged-in redirect
  - app/business/kirjaudu/BusinessKirjauduClient.tsx — extracted login form client component

affects:
  - All /business/* pages now have BusinessNav visible (BIZNAV-01, BIZNAV-02)
  - Already-logged-in users hitting /business/kirjaudu are redirected to /business (BIZUX-02)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RSC layout imports client component child without 'use client' directive (D-06, D-07)
    - RSC page wrapper: createBusinessServerClient(cookies()) + getUser() + redirect (canonical pattern from onboarding/layout.tsx)
    - cookies() called synchronously — no await (Next.js 14.2.35 pattern)
    - Client component extracted into *Client.tsx — RSC wrapper delegates all interactive logic

key-files:
  created:
    - app/business/kirjaudu/BusinessKirjauduClient.tsx
  modified:
    - app/business/layout.tsx
    - app/business/kirjaudu/page.tsx

key-decisions:
  - "layout.tsx stays RSC (no 'use client') while rendering BusinessNav (client component) — RSC/client boundary is inside BusinessNav.tsx"
  - "kirjaudu/page.tsx converted to async RSC wrapper with server-side redirect — prevents login form flash for already-authenticated users (T-41-04)"
  - "cookies() called synchronously, no await — per Next.js 14.2.35 canonical pattern and RESEARCH.md Pitfall 2"
  - "BusinessKirjauduClient.tsx is a verbatim copy of original page.tsx content with only function name changed — zero logic changes"

# Metrics
duration: ~8min
completed: 2026-06-12
---

# Phase 41 Plan 02: Layout Wiring + Kirjaudu Redirect Summary

**BusinessNav wired into app/business/layout.tsx (RSC, no 'use client') and already-logged-in redirect added to kirjaudu/page.tsx via server-side session check with createBusinessServerClient(cookies())**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-12T09:15:00Z
- **Completed:** 2026-06-12T09:23:00Z
- **Tasks:** 2 automated + 1 checkpoint
- **Files modified:** 3

## Accomplishments

- Updated app/business/layout.tsx to import and render `<BusinessNav />` above `{children}` — layout remains RSC per D-06/D-07; BusinessNav renders as client component child, no 'use client' needed in layout
- Created BusinessKirjauduClient.tsx as a verbatim copy of original kirjaudu/page.tsx with function name changed from BusinessKirjauduPage to BusinessKirjauduClient — all useState, handleSubmit, router.push('/business') logic preserved exactly
- Replaced kirjaudu/page.tsx with async RSC wrapper: createBusinessServerClient(cookies()).auth.getUser() fires server-side; redirect('/business') triggered if user session exists; otherwise renders BusinessKirjauduClient
- TypeScript strict compilation passes with 0 errors; all 116 vitest tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire BusinessNav into app/business/layout.tsx** - `c012a17` (feat)
2. **Task 2: Add already-logged-in redirect + extract BusinessKirjauduClient** - `32d55d5` (feat)

## Files Created/Modified

- `app/business/layout.tsx` - Updated RSC layout: imports and renders BusinessNav above {children}
- `app/business/kirjaudu/page.tsx` - Replaced with async RSC wrapper: server-side session check + redirect
- `app/business/kirjaudu/BusinessKirjauduClient.tsx` - New file: extracted login form (verbatim copy, name changed)

## Decisions Made

- layout.tsx stays RSC without 'use client' even though BusinessNav is a client component — RSC importing a client component is valid; the RSC/client boundary starts inside BusinessNav
- cookies() is synchronous in Next.js 14.2.35 — canonical pattern confirmed in onboarding/layout.tsx; plan explicitly warns against await cookies()
- Zero logic changes in BusinessKirjauduClient.tsx — only the export name changed; preserves existing functionality including router.push('/business') on login success

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged master into worktree before Task 1**

- **Found during:** Task 1 setup
- **Issue:** Worktree HEAD was at d8ebb4e (pre-Phase 41) — BusinessNav.tsx existed in master but not in the worktree working tree; `import BusinessNav from '@/app/components/BusinessNav'` would compile-fail at TypeScript check
- **Fix:** Ran `git merge master --no-edit` in the worktree to fast-forward to 9b1afb7 (Wave 1 completed state); all Phase 41 Wave 1 files (BusinessNav.tsx, i18n keys, SUMMARY.md) became available
- **Files modified:** Worktree HEAD only (no source file changes)
- **Note:** This is expected parallel executor behavior — Wave 2 worktrees are initialized at the Wave 1 base commit and must merge Wave 1 results before proceeding

## Issues Encountered

None beyond the worktree sync (documented as deviation above).

## User Setup Required

None.

## Checkpoint Pending

Task 3 is a `checkpoint:human-verify` — 7 manual browser checks required before Phase 41 can be closed. See checkpoint details in the CHECKPOINT REACHED message.

## Next Phase Readiness

- All Phase 41 success criteria are implemented in code
- Manual browser verification required (7 checks) to confirm BIZNAV-01, BIZNAV-02, BIZUX-02
- Phase 42 (business map page) and Phase 43 (business profiili page) can begin after Phase 41 closes

---

## Known Stubs

None — all implemented functionality is wired end-to-end.

## Threat Flags

None — no new network endpoints or auth paths introduced beyond what is in the plan's threat model.

---

## Self-Check

**Files exist:**
- app/business/layout.tsx: FOUND (contains BusinessNav import and render)
- app/business/kirjaudu/page.tsx: FOUND (contains redirect('/business'), createBusinessServerClient(cookies()))
- app/business/kirjaudu/BusinessKirjauduClient.tsx: FOUND ('use client', router.push('/business'))

**Commits exist:**
- c012a17: FOUND (Task 1)
- 32d55d5: FOUND (Task 2)

## Self-Check: PASSED

---
*Phase: 41-navigation-foundation*
*Completed: 2026-06-12*
