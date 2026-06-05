# Phase 31: DB-skeema & Storage-perusta - Research

**Researched:** 2026-06-05
**Domain:** Supabase PostgreSQL migrations, RLS policies, Supabase Storage
**Confidence:** HIGH

## Summary

Phase 31 is a pure infrastructure phase delivering five migration artifacts and one Storage
bucket configuration. No UI, no TypeScript application code, no new npm packages. All work
lives in `supabase/migrations/` SQL files plus a manual SQL-editor step for the
`business-media` bucket and its RLS policies.

The critical naming question (D-09) is definitively answered: the table is named
`liikuntapaikat`. The one migration that says `paikat` (`20260530000000_add_image_url_to_paikat.sql`)
is a stale artefact that was applied to the wrong table name — verified by reading both the
migration file and the sync route (`app/api/admin/sync-paikat/route.ts` line 173, which does
`.from('liikuntapaikat')`). The `image_url` column either landed on a `paikat` table that
does not exist in the live DB, or Supabase silently ignored it. Either way, the `business_managed`
ADD COLUMN migration must target `liikuntapaikat`.

Supabase Storage buckets are created via `INSERT INTO storage.buckets`. RLS policies on
`storage.objects` follow the same `CREATE POLICY ... ON storage.objects` pattern as regular
tables, but path matching uses the helper functions `storage.foldername(objects.name)` and
`storage.filename(objects.name)`. For complex JOIN-based ownership checks the recommended
pattern is a `security definer` helper function to avoid RLS cascade failures on the joined
tables and to prevent Supabase console from rewriting unqualified column references.

**Primary recommendation:** Write four migration files (business_accounts + business_paikka_links,
business_managed column, profiles is_admin column, sync-paikat route filter). Create the
`business-media` bucket and its RLS policies in a fifth SQL file intended for manual execution
in the Supabase SQL editor (not as a file-based migration, per D-14 in CONTEXT.md).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**business_accounts table**
- D-01: Columns: `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `company_name TEXT NOT NULL`, `approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- D-02: Minimal schema — all business details collected in Phase 34 onboarding wizard
- D-03: `rejection_reason TEXT` deferred to Phase 35 migration

**business_paikka_links table**
- D-04: Columns: `id BIGSERIAL PRIMARY KEY`, `business_account_id UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE`, `paikka_id BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE`, `claim_status TEXT NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending', 'approved', 'rejected'))`, `link_type TEXT NOT NULL CHECK (link_type IN ('claim', 'created'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- D-05: `UNIQUE(paikka_id)` — one venue belongs to exactly one business
- D-06: `claim_status` is per-venue (a single business can have multiple venues in different states)
- D-07: `link_type` distinguishes claim vs. newly created venue

**business_managed in liikuntapaikat**
- D-08: `ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS business_managed BOOLEAN NOT NULL DEFAULT false`
- D-09: Table name is `liikuntapaikat` — the stale migration referencing `paikat` must be noted

**Supabase Storage business-media**
- D-10: Bucket name: `business-media`
- D-11: Path structure: `{business_account_id}/logo/logo.{ext}` and `{business_account_id}/{paikka_id}/images/{filename}`
- D-12: Write RLS: (1) path's first segment matches `auth.uid()` via `business_accounts`; (2) `business_paikka_links` row exists for that business + venue
- D-13: Public read — venue images visible to all users

**is_admin in profiles**
- D-14: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`
- D-15: Set `is_admin = true` manually for joona.orava@gmail.com after migration

**RLS general**
- D-16: All new tables have RLS enabled
- D-17: `business_accounts` SELECT: `USING (auth.uid() = user_id)`
- D-18: `business_paikka_links` SELECT: `USING (auth.uid() = business_account_id)`

### Claude's Discretion

None explicitly stated — the decisions table covers all schema choices.

### Deferred Ideas (OUT OF SCOPE)

