---
phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt
plan: 01
subsystem: api
tags: [nextjs-route-handler, supabase, jwt-verification, vitest, tdd]

# Dependency graph
requires:
  - phase: 54-sijainti-karttapinni-osoitehaku-onboardingissa
    provides: SijaintiPicker wired into ClaimSearchForm's create step (lat/lng + address + city)
provides:
  - "lib/normalizeNimi.ts shared name-normalization helper (trim, collapse whitespace, 200-char cap, casing preserved)"
  - "create-paikka route accepting yritysNimi + toimipisteNimi body fields, writing combined nimi + business_accounts.company_name, with 23505->409 conflict handling"
  - "claim-paikka route deleted — create-only backend contract"
affects: [56-02 (frontend plan consuming the new create-paikka request contract)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared name-normalization helper (lib/normalizeNimi.ts) — first of its kind in the codebase, mirrors lib/sanitizeKotikaupunki.ts shape but preserves casing and caps at 200 chars"

key-files:
  created:
    - lib/normalizeNimi.ts
    - lib/normalizeNimi.test.ts
  modified:
    - app/api/business/create-paikka/route.ts
  deleted:
    - app/api/business/claim-paikka/route.ts

key-decisions:
  - "normalizeNimi returns empty string (not undefined) on falsy/blank input, diverging from the sanitizeKotikaupunki analog, so callers can use plain truthiness checks (if (!yritysNimi))"
  - "Combined nimi computed as `${yritysNimi} ${toimipisteNimi}` only when toimipisteNimi is truthy, avoiding a trailing-space artifact when the branch name is omitted (D-08)"
  - "business_accounts.company_name UPDATE treated as non-critical (log, don't rollback), consistent with the existing is_claimed/admin-email pattern in the same route"
  - "No new DB column or migration created — company_name and nimi already existed (D-09), confirmed as a true structural no-op"

patterns-established:
  - "Inline trim+slice -> shared helper migration: only yritysNimi/toimipisteNimi route through normalizeNimi; osoite/kaupunki keep their existing inline .trim().slice(0, 500) convention"

requirements-completed: [CLAIM-04, CLAIM-05]

# Metrics
duration: 25min
completed: 2026-06-24
status: complete
---

# Phase 56 Plan 01: Backend rework — normalizeNimi helper + create-paikka two-name contract Summary

**New `lib/normalizeNimi.ts` helper (casing-preserving, 200-char cap) plugged into a reworked `create-paikka` route that now accepts separate company/branch name fields, writes `business_accounts.company_name`, adds the missing `23505→409` conflict branch, and the now-orphaned `claim-paikka` route is deleted.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 completed
- **Files modified:** 4 (2 created, 1 modified, 1 deleted)

## Accomplishments
- Built the first shared name-normalization helper in the codebase (`normalizeNimi`), TDD'd with 6 passing Vitest cases covering trim/collapse, casing preservation, 200-char cap, and falsy-input guard
- Reworked `create-paikka/route.ts` to accept `yritysNimi` (required) + `toimipisteNimi` (optional), compute the combined venue name, and write `business_accounts.company_name` keyed on the JWT-verified `user.id`
- Closed a pre-existing gap: `create-paikka` previously had no `23505` unique-violation handling on the `business_paikka_links` insert (only `claim-paikka` had it) — now both routes handle the conflict identically, returning 409 with orphan-row rollback
- Deleted `app/api/business/claim-paikka/route.ts` and its now-empty directory, confirming the only remaining repo reference is in `ClaimSearchForm.tsx` (removed by the dependent plan 56-02)

## Task Commits

Each task was committed atomically:

1. **Task 1a: Add failing test for normalizeNimi** - `1767a9d` (test)
2. **Task 1b: Implement normalizeNimi helper** - `fcef633` (feat)
3. **Task 2: Rework create-paikka route** - `083860e` (feat)
4. **Task 3: Delete orphaned claim-paikka route** - `d16eb25` (feat)

_Note: Task 1 had tdd="true" — split into a RED (test) commit and a GREEN (feat) commit per the TDD execution flow._

## Files Created/Modified
- `lib/normalizeNimi.ts` - Pure function `normalizeNimi(value: string): string`; trims, collapses internal whitespace, caps at 200 chars, preserves casing
- `lib/normalizeNimi.test.ts` - 6 Vitest cases: collapse whitespace, casing preserved, empty input, null input, 200-char cap, newline/tab handling
- `app/api/business/create-paikka/route.ts` - New body shape `{yritysNimi, toimipisteNimi?, osoite, kaupunki, latitude, longitude}`; combined `nimi` write; `business_accounts.company_name` UPDATE; `23505→409` branch with rollback
- `app/api/business/claim-paikka/route.ts` - **Deleted** (and its now-empty directory)

## Decisions Made
- normalizeNimi returns `''` (never `undefined`) on falsy input — matches the existing inline truthiness-check convention used by `create-paikka`'s required-field guard
- Combined-name logic guards against a trailing-space artifact when `toimipisteNimi` is empty (D-08)
- `company_name` UPDATE is non-critical (log + continue) rather than a hard failure — venue creation should not fail solely because the denormalized company name write failed
- Confirmed D-09 (zero new columns/migrations) as a true structural no-op — no `supabase/migrations/` files were touched by this plan

## Deviations from Plan

None — plan executed exactly as written. The plan's own frontmatter listed `app/api/business/claim-paikka/route.ts` under `files_modified`, which Task 3 correctly interpreted as "modified via deletion."

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The backend request contract for venue creation is stable: `{yritysNimi, toimipisteNimi?, osoite, kaupunki, latitude, longitude}` → `{ok: true, paikka_id}` or `{error}` with 400/401/403/409/500.
- Plan 56-02 (frontend) can now rewrite `ClaimSearchForm.tsx` to a create-only component consuming this exact contract, including handling the 409 response (which `handleCreate` previously did not branch on).
- No blockers. `claim-paikka` is gone; `reapply/route.ts` is confirmed untouched and present.

---
*Phase: 56-claim-create-rework-luo-paikka-alusta-nimik-yt-nt*
*Completed: 2026-06-24*
