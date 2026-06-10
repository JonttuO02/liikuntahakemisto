---
phase: 35-admin-hyvaksyntajarjestelma
plan: "01"
subsystem: database
tags: [migration, schema, admin, business]
dependency_graph:
  requires: []
  provides:
    - business_paikka_links.rejection_reason (TEXT NULL)
    - business_accounts.role_in_company (TEXT NULL)
  affects:
    - supabase/migrations/
tech_stack:
  added: []
  patterns:
    - ADD COLUMN IF NOT EXISTS (idempotent migration)
key_files:
  created:
    - supabase/migrations/20260610000002_admin_columns.sql
  modified: []
decisions:
  - "Migration timestamp 20260610000002 jatkaa olemassa olevaa numerointia (20260610000001 oli viimeisin)"
  - "ADD COLUMN IF NOT EXISTS takaa idempotenttisuuden uudelleenajoa varten"
  - "Molemmat sarakkeet TEXT NULL — ei CHECK-rajoitteita tarvita"
metrics:
  duration: "~2 min"
  completed: "2026-06-10T14:09:42Z"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 35 Plan 01: Admin-sarakkeet DB-migraatio — Yhteenveto

SQL-migraatio lisää kaksi nollattavaa TEXT-saraketta admin-hyväksyntäjärjestelmää varten: `rejection_reason` tauluun `business_paikka_links` ja `role_in_company` tauluun `business_accounts`.

## Tehtävät

| # | Nimi | Commit | Tiedostot |
|---|------|--------|-----------|
| 1 | Luo migraatiotiedosto | 014c651 | supabase/migrations/20260610000002_admin_columns.sql |

## Päätökset

- **Migraatioaikaleima `20260610000002`**: Jatkaa suoraan edellisestä (`20260610000001`) — taattu järjestys.
- **`ADD COLUMN IF NOT EXISTS`**: Idempotenttisuus — migraatio voidaan ajaa uudelleen turvallisesti.
- **Molemmat sarakkeet `TEXT NULL`**: Ei CHECK-rajoitteita — flexibiliteettiä tuleviin arvoihin.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — puhtaasti skeemalisäys ilman uusia verkkorajapintoja tai autentikointireittejä.

## Self-Check: PASSED

- [x] `supabase/migrations/20260610000002_admin_columns.sql` exists
- [x] Contains `ALTER TABLE business_paikka_links ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL`
- [x] Contains `ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS role_in_company TEXT NULL`
- [x] Commit 014c651 exists in git log
