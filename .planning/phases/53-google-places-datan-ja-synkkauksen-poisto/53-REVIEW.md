---
phase: 53-google-places-datan-ja-synkkauksen-poisto
reviewed: 2026-06-22T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - supabase/migrations/20260622120000_remove_google_places_data.sql
  - supabase/migrations/_audit/53-row-count-audit.sql
findings:
  critical: 2
  warning: 2
  info: 1
  total: 5
status: issues_found
---

# Phase 53: Code Review Report

**Reviewed:** 2026-06-22
**Depth:** standard
**Files Reviewed:** 2 (plus confirmation of 2 deleted files: `app/api/admin/sync-paikat/route.ts`, `app/api/admin/__tests__/sync-paikat-filter.test.ts`)
**Status:** issues_found

## Summary

This phase has three plans: Plan 01 (delete the sync route), Plan 02 (author a provenance-aware deletion migration + read-only audit script), and Plan 03 (execute the deletion against the live database). Plans 01 and 02 are clean, well-documented, and exactly match their stated intent — the route deletion left no dangling references in `app/` or `lib/`, and the migration/audit SQL is internally correct (NULL-safe `NOT EXISTS`, no `business_managed` mis-filter, idempotent, read-only audit script properly placed under `_audit/` to avoid runner pickup).

The central problem is **Plan 03's execution diverged from what Plans 01/02 actually built and what was reviewed**. Per `53-03-SUMMARY.md`, the operator overrode the authored, provenance-preserving `NOT EXISTS` predicate at the live gate and instead ran an unconditional `DELETE FROM liikuntapaikat` via an ad-hoc script, wiping all 327 rows — including the 5 rows with active `business_paikka_links` claims that the migration file was specifically designed to protect. The migration file on disk (`20260622120000_remove_google_places_data.sql`) was never applied as written and was never pushed via `supabase db push`. This means the repository's migration history is now a fiction relative to production state: anyone reading the migrations directory will believe a provenance-safe deletion ran, when in fact a full unconditional wipe ran via an out-of-band script that does not exist in version control.

This is flagged as a Critical finding below because it creates a durable, misleading artifact in the codebase (not merely a one-time operational mistake) — the migration file actively documents a safety guarantee ("claimed/created venues... survive by construction") that is now false for the actual database it claims to describe.

## Critical Issues

### CR-01: Migration file on disk misrepresents what was actually executed against production

**File:** `supabase/migrations/20260622120000_remove_google_places_data.sql:1-45`
**Issue:** Per `.planning/phases/53-google-places-datan-ja-synkkauksen-poisto/53-03-SUMMARY.md`, this exact file was authored, reviewed, and gated for execution — but it was **not** the statement that ran against the target database. The operator instead approved an unconditional `DELETE FROM liikuntapaikat` (no predicate) executed via an ad-hoc `@supabase/supabase-js` script outside of `supabase db push`, deleting all 327 rows including the 5 claimed venues this migration's `NOT EXISTS` predicate was specifically written to protect (lines 9–19 explicitly claim "Claimed/created venues, and therefore their reviews, favorites, drafts, and branding, all survive by construction" — this claim is now false for the live database).

This file remains in `supabase/migrations/` as a permanent, version-controlled artifact. Anyone who runs `supabase db push` against a fresh database, reads the migration history to understand "what happened to Google Places data," or audits this phase later will be misled: the file describes a provenance-preserving deletion that never ran, while the actual production state (all rows gone, including claims) is undocumented in any migration file. The migration's own header even states "Idempotency... safe to run multiple times" — implying it's expected to be applied at some point — but per the SUMMARY it was deliberately never pushed.

