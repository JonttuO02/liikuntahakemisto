# Phase 59: Multi-company-skeemamigraatio - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Separate "company" as an entity from "login identity": introduce a `companies` table, add `business_accounts.company_id`/`role` (owner/member), loosen `business_paikka_links.UNIQUE(paikka_id)` to `UNIQUE(business_account_id, paikka_id)`, and rewrite RLS policies around a `current_company_id()` helper. Every existing `business_accounts` row is migrated to become the owner of its own new company, in one transaction, gated by a verified backup/rollback approach. This phase is purely the schema/data migration — it does NOT build any UI for inviting members or managing roles (that's Phase 60/64).

</domain>

<decisions>
## Implementation Decisions

### Backup & rollback mechanism
- **D-01:** Backup = Supabase PITR (point-in-time recovery), already enabled at the platform level. No separate `pg_dump`/snapshot-table artifact is required.
- **D-02:** Verification = run the full migration against a staging/local Supabase copy first. Confirm all 4 ROADMAP success criteria pass there before running against production.
- **D-03:** Rollback = no custom down-migration script. If production breaks despite a clean staging dry-run, restore via Supabase PITR to the pre-migration timestamp.
- **D-04 (reconciliation):** This combination is the deliberate interpretation of ROADMAP success criterion 2 ("backup taken + rollback mechanism verified before running"): PITR satisfies "backup taken," the staging dry-run satisfies "rollback mechanism verified" (it proves the migration is safe before going live, making rollback rarely necessary; PITR restore is the fallback of last resort). Researcher/planner should NOT introduce additional backup tooling (pg_dump, manual snapshot tables) — this was explicitly considered and rejected in favor of the lighter PITR + staging-dry-run approach.

### Companies table shape & data ownership
- **D-05:** `companies.name` becomes the single source of truth for the company name. `business_accounts.company_name` is dropped entirely (no denormalized copy) — app code that currently reads `business_accounts.company_name` must be updated to join through `company_id`.
- **D-06:** `companies` table for this phase is minimal: `id`, `name`, `created_at`. Branding/contact fields stay on `business_accounts`/`business_paikka_links` as-is — moving those is out of scope for this phase.
- **D-07:** `business_accounts` keeps its existing PK (`user_id`) unchanged. Add `company_id` (FK to `companies.id`) and `role` (`'owner' | 'member'`, CHECK constraint) as new columns. This is the lowest-risk option since `business_paikka_links.business_account_id` already references `business_accounts.user_id` and that FK relationship is untouched.

### Migration mechanics for existing accounts
- **D-08:** Each existing `business_accounts` row gets its own new `companies` row, named via verbatim copy: `INSERT INTO companies(name) SELECT company_name FROM business_accounts`. No trimming/normalization/dedup logic.
- **D-09:** Every `business_accounts` row is migrated uniformly and gets `role = 'owner'` regardless of `approval_status` (pending/approved/rejected all included — no filtering).
- **D-10:** Whether any `company_name` values are empty/placeholder is a research-time data question, not a decision to pre-empt now. Default behavior if found: migrate as-is per D-08, unless research finds a large enough count to warrant flagging back to the user.

### current_company_id() RLS helper & regression verification
- **D-11:** Implement as a `SECURITY DEFINER` SQL function: `current_company_id()` returns `business_accounts.company_id` for the row where `user_id = auth.uid()`. Single join, mirrors the simplicity of today's `auth.uid() = business_account_id` checks.
- **D-12:** For a logged-in user with no matching `business_accounts` row (e.g. a regular consumer), the function returns `NULL` — no exception. RLS policies using `company_id = current_company_id()` naturally deny access since `NULL` never matches a real `company_id`. No special-casing needed in policies.
- **D-13:** Regression verification for "existing companies still see only their own paikat" = manual login as 2–3 real existing business accounts post-migration (in staging, then again in prod), confirming they see exactly the same paikka(t) as before and the dashboard loads without RLS-denied errors. No automated RLS test suite is required for this phase.

### Claude's Discretion
- Exact SQL syntax/naming for `current_company_id()` beyond the SECURITY DEFINER + single-join shape (D-11) is left to the planner/researcher.
- Exact migration filename/ordering and how to structure the single transaction (DDL + data migration) is left to planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current schema (subject to this migration)
- `supabase/migrations/20260605000000_business_accounts.sql` — current `business_accounts` table definition and RLS policies (`auth.uid() = user_id`)
- `supabase/migrations/20260610000005_confirm_paikka_unique.sql` — adds `business_paikka_links_paikka_id_unique` index that D-07/ROADMAP requires loosening to `UNIQUE(business_account_id, paikka_id)`
- `supabase/migrations/20260610000006_rls_business_paikka_links.sql` — current `business_paikka_links_select_own` RLS policy using `auth.uid() = business_account_id`, must be rewritten with `current_company_id()`

### Phase 53 incident (precedent for backup/rollback requirement)
- `.planning/milestones/v3.0-ROADMAP.md` — archived record referencing the Phase 53 unbacked-migration data-loss incident that motivates this phase's backup/rollback gate
- `supabase/migrations/_audit/53-row-count-audit.sql` — Phase 53's read-only row-count audit pattern (did not prevent the incident; not required to be reused here per D-01–D-04, but useful reference for what NOT to rely on alone)

### Identity resolution (what current_company_id() replaces)
- `app/business/page.tsx` (~lines 181–209) — current pattern resolving identity via `supabase.auth.getUser()` → `.eq('user_id', user.id)` on `business_accounts`, then `.eq('business_account_id', user.id)` on `business_paikka_links`. This is the call site shape `current_company_id()` needs to support once RLS is rewritten.

No external ADRs/specs beyond ROADMAP.md and REQUIREMENTS.md — requirements (ACCESS-01, ACCESS-02) are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None directly reusable — there is no existing company/multi-tenant abstraction anywhere in the codebase (`current_company_id()`, `company_id` do not exist yet; confirmed via grep).

### Established Patterns
- All current RLS policies and app-side identity checks use the same direct shape: `auth.uid() = business_accounts.user_id` or `auth.uid() = business_paikka_links.business_account_id`. The new `current_company_id()` helper must slot into this same call-site pattern (D-11/D-12) so RLS rewrites are mechanical, not a redesign.
- `business_accounts.user_id` is literally the Supabase auth user id today — there is no indirection layer to remove other than the new `company_id` hop.

### Integration Points
- `business_paikka_links.business_account_id` FK to `business_accounts.user_id` is unchanged by this phase (D-07) — only the UNIQUE constraint changes.
- Any RLS policy currently filtering by `business_account_id` directly on `business_paikka_links` or by `user_id` on `business_accounts` needs rewriting to filter by `current_company_id()` instead, per the phase's RLS-rewrite success criterion.

</code_context>

<specifics>
## Specific Ideas

No specific UI/visual requirements — this is a backend schema/data migration phase with no UI surface. The single concrete reference point is the Phase 53 incident, used throughout this discussion as the cautionary precedent shaping the backup/rollback decisions (D-01–D-04).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Member-invite UX, permission granularity beyond owner/member, and dashboard UI for managing roles are explicitly Phase 60/64 concerns and were not discussed here.

</deferred>

---

*Phase: 59-Multi-company-skeemamigraatio*
*Context gathered: 2026-06-25*
