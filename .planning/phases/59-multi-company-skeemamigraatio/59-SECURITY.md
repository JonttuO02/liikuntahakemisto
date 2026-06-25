# Phase 59 — Multi-company Skeemamigraatio: Security Audit

**Audited:** 2026-06-25
**Disposition:** SECURED — all declared threats closed
**Threats Closed:** 18/18 (across all four plans; T-59-SC counted once per plan)
**ASVS Level:** default

This audit verifies that every threat declared in the four plan `<threat_model>` blocks
is mitigated in the ACTUAL implemented code / live-database state — not merely described
in the plan text. The single highest-priority verification (T-59-04) is recorded in full
below because the plan's original literal mitigation was discovered to be ineffective and
required two corrective migrations.

---

## Critical verification: T-59-04 (column-privilege escalation)

**Threat:** A business member self-promotes to `owner`, or re-points `company_id`, by
PATCHing their own `business_accounts` row through the existing own-row
`"Business updates own account"` UPDATE RLS policy.

**Plan's original (ineffective) mitigation:**
`REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated`
(present at `supabase/migrations/20260625000000_companies_role_rls.sql:140`).

**Why the original mitigation does NOT close the threat:** Postgres column-level `REVOKE`
only removes a column-specific grant; it does not narrow a pre-existing TABLE-WIDE `UPDATE`
grant. Supabase grants table-wide `UPDATE` to `authenticated` by default, so after the
column-level REVOKE the columns remained fully updatable. This was confirmed live during
the D-02 staging gate: `has_column_privilege('authenticated','business_accounts','role','UPDATE')`
returned `true` (59-01-SUMMARY.md, Task 3 transcript, step 4). The same defect silently
affected four pre-existing column REVOKEs from `20260605000003` (most severely
`profiles.is_admin` — full admin self-elevation).

**What actually closes it (final live-database state):** Two corrective migrations applied
AFTER the main migration, in timestamp order:

1. `20260625000001_fix_column_privilege_escalation.sql` — replaces the broken
   column-REVOKE pattern with `REVOKE UPDATE ON business_accounts FROM authenticated`
   (whole-table) + `GRANT UPDATE (user_id, created_at, role_in_company, contact_phone)`
   (allow-list). `role` and `company_id` are absent from the allow-list → blocked. The
   same whole-table-revoke + allow-list fix is applied to `profiles`, `liikuntapaikat`,
   and `business_paikka_links`, closing the four pre-existing escalation columns too.
2. `20260625000002_tighten_business_accounts_grant.sql` — CR-01 follow-up from
   `59-REVIEW.md`. Tightens the `business_accounts` allow-list from four columns to
   `GRANT UPDATE (contact_phone)` only — removing `user_id` (identity column) and
   `created_at` (audit timestamp), neither of which has a legitimate client write path.
   `contact_phone` is confirmed the only authenticated-client UPDATE path
   (`BusinessProfiiliClient.tsx:29`).

**Final allow-list for `business_accounts` UPDATE by `authenticated`: `contact_phone` ONLY.**
`role` and `company_id` are therefore NOT updatable by `authenticated`.
Verified two independent ways:
- Migration text trace (the three migrations apply in timestamp order `...0000` → `...0001`
  → `...0002`; the last write to the grant wins, leaving only `contact_phone`).