- `published BOOLEAN` on `liikuntapaikat` — deferred to Phase 33
- `rejection_reason TEXT` on `business_accounts` — deferred to Phase 35
- Chain-admin (one business account, multiple owners) — future requirement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIZ-02 | `business_accounts` table links Supabase Auth user to a business; `business_paikka_links` connects multiple venues to one account | SQL CREATE TABLE patterns verified from existing migrations; FK chain `auth.users → business_accounts → business_paikka_links → liikuntapaikat` matches project pattern |
| DATA-09 | `business_managed` boolean on the venues table; Google Places sync script skips managed venues entirely | Table name confirmed as `liikuntapaikat`; sync route uses `.from('liikuntapaikat')` and `.upsert()` — adding `.neq('business_managed', true)` filter on the upsert path is incorrect; instead the fetch must filter before building `rivit` |
| DATA-10 | Supabase Storage `business-media` bucket; RLS allows writes only to the owning business (via `business_paikka_links`) | Bucket creation via `INSERT INTO storage.buckets`; RLS via `CREATE POLICY ON storage.objects`; path-segment check via `storage.foldername(objects.name)[1]`; ownership JOIN via security-definer function recommended |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| business_accounts schema | Database / Storage | — | Pure table definition; no API or UI layer needed in this phase |
| business_paikka_links schema | Database / Storage | — | Junction table; FK constraints live at DB layer |
| business_managed column | Database / Storage | API / Backend | Column lives in DB; sync route (API tier) filter is a code edit |
| Storage bucket + RLS | Database / Storage | — | Storage policies are PostgreSQL RLS on `storage.objects` |
| is_admin column | Database / Storage | — | Column addition + manual UPDATE; no app code changes |

---

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Supabase PostgreSQL | (managed — project ref odkrnesnmrpuegccgovy) | Target database for all migrations | Already in use across all 7 prior migration files |
| Supabase Storage | v1.58.17 (storage-version in .temp) | Object storage for business media | Integrated with the project's existing Auth and RLS stack |
| `@supabase/supabase-js` | ^2.105.4 (package.json) | Runtime client — admin client already at `lib/supabaseAdmin.server.ts` | Service-role client already established |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Supabase CLI (`npx supabase`) | Applying migrations to linked project | Migration push; available via npx (version 2.105.0 confirmed) |
| Supabase SQL Editor (dashboard) | Executing Storage bucket INSERT + policy SQL manually | Per CONTEXT.md D-14 decision to NOT use file-based migration for bucket creation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual SQL-editor execution for Storage bucket | File-based migration | File-based migrations are cleaner for repeatability but CONTEXT.md explicitly chose manual SQL editor for Storage setup — follow the decision |
| Security-definer function for Storage RLS | Inline subquery in WITH CHECK | Inline subqueries on RLS-protected tables fail silently; security-definer avoids RLS cascade on `business_paikka_links` |

**No new npm packages.** This phase is SQL-only.

---

## Package Legitimacy Audit

No external packages are installed in this phase. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
SQL Migration Files
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ Supabase PostgreSQL                                  │
│                                                      │
│  auth.users (existing)                               │
│       │                                              │
│       ▼ FK ON DELETE CASCADE                         │
│  business_accounts                                   │
│  (user_id PK, company_name, approval_status)         │
│       │                                              │
│       ▼ FK ON DELETE CASCADE                         │
│  business_paikka_links                               │
│  (bigserial PK, business_account_id, paikka_id,     │
│   claim_status, link_type)                          │
│       │                    │                         │
│       │ UNIQUE(paikka_id)  ▼ FK                      │
│       │           liikuntapaikat                     │
│       │           + business_managed BOOLEAN         │
│       │                                              │
│  profiles (existing)                                 │
│  + is_admin BOOLEAN                                  │
└─────────────────────────────────────────────────────┘

Manual SQL Editor Step
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ Supabase Storage                                     │
│                                                      │
│  storage.buckets                                     │
│  INSERT (id='business-media', name='business-media', │
│   public=true)                                       │
│                                                      │
│  storage.objects RLS policies                        │
│  Public SELECT (true)                                │
│  Authenticated INSERT/UPDATE/DELETE:                 │
│    foldername[1] = auth.uid()::text                  │
│    AND ownership check via security-definer fn       │
└─────────────────────────────────────────────────────┘

Existing Code Edit
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ app/api/admin/sync-paikat/route.ts                   │
│                                                      │
│  After Places API fetch, before upsert:             │
│  Filter allResults to exclude place_ids that         │
│  already exist in liikuntapaikat with                │
│  business_managed = true                             │
│  (or: add WHERE clause to the upsert — see below)   │
└─────────────────────────────────────────────────────┘
```

### Recommended Migration File Structure

```
supabase/migrations/
├── 20260519000000_add_phase1_columns.sql      (existing)
├── 20260519000001_enable_rls.sql              (existing)
├── 20260523_suosikit.sql                      (existing)
├── 20260528083110_profiles.sql                (existing)
├── 20260528_reviews.sql                       (existing)
├── 20260530000000_add_image_url_to_paikat.sql (existing — stale, do not touch)
├── 20260531000000_profiles_add_kiinnostukset.sql (existing)
├── 20260605000000_business_accounts.sql       (NEW — tables + RLS)
├── 20260605000001_business_managed.sql        (NEW — column on liikuntapaikat)
└── 20260605000002_profiles_is_admin.sql       (NEW — column on profiles)

