---
phase: 59
slug: multi-company-skeemamigraatio
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-25
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest run`, per `package.json` `"test": "vitest run"`) |
| **Config file** | Not confirmed in research — likely `vitest.config.ts`/`vitest.config.mts` at repo root; planner/executor should confirm exact path in Wave 0 |
| **Quick run command** | `npx vitest run tests/api/<relevant>.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | Not measured — small Vitest suite, expected well under 60s |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/create-paikka.test.ts tests/api/submit.test.ts tests/api/register.test.ts` (files touching `company_name`/registration behavior)
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite green, **plus** the two manual-only gates below (D-02 staging dry-run, D-13 manual login regression) — neither is covered by `npm test` and must be tracked as separate checklist items.
- **Max feedback latency:** ~60 seconds (no long-running suite in this repo)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | ACCESS-01 | T-59-01 | Backfill verification SQL confirms 1:1 row correspondence (Pitfall 1) before production run | manual SQL | N/A — `supabase/migrations/_audit/59-backfill-verification.sql` (read-only, staging) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ACCESS-01 | — | `companies` row created + `business_accounts.company_id`/`role` backfilled for every existing row | manual-only (per D-13) | N/A — staging SQL row-count + name-match check | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ACCESS-01 | — | New registrations (post-migration) create their own `companies` row via `register/route.ts` | unit/integration | `npx vitest run tests/api/register.test.ts` | ❌ W0 — file does not exist yet | ⬜ pending |
| TBD | TBD | TBD | ACCESS-02 | T-59-02 | `current_company_id()` not executable by `authenticated` silently denies all access (Pitfall 2) | manual staging login | N/A — confirm no `permission denied for function` in Supabase logs | ❌ — explicitly manual per D-13 | ⬜ pending |
| TBD | TBD | TBD | ACCESS-02 | T-59-03 | New `companies` table RLS enabled + SELECT policy present (Pitfall 3) — no client write path | manual staging | N/A — confirm `app/business/profiili/page.tsx` still resolves account post-migration | ❌ — explicitly manual per D-13 | ⬜ pending |
| TBD | TBD | TBD | ACCESS-02 | — | `business_paikka_links` composite UNIQUE allows two different `business_account_id`s on same `paikka_id`, still rejects duplicate pair | manual-only (per D-13) | N/A | ❌ — explicitly out of scope | ⬜ pending |
| TBD | TBD | TBD | ACCESS-01/02 | — | `create-paikka`, `reapply`, `onboarding/submit` admin notification emails still send correct `companyName` after join-through-`company_id` change | regression | `npx vitest run tests/api/create-paikka.test.ts tests/api/submit.test.ts` | ✅ — existing mocks need updating to new `companies(name)` join shape | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/migrations/_audit/59-backfill-verification.sql` — read-only SQL verification script for the backfill 1:1 row-correspondence check (Pitfall 1), mirroring `_audit/53-row-count-audit.sql`'s manual-run convention
- [ ] `tests/api/register.test.ts` — new test file; `app/api/business/register/route.ts` has zero existing coverage and its behavior changes materially in this phase (must create its own `companies` row on signup)
- [ ] Update existing mocks in `tests/api/create-paikka.test.ts` and `tests/api/submit.test.ts` from flat `company_name` to the post-migration `companies(name)` join shape
- [ ] Confirm staging/local Supabase environment exists and is reachable — hard prerequisite for D-02's dry-run gate, not verified in research

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backfill correctness — every existing `business_accounts` row got exactly one new `companies` row with matching name, `role='owner'`, no duplicate-name mis-mapping | ACCESS-01 | D-13 scopes this to manual; no automated RLS/migration test suite required this phase | Run `_audit/59-backfill-verification.sql` against staging after migration; confirm every account's `companies.name` matches its pre-migration `company_name` exactly, for every row (not a sample) |
| Existing business accounts still see only their own paikat post-migration, dashboard loads without RLS-denied errors | ACCESS-02 | D-13 explicit scope — no automated RLS test suite required this phase | Log in as 2–3 real existing business accounts in staging, then again in production; confirm same paikka(t) visible as before, no errors |
| `current_company_id()` executable by `authenticated` role (Pitfall 2) | ACCESS-02 | RLS permission-denied errors are swallowed into empty result sets by PostgREST in some configs — no automated signal | During the D-13 login check, also inspect Supabase logs for `permission denied for function current_company_id` |
| Deploy-ordering: SQL migration and app-code release land together (Pitfall 4) | ACCESS-01/02 | No CI/CD gate in this repo couples a Supabase migration apply to a Vercel deploy | Operator runbook: verify on staging (D-02) → merge app-code PR → run production migration immediately before/during the Vercel deploy window, in that order |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
