---
phase: 22-profiili-ai-kiinnostukset
plan: "01"
subsystem: data-layer
tags: [supabase, migration, lib, ai-context, typescript]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql
    - lib/buildKiinnostuksetKonteksti.ts
  affects:
    - app/api/saasuositus/route.ts (Plan 03 — imports buildKiinnostuksetKonteksti)
    - app/profiili/ProfiiliClient.tsx (Plan 02 — reads kiinnostukset column)
tech_stack:
  added: []
  patterns:
    - Idempotent SQL migration with IF NOT EXISTS guard
    - Leading-space prompt context builder (matching buildReissuKonteksti pattern)
key_files:
  created:
    - supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql
    - lib/buildKiinnostuksetKonteksti.ts
  modified: []
decisions:
  - "Sport keys used as-is in prompt (no label lookup) — AI understands Finnish sport names directly (D-09)"
  - "text[] DEFAULT '{}' — empty array default avoids NULL handling in downstream code"
  - "No new RLS policies — existing UPDATE policy covers all columns (D-07)"
metrics:
  duration: "~3 min"
  completed: "2026-05-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 22 Plan 01: Kiinnostukset-migraatio & buildKiinnostuksetKonteksti Summary

**One-liner:** SQL migration adds `kiinnostukset text[]` column to profiles table; new lib helper converts sport key array to Finnish AI prompt context sentence matching buildReissuKonteksti pattern.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Supabase migration — ADD COLUMN kiinnostukset | 00ac126 | supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql |
| 2 | Create lib/buildKiinnostuksetKonteksti.ts | 2f0fe1a | lib/buildKiinnostuksetKonteksti.ts |

## What Was Built

### Task 1 — Supabase Migration

`supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql` adds a single DDL statement to extend the `profiles` table with a `kiinnostukset text[]` column defaulting to an empty array. The `IF NOT EXISTS` guard makes the migration idempotent. No RLS changes were needed — the existing UPDATE policy in `20260528083110_profiles.sql` covers all columns.

### Task 2 — buildKiinnostuksetKonteksti

`lib/buildKiinnostuksetKonteksti.ts` exports a single named function with the signature:

```typescript
buildKiinnostuksetKonteksti(kiinnostukset: string[] | undefined | null): string
```

Behavior:
- Returns `''` for `undefined`, `null`, or empty array
- Returns ` Käyttäjä on kiinnostunut lajeista: padel, tennis.` for `['padel', 'tennis']` (leading space, comma-separated, period at end)
- Follows the exact same leading-space convention as `buildReissuKonteksti` so callers can append directly to the prompt string

Type-checked cleanly with `tsc --noEmit --strict`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both files are complete implementations. The lib function has no placeholder logic; the migration has the exact required DDL.

## Threat Flags

No new security-relevant surface introduced. The migration adds a data column (no auth path, no network endpoint). Input sanitization for `kiinnostukset` values is handled at the route.ts ingress layer (Plan 03, T-22-01 accepted).

## Self-Check: PASSED

- [x] `supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql` exists — FOUND
- [x] Contains `ADD COLUMN IF NOT EXISTS kiinnostukset text[] DEFAULT '{}'` — grep count: 1
- [x] Contains no `CREATE POLICY` statements — count: 0
- [x] `lib/buildKiinnostuksetKonteksti.ts` exists — FOUND
- [x] Exports `buildKiinnostuksetKonteksti` — grep count: 1
- [x] `tsc --noEmit --strict` passes — exit 0
- [x] Commit 00ac126 exists — feat(22-01): add kiinnostukset text[] column migration
- [x] Commit 2f0fe1a exists — feat(22-01): add buildKiinnostuksetKonteksti lib helper