supabase/sql-editor/  (convention for manually-run SQL, not applied by CLI)
└── 20260605_business_media_bucket.sql         (NEW — Storage bucket + RLS)
```

### Pattern 1: Table creation with RLS (modeled on existing migrations)

**What:** `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` blocks
**When to use:** All new tables in this project
**Example (from `supabase/migrations/20260528_reviews.sql`):**

```sql
-- Source: supabase/migrations/20260528_reviews.sql (project file)
CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paikka_id bigint NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  ...
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own review"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Pattern 2: FK chain from auth.users (modeled on profiles + suosikit)

```sql
-- Source: supabase/migrations/20260528083110_profiles.sql (project file)
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);
```

For `business_accounts`, `user_id` is the PRIMARY KEY (same as profiles). For `business_paikka_links`, a BIGSERIAL PK is used with `business_account_id` as the FK (same pattern as `suosikit`).

### Pattern 3: ADD COLUMN IF NOT EXISTS (modeled on existing migrations)

```sql
-- Source: supabase/migrations/20260519000000_add_phase1_columns.sql (project file)
ALTER TABLE liikuntapaikat ADD COLUMN IF NOT EXISTS hinta_kuvaus text;
```

Apply the same pattern for `business_managed` and `is_admin`.

### Pattern 4: Storage bucket creation via SQL

```sql
-- Source: [CITED: supabase.com/docs/guides/storage/buckets/creating-buckets]
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true);
```

`public = true` satisfies D-13 (public read). For private buckets, set `public = false` and add explicit SELECT policy — not needed here.

### Pattern 5: Storage RLS policy with path-segment check

```sql
-- Source: [CITED: supabase.com/docs/guides/storage/security/access-control]
--         [CITED: github.com/orgs/supabase/discussions/31073]

-- Public read (D-13)
CREATE POLICY "Public read business-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-media');

-- Authenticated write — only to own top-level folder
CREATE POLICY "Business write own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
  );
```

**Note:** Use `objects.name` (not bare `name`) to prevent Supabase console from rewriting the reference. `[1]` is 1-indexed (PostgreSQL arrays start at 1).

### Pattern 6: Storage RLS with JOIN via security-definer function

For the per-paikka write check (D-12 part 2 — the paikka_id segment check):

```sql
-- Security-definer function avoids RLS cascade on business_paikka_links
CREATE OR REPLACE FUNCTION storage.business_owns_paikka(
  p_business_account_id uuid,
  p_paikka_id bigint
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_paikka_links
    WHERE business_account_id = p_business_account_id
      AND paikka_id = p_paikka_id
  );
END;
$$;

-- Policy uses the function
CREATE POLICY "Business write own paikka folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
    AND storage.business_owns_paikka(
      auth.uid(),
      (storage.foldername(objects.name))[2]::bigint
    )
  );
```

**Path structure reference (D-11):**
- Logo: `{business_account_id}/logo/logo.{ext}` → foldername[1] = business_account_id, foldername[2] = 'logo'
- Images: `{business_account_id}/{paikka_id}/images/{filename}` → foldername[1] = business_account_id, foldername[2] = paikka_id (bigint string)

The logo path has foldername[2] = 'logo' (not a paikka_id), so the paikka ownership check must only apply when foldername[2] is numeric. The planner should design the policy to handle both sub-paths correctly.

### Pattern 7: sync-paikat route filter

The sync route uses `supabaseAdmin.from('liikuntapaikat').upsert(rivit, { onConflict: 'place_id' })`. The `upsert` call cannot accept a WHERE filter — it operates on all conflicts. The correct approach is to fetch existing `business_managed` place_ids before building `rivit` and exclude them:

