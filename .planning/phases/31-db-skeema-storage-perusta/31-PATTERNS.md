# Phase 31: DB-skeema & Storage-perusta - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 5 (4 new SQL files + 1 TypeScript edit)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20260605000000_business_accounts.sql` | migration | CRUD | `supabase/migrations/20260528083110_profiles.sql` | exact |
| `supabase/migrations/20260605000001_business_managed.sql` | migration | transform | `supabase/migrations/20260519000000_add_phase1_columns.sql` | exact |
| `supabase/migrations/20260605000002_profiles_is_admin.sql` | migration | transform | `supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql` | exact |
| `supabase/sql-editor/20260605_business_media_bucket.sql` | config | CRUD | `supabase/migrations/20260519000001_enable_rls.sql` (partial) | role-match |
| `app/api/admin/sync-paikat/route.ts` (EDIT) | route | request-response | self | exact |

---

## Pattern Assignments

### `supabase/migrations/20260605000000_business_accounts.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260528083110_profiles.sql` (primary) +
            `supabase/migrations/20260523_suosikit.sql` (junction table pattern) +
            `supabase/migrations/20260528_reviews.sql` (CHECK constraints)

**File header comment pattern** — copy from `20260528_reviews.sql` lines 1–3:
```sql
-- Create business_accounts table ...
-- Modeled after supabase/migrations/20260528083110_profiles.sql (user_id PK + RLS pattern)
--          and supabase/migrations/20260523_suosikit.sql (bigserial PK + UNIQUE pattern)
```

**UUID PRIMARY KEY FK chain** — copy from `20260528083110_profiles.sql` lines 1–6:
```sql
CREATE TABLE IF NOT EXISTS profiles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kotikaupunki text,
  updated_at  timestamptz DEFAULT now()
);
```
Apply same pattern for `business_accounts`: `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.

**RLS enable + SELECT/INSERT/UPDATE triple** — copy from `20260528083110_profiles.sql` lines 8–25 verbatim structure:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
Replace table name and policy label strings; keep the three-policy structure.

**CHECK constraint syntax** — copy from `20260528_reviews.sql` lines 8–13:
```sql
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  ...
  crowd_rating text CHECK (crowd_rating IN ('hiljaista', 'sopivasti', 'ruuhkaista')),
```
Apply same inline CHECK for `approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))`.

**BIGSERIAL PK + UNIQUE constraint** — copy from `20260523_suosikit.sql` lines 1–8:
```sql
CREATE TABLE IF NOT EXISTS suosikit (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id   bigint NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, paikka_id)
);
```
Apply same structure for `business_paikka_links`: swap `user_id` → `business_account_id UUID NOT NULL REFERENCES business_accounts(user_id)`, change UNIQUE to `UNIQUE(paikka_id)` per D-05.

**RLS for junction table (SELECT/INSERT/UPDATE)** — copy from `20260523_suosikit.sql` lines 10–27, replace `user_id` with `business_account_id`:
```sql
ALTER TABLE suosikit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own suosikit"
  ON suosikit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suosikit"
  ON suosikit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suosikit"
  ON suosikit FOR DELETE
  USING (auth.uid() = user_id);
