---
phase: 03-data-enrichment
plan: 02
status: complete
completed: 2026-05-21
requirements_delivered:
  - DATA-03
---

# Summary — Plan 03-02: Pricing Seed Script

## What was done

Created `scripts/seed-hinnat.ts` — a runnable TypeScript script that populates `hinta_kuvaus` for the top 20 Tampere sports venues.

**Implementation details:**
- Uses inline `.env.local` loader (no dotenv dependency needed)
- Creates Supabase admin client directly from env vars (no Next.js `@/` path aliases)
- `HINNAT` array: 20 venue patterns with realistic Finnish pricing strings
- Each venue matched via `ilike` (case-insensitive partial name match) on `nimi` column
- Reports `✓ VenueName — "price"` per match, `EI LÖYDY` per miss
- Idempotent — safe to re-run; updates existing rows with same value

## Usage

After the DB is populated via the sync endpoint (Plan 03-01):
```
npx tsx scripts/seed-hinnat.ts
```

## Verification
- `scripts/seed-hinnat.ts` exists with 20 entries in HINNAT
- No `@/` path aliases — runs outside Next.js
- `npx tsc --noEmit` exits 0