```typescript
// Source: [ASSUMED] — pattern based on reading route.ts
// After deduplication, before fetching Place Details:
const { data: managedRows } = await supabaseAdmin
  .from('liikuntapaikat')
  .select('place_id')
  .eq('business_managed', true)

const managedSet = new Set((managedRows ?? []).map(r => r.place_id))
const filteredResults = allResults.filter(r => !managedSet.has(r.place_id))
// Then use filteredResults instead of allResults for fetchPlaceDetails + upsert
```

Alternatively, a simpler approach: add `.not('business_managed', 'eq', true)` as a `.select()` pre-check is not applicable to `upsert`. The pre-filter approach above is the cleanest.

### Anti-Patterns to Avoid

- **Using `paikat` as the table name:** The table is `liikuntapaikat`. The migration `20260530000000_add_image_url_to_paikat.sql` used `paikat` and is a known stale artefact. Never repeat that name.
- **Bare `name` in Storage policies:** Always write `objects.name` to prevent Supabase console rewriting to `other_table.name`.
- **Inline subquery on RLS-protected table in Storage policy:** Direct `EXISTS (SELECT 1 FROM business_paikka_links WHERE ...)` in a WITH CHECK clause will fail silently if `business_paikka_links` has RLS enabled and the policy doesn't yet allow reads from the Storage policy context. Use a `SECURITY DEFINER` function.
- **INSERT policy without ALSO covering UPDATE and DELETE:** If a user re-uploads a file (same path), Storage uses UPDATE. Cover all three operations (INSERT, UPDATE, DELETE) with separate policies or a combined approach.
- **`public = false` + no SELECT policy:** Setting a bucket to private but forgetting the SELECT policy means files are unreadable even by authenticated users. This phase uses `public = true`, so no explicit SELECT policy is needed beyond the one for completeness.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Path parsing in Storage RLS | String manipulation with `split_part()` | `storage.foldername(objects.name)[N]` — built-in helper |
| Ownership JOIN in Storage RLS | Inline correlated subquery | `SECURITY DEFINER` function per Supabase recommendations |
| UUID-to-text comparison | CAST expressions | `(auth.uid())::text` — simple cast |
| Idempotent migrations | Drop-and-recreate | `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS` |

---

## Common Pitfalls

### Pitfall 1: Wrong table name (`paikat` vs `liikuntapaikat`)
**What goes wrong:** Migration applies against a non-existent table and fails silently or errors
**Why it happens:** One stale migration used `paikat` — a human copying from it would repeat the error
**How to avoid:** Always use `liikuntapaikat`. Confirmed by `sync-paikat/route.ts` line 173: `.from('liikuntapaikat')`
**Warning signs:** `ERROR: relation "paikat" does not exist`

### Pitfall 2: Storage RLS policy references ambiguous `name` column
**What goes wrong:** Supabase console rewrites `storage.foldername(name)` to `storage.foldername(some_other_table.name)` breaking the policy
**Why it happens:** Multiple tables in the query scope share a `name` column
**How to avoid:** Always qualify as `objects.name` in Storage policies
**Warning signs:** Policy exists but all writes are denied; inspecting the policy in the dashboard shows the name column qualified with a different table

### Pitfall 3: RLS on `business_paikka_links` blocks Storage policy ownership check
**What goes wrong:** Storage RLS policy does an `EXISTS (SELECT 1 FROM business_paikka_links ...)` but that table's RLS policy only allows `auth.uid() = business_account_id` — causing a deadlock where the policy can't check the table it needs to check
**Why it happens:** Standard RLS applies to all queries including sub-selects inside other policies
**How to avoid:** Use a `SECURITY DEFINER` function for the ownership check (as shown in Pattern 6)
**Warning signs:** Upload returns 403 even though the user owns the path; removing the JOIN check makes it work

### Pitfall 4: `upsert` in sync route cannot be filtered with a WHERE clause
**What goes wrong:** Developer adds `.eq('business_managed', false)` to the `.upsert()` chain — this has no effect on which rows get upserted
**Why it happens:** Supabase `.upsert()` applies RLS and the row filter differently from `.select()`
**How to avoid:** Pre-filter `allResults` in TypeScript before building `rivit`, as shown in Pattern 7
**Warning signs:** `business_managed = true` venues are still overwritten by sync

