# Phase 59 Deploy Runbook — Companies/Role/RLS Migration

## Current state (read this first)

Unlike the runbook's general-case ordering below, **the SQL migration has already been applied** — directly to the project's single Supabase instance, via the Management API, during Plan 01's checkpoint resolution (see `59-01-SUMMARY.md`). There is no separate staging environment for this project; the operator explicitly accepted this given the app has no real users yet.

**This means the database is currently ahead of the app code.** `business_accounts.company_name` no longer exists. If this app is deployed anywhere reachable (Vercel or otherwise) right now, any live request path that still references `company_name` (business signup, create-paikka, reapply, onboarding/submit, admin approve/reject/applications, profiili) will be hitting `column "company_name" does not exist` until Plans 02/03/04's app-code changes are merged and deployed. **Closing this window is the immediate priority — see "Next action" below**, not the general future-migration process underneath it.

## Next action (do this now)

1. Merge Wave 2 (Plans 02, 03, 04 — business routes, admin routes/UI, signup + profiili) to the deploy branch.
2. Deploy immediately. Do not let a deploy queue or review cycle leave the old app code live against the new schema any longer than necessary.
3. Run the D-13 manual login regression below right after the deploy completes.

## General process for any future coupled SQL+app-code migration in this project

For migrations after this one — where a real staging/production split may exist, or where Pitfall 4's ordering risk is symmetric (neither side should land without the other) — follow this sequence:

1. **Confirm the staging dry-run passed.** Run the migration's audit/verification script against a staging or local copy first; confirm row counts, constraint behavior, and any backfill correctness checks (see `59-01-SUMMARY.md` for this migration's own verification transcript as a template).
2. **Confirm PITR (point-in-time recovery) is enabled** at the Supabase project/platform level. This is the rollback safety net — there is no custom down-migration for this migration by design (no `pg_dump`/down-migration script exists; D-03/D-04).
3. **Merge the app-code PR** (the Wave 2 changes), but do not let it deploy *ahead of* the migration — the two must land within a short window of each other, in either order, never with a large gap. Two failure directions are possible:
   - Migration lands first, app code lags → `column "company_name" does not exist` (the situation described above)
   - App code lands first, migration lags → `column "company_id" does not exist`
4. **Apply the production migration** via Supabase SQL Editor or CLI (`supabase db push`) at the deploy window.
5. **Immediately trigger/confirm the app deploy** completes — minimize the gap between steps 4 and 5.
6. **Run the D-13 manual login regression** (below).
7. **Rollback path:** if something breaks despite a clean dry-run, restore via Supabase PITR to the pre-migration timestamp (D-03). There is no custom down-migration — PITR is the only rollback mechanism by design (D-04).

## D-13 manual login regression (run after every deploy of this migration)

Log in as 2–3 real business accounts and confirm, for each:

- The same paikat (venues) are visible as before the migration.
- `/business/profiili` resolves correctly (does not silently redirect to `/business` — this would indicate the `companies` RLS SELECT policy `USING (id = current_company_id())` is denying a legitimate read; see Pitfall 3).
- No `permission denied for function current_company_id` errors appear in Supabase logs (Pitfall 2 — would indicate the `GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated` step didn't take effect).
- Admin application list/detail pages (`/admin`, `/admin/[id]`) still show the correct company name for each application.

## Note on the privilege-escalation fix

Plan 01 also applied an unplanned corrective migration (`20260625000001_fix_column_privilege_escalation.sql`) closing a real bug where `REVOKE UPDATE (col) ... FROM authenticated` doesn't override a pre-existing table-wide grant in Postgres — this affected `business_accounts.role`/`company_id` (this phase) plus four pre-existing columns from an earlier migration (`profiles.is_admin`, `liikuntapaikat.business_managed`, `business_paikka_links.claim_status`, `business_accounts.approval_status`). This is already live (applied alongside the main migration) and verified — no separate action needed here, but worth knowing if you see column-privilege-related test or behavior changes elsewhere in the diff.

## Out of scope, flagged separately

`liikuntapaikat`'s row-level RLS policies (`"Kirjautunut voi kirjoittaa"`, `authenticated_update`, `authenticated_delete`) use `USING (true)` — any authenticated user can write or delete *any* venue row, not just the columns this phase touched. This is a distinct, larger access-control gap, intentionally not addressed by this migration or runbook.
