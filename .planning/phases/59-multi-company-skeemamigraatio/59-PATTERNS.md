# Phase 59: Multi-company-skeemamigraatio - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 11 (1 new migration file + 1 new audit script + 9 modified app-code files)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `supabase/migrations/<timestamp>_companies_role_rls.sql` | migration | batch (DDL + one-time backfill) | `supabase/migrations/20260616100000_business_branding_plural_and_paikka_scoping.sql` | exact (same shape: add column → backfill → constraint swap) |
| `supabase/migrations/_audit/59-backfill-verification.sql` | migration (read-only audit) | batch | `supabase/migrations/_audit/53-row-count-audit.sql` | exact (same convention — read-only verification script) |
| `app/api/business/register/route.ts` | route (Route Handler) | CRUD (insert) | itself — needs new behavior added (create company first), pattern source is `app/api/business/create-paikka/route.ts`'s multi-step insert/rollback shape | role-match |
| `app/api/business/create-paikka/route.ts` | route (Route Handler) | CRUD (insert + update) | itself — closest sibling for the update/select rewrite is `app/api/business/reapply/route.ts` | exact (sibling call-site shape) |
| `app/api/business/reapply/route.ts` | route (Route Handler) | CRUD (update) + event-driven (notification email) | `app/api/business/onboarding/submit/route.ts` (same `company_name` SELECT → email pattern) | exact |
| `app/api/business/onboarding/submit/route.ts` | route (Route Handler) | CRUD (update/delete) + event-driven (notification email) | `app/api/business/reapply/route.ts` | exact |
| `app/api/admin/reject/route.ts` | route (Route Handler) | CRUD (update) + event-driven (email) | `app/api/admin/approve/route.ts` | exact |
| `app/api/admin/approve/route.ts` | route (Route Handler) | CRUD (update) + event-driven (email) | `app/api/admin/reject/route.ts` | exact |
| `app/api/admin/applications/route.ts` | route (Route Handler) | request-response (embedded select, list) | `app/api/admin/applications/[id]/route.ts` | exact |
| `app/api/admin/applications/[id]/route.ts` | route (Route Handler) | request-response (embedded select, detail) | `app/api/admin/applications/route.ts` | exact |
| `app/admin/page.tsx` + `app/admin/AdminApplicationList.tsx` | component (client) | request-response (render fetched list) | each other — identical `Application` type shape duplicated in both files today | exact |
| `app/admin/[id]/page.tsx` | component (client) | request-response (render fetched detail) | `app/admin/AdminApplicationList.tsx` (same `business_accounts` shape, single-record variant) | exact |
| `app/business/profiili/page.tsx` | route (Server Component) | request-response (anon-key RLS-scoped read) | itself — only other anon-key business read site, no sibling exists; pair with new `companies` RLS SELECT policy (Pitfall 3) | role-match (no other anon-key business read site exists) |

## Pattern Assignments

### `supabase/migrations/<timestamp>_companies_role_rls.sql` (migration, batch)

**Analogs:** `20260616100000_business_branding_plural_and_paikka_scoping.sql` (constraint swap), `20260611000001_approval_trigger.sql` (SECURITY DEFINER), `20260605000003_fix_column_privileges.sql` (column REVOKE), `20260605000000_business_accounts.sql` (original table/RLS), `20260610000005_confirm_paikka_unique.sql` + `20260610000006_rls_business_paikka_links.sql` (current constraint/RLS being replaced)

**Header/decision-log comment convention** (repo style, copy verbatim shape — source: `20260616100000_business_branding_plural_and_paikka_scoping.sql` lines 1-21):
```sql
-- Phase 47: Reshape business_branding for plural branding data and per-venue scoping.
-- Analog source:
--   supabase/migrations/20260606000000_onboarding.sql -- header-comment style, composite UNIQUE + BIGINT FK precedent
--
-- Decision log:
--   D-12: ...
--   D-14: business_branding_unique_account UNIQUE(business_account_id) is re-keyed to a composite
--         UNIQUE(business_account_id, paikka_id). ...
--
-- NOT included (handled elsewhere):
--   logo_type CHECK constraint fix (BRDDB-04) -- already shipped in 20260615000002, not touched here.
```
Phase 59's migration file should open with the same structure: a one-line phase/purpose header, an "Analog source" pointer to this file, a "Decision log" block citing D-05 through D-14 from CONTEXT.md, and a "NOT included" block (e.g. Phase 60/64's company-wide visibility widening per D-14's resolution).

