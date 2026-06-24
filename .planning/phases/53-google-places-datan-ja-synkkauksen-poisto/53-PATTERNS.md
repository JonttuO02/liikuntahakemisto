# Phase 53: Google Places -datan ja synkkauksen poisto - Pattern Map

**Mapped:** 2026-06-22
**Files analyzed:** 4 (1 deletion target file, 1 deletion target test, 1 new migration, 1 optional audit script)
**Analogs found:** 3 / 3 applicable (this phase is subtractive — no new application code, so "analog" means "structural/narrative model to copy," not "code to extend")

## File Classification

| New/Modified/Deleted File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/api/admin/sync-paikat/route.ts` (DELETE) | route (admin) | request-response (Google API fetch + upsert) | `app/api/admin/approve/route.ts` | role-match (auth pattern reference only; this file is being removed, not rewritten) |
| `app/api/admin/__tests__/sync-paikat-filter.test.ts` (DELETE/adapt) | test | unit (pure-function test, no I/O) | itself (existing file) | exact — read to confirm no other suite depends on it before removal |
| `supabase/migrations/YYYYMMDDHHMMSS_remove_google_places_data.sql` (NEW) | migration | batch (audit SELECT + provenance-aware DELETE) | `supabase/migrations/20260612000000_cleanup_test_accounts.sql` | exact — same shape: one-time, narrative-commented, cascade-aware data-deletion migration |
| Row-count audit queries (D-07) — likely embedded as SQL comments/companion script, not a separate app file | utility (one-off audit) | batch (SELECT before/after) | Pitfall 1's prescribed SELECT-first dry-run pattern (research doc, no codebase file) — see Shared Patterns | no analog in codebase; follow research-doc pattern directly |

## Pattern Assignments

### `app/api/admin/sync-paikat/route.ts` — DELETION

No code to write here — this file is deleted in full. Before deleting, confirm (per CONTEXT.md D-04/D-05) that nothing else imports from it:

```bash
grep -r "sync-paikat" app/ lib/ --include="*.ts" --include="*.tsx"
```

The only auth pattern this route used (bearer `ADMIN_SECRET`, **not** JWT) is unique to this route — confirmed in CONTEXT.md ("gated by `ADMIN_SECRET` bearer auth (no JWT/session check)"). No other admin route shares this exact auth style (see `approve/route.ts` below, which uses JWT + `is_admin` instead) — so deleting this route does not orphan a shared auth helper. Verify with:

```typescript
// app/api/admin/sync-paikat/route.ts, lines 118–124 — auth pattern being removed
export async function GET(req: Request) {
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
```

**Reference analog for "what admin routes normally look like" (for contrast, not reuse):** `app/api/admin/approve/route.ts` — uses JWT (`supabaseAdmin.auth.getUser(token)`) + `profiles.is_admin` check (lines 6–21), not a static bearer secret. This confirms the `sync-paikat` auth pattern is a one-off, isolated to the file being deleted — safe to remove without touching shared admin-auth code.

---

### `app/api/admin/__tests__/sync-paikat-filter.test.ts` — DELETION/ADAPTATION

This test (read in full, 67 lines) is a **pure unit test with no imports from the route file itself** — it duplicates the filter logic inline (`buildSyncResults` helper, lines 10–16) specifically so the test has "no side-effectful imports (the route module requires Next.js and Supabase to be available at import time)." This means:

- Deleting the route file does **not** break this test's imports (it has none from the route).
- The test exists solely to validate the `business_managed` pre-filter logic that the route used. Since CONTEXT.md D-02 explicitly says **this filter logic itself is the wrong provenance signal** ("the actual deletion predicate is 'no matching `business_paikka_links` row,' not '`business_managed = false`'"), this test validates a pattern this phase is moving away from.
- **Recommended action:** delete this test file alongside the route. It tests behavior that no longer exists in the codebase once the route is gone, and per D-02 the pattern it validates (`business_managed`-based filtering) is explicitly the wrong approach to carry forward, even as a reference.

If the new migration's deletion predicate logic is later expressed in a testable TypeScript helper (e.g. a one-off Node script rather than raw SQL), model any new test after this file's structure — inline pure-function helper, `describe`/`it`/`expect` from `vitest`, no Next.js/Supabase imports:

```typescript
// app/api/admin/__tests__/sync-paikat-filter.test.ts, lines 1–16 — structure to copy IF a new
// provenance-filter helper needs a unit test (e.g. testing the link_type-based predicate in isolation)
import { describe, it, expect } from 'vitest'

function buildSyncResults(
  allResults: Array<{ place_id: string; [key: string]: unknown }>,
  managedRows: Array<{ place_id: string }> | null
): Array<{ place_id: string; [key: string]: unknown }> {
  const managedSet = new Set((managedRows ?? []).map(r => r.place_id))
  return allResults.filter(r => !managedSet.has(r.place_id))
}
```

---

### `supabase/migrations/YYYYMMDDHHMMSS_remove_google_places_data.sql` — NEW

**Analog:** `supabase/migrations/20260612000000_cleanup_test_accounts.sql` (full file, 24 lines, read above)

This is the strongest analog in the codebase: a **one-time, irreversible, narratively-commented data-deletion migration** that explicitly documents (a) why the deletion is safe, (b) the exact cascade chain it will trigger, and (c) idempotency. Copy this structure exactly:

**Header comment pattern** (lines 1-8 of analog):
```sql
-- Phase 40 CLEAN-01: Delete all test business accounts.
-- All business_accounts rows are test data — no production business users exist.
-- This is a one-time cleanup migration and must NOT be applied to a production
-- database that has real business users.
--
-- Deletion strategy: delete from auth.users WHERE id IN (SELECT user_id FROM business_accounts).
-- The subquery evaluates before the DELETE executes, so all current business user IDs
-- are correctly captured even though business_accounts will be emptied by the cascade.
```
→ For Phase 53, adapt to: state the DATA-11/12 requirement IDs, state the exact provenance predicate from D-02 (no `business_paikka_links` row at all — NOT `business_managed = false`), and explicitly warn that this is irreversible without a backup.

**Cascade-chain documentation pattern** (lines 10-13 of analog):
```sql
-- Cascade chain (ON DELETE CASCADE foreign keys):
--   auth.users → business_accounts (user_id)
--   business_accounts → business_paikka_links (business_account_id)
--   business_accounts → onboarding_draft (business_account_id)
```
→ For Phase 53, the equivalent chain (per PITFALLS.md Pitfall 1 and ARCHITECTURE.md) is:
```sql
-- Cascade chain (ON DELETE CASCADE foreign keys) when a liikuntapaikat row is deleted:
--   liikuntapaikat → reviews (paikka_id)               [20260528000000_reviews.sql]
--   liikuntapaikat → suosikit (paikka_id)               [20260523_suosikit.sql]
--   liikuntapaikat → business_paikka_links (paikka_id)  [20260605000000_business_accounts.sql]
--   liikuntapaikat → onboarding_draft (paikka_id)       [20260606000000_onboarding.sql]
--   liikuntapaikat → business_branding (paikka_id)      [20260616100000_business_branding_plural_and_paikka_scoping.sql]
-- Deletion predicate is provenance-based, NOT business_managed-based (see D-02):
-- rows with NO matching business_paikka_links row at all are pure-Google and safe to purge.
```

**Idempotency note pattern** (lines 19-20 of analog):
```sql
-- Idempotency: if business_accounts is already empty, the subquery returns an
-- empty set and the DELETE is a no-op. Safe to run multiple times.
```
→ Reuse verbatim style: confirm the Phase 53 migration's `WHERE` clause is similarly idempotent (a `NOT EXISTS` subquery against `business_paikka_links` is naturally idempotent — re-running after rows are gone is a no-op).

**Core deletion statement pattern** (lines 22-23 of analog):
```sql
DELETE FROM auth.users
WHERE id IN (SELECT user_id FROM business_accounts);
```
→ For Phase 53, per D-02's exact predicate (use `business_paikka_links`, never `business_managed`):
```sql
DELETE FROM liikuntapaikat
WHERE id NOT IN (SELECT paikka_id FROM business_paikka_links);
```
(Planner/executor should wrap this in the SELECT-first dry-run + row-count audit per D-07 — see Shared Patterns below — before the actual DELETE statement ships in the migration file or is run as a companion script.)

**Schema reference for the join used in the predicate:** `supabase/migrations/20260605000000_business_accounts.sql`, lines 55-65 — confirms `business_paikka_links.paikka_id` is `NOT NULL`, has `ON DELETE CASCADE` to `liikuntapaikat(id)`, and `UNIQUE(paikka_id)` — so the `NOT IN (SELECT paikka_id FROM business_paikka_links)` predicate is well-defined and matches D-02's "no matching row at all" provenance rule exactly (it does not look at `link_type` value at all — both `'claim'` and `'created'` rows are excluded from deletion simply by having a row present, which is correct per CONTEXT.md D-02/D-03).

---

### Row-count audit (D-07) — no direct codebase analog

No existing file in this codebase performs a "SELECT count before / DELETE / SELECT count after" audit pattern as a distinct artifact — the closest precedent is PITFALLS.md's own prescribed pattern (Pitfall 1, lines 21-24 of that doc):

```sql
-- Categorize before deleting anything (per PITFALLS.md Pitfall 1):
SELECT id, nimi, business_managed,
  (SELECT link_type FROM business_paikka_links WHERE paikka_id = liikuntapaikat.id) AS link_type
FROM liikuntapaikat;
```

Recommended for the planner: embed the before/after counts as SQL comments + `SELECT` statements either (a) directly inside the migration file as documentation-only queries the executor runs manually before/after applying the migration (mirroring how `20260612000000_cleanup_test_accounts.sql`'s comments describe — but don't execute — the cascade chain), or (b) as a short companion `.sql` audit script kept alongside the migration but not run by Supabase's migration runner. Either is acceptable per CONTEXT.md ("Claude's Discretion" — exact SQL/migration structure left to planner).

---

## Shared Patterns

### Migration narrative-comment convention
**Source:** `supabase/migrations/20260612000000_cleanup_test_accounts.sql` (entire file), `supabase/migrations/20260605000001_business_managed.sql` (lines 1-8)
**Apply to:** the new Phase 53 deletion migration
Every non-trivial migration in this codebase opens with a comment block stating: (1) which phase/requirement it serves, (2) why the operation is safe, (3) the exact cascade/dependency chain it touches, (4) idempotency guarantees. The Phase 53 migration must follow this convention — do not write a bare `DELETE` statement with no header comment; every other one-time-cleanup migration in this repo has one.

### Provenance via `business_paikka_links.link_type`, never `business_managed`
**Source:** `supabase/migrations/20260605000000_business_accounts.sql` lines 55-65 (schema); CONTEXT.md D-02; PITFALLS.md Pitfall 1
**Apply to:** the deletion migration's WHERE predicate
`business_managed` answers "who maintains this row going forward," not "where did this row's data originate." The only correct way to test "is this a pure-Google row" is `NOT EXISTS (SELECT 1 FROM business_paikka_links WHERE paikka_id = liikuntapaikat.id)` — this is link_type-agnostic by construction (any row presence, regardless of `'claim'` vs `'created'`, means "keep").

### Admin route auth patterns (for context only, not reused)
**Source:** `app/api/admin/approve/route.ts` lines 5-21
**Apply to:** N/A for this phase (no new route created) — included only to confirm the `ADMIN_SECRET` bearer-auth pattern being deleted in `sync-paikat/route.ts` is isolated and not shared with any retained admin route (`approve`, `reject`, `applications`), all of which use JWT + `profiles.is_admin` instead.

## No Analog Found

| File/Artifact | Role | Data Flow | Reason |
|---|---|---|---|
| Row-count audit query/script (D-07) | utility | batch (SELECT count before/after) | No existing codebase file performs this exact "audit counts across 4 tables before/after a deletion" pattern as a standalone artifact — follow PITFALLS.md Pitfall 1's prescribed SELECT-first dry-run shape directly (no in-repo precedent beyond the general migration-comment convention) |

## Metadata

**Analog search scope:** `app/api/admin/**`, `app/api/admin/__tests__/**`, `supabase/migrations/*.sql`
**Files scanned:** 6 admin route files, 1 test file, 28 migration files (4 read in full: `20260605000000_business_accounts.sql`, `20260605000001_business_managed.sql`, `20260612000000_cleanup_test_accounts.sql`, plus the route/test files under deletion)
**Pattern extraction date:** 2026-06-22