```
Note: `business_paikka_links` needs UPDATE (not DELETE) per phase decisions — swap DELETE for UPDATE using the profiles pattern (`USING + WITH CHECK`).

---

### `supabase/migrations/20260605000001_business_managed.sql` (migration, transform)

**Analog:** `supabase/migrations/20260519000000_add_phase1_columns.sql`

**ADD COLUMN IF NOT EXISTS pattern** — `20260519000000_add_phase1_columns.sql` lines 1–4:
```sql
-- Phase 1: Foundation & Security (DATA-04, ADS-01)
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS hinta_kuvaus text;
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS aukioloajat jsonb;
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS lajit_lista jsonb;
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
```
Copy the single-line `ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS` pattern. Target table is `liikuntapaikat` (not `paikat` — the stale migration `20260530000000_add_image_url_to_paikat.sql` line 1 uses `ALTER TABLE paikat` which references a non-existent table; never copy that).

Apply for this file:
```sql
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS business_managed BOOLEAN NOT NULL DEFAULT false;
```

No new RLS policies needed — `20260519000001_enable_rls.sql` lines 3–7 already cover all columns of `liikuntapaikat` with `authenticated_update` and `public_read`.

---

### `supabase/migrations/20260605000002_profiles_is_admin.sql` (migration, transform)

**Analog:** `supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql`

**Single-column ADD + comment** — `20260531000000_profiles_add_kiinnostukset.sql` lines 1–6:
```sql
-- Add kiinnostukset (sport interests) column to profiles table.
-- text[] stores an array of sport keys (matching Object.keys(lajiKonfig) in lib/lajit.ts).
-- DEFAULT '{}' ensures existing rows return an empty array rather than NULL.
-- IF NOT EXISTS guard makes this migration idempotent on re-run.
-- No new RLS policies needed — the existing UPDATE policy already covers all columns.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kiinnostukset text[] DEFAULT '{}';
```
Copy this structure verbatim; adapt comment and column definition:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
```

Post-migration manual step (SQL editor, not in migration file):
```sql
UPDATE profiles
SET is_admin = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'joona.orava@gmail.com'
);
```

---

### `supabase/sql-editor/20260605_business_media_bucket.sql` (config, CRUD)

**Analog (partial):** `supabase/migrations/20260519000001_enable_rls.sql` — RLS policy syntax structure; no existing Storage analog exists in the codebase.

**Existing RLS policy syntax** — `20260519000001_enable_rls.sql` lines 3–7:
```sql
ALTER TABLE liikuntapaikat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON liikuntapaikat FOR SELECT USING (true);
CREATE POLICY "authenticated_insert" ON liikuntapaikat FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON liikuntapaikat FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON liikuntapaikat FOR DELETE TO authenticated USING (true);
```
The `TO authenticated` role scoping, `USING` / `WITH CHECK` structure, and four-operation coverage (SELECT / INSERT / UPDATE / DELETE) all carry over to `storage.objects` policies. Replace table reference with `ON storage.objects`.

**No existing Storage SQL in codebase** — use RESEARCH.md Pattern 4–6 as the primary source for:
- `INSERT INTO storage.buckets (id, name, public) VALUES ('business-media', 'business-media', true) ON CONFLICT (id) DO NOTHING;`
- `CREATE OR REPLACE FUNCTION storage.business_owns_paikka(...)` SECURITY DEFINER function
- `(storage.foldername(objects.name))[1]` path-segment syntax (always qualify `objects.name`, never bare `name`)
- Logo sub-path (`foldername[2] = 'logo'`) vs. paikka image sub-path (`foldername[2]::bigint`) branching in WITH CHECK
- Three write policies: INSERT, UPDATE (with USING + WITH CHECK), DELETE (with USING only)

**`lib/supabaseAdmin.server.ts`** — the service-role client (lines 1–8) is the execution context for any server-side Storage operations in later phases:
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

### `app/api/admin/sync-paikat/route.ts` (EDIT — route, request-response)

**Analog:** self (existing file at `app/api/admin/sync-paikat/route.ts`)

**Edit target** — insert pre-filter block after the deduplication loop and before `fetchPlaceDetails`. Current code (lines 138–154):
```typescript
  // Deduplicate by place_id — first occurrence wins (preserves the assigned laji)
  const seen = new Set<string>()
  const allResults: Array<PlacesResult & { assignedLaji: string }> = []
  for (const batch of queryResults) {
    for (const r of batch) {
      if (!seen.has(r.place_id)) {
        seen.add(r.place_id)
        allResults.push(r)
      }
    }
  }

  if (allResults.length === 0) {
    return NextResponse.json({ loydetty: 0, tallennettu: 0, website_loydetty: 0 })
  }

  // Fetch Place Details for all results in parallel
  const details = await Promise.all(allResults.map(p => fetchPlaceDetails(p.place_id)))
```

