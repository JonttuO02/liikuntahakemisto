---
phase: 57-dashboard-redirect-korjaus-kesken-tila
verified: 2026-06-24T14:25:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification: []
---

# Phase 57: Dashboard-redirect-korjaus & Kesken-tila Verification Report

**Phase Goal:** /business never auto-redirects; per-venue Kesken badge with resume
**Verified:** 2026-06-24T14:25:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Kirjautunut yritys jolla on kesken jäänyt onboarding-draft näkee /business-dashboardin (ei redirectiä) | ✓ VERIFIED | `grep -n "router.push" app/business/page.tsx` → no matches. `grep -n "useRouter" app/business/page.tsx` → no matches. The draft-existence early-return block from the pre-phase code is gone; `checkState()` only sets `keskenPaikkaIds` state, never navigates. Human checkpoint step 1 approved (SUMMARY). |
| 2 | Paikka jolla on onboarding_draft-rivi näyttää harmaan Kesken-badgen amber Pending-badgen sijaan | ✓ VERIFIED | `app/business/page.tsx:113-129` — badge ternary checks `isKesken` first, renders `bg-[rgba(17,17,17,0.08)] text-[rgba(17,17,17,0.55)]` + `t('statusKesken')`, taking precedence over claim_status branches. `isKesken` is computed via `deriveVenueStatus(...) === 'kesken'` (line 287), which checks `hasDraft` first (`lib/venueStatus.ts:6`). Human checkpoint steps 2 and 0 (abandoned pre-wizard case) approved. |
| 3 | Kesken-rivin Jatka-nappi vie /business/onboarding?paikka_id=X-osoitteeseen | ✓ VERIFIED | `app/business/page.tsx:143` — `href={isKesken ? '/business/onboarding?paikka_id=' + link.paikka_id : ...}`. Human checkpoint step 4 approved (navigated and resumed correct venue). |
| 4 | Tili jolla on 2+ samanaikaista draft-paikkaa näkee jokaisen erillisenä Kesken-rivinä | ✓ VERIFIED | `keskenPaikkaIds` is a `Set<number>` (line 172) populated from all draft rows for the account (no `.limit(1)`, line 198-201) and `isKesken` is computed per-row in the `.map()` (line 282-291) via `.has(link.paikka_id)`/`deriveVenueStatus` — not collapsed to a single boolean. Human checkpoint step 5 approved with two simultaneous drafts. |
| 5 | Kesken-rivin Esikatselu-nappi on disabloitu | ✓ VERIFIED | `app/business/page.tsx:136` — `disabled={isKesken \|\| !link.liikuntapaikat}`. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/venueStatus.ts` | `deriveVenueStatus` pure helper, draft-precedence | ✓ VERIFIED | Exports `deriveVenueStatus(claimStatus, hasDraft, submittedAt)`, return type `'kesken' \| 'approved' \| 'rejected' \| 'pending'`. `hasDraft` checked first (line 6), `pending && !submittedAt` second (line 7) — matches D-02/D-04 precedence including the post-checkpoint `submitted_at` extension. |
| `lib/venueStatus.test.ts` | Vitest precedence tests | ✓ VERIFIED | 9 assertions, all passing (`npx vitest run lib/venueStatus.test.ts` → 9/9, confirmed by this verifier, not just SUMMARY claim). Covers draft-precedence, submitted_at disambiguation, and the WR-01 reapply regression case. |
| `app/business/page.tsx` | Dashboard w/o redirect, per-row Kesken badge + Jatka CTA | ✓ VERIFIED | Contains `keskenPaikkaIds` (lines 172, 287); redirect block fully removed; badge/CTA logic confirmed above. |
| `messages/fi.json` | `statusKesken` + `jatkaCta` FI keys | ✓ VERIFIED | `statusKesken: "Kesken"`, `jatkaCta: "Jatka"` confirmed present via direct `require()` check by this verifier. |
| `messages/en.json` | `statusKesken` + `jatkaCta` EN keys | ✓ VERIFIED | `statusKesken: "In progress"`, `jatkaCta: "Continue"` confirmed present via direct `require()` check by this verifier. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/business/page.tsx checkState()` | `onboarding_draft` table | `.from('onboarding_draft').select('paikka_id').eq('business_account_id', user.id)` → `keskenPaikkaIds` Set | ✓ WIRED | Confirmed at line 198-203; no `.limit(1)`; result feeds a `Set<number>` used per-row. |
| `app/business/page.tsx VenueRow` | `/business/onboarding?paikka_id=X` | Jatka-CTA href when `isKesken` true | ✓ WIRED | Confirmed at line 143; gated by `isKesken`. |

### Code Review Findings — Fix Verification (57-REVIEW.md)

