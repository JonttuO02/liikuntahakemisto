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

---

## Deviation: submitted_at fix (post-checkpoint, pre-resolution)

**Found during:** Task 4 human-verify checkpoint attempt (this is the gap report, not the checkpoint resolution).

### The gap

`onboarding_draft` rows (the existing Kesken signal from Tasks 1-3) are only created lazily by `save-step`, the first time a user saves real wizard data. A venue created via `create-paikka` and abandoned at the `StepPaikka`/`AnalysoiSivusto` pre-wizard screens — i.e. before any `save-step` call ever fires — has `claim_status='pending'` and **no draft row**. With the Tasks-1-3 implementation, this venue fell through to the amber "Pending approval" badge, which is incorrect: the venue was never actually submitted for admin review, so it should read Kesken just like a draft-backed abandoned venue.

The complication: `onboarding/submit/route.ts` *also* resets `claim_status` to `'pending'` and deletes the draft row once a venue is genuinely submitted (Step 5a/6, see `app/api/business/onboarding/submit/route.ts` lines 97-117). So, prior to this fix, "`claim_status='pending'` AND no draft row" was ambiguous — it meant either "never submitted" or "genuinely submitted, awaiting admin review" with no way to distinguish the two states.

### Why `submitted_at` over the heuristic alternative

Two options were discussed with the user:

1. **Heuristic on onboarding-filled fields:** infer "never submitted" by checking whether fields that only get filled during the wizard (price, hours, contact info, etc.) are still null. Rejected — fragile and tightly coupled to submit's current field set; any future change to which fields submit writes (or doesn't write) would silently break the heuristic with no compile-time or test-time signal.
2. **Explicit `submitted_at timestamptz` column** on `business_paikka_links`, set only by the real submit route. Chosen — unambiguous, single source of truth, decoupled from submit's field list, and trivially testable (`deriveVenueStatus` precedence covers it directly).

### Precedence implemented

`deriveVenueStatus(claimStatus, hasDraft, submittedAt)`:
1. `hasDraft === true` → `'kesken'` (unchanged — draft existence always wins)
2. `claimStatus === 'pending' && !submittedAt` → `'kesken'` (NEW — created but never actually submitted)
3. `claimStatus === 'approved'` → `'approved'`
4. `claimStatus === 'rejected'` → `'rejected'`
5. else → `'pending'` (claimStatus==='pending' with submittedAt truthy — genuinely submitted, awaiting review)

### Files / columns touched