**`supabaseAdmin` import pattern** — line 2:
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
```
Already present; the new pre-filter block uses this same client.

**Insert after line 151 (after the `allResults.length === 0` early return), before the `fetchPlaceDetails` call:**
```typescript
  // Pre-filter: exclude venues managed by businesses (business_managed = true)
  // upsert() cannot be WHERE-filtered — must exclude in TypeScript before building rivit
  const { data: managedRows } = await supabaseAdmin
    .from('liikuntapaikat')
    .select('place_id')
    .eq('business_managed', true)

  const managedSet = new Set((managedRows ?? []).map(r => r.place_id))
  const syncResults = allResults.filter(r => !managedSet.has(r.place_id))

  if (syncResults.length === 0) {
    return NextResponse.json({ loydetty: allResults.length, tallennettu: 0, website_loydetty: 0 })
  }
```

Then replace all subsequent references to `allResults` (lines 154, 156, 169, 183) with `syncResults`:
- Line 154: `const details = await Promise.all(syncResults.map(p => fetchPlaceDetails(p.place_id)))`
- Line 156: `const rivit = syncResults.map((p, i) => ({`
- Line 169: `const websiteLoydetty = details.filter(d => d.website !== null).length`
- Line 183: `loydetty: allResults.length,` — keep `allResults.length` here (total found from Places API, pre-filter); `tallennettu` uses `syncResults`

---

## Shared Patterns

### RLS Enable + Three-Policy Block
**Source:** `supabase/migrations/20260528083110_profiles.sql` lines 8–25
**Apply to:** `business_accounts` migration, `business_paikka_links` section of same migration
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<label> reads own <table>"
  ON <table> FOR SELECT
  USING (auth.uid() = <owner_col>);

CREATE POLICY "<label> inserts own <table>"
  ON <table> FOR INSERT
  WITH CHECK (auth.uid() = <owner_col>);

CREATE POLICY "<label> updates own <table>"
  ON <table> FOR UPDATE
  USING (auth.uid() = <owner_col>)
  WITH CHECK (auth.uid() = <owner_col>);
```

### ADD COLUMN IF NOT EXISTS (idempotent)
**Source:** `supabase/migrations/20260519000000_add_phase1_columns.sql` lines 2–5
**Apply to:** `business_managed` migration, `is_admin` migration
```sql
ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type> <constraints>;
```

### Service-Role Client Import
**Source:** `lib/supabaseAdmin.server.ts` lines 1–8
**Apply to:** `sync-paikat/route.ts` edit (already imported; pattern for future phases using Storage)
```typescript
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
```

### CHECK Constraint (inline)
**Source:** `supabase/migrations/20260528_reviews.sql` lines 8, 13
**Apply to:** `approval_status` on `business_accounts`, `claim_status` and `link_type` on `business_paikka_links`
```sql
  <col> TEXT NOT NULL DEFAULT '<default>' CHECK (<col> IN ('<v1>', '<v2>', '<v3>')),
```

### `supabaseAdmin` CRUD Pattern (TypeScript)
**Source:** `app/api/admin/sync-paikat/route.ts` lines 171–174
**Apply to:** Pre-filter block in sync-paikat edit
```typescript
const { data: rows, error } = await supabaseAdmin
  .from('liikuntapaikat')
  .select('place_id')
  .eq('business_managed', true)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `supabase/sql-editor/20260605_business_media_bucket.sql` (Storage RLS portion) | config | CRUD | No existing Supabase Storage SQL in the codebase; `storage.objects` policies, `storage.foldername()` helper, and `SECURITY DEFINER` ownership function have no local analog — use RESEARCH.md Patterns 4–6 |

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `app/api/admin/`, `lib/`
**Files scanned:** 9 (7 migrations + sync route + supabaseAdmin.server.ts)
**Pattern extraction date:** 2026-06-05
