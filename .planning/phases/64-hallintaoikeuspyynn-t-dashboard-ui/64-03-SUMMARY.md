---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
plan: 03
subsystem: auth
tags: [supabase, next.js, i18n, business-onboarding]

requires:
  - phase: 59
    provides: business_accounts role/company_id lockdown pattern (service-role-only writes, no client GRANT UPDATE)
  - phase: 60
    provides: business_access_requests table and access-request submit endpoint
provides:
  - business_accounts.display_name TEXT column (live in production)
  - display_name accepted and persisted by POST /api/business/register on the invite path
  - Fixed invite-link signup wiring in app/business/rekisteroidy/page.tsx (paikka_id round-trip, invite:true, redirect to /business/liity)
  - New name input shown only on the invite signup path
affects: [64-01, 64-04, business-onboarding, dashboard-manager-identity]

tech-stack:
  added: []
  patterns:
    - "service-role-only column write: display_name is written exclusively via supabaseAdmin at registration time, no GRANT UPDATE / no column-only REVOKE (mirrors role/company_id lockdown from Phase 59)"

key-files:
  created:
    - supabase/migrations/20260702000000_business_accounts_display_name.sql
  modified:
    - app/api/business/register/route.ts
    - app/business/rekisteroidy/page.tsx
    - tests/api/register.test.ts
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "Migration adds display_name as a plain nullable TEXT column with no GRANT/REVOKE changes — column-only REVOKE would be a no-op in this Supabase setup per Phase 59 precedent, so privilege is enforced entirely by writing through supabaseAdmin (service role) only"
  - "Invite-path signup now reads paikka_id via useSearchParams and swaps the company-name input for a name input; success redirects to /business/liity?paikka_id=X instead of /business so the pending access request is actually submitted (closes D-15 gap)"
  - "display_name stays null on the default (non-invite) registration path per D-06 — only invite-link employees are asked for their name at signup"

patterns-established:
  - "Invite vs default signup branching in a single form component: a `isInvitePath` boolean derived from the presence of a valid paikka_id query param drives both which inputs render and where the post-submit redirect goes"

requirements-completed: [ACCESS-04]

coverage:
  - id: D1
    description: "business_accounts.display_name TEXT column live in production, written only via supabaseAdmin"
    requirement: "ACCESS-04"
    verification:
      - kind: unit
        ref: "tests/api/register.test.ts#display_name case (invite insert payload carries trimmed display_name)"
        status: pass
      - kind: manual_procedural
        ref: "information_schema.columns query against live Supabase instance confirming display_name column exists (run by orchestrator prior to this continuation)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Invite-link signup sends paikka_id + invite:true + display_name to /api/business/register and redirects back to /business/liity so the access request fires, instead of making the signer owner of a new bogus company"
    requirement: "ACCESS-04"
    verification:
      - kind: unit
        ref: "tests/api/register.test.ts (register handler invite-path tests, all GREEN)"
        status: pass
      - kind: manual_procedural
        ref: "Walk an invite link end-to-end in an incognito session (deferred to phase verify per plan's <verification> section)"
        status: unknown
    human_judgment: true
    rationale: "End-to-end invite-link UAT (new account lands as pending member, not new company owner) requires walking the real signup + access-request flow in a browser; not exercisable by the unit test mocks alone."

duration: 11min
completed: 2026-07-02
status: complete
---

# Phase 64 Plan 03: Business account display_name column + invite-signup wiring fix Summary

**Added business_accounts.display_name (TEXT, service-role-write-only) and repaired the invite-link signup round-trip so new invite-link employees become pending members of the inviting venue instead of owners of a bogus new company.**

## Performance

- **Duration:** ~11 min (this continuation session; Task 1 was completed in a prior session)
- **Started:** 2026-07-02T15:41:35+03:00 (Task 1 commit) — this continuation began after Task 2's checkpoint was resolved by the orchestrator
- **Completed:** 2026-07-02T15:51:45+03:00
- **Tasks:** 3 (Task 1 done in prior session, Task 2 resolved by orchestrator outside this worktree, Task 3 done in this continuation)
- **Files modified:** 6 total across the plan (1 new migration, 1 API route, 1 page component, 1 test file, 2 i18n files)