**Add-nullable-then-backfill-then-lock pattern** (source: `20260616100000...sql` lines 27-69):
```sql
ALTER TABLE business_branding
  ADD COLUMN IF NOT EXISTS paikka_id BIGINT REFERENCES liikuntapaikat(id) ON DELETE CASCADE;

UPDATE business_branding bb
SET paikka_id = ( ... )
WHERE bb.paikka_id IS NULL;

DELETE FROM business_branding WHERE paikka_id IS NULL;

ALTER TABLE business_branding
  ALTER COLUMN paikka_id SET NOT NULL;
```
Apply identically for `business_accounts.company_id`/`role`: add nullable, backfill via the CTE+ROW_NUMBER() pattern (already in RESEARCH.md's Pitfall 1), then `ALTER COLUMN ... SET NOT NULL`.

**Constraint swap pattern** (source: `20260616100000...sql` lines 71-83, and the original constraint definitions at `20260605000000_business_accounts.sql` lines 55-65 + `20260610000005_confirm_paikka_unique.sql` lines 1-13):
```sql
ALTER TABLE business_branding
  DROP CONSTRAINT IF EXISTS business_branding_unique_account;

ALTER TABLE business_branding
  ADD CONSTRAINT business_branding_unique_account_paikka UNIQUE (business_account_id, paikka_id);

CREATE INDEX IF NOT EXISTS idx_business_branding_account_paikka
  ON business_branding(business_account_id, paikka_id);
```
For `business_paikka_links`, the original constraint was created TWO ways and both must be dropped (confirm exact name via `\d business_paikka_links` in staging first, per RESEARCH.md A2):
- Inline table constraint from `20260605000000_business_accounts.sql` line 64: `UNIQUE(paikka_id)` → auto-generated name, conventionally `business_paikka_links_paikka_id_key`
- Explicit named index from `20260610000005_confirm_paikka_unique.sql`: `business_paikka_links_paikka_id_unique` → drop via `DROP INDEX IF EXISTS business_paikka_links_paikka_id_unique;`

**SECURITY DEFINER helper pattern** (source: `20260611000001_approval_trigger.sql` lines 1-18, full file — this is the only existing SECURITY DEFINER function in the repo):
```sql
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
Note the existing precedent uses `LANGUAGE plpgsql` (it has control flow). `current_company_id()` has none — RESEARCH.md correctly recommends `LANGUAGE sql STABLE` instead, which is a deliberate deviation (not a pattern-break) for RLS-helper-function inlining performance. Keep `SECURITY DEFINER` + `SET search_path = public` identical to this precedent.

**Column-privilege REVOKE pattern** (source: `20260605000003_fix_column_privileges.sql`, full file lines 1-31):
```sql
-- WR-02: Prevent businesses from self-approving their own approval_status
REVOKE UPDATE (approval_status) ON business_accounts FROM authenticated;
```
Each REVOKE line is preceded by a one-line comment citing the originating review-finding ID and the specific self-elevation risk it closes. Apply the same comment-then-REVOKE shape for the new `role`/`company_id` columns:
```sql
-- [cite phase/decision]: Prevent a member from self-promoting to owner or re-pointing
-- their own row at a different company via the existing "own row" UPDATE policy.
REVOKE UPDATE (role, company_id) ON business_accounts FROM authenticated;
```

**RLS enable + policy pattern, including the "re-assert idempotently" convention** (source: `20260605000000_business_accounts.sql` lines 31-48, and `20260610000006_rls_business_paikka_links.sql` full file):
```sql
ALTER TABLE business_paikka_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_paikka_links_select_own" ON business_paikka_links;
CREATE POLICY "business_paikka_links_select_own"
  ON business_paikka_links FOR SELECT
  USING (business_account_id = auth.uid());
```
For the new `companies` table, this becomes (per D-14 — self-scoped only, NOT company-wide):
```sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business reads own company"
  ON companies FOR SELECT
  USING (id = current_company_id());
```
For `business_paikka_links_select_own`, per D-14's explicit resolution, the rewrite must be a **mechanical swap, not a widening**:
```sql
DROP POLICY IF EXISTS "business_paikka_links_select_own" ON business_paikka_links;
CREATE POLICY "business_paikka_links_select_own"
  ON business_paikka_links FOR SELECT
  USING (business_account_id = auth.uid());
-- D-14: stays self-scoped. current_company_id() is available but company-wide
-- visibility widening is deferred to Phase 60/64. Do not change this policy's
-- observable behavior in this migration.
```
(Note: RESEARCH.md's Code Examples step 11 proposed a company-wide widened policy — D-14 in CONTEXT.md explicitly overrides that proposal. The planner must implement the self-scoped version above, not RESEARCH.md's widened version.)

---

### `supabase/migrations/_audit/59-backfill-verification.sql` (migration, read-only audit)

**Analog:** `supabase/migrations/_audit/53-row-count-audit.sql` — read this file directly during planning/execution to copy its exact header-comment + read-only-`SELECT`-only convention (manual-run script, no DDL, no writes). Pattern: a single commented SQL file with `SELECT ... JOIN ...` row-count/mismatch checks, intended to be pasted into Supabase SQL Editor manually, not executed by CI.

---

### `app/api/business/register/route.ts` (route, CRUD insert — NEW BEHAVIOR REQUIRED)

**Analog for the existing auth/parse/insert shape:** itself (lines 1-51, current file) — keep the JWT-verify-first structure unchanged:
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Analog for the new multi-step-insert-with-rollback shape needed here:** `app/api/business/create-paikka/route.ts` lines 72-118 — register/route.ts must now do `INSERT companies` THEN `INSERT business_accounts` (mirroring create-paikka's `INSERT liikuntapaikat` THEN `INSERT business_paikka_links`, including its rollback-on-failure pattern):
```typescript
const { data: newPaikka, error: paikkaError } = await supabaseAdmin
  .from('liikuntapaikat')
  .insert({ ... })
  .select('id')
  .single()

if (paikkaError || !newPaikka) {
  return NextResponse.json({ error: 'Insert failed', detail: paikkaError?.message }, { status: 500 })
}
const newPaikkaId: number = newPaikka.id

const { error: linkError } = await supabaseAdmin
  .from('business_paikka_links')
  .insert({ business_account_id: user.id, paikka_id: newPaikkaId, ... })

if (linkError) {
  const { error: rollbackError } = await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
  if (rollbackError) {
    console.error('[create-paikka] CRITICAL: rollback delete failed, orphaned row id=' + newPaikkaId, rollbackError.message)
  }
  return NextResponse.json({ error: 'Link insert failed', detail: linkError.message }, { status: 500 })
}
```
Applied to register/route.ts: `INSERT companies(name) VALUES (company_name) RETURNING id` first, then `INSERT business_accounts({ user_id: user.id, company_id: newCompany.id, role: 'owner', role_in_company })`. If the `business_accounts` insert fails, roll back by deleting the just-created `companies` row (same "log but don't destroy the auth user" comment convention as the existing file's lines 39-43 — do not delete the auth user on failure, only the orphaned `companies` row).

---

### `app/api/business/create-paikka/route.ts` (route, CRUD update — company_name UPDATE/SELECT site)

**Current shape to change** (lines 120-130 — UPDATE — and lines 144-150 — SELECT for email):
```typescript
// Step 3 of 4: write yritysNimi to business_accounts.company_name (D-05).
const { error: companyUpdateError } = await supabaseAdmin
  .from('business_accounts')
  .update({ company_name: yritysNimi })
  .eq('user_id', user.id)

if (companyUpdateError) {
  console.error('[create-paikka] company_name UPDATE failed (non-critical):', companyUpdateError.message)
}
...
const { data: biz } = await supabaseAdmin
  .from('business_accounts')
  .select('company_name')
  .eq('user_id', user.id)
  .single()
```
**Change needed:** the UPDATE must target `companies.name` via a `company_id` lookup first (two-step: SELECT `company_id` from `business_accounts`, then UPDATE `companies` where `id = company_id`), and the SELECT-for-email must become an embedded select: `.select('companies(name)')` or a join. Keep the exact same "non-critical, log don't fail" comment convention for both steps.

---

### `app/api/business/reapply/route.ts` and `app/api/business/onboarding/submit/route.ts` (route, CRUD update + event-driven email)

**Shared current shape** (identical in both files — reapply lines 88-110, submit lines 123-146):
```typescript
try {
  const { data: biz } = await supabaseAdmin
    .from('business_accounts')
    .select('company_name')
    .eq('user_id', user.id)
    .single()
  const { data: paikka } = await supabaseAdmin
    .from('liikuntapaikat')
    .select('nimi')
    .eq('id', paikkaId)
    .single()
  if (biz && paikka) {
    await sendAdminNotificationEmail({
      companyName: biz.company_name,
      venueName: paikka.nimi,
      linkType: 'claim',
      applicationId: rejectedLink.id,
      submittedAt: new Date().toISOString(),
    })
  }
} catch (emailErr) {
  console.error('[reapply] Admin notification email failed (non-critical):', emailErr)
}
```
**Change needed:** `.select('company_name')` → `.select('companies(name)')` (embedded select through `company_id` FK), and `companyName: biz.company_name` → `companyName: biz.companies?.name`. The try/catch/non-critical-log wrapper is unchanged — copy verbatim.

---

### `app/api/admin/reject/route.ts` and `app/api/admin/approve/route.ts` (route, CRUD update + event-driven email)

**Shared current shape** (reject lines 70-92, approve lines 61-82) — same pattern as above but reading `business_accounts` by `business_account_id`/`link.business_account_id` instead of `user.id`:
```typescript
const { data: biz } = await supabaseAdmin
  .from('business_accounts')
  .select('company_name')
  .eq('user_id', link.business_account_id)
  .single()
```
**Change needed:** identical fix — `.select('companies(name)')`, then `companyName: biz.companies?.name` in the `sendApprovalEmail`/`sendRejectionEmail` call. Both routes also share the JWT-verify + `profiles.is_admin` check pattern (lines 6-21 in both) — unchanged by this phase, not a pattern to modify.

---

### `app/api/admin/applications/route.ts` and `app/api/admin/applications/[id]/route.ts` (route, request-response embedded select)

**Current embedded-select shape** (applications/route.ts lines 16-22, [id]/route.ts lines 19-25):
```typescript
const { data } = await supabaseAdmin
  .from('business_paikka_links')
  .select(`
    id, paikka_id, link_type, claim_status, created_at,
    business_accounts(company_name, role_in_company, user_id),
    liikuntapaikat(nimi, osoite, kaupunki)
  `)
  .eq('claim_status', 'pending')
  .order('created_at', { ascending: true })
```
**Change needed:** the embedded `business_accounts(...)` field list must change from `company_name` to a nested join: `business_accounts(role, role_in_company, user_id, companies(name))`. Supabase JS embedded-resource syntax supports nesting through a second FK hop this way. **Critical disambiguation** (per RESEARCH.md): `role_in_company` (free-text job-title field, unrelated, unchanged) must NOT be confused with the new `role` enum column (`'owner'|'member'`) — both must appear if the new `role` column should also be surfaced to admin UI, though CONTEXT.md does not require it; at minimum `role_in_company` must be preserved as-is.

---

### `app/admin/page.tsx` + `app/admin/AdminApplicationList.tsx` + `app/admin/[id]/page.tsx` (component, request-response render)

**Current duplicated TS type** (identical in `app/admin/page.tsx` line 14, `app/admin/AdminApplicationList.tsx` line 13, and a near-twin in `app/admin/[id]/page.tsx` line 30 minus `paikka_id`/`liikuntapaikat`):
```typescript
type Application = {
  id: number
  paikka_id: number
  link_type: string
  claim_status: string
  created_at: string
  business_accounts: { company_name: string; role_in_company: string | null; user_id: string } | null
  liikuntapaikat: { nimi: string; osoite: string; kaupunki: string } | null
}
```
**Change needed:** `company_name: string` → `companies: { name: string } | null` nested inside `business_accounts`:
```typescript
business_accounts: { role_in_company: string | null; user_id: string; companies: { name: string } | null } | null
```
**Render-site change needed** (`AdminApplicationList.tsx` line 79, `app/admin/[id]/page.tsx` line 127):
```tsx
{app.business_accounts?.company_name ?? '—'}
```
becomes:
```tsx
{app.business_accounts?.companies?.name ?? '—'}
```
All three files must be updated together in the same edit pass since the type is hand-duplicated across them (no shared type import exists today — this phase does not need to introduce one unless the planner judges it low-risk, but duplicating the fix three times correctly is the minimum bar).

---

### `app/business/profiili/page.tsx` (route, Server Component, anon-key RLS-scoped read)

**Current shape** (full file, lines 1-25 — the only anon-key, RLS-subject business read site in the codebase, distinct from all the `supabaseAdmin` service-role sites above):
```typescript
const { data: account } = await supabase
  .from('business_accounts')
  .select('company_name, contact_phone')
  .eq('user_id', user.id)
  .maybeSingle()
if (!account) redirect('/business')
return (
  <BusinessProfiiliClient
    companyName={account.company_name}
    ...
  />
)
```
**Change needed:** `.select('companies(name), contact_phone')` and `companyName={account.companies?.name ?? ''}`. **This is the highest-risk call site** per RESEARCH.md Pitfall 3 — because this client uses the anon key (subject to RLS, not service-role), the new `companies` table's RLS SELECT policy (`USING (id = current_company_id())`) must correctly allow this read, or the page silently redirects to `/business` for every real business user post-migration. This is the exact regression D-13's manual login check is designed to catch — flag this file specifically in the staging dry-run checklist.

## Shared Patterns

### JWT verification (apply to all `app/api/business/*` and `app/api/admin/*` route handlers)
**Source:** every Route Handler reviewed above, identical first block, e.g. `app/api/business/register/route.ts` lines 4-13
```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '') ?? ''
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```
Unchanged by this phase — no file modifies this block.

### Admin authorization check (apply to all `app/api/admin/*` routes)
**Source:** `app/api/admin/approve/route.ts` lines 13-21 (identical in reject, applications, applications/[id])
```typescript
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('is_admin')
  .eq('user_id', user.id)
  .maybeSingle()
if (!profile?.is_admin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```
Unchanged by this phase.

### Non-critical side-effect logging (apply to all email-sending and denormalized-flag-update call sites touched by this phase)
**Source:** `app/api/business/create-paikka/route.ts` lines 128-130, repeated identically across every file above
```typescript
if (companyUpdateError) {
  console.error('[create-paikka] company_name UPDATE failed (non-critical):', companyUpdateError.message)
}
```
The convention is: prefix the log with `[<route-name>]`, suffix the message with `(non-critical):`, and never fail/rollback the primary operation because of this secondary write/read failure. Apply this exact convention to every new `companies` join/update introduced by this phase's app-code changes.

### Column-privilege REVOKE (apply to migration file, new `role`/`company_id` columns)
**Source:** `supabase/migrations/20260605000003_fix_column_privileges.sql`, full file — see Pattern Assignments above for the exact REVOKE line to add.

### SECURITY DEFINER + pinned search_path (apply to `current_company_id()`)
**Source:** `supabase/migrations/20260611000001_approval_trigger.sql`, full file — see Pattern Assignments above.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/api/register.test.ts` (new test file per RESEARCH.md Wave 0 Gaps) | test | request-response | No existing test for `register/route.ts` exists today (zero coverage); closest sibling test pattern to copy structure from is `tests/api/create-paikka.test.ts` or `tests/api/submit.test.ts` (both mock `company_name`, both will need their own mock updated to the `companies(name)` join shape in this phase per RESEARCH.md's Validation Architecture section) — planner should treat those two existing test files as the structural analog even though this PATTERNS.md did not re-read their full content (out of this agent's read scope; RESEARCH.md already cites the exact line numbers needing mock updates: `tests/api/create-paikka.test.ts` lines 41/143, `tests/api/submit.test.ts` line 186). |

## Metadata

**Analog search scope:** `supabase/migrations/` (6 files read directly), `app/api/business/` (4 files), `app/api/admin/` (4 files), `app/admin/` (3 files), `app/business/profiili/` (1 file)
**Files scanned:** 18 (6 migrations + 12 app-code files, including read-but-cited test files not re-read in full)
**Pattern extraction date:** 2026-06-25
