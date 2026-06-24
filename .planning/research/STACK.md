# Stack Research

**Domain:** Multi-user-per-company B2B accounts with peer-to-peer access requests (Postgres/Supabase RLS data modeling)
**Researched:** 2026-06-24
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

No new runtime technologies are needed. This capability is a **data-modeling and RLS-policy problem**, fully solvable with the existing stack: Postgres + Supabase RLS + Resend. The only "new" things are a new table (`companies`) and `SECURITY DEFINER` helper functions for cross-row authorization checks — both are Postgres-native, zero new dependencies.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Postgres (existing Supabase) | n/a | New `companies` table + `business_access_requests` table | Already the system of record; no new infra |
| Supabase RLS + `SECURITY DEFINER` SQL functions | n/a | Cross-row, same-company authorization checks | RLS policies normally check `auth.uid()` against only *the current row*. Same-company checks require a row → company → sibling-rows traversal. A `SECURITY DEFINER` helper function makes this readable, testable, and reusable across multiple tables, and avoids same-table RLS recursion |
| Resend (existing) | existing | Email notification when an access request is created/approved/rejected | Already wired for admin-approval emails — same DB-state-change → Route Handler → Resend pattern, no new provider |
| `@supabase/ssr` (existing) | existing | New employee logins still use `sb-biz-*` cookie namespace | No change needed — every employee is still a row in `auth.users`; the existing business cookie namespace already isolates business from consumer auth regardless of how many employees a company has |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | — | No new library is needed. Do not add an authorization/policy library (CASL, Oso, Cerbos, Permit.io) — the access-control surface here is exactly one relationship ("same company, target venue already managed by a peer"), and Postgres RLS expresses it natively in two or three policies plus one helper function. A policy engine would add a second source of truth that can drift from RLS. |
| `resend` (existing) | existing | Notify the approving manager when a peer requests access; notify the requester on approve/reject | Reuse the exact pattern already used for admin-approval emails — same template structure, new copy only |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI (existing) | Author/test the new migration locally | Follow the same convention as `20260605000000_business_accounts.sql`: a comment block documenting decisions (`D-xx`), `IF NOT EXISTS` guards, RLS enabled immediately after `CREATE TABLE` |
| `supabaseAdmin` service-role client (existing) | Approve/reject Route Handler logic | Continue the existing pattern: JWT-verify the manager's session via `supabaseAdmin.auth.getUser(token)`, then perform privileged writes via the service-role client — never trust a client-supplied `company_id` or `business_account_id` |

## Data Modeling: Company as a First-Class Entity

**The core problem:** today `business_accounts.user_id` is the PRIMARY KEY — one row IS one login IS one company (confirmed by reading `supabase/migrations/20260605000000_business_accounts.sql`). There is no entity representing "the company" independent of "the login." To support multiple logins per company, introduce a `companies` table and make `business_accounts` a many-to-one child of it. Do NOT bolt a peer relationship directly onto `business_accounts` (e.g. a self-referencing `parent_account_id` column pointing at another `business_accounts.user_id`) — that only models exactly two levels (owner + one employee), is ambiguous about which row is "the real" company, and breaks if that row is ever deleted or renamed. A dedicated table is the durable pattern.

**Recommended schema (additive; the one breaking change is called out explicitly below):**

```sql
-- New: companies table — the entity that "owns" venues, distinct from any single login
CREATE TABLE companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modify: business_accounts gains company_id FK (nullable during migration, then NOT NULL)
ALTER TABLE business_accounts
  ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill: every existing business_accounts row becomes its own company-of-one,
-- then business_accounts.company_id is set to match and made NOT NULL in the same migration.
INSERT INTO companies (id, company_name)
  SELECT gen_random_uuid(), company_name FROM business_accounts;

-- New: per-employee role within the company (first employee = manager by default)
ALTER TABLE business_accounts
  ADD COLUMN role TEXT NOT NULL DEFAULT 'manager'
    CHECK (role IN ('manager', 'employee'));

-- New: the access-request object itself
CREATE TABLE business_access_requests (
  id                    BIGSERIAL PRIMARY KEY,
  requester_account_id  UUID NOT NULL REFERENCES business_accounts(user_id) ON DELETE CASCADE,
  paikka_id             BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by            UUID REFERENCES business_accounts(user_id),
  rejection_reason       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_account_id, paikka_id)  -- one open request per employee per venue
);
```

