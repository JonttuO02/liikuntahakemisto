---
phase: 39-auth-separaatio
plan: 03
subsystem: auth
tags: [next-intl, supabase-ssr, framer-motion, glassmorphism]

# Dependency graph
requires:
  - phase: 39-01
    provides: createBusinessBrowserClient from lib/supabase-business.ts (sb-biz-* cookie namespace)
  - phase: 39-02
    provides: i18n keys for business login (loginTitle, loginCta, loggingIn, etc.)
provides:
  - app/business/kirjaudu/page.tsx — business login page using sb-biz-* auth namespace
  - 7 i18n keys in Business namespace (fi.json + en.json) for login UI strings
affects:
  - 39-02 (middleware redirects unauthenticated /business users to /business/kirjaudu)
  - 39-04 (middleware and session guard testing)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Business client component uses createBusinessBrowserClient() — never createBrowserSupabase()"
    - "signInWithPassword + router.push('/business') — no setLoading(false) on success (nav unmounts component)"
    - "Single errorInvalidCredentials message for all auth failures (no user-existence disclosure)"

key-files:
  created:
    - app/business/kirjaudu/page.tsx
  modified:
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "i18n keys were not yet in messages/ when this plan ran; added them as part of this task (Rule 2 — missing critical)"
  - "Single error message for all login failures mitigates T-39-07 (no user-existence disclosure)"

patterns-established:
  - "Business login page: no recovery mode logic — kirjaudu is login-only, not registration"
  - "New-user link below form rendered as Next.js Link to /business/rekisteroidy"

requirements-completed:
  - AUTHSEP-06

# Metrics
duration: 15min
completed: 2026-06-12
---

# Phase 39 Plan 03: Business Login Page Summary

**Business login page using createBusinessBrowserClient() for sb-biz-* cookie namespace, mirroring rekisteroidy layout with glassmorphism card and single-error-message auth failure handling**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-12T00:00:00Z
- **Completed:** 2026-06-12T00:15:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Created app/business/kirjaudu/page.tsx as a client component with email+password login form
- Auth flow uses createBusinessBrowserClient() — session stored in sb-biz-* cookies, not sb-auth-token
- Layout mirrors rekisteroidy exactly: glass card, inputClass and submitButtonClass constants verbatim, framer-motion enter/error animations
- Added 7 i18n keys (fi + en) for the login UI strings
- TypeScript compiles cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /business/kirjaudu login page** - `9989694` (feat)

## Files Created/Modified
- `app/business/kirjaudu/page.tsx` — Business login form, client component, sb-biz-* auth
- `messages/fi.json` — Added 7 Business namespace keys for login UI (Finnish)
- `messages/en.json` — Added 7 Business namespace keys for login UI (English)

## Decisions Made
- Added the 7 i18n keys directly in this plan instead of waiting for 39-02 merge — TypeScript would otherwise emit type errors blocking the build. Classified as Rule 2 (missing critical) since the keys are required for the component to compile.
- Single `errorInvalidCredentials` message for all auth failures per T-39-07 threat mitigation — does not distinguish "wrong password" from "no account found".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added i18n keys that 39-02 was delivering in parallel**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** messages/fi.json and messages/en.json were missing loginTitle, loginCta, loggingIn, loginEmailPlaceholder, loginPasswordPlaceholder, noAccountLink, errorInvalidCredentials — causing 8 TS type errors
- **Fix:** Added all 7 keys to both locale files matching the values from the 39-02 worktree branch
- **Files modified:** messages/fi.json, messages/en.json
- **Verification:** npx tsc --noEmit returns 0 errors, grep confirms keys present
- **Committed in:** 9989694 (Task 1 commit)

**2. [Rule 3 - Blocking] Merged master into worktree before creating the file**
- **Found during:** Task 1 setup
- **Issue:** Worktree branch was at d8ebb4e (phase 28), before 39-01 changes on master. lib/supabase-business.ts and app/business/ did not exist in the worktree.
- **Fix:** Ran git merge master --no-edit to bring 39-01 changes (4b7fa31) into the worktree
- **Files modified:** All files from master merge (lib/supabase-business.ts, app/business/*, messages/*.json, etc.)
- **Verification:** ls app/business/ showed rekisteroidy, layout.tsx, page.tsx. lib/supabase-business.ts confirmed present.
- **Committed in:** merge commit from master (not a separate task commit — was part of setup)

---

**Total deviations:** 2 auto-fixed (1 missing critical i18n keys, 1 blocking worktree sync)
**Impact on plan:** Both fixes essential for compilation and correctness. No scope creep.

## Issues Encountered
- Worktree was spawned from an older commit (d8ebb4e phase 28 tip) and needed master merged in to access 39-01 deliverables. This is expected behavior for wave-2 plans in parallel execution.
- Cherry-pick of 39-02 i18n commit conflicted with master's messages/ files (both added them as new files). Resolved by restoring HEAD versions and manually adding only the 7 new login keys.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /business/kirjaudu page is live and ready to receive redirects from the 39-02 middleware guard
- Session is stored in sb-biz-auth-token cookie (not sb-auth-token) — consumer session unaffected
- Plan 39-04 can now test the full auth separation end-to-end

---
*Phase: 39-auth-separaatio*
*Completed: 2026-06-12*
