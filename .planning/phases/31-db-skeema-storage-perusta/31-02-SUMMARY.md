---
phase: 31-db-skeema-storage-perusta
plan: "02"
subsystem: database-storage
tags: [sql, migration, supabase-storage, rls, security-definer]
dependency_graph:
  requires:
    - "31-01 (business_accounts + business_paikka_links tables must exist before storage.business_owns_paikka can reference them)"
  provides:
    - "business_managed column on liikuntapaikat (DATA-09)"
    - "is_admin column on profiles (Phase 35 prerequisite)"
    - "business-media Storage bucket with full RLS (DATA-10)"
  affects:
    - "app/api/admin/sync-paikat/route.ts — Plan 03 will add pre-filter using business_managed"
    - "Phase 35 admin UI — will gate on profiles.is_admin"
tech_stack:
  added: []
  patterns:
    - "ADD COLUMN IF NOT EXISTS for idempotent schema additions"
    - "SECURITY DEFINER function to avoid RLS cascade in Storage policies"
    - "storage.foldername(objects.name)[N] for path-segment checks (1-indexed)"
    - "ON CONFLICT (id) DO NOTHING for idempotent bucket creation"
key_files:
  created:
    - supabase/migrations/20260605000001_business_managed.sql
    - supabase/migrations/20260605000002_profiles_is_admin.sql
    - supabase/sql-editor/20260605_business_media_bucket.sql
  modified: []
decisions:
  - "Storage bucket SQL placed in supabase/sql-editor/ (not migrations/) — matches CONTEXT.md D-14 decision to run manually in Supabase SQL Editor"
  - "security-definer function signature uses TEXT for p_paikka_id (path segments are strings; cast to bigint inside function body)"
  - "Logo sub-path ({uid}/logo/*) skips paikka ownership check — logo is per-business, not per-venue; image sub-paths require business_owns_paikka()"
  - "DELETE policy only checks top-level folder (foldername[1] = uid) — no paikka ownership needed since user can only delete their own files"
metrics:
  duration: "~10 min"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 31 Plan 02: DB-sarakkeet ja Storage-bucket -perusta

**One-liner:** Kolme SQL-artefaktia: business_managed-sarake liikuntapaikat-tauluun, is_admin-sarake profiles-tauluun, ja business-media Storage-bucket SECURITY DEFINER -omistajuusfunktiolla ja neljallä RLS-politiikalla storage.objects-tauluun.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Write business_managed and is_admin migrations | 3635d72 | supabase/migrations/20260605000001_business_managed.sql, supabase/migrations/20260605000002_profiles_is_admin.sql |
| 2 | Write business-media Storage bucket SQL | dd57048 | supabase/sql-editor/20260605_business_media_bucket.sql |

## What Was Built

### Task 1: Column Migrations

**20260605000001_business_managed.sql**
- `ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS business_managed BOOLEAN NOT NULL DEFAULT false`
- Selittaa kommentissa: DATA-09, sync-skripti pre-filtterointi, oikea taulunimi (liikuntapaikat -- ei paikat)
- Ei uusia RLS-politiikkoja tarvita

**20260605000002_profiles_is_admin.sql**
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`
- Kommenttilohko (10 rivea) selittaa: Phase 35 -edellytys, DEFAULT false, idempotenttisuus, itsekohoutumisriski, ja manuaalinen post-migraatio UPDATE
- Dokumentoi manuaalisen SQL Editor -komennon joona.orava@gmail.com:lle
- Ei uusia RLS-politiikkoja tarvita

### Task 2: Storage Bucket SQL

**supabase/sql-editor/20260605_business_media_bucket.sql** (111 rivea)
- Otsikkokommentti: "Manual execution: run this in Supabase SQL Editor, NOT via supabase db push"
- Bucket-luonti: `INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', true) ON CONFLICT (id) DO NOTHING`
- `storage.business_owns_paikka(p_business_id uuid, p_paikka_id text)` SECURITY DEFINER -funktio
  - `SET search_path = public` -- estaa RLS-kaskadi business_paikka_links-taululla
  - Palauttaa `EXISTS (SELECT 1 FROM business_paikka_links WHERE ...)`
  - Parametri TEXT koska polkusegmentit ovat merkkijonoja; cast bigint:iin funktion sisalla
- 4 RLS-politiikkaa storage.objects-taulussa:
  1. `"Public read business-media"` -- FOR SELECT TO public
  2. `"Business INSERT own folder"` -- foldername[1]=uid + logo-haara tai paikka-omistajuus
  3. `"Business UPDATE own folder"` -- sama WITH CHECK kuin INSERT, USING vain top-level
  4. `"Business DELETE own folder"` -- USING vain foldername[1]=uid
- Kaikki polkuviittaukset kayttavat `objects.name` (ei paljas `name`)
- Taulun subscriptit 1-indeksoitu PostgreSQL-taulukon mukaan

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None. Tama on puhdas SQL-infrastruktuurisuunnitelma ilman UI-komponentteja tai TypeScript-stubeja.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: elevation-of-privilege | supabase/migrations/20260605000002_profiles_is_admin.sql | profiles.is_admin on paivitettavissa authenticated-kayttajan toimesta via olemassa oleva UPDATE-politiikka -- itsekohoutuminen mahdollinen. Operationaalisesti lievennetty (vain SQL Editor / service-role asettaa true). Phase 35 lisaa WITH CHECK -lauseen rakenteelliseksi suojaksi (T-31-08 hyvaksytty, katso threat_model). |

## Security Review

- **T-31-05 (Tampering -- cross-business path write):** Lievennetty. foldername[1] = auth.uid()::text estaa kirjoittamisen muuhun kuin omaan top-level-kansioon.
- **T-31-06 (Tampering -- invalid paikka_id):** Lievennetty. storage.business_owns_paikka() tekee business_paikka_links-tarkistuksen; ei-numeerinen foldername[2] aiheuttaa bigint-cast-poikkeuksen (deny-by-exception).
- **T-31-07 (Spoofing -- RLS bypass via inline JOIN):** Lievennetty. SECURITY DEFINER + SET search_path = public suorittaa business_paikka_links-haun RLS-kontekstin ulkopuolella.
- **T-31-08 (EoP -- is_admin self-elevation):** Hyvaksytty (partial). Dokumentoitu seka migraatiotiedostossa etta tassa yhteenvedossa. Phase 35 korjaa rakenteellisesti.

## Verification Results

```
grep -c "ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS business_managed" -> 1 OK
grep -c "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin" -> 1 OK
grep -c "INSERT INTO storage.buckets" -> 1 OK
grep -c "SECURITY DEFINER" -> 1 OK
grep -c "objects.name" -> 8 (>= 4 required) OK
npx vitest run -> 64/64 tests passed OK
```

## Self-Check: PASSED

- supabase/migrations/20260605000001_business_managed.sql: FOUND
- supabase/migrations/20260605000002_profiles_is_admin.sql: FOUND
- supabase/sql-editor/20260605_business_media_bucket.sql: FOUND
- Commit 3635d72 (Task 1): FOUND
- Commit dd57048 (Task 2): FOUND
- All 64 vitest tests: PASSED
