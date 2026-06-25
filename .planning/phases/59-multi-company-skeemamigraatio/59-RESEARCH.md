# Phase 59: Multi-company-skeemamigraatio - Research

**Researched:** 2026-06-25
**Domain:** Supabase/Postgres schema migration — multi-tenant company entity, RLS rewrite, live production data backfill
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Backup & rollback mechanism**
- D-01: Backup = Supabase PITR (point-in-time recovery), already enabled at the platform level. No separate `pg_dump`/snapshot-table artifact is required.
- D-02: Verification = run the full migration against a staging/local Supabase copy first. Confirm all 4 ROADMAP success criteria pass there before running against production.
- D-03: Rollback = no custom down-migration script. If production breaks despite a clean staging dry-run, restore via Supabase PITR to the pre-migration timestamp.
- D-04 (reconciliation): PITR satisfies "backup taken," staging dry-run satisfies "rollback mechanism verified." Do NOT introduce additional backup tooling (pg_dump, manual snapshot tables) — explicitly rejected in favor of PITR + staging-dry-run.

**Companies table shape & data ownership**
- D-05: `companies.name` is the single source of truth. `business_accounts.company_name` is dropped entirely (no denormalized copy) — app code reading it must be updated to join through `company_id`.
- D-06: `companies` table is minimal: `id`, `name`, `created_at`. Branding/contact fields stay on `business_accounts`/`business_paikka_links` — out of scope.
- D-07: `business_accounts` keeps its existing PK (`user_id`) unchanged. Add `company_id` (FK to `companies.id`) and `role` (`'owner' | 'member'`, CHECK constraint).

**Migration mechanics for existing accounts**
- D-08: Each existing `business_accounts` row gets its own new `companies` row via `INSERT INTO companies(name) SELECT company_name FROM business_accounts` — verbatim copy, no dedup.
- D-09: Every `business_accounts` row gets `role = 'owner'` regardless of `approval_status` (pending/approved/rejected all included).
- D-10: Empty/placeholder `company_name` values — research question, not pre-empted. Default: migrate as-is per D-08 unless a large count is found.

**current_company_id() RLS helper & regression verification**
- D-11: Implement as `SECURITY DEFINER` SQL function: `current_company_id()` returns `business_accounts.company_id` for `user_id = auth.uid()`. Single join.
- D-12: For a user with no `business_accounts` row, returns `NULL` — no exception. RLS naturally denies. No special-casing in policies.
- D-13: Regression verification = manual login as 2–3 real existing business accounts post-migration (staging, then prod), confirming same paikka(t) visible, no RLS-denied errors. No automated RLS test suite required.

### Claude's Discretion
- Exact SQL syntax/naming for `current_company_id()` beyond the SECURITY DEFINER + single-join shape (D-11).
- Exact migration filename/ordering and how to structure the single transaction (DDL + data migration).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. Member-invite UX, permission granularity beyond owner/member, and dashboard UI for managing roles are explicitly Phase 60/64 concerns.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACCESS-01 | `companies`-taulu + `business_accounts.company_id`/`role` (owner/member); olemassaolevat tilit migratoidaan päähallitsijoiksi yhtenä transaktiona, varmuuskopio otettu ennen ajoa | See "Migration SQL Structure", "Single-Transaction Sequencing", "Package Legitimacy Audit" (N/A — no new deps), "Pitfall 1–3" |
| ACCESS-02 | `business_paikka_links.UNIQUE(paikka_id)` löysennetty `UNIQUE(business_account_id, paikka_id)`:ksi; RLS-politiikat päivitetty `current_company_id()`-helpperifunktiolla | See "Constraint Swap Pattern (Phase 47 precedent)", "current_company_id() Implementation", "RLS Rewrite Plan" |
</phase_requirements>

## Summary

This phase is a pure backend schema/data migration with no new runtime dependencies — it is entirely Postgres DDL + Supabase RLS rewrite, executed as a single SQL migration file under `supabase/migrations/`. The codebase already contains a near-identical precedent for every risky piece of this migration: Phase 47 (`20260616100000_business_branding_plural_and_paikka_scoping.sql`) already performed a nullable-column-add → backfill → `DROP CONSTRAINT` → `ADD CONSTRAINT UNIQUE(...)` sequence on a sibling table (`business_branding`), and Phase 35/PUB-01 (`20260611000001_approval_trigger.sql`) already established the `SECURITY DEFINER` + `SET search_path = public` pattern this phase's `current_company_id()` function must follow. Both can be copied almost verbatim, which substantially de-risks the SQL authoring.

The real risk in this phase is **not** the SQL syntax — it's (1) the breadth of app-code call sites that read `business_accounts.company_name` (8 distinct files, not the single call site CONTEXT.md's canonical_refs section calls out), and (2) sequencing the single transaction so RLS is rewritten and `company_id`/`role` are backfilled atomically, with no window where a row is either inaccessible or cross-company-visible. Because `business_accounts.company_name` is dropped (D-05) in the same migration that must also update RLS, **the SQL migration and the app-code deploy are coupled** — if the SQL migration runs before the app-code update reaches production (or vice versa under a rolling deploy), every business-facing route that reads `company_name` will break. This must be called out explicitly to the planner as a deploy-ordering constraint, not just a SQL-ordering constraint.