- `supabase/migrations/20260624120000_business_paikka_links_submitted_at.sql` — new nullable `submitted_at timestamptz` column on `business_paikka_links`, `IF NOT EXISTS` guard, no backfill (existing pending rows fall into the "never submitted → Kesken" bucket post-fix, an accepted one-time reclassification per the user's decision)
- `lib/venueStatus.ts` / `lib/venueStatus.test.ts` — `deriveVenueStatus` extended to 3-param signature (`claimStatus, hasDraft, submittedAt`); TDD RED→GREEN; all 8 assertions pass (7 original + 1 new genuinely-submitted case; one original case's expectation intentionally changed from `'pending'` to `'kesken'`)
- `app/api/business/onboarding/submit/route.ts` — Step 5a's `claim_status: 'pending'` update now also sets `submitted_at: new Date().toISOString()` in the same non-critical update call
- `app/business/page.tsx` — `VenueLink` type gained `submitted_at: string | null`; `business_paikka_links` select now includes `submitted_at`; `deriveVenueStatus` imported from `@/lib/venueStatus` and called per-row to compute `isKesken`, replacing the Tasks-1-3 direct `keskenPaikkaIds.has(...)` boolean (which now only feeds the `hasDraft` signal into the helper, no longer the final determination)

### Local migration apply

No local Supabase instance / db-push script is configured in this project (hosted Supabase only, no `supabase db push` wired into `package.json`). The migration file was created and is ready to apply on next deploy/push to the hosted project — **deferred manual step**, does not block these code-level tasks since the column addition is additive/non-breaking and the application code degrades gracefully (a `null` `submitted_at` before the migration runs is functionally identical to the never-submitted case).

### Commits

- `633a20f` — feat: add submitted_at column to business_paikka_links (migration)
- `3074e67` — test: add failing test for submitted_at precedence (RED)
- `a7d8739` — feat: extend deriveVenueStatus with submittedAt precedence (GREEN)
- `e774f78` — feat: stamp submitted_at in onboarding submit route
- `6ff1c45` — feat: wire submitted_at + deriveVenueStatus into business dashboard

### Status

Tasks A-D complete and committed. **Task 4 (human-verify checkpoint) has NOT been resolved by this agent** — see the CHECKPOINT REACHED report returned to the orchestrator for the updated verification steps reflecting this fix.

## Self-Check (continuation): PASSED

All 5 claimed files and all 5 commit hashes (633a20f, 3074e67, a7d8739, e774f78, 6ff1c45) verified present on disk / in git log.

---

## Task 4: Human-verify checkpoint — RESOLVED (approved)

**Resolved during:** Final continuation session, after the `submitted_at` deviation fix (Tasks A-D).

The user applied the `submitted_at` migration (`supabase/migrations/20260624120000_business_paikka_links_submitted_at.sql`) to the live hosted Supabase project via `npx supabase db push`, then re-ran the full verification pass against the running `/business` dashboard, including the two checks added specifically to cover the `submitted_at` fix:

- **Step 0 (new — abandoned pre-wizard case):** A venue created via `create-paikka` and abandoned before any `save-step` call (no `onboarding_draft` row, `claim_status='pending'`, `submitted_at=null`) correctly renders the gray "Kesken" / "In progress" badge with a "Jatka" CTA — not the amber "Pending approval" badge it incorrectly showed under the Tasks-1-3-only implementation.
- **Steps 1-6 (original four ROADMAP criteria + EN spot check):** No auto-redirect on `/business` visit, Kesken badge replaces amber Pending for draft-backed in-progress venues, Esikatselu disabled + Jatka CTA on Kesken rows, Jatka navigates to `/business/onboarding?paikka_id=X` and resumes the correct venue, 2+ simultaneous drafts each render as independent Kesken rows, EN locale shows "In progress"/"Continue" copy correctly.
- **Step 7 (new — submit-resets-to-Pending regression check):** A venue that completes the real submit flow (`onboarding/submit/route.ts`, Step 5a/6) now has `claim_status='pending'` AND `submitted_at` stamped with a timestamp, and correctly renders the amber "Pending approval" / "Odottaa hyväksyntää" badge — confirming `submitted_at` successfully distinguishes "never actually submitted" (Kesken) from "genuinely submitted, awaiting admin review" (Pending), resolving the ambiguity that motivated the deviation fix.

**Resume signal received:** "approved" — no mismatches reported.

**Outcome:** All four Phase 57 ROADMAP success criteria confirmed true in the running app, plus the `submitted_at` precedence fix confirmed correct for both edge cases it was designed to resolve. Plan 57-01 is complete.

---

## Self-Check (final)

**must_haves.truths (4/4 satisfied, confirmed via checkpoint approval + code grep):**
1. "Kirjautunut yritys jolla on kesken jäänyt onboarding-draft näkee /business-dashboardin (ei redirectiä /business/onboarding-sivulle)" — confirmed: `grep -n "router.push" app/business/page.tsx` returns no matches; checkpoint step 1 approved.
2. "Paikka jolla on onboarding_draft-rivi näyttää harmaan Kesken-badgen amber Pending-badgen sijaan" — confirmed: checkpoint step 2 approved; badge classes `bg-[rgba(17,17,17,0.08)]` / `text-[rgba(17,17,17,0.55)]` present in `app/business/page.tsx`.
3. "Kesken-rivin Jatka-nappi vie /business/onboarding?paikka_id=X-osoitteeseen" — confirmed: `app/business/page.tsx:143` — `href={isKesken ? '/business/onboarding?paikka_id=' + link.paikka_id : ...}`; checkpoint step 4 approved.
4. "Tili jolla on 2+ samanaikaista draft-paikkaa näkee jokaisen erillisenä Kesken-rivinä" — confirmed: `keskenPaikkaIds` is a `Set<number>` computed per-row via `.has(link.paikka_id)`, not a single boolean; checkpoint step 5 approved.
5. "Kesken-rivin Esikatselu-nappi on disabloitu" — confirmed: `app/business/page.tsx:136` — `disabled={isKesken || !link.liikuntapaikat}`.

**artifacts (5/5 present on disk):**
- `lib/venueStatus.ts` — FOUND; exports `deriveVenueStatus` (`lib/venueStatus.ts:1` — `export function deriveVenueStatus(`)
- `lib/venueStatus.test.ts` — FOUND
- `app/business/page.tsx` — FOUND; contains `keskenPaikkaIds` (`app/business/page.tsx:172, 287`)
- `messages/fi.json` — FOUND; contains `statusKesken` (`messages/fi.json:145` — `"statusKesken": "Kesken",`)
- `messages/en.json` — FOUND; contains `statusKesken` (`messages/en.json:145` — `"statusKesken": "In progress",`)

**key_links (2/2 patterns present in code, grep-confirmed):**
- `from\('onboarding_draft'\)` → `app/business/page.tsx:199` (`.from('onboarding_draft')`)
- `/business/onboarding\?paikka_id=` → `app/business/page.tsx:143` (`'/business/onboarding?paikka_id=' + link.paikka_id`)

**Human-verify checkpoint:** status: **approved**. All 8 verification steps (0-7, including the post-deviation additions for the abandoned-pre-wizard case and the submit-resets-to-Pending regression) confirmed by the user against the live app, after applying the `submitted_at` migration to the hosted Supabase project.

**Plan status: COMPLETE.**

---

## Post-Review Fixes (57-REVIEW.md WR-01, WR-02)

Two warning-level findings from the code review (`.planning/phases/57-dashboard-redirect-korjaus-kesken-tila/57-REVIEW.md`) were fixed in a follow-up continuation session, after the plan was already marked complete. These are corrective fixes, not part of the original plan's task list.

### WR-01: reapply route didn't stamp `submitted_at`

**Issue:** `app/api/business/reapply/route.ts` reset `claim_status` to `'pending'` on reapply but left `submitted_at` untouched. For a venue that was rejected without ever completing onboarding (`submitted_at` still `null` at rejection time — possible because `admin/reject` only requires `claim_status === 'pending'`, not a prior submit), reapplying produced a row with `claim_status='pending'`, `submitted_at=null`. `deriveVenueStatus` then misclassified this genuinely-pending reapplication as `'kesken'` instead of `'pending'`, showing the wrong badge/CTA on the dashboard.

**Fix:** Added `submitted_at: new Date().toISOString()` to the reapply route's update call, mirroring `onboarding/submit`'s Step 5a. Added an explicit regression test to `lib/venueStatus.test.ts` (`'palauttaa pending kun reapply on asettanut submitted_atin (WR-01 regressio)'`) documenting the reapply-sets-submitted_at scenario, since the underlying precedence case was already covered generically but not named for this regression.

**Files modified:** `app/api/business/reapply/route.ts`, `lib/venueStatus.test.ts`

**Verification:** `npx vitest run lib/venueStatus.test.ts` (9/9 passing), `npx tsc --noEmit` (clean).

**Commit:** `b8f1d63` — fix(57): stamp submitted_at on reapply to fix kesken misclassification

### WR-02: hardcoded "Paikka" fallback broke EN locale

**Issue:** `app/business/page.tsx`'s venue-name fallback (`link.liikuntapaikat?.nimi ?? \`Paikka ${link.paikka_id}\``) rendered the hardcoded Finnish word "Paikka" for English-locale users whenever the `liikuntapaikat` join was missing, bypassing the `t()` translation layer used everywhere else in the file.

**Fix:** Added a `venueFallbackName` key to both `messages/fi.json` (`"Paikka {id}"`) and `messages/en.json` (`"Venue {id}"`), placed next to `dashboardVenuesHeading`. Replaced the hardcoded template literal with `t('venueFallbackName', { id: link.paikka_id })`, using the `t` instance already passed into `VenueRow`.

**Files modified:** `app/business/page.tsx`, `messages/fi.json`, `messages/en.json`

**Verification:** `npx tsc --noEmit` (clean), Node script confirming both locale files have the `venueFallbackName` key under `Business`.

**Commit:** `fa64b2e` — fix(57): translate venue name fallback for EN locale
