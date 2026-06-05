---
phase: 31-db-skeema-storage-perusta
reviewed: 2026-06-05T12:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - supabase/migrations/20260605000000_business_accounts.sql
  - supabase/migrations/20260605000001_business_managed.sql
  - supabase/migrations/20260605000002_profiles_is_admin.sql
  - supabase/sql-editor/20260605_business_media_bucket.sql
  - app/api/admin/__tests__/sync-paikat-filter.test.ts
  - app/api/admin/sync-paikat/route.ts
  - vitest.config.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-06-05T12:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This phase introduces the business portal database schema (`business_accounts`, `business_paikka_links`), two column additions (`business_managed`, `is_admin`), a Storage bucket with RLS policies, and a filter added to the existing `sync-paikat` admin route. The SQL migrations are mostly well-structured, but there are three critical issues: an unenforced self-elevation path for `is_admin`, a DELETE bypass in Storage policy design that lets users delete images from venues they no longer own, and — most critically — the `authenticated_update` policy on `liikuntapaikat` remains completely open (`USING (true)`), meaning any logged-in user can overwrite the `business_managed` flag, defeating the entire protection mechanism built in this phase.

---

## Critical Issues

### CR-01: Any authenticated user can set `business_managed = false` and resume sync-overwriting

**File:** `supabase/migrations/20260519000001_enable_rls.sql:6`
**Issue:** The existing `authenticated_update` policy on `liikuntapaikat` is `WITH CHECK (true)` — it places no restriction on which columns authenticated users may update. `business_managed` is a plain column on that table. Any authenticated user (including the anon-key-based client in the browser) can issue:
```sql
UPDATE liikuntapaikat SET business_managed = false WHERE id = <any id>;
```
This resets the protection flag and allows the next sync run to overwrite a managed venue. The entire guard built in migration `20260605000001_business_managed.sql` and in `route.ts` lines 155–161 is circumventable via the regular client.

The `sync-paikat` route itself uses `supabaseAdmin` (service role), which bypasses RLS, so the filter there is correct. But nothing stops a malicious authenticated user from clearing the flag before sync runs.

**Fix:** Add a column-level or row-level guard. The cleanest option is a new restrictive UPDATE policy that prevents `business_managed` from being set to `false` unless the caller is using the service role (which already bypasses RLS). In practice, the public client should never be able to change this column. Add a migration that tightens the update policy:
```sql
-- Replace the open policy with one that excludes business_managed from client writes
-- Option A: prevent clients from changing business_managed at all
-- This requires using a security-definer function or a column privilege REVOKE.
-- Option B (simpler, immediate): REVOKE UPDATE on the column from the `authenticated` role
REVOKE UPDATE (business_managed) ON liikuntapaikat FROM authenticated;
```
Or, if column-level revoke is undesirable, add a trigger that rejects changes to `business_managed` originating from the anon/authenticated role.

---

### CR-02: `is_admin` column can be self-elevated by any authenticated user

**File:** `supabase/migrations/20260605000002_profiles_is_admin.sql:1–14`
**Issue:** The migration comment explicitly acknowledges (line 9) that "Phase 35 will add a WITH CHECK clause to the profiles UPDATE policy to structurally block self-elevation." The current `profiles` UPDATE policy is:
```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```
`WITH CHECK` only verifies row ownership — it does not prevent the user from setting `is_admin = true` on their own row. Any authenticated user can currently escalate their own privilege with:
```sql
UPDATE profiles SET is_admin = true WHERE user_id = auth.uid();
```
The comment defers the fix to Phase 35 and treats this as acceptable, but shipping a privilege-escalation vector — even a temporary one — is a BLOCKER. The column should not be added without the protecting WITH CHECK in the same migration, or must be accompanied by a `REVOKE UPDATE (is_admin) ON profiles FROM authenticated` statement.

**Fix:** In the same migration, add the column-level privilege restriction:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
-- Immediately revoke the ability to set this column from authenticated clients
REVOKE UPDATE (is_admin) ON profiles FROM authenticated;
```
Alternatively, update the existing UPDATE policy's WITH CHECK to explicitly block self-elevation:
```sql
CREATE OR REPLACE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_admin = false);
```
(The second form still has a gap — a non-admin user who is already `is_admin = true` via an admin-granted row cannot flip back to false; but it blocks elevation from false → true, which is the critical path.)

---

### CR-03: Storage DELETE policy does not verify paikka ownership — users can delete images after losing a claim

**File:** `supabase/sql-editor/20260605_business_media_bucket.sql:106–114`
**Issue:** The DELETE policy checks only top-level folder ownership (`foldername[1] = auth.uid()`). This means a business user who once had a claim to a venue and uploaded images to `{uid}/{paikka_id}/images/` can delete those images even after the claim is revoked (`claim_status` changed to `rejected`) or transferred to another business. While the path is namespaced by the uploader's UID (preventing cross-user deletion), this still allows a rejected business to destroy media assets attached to a venue they no longer own.

The INSERT and UPDATE policies correctly call `business_owns_paikka()` for image sub-paths but DELETE skips this check. The comment on line 107 ("no paikka check needed since a user can only delete files under their own uid folder") is factually correct about cross-user safety but ignores the intra-user post-revocation case.

**Fix:** Apply the same paikka-ownership check to DELETE for image paths:
```sql
CREATE POLICY "Business DELETE own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
    AND (
      (storage.foldername(objects.name))[2] = 'logo'
      OR
      public.business_owns_paikka(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )
  );
