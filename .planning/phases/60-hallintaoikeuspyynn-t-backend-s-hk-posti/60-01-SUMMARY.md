---
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
plan: "01"
subsystem: database
tags: [supabase, rls, postgres, migration, access-control, business_access_requests]

requires:
  - phase: 59-multi-company-skeemamigraatio
    provides: "companies table, business_accounts.company_id/role columns, current_company_id() SECURITY DEFINER helper, RLS rewrite"

provides:
  - "business_access_requests table (id, requester_id FK→business_accounts, paikka_id FK→liikuntapaikat, status CHECK, rejection_reason, created_at, updated_at)"
  - "Partial UNIQUE index business_access_requests_pending_unique (requester_id, paikka_id) WHERE status='pending'"
  - "RLS: 2 SELECT policies (requester-own + owner-scoped) + 1 INSERT policy, NO UPDATE policy by design (T-60-02)"
  - "business_accounts.company_id relaxed to nullable for D-09a invite-link signup path"
  - "Schema pushed to live Supabase instance, confirmed in dashboard"

affects:
  - "60-02 (email helpers depend on this table structure)"
  - "60-03 (access-request/submit Route Handler writes to this table)"
  - "60-04 (approve/reject Route Handlers update status via supabaseAdmin)"
  - "60-05 (invite landing page links to this table)"
  - "business_accounts.company_id (now nullable — affects all Phase 59+ RLS reads)"

tech-stack:
  added: []
  patterns:
    - "Partial UNIQUE index (WHERE status='pending') — first use in this codebase; enforces idempotent pending-only uniqueness"
    - "Status-column lockdown: ENABLE RLS + no authenticated UPDATE grant — supabaseAdmin is sole writer for status transitions"
    - "Owner-read RLS via EXISTS + current_company_id() SECURITY DEFINER helper (Phase 59 pattern, reused)"

key-files:
  created:
    - supabase/migrations/20260626000000_business_access_requests.sql
  modified: []

key-decisions:
  - "D-05/T-60-02: No UPDATE RLS policy and no authenticated UPDATE grant on business_access_requests — status/rejection_reason transitions ONLY via supabaseAdmin in Route Handlers (60-04). Avoids column-level REVOKE pitfall by construction (Phase 59 fixed 5 prior instances of this)."
  - "D-08: Partial UNIQUE index WHERE status='pending' enforces DB-level idempotency — approved/rejected rows do not block new pending requests to the same venue."
  - "D-09a: business_accounts.company_id DROP NOT NULL so invite-link signup can exist with company_id=NULL until approval. current_company_id() already returns NULL for such rows (Phase 59 D-12), no helper change needed."
  - "Owner-read SELECT: EXISTS subquery joining business_paikka_links + business_accounts filtered by current_company_id() + role='owner' + claim_status='approved' — avoids same-table RLS recursion via SECURITY DEFINER helper."
  - "Schema pushed to live Supabase via supabase db push — operator confirmed table, 3 policies, nullable company_id in dashboard."

patterns-established:
  - "Partial UNIQUE index pattern: CREATE UNIQUE INDEX ... ON table (col1, col2) WHERE (status = 'pending') — use for idempotent pending-only constraints"
  - "Status-transition lockdown pattern: ENABLE RLS + explicit 2×SELECT + 1×INSERT, zero UPDATE — supabaseAdmin only for mutations"

requirements-completed: [ACCESS-03, ACCESS-06]

coverage:
  - id: D1
    description: "business_access_requests table exists with 7 columns, status CHECK IN ('pending','approved','rejected'), FK constraints, and RLS enabled"
    requirement: ACCESS-03
    verification:
      - kind: manual_procedural
        ref: "grep checks on migration file — CREATE TABLE IF NOT EXISTS business_access_requests, all columns, CHECK constraint, ENABLE ROW LEVEL SECURITY"
        status: pass
    human_judgment: false
  - id: D2
    description: "Partial UNIQUE index business_access_requests_pending_unique (requester_id, paikka_id) WHERE status='pending' for idempotent duplicate submission"
    requirement: ACCESS-03
    verification:
      - kind: manual_procedural
        ref: "grep -q 'business_access_requests_pending_unique' supabase/migrations/20260626000000_business_access_requests.sql"
        status: pass
    human_judgment: false
  - id: D3
    description: "Exactly 2 SELECT + 1 INSERT RLS policies, NO UPDATE policy — requester cannot self-approve status changes"
    requirement: ACCESS-06
    verification:
      - kind: manual_procedural
        ref: "grep checks confirm 0 FOR UPDATE policies and 0 GRANT UPDATE statements; Supabase dashboard confirmed 3 policies at push time"
        status: pass
    human_judgment: true
    rationale: "Live RLS policy correctness in Supabase requires dashboard visual confirmation — operator confirmed 3 policies (no UPDATE) at schema push checkpoint."
  - id: D4
    description: "business_accounts.company_id is nullable in live DB (D-09a invite-link signup path unblocked)"
    requirement: ACCESS-03
    verification:
      - kind: manual_procedural
        ref: "Supabase dashboard Database -> Tables -> business_accounts -> company_id column: nullable=true"
        status: pass
    human_judgment: true
    rationale: "Nullability in live Supabase requires dashboard confirmation — operator confirmed at schema push time."
  - id: D5
    description: "Migration pushed to live Supabase instance and business_access_requests table visible in dashboard"
    requirement: ACCESS-03
    verification: []
    human_judgment: true
    rationale: "supabase db push is a blocking human checkpoint — push success and table existence confirmed by operator."

