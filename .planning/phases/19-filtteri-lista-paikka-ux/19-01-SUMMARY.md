---
plan: "19-01"
phase: 19-filtteri-lista-paikka-ux
status: completed
completed_at: "2026-05-30"
---

# Plan 19-01 Summary — image_url type + migration

## What was done

- Added `image_url?: string | null` as the last field in the `Liikuntapaikka` type in `lib/types.ts`
- Created `supabase/migrations/20260530000000_add_image_url_to_paikat.sql` with `ALTER TABLE paikat ADD COLUMN IF NOT EXISTS image_url TEXT`

## Verification

- `npx tsc --noEmit` exits 0
- `grep "image_url" lib/types.ts` returns `image_url?: string | null`
- Migration file exists with correct ADD COLUMN statement
- No RLS policy changes made