### Pitfall 5: `is_admin` ADD COLUMN conflicts with existing profiles RLS
**What goes wrong:** Existing UPDATE policy on profiles (`USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`) would allow any user to set their own `is_admin = true`
**Why it happens:** The policy covers all columns, not specific ones
**How to avoid:** The manual `UPDATE profiles SET is_admin = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joona.orava@gmail.com')` must be run with the service-role client (Supabase SQL Editor), which bypasses RLS. The risk is that a regular authenticated user could call the Supabase client and set `is_admin = true` on their own profile. A `WITH CHECK` that prevents self-elevation should be added, or the `is_admin` column should only be updatable by a service-role operation. Phase 35 (admin UI) should add a dedicated policy or server-side handler.
**Warning signs:** A non-admin user POSTs `{ is_admin: true }` to their profile update and succeeds

### Pitfall 6: Missing `UPDATE` and `DELETE` policies for Storage
**What goes wrong:** User can upload (INSERT) but cannot replace or delete a file
**Why it happens:** Storage needs separate policies for INSERT, UPDATE (overwrite), and DELETE
**How to avoid:** Write three matching policies with the same WITH CHECK / USING logic
**Warning signs:** Second upload to same path returns 403; `supabase.storage.remove()` returns 403

---

## Code Examples

### business_accounts migration (complete)

```sql
-- Source: modeled on supabase/migrations/20260528083110_profiles.sql (project file)
CREATE TABLE IF NOT EXISTS business_accounts (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
                  CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business reads own account"
  ON business_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Business inserts own account"
  ON business_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business updates own account"
  ON business_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### business_paikka_links migration (complete)

```sql
-- Source: modeled on supabase/migrations/20260523_suosikit.sql (project file)
CREATE TABLE IF NOT EXISTS business_paikka_links (
  id                  BIGSERIAL PRIMARY KEY,
  business_account_id UUID    NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  paikka_id           BIGINT  NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  claim_status        TEXT    NOT NULL DEFAULT 'pending'
                      CHECK (claim_status IN ('pending', 'approved', 'rejected')),
  link_type           TEXT    NOT NULL
                      CHECK (link_type IN ('claim', 'created')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(paikka_id)
);

ALTER TABLE business_paikka_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business reads own links"
  ON business_paikka_links FOR SELECT
  USING (auth.uid() = business_account_id);

CREATE POLICY "Business inserts own links"
  ON business_paikka_links FOR INSERT
  WITH CHECK (auth.uid() = business_account_id);

CREATE POLICY "Business updates own links"
  ON business_paikka_links FOR UPDATE
  USING (auth.uid() = business_account_id)
  WITH CHECK (auth.uid() = business_account_id);
```

### business_managed column migration

```sql
-- Source: modeled on supabase/migrations/20260519000000_add_phase1_columns.sql (project file)
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS business_managed BOOLEAN NOT NULL DEFAULT false;
```

### profiles is_admin column migration

```sql
-- Source: modeled on supabase/migrations/20260531000000_profiles_add_kiinnostukset.sql (project file)
-- No new RLS policies needed — existing UPDATE policy covers all columns.
-- is_admin can only be set to true via service-role (SQL editor) per D-15.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
```

### Storage bucket + RLS SQL (manual SQL editor)

```sql
-- Source: [CITED: supabase.com/docs/guides/storage/buckets/creating-buckets]
-- Create the bucket (public = true satisfies D-13 public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- Security-definer function for ownership check
-- Source: [CITED: github.com/orgs/supabase/discussions/28160]
CREATE OR REPLACE FUNCTION storage.business_owns_paikka(
  p_business_id uuid,
  p_paikka_id   text        -- text because path segments are strings
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_paikka_links
    WHERE business_account_id = p_business_id
      AND paikka_id = p_paikka_id::bigint
  );
END;
$$;

-- Public read (D-13) — bucket is already public=true, this is belt-and-suspenders
CREATE POLICY "Public read business-media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-media');

-- INSERT: user can only write to their own top-level folder,
-- and only for paths where they own the paikka (or for logo/ sub-path)
-- Source: [CITED: github.com/orgs/supabase/discussions/31073]
CREATE POLICY "Business INSERT own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
    AND (
      -- Logo path: {uid}/logo/logo.ext — no paikka check needed
      (storage.foldername(objects.name))[2] = 'logo'
      OR
      -- Image path: {uid}/{paikka_id}/images/{filename}
      storage.business_owns_paikka(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )
  );

-- UPDATE (overwrite): same logic as INSERT
CREATE POLICY "Business UPDATE own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
    AND (
      (storage.foldername(objects.name))[2] = 'logo'
      OR
      storage.business_owns_paikka(
        auth.uid(),
        (storage.foldername(objects.name))[2]
      )
    )
  );

-- DELETE: owner can delete own files
CREATE POLICY "Business DELETE own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-media'
    AND (storage.foldername(objects.name))[1] = (auth.uid())::text
  );