```

---

## Warnings

### WR-01: `business_paikka_links` UPDATE policy lets a business change `claim_status` to 'approved'

**File:** `supabase/migrations/20260605000000_business_accounts.sql:79–84`
**Issue:** The UPDATE policy on `business_paikka_links` is:
```sql
USING (auth.uid() = business_account_id)
WITH CHECK (auth.uid() = business_account_id)
```
This means an authenticated business user can update any column in their own link rows, including `claim_status`. A business can set their own `claim_status` from `'pending'` to `'approved'` without admin action, bypassing the intended approval workflow. The decision log (D-17) defers admin-write policy to Phase 35, but not restricting self-approval is a logic error, not a policy gap.

**Fix:** Add a WITH CHECK clause that prevents status self-escalation:
```sql
CREATE POLICY "Business updates own links"
  ON business_paikka_links FOR UPDATE
  USING (auth.uid() = business_account_id)
  WITH CHECK (
    auth.uid() = business_account_id
    AND claim_status = 'pending'   -- can only update while still pending
  );
```
Or, more precisely, prevent setting `claim_status` directly by granting UPDATE only on non-status columns via column-level privileges.

---

### WR-02: `business_accounts` UPDATE policy lets a business self-approve their own account

**File:** `supabase/migrations/20260605000000_business_accounts.sql:44–48`
**Issue:** Same class of problem as WR-01. The UPDATE policy on `business_accounts` allows the owning user to modify any column, including `approval_status`. A business can set `approval_status = 'approved'` on their own account.

**Fix:** Restrict UPDATE to non-status columns via column-level privileges, or add a WITH CHECK:
```sql
CREATE POLICY "Business updates own account"
  ON business_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND approval_status = 'pending'
  );
```

---

### WR-03: `fetchPlaceDetails` uses non-null assertion on `API_KEY` inside a function that may be called after the `!API_KEY` guard

**File:** `app/api/admin/sync-paikat/route.ts:49`
**Issue:** `API_KEY` is declared at module scope (line 5) as `process.env.GOOGLE_PLACES_API_KEY`, which may be `undefined`. The GET handler guards against this at line 120 and returns early. However, `fetchPlaceDetails` at line 49 uses `API_KEY!` (non-null assertion). If `fetchPlaceDetails` were ever called outside the route handler (e.g., in a test or a future refactor), the assertion would mask a runtime crash. The assertion also silences TypeScript's legitimate type narrowing — the `undefined` case is real and should be handled explicitly.

**Fix:** Pass `apiKey` as a parameter to `fetchPlaceDetails`, consistent with how `fetchSportQuery` already accepts `apiKey: string` as an explicit argument (line 92):
```typescript
async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetailsResult> {
  // ... use apiKey instead of API_KEY!
}
```
Call sites then pass the narrowed `API_KEY` value (already confirmed non-null at that point in the handler).

---

### WR-04: `parseAukioloajat` silently drops 24-hour venues (periods with missing `close`)

**File:** `app/api/admin/sync-paikat/route.ts:27`
**Issue:** The Google Places API encodes 24/7 or all-day-open venues as a period with `open` set and `close` absent (or `close.day === 7` sentinel). The current code at line 27 skips any period where `!p.close`, meaning venues that are open 24 hours are stored with `aukioloajat: null` rather than an accurate representation. This is a data-quality bug affecting sync correctness.

**Fix:** Handle the 24-hour case explicitly:
```typescript
for (const p of periods) {
  if (!p.open) continue
  const day = DAY_NAMES[p.open.day]
  if (!day || result[day]) continue
  if (!p.close) {
    // 24-hour open: Google encodes this as no close period
    result[day] = { open: '00:00', close: '23:59' }
  } else {
    result[day] = { open: fmt(p.open.time), close: fmt(p.close.time) }
  }
}
```

---

## Info

### IN-01: `business_owns_paikka` SECURITY DEFINER function has no explicit owner grant

**File:** `supabase/sql-editor/20260605_business_media_bucket.sql:27–42`
**Issue:** The function is created with `SECURITY DEFINER` but no explicit `GRANT EXECUTE ON FUNCTION public.business_owns_paikka TO authenticated` statement. By default in Postgres, `PUBLIC` has EXECUTE on newly created functions, so the function is callable by everyone. This is likely the intended behavior (Storage policies need to call it as the authenticated role), but the absence of an explicit grant or revoke leaves the surface wider than needed and makes intent ambiguous.

**Fix:** Add explicit grant/revoke to document intent:
```sql
-- Restrict to authenticated role only (Storage policies run as authenticated)
REVOKE EXECUTE ON FUNCTION public.business_owns_paikka(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.business_owns_paikka(uuid, text) TO authenticated;
```

---

### IN-02: `sync-paikat` test suite does not cover the `managedRows` query error path

**File:** `app/api/admin/__tests__/sync-paikat-filter.test.ts:1–67`
**Issue:** The three test cases cover: a managed place_id excluded, empty `managedRows`, and `null` `managedRows`. The `null` case is documented as the "Supabase error path". However, in `route.ts` (line 155–156), when the Supabase query fails, `managedRows` will be `null` but the route continues silently and performs a full upsert of all results — overwriting managed venues. This is arguably the correct behavior per the comment, but there is no test that names or asserts this specific failure mode contract, making it easy for a future developer to accidentally change it to `return error` and miss the downstream consequence.

**Fix:** Add an explicit test case or comment in the test file naming the intentional behavior:
```typescript
it('continues with full allResults (no filter) when managedRows is null — overwrite risk accepted', () => {
  // This is intentional: if the DB query fails, the sync is not blocked.
  // Risk: managed venues may be overwritten. Monitored via error logging (future phase).
  const syncResults = buildSyncResults(allResults, null)
  expect(syncResults).toHaveLength(allResults.length)
})
```

---

_Reviewed: 2026-06-05T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
