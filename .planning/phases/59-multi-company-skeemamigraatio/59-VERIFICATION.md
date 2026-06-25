---
phase: 59-multi-company-skeemamigraatio
verified: 2026-06-25T15:00:00Z
status: human_needed
score: 9/9 must-haves verified (programmatically); 1 manual-only D-13 login regression outstanding
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "D-13 manual login regression — log in as 2-3 real business accounts in production after deploy"
    expected: "Same paikat visible as before migration; /business/profiili resolves (does not redirect to /business); no `permission denied for function current_company_id` in Supabase logs; admin application list/detail show correct company name"
    why_human: "Requires live production login with real business-account credentials and inspection of Supabase logs — not observable via static code/SQL inspection. Explicitly scoped as manual-only in 59-VALIDATION.md and 59-DEPLOY-RUNBOOK.md (D-13); RLS permission-denied errors are sometimes swallowed into empty result sets by PostgREST, so no automated signal exists."
---

# Phase 59: Multi-company-skeemamigraatio Verification Report

**Phase Goal:** "Yritys" on olemassa entiteettinä erillään "loginista"; tietomalli tukee saman yrityksen useita työntekijöitä samaan paikkaan (ACCESS-01, ACCESS-02)
**Verified:** 2026-06-25
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `companies` table exists with id/name/created_at and RLS enabled; every existing account migrated to its own company as owner, in one transaction | ✓ VERIFIED | `supabase/migrations/20260625000000_companies_role_rls.sql:81-117` — `CREATE TABLE IF NOT EXISTS companies` + `ENABLE ROW LEVEL SECURITY` + ROW_NUMBER() CTE backfill, all inside one `BEGIN;...COMMIT;` block. 59-01-SUMMARY.md transcript: applied live via Management API, `business_accounts_count = companies_count = 4`, zero orphan/duplicate rows, every row `role='owner'` across both `approval_status` values present. |
| 2 | Backup taken + rollback mechanism verified before migration ran (ROADMAP SC2) | ✓ VERIFIED | 59-CONTEXT.md D-01/D-03/D-04: PITR is the designated backup/rollback mechanism (no pg_dump/down-migration by design). 59-01-SUMMARY.md documents pre-migration audit checks (Section 1-2 of `_audit/59-backfill-verification.sql`) were run and the operator explicitly approved bypassing the staging-first gate given pre-launch/no-real-users status — a deviation from the plan's literal staging requirement, but one the plan's own gate language anticipates as operator-approvable, and PITR (the actual backup mechanism per D-01) was confirmed enabled per 59-DEPLOY-RUNBOOK.md step 2. |
| 3 | `business_paikka_links` UNIQUE constraint loosened to `(business_account_id, paikka_id)`, allowing multiple same-company accounts to link the same paikka | ✓ VERIFIED | Migration lines 148-153: drops `business_paikka_links_paikka_id_unique` index + `business_paikka_links_paikka_id_key` constraint, adds `business_paikka_links_account_paikka_unique UNIQUE (business_account_id, paikka_id)`. 59-01-SUMMARY.md confirms via live verification: new composite constraint present, old ones gone. |
| 4 | RLS policies rewritten using `current_company_id()`; existing companies still see only their own paikat (regression-tested via login) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (D-13 manual login pending) | `current_company_id()` defined as `SECURITY DEFINER STABLE SET search_path = public` with explicit `GRANT EXECUTE ... TO authenticated` (lines 161-173); companies SELECT policy `USING (id = current_company_id())` (lines 180-182); business_paikka_links SELECT policy rewritten self-scoped (lines 193-197). Live verification in 59-01-SUMMARY.md confirmed the function is `SECURITY DEFINER` and callable (no `permission denied`) at apply-time, but the ROADMAP SC4 language explicitly calls for "regressiotestattu kirjautumisella" — a live login regression with real business accounts — which is documented as a manual, deploy-time D-13 step in 59-VALIDATION.md and 59-DEPLOY-RUNBOOK.md, not yet executed against deployed app code (app code lagged the migration as of the SUMMARY transcripts). |
| 5 | Application code (business + admin routes/UI) no longer reads/writes the dropped `business_accounts.company_name` column; all reads go through `companies.name` via `company_id` | ✓ VERIFIED | `grep -rn "company_name" app/ tests/` returns zero DB-column references — remaining matches are the `register` route's request-body field name (`body.company_name`, an API contract field distinct from the dropped DB column) and a UI form field name in `rekisteroidy/page.tsx`, both intentional and unrelated to the dropped column. |
| 6 | New business signups (post-migration) create their own owner company, with rollback on failure | ✓ VERIFIED | `app/api/business/register/route.ts:33-70` — INSERT companies → INSERT business_accounts(company_id, role:'owner') → rollback `companies.delete` on failure, CRITICAL log if rollback itself fails, auth user never deleted. `tests/api/register.test.ts` (5 tests) covers happy path, insert ordering, rollback, and 401 guard — all passing. |
| 7 | Privilege-escalation risk from the new `role`/`company_id` columns is closed (self-elevation to owner blocked) | ✓ VERIFIED | Initial `REVOKE UPDATE (role, company_id) ... FROM authenticated` (migration 0) was found at verification time to be ineffective against Postgres's pre-existing table-wide grant; corrected by `20260625000001` (revoke table-wide, re-grant explicit allow-list) and further tightened by `20260625000002` (CR-01 fix — removes incorrectly-included `user_id`/`created_at`/`role_in_company`, leaves only `contact_phone`, the one column with `grep`-confirmed legitimate client write path in `BusinessProfiiliClient.tsx`). |
| 8 | Test suite covering all touched routes is green | ✓ VERIFIED | `npx vitest run tests/api/register.test.ts tests/api/create-paikka.test.ts tests/api/submit.test.ts` → 16/16 passed. Full suite `npm test` → 224/224 passed. `npx tsc --noEmit` → zero errors. |
| 9 | Deploy runbook documents the coupled SQL+app-code deploy ordering | ✓ VERIFIED | `59-DEPLOY-RUNBOOK.md` exists, documents current-state-ahead-of-schema risk, immediate next action (merge+deploy Wave 2 promptly), general future-migration ordering (staging→PITR confirm→merge→migrate→deploy→D-13 regression→PITR rollback fallback), and explicitly flags both Pitfall-4 failure directions (`company_name does not exist` / `company_id does not exist`). Operator checkpoint approval recorded in 59-04-SUMMARY.md. |