- Live `has_column_privilege()` transcript recorded in 59-01-SUMMARY.md Task 3 step 6:
  all five blocked columns (this phase's `role`/`company_id` plus the four pre-existing)
  return `false`; spot-checked legitimate columns (`contact_phone`, `kotikaupunki`,
  `kuvaus`, `rejection_reason`) still return `true` (no write-path regression).

**Disposition: CLOSED.** The threat is closed by the final migration state, not by the
plan's original mitigation text. A pre-existing, more-severe escalation (`profiles.is_admin`)
was caught and fixed in the same corrective migration.

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-59-01 | Tampering | mitigate | CLOSED | ROW_NUMBER() CTE backfill at `20260625000000_companies_role_rls.sql:102-117` (two identical `ORDER BY user_id`); full-row verification in `_audit/59-backfill-verification.sql` section 3 (3a count-equality, 3b zero-rows NULL/duplicate-mapping, 3c role check). Live result: counts equal (4=4), zero mismatch rows (59-01-SUMMARY.md Task 3 step 3) |
| T-59-02 | Denial of Service | mitigate | CLOSED | `GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated` at `20260625000000:173`; live check confirmed no `permission denied for function current_company_id` (59-01-SUMMARY.md Task 3 step 3) |
| T-59-03 | Information Disclosure | mitigate | CLOSED | `ALTER TABLE companies ENABLE ROW LEVEL SECURITY` (`:87`) + SELECT-only policy `"Business reads own company" USING (id = current_company_id())` (`:180-182`); no INSERT/UPDATE policy on companies |
| T-59-04 | Elevation of Privilege | mitigate | CLOSED | See "Critical verification" above. Final state: `business_accounts` UPDATE allow-list = `contact_phone` only (`...0002:45`); `role`/`company_id` blocked, verified live via `has_column_privilege` |
| T-59-05 | Tampering | mitigate | CLOSED | `SET search_path = public` pinned in `current_company_id()` definition (`20260625000000:166`); function is `LANGUAGE sql STABLE`, read-only, no user input |
| T-59-06 | Information Disclosure | mitigate | CLOSED | Header comment (`20260625000000:57-74`) enumerates every existing policy on `business_accounts` and `business_paikka_links`, each marked KEEP-AS-IS or REWRITTEN; `business_paikka_links_select_own` rewritten self-scoped `business_account_id = auth.uid()` (`:195-197`), D-14 widening deferred to Phase 60/64 |
| T-59-07 | Tampering | accept | CLOSED | Accepted — company-name write is supabaseAdmin (service-role) only, keyed by caller's own `company_id` looked up from `business_accounts`; no client write path (companies has no INSERT/UPDATE RLS policy). See accepted-risks log below |
| T-59-08 | Information Disclosure | accept | CLOSED | Accepted — admin-notification email content unchanged; only the read path changed (FK join `companies(name)` vs flat column). See accepted-risks log below |
| T-59-09 | Elevation of Privilege | mitigate | CLOSED | `role_in_company` preserved distinct from new `role` enum in both admin embedded selects: `business_accounts(role, role_in_company, user_id, companies(name))` at `app/api/admin/applications/route.ts:20` and `[id]/route.ts:23`; UI types carry both fields |
| T-59-10 | Information Disclosure | accept | CLOSED | Accepted — admin routes still gate on `profiles.is_admin` (`app/api/admin/applications/route.ts:10-14`, returns 403); same datum surfaced. See accepted-risks log below |
| T-59-11 | Elevation of Privilege | mitigate | CLOSED | `role: 'owner'` assigned server-side via supabaseAdmin only (`app/api/business/register/route.ts:58`); INSERT uses verified `user.id`, never `body.user_id`; no client-supplied `role` accepted; backed by the T-59-04 column REVOKE preventing post-insert self-edit |
| T-59-12 | Information Disclosure | mitigate | CLOSED | `profiili` anon-key read `.select('companies(name), contact_phone')` (`app/business/profiili/page.tsx:13`) gated by the companies SELECT policy `USING (id = current_company_id())`; misconfigured policy denies (redirect), does not over-expose. D-13 login regression in runbook |
| T-59-13 | Data integrity | mitigate | CLOSED | Rollback deletes the new companies row on `business_accounts` insert failure with CRITICAL log on rollback-delete failure (`app/api/business/register/route.ts:68-71`); auth user intentionally not deleted |
| T-59-14 | Tampering | mitigate | CLOSED | `59-DEPLOY-RUNBOOK.md` documents staging-verified → PITR-confirmed → merge → migration → deploy → D-13 regression ordering; cites both Pitfall 4 failure directions and PITR rollback (D-03/D-04) |
| T-59-SC | Tampering | accept | CLOSED | Accepted — no package installs in any of the four plans; pure SQL + app-code + test + docs. See accepted-risks log below |

---

## Accepted Risks Log

| Threat ID | Risk | Acceptance rationale |
|-----------|------|----------------------|
| T-59-07 | Company-name write path | Write remains supabaseAdmin server-only, keyed by the caller's own `company_id` (resolved from `auth.uid()`'s `business_accounts` row). No client-side companies write path; companies table has no INSERT/UPDATE RLS policy. No new attack surface. |
| T-59-08 | Admin-notification email content | Same data (companyName, venueName) sent as before this phase. Only the read path changed (FK join vs dropped flat column). No new data exposed. |
| T-59-10 | Admin application-list company name | Admin routes gate on `profiles.is_admin` (unchanged, 403 on failure). Same datum surfaced; only read path changed. |
| T-59-SC | npm/pip/cargo supply chain | No package installs across Plans 01-04 — pure SQL migration, app-code edits, Vitest tests, and docs. Zero new runtime dependencies. |

---

## Unregistered Flags

None. Every plan SUMMARY `## Threat Flags` section reports "None beyond the plan's own
threat_model" (59-01 through 59-04 SUMMARY.md). No new attack surface appeared during
implementation without a mapped threat ID.

---

## Out-of-scope finding carried forward (NOT a Phase 59 threat)

`liikuntapaikat` has row-level RLS write policies (`"Kirjautunut voi kirjoittaa"`,
`authenticated_update`, `authenticated_delete`) using `USING (true)` / `WITH CHECK (true)`
— any authenticated user can write or delete ANY venue row. This is a pre-existing,
larger access-control gap surfaced (not introduced) during this phase's verification. It
is explicitly out of scope for the Phase 59 threat register and is documented in
`20260625000001` header, 59-01-SUMMARY.md, and 59-DEPLOY-RUNBOOK.md as separately tracked.
It does not block this phase but SHOULD be registered as its own threat in a future phase.

---

## Conclusion

All 14 distinct threats (T-59-01..14) plus the per-plan supply-chain accept (T-59-SC)
resolve to CLOSED. The load-bearing T-59-04 escalation is closed by the FINAL live-database
state (`...0001` + `...0002`), not by the plan's original ineffective REVOKE text, and was
verified live via `has_column_privilege()`. The phase is SECURED for ship, with the
out-of-scope `liikuntapaikat USING (true)` RLS gap recommended for a dedicated follow-up.