**Primary recommendation:** Write one migration file (DDL: new table, new columns, constraint swap, RLS rewrite, helper function — all using `IF NOT EXISTS`/`DROP ... IF EXISTS` for idempotent re-run safety, matching this repo's established style) wrapped implicitly in Postgres's single-statement-batch transaction (or explicit `BEGIN`/`COMMIT` if running via `psql`/SQL Editor), test it end-to-end on a local/staging Supabase instance, then update all 8 `company_name`-reading app files in the same phase/PR so the SQL and app-code land together — do not split this phase's deploy across two releases.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `companies` table + FK columns | Database / Storage | — | Pure schema change, no app logic |
| UNIQUE constraint loosening | Database / Storage | — | Constraint enforcement is a DB-only concern |
| `current_company_id()` helper | Database / Storage | API / Backend (consumed by RLS, indirectly by Route Handlers via the anon-key client) | SECURITY DEFINER function lives in Postgres; RLS policies invoke it transparently — app code never calls it directly |
| RLS policy rewrite | Database / Storage | — | Access control enforced entirely at the Postgres row level per this project's existing pattern (`auth.uid() = ...`) |
| `company_name` → `company_id` join in app reads | API / Backend | — | All 8 call sites are Route Handlers or Server Components reading via Supabase client — this is API-tier code, not browser-tier |
| Migration backfill (existing rows → owner companies) | Database / Storage | — | One-time data migration executed via SQL, not app code |

## Standard Stack

### Core
No new libraries. This phase uses only:

| Tool | Version | Purpose | Why Standard |
|---|---|---|---|
| PostgreSQL (via Supabase) | Whatever Supabase project is pinned to (no `supabase/config.toml` found in this repo — no explicit version pin) [VERIFIED: codebase search] | DDL, RLS, SECURITY DEFINER function | Already the project's only database |
| Supabase CLI / migrations convention | Existing `supabase/migrations/*.sql` timestamped files | Migration file format | Established repo convention since Phase 1.7 |

### Supporting
None — no new npm/pip/cargo packages are required for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQL-only RLS via `current_company_id()` | A policy library/ORM-level tenancy abstraction (e.g. RLS-as-code tools) | Rejected — out of scope per CONTEXT.md and STATE.md's standing v3.1 decision: "No new runtime dependencies — companies/role/access-requests are pure Postgres DDL + Supabase RLS" |
| `pg_dump`/snapshot table backup | Supabase PITR (chosen, D-01) | Rejected per explicit D-04 reconciliation — do not introduce |

**Installation:** None — no `npm install` needed for this phase.

## Package Legitimacy Audit

Not applicable. This phase installs zero external packages (pure SQL migration + existing-dependency app-code edits). No `npm view`/registry check required.

## Architecture Patterns

### System Architecture Diagram

```
[Migration file: supabase/migrations/<timestamp>_companies_and_rls.sql]
        |
        v
  BEGIN (implicit/explicit transaction)
        |
        +--> 1. CREATE TABLE companies (id, name, created_at)
        |
        +--> 2. ALTER TABLE business_accounts
        |         ADD COLUMN company_id UUID/BIGINT REFERENCES companies(id)
        |         ADD COLUMN role TEXT CHECK (role IN ('owner','member'))
        |
        +--> 3. Data backfill (single statement, all existing rows):
        |         INSERT INTO companies(name) SELECT company_name FROM business_accounts
        |         UPDATE business_accounts SET company_id = <matching new company>, role = 'owner'
        |         (must preserve 1:1 row correspondence — see "Backfill Join Strategy" below)
        |
        +--> 4. ALTER TABLE business_accounts
        |         ALTER COLUMN company_id SET NOT NULL  (after backfill, safe)
        |         ALTER COLUMN role SET NOT NULL
        |
        +--> 5. ALTER TABLE business_accounts DROP COLUMN company_name
        |
        +--> 6. ALTER TABLE business_paikka_links
        |         DROP CONSTRAINT/INDEX business_paikka_links_paikka_id_unique
        |         ADD CONSTRAINT business_paikka_links_account_paikka_unique
        |           UNIQUE (business_account_id, paikka_id)
        |
        +--> 7. CREATE FUNCTION current_company_id() SECURITY DEFINER ...
        |
        +--> 8. DROP POLICY + CREATE POLICY (rewritten) on business_accounts
        |         and business_paikka_links, using current_company_id()
        |
  COMMIT
        |
        v
[App code: 8 files reading business_accounts.company_name]
        |
        +--> Updated in the SAME deploy to join companies.name via company_id
        |     (Route Handlers using supabaseAdmin: service role, bypasses RLS —
        |      straightforward join. Server Components using anon-key client:
        |      subject to the rewritten RLS — must verify SELECT policy on
        |      `companies` table allows the join, see Pitfall 3)
        |
        v
[Manual regression: login as 2-3 real business accounts (D-13),
 confirm same paikka(t) visible, dashboard loads without RLS errors]
```

### Recommended Project Structure
No new directories. One new file:
```
supabase/
└── migrations/
    └── <YYYYMMDDHHMMSS>_companies_role_rls.sql   # new — single migration, see Migration SQL Structure
```

### Pattern 1: Constraint Swap (Phase 47 precedent — copy this shape)
**What:** Drop an old single/wrong-scoped UNIQUE constraint and replace with a composite one, after backfilling any new NOT NULL columns first.
**When to use:** Exactly this phase's `business_paikka_links` UNIQUE(paikka_id) → UNIQUE(business_account_id, paikka_id) change.
**Example (from this repo, already shipped and battle-tested):**
```sql
-- Source: supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql
-- (business_branding table — same shape of problem, different table)
ALTER TABLE business_branding
  DROP CONSTRAINT IF EXISTS business_branding_unique_account;

ALTER TABLE business_branding
  ADD CONSTRAINT business_branding_unique_account_paikka UNIQUE (business_account_id, paikka_id);

CREATE INDEX IF NOT EXISTS idx_business_branding_account_paikka
  ON business_branding(business_account_id, paikka_id);
```
For `business_paikka_links`, the equivalent is [CITED: supabase/migrations/20260605000000_business_accounts.sql, 20260610000005_confirm_paikka_unique.sql]:
```sql
-- The original constraint was an implicit UNIQUE(paikka_id) table constraint plus a
-- named explicit index from 20260610000005:
--   CREATE UNIQUE INDEX IF NOT EXISTS business_paikka_links_paikka_id_unique
--     ON business_paikka_links(paikka_id);
DROP INDEX IF EXISTS business_paikka_links_paikka_id_unique;
-- (the implicit table-level UNIQUE(paikka_id) constraint must also be dropped by name —
--  its auto-generated name is business_paikka_links_paikka_id_key; verify via
--  \d business_paikka_links in staging before writing DROP CONSTRAINT IF EXISTS)
ALTER TABLE business_paikka_links
  DROP CONSTRAINT IF EXISTS business_paikka_links_paikka_id_key;

ALTER TABLE business_paikka_links
  ADD CONSTRAINT business_paikka_links_account_paikka_unique
  UNIQUE (business_account_id, paikka_id);
```
**Why this matters:** the original migration created the constraint two ways — once as an inline table constraint (`UNIQUE(paikka_id)` inside `CREATE TABLE`, line 64 of `20260605000000_business_accounts.sql`) and once as an explicit named index (`20260610000005_confirm_paikka_unique.sql`). Both must be removed or the composite constraint add will conflict/be redundant. **The planner must include a staging-only `\d business_paikka_links` (or `SELECT conname FROM pg_constraint WHERE conrelid = 'business_paikka_links'::regclass`) verification step before finalizing the exact `DROP CONSTRAINT` name** — the auto-generated name (`business_paikka_links_paikka_id_key`) is a Postgres convention but should be confirmed, not assumed.

### Pattern 2: SECURITY DEFINER helper function (Phase 35/PUB-01 precedent — copy this shape)
**What:** A `SECURITY DEFINER` function with pinned `search_path`, used inside RLS policies and triggers to safely cross a table boundary the calling role couldn't otherwise read.
**When to use:** `current_company_id()` — must read `business_accounts.company_id` for `auth.uid()`, which the calling `authenticated` role can already read for its own row, but RLS policy evaluation needs this as a function to avoid a circular/self-referential RLS check when querying a different table (`business_paikka_links`, `companies`) scoped by company.
**Example (from this repo, already shipped):**
```sql
-- Source: supabase/migrations/20260611000001_approval_trigger.sql (PUB-01)
CREATE OR REPLACE FUNCTION public.set_business_managed_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE liikuntapaikat
  SET published = true, business_managed = true
  WHERE id = NEW.paikka_id;
  RETURN NEW;
END;
$$;
```
Applying the same shape to `current_company_id()` (D-11 — single join, returns NULL on no-match per D-12) [CITED: PostgreSQL CREATE FUNCTION docs + this repo's established pattern]:
```sql
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS BIGINT  -- or UUID, matching companies.id's chosen type — see Open Questions
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM business_accounts WHERE user_id = auth.uid();
$$;

-- Explicit grant — required because SECURITY DEFINER functions are NOT automatically
-- executable by `authenticated`/`anon` roles; PostgreSQL revokes EXECUTE from PUBLIC
-- by default unless the function owner's role has broader grants. Supabase's default
-- role setup typically already grants EXECUTE on public-schema functions to
-- authenticated, but this should be verified explicitly in staging, not assumed.
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
```
**Why `LANGUAGE sql` + `STABLE` instead of `plpgsql`:** the function body is a single read-only SELECT with no control flow — `LANGUAGE sql STABLE` lets the Postgres planner inline it into the calling RLS policy's query plan, which is the documented Supabase-recommended pattern for RLS helper functions for performance [CITED: supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices]. `PUB-01`'s function uses `plpgsql` because it has imperative control flow (`IF NOT FOUND THEN RAISE EXCEPTION`); `current_company_id()` has none, so the simpler/faster `sql` language is the better fit here, not a deviation worth flagging back to the user — Claude's Discretion per CONTEXT.md.

### Pattern 3: Column-privilege REVOKE (existing repo pattern — consider for `role`)
**What:** `REVOKE UPDATE (column) ON table FROM authenticated` to prevent a row owner from self-elevating a privileged column via the existing "own row" RLS UPDATE policy.
**When to use:** This repo already revoked self-UPDATE on `business_accounts.approval_status`, `business_paikka_links.claim_status`, `liikuntapaikat.business_managed`, and `profiles.is_admin` (`20260605000003_fix_column_privileges.sql`) specifically because a generic "user can update their own row" RLS policy otherwise lets a user silently grant themselves elevated status. **The new `business_accounts.role` column has the exact same shape of risk**: if `business_accounts` keeps an `UPDATE ... USING (auth.uid() = user_id)` policy and a member writes `role = 'owner'` to their own row, they self-promote.
**Recommendation:** Add `REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated;` in this same migration, mirroring the existing pattern exactly. This is not explicitly called out in CONTEXT.md's decisions, but it is a direct application of an established, already-shipped repo convention to a newly-introduced column with the identical risk shape — flag to planner as a recommended addition, not a re-litigation of locked decisions.

### Anti-Patterns to Avoid
- **Backfilling `company_id` via a correlated subquery without a deterministic join key:** `INSERT INTO companies(name) SELECT company_name FROM business_accounts` does not preserve row identity — a second statement must join the new `companies` rows back to the right `business_accounts` row. Do NOT assume row insertion order matches `business_accounts` iteration order; use `RETURNING` + a temp mapping, or a single `WITH inserted AS (INSERT ... RETURNING id, name) UPDATE business_accounts SET company_id = inserted.id FROM inserted WHERE business_accounts.company_name = inserted.name` pattern. **Caution:** if two `business_accounts` rows happen to share an identical `company_name` string, a name-based join will mis-map one of them to the other's new company — see Pitfall 1 below for the safe alternative.
- **Treating `DROP COLUMN company_name` as low-risk because RLS still works:** dropping the column breaks every app-code read site immediately and irreversibly (no PITR-friendly partial rollback at the column level without a full point-in-time restore). This is exactly the kind of "auth-adjacent migration is worse than data loss" risk the Phase 53 precedent warns about — sequence the DROP COLUMN as the very last DDL statement, after confirming (in staging) that all 8 app files have been updated and are ready to ship together.
- **Assuming SECURITY DEFINER functions inherit caller's RLS-filtered view:** they do not — SECURITY DEFINER runs with the function owner's full privileges, bypassing RLS on the tables it queries internally (this is exactly why it's needed here, but also why its query body must be narrowly scoped — `current_company_id()` only ever returns a scalar derived from `auth.uid()`, never user-supplied input, so there's no injection surface, but this distinction must be understood by whoever reviews the migration).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-tenant row scoping | Custom app-level "WHERE company_id = ?" filtering in every query | Postgres RLS + `current_company_id()` | Already the project's exclusive access-control mechanism (every other table uses RLS, never app-level filtering) — consistent with v3.1's standing decision to avoid CASL/Oso/Cerbos |
| Migration backup | Custom `pg_dump`/snapshot-table script | Supabase PITR (already enabled) | Explicitly decided D-01/D-04 — do not re-introduce |
| Rollback automation | A custom down-migration `.sql` file | Supabase PITR restore-to-timestamp | Explicitly decided D-03 |

**Key insight:** Every piece of this phase's hardest-looking problem (safe constraint swap, SECURITY DEFINER RLS helper, column-privilege lockdown) already has a shipped, working precedent elsewhere in this exact codebase. The job is closer to "apply the established pattern to a new table" than "invent a new migration technique."

## Runtime State Inventory

This is a schema/data migration phase (not a rename/refactor of identifiers), but it does mutate live production rows and drop a column whose data has no other home — the canonical question still applies: *after the migration runs, what runtime systems still reference the old shape?*

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `business_accounts.company_name` (production rows, all existing business accounts — pending/approved/rejected) | Data migration: copied verbatim into new `companies.name` per D-08 before the column is dropped. No other datastore holds this string. |
| Live service config | None found — no n8n/Datadog/Tailscale-style external service config references `company_name` or `business_accounts.role`/`company_id` (this app has no such integrations; confirmed via grep, only Resend email templates reference `companyName` as a JS variable, not a stored config value) | None |
| OS-registered state | None — this is a Vercel/Next.js app with no OS-level task scheduling, pm2, or systemd units referencing these columns | None |
| Secrets/env vars | None — no env var name references `company_name`, `company_id`, or `role` | None |
| Build artifacts / installed packages | None — no generated/compiled artifact embeds the old schema shape (TypeScript types in app code are hand-written inline interfaces, e.g. `{ company_name: string; role_in_company: string | null; user_id: string }` in `app/admin/page.tsx`/`AdminApplicationList.tsx`/`app/admin/[id]/page.tsx` — these are **app code**, not generated artifacts, and are covered in the App Code Call Sites section below, not here) | Code edit (see App Code Call Sites) |

**Nothing found in 3 of 5 categories** — verified by grep across the repo for `company_name`, `business_account_id`, `role_in_company`, and by inspecting `package.json`/repo structure for external service integrations (none exist beyond Supabase, Resend, Anthropic API — none of which store this schema externally).

## App Code Call Sites (Full Enumeration)

CONTEXT.md's canonical_refs section names only `app/business/page.tsx` (~lines 181–209) as the identity-resolution reference. That call site does **not** read `company_name` — it only reads `business_accounts.user_id` (existence check) and queries `business_paikka_links`/`onboarding_draft` by `business_account_id`, neither of which changes (D-07 keeps the FK untouched). **The actual `company_name`-reading call sites are different files entirely** — a full grep-verified enumeration [VERIFIED: codebase grep]:

| File | Line(s) | Pattern | Change Needed |
|------|---------|---------|----------------|
| `app/api/business/register/route.ts` | 16-36 | `INSERT INTO business_accounts (user_id, company_name, role_in_company)` | **New behavior required, not just a read fix:** registration must now also `INSERT INTO companies(name) VALUES (company_name) RETURNING id`, then insert `business_accounts` with `company_id` + `role = 'owner'`. This is the **forward-going equivalent of the backfill** — every *new* signup after this migration must create its own company, matching the backfilled shape. **This is in scope for ACCESS-01/02 even though it's not explicitly named in CONTEXT.md** — without it, every account created after the migration lands would have `company_id IS NULL`, breaking `current_company_id()` for them immediately. |
| `app/api/business/create-paikka/route.ts` | 120-130, 145-150, 163-165 | `UPDATE business_accounts SET company_name = ...`, `SELECT company_name`, used in `sendAdminNotificationEmail({ companyName: ... })` | UPDATE must become an UPDATE on `companies.name` (joined via `company_id`); SELECT must join `companies` table |
| `app/api/business/reapply/route.ts` | 91-101 | `SELECT company_name` → `sendAdminNotificationEmail` | Join `companies` via `company_id` |
| `app/api/business/onboarding/submit/route.ts` | 127-137 | `SELECT company_name` → `sendAdminNotificationEmail` | Join `companies` via `company_id` |
| `app/api/admin/reject/route.ts` | 75-85 | `SELECT company_name` → `sendAdminNotificationEmail` | Join `companies` via `company_id` |
| `app/api/admin/approve/route.ts` | 66-76 | `SELECT company_name` → `sendAdminNotificationEmail` | Join `companies` via `company_id` |
| `app/api/admin/applications/route.ts` | 16-26 | `business_accounts(company_name, role_in_company, user_id)` embedded select (admin pending-applications list) | Embedded select must change to `business_accounts(role, user_id, companies(name))` (Supabase JS embedded-resource syntax for the new FK) |
| `app/api/admin/applications/[id]/route.ts` | 23 | same embedded select pattern, single application detail | Same fix as above |
| `app/admin/page.tsx` | 14 | TS type `business_accounts: { company_name: string; role_in_company: string \| null; user_id: string } \| null` | Update type to match new embedded shape |
| `app/admin/AdminApplicationList.tsx` | 13, 79, 81-82 | Same TS type + rendering `app.business_accounts?.company_name` and `role_in_company` | Update type + render path (`role_in_company` free-text field is unrelated to the new `role` enum column — do not conflate; `role_in_company` stays as-is, it's a free-text "what is your role at the company" field collected at registration, separate from the new owner/member RLS role) |
| `app/admin/[id]/page.tsx` | 30, 127-128 | Same pattern, single-application admin detail view | Update type + render path |
| `app/business/profiili/page.tsx` | 11-19 | `SELECT company_name, contact_phone` via anon-key `createBusinessServerClient` (subject to RLS, not service-role) | Must join `companies` via `company_id` — **and the new RLS SELECT policy on `companies` must allow this read for the row's own company** (see Pitfall 3) |

**Disambiguation flagged above:** `role_in_company` (existing free-text column from `20260610000002_admin_columns.sql`, collected at registration: "what is your job title/role at the company") is a **different field** from the new `role` CHECK column (`'owner' | 'member'`, RLS-relevant). The planner must not conflate or rename one into the other — both will coexist on `business_accounts` after this migration.

**Net assessment:** 11 distinct call-site edits across 9 files, not the 1 file named in canonical_refs. The planner must scope tasks for all of these, and — per the Summary section's deploy-ordering note — they must land in the **same** release as the SQL migration, since `company_name` is dropped, not deprecated-and-kept.

## Common Pitfalls

### Pitfall 1: Name-collision in the backfill join
**What goes wrong:** Two different `business_accounts` rows might share the exact same `company_name` string (e.g. two test accounts both named "Testi Oy" — confirmed present in `tests/api/submit.test.ts`/`create-paikka.test.ts` fixtures, and plausibly in real pending/rejected rows too per D-09's "migrate every row regardless of status"). If the backfill UPDATE joins `business_accounts` back to the newly-inserted `companies` rows by matching on `name`, duplicate names will non-deterministically map both `business_accounts` rows to whichever `companies` row the join picks first.
**Why it happens:** `INSERT ... SELECT` does not preserve a 1:1 correlation with the source table by default; only a `RETURNING` clause combined with a row-identity-preserving CTE does.
**How to avoid:** Use a single `WITH` CTE that carries `business_accounts.user_id` through the INSERT and back into the UPDATE, e.g.:
```sql
WITH new_companies AS (
  INSERT INTO companies (name)
  SELECT company_name FROM business_accounts
  RETURNING id, name
),
ranked_accounts AS (
  -- pair each business_accounts row with exactly one new_companies row
  -- using ROW_NUMBER() over both sides ordered identically, since INSERT...SELECT
  -- without ORDER BY has no guaranteed correlation to RETURNING order either —
  -- the safest approach is a per-account INSERT (one companies row per account
  -- via a correlated INSERT, not a bulk INSERT...SELECT) so each gets a 1:1 mapping:
  SELECT user_id, company_name FROM business_accounts
)
-- Recommended actual approach (avoids the ordering ambiguity above entirely):
-- run the INSERT per-row via a loop/function, or add a temporary join key:
-- ALTER TABLE business_accounts ADD COLUMN _migration_company_id BIGINT;
-- then loop or use a single UPDATE...FROM with row_number() matching on ctid.
```
**Concrete safe pattern (recommended for the planner to use verbatim):**
```sql
WITH new_companies AS (
  INSERT INTO companies (name)
  SELECT company_name FROM business_accounts ORDER BY user_id
  RETURNING id
),
numbered_new AS (
  SELECT id, ROW_NUMBER() OVER () AS rn FROM new_companies
),
numbered_accounts AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) AS rn FROM business_accounts
)
UPDATE business_accounts ba
SET company_id = nn.id, role = 'owner'
FROM numbered_accounts na
JOIN numbered_new nn ON nn.rn = na.rn
WHERE ba.user_id = na.user_id;
```
This guarantees a 1:1 row correspondence regardless of duplicate `company_name` values, because the correlation is via `ROW_NUMBER()` applied identically to both the INSERT's SELECT and the UPDATE's source, not via the `name` value itself. **The planner must verify the two `ORDER BY user_id` clauses produce identical row ordering** — this is the load-bearing detail; test it in staging with `SELECT company_name, company_id FROM business_accounts JOIN companies ON companies.id = business_accounts.company_id` to confirm every account's new company name matches its original `company_name` exactly, for every row, not a sample.
**Warning signs:** If staging dry-run verification shows any account's `companies.name` doesn't match what `business_accounts.company_name` held before the migration, the join logic is wrong — do not proceed to production.

### Pitfall 2: `current_company_id()` not executable by `authenticated` role
**What goes wrong:** RLS policies silently deny all access (looks like "every business account lost access to everything") because PostgreSQL's default `REVOKE EXECUTE FROM PUBLIC` on newly created functions means the `authenticated` role can't call `current_company_id()` even though the function itself is correctly defined.
**Why it happens:** `CREATE FUNCTION` does not automatically grant `EXECUTE` to arbitrary roles; Supabase's `authenticated`/`anon` roles are not exempted from this default.
**How to avoid:** Explicitly run `GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;` in the same migration (shown in Pattern 2 above). Verify in staging: log in as a real business account and confirm no `permission denied for function current_company_id` error appears in Supabase logs.
**Warning signs:** RLS-protected SELECTs that return zero rows for a logged-in business user who should see data, with no explicit Postgres error surfaced to the client (PostgREST swallows the underlying permission error into an empty result set in some configurations) — this is the regression D-13's manual login check exists specifically to catch, but the planner should add the GRANT proactively rather than rely on D-13 to discover its absence.

### Pitfall 3: New `companies` table has no RLS policy at all
**What goes wrong:** `companies` is a brand-new table. If RLS is not explicitly enabled and a SELECT policy added, by default a freshly created table with RLS **not enabled** is fully readable by any role with table-level SELECT grant (Postgres default, not denied-by-default) — but Supabase recommends every table have RLS enabled, and this project enables RLS on every existing table without exception. Conversely, if RLS *is* enabled but no SELECT policy exists, **every** read (including the `app/business/profiili/page.tsx` anon-key join) will return zero rows, breaking the "join through company_id" fix that's supposed to replace the dropped `company_name` column.
**Why it happens:** Easy to add the table and the FK columns but forget the RLS enable + policy step for the *new* table specifically (the rewrite focus is naturally on the *existing* `business_accounts`/`business_paikka_links` policies).
**How to avoid:** Explicitly include in the migration:
```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business reads own company"
  ON companies FOR SELECT
  USING (id = current_company_id());
```
No INSERT/UPDATE policy is needed for `companies` in this phase — all writes happen via the migration itself and via `supabaseAdmin` (service-role, bypasses RLS) in `app/api/business/register/route.ts`'s forward-going company-creation logic. Per this project's CLAUDE.md constraint ("Supabase writes: service role key only; anon key is read-only after RLS"), no business-facing client-side write path to `companies` should exist — confirm the planner does not add a client-side INSERT/UPDATE policy unless a future phase requires one.
**Warning signs:** `app/business/profiili/page.tsx` (anon-key client) returns `account: null` / redirects to `/business` for a real logged-in business account post-migration — this is the most likely user-visible regression if this pitfall is missed, and should be explicitly covered by the D-13 manual login check.

### Pitfall 4: Deploy-ordering — SQL migration vs. app-code release are coupled
**What goes wrong:** Supabase migrations (`supabase db push` or applied via SQL Editor) and the Next.js app deploy (Vercel) are two independent deploy pipelines with no built-in coordination. If the SQL migration runs first and drops `company_name` before the new app code (with `companies` joins) is live, every business-facing page/route reading `company_name` 500s or shows broken company names in the window between the two deploys. If the app code ships first (expecting `company_id`/`companies` to exist) before the SQL migration runs, every affected route breaks the other direction.
**Why it happens:** No existing CI/CD gate in this repo couples a Supabase migration apply to a Vercel deploy — confirmed via lack of any `vercel.json`/GitHub Actions step in this repo that runs `supabase db push` as part of the app deploy pipeline (not found in this codebase).
**How to avoid:** Document in the plan that **the SQL migration must be run manually immediately before/during the app-code deploy window**, not left to auto-apply asynchronously. Given D-02's staging dry-run requirement, the realistic sequence is: (1) verify on staging, (2) merge app-code PR, (3) at deploy time, run the production migration via Supabase SQL Editor or CLI **then** trigger/confirm the Vercel deploy completes, in that order, within a short window. This is an operational runbook detail the planner should surface as an explicit task, not assume is automatic.
**Warning signs:** Any error log showing `column business_accounts.company_name does not exist` (migration ran, app code stale) or `column business_accounts.company_id does not exist` (app code shipped, migration not yet run).

## Code Examples

### Full proposed migration skeleton (planner should expand into the actual PLAN.md tasks)
```sql
-- supabase/migrations/<timestamp>_companies_role_rls.sql
-- Phase 59: ACCESS-01/ACCESS-02 — companies entity, role column, composite UNIQUE, RLS rewrite.

BEGIN;

-- 1. New table (D-05/D-06)
CREATE TABLE IF NOT EXISTS companies (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 2. New columns on business_accounts (D-07), nullable first
ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('owner', 'member'));

-- 3. Backfill (D-08/D-09) — see Pitfall 1 for the 1:1-safe join pattern
WITH new_companies AS (
  INSERT INTO companies (name)
  SELECT company_name FROM business_accounts ORDER BY user_id
  RETURNING id
),
numbered_new AS (
  SELECT id, ROW_NUMBER() OVER () AS rn FROM new_companies
),
numbered_accounts AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) AS rn FROM business_accounts
)
UPDATE business_accounts ba
SET company_id = nn.id, role = 'owner'
FROM numbered_accounts na
JOIN numbered_new nn ON nn.rn = na.rn
WHERE ba.user_id = na.user_id;

-- 4. Lock down now that every row has a value
ALTER TABLE business_accounts
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- 5. Drop the denormalized column (D-05) — LAST DDL step, see Pitfall 4 for deploy ordering
ALTER TABLE business_accounts DROP COLUMN company_name;

-- 6. Column-privilege lockdown (Pattern 3 — mirrors 20260605000003_fix_column_privileges.sql)
REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated;

-- 7. Constraint swap on business_paikka_links (ACCESS-02) — verify exact constraint
--    name in staging via \d business_paikka_links before finalizing this DROP
DROP INDEX IF EXISTS business_paikka_links_paikka_id_unique;
ALTER TABLE business_paikka_links
  DROP CONSTRAINT IF EXISTS business_paikka_links_paikka_id_key;
ALTER TABLE business_paikka_links
  ADD CONSTRAINT business_paikka_links_account_paikka_unique
  UNIQUE (business_account_id, paikka_id);

-- 8. SECURITY DEFINER helper (D-11/D-12)
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM business_accounts WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

-- 9. companies RLS policy (Pitfall 3)
CREATE POLICY "Business reads own company"
  ON companies FOR SELECT
  USING (id = current_company_id());

-- 10. Rewrite business_accounts policies to scope by company instead of just self-row
--     (existing "own row" policies still needed for the row containing company_id/role
--      itself — a member must still read/update their OWN business_accounts row;
--      company-scoping here means: can a member see OTHER members' business_accounts
--      rows in the same company? That's new behavior this migration enables but Phase
--      59 doesn't need to add a policy for it yet — Phase 60/64 (member management UI)
--      is where "see your co-workers" SELECT policy would be added. For THIS phase,
--      keep the existing own-row policies; do not over-build ahead of scope.)

-- 11. Rewrite business_paikka_links policies to scope by current_company_id()
--     instead of auth.uid() = business_account_id directly — this is the actual
--     RLS rewrite ACCESS-02 requires, since with role='member' support coming,
--     paikka access should be company-scoped, not just business_account_id-scoped:
DROP POLICY IF EXISTS "Business reads own links" ON business_paikka_links;
DROP POLICY IF EXISTS "business_paikka_links_select_own" ON business_paikka_links;
CREATE POLICY "business_paikka_links_select_company"
  ON business_paikka_links FOR SELECT
  USING (
    business_account_id IN (
      SELECT user_id FROM business_accounts WHERE company_id = current_company_id()
    )
  );

-- INSERT/UPDATE policies: D-07 keeps business_account_id = auth.uid() identity
-- unchanged for writes in this phase (member-to-member write sharing is Phase 60/64
-- scope, not this phase's). Leave INSERT/UPDATE policies as-is unless a specific
-- ACCESS-02 success criterion requires otherwise — re-verify against ROADMAP.md
-- phase 59 success criteria during planning.

COMMIT;
```

**Important caveat the planner must resolve:** step 11's company-scoped SELECT policy is a genuine behavior change (a member can now see paikat managed by ANY business_account in their company, not just their own) — this is the entire point of "multi-company" support, but the planner should double check against ROADMAP.md's exact Phase 59 success criteria whether this SELECT-scope widening is in scope for Phase 59 itself, or whether Phase 59 should keep SELECT scoped to `business_account_id` (self only) and defer the company-wide SELECT widening to Phase 60 (which introduces the actual access-request/approval flow for members). **This is flagged as an Open Question below — CONTEXT.md does not explicitly resolve it**, and getting it wrong either over-exposes data early or under-delivers on what "RLS rewritten around current_company_id()" is supposed to mean.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `auth.uid() = business_accounts.user_id` direct identity check | `current_company_id()` SECURITY DEFINER helper used in policies on related tables | This phase | Enables company-scoped (not just self-scoped) access without each policy re-deriving the join inline |
| `UNIQUE(paikka_id)` — one business per venue, ever | `UNIQUE(business_account_id, paikka_id)` — multiple business_accounts (future: multiple companies' employees) can each have their own link row to the same venue | This phase | Prerequisite for Phase 60's "another employee can request access to a venue already managed by a co-worker" flow |

**Deprecated/outdated:**
- `business_accounts.company_name`: removed entirely this phase, replaced by `companies.name` via `company_id` join.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `companies.id` should be `BIGSERIAL` (matching `business_paikka_links.id`'s existing convention) rather than `UUID` (matching `business_accounts.user_id`'s convention) | Code Examples, migration skeleton | Low — either type works; if the planner/user prefers UUID for consistency with `business_accounts.user_id`/`auth.users.id`, this is a one-line type change with no other impact. Flagged because CONTEXT.md doesn't specify the PK type. |
| A2 | The auto-generated constraint name for the original inline `UNIQUE(paikka_id)` table constraint is `business_paikka_links_paikka_id_key` (Postgres's default naming convention: `<table>_<column>_key`) | Pattern 1 / Code Examples | Medium — if the actual name differs (e.g. if Postgres/Supabase versions differ in naming), the `DROP CONSTRAINT IF EXISTS` with the wrong name silently no-ops (harmless, since `IF EXISTS`) but leaves the old constraint in place, causing the new composite `ADD CONSTRAINT` to potentially conflict or be redundant. Mitigation already built into the recommendation: planner must run `\d business_paikka_links` in staging to confirm the actual name before finalizing. |
| A3 | Supabase's default role grants already include `EXECUTE` on public-schema functions for `authenticated` (so the explicit `GRANT EXECUTE` in the migration may be redundant but is not harmful) | Pitfall 2 | Low — including the explicit GRANT is the safe default regardless of whether Supabase's project-level defaults already cover it; verified via web search this is a documented footgun area where teams "forget function grants," so being explicit costs nothing. |
| A4 | Whether the company-wide SELECT-scope widening on `business_paikka_links` (Code Examples step 11) belongs in Phase 59 or should be deferred to Phase 60 | Code Examples caveat, Open Questions | High — this is the single biggest open design question in this research; getting it wrong either ships a phase that doesn't actually deliver "RLS rewritten around current_company_id()" (ACCESS-02's literal requirement) or ships company-wide visibility before Phase 60's access-request/approval gating exists, which could be read as a premature security-relevant behavior change. Must be confirmed against ROADMAP.md Phase 59 success criteria during planning, ideally re-confirmed with the user if ROADMAP.md is itself ambiguous. |

## Open Questions

1. **Does Phase 59's RLS rewrite widen `business_paikka_links` SELECT to company-wide, or keep it self-scoped?**
   - What we know: ACCESS-02 explicitly requires "RLS-politiikat päivitetty `current_company_id()`-helpperifunktiolla" (RLS policies updated with the `current_company_id()` helper function) — implying the helper must be used in at least one rewritten policy.
   - What's unclear: whether "updated to use the helper" means literally swapping `auth.uid() = business_account_id` for an equivalent self-scoped check expressed via `current_company_id()` (no behavior change, just refactored to use the new helper), or whether it means genuinely widening SELECT to all rows sharing the same `company_id` (actual behavior change, enabling the multi-employee visibility this whole milestone is about).
   - Recommendation: re-read ROADMAP.md's exact Phase 59 success criteria text (not just REQUIREMENTS.md's one-line ACCESS-02 summary) during planning; if still ambiguous, this is worth a quick discuss-phase-style confirmation rather than the planner guessing, since it materially changes what "done" looks like for ACCESS-02.

2. **Are there any `company_name` values that are empty/placeholder, per D-10's deferred research question?**
   - What we know: D-10 explicitly defers this to research-time and says default behavior is "migrate as-is unless a large count is found."
   - What's unclear: the actual production row count and content — this research could not query the live/staging database (no DB credentials or MCP tool available in this research session).
   - Recommendation: the planner or executor must run `SELECT COUNT(*) FROM business_accounts WHERE company_name IS NULL OR trim(company_name) = ''` against staging (or production read-only) before finalizing the migration. Given `company_name` has a `NOT NULL` constraint already (`20260605000000_business_accounts.sql` line 25), `NULL` is impossible, but empty-string or whitespace-only values are not excluded by the existing schema — only the app-level registration validation (`if (!company_name)`) prevents new empty submissions, not historical ones from before that validation existed, if any. This is a quick, cheap check the planner should schedule as an early verification task, not skip.

3. **Should `companies.id` be `BIGSERIAL` or `UUID`?** (see Assumption A1) — low-stakes, but worth a one-line decision in the plan rather than leaving to implementation-time improvisation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (staging/local copy for D-02 dry-run) | D-02 staging verification gate | Not verified in this research session — no DB/MCP access available | — | Planner/executor must confirm a staging or local Supabase instance (via Supabase CLI `supabase start` for local, or a dedicated staging project) exists or can be provisioned before execution begins; this is a hard prerequisite for D-02, not optional |
| Supabase CLI | Applying/testing the migration locally | Not verified — no shell access to check `supabase --version` was exercised against this specific machine in this research pass | — | If absent, migrations can alternatively be tested by pasting the SQL into the Supabase Studio SQL Editor against a staging project, per this repo's `20260622120000`/`_audit` precedent for manual operator-run scripts |

**Missing dependencies with no fallback:**
- A staging/local Supabase environment is a hard requirement for D-02's gate and was not confirmed to exist in this research pass — the planner should make "confirm staging environment exists and is reachable" an explicit early task, not assume it.

**Missing dependencies with fallback:**
- Supabase CLI absence has a viable fallback (manual SQL Editor execution), consistent with how this repo has handled manual migration verification before (`_audit/53-row-count-audit.sql`'s documented manual-run convention).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest run`, per `package.json` `"test": "vitest run"`) [VERIFIED: package.json] |
| Config file | Not located in this research pass — likely `vitest.config.ts`/`vitest.config.mts` at repo root; planner should confirm exact path during Wave 0 |
| Quick run command | `npx vitest run tests/api/<relevant>.test.ts` |
| Full suite command | `npm test` (runs `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACCESS-01 | `companies` row created + `business_accounts.company_id`/`role` backfilled correctly for every existing row | manual-only (per D-13) | N/A — staging SQL verification query (`SELECT ... JOIN companies ...` row-count + name-match check, see Pitfall 1) | ❌ Wave 0 — this is a one-time SQL verification script, not a Vitest test; recommend adding it as a `supabase/migrations/_audit/59-backfill-verification.sql` file mirroring the `_audit/53-row-count-audit.sql` convention |
| ACCESS-01 | New registrations (post-migration) create their own company correctly | unit/integration | `npx vitest run tests/api/register.test.ts` | ❌ Wave 0 — no `tests/api/register.test.ts` exists yet; `app/api/business/register/route.ts` currently has zero test coverage (confirmed via `tests/api/*.test.ts` glob — only `update-paikka`, `save-step`, `submit`, `create-paikka` have tests). The planner should treat adding this test as in-scope, since the route's behavior is changing materially in this phase. |
| ACCESS-02 | `business_paikka_links` composite UNIQUE allows two different `business_account_id`s to link the same `paikka_id`, still rejects a duplicate `(business_account_id, paikka_id)` pair | manual-only (per D-13's stated scope — "no automated RLS test suite is required for this phase") | N/A | ❌ — explicitly out of scope per D-13; do not add automated RLS tests unless the user revisits this decision |
| ACCESS-02 | `current_company_id()` returns NULL for non-business users, correct `company_id` for business users | manual-only (per D-13) | N/A — staging manual login check | ❌ — explicitly out of scope per D-13 |
| ACCESS-01/02 | `app/api/business/create-paikka/route.ts`, `reapply/route.ts`, `onboarding/submit/route.ts` continue to send correct `companyName` in admin notification emails after the join-through-company_id change | regression (existing tests already mock `company_name`) | `npx vitest run tests/api/create-paikka.test.ts tests/api/submit.test.ts` | ✅ — `tests/api/create-paikka.test.ts` and `tests/api/submit.test.ts` already mock `{ company_name: 'Test Oy' }`/`{ company_name: 'Testi Oy' }` (lines 38-41, 143, 186) — **these existing test mocks will need updating** to mock the new `companies(name)` join shape instead of a flat `company_name` column, or they will pass for the wrong reason (mocking a column that no longer exists in the real schema) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/create-paikka.test.ts tests/api/submit.test.ts` (the two existing test files touching `company_name`)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`, **plus** the manual staging dry-run (D-02) and manual login regression (D-13) — both of which are outside Vitest's scope and must be tracked as separate checklist items in PLAN.md/UAT.md, not assumed covered by `npm test` passing.

### Wave 0 Gaps
- [ ] `supabase/migrations/_audit/59-backfill-verification.sql` — read-only SQL verification script for the backfill 1:1 row-correspondence check (Pitfall 1), mirroring `_audit/53-row-count-audit.sql`'s manual-run convention
- [ ] `tests/api/register.test.ts` — new test file; `app/api/business/register/route.ts` currently has zero coverage and its behavior changes materially in this phase
- [ ] Update existing mocks in `tests/api/create-paikka.test.ts` (line 41/143) and `tests/api/submit.test.ts` (line 186) from flat `company_name` to the post-migration `companies(name)` join shape

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (unchanged by this phase) | — |
| V3 Session Management | No (unchanged) | — |
| V4 Access Control | Yes — this entire phase IS an access-control schema change | Postgres RLS (existing project-wide pattern) + `SECURITY DEFINER` helper function with pinned `search_path`, per the established Supabase-recommended pattern |
| V5 Input Validation | Marginal — no new user-input surface (the migration touches existing validated inputs only; `register/route.ts`'s `company_name` validation is unchanged) | Existing `normalizeNimi`/length-cap patterns already in place, no new validation needed |
| V6 Cryptography | No | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Self-elevation via own-row UPDATE policy (member sets `role='owner'` on their own `business_accounts` row) | Elevation of Privilege | `REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated` — mirrors this repo's existing pattern for `approval_status`/`claim_status`/`business_managed`/`is_admin` (Pattern 3 above) |
| SECURITY DEFINER function used as an unintended RLS-bypass write path | Elevation of Privilege / Tampering | `current_company_id()` is read-only (`SELECT`, no `UPDATE`/`INSERT`), `STABLE`, and only ever reads `auth.uid()` (not user-supplied input) — no write/injection surface exists in this function by construction; document this explicitly in the migration's SQL comments for future reviewers, matching this repo's existing convention of decision-log comments at the top of each migration file |
| `search_path` hijacking via SECURITY DEFINER function | Tampering | `SET search_path = public` pinned explicitly in the function definition — matches the existing `set_business_managed_on_approval()` precedent and the documented Supabase/Postgres best practice |
| Cross-company data leak via an incompletely-scoped RLS policy (e.g. forgetting to update one of the two `business_paikka_links` policies — SELECT updated but INSERT/UPDATE still using the old direct `auth.uid()` check in a way that's now inconsistent with company semantics) | Information Disclosure | Explicit per-policy checklist in the plan: every existing `business_paikka_links`/`business_accounts` RLS policy must be enumerated and explicitly decided "keep as-is" or "rewrite," not silently left as a side effect of only touching the policies CONTEXT.md happened to name |

## Sources

### Primary (HIGH confidence)
- This repository's own migration history (`supabase/migrations/20260605000000_business_accounts.sql`, `20260610000005_confirm_paikka_unique.sql`, `20260610000006_rls_business_paikka_links.sql`, `20260611000001_approval_trigger.sql`, `20260605000003_fix_column_privileges.sql`, `20260616100000_business_branding_plural_and_paikka_scoping.sql`) — read directly, ground truth for current schema and established patterns
- `.planning/phases/59-multi-company-skeemamigraatio/59-CONTEXT.md` — locked user decisions
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — requirement IDs and project history
- Codebase grep for `company_name`, `business_account_id`, `role_in_company` across all `.ts`/`.tsx` files — exhaustive call-site enumeration

### Secondary (MEDIUM confidence)
- [Postgres Row-Level Security Footguns — Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/) — SECURITY DEFINER + search_path + RLS-bypass risk confirmation
- [Supabase Docs — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — `LANGUAGE sql STABLE` inlining recommendation for RLS helper functions
- [Supabase Docs — Do I need to expose security definer functions in RLS policies?](https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw) — grant/exposure semantics
- [Which ALTER TABLE Operations Lock Your PostgreSQL Table? — DEV Community](https://dev.to/mickelsamuel/which-alter-table-operations-lock-your-postgresql-table-1082) — ACCESS EXCLUSIVE lock behavior for ADD CONSTRAINT UNIQUE
- [Postgres Story: efficiently implement a unique constraint with minimum locks — Medium](https://medium.com/@raminorujov/postgres-story-how-to-efficiently-implement-a-unique-constraint-with-minimum-locks-aa3f72b8cf1b) — CREATE INDEX CONCURRENTLY + ADD CONSTRAINT USING INDEX pattern (noted as available but not required given this table's small size)

### Tertiary (LOW confidence)
- None — all findings either came from direct codebase inspection or were cross-checked against official Supabase/Postgres documentation via WebSearch.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, pure Postgres/Supabase, fully verified against this repo's existing migrations
- Architecture: HIGH — every pattern (constraint swap, SECURITY DEFINER helper, column-privilege revoke) has a directly-cited shipped precedent in this exact codebase
- Pitfalls: HIGH for the SQL-level pitfalls (backed by precedent + official docs); MEDIUM for the RLS-scope-widening open question (Open Question 1), which genuinely requires a planning-time or user-confirmed decision, not just more research

**Research date:** 2026-06-25
**Valid until:** No external time pressure — this is internal-codebase-grounded research with no fast-moving external dependency; valid until the schema itself changes again. Treat as stable for the life of this phase's planning and execution window.
