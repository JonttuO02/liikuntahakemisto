---
phase: 59-multi-company-skeemamigraatio
reviewed: 2026-06-25T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - supabase/migrations/20260625000000_companies_role_rls.sql
  - supabase/migrations/20260625000001_fix_column_privilege_escalation.sql
  - supabase/migrations/_audit/59-backfill-verification.sql
  - app/api/business/create-paikka/route.ts
  - app/api/business/reapply/route.ts
  - app/api/business/onboarding/submit/route.ts
  - tests/api/create-paikka.test.ts
  - tests/api/submit.test.ts
  - app/api/admin/reject/route.ts
  - app/api/admin/approve/route.ts
  - app/api/admin/applications/route.ts
  - app/api/admin/applications/[id]/route.ts
  - app/admin/page.tsx
  - app/admin/AdminApplicationList.tsx
  - app/admin/[id]/page.tsx
  - app/api/business/register/route.ts
  - tests/api/register.test.ts
  - app/business/profiili/page.tsx
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 59: Code Review Report

**Reviewed:** 2026-06-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 59 introduces the `companies` entity, `business_accounts.company_id`/`role`, a `current_company_id()` SECURITY DEFINER helper, and a corrective follow-up migration (`...0001`) that fixes a real privilege-escalation bug discovered in staging (table-wide UPDATE grant overriding a column-level REVOKE). The corrective migration's intent and root-cause analysis are sound, but the column allow-list it lands contains a column-name bug that does not match the schema this same phase defines, plus two columns (`user_id`, `created_at`) that should never be client-updatable. The application routes that consume the new `companies` relationship are consistent with each other but share a latent type-safety assumption (singular vs. array embedded relation) that the codebase's own `profiili/page.tsx` explicitly works around elsewhere, and one route's stale duplicate-detection comment no longer matches the new composite UNIQUE constraint it claims to rely on.

## Critical Issues

### CR-01: GRANT statement re-opens `business_accounts.user_id`/`created_at` and references a non-existent column instead of the new `role` column

**File:** `supabase/migrations/20260625000001_fix_column_privilege_escalation.sql:40`
**Issue:** The corrective migration's stated purpose (per its own header comment, lines 1-24) is to close the self-elevation hole on `business_accounts.role` / `company_id` that the table-wide UPDATE grant was reopening. The fix re-grants UPDATE on an explicit allow-list that is supposed to contain "everything that was previously updatable, minus the specific column each prior fix intended to block":

```sql
GRANT UPDATE (user_id, created_at, role_in_company, contact_phone) ON business_accounts TO authenticated;
```

Two distinct problems:
1. **Wrong/non-existent column reference.** `role_in_company` is a pre-existing, unrelated free-text column from Phase 35 (`20260610000002_admin_columns.sql`) — it is not the `role` enum column this phase (`20260625000000_companies_role_rls.sql:94`) adds and intentionally locks down (`'owner'`/`'member'`). Granting `role_in_company` is at best a red herring (the column was already grantable pre-phase-59 and nothing in this phase needed to touch it) and at worst indicates the author confused the two columns while writing the allow-list — meaning the column that the previous statement set out to protect (`role`) is correctly *absent*, but only by what looks like accident given the naming confusion, not by deliberate cross-checking against the actual schema.
2. **`user_id` and `created_at` should never be authenticated-UPDATE-able.** `user_id` is the table's identity column (referenced by every RLS policy as `auth.uid() = user_id`); granting UPDATE on it lets an authenticated business user rewrite which `user_id` their own row claims to belong to, which combined with the existing own-row `"Business updates own account"` policy (`USING (auth.uid() = user_id)`) could let a user point their account row at a *different* user_id value post-update (the policy is evaluated against the row's *current* user_id at UPDATE-time per Postgres RLS semantics, but the resulting row would then have a `user_id` mismatched from `auth.uid()`, corrupting the 1:1 identity invariant every other query in the app relies on, e.g. `current_company_id()`'s own `WHERE user_id = auth.uid()` lookup). `created_at` is an audit/immutable timestamp column with no legitimate client write path. No application code in this phase (or anywhere in the reviewed file scope) updates either column from the `authenticated` role — they should not be in this grant at all.

**Fix:**
```sql
-- Only contact_phone has a legitimate client-side UPDATE path (BusinessProfiiliClient.tsx).
-- role_in_company is set once at registration via supabaseAdmin and is not client-updatable
-- afterward in any reviewed route — omit unless a real UI write path exists for it.
GRANT UPDATE (contact_phone) ON business_accounts TO authenticated;
```
If `role_in_company` does in fact need to remain self-editable post-registration, re-add it explicitly with a comment citing the UI/route that uses it — but `user_id` and `created_at` must not be in this list under any circumstance.

## Warnings

### WR-01: Stale comment + dead duplicate-claim detection after UNIQUE constraint widening

**File:** `app/api/business/create-paikka/route.ts:99-107`
**Issue:** The migration (`20260625000000_companies_role_rls.sql:148-153`) replaces `UNIQUE(paikka_id)` on `business_paikka_links` with the composite `UNIQUE(business_account_id, paikka_id)` (ACCESS-02, intentional — multiple businesses linking distinct accounts to the same... no, actually the reverse: this allows the same business_account to link multiple paikat, no longer blocking two different businesses from both linking the same paikka_id at the DB level). The `create-paikka` route's 23505 handler still carries the old comment:

```ts
// PostgreSQL unique_violation (D-11, T-56-03): UNIQUE(paikka_id) constraint —
// venue already linked. Mirrors the claim-paikka 23505→409 pattern; the
// constraint is the safety net even though search/claim is removed.
if (linkError.code === '23505') {
```

Since `create-paikka` always inserts a brand-new `liikuntapaikat` row immediately beforehand (`newPaikkaId` is a fresh ID from the just-completed INSERT), and the new constraint is scoped to `(business_account_id, paikka_id)`, this branch can now only fire if the *same* business_account_id is somehow linked to the *same* freshly-minted paikka_id twice in the same request — which cannot happen given the linear flow. The comment's documented invariant ("venue already linked" / "safety net") no longer matches what the constraint protects against post-migration; the branch is effectively unreachable dead code disguised as a meaningful conflict path; the test at `tests/api/create-paikka.test.ts:255-266` keeps it "alive" only by mocking the error code directly, not by exercising real constraint behavior.
**Fix:** Either remove the now-unreachable 23505 branch (folding it into the generic error path below, which already does the identical rollback-and-500), or update the comment to accurately state that this path is effectively unreachable under the new composite constraint and is kept only as defensive cleanup, and re-verify the test still asserts something meaningful rather than asserting against a constraint shape that no longer exists in production.

### WR-02: Inconsistent handling of embedded `companies` relation shape across routes

**File:** `app/api/business/create-paikka/route.ts:159-161`, `app/api/business/reapply/route.ts:91-93`, `app/api/business/onboarding/submit/route.ts:127-129`, `app/api/admin/reject/route.ts:75-77`, `app/api/admin/approve/route.ts:66-68`
**Issue:** All five routes use the identical pattern:
```ts
.select('companies(name)')
.eq('user_id', user.id)
.single<{ companies: { name: string } | null }>()
```
forcing the embedded `companies` relation to be typed as a singular nullable object. `app/business/profiili/page.tsx:20` (also touched by this phase) explicitly documents why this assumption is unsafe and defends against it at runtime:
```ts
// company_id is a to-one FK, but the Supabase JS client types embedded
// relationships as an array without an explicit foreign-key hint in the
// schema; at runtime this is always a single related row (or null).
const company = Array.isArray(account.companies) ? account.companies[0] : account.companies
```
None of the five server routes apply the same `Array.isArray` defense — they only force-cast the TypeScript type, which has no runtime effect. If Supabase ever returns `companies` as an array (which the codebase's own comment acknowledges as the client's default behavior absent an explicit FK hint), `biz.companies` would be a truthy array, `biz.companies.name` would be `undefined`, and the (admittedly non-critical, try/catch-wrapped) admin notification / approval / rejection emails would silently go out with a blank/undefined company name instead of failing loudly.
**Fix:** Either add the same `Array.isArray` guard to all five routes, or — better — write a single shared helper (e.g. `unwrapCompanyName(biz)`) used everywhere this pattern appears, so the singular-vs-array assumption is centralized and only needs fixing in one place if Supabase's behavior here ever changes.

### WR-03: Unconditional company-name overwrite on every venue creation, no idempotency guard

**File:** `app/api/business/create-paikka/route.ts:120-141`
**Issue:** Step 3 of 4 unconditionally overwrites `companies.name` with the request's `yritysNimi` on *every* call to this route:
```ts
const { error: companyUpdateError } = await supabaseAdmin
  .from('companies')
  .update({ name: yritysNimi })
  .eq('id', companyLookup.company_id)
```
For a business that already manages one venue and creates a second one, a typo or deliberate change in `yritysNimi` on the second submission silently renames the company record shared by both venues (and, per D-05, the single source of truth referenced everywhere `companies(name)` is joined — admin views, emails, profile page). There is no comparison against the existing `companies.name`, no confirmation step, and no audit trail of the rename. This may be intentional under D-05 ("companies.name is the single source of truth," implying edits propagate), but the route gives the caller no signal that submitting a second venue can rename their entire company.
**Fix:** At minimum, skip the UPDATE when `yritysNimi` already matches the existing `companies.name` (avoids an unnecessary write and unnecessary diff-causing `updated_at`-style side effects if such a column is ever added), or — if renaming-via-venue-creation is not the intended UX — gate this write to only fire when the business has zero existing venues (i.e., this is genuinely the first/only venue, not an additional one).

## Info

### IN-01: `register/route.ts` has no pre-existing-account guard before the `companies` insert

**File:** `app/api/business/register/route.ts:33-76`
**Issue:** The route always inserts a new `companies` row before checking whether `user.id` already has a `business_accounts` row. If the user has already registered, the second call inserts an orphaned `companies` row, then fails on the `business_accounts` insert (presumably due to a `user_id` PK/uniqueness constraint) with a generic 500 ("business_accounts insert failed") rather than a clear "already registered" response, and only then rolls back the orphaned company. This works correctly (the rollback path is exercised by `tests/api/register.test.ts:154-162`), but produces a confusing generic 500 for a predictable, named scenario (duplicate registration) instead of a distinguishable error.
**Fix:** Add an early `maybeSingle()` check on `business_accounts` for `user_id = user.id` before doing any inserts, returning a dedicated `409 Already registered` response — avoids the wasted insert-then-rollback round trip and gives the client an actionable error code.

---

_Reviewed: 2026-06-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