**Why this shape, relative to the existing single-account model:**

- `business_paikka_links` keeps its current row shape (`business_account_id UUID → business_accounts.user_id`). The change is NOT "who manages a venue" — it is "how many logins exist per company" plus a request/grant flow that lets a second employee gain their own management row for a venue their company already manages. Concretely: approving a request **inserts a new `business_paikka_links` row for the requester**, so multiple employees of the same company can each hold a row against the same venue. This requires loosening `business_paikka_links`'s existing `UNIQUE(paikka_id)` constraint to `UNIQUE(business_account_id, paikka_id)` — **this is the one schema change to an existing table that the new feature requires**, and it must be an explicit, reviewed migration (see Pitfalls below).
- `business_accounts` stays the per-login identity table (1 row = 1 `auth.users` row = 1 employee), now pointing at a shared `company_id`. Every existing query/route that joins on `business_accounts.user_id` keeps working unchanged for single-employee companies — no rewrite of existing approval/onboarding/admin code paths.
- `business_access_requests` is a new, narrow table dedicated to the request/approval lifecycle — mirroring the existing `business_paikka_links.claim_status` pattern (`pending/approved/rejected` + `rejection_reason` + Resend trigger points) rather than inventing new vocabulary. Keeping it separate from `business_paikka_links` avoids conflating "an active management grant" with "a pending request for one," which would complicate every existing query that currently assumes a `business_paikka_links` row means "this venue is actively managed."

## RLS Policy Patterns for Cross-Row-Same-Company Checks

Every existing RLS policy on `business_accounts`/`business_paikka_links` checks `auth.uid() = <this row's owner column>` — a single-row check (verified in `supabase/migrations/20260605000000_business_accounts.sql` and `20260610000006_rls_business_paikka_links.sql`). Same-company authorization needs to check **a different row's company_id against the caller's company_id**. The standard Postgres/Supabase fix:

```sql
-- Helper: returns the caller's company_id. SECURITY DEFINER is required because this
-- function is invoked from a policy defined ON business_accounts itself — a non-DEFINER
-- function would re-trigger the same RLS check it's trying to resolve (recursion).
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM business_accounts WHERE user_id = auth.uid();
$$;

-- Policy: an employee can SELECT sibling employees in the same company
-- (needed so the dashboard can show "who works here" and who can request access)
CREATE POLICY "business_accounts_select_same_company"
  ON business_accounts FOR SELECT
  USING (company_id = public.current_company_id());

-- Policy: an employee can INSERT an access request only for themselves
CREATE POLICY "access_requests_insert_own"
  ON business_access_requests FOR INSERT
  WITH CHECK (requester_account_id = auth.uid());

-- Policy: a requester reads their own request; a same-company manager who already
-- manages that paikka_id can also read it (to approve/reject)
CREATE POLICY "access_requests_select_own_or_same_company_manager"
  ON business_access_requests FOR SELECT
  USING (
    requester_account_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM business_paikka_links bpl
      JOIN business_accounts ba ON ba.user_id = bpl.business_account_id
      WHERE bpl.paikka_id = business_access_requests.paikka_id
        AND ba.company_id = public.current_company_id()
        AND bpl.claim_status = 'approved'
    )
  );

-- Policy: only an existing manager of that venue (same company) can UPDATE
-- (approve/reject) a pending request — never the requester themselves
CREATE POLICY "access_requests_update_by_existing_manager"
  ON business_access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_paikka_links bpl
      JOIN business_accounts ba ON ba.user_id = bpl.business_account_id
      WHERE bpl.paikka_id = business_access_requests.paikka_id
        AND ba.company_id = public.current_company_id()
        AND bpl.claim_status = 'approved'
    )
  )
  WITH CHECK (status IN ('approved', 'rejected'));
```