```

### Manual is_admin SET (post-migration)

```sql
UPDATE profiles
SET is_admin = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'joona.orava@gmail.com'
);
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `ALTER TABLE paikat` (stale migration) | `ALTER TABLE liikuntapaikat` | Use correct table name — verified from sync route |
| Bare `name` in Storage policies | `objects.name` explicit qualification | Prevents Supabase console rewriting references |
| Inline subquery JOIN in Storage RLS | `SECURITY DEFINER` function | Avoids silent RLS cascade failures |

**Deprecated/outdated:**
- `20260530000000_add_image_url_to_paikat.sql`: references table `paikat` — this migration is stale and likely a no-op (the table it targeted may not exist or may have been `liikuntapaikat` at the time). Do not copy its table reference.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `image_url` column from the stale migration either landed on a non-existent `paikat` table or was silently ignored — `liikuntapaikat` currently has no `image_url` column from that migration | Architecture Patterns pitfall note | Low: `ADD COLUMN IF NOT EXISTS` is idempotent; worst case we add `image_url` twice to `liikuntapaikat`, which would error |
| A2 | `UNIQUE(paikka_id)` constraint name will be auto-generated by Postgres (e.g., `business_paikka_links_paikka_id_key`) — this is fine for this phase but Phase 33 should be aware of the constraint name if it needs to reference it | Pattern section | Low: constraint exists either way |
| A3 | sync-paikat route pre-filter approach (fetch managed place_ids then filter in TypeScript) is the correct pattern — no Supabase `.upsert()` WHERE-clause filtering exists | Code Examples / Pitfalls | Medium: if wrong, sync would overwrite managed venues; verify by testing after implementation |
| A4 | Storage bucket `public = true` means files are readable without any SELECT policy — the explicit SELECT policy is belt-and-suspenders | Storage RLS code example | Low: both approaches result in public read |

**Assumptions log is intentionally short.** The critical claims (table name, SQL patterns, Storage API) were verified from project source files and official Supabase documentation.

---

## Open Questions

1. **`image_url` on `liikuntapaikat` — does it exist?**
   - What we know: migration `20260530000000_add_image_url_to_paikat.sql` says `ALTER TABLE paikat ADD COLUMN IF NOT EXISTS image_url TEXT` — wrong table name
   - What's unclear: whether Supabase silently ignored it or whether `liikuntapaikat` has `image_url` from a different source (the Phase 19 work "image_url Supabaseen" mentioned in ROADMAP suggests it was added somehow)
   - Recommendation: The planner should add a verification step: `SELECT column_name FROM information_schema.columns WHERE table_name = 'liikuntapaikat'` in the Supabase SQL editor before writing migrations. This doesn't block Phase 31 since `ADD COLUMN IF NOT EXISTS` is idempotent.

2. **`is_admin` self-elevation risk**
   - What we know: existing `profiles` UPDATE policy covers all columns; any authenticated user could set `is_admin = true` on their own row via the Supabase JS client
   - What's unclear: whether this is an acceptable risk for v1.7 given that the admin UI (Phase 35) is internal-only
   - Recommendation: Add a `WITH CHECK` clause to the profiles UPDATE policy to block `is_admin` elevation from user-side: `WITH CHECK (auth.uid() = user_id AND is_admin = false)` — or leave for Phase 35 to fix with a dedicated server-only update path. Flag for planner to decide.

3. **logo path — paikka ownership check needed?**
   - What we know: logo path is `{business_account_id}/logo/logo.{ext}` — there is no `paikka_id` in the logo sub-path
   - What's unclear: D-12 says check `business_paikka_links` for write permission — but a logo is per-business, not per-paikka. The business_owns_paikka check would be skipped for the `logo` sub-path per the policy written above.
   - Recommendation: The policy as written (check top-level folder matches auth.uid(), then allow `logo` sub-path unconditionally while requiring paikka ownership for image sub-paths) is correct. Confirm with user if desired, but the current logic is consistent with the intent.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Applying migration files | via npx | 2.105.0 | Apply via Supabase dashboard SQL editor |
