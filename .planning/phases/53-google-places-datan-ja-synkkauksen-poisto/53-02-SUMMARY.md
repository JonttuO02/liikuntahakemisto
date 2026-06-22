---
phase: 53-google-places-datan-ja-synkkauksen-poisto
plan: 02
subsystem: data-deletion
tags: [data-deletion, migration, provenance, cascade, google-places, audit]
dependency_graph:
  requires: []
  provides:
    - "supabase/migrations/20260622120000_remove_google_places_data.sql"
    - "supabase/migrations/_audit/53-row-count-audit.sql"
  affects:
    - liikuntapaikat
    - reviews
    - suosikit
    - business_paikka_links
    - onboarding_draft
    - business_branding
tech_stack:
  added: []
  patterns:
    - "Provenance-based deletion via business_paikka_links presence (NOT EXISTS), never business_managed"
    - "Underscore-prefixed _audit/ directory keeps read-only scripts out of the Supabase migration runner's pickup"
key_files:
  created:
    - supabase/migrations/20260622120000_remove_google_places_data.sql
    - supabase/migrations/_audit/53-row-count-audit.sql
  modified: []
decisions:
  - "Deletion predicate uses correlated NOT EXISTS against business_paikka_links, not NOT IN, for NULL-safety and idempotency"
  - "business_managed is never referenced in the executable SQL — it is a sync-exclusion flag, not a provenance signal (CONTEXT.md D-02/D-06)"
metrics:
  duration: "~15min"
  completed: "2026-06-22"
status: complete
---

# Phase 53 Plan 02: Author Google Places deletion migration and audit script Summary

One-time, provenance-aware deletion migration plus a matching read-only row-count audit script were authored on disk for the human-gated DB push in Plan 03. Both files use the identical `NOT EXISTS (SELECT 1 FROM business_paikka_links ...)` predicate so the audit's "pure-Google" baseline count exactly equals what the migration will remove.

## What Was Built

**Task 1 — `supabase/migrations/20260622120000_remove_google_places_data.sql`**

A single irreversible `DELETE FROM liikuntapaikat WHERE NOT EXISTS (SELECT 1 FROM business_paikka_links bpl WHERE bpl.paikka_id = liikuntapaikat.id);` statement, preceded by a narrative comment block following the convention established in `20260612000000_cleanup_test_accounts.sql`. The comment documents:
- Why the predicate is safe (link-type-agnostic — keeps any row with a `business_paikka_links` row, 'claim' or 'created')
- The full 5-table `ON DELETE CASCADE` chain: `reviews`, `suosikit`, `business_paikka_links`, `onboarding_draft`, `business_branding`
- Idempotency guarantee (re-running is a no-op once pure-Google rows are gone)
- An explicit IRREVERSIBLE warning gating execution behind the Plan 03 audit review

`business_managed` does not appear anywhere in the executable SQL — confirmed by grep excluding comment lines.

**Task 2 — `supabase/migrations/_audit/53-row-count-audit.sql`**

A standalone, read-only SQL script under the underscore-prefixed `_audit/` directory (excluded from the Supabase migration runner's top-level pickup). Contains:
1. Baseline totals (`UNION ALL` of row counts) for `liikuntapaikat`, `reviews`, `suosikit`, `business_paikka_links`.
2. A provenance breakdown using the identical `NOT EXISTS` predicate, splitting `liikuntapaikat` into "pure-Google (deletion target)" vs. "linked-kept," plus an optional further breakdown by `link_type`.
3. A documentation-only comment block stating the expected post-migration deltas (pure-Google count to 0; linked-kept and `business_paikka_links` counts unchanged; reviews/suosikit may drop only via cascade on deleted rows, confirmed test-only per CONTEXT.md D-03).

No mutating statement (`DELETE`/`UPDATE`/`INSERT`/`DROP`/`TRUNCATE`) appears anywhere in the file.

## Verification

Both automated verification gates from the plan passed:
- `MIGRATION_OK`: file exists, contains `NOT EXISTS`, contains `DELETE FROM liikuntapaikat`, and `business_managed` is absent from non-comment lines.
- `AUDIT_OK`: file exists under `_audit/`, references `business_paikka_links`/`suosikit`/`reviews`, and contains no `DELETE FROM` substring anywhere.

Neither file was executed against any database. No `supabase db push` or equivalent command was run in this plan.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — both files match the plan's threat model exactly: the deletion predicate is link-type-agnostic NOT EXISTS (T-53-04, T-53-05 mitigated), and the audit script's predicate is verified identical with zero mutating statements (T-53-06, T-53-07 mitigated). No new network endpoints, auth paths, or schema changes were introduced.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260622120000_remove_google_places_data.sql
- FOUND: supabase/migrations/_audit/53-row-count-audit.sql
- FOUND: 95b2ae2 (feat(53-02) migration commit)
- FOUND: eb10de3 (test(53-02) audit script commit)