**Why `SECURITY DEFINER` and not an inline subquery everywhere:** this codebase already independently uses this exact pattern. `set_business_managed_on_approval()` (in `supabase/migrations/20260611000001_approval_trigger.sql`) is `SECURITY DEFINER` for the same reason — to safely cross a table boundary the calling row's own RLS shouldn't gate. Wrapping `current_company_id()` once avoids repeating the subquery in every new policy and avoids the classic Postgres RLS footgun of a policy on `business_accounts` querying `business_accounts` again (infinite recursion / unpredictable performance).

**Critical Postgres/Supabase-specific traps for the planner (flag for PITFALLS.md):**

1. RLS policies that query the *same table they're defined on* (e.g. a `business_accounts` SELECT policy that subqueries `business_accounts`) can recurse or perform poorly. Route same-table lookups through a `SECURITY DEFINER` function, as above.
2. `SECURITY DEFINER` functions must `SET search_path = public` explicitly — already this project's convention (seen in `set_business_managed_on_approval`) — otherwise a mutable `search_path` is a privilege-escalation injection vector.
3. Service-role routes (`supabaseAdmin`) bypass RLS entirely. The approve/reject Route Handler MUST re-verify "is this caller actually a manager of this venue in this company" in application code (mirroring the existing `supabaseAdmin.auth.getUser(token)` pattern), because RLS will not protect a service-role write.
4. Dropping `UNIQUE(paikka_id)` on `business_paikka_links` and replacing it with `UNIQUE(business_account_id, paikka_id)` is a breaking change to an existing, load-bearing constraint. Write it as its own explicit migration with a `D-xx`-style decision comment, and audit `app/admin` queue logic and the `set_business_managed_on_approval` trigger for any implicit assumption of "exactly one link row per venue" before shipping.
5. The project has already hit a TOCTOU (time-of-check-to-time-of-use) bug once in the reapply flow (see `WR-03` in project memory). The same race-condition class applies here: two employees racing to request/approve access to the same venue should be prevented at the DB constraint level (`UNIQUE(requester_account_id, paikka_id)` on `business_access_requests`, plus the composite unique on `business_paikka_links`), not solely in application code.

## Installation