## Accomplishments
- `business_accounts.display_name` TEXT column created via migration and confirmed live in production Supabase (Task 2, resolved by orchestrator prior to this continuation — see Checkpoint Resolution below)
- `POST /api/business/register` invite path now persists `display_name` (trimmed, 100-char cap) via `supabaseAdmin`, with no client-side UPDATE grant on the column
- `app/business/rekisteroidy/page.tsx` now reads `paikka_id` from the URL, sends `invite:true` + `display_name` to the register endpoint, shows a name input only on the invite path, and redirects invite signups to `/business/liity?paikka_id=X` so the pending access request actually gets submitted (closes the D-15 wiring gap)
- New i18n keys `inviteNameLabel` / `inviteNamePlaceholder` added to both `messages/fi.json` and `messages/en.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration + register-handler display_name write + register.test extension** - `760dd81` (feat) — completed in prior session
2. **Task 2: [BLOCKING] Apply the display_name migration to Supabase** — checkpoint resolved by the orchestrator outside this worktree (migration pushed via `supabase db push --linked`, verified live via `information_schema.columns` query); no commit in this worktree for this task
3. **Task 3: Fix invite-signup wiring + add the name input + i18n** - `04e655e` (feat)

_Note: Task 2 is a human-action checkpoint whose resolution (the actual `supabase db push`) happened outside this worktree's git history, on the linked production Supabase project directly — there is no corresponding worktree commit for it._

## Files Created/Modified
- `supabase/migrations/20260702000000_business_accounts_display_name.sql` - Adds nullable `display_name TEXT` to `business_accounts`, no GRANT/REVOKE changes (Task 1)
- `app/api/business/register/route.ts` - Parses and persists `display_name` on the invite-path insert (Task 1)
- `tests/api/register.test.ts` - Extended with a `display_name` case asserting the invite insert payload and that `companies` insert is not called on the invite path (Task 1)
- `app/business/rekisteroidy/page.tsx` - Reads `paikka_id` via `useSearchParams`, computes `isInvitePath`, sends `invite`/`display_name` in the register fetch body, shows a name input instead of company-name input on the invite path, redirects to `/business/liity?paikka_id=X` on invite success (Task 3)
- `messages/fi.json` / `messages/en.json` - New `Business.inviteNameLabel` and `Business.inviteNamePlaceholder` keys (Task 3)

## Decisions Made
- No column-only `REVOKE UPDATE` added to the migration — per the Phase 59 precedent (STATE.md Active Decision), a column-only REVOKE does not narrow the pre-existing table-wide GRANT in this Supabase setup, so `display_name` privilege is enforced solely by only ever writing it through `supabaseAdmin` (service role, bypasses RLS/grants), matching how `role` and `company_id` are already locked down.
- The company-name input and the new name input are mutually exclusive in the same form position (conditional render on `isInvitePath`), rather than showing both fields — the UI-SPEC only calls for a name field on the invite path, and the invite path never needs a company name since the signer is joining an existing company.

## Deviations from Plan

None - Task 3 executed exactly as written. Task 1 and Task 2 were completed/resolved in prior sessions per the checkpoint continuation handoff.

## Issues Encountered
None in this continuation. Task 2 (the Supabase migration push) was a human-action checkpoint that the orchestrator resolved directly against the linked production Supabase project (outside this worktree) before dispatching this continuation — confirmed via a live `information_schema.columns` query returning the new `display_name` column. No re-push or re-verification was attempted in this session per the checkpoint resolution instructions.

## User Setup Required
None - the one external service configuration step (applying the migration) was already completed by the orchestrator prior to this continuation.

## Next Phase Readiness
- `display_name` is live in production and has a reachable write path (invite signup) — Plan 64-01's list endpoint and Plan 64-04's dashboard UI can now rely on this column being populated for new invite-link signups.
- End-to-end manual UAT of the invite-link flow (new account lands as pending member of the inviting company, not owner of a new one) is deferred to phase verify per the plan's `<verification>` section — flagged as `human_judgment: true` in the coverage block above.
- No blockers for Plan 64-01 / 64-04.

---
*Phase: 64-hallintaoikeuspyynn-t-dashboard-ui*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260702000000_business_accounts_display_name.sql
- FOUND: app/business/rekisteroidy/page.tsx
- FOUND commit: 760dd81
- FOUND commit: 04e655e
