---
phase: 44-brandidata-tietokantaperusta
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - supabase/migrations/20260615000001_business_branding.sql
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 44: Code Review Report

**Reviewed:** 2026-06-15
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

The migration correctly implements the `business_branding` table DDL, UNIQUE constraint, RLS enable, and three RLS policies. The FK target (`business_accounts(user_id)`), status CHECK values, and policy predicate (`auth.uid() = business_account_id`) all match the plan exactly. No data-loss or security blockers were found.

Three warnings require attention before Phase 45 ships: the `updated_at` column has no trigger to keep it current (so the application code in Phase 45 must explicitly set it on every UPSERT, which is fragile), the explicit B-tree index on `business_account_id` is fully redundant with the UNIQUE constraint index Postgres already creates automatically, and the `website_url` column has no format constraint that prevents storing obviously invalid values. One info-level item covers an absence of an `IF NOT EXISTS` guard on the three `CREATE POLICY` statements, which will cause the migration to fail loudly if re-applied.

## Warnings

### WR-01: `updated_at` has no trigger — will silently stale on UPSERT unless Phase 45 manages it manually

**File:** `supabase/migrations/20260615000001_business_branding.sql:22`

**Issue:** `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` is set only at INSERT time. There is no `BEFORE UPDATE` trigger analogous to `business_paikka_links_set_updated_at` (introduced in `20260610000004_reapply_cooldown.sql`). Phase 45 will UPSERT rows via `ON CONFLICT (business_account_id) DO UPDATE SET ...`. If Phase 45's `SET` clause omits `updated_at = now()`, the column will retain the original INSERT timestamp forever, making it useless for "when was this analysis last run?" queries from Phase 46.

The existing project pattern for any table where `updated_at` must track mutations is: create a `BEFORE UPDATE` trigger. `onboarding_draft` (Phase 34) lacks the trigger too — but that table is mutated only by wizard steps that are always rewriting the full row; `business_branding` will be mutated by an automated pipeline that is easy to forget. The risk is silent staleness, not a crash.

**Fix:** Add the trigger to this migration (reuse the already-defined `set_updated_at` function from `20260610000004_reapply_cooldown.sql` — it is `CREATE OR REPLACE`, so calling it again is safe):

```sql
-- Reuse the shared set_updated_at() function (defined in 20260610000004_reapply_cooldown.sql)
CREATE TRIGGER business_branding_set_updated_at
  BEFORE UPDATE ON business_branding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Alternatively, mandate in the Phase 45 PLAN that every UPSERT `SET` clause must include `updated_at = now()` and add a verification grep for it. Pick one approach; do not rely on both.

---

### WR-02: Explicit B-tree index on `business_account_id` is fully redundant

**File:** `supabase/migrations/20260615000001_business_branding.sql:27-28`

**Issue:** Line 23 declares `CONSTRAINT business_branding_unique_account UNIQUE (business_account_id)`. PostgreSQL automatically creates a unique B-tree index to enforce every UNIQUE constraint. Lines 27-28 then create a second, non-unique B-tree index on the same column:

```sql
CREATE INDEX idx_business_branding_business_account_id
  ON business_branding(business_account_id);
```

This index is never chosen by the query planner over the unique constraint index (the planner always prefers the unique index for equality lookups because it carries additional cardinality information). The result is two indexes maintained for every INSERT/UPDATE/DELETE with no query-plan benefit.

**Fix:** Drop the explicit index creation. The UNIQUE constraint index already covers all lookup patterns Phase 45 and Phase 46 will use:

```sql
-- Remove lines 26-28 entirely; the unique constraint index on business_account_id
-- already satisfies the lookup path described in the comment.
```

If the comment "keyed on business_account_id for UPSERT in Phase 45" is intended as documentation, move it to the UNIQUE constraint declaration instead.

---

### WR-03: `website_url` accepts any text string — malformed URLs silently stored

**File:** `supabase/migrations/20260615000001_business_branding.sql:12`

**Issue:** `website_url TEXT NOT NULL` with no further constraint. Phase 45 will use this value as the scraping target URL. If a business submits a blank string, a relative path, or a non-HTTP scheme (e.g. `javascript:alert(1)`, `file:///etc/passwd`), the value passes the NOT NULL check and is stored. Phase 45's scraper then either crashes on a bad URL, silently sets `status = 'failed'`, or — in the worst case — opens a local file read if the scraper runs server-side without scheme validation.

This is not a Postgres-enforced SQL injection risk (the URL is stored as data, not executed), but storing a `file://` or `javascript:` URL as `website_url` and then passing it to a fetch/curl call in Phase 45 without re-validation is a server-side SSRF vector.

**Fix (at schema level):** Add a CHECK that enforces the HTTP/HTTPS scheme:

```sql
website_url TEXT NOT NULL
  CHECK (website_url ~ '^https?://'),
```

**Fix (at application level, if schema change is out of scope for this phase):** Phase 45's Route Handler must validate `website_url` against `new URL(url)` and confirm `protocol === 'https:' || protocol === 'http:'` before storing or fetching. Document this as a mandatory guard in the Phase 45 PLAN.

---

## Info

### IN-01: `CREATE POLICY` statements have no `IF NOT EXISTS` guard — re-applying the migration will error

**File:** `supabase/migrations/20260615000001_business_branding.sql:34-47`

**Issue:** All three `CREATE POLICY` statements use the bare form without `IF NOT EXISTS`. PostgreSQL 9.5 added `CREATE POLICY IF NOT EXISTS` but Supabase does not support it in every version. The standard mitigation used elsewhere in this codebase (e.g. `20260610000006_rls_business_paikka_links.sql`) is `DROP POLICY IF EXISTS` before `CREATE POLICY`.

The migration will fail on re-run (e.g. during `supabase db reset` in development or CI) with `ERROR: policy "Business reads own branding" already exists`. The `CREATE TABLE IF NOT EXISTS` guard on line 9 prevents the table creation from failing, but the three policy statements below it have no equivalent guard.

**Fix:** Add `DROP POLICY IF EXISTS` guards before each policy:

```sql
DROP POLICY IF EXISTS "Business reads own branding" ON business_branding;
CREATE POLICY "Business reads own branding"
  ON business_branding FOR SELECT
  USING (auth.uid() = business_account_id);

DROP POLICY IF EXISTS "Business inserts own branding" ON business_branding;
CREATE POLICY "Business inserts own branding"
  ON business_branding FOR INSERT
  WITH CHECK (auth.uid() = business_account_id);

DROP POLICY IF EXISTS "Business updates own branding" ON business_branding;
CREATE POLICY "Business updates own branding"
  ON business_branding FOR UPDATE
  USING (auth.uid() = business_account_id)
  WITH CHECK (auth.uid() = business_account_id);
```

Note: `DROP POLICY IF EXISTS` without a replacement is normally destructive, but here each `DROP` is immediately followed by a deterministic `CREATE`, so the net effect is idempotent.

---

_Reviewed: 2026-06-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