duration: ~20min
completed: "2026-06-26"
status: complete
---

# Phase 60 Plan 01: Hallintaoikeuspyynnöt — migraatio Summary

**business_access_requests-taulu RLS:llä (2 SELECT + 1 INSERT, ei UPDATE-polkua), D-08 osittainen UNIQUE-indeksi idempotenssia varten ja business_accounts.company_id nollattavaksi (D-09a) — pushattu live-Supabaseen**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-26
- **Completed:** 2026-06-26
- **Tasks:** 2 (1 auto + 1 blocking human checkpoint)
- **Files modified:** 1

## Accomplishments

- Luotu `business_access_requests`-taulu seitsemällä sarakkeella (id, requester_id FK→business_accounts, paikka_id FK→liikuntapaikat, status CHECK IN('pending','approved','rejected'), rejection_reason, created_at, updated_at)
- D-08: Osittainen UNIQUE-indeksi `business_access_requests_pending_unique (requester_id, paikka_id) WHERE status='pending'` — ensimmäinen osittainen UNIQUE-indeksi koodikannassa; estää kaksoispyynnöt DB-tasolla; hyväksytyt/hylätyt rivit eivät estä uuden pyynnön lähetystä
- T-60-02 mitigaatio: RLS 2×SELECT + 1×INSERT, EI UPDATE-politiikkaa eikä authenticated-UPDATE-oikeutta — status-siirtymät tapahtuvat ainoastaan supabaseAdmin-clientin kautta Route Handlereissa (60-04)
- D-09a: `ALTER TABLE business_accounts ALTER COLUMN company_id DROP NOT NULL` — kutsulinkki-signup voi rekisteröityä ilman yritystä (company_id=NULL) kunnes hyväksyntä asettaa sen; current_company_id()-helpperiin ei tarvittu muutoksia (Phase 59 D-12 jo käsitteli NULL:in)
- Migraatio pushattu live-Supabaseen `supabase db push`:lla ja vahvistettu dashboardissa (taulu, 3 politiikkaa, nullable company_id)

## Task Commits

1. **Task 1: Luo business_access_requests-migraatio RLS:llä ja osittaisella UNIQUE-indeksillä** — `06b8375` (feat)
2. **Task 2: supabase db push (blocking human checkpoint)** — operator-gated, push vahvistettu; ei erillistä commitia

## Files Created/Modified

- `supabase/migrations/20260626000000_business_access_requests.sql` — uusi migraatiotiedosto: company_id DROP NOT NULL, taulu 7 sarakkeella, osittainen UNIQUE-indeksi, RLS 3 politiikalla, koko migraatio BEGIN/COMMIT-transaktiossa

## Decisions Made

- **D-05/T-60-02:** Ei UPDATE-politiikkaa eikä authenticated-UPDATE-oikeutta `business_access_requests`-tauluun — status-siirtymät tapahtuvat ainoastaan supabaseAdmin-clientin kautta (60-04 Route Handlerit). Välttää column-level REVOKE -sudenkuopan konstruktiivisesti (Phase 59 korjasi saman ongelman 5 taulussa).
- **D-08:** Osittainen UNIQUE-indeksi `WHERE status='pending'` valittiin DB-tason idempotenssin pakottamiseen — hyväksytyt/hylätyt rivit eivät estä uuden pyynnön lähettämistä samaan paikkaan.
- **D-09a:** company_id nollattavaksi kutsulinkki-signup-polkua varten. current_company_id()-helpperiin ei tarvittu muutosta.
- **Owner-read SELECT:** EXISTS-alikysely `business_paikka_links`- ja `business_accounts`-taulujen kautta, suodatettu `current_company_id() + role='owner' + claim_status='approved'`:lla — välttää same-table RLS -rekursion SECURITY DEFINER -helpperin ansiosta.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - supabase db push on operaattori-gate (blocking human checkpoint). Ei ympäristömuuttujia eikä erillisiä dashboard-konfiguraatioita.

## Next Phase Readiness

- `business_access_requests`-taulu on live-Supabasessa — 60-02 (email.ts), 60-03 (submit), 60-04 (approve/reject) voivat edetä
- company_id nullable — D-09a invite-link signup -polku on avoin 60-03:lle
- Ei blokkereita seuraavalle planille

---

## Self-Check

- [x] Migraatiotiedosto olemassa: `supabase/migrations/20260626000000_business_access_requests.sql` — FOUND
- [x] Commit 06b8375 olemassa git-lokissa — FOUND
- [x] SUMMARY.md kirjoitettu `.planning/phases/60-hallintaoikeuspyynn-t-backend-s-hk-posti/60-01-SUMMARY.md`

## Self-Check: PASSED

---

*Phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti*
*Completed: 2026-06-26*