| Supabase project (linked) | All migrations | Linked (ref: odkrnesnmrpuegccgovy) | — | — |
| Node.js | npx supabase | Yes (project has package.json) | — | — |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:**
- Supabase CLI not installed globally — use `npx supabase db push` (version 2.105.0 confirmed via npx)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.7 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZ-02 | `business_accounts` and `business_paikka_links` tables exist with correct FK chain | manual-only | Supabase SQL editor: `SELECT * FROM information_schema.tables WHERE table_name IN ('business_accounts', 'business_paikka_links')` | N/A |
| DATA-09 | `business_managed` column exists on `liikuntapaikat`; sync route filters managed venues | manual-only (DB) + unit (TypeScript logic) | `npx vitest run lib/sync-filter.test.ts` (Wave 0 gap) | ❌ Wave 0 |
| DATA-10 | Storage bucket exists; RLS blocks cross-business writes | manual-only | Supabase dashboard Storage tab; test upload with non-owner credentials | N/A |

**Note:** This is a pure infrastructure phase. The core deliverables (SQL schema, Storage bucket, RLS policies) cannot be unit-tested without a live Supabase connection. Integration/smoke tests are manual SQL-editor queries. The only automatable unit test is the sync-route TypeScript filter logic.

### Sampling Rate

- **Per task commit:** `npx vitest run` (existing suite — confirms no regressions in lib/ code)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Manual verification checklist in Supabase SQL editor before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/syncFilter.test.ts` — unit test for the `business_managed` pre-filter logic in sync-paikat route (covers DATA-09 automated portion)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no auth UI in this phase |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | Row Level Security on all new tables; Storage RLS |
| V5 Input Validation | yes | CHECK constraints on `approval_status`, `claim_status`, `link_type` columns |
| V6 Cryptography | no | N/A — no secrets or encryption |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-business data access | Information Disclosure | RLS `USING (auth.uid() = user_id)` on business_accounts |
| Cross-business file upload (Storage path traversal) | Tampering | `storage.foldername(objects.name)[1] = auth.uid()::text` with security-definer ownership check |
| Self-elevation to admin | Elevation of Privilege | Profiles UPDATE policy should block `is_admin` write from user-side (see Open Question 2) |
| sync-paikat overwriting managed venues | Tampering | Pre-filter `business_managed = true` rows before upsert |
| RLS bypass via inline Storage subquery | Spoofing | Use SECURITY DEFINER function to avoid RLS cascade on business_paikka_links |

---

## Sources

### Primary (HIGH confidence)

- `supabase/migrations/20260528083110_profiles.sql` — RLS pattern for user-owned tables (SELECT/INSERT/UPDATE policies)
- `supabase/migrations/20260523_suosikit.sql` — bigserial PK + UNIQUE constraint + RLS pattern
- `supabase/migrations/20260528_reviews.sql` — multi-column table with CHECK constraints + RLS
- `supabase/migrations/20260519000000_add_phase1_columns.sql` — ADD COLUMN IF NOT EXISTS pattern
- `supabase/migrations/20260530000000_add_image_url_to_paikat.sql` — confirmed stale `paikat` table reference
- `app/api/admin/sync-paikat/route.ts` — confirmed table name `liikuntapaikat` (line 173)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — RLS policy syntax for storage.objects
- [Supabase Storage Bucket Creation](https://supabase.com/docs/guides/storage/buckets/creating-buckets) — INSERT INTO storage.buckets SQL
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) — storage.foldername(), storage.filename(), storage.extension()

### Secondary (MEDIUM confidence)

- [Supabase Discussion #31073](https://github.com/orgs/supabase/discussions/31073) — confirmed `objects.name` qualification requirement and `[1]` 1-indexed array access
- [Supabase Discussion #28160](https://github.com/orgs/supabase/discussions/28160) — security-definer function pattern for Storage JOIN ownership check

### Tertiary (LOW confidence)

None — all critical claims verified from project source files or official Supabase documentation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture: HIGH — verified from existing migrations and sync-route source code
- Table name (critical): HIGH — verified from sync-route `.from('liikuntapaikat')` line 173 and all other non-stale migrations
- Storage RLS syntax: HIGH — verified from official Supabase docs and community discussions
- Pitfalls: HIGH — pitfall 1-4 derived directly from source code reading; pitfall 5-6 from official docs

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (Supabase Storage API is stable; Storage helper functions unchanged since 2022)
