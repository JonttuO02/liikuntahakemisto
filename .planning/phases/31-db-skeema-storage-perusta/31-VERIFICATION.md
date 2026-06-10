---
phase: 31-db-skeema-storage-perusta
verified: 2026-06-05T12:14:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
human_confirmed: 2026-06-05 — user confirmed all 5 live DB/Storage items (tables, columns, bucket, is_admin)
human_verification:
  - test: "Confirm live DB has business_accounts and business_paikka_links tables with correct columns"
    expected: "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('business_accounts','business_paikka_links') AND table_schema='public' returns 2"
    why_human: "Cannot query live Supabase DB from verifier; migrations were applied via Management API (not supabase db push) per SUMMARY-04"
  - test: "Confirm liikuntapaikat.business_managed and profiles.is_admin columns exist in live DB"
    expected: "Both column queries return 1 row each"
    why_human: "Cannot query live Supabase DB from verifier"
  - test: "Confirm business-media Storage bucket is public and RLS policies are active"
    expected: "Bucket 'business-media' visible in Storage tab as Public; 4 policies visible under Storage Policies"
    why_human: "Storage state not queryable from local codebase; sql-editor file was run manually in SQL Editor"
  - test: "Confirm is_admin=true for joona.orava@gmail.com"
    expected: "SELECT is_admin FROM profiles WHERE user_id = (SELECT id FROM auth.users WHERE email='joona.orava@gmail.com') returns true"
    why_human: "Cannot query live Supabase Auth/profiles from verifier"
  - test: "Confirm anon client SELECT on business_accounts returns empty array (RLS active)"
    expected: "const { data } = await supabase.from('business_accounts').select('*') returns []"
    why_human: "RLS enforcement is a runtime Supabase behavior; cannot verify from static file inspection"
---

# Phase 31: DB-skeema & Storage-perusta Verification Report

**Phase Goal:** Tietokantaskeema ja tallennus on valmis kaikkia yritystoimintoja varten — yksikään myöhempi vaihe ei voi edetä ilman tätä pohjaa
**Verified:** 2026-06-05T12:14:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `business_accounts` ja `business_paikka_links` ovat olemassa Supabasessa oikeilla FK-suhteilla | ? UNCERTAIN | Migration file is complete and correct (verified below); live DB push was done via Management API per SUMMARY-04 — cannot verify live state programmatically |
| 2 | `liikuntapaikat.business_managed` boolean sarake on olemassa; sync-skripti ohittaa rivit joissa `business_managed = true` | ✓ VERIFIED | Migration file correct; route.ts pre-filter wiring verified; 81 tests pass including 4 filter-specific tests |
| 3 | `business-media` Storage bucket on olemassa; RLS sallii kirjoittamisen vain paikalle oikeuden omaavalle yritykselle | ? UNCERTAIN | sql-editor file is correct and complete; live execution confirmed by user "approved" checkpoint in PLAN-04 — cannot verify live bucket state programmatically |
| 4 | Kaikki uudet taulut ovat RLS-suojattuja — anon-avaimella ei pysty lukemaan tai kirjoittamaan muiden yritysten tietoja | ? UNCERTAIN | RLS SQL is correct in migration (2x ENABLE ROW LEVEL SECURITY, 6x CREATE POLICY with auth.uid() checks); live enforcement cannot be verified from static analysis |