**Fix:** This is a documentation/audit-trail integrity problem more than a SQL bug, but it should not be left in this state silently. At minimum:
1. Add a follow-up comment block (or a new no-op migration entry) at the top of `20260622120000_remove_google_places_data.sql` stating clearly: "NOT APPLIED AS WRITTEN — production execution deviated; see `.planning/phases/53-.../53-03-SUMMARY.md` for the actual statement that ran (unconditional `DELETE FROM liikuntapaikat`, no predicate, executed via ad-hoc script outside `supabase db push`)."
2. Consider whether `supabase_migrations.schema_migrations` (or whatever the project's tracking table is) now has a gap/inconsistency — if a fresh environment runs `supabase db push`, this migration WILL apply its provenance-safe predicate against a then-populated `liikuntapaikat` table, which is a different operation than what ran in the reference production database. That asymmetry between environments should be called out explicitly so a future engineer doesn't assume migrations replay identically everywhere.
```sql
-- *** NOT APPLIED AS WRITTEN IN PRODUCTION ***
-- The operator overrode this predicate at the Plan 03 human gate and ran an
-- unconditional `DELETE FROM liikuntapaikat` (no WHERE clause) via an ad-hoc
-- script, deleting ALL rows including 5 claimed venues. See
-- .planning/phases/53-google-places-datan-ja-synkkauksen-poisto/53-03-SUMMARY.md
-- for the full account. This file is left as-authored for any environment where
-- the narrower, provenance-safe predicate is the desired behavior, but it does
-- NOT describe what happened to the reference production database.
```

### CR-02: Unconditional production DELETE executed outside version control with no rollback path

**File:** N/A (no file in repo — the ad-hoc script described in `53-03-SUMMARY.md` lines 17-18 does not exist in the codebase)
**Issue:** The actual production-mutating statement (`DELETE FROM liikuntapaikat` with no predicate, using the service-role key) was never committed anywhere — not as a migration, not as a script, not as a gist. It is described only in prose inside a SUMMARY.md. This means:
- There is no way to verify exactly what ran (the SUMMARY's prose description is the only record; there is no SQL artifact to audit byte-for-byte).
- Per `53-03-SUMMARY.md` line 59, no backup was taken before this ran, and the deletion is irreversible.
- The 2 affected `business_accounts` rows (for businesses that had claimed venues) now reference nothing and are left in an undefined application state — `business_paikka_links` and `business_branding` cascaded to 0 for those accounts, but the `business_accounts` rows themselves persist with no linked venue, and per the SUMMARY this was explicitly "not actioned" — no UI/business-logic check currently guards against rendering a business dashboard with a phantom/missing claimed venue.

**Fix:** Two distinct remediations:
1. Commit the actual executed statement (even retroactively, as a `-- HISTORICAL RECORD, already executed manually` comment-only file, or as an addendum to the existing migration) so the audit trail is complete and verifiable.
2. File a fast-follow task to audit `app/business/map/page.tsx`, `PaikkaSheet.tsx`/business dashboard routes, and anywhere else that assumes a `business_accounts` row has a non-empty `business_paikka_links` row — confirm the UI gracefully handles "business account exists, zero claimed venues" rather than crashing or rendering broken state for the 2 affected accounts identified in the SUMMARY (`0f0e024d-9825-4bbf-9834-e2368b27e976`, `ac22a395-c69b-4cdc-bf95-bdfc71eb961d`).

## Warnings

### WR-01: Audit script's "expected post-migration deltas" comment block is now falsified by what actually happened, with no update

**File:** `supabase/migrations/_audit/53-row-count-audit.sql:54-73`
**Issue:** This comment block documents the *expected* outcome assuming the authored `NOT EXISTS` migration runs (linked-kept count unchanged, business_paikka_links unchanged, etc.). Per the actual outcome in `53-03-SUMMARY.md`, none of these expectations held — `business_paikka_links` dropped from 5 to 0, and "linked-kept" dropped from 5 to 0, both explicitly called out by the SUMMARY as violations of the original predicate ("criteria 3/4... are not met by design"). The audit script's documentation comment, read in isolation today, would lead a reviewer to incorrectly conclude the deletion that ran matched this expected-delta contract, when in fact the SUMMARY records the opposite. The audit script is technically correct as a *general-purpose* tool, but as committed documentation of this phase's specific execution, it is now misleading without a pointer to the deviation.

**Fix:** Add a short trailing note (or a pointer comment near the top) referencing `53-03-SUMMARY.md` for what the actual post-deletion result was, similar to the fix suggested for CR-01, so a reader of this file isn't misled into thinking the documented expected-deltas section reflects history.

### WR-02: `git status` shows uncommitted artifacts in the working tree unrelated to this phase's stated scope

**File:** N/A — working tree state
**Issue:** The git status snapshot for this session shows several uncommitted, unscoped artifacts sitting in the repo root: `final_sports_svg_exports.zip`, `sport icons2.zip` (note the space in the filename — fragile for any tooling that doesn't quote paths), `urheiluikonit_era1.zip`, and `supabase/.temp/`. None of these are part of phase 53's `files_modified` lists in any of the three PLAN.md files, and they are binary/zip artifacts sitting at the repo root rather than under an assets/ or ignored directory. This isn't a phase-53 bug per se, but it's worth flagging because `supabase/.temp/` in particular suggests local Supabase CLI state may have been generated during this phase's work and risks being accidentally committed.

**Fix:** Confirm `supabase/.temp/` is covered by `.gitignore` (it normally should be — local CLI cache), and decide whether the three zip files belong in version control at all or should be moved out of the repo root / added to `.gitignore`. Not blocking for this phase's review, but should not be silently committed alongside phase 53's intended migration files.

## Info

### IN-01: Migration's idempotency claim is true for the file as written but never actually exercised in production

**File:** `supabase/migrations/20260622120000_remove_google_places_data.sql:33-36`
**Issue:** The comment states "Idempotency: ... Safe to run multiple times" — this is correct for the SQL as written, but since the file was never pushed via `supabase db push` (per `53-03-SUMMARY.md`), this idempotency guarantee has never been validated against the actual schema/data in the target environment. This is a minor point given CR-01 already covers the larger discrepancy, but worth noting for anyone who later decides to actually run `supabase db push` for this migration on the (now-empty) `liikuntapaikat` table — it will execute as a true no-op (0 rows match `NOT EXISTS` since the table is empty), which is harmless, but is worth being aware of given the table's current empty state was reached via a different path than this file describes.

**Fix:** No action required beyond the CR-01 fix — once that clarifying comment is added, this nuance is implicitly covered.

---

_Reviewed: 2026-06-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