| Finding | File | Status | Evidence |
|---------|------|--------|----------|
| WR-01: reapply route doesn't stamp `submitted_at`, causing Kesken misclassification | `app/api/business/reapply/route.ts` | ✓ FIXED (server-side) | Line 75: `.update({ claim_status: 'pending', rejection_reason: null, submitted_at: new Date().toISOString() })`. Regression test added to `lib/venueStatus.test.ts` (9th assertion). **However, see new finding below — the dashboard's client-side optimistic update for this same action was not updated to match, reintroducing a transient version of the same bug.** |
| WR-02: hardcoded "Paikka" fallback breaks EN locale | `app/business/page.tsx`, `messages/{fi,en}.json` | ✓ VERIFIED | Line 111: `t('venueFallbackName', { id: link.paikka_id })`. Both locale files contain `venueFallbackName` (`"Paikka {id}"` / `"Venue {id}"`), confirmed via direct file read. |
| IN-01: migration comment doesn't mention reapply as a second `submitted_at` writer | migration SQL | Not fixed | Informational only, no functional impact — not a blocker. |
| IN-02: `deriveVenueStatus` precedence undocumented in source | `lib/venueStatus.ts` | Not fixed | Informational only — function has no comment explaining why `hasDraft` outranks `claimStatus`. Not a blocker; test names document intent. |

### Finding Resolved (post-verification): Stale optimistic update after reapply

**File:** `app/business/page.tsx:232-239` (`handleReapply`)

This verification found that the client's optimistic local-state update after `POST /api/business/reapply` only set `claim_status: 'pending'`, not `submitted_at`, causing a transient (reload-clearable) Kesken/Pending badge misclassification immediately after reapply. **Fixed in commit `662db7a`** — the optimistic update now also sets `submitted_at: new Date().toISOString()`, mirroring the server-side WR-01 fix. `npx tsc --noEmit` confirmed clean after the change.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BIZPANEL-04 | 57-01-PLAN.md | `/business` never auto-redirects to onboarding | ✓ SATISFIED | Truths 1 verified above; redirect block removed, confirmed by grep + human checkpoint. |
| BIZPANEL-05 | 57-01-PLAN.md | Kesken onboarding shown per-venue with resume | ✓ SATISFIED | Truths 2-5 verified above. |

**REQUIREMENTS.md traceability discrepancy:** `.planning/REQUIREMENTS.md` lines 31-32 still show `- [ ] **BIZPANEL-04**` and `- [ ] **BIZPANEL-05**` (unchecked), and the Traceability table (lines 66-67) lists both as `Phase 57 | Pending` — inconsistent with every other completed v3.0 requirement (CLEAN-06/07, DATA-11/12, SIJAINTI-01/02/03, AI-06, CLAIM-04/05), all of which are checked `[x]` / `Complete`. ROADMAP.md (line 194) and the SUMMARY both mark Phase 57 complete, and code evidence above confirms the requirements are functionally satisfied — this is a documentation-sync gap in REQUIREMENTS.md, not a functional gap. Recommend updating REQUIREMENTS.md to check both boxes and mark both rows "Complete" as part of phase closeout.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any phase-modified file | — | None |

No debt markers, no empty implementations, no hardcoded-empty stub patterns found in `lib/venueStatus.ts`, `lib/venueStatus.test.ts`, `app/business/page.tsx`, `app/api/business/reapply/route.ts`, `app/api/business/onboarding/submit/route.ts`, `messages/fi.json`, `messages/en.json`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| deriveVenueStatus precedence test suite passes | `npx vitest run lib/venueStatus.test.ts` | 9/9 passing | ✓ PASS |
| No type errors after page.tsx edits | `npx tsc --noEmit` | Clean, no output | ✓ PASS |
| Both locale files have required Business keys | `node -e "require('./messages/{fi,en}.json').Business..."` | statusKesken, jatkaCta, venueFallbackName all present and correctly localized | ✓ PASS |
| Commit hashes claimed in SUMMARY exist in git history | `git log --oneline -8 -- app/business/page.tsx lib/venueStatus.ts app/api/business/reapply/route.ts` | All 6 phase-57 commits found (c2a4bb4, 26c8180, a7d8739, 6ff1c45, b8f1d63, fa64b2e) | ✓ PASS |
| Optimistic reapply UI update matches server precedence | Manual code trace of `handleReapply` vs. `deriveVenueStatus` call site | Mismatch found — see New Finding above | ✗ FAIL (routed to human verification) |

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` files declared or found for this phase.

### Human Verification Required

None — both items below were resolved/confirmed after this verification ran:

1. **Reapply badge staleness** — fixed in commit `662db7a` (see Finding Resolved above). No further human action needed.
2. **Hosted Supabase migration application** — confirmed directly by the orchestrating session: the user ran `npx supabase db push` and the command output `Finished supabase db push.` for `20260624120000_business_paikka_links_submitted_at.sql`, observed live in the same conversation as the Task 4 checkpoint approval. Treated as confirmed, not a documentation claim.

### Gaps Summary

No blocking gaps. All five must-have truths, all five artifacts, and both key links are verified present, substantive, and wired in the codebase — independently confirmed by this verifier via direct file reads, grep, `npx vitest run`, and `npx tsc --noEmit` (not solely SUMMARY claims). Both REVIEW.md warning-level findings (WR-01, WR-02) were independently confirmed fixed in the actual code, not just claimed. The one new behavioral gap found during this verification (optimistic reapply update staleness) was fixed immediately after verification (commit `662db7a`) rather than deferred.

Separately, REQUIREMENTS.md's traceability table had not yet been updated to reflect Phase 57's completion (BIZPANEL-04/05 still showed unchecked/Pending) — addressed by the orchestrator's `phase.complete` step immediately following this verification.

---

*Verified: 2026-06-24T14:25:00Z*
*Verifier: Claude (gsd-verifier)*