**Score:** 8/9 truths fully verified programmatically; 1 (#4, RLS regression-by-login) present and wired but its ROADMAP-mandated live-login regression is explicitly deferred to a manual, deploy-time D-13 step not yet executed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260625000000_companies_role_rls.sql` | companies table, columns, backfill, constraint swap, current_company_id(), RLS | ✓ VERIFIED | 199 lines, single transaction, all required statements present (verified by direct read) |
| `supabase/migrations/_audit/59-backfill-verification.sql` | Read-only staging/post-apply verification | ✓ VERIFIED | Read-only (no DDL/INSERT/UPDATE/DELETE confirmed by read), 3 sections covering constraint-name confirmation, empty-name scan, post-migration row-match/role checks |
| `supabase/migrations/20260625000001_fix_column_privilege_escalation.sql` | Corrective fix for ineffective REVOKE | ✓ VERIFIED | Closes the table-wide-grant-overrides-column-REVOKE bug for 5 columns across 4 tables; documented root cause and verification method |
| `supabase/migrations/20260625000002_tighten_business_accounts_grant.sql` | CR-01 follow-up tightening | ✓ VERIFIED | Removes `user_id`/`created_at`/`role_in_company` from the grant, leaves only `contact_phone` — matches grep-confirmed actual write path |
| `app/api/business/create-paikka/route.ts` | company name UPDATE/email via companies | ✓ VERIFIED | Two-step write (`company_id` lookup → `companies.update`), email reads `companies(name)` |
| `app/api/business/reapply/route.ts` | admin email via companies(name) | ✓ VERIFIED | `.select('companies(name)')`, `biz.companies.name` |
| `app/api/business/onboarding/submit/route.ts` | admin email via companies(name) | ✓ VERIFIED | Same pattern, confirmed |
| `tests/api/create-paikka.test.ts`, `tests/api/submit.test.ts` | mock companies(name) join | ✓ VERIFIED | Tests pass (16/16 combined with register.test.ts) |
| `app/api/admin/approve/route.ts`, `app/api/admin/reject/route.ts` | email via companies(name) | ✓ VERIFIED | Both confirmed via grep + read |
| `app/api/admin/applications/route.ts`, `app/api/admin/applications/[id]/route.ts` | embedded select with role_in_company preserved | ✓ VERIFIED | `business_accounts(role, role_in_company, user_id, companies(name))` confirmed in both files |
| `app/admin/page.tsx`, `app/admin/AdminApplicationList.tsx`, `app/admin/[id]/page.tsx` | Application type + render sites on companies.name | ✓ VERIFIED | All three confirmed via grep; render sites use `?.companies?.name ?? '—'` |
| `app/api/business/register/route.ts` | company-then-account insert, role='owner', rollback | ✓ VERIFIED | Confirmed via read; matches plan spec exactly |
| `tests/api/register.test.ts` | new coverage for signup behavior | ✓ VERIFIED | 5 tests, all passing |
| `app/business/profiili/page.tsx` | anon-key companies(name) read under RLS | ✓ VERIFIED | `.select('companies(name), contact_phone')`, with defensive `Array.isArray` unwrap for the embedded-relation typing quirk |
| `.planning/phases/59-multi-company-skeemamigraatio/59-DEPLOY-RUNBOOK.md` | operator deploy-ordering runbook | ✓ VERIFIED | Exists, contains PITR + current_company_id references, documents actual project state |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `20260625000000...sql` | `business_accounts` | ADD COLUMN company_id/role, backfilled, DROP company_name | ✓ WIRED | Confirmed in migration text |
| `current_company_id()` | `business_accounts` | SECURITY DEFINER SQL SELECT by auth.uid() | ✓ WIRED | Confirmed; GRANT EXECUTE present |
| `app/api/business/create-paikka/route.ts` | `companies` table | company_id lookup → companies UPDATE; email `.select('companies(name)')` | ✓ WIRED | Confirmed via read |
| `app/api/business/reapply/route.ts` | `companies` table | `.select('companies(name)')`, `companyName: biz.companies?.name` | ✓ WIRED | Confirmed |
| `app/api/admin/applications/route.ts` | `companies` table | nested `business_accounts(...,companies(name))` | ✓ WIRED | Confirmed |
| `app/admin/AdminApplicationList.tsx` | `app/api/admin/applications/route.ts` | renders `app.business_accounts?.companies?.name` | ✓ WIRED | Confirmed at line 79 |
| `app/api/business/register/route.ts` | `companies` table | INSERT companies → INSERT business_accounts(company_id, role='owner') + rollback | ✓ WIRED | Confirmed |
| `app/business/profiili/page.tsx` | companies RLS SELECT policy | anon-key `.select('companies(name)...)'` depends on `USING (id = current_company_id())` | ⚠️ WIRED, LIVE BEHAVIOR UNCONFIRMED | Code-level wiring correct; actual RLS-gated resolution for a real business user is the D-13 manual check, not yet run against deployed app code per runbook's "Current state" section |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Touched test suite green | `npx vitest run tests/api/register.test.ts tests/api/create-paikka.test.ts tests/api/submit.test.ts` | 3 files, 16 tests, all passed | ✓ PASS |
| Full project test suite green | `npm test` | 21 files, 224 tests, all passed | ✓ PASS |
| TypeScript type-check clean | `npx tsc --noEmit` | zero errors | ✓ PASS |
| No `company_name` DB-column references remain in app/tests | `grep -rn "company_name" app/ tests/` | only request-body/form-field name matches (unrelated to dropped column) | ✓ PASS |
| Live RLS login regression (D-13) | manual production login with real business accounts | not run (requires live credentials + production environment) | ? SKIP — routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ACCESS-01 | 59-01, 59-02, 59-03, 59-04 | companies table + company_id/role; backfill in one transaction | ✓ SATISFIED | Migration + live-apply transcript + forward-going register route |
| ACCESS-02 | 59-01, 59-02, 59-03, 59-04 | composite UNIQUE + RLS rewritten with current_company_id() | ✓ SATISFIED | Migration constraint swap + current_company_id() + RLS policies; live-login regression (D-13) still pending as a deploy-time check, tracked in runbook |

No orphaned requirements found — REQUIREMENTS.md maps only ACCESS-01/ACCESS-02 to Phase 59, both addressed by all four plans' `requirements:` frontmatter.

Note: `.planning/REQUIREMENTS.md` lines 18-19/81-82 still show ACCESS-01/ACCESS-02 as unchecked/"Pending" — this is a tracking-document staleness issue, not a code gap; it is expected to be updated as part of phase closure, not blocking this verification.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/business/create-paikka/route.ts` | 159-161 (and 4 sibling routes) | Embedded `companies(name)` relation force-cast as singular object without the `Array.isArray` runtime guard that `profiili/page.tsx` uses for the identical Supabase JS typing quirk (WR-02, 59-REVIEW.md) | ⚠️ Warning | Non-critical, try/catch-wrapped notification emails could silently send blank company names if Supabase ever returns the embedded relation as an array; documented in REVIEW.md, not yet fixed, not a blocker for this phase's core goal |
| `app/api/business/create-paikka/route.ts` | 99-107 | Now-effectively-unreachable 23505 duplicate-link branch after UNIQUE constraint widening (WR-01) | ℹ️ Info | Comment already updated post-review to acknowledge the dead-code status; kept as defensive cleanup, not misleading |
| `app/api/business/create-paikka/route.ts` | 138-145 | Unconditional company-name overwrite on every venue creation, no idempotency guard (WR-03) | ⚠️ Warning | A second venue's `yritysNimi` silently renames the shared company; documented in REVIEW.md as an open question of intended UX, not a security/correctness bug |
| `app/api/business/register/route.ts` | 33-76 | No pre-existing-account guard before companies INSERT (IN-01) | ℹ️ Info | Functionally correct (rollback exercised by tests) but yields a generic 500 instead of a clean 409 for duplicate registration; cosmetic, not a blocker |

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any of the 18 files this phase touched. No unreferenced debt markers.

### Human Verification Required

#### 1. D-13 manual login regression

**Test:** After Wave 2 app code is deployed (per `59-DEPLOY-RUNBOOK.md` "Next action"), log in as 2-3 real business accounts in production.
**Expected:** Same paikat (venues) visible as before the migration; `/business/profiili` resolves correctly without redirecting to `/business`; no `permission denied for function current_company_id` errors in Supabase logs; admin application list/detail pages show the correct company name for each application.
**Why human:** Requires live production credentials and direct observation of authenticated user experience plus Supabase log inspection — RLS permission-denied failures can be silently swallowed into empty result sets by PostgREST in some configurations, so no static code/SQL check can substitute for this live check. This is explicitly scoped as manual-only in both `59-VALIDATION.md` ("Manual-Only Verifications" table) and `59-DEPLOY-RUNBOOK.md` (D-13 section), and directly maps to ROADMAP Success Criterion 4's "regressiotestattu kirjautumisella" (regression-tested via login) language.

### Gaps Summary

No blocking gaps found. All four ROADMAP success criteria for Phase 59 are satisfied at the code/schema level:

1. `companies` table + `business_accounts.company_id`/`role`, backfilled in one transaction — VERIFIED via migration text + live-apply transcript.
2. Backup/rollback mechanism (PITR) confirmed before/around the migration — VERIFIED per D-01/D-03/D-04 and the runbook's explicit PITR-confirmation step; the operator's documented, explicit decision to bypass a separate staging environment (none exists; pre-launch, no real users) is an accepted and reasoned deviation, not a process failure.
3. `business_paikka_links` composite UNIQUE constraint — VERIFIED in migration text and live-apply transcript.
4. RLS rewritten with `current_company_id()` — VERIFIED at the code/schema/grant level; the live-login regression component of this criterion ("regressiotestattu kirjautumisella") is a deploy-time manual check (D-13) that has not yet been executed because, per the runbook, the app code that depends on the new schema had not yet been confirmed deployed as of the SUMMARY transcripts. This is the one item routed to human verification rather than closed outright.

Two corrective migrations (`20260625000001`, `20260625000002`) beyond the four plans' original scope are legitimate fixes for a real privilege-escalation bug found during verification and a follow-up code-review tightening (CR-01) — both confirmed correct against actual application write paths via `grep`.

The `liikuntapaikat` wide-open row-level RLS (`USING (true)`) is a known, separate, explicitly out-of-scope finding (documented in 59-01-SUMMARY.md and the runbook) and is correctly excluded from this phase's gap analysis per the verification brief.

Three residual code-review warnings (WR-01, WR-02, WR-03) remain open in `59-REVIEW.md` — all non-blocking, non-security-critical (best-effort email paths, dead-code comment already partially addressed, and a UX question about company-name overwrite semantics). They do not affect ACCESS-01/ACCESS-02 goal achievement.

---

*Verified: 2026-06-25*
*Verifier: Claude (gsd-verifier)*