**Score:** 6/7 individual must-haves verified (SC-2 fully automated; SC-1/3/4 blocked on live DB access)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260605000000_business_accounts.sql` | business_accounts + business_paikka_links + RLS | ✓ VERIFIED | 85 lines; 2x CREATE TABLE IF NOT EXISTS; 2x ENABLE ROW LEVEL SECURITY; 6x CREATE POLICY; all FKs, CHECKs correct |
| `supabase/migrations/20260605000001_business_managed.sql` | business_managed column on liikuntapaikat | ✓ VERIFIED | 9 lines; correct ALTER TABLE liikuntapaikat with IF NOT EXISTS; no "paikat" reference |
| `supabase/migrations/20260605000002_profiles_is_admin.sql` | is_admin column on profiles | ✓ VERIFIED | 14 lines; correct ALTER TABLE profiles with IF NOT EXISTS; manual UPDATE comment for joona.orava@gmail.com present |
| `supabase/sql-editor/20260605_business_media_bucket.sql` | Storage bucket + security-definer fn + 4 RLS policies | ✓ VERIFIED | 115 lines; bucket creation with ON CONFLICT DO NOTHING; SECURITY DEFINER function in public schema; 4 CREATE POLICYs; 8x objects.name references |
| `app/api/admin/sync-paikat/route.ts` | managedSet pre-filter inserted | ✓ VERIFIED | managedSet (2x), .eq('business_managed', true), syncResults.map (2x), loydetty: allResults.length preserved |
| `app/api/admin/__tests__/sync-paikat-filter.test.ts` | 4 unit tests for buildSyncResults | ✓ VERIFIED | 67 lines; 4 test cases covering exclusion, empty pass-through, null safety, count distinction |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `business_accounts.user_id` | `auth.users.id` | `REFERENCES auth.users(id) ON DELETE CASCADE` | ✓ VERIFIED | Present in migration file line 24 |
| `business_paikka_links.business_account_id` | `business_accounts.user_id` | `REFERENCES business_accounts(user_id) ON DELETE CASCADE` | ✓ VERIFIED | Present in migration file line 57 |
| `business_paikka_links.paikka_id` | `liikuntapaikat.id` | `REFERENCES liikuntapaikat(id) ON DELETE CASCADE` | ✓ VERIFIED | Present in migration file line 58; uses liikuntapaikat not paikat |
| `storage.objects RLS policy` | `business_paikka_links` | `public.business_owns_paikka() SECURITY DEFINER` | ✓ VERIFIED | Function defined in public schema (not storage — hosted Supabase restriction, documented deviation); referenced 3x in INSERT/UPDATE policies |
| `storage.objects path segment` | `auth.uid()` | `(storage.foldername(objects.name))[1] = (auth.uid())::text` | ✓ VERIFIED | Pattern present in INSERT, UPDATE, and DELETE policies; 8x objects.name references |
| `sync-paikat route` | `liikuntapaikat.business_managed` | `supabaseAdmin.from('liikuntapaikat').select('place_id').eq('business_managed', true)` | ✓ VERIFIED | Present in route.ts lines 155-158 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `route.ts managedSet filter` | `managedRows` | `supabaseAdmin.from('liikuntapaikat').select('place_id').eq('business_managed', true)` | Yes — live Supabase query via service role | ✓ FLOWING |
| `route.ts syncResults` | `allResults.filter(r => !managedSet.has(r.place_id))` | TypeScript Set filter over managedRows | Yes — derived from real query | ✓ FLOWING |
| `route.ts loydetty` | `allResults.length` | Google Places API results (pre-filter) | Yes — preserved correctly | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 4 filter unit tests pass | `npx vitest run` | 81/81 tests pass (9 files) | ✓ PASS |
| buildSyncResults excludes managed place_id | inline test case 1 | pass (syncResults.length === 1) | ✓ PASS |
| buildSyncResults handles null managedRows | inline test case 3 | pass (no crash, syncResults.length === 1) | ✓ PASS |
| loydetty/tallennettu count separation | inline test case 4 | pass (allResults.length === 2, syncResults.length === 1) | ✓ PASS |

### Probe Execution

No probe scripts declared or present for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BIZ-02 | PLAN-01, PLAN-04 | business_accounts linkittää Auth-käyttäjän yritykseen; business_paikka_links yhdistää paikkoja tiliin | ✓ SATISFIED (local) / ? LIVE | Migration file fully correct; live push via Management API confirmed by SUMMARY-04 |
| DATA-09 | PLAN-02, PLAN-03 | business_managed boolean + sync-skripti ohittaa managed-paikat | ✓ SATISFIED | Migration file correct; route.ts pre-filter wired and tested; 4 unit tests pass |
| DATA-10 | PLAN-02, PLAN-04 | business-media Storage bucket + RLS via business_paikka_links | ✓ SATISFIED (local) / ? LIVE | sql-editor file complete and correct; live execution confirmed by user checkpoint in PLAN-04 |

**Note:** REQUIREMENTS.md traceability table lists BIZ-02, DATA-09, DATA-10 as "Pending" (not yet updated to reflect completion). This is a documentation gap — the implementation is in place.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/migrations/20260605000002_profiles_is_admin.sql` | — | `profiles.is_admin` updatable by any authenticated user via existing UPDATE policy (self-elevation risk) | ⚠️ Warning (documented) | Operationally mitigated: only set via SQL Editor service role. Phase 35 will add WITH CHECK structural fix. Threat T-31-08 formally accepted in PLAN-02 threat model. |

No TBD/FIXME/XXX markers found in any phase-31 modified files.

### Human Verification Required

The following items require direct Supabase Dashboard access to confirm. These were gated behind the `checkpoint:human-verify` in PLAN-04, Task 2, which the user confirmed with "approved". The verifier cannot independently confirm live DB state.

#### 1. Live DB Tables

**Test:** In Supabase SQL Editor: `SELECT count(*) FROM information_schema.tables WHERE table_name IN ('business_accounts','business_paikka_links') AND table_schema='public'`
**Expected:** 2
**Why human:** Cannot query live Supabase DB from verifier; migrations applied via Management API

#### 2. Live DB Columns

**Test:** Run both: `SELECT count(*) FROM information_schema.columns WHERE table_name='liikuntapaikat' AND column_name='business_managed'` and the same for `profiles`/`is_admin`
**Expected:** 1 each
**Why human:** Cannot query live Supabase DB from verifier

#### 3. Storage Bucket

**Test:** Open Supabase Dashboard > Storage — confirm 'business-media' bucket exists and is marked Public
**Expected:** Bucket visible, marked Public, 4 RLS policies under Storage > Policies
**Why human:** Storage state not inspectable from codebase files

#### 4. is_admin Bootstrap

**Test:** `SELECT is_admin FROM profiles WHERE user_id = (SELECT id FROM auth.users WHERE email='joona.orava@gmail.com')`
**Expected:** true
**Why human:** Cannot query live auth.users/profiles from verifier

#### 5. RLS Enforcement (anon read)

**Test:** Using anon Supabase key: `const { data } = await supabase.from('business_accounts').select('*')` — data should be `[]`
**Expected:** Empty array (RLS blocks anon reads)
**Why human:** RLS enforcement is a runtime behavior; static file analysis confirms the SQL is correct but cannot confirm the live enforcement

---

### Gaps Summary

No BLOCKER gaps. All local artifacts are fully implemented, substantive, and correctly wired.

The human_needed status reflects that Phase 31 includes a mandatory `checkpoint:human-verify` (PLAN-04, Task 2) for live DB state. The user already approved this checkpoint during execution ("approved" signal documented in SUMMARY-04), but the verifier must independently surface these items per verification protocol since live DB cannot be queried programmatically.

**Documented deviation (not a gap):** `business_owns_paikka()` function was created in `public` schema rather than `storage` schema. Hosted Supabase forbids writing to the `storage` schema from SQL Editor. The Storage RLS policies correctly reference `public.business_owns_paikka(...)`. This is documented in SUMMARY-04 (commit 246e0a1) and in the sql-editor file header comment.

---

_Verified: 2026-06-05T12:14:00Z_
_Verifier: Claude (gsd-verifier)_