```bash
# No installation needed — every capability above is plain Postgres DDL/RLS plus the
# existing Resend integration. No new npm packages.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| `companies` table + `company_id` FK on `business_accounts` | Self-referencing `business_accounts.parent_account_id` (no new table) | Never recommended here — only models exactly 2 levels (owner + 1 employee) and conflates "the company" with "the first login," which breaks if that account is ever deleted or renamed. A dedicated `companies` row survives employee turnover. |
| Postgres RLS + one `SECURITY DEFINER` helper function | A general authorization library (CASL, Oso, Cerbos, Permit.io) | Only justified if the project later needs much richer roles/permissions (fine-grained per-field access, cross-resource audit trails) — a single binary relationship ("same company") does not warrant a policy engine, and one would duplicate RLS as a second enforcement layer that can drift out of sync. |
| New `business_access_requests` table | Reusing `business_paikka_links` with an extra `request_type`/state column | Rejected — conflates two different lifecycles (an *active management link* vs. a *pending request for one*) in one table, complicating every existing query that currently assumes a `business_paikka_links` row means "this venue is actively managed." |
| Resend (existing) for request/approve/reject emails | A second transactional email provider, or Supabase Auth's built-in email templates | No reason to introduce a second provider — Resend is already integrated and the new emails are the same shape (notify on state transition) as the existing admin-approval emails. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| A new auth provider / multi-tenant auth product (Clerk, WorkOS, Stytch) | The project already has a working, isolated business-auth cookie namespace (`sb-biz-*`) on Supabase Auth; switching providers mid-project for a feature that is pure data modeling is unjustified scope and risk | Keep Supabase Auth — every new employee is just another `auth.users` row plus a `business_accounts` row pointing at the shared `company_id` |
| An ORM (Prisma, Drizzle) for the new tables | The entire existing schema is raw SQL migrations plus the `@supabase/ssr`/`@supabase-js` query builder; an ORM for one feature creates a second, competing schema-definition source of truth | Continue raw SQL migrations in `supabase/migrations/`, same file-naming and decision-log-comment convention as the existing files |
| A generic RBAC/permissions library | Only one relationship needs modeling ("same company, target venue already approved-managed by a peer") — a library adds an abstraction layer with no current payoff | Two or three RLS policies plus one `SECURITY DEFINER` helper function, as shown above |
| Self-referencing FK on `business_accounts` to model "peer of" | Doesn't generalize past two accounts, is awkward to query "all employees of this company," and is fragile on deletion of the "primary" row | A `companies` table as the join point |
| Relying on application code alone to prevent duplicate active-manager rows | Postgres-level uniqueness is the existing pattern (`UNIQUE(paikka_id)`, composite UNIQUE elsewhere in this schema) — app-code-only enforcement risks the same class of TOCTOU race the project already hit once in the reapply flow | Explicit composite `UNIQUE(business_account_id, paikka_id)` constraint at the DB level |

## Stack Patterns by Variant

**If the approving manager should later be able to revoke a granted access (not just approve once):**
- Add a `revoked_at TIMESTAMPTZ` column to `business_paikka_links` (soft-delete) rather than hard-deleting the row, preserving an audit trail of who managed what and when — consistent with this project's existing preference for status + timestamp columns over hard deletes (`claim_status`, `approval_status`).
- Out of scope for this milestone per the stated question, but flag as a near-term follow-up since "approve" without "revoke" is an incomplete lifecycle.

**If a venue could ever end up with zero active managers (e.g. the sole manager's login is deleted):**
- `business_paikka_links.business_account_id` is `ON DELETE CASCADE` from `business_accounts.user_id` today. Under the new multi-employee model this remains correct: each employee's `business_paikka_links` rows are scoped to their own `business_account_id`, so deleting one employee's login only cascades that employee's own rows, never a sibling's. No schema change needed here, but worth a planner-level regression test once multiple employees can hold rows for the same venue.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| New `companies` / `business_access_requests` tables | Existing hosted Supabase Postgres | Plain DDL only, no new extensions — `gen_random_uuid()` is already used elsewhere in this schema (e.g. `profiles`) |
| `SECURITY DEFINER` functions | Existing Supabase RLS setup | Already proven in this codebase (`set_business_managed_on_approval`) — no compatibility risk |

## Sources

- Direct inspection of existing schema (HIGH confidence — primary source): `supabase/migrations/20260605000000_business_accounts.sql`, `supabase/migrations/20260610000006_rls_business_paikka_links.sql`, `supabase/migrations/20260611000001_approval_trigger.sql`, `supabase/migrations/20260610000004_reapply_cooldown.sql`, `supabase/migrations/20260615000000_business_accounts_contact_phone.sql`, `lib/supabase-business.ts`
- Postgres RLS same-table-recursion and `SECURITY DEFINER` mitigation pattern — standard, well-established Postgres/Supabase RLS practice; this exact codebase already independently arrived at the same pattern (`set_business_managed_on_approval`), corroborating it as correct for this stack (HIGH confidence — verified against an existing, shipped implementation in this codebase, not external doc lookup)
- `.planning/PROJECT.md` — v3.1 milestone scope, Key Decisions table, existing constraints (HIGH confidence — primary project source)
- User memory note (`phase38-review-fixes.md`): existing TOCTOU bug class (`WR-03`, reapply-approve race) in this codebase, informing the uniqueness-constraint recommendation above (HIGH confidence — direct project history)

---
*Stack research for: multi-user-per-company peer access requests (Liikuntahakemisto v3.1)*
*Researched: 2026-06-24*
