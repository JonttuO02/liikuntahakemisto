# Pitfalls Research

**Domain:** Multi-user-per-company support + peer access-request flow on existing single-account Supabase/Postgres + RLS SaaS model
**Researched:** 2026-06-24
**Confidence:** HIGH (grounded directly in this repo's schema/RLS/route code, not generic web research — the existing `business_accounts`/`business_paikka_links` migration and `admin/approve`, `business/register` routes were read directly)

## Critical Pitfalls

### Pitfall 1: `user_id` is overloaded as both "identity" and "company" — every RLS policy and FK breaks this assumption

**What goes wrong:**
The entire schema currently encodes "one login = one company" by making `business_accounts.user_id` simultaneously (a) the Supabase Auth identity, (b) the primary key of the company row, and (c) the FK target used everywhere else (`business_paikka_links.business_account_id REFERENCES business_accounts(user_id)`). Every RLS policy in the codebase is `USING (auth.uid() = user_id)` or `USING (auth.uid() = business_account_id)`. If a second employee logs in with their own `auth.users.id`, there is no row where `auth.uid() = user_id` for them — they see nothing, or worse, a naive fix makes `business_accounts.user_id` non-unique-per-company and duplicates company data per employee.

**Why it happens:**
The 1:1 model was correct for v1.7–v3.0 and reads naturally in every RLS predicate. When multi-user is added under time pressure, the path of least resistance is to add a second row to `business_accounts` per employee with the same `company_name` — but `business_paikka_links.business_account_id` FKs to `business_accounts(user_id)`, so each employee's venue links live in totally separate rows pointing at venues independently, with no shared "company" concept. This silently produces N independent companies that happen to share a name string, not one company with N members.

**How to avoid:**
Introduce an explicit `companies` table (or reuse `business_accounts` as the company row, decoupled from auth identity) plus a separate `company_members` join table: `company_members(user_id UUID FK auth.users, company_id FK companies, role TEXT)`. Migrate `business_paikka_links.business_account_id` to FK `companies.id` instead of `auth.users.id`. Every RLS policy must change from `auth.uid() = business_account_id` to an `EXISTS` subquery against `company_members` (`auth.uid() IN (SELECT user_id FROM company_members WHERE company_id = business_paikka_links.business_account_id)`). This is the single largest structural change in the milestone — treat it as its own migration phase, not folded into the access-request feature phase.

**Warning signs:**
- Any new RLS policy written as `auth.uid() = business_account_id` (old pattern reused without converting to a membership lookup) — grep for this pattern after migration and treat any hit as a bug.
- Two `business_accounts` rows with identical `company_name` but different `user_id` and no link between them.
- `business_paikka_links` queries returning empty for an employee who should have access.

**Phase to address:** Schema-migration phase (must happen before the access-request feature phase; this is a prerequisite, not parallel work).

---

### Pitfall 2: RLS policies use direct equality (`auth.uid() = x`), which is fast — converting to `EXISTS` subqueries without indexing tanks query performance and can silently leak rows if the subquery is malformed

**What goes wrong:**
Direct-equality RLS predicates are evaluated per-row cheaply. Replacing them with `EXISTS (SELECT 1 FROM company_members WHERE ...)` is the correct fix for Pitfall 1, but two failure modes are common: (a) forgetting an index on `company_members(user_id, company_id)` causes a sequential scan per row under RLS, which is invisible in dev (small data) and shows up as slow business-dashboard queries in production; (b) writing the `EXISTS` subquery without correctly restricting it — Postgres RLS subqueries run with the same row-security context as the outer query, so a missing predicate inside the subquery (e.g. forgetting to also restrict by `company_members.status = 'active'`) silently grants access to *removed* members because the row still exists, just with a stale flag nobody checks.

**Why it happens:**
RLS subquery correctness is not caught by TypeScript or by the app's normal test suite (Vitest tests usually hit the service-role client, which bypasses RLS entirely per this project's "Supabase writes: service role key only" convention) — so a broken policy can ship and only manifest when a real anon/authenticated client queries directly, which barely happens in this app's Route-Handler-first architecture but *will* happen if any future page reads `business_paikka_links` straight from a browser Supabase client.
Note: because this app already writes via service-role key in Route Handlers (per CLAUDE.md), RLS gaps are currently somewhat masked — they only bite if/when a client-side read path is added for company data, or if the membership check itself is wrong and a Route Handler trusts it.

**How to avoid:**
Add a composite index `(company_id, user_id, status)` on `company_members`. Always include `status = 'active'` (or equivalent) inside any RLS subquery and any Route Handler that does its own authorization check in code — do not rely on row existence alone, since this milestone introduces "remove employee" as a first-class action that should revoke access without deleting history. Write at least one RLS-specific test that authenticates as a real (non-service-role) Supabase client and asserts a removed member gets zero rows, since Vitest's existing pattern of testing against service-role bypasses this entirely.

**Warning signs:** Any membership check that does `SELECT ... FROM company_members WHERE company_id = X AND user_id = Y` without also filtering on an active/removed status column.

**Phase to address:** Schema-migration phase (index + policy authoring), with verification in the access-request feature phase (since "remove employee" is the action that proves this works).

---

### Pitfall 3: Race condition on concurrent approve/reject of the same access request — `business_paikka_links` approve route's pattern must be replicated, not reinvented

**What goes wrong:**
The existing `admin/approve` route (read directly from this repo) already solved this correctly for claim approval: it does a conditional `UPDATE ... SET claim_status = 'approved' WHERE id = X AND claim_status = 'pending'` with `{ count: 'exact' }`, then checks `if (!count)` to detect a concurrent double-approval and returns 409. If the new peer-approval feature for access requests is built without copying this exact "conditional update + count check" pattern — e.g. if it does a `SELECT` to check status, then a separate `UPDATE` (check-then-act) — two browser tabs, or the requesting employee double-clicking "Hyväksy" while a second admin-capable employee also clicks "Hyväksy"/"Hylkää" simultaneously, can both succeed, leaving the request in an inconsistent state (e.g. approved AND rejected side effects both fire, like two emails, or the requester getting access then immediately losing it from the second writer's stale read).

**Why it happens:**
The new access-request flow looks superficially similar to claim approval, so it's tempting to write fresh code rather than re-use the existing conditional-update idiom. With peer-to-peer approval (any existing company member can approve, not just a single admin), there are now *multiple potential approvers* racing each other, which is a new failure mode the original single-admin flow didn't have to consider as heavily.

**How to avoid:**
Copy the `admin/approve` route's pattern exactly: `UPDATE access_requests SET status = 'approved', approved_by = :approverId WHERE id = :id AND status = 'pending'` with `count: 'exact'`, then `if (!count) return 409`. Apply the same pattern to reject. Do not add a pre-check `SELECT` before the conditional `UPDATE` — the conditional `UPDATE` *is* the check, atomically.

**Warning signs:** Any new route for access requests that does `const { data } = await supabase.from('access_requests').select(...)` followed by a separate unconditional `.update(...)` call — this is the check-then-act anti-pattern already avoided elsewhere in this codebase.

**Phase to address:** Access-request feature phase. Verification: write a test (or manual UAT) that fires two concurrent approve/reject calls at the same request id and asserts exactly one succeeds with a 409 on the other.

---

### Pitfall 4: Orphaned access requests / dangling membership when the approving employee is later removed from the company

**What goes wrong:**
If employee A approves employee B's access request, and A is later removed from the company (or A's own account is revoked/rejected), B's membership row still references `approved_by = A`. If "removed" is implemented as a hard `DELETE` on `company_members` (mirroring the existing `ON DELETE CASCADE` pattern used for `business_accounts → auth.users`), this can cascade-delete unrelated rows unexpectedly, or leave `approved_by` as a dangling FK if not nullable-with-`ON DELETE SET NULL`. Separately: pending access requests where the *only* member with approval rights is the one being removed become permanently stuck — nobody left who can approve/reject them, and the UI may not surface this state, leaving requesters waiting indefinitely with no error and no admin escalation path.

**Why it happens:**
The existing schema only ever cascades `business_accounts.user_id → auth.users.id ON DELETE CASCADE` (1:1, so cascade is safe — deleting the one auth user deletes the one company). Once company membership is N:1, the same `ON DELETE CASCADE` reflex applied to `company_members` deletes the membership row, but anything that referenced that *specific user* (e.g. `approved_by`, `requested_by` on a still-pending older request, audit log rows) needs `ON DELETE SET NULL` or a "last known name" denormalized snapshot — not cascade, or approval/audit history silently disappears.

**How to avoid:**
- `company_members.approved_by` and `access_requests.requested_by`/`approved_by`/`rejected_by` should be `ON DELETE SET NULL`, never `CASCADE`. Optionally store a denormalized `approved_by_email_snapshot` text field at approval time, since this project already favors readable audit trails (e.g. `rejection_reason` decision log entry).
- Define and enforce an invariant: a company must always have at least one member with approval rights ("owner" role). Block removal of the last owner/approver via application logic (not just RLS) before it ever reaches the DB. The existing `business_accounts` row holder is the natural permanent "owner" — never demote/remove the original owner via the peer flow at all in this milestone; only allow inviting/removing *additional* members, keeping the original account holder un-removable. This sidesteps "who approves when everyone is removed" entirely and is the lowest-risk design.
- For any pending request when its only possible approver is removed: either auto-reassign approval rights to the remaining owner, or expire/cancel the request with a notification to the requester. Do not leave it silently pending forever.

**Warning signs:** Any `ON DELETE CASCADE` added to a new FK that points at a user/member row that could plausibly be referenced by historical/audit data. A company state where `company_members` has zero rows with approval rights.

**Phase to address:** Access-request feature phase (the "owner is permanent, cannot be removed via peer flow" constraint should be designed in from the start, not patched in afterward).

---

### Pitfall 5: Email notification spam / duplicate-request loops from Resend integration

**What goes wrong:**
This codebase already sends transactional email via `lib/email.ts` (`sendApprovalEmail`) on every approve action, wrapped in try/catch as "non-critical" — correct pattern. For peer access requests, two new failure modes appear: (1) if a rejected employee can immediately re-request access (mirroring the existing venue `reapply` pattern, which does `UPDATE rejected → pending` rather than a new `INSERT`), and the UI doesn't rate-limit or debounce this, a rejected requester can spam the approver's inbox by re-requesting repeatedly; (2) if notification emails are sent to *every* member of the company on every request/approval (since now there can be multiple members, not one), and the approving member's own action also re-triggers a notification email to themselves, every approve/reject doubles as a self-notification — annoying but also a sign the notification fan-out logic conflated "people who can approve" with "people who should be told."

**Why it happens:**
The existing 1:1 model has at most one recipient for any email (the single business owner, or the admin). Multi-member companies turn every "notify the company" call site into a fan-out, and it's easy to forget to exclude the actor (the person who performed the action) from their own notification, or to forget a cooldown on re-requests.

**How to avoid:**
- Reuse the `reapply` pattern's `UPDATE ... WHERE status = 'rejected'` idiom for re-requesting access, but add a minimum cooldown (e.g. store `rejected_at`, block re-request for N minutes/hours, surface a clear "you can request again after X" message) rather than allowing instant resubmission.
- When fanning out notification emails to multiple company members, explicitly exclude `request.requested_by` recipients from "new request" emails sent to themselves, and exclude the actor (`approved_by`/`rejected_by`) from "your request was approved/rejected" emails about their own action.
- Keep the existing try/catch-and-log non-critical pattern for all new email sends — do not let Resend failures block the approve/reject transaction, consistent with how `admin/approve` already isolates the email step after the DB write succeeds.

**Warning signs:** A test company member receiving an email about their own action. A rejected user able to spam re-requests with no visible cooldown in the UI.

**Phase to address:** Access-request feature phase.

---

### Pitfall 6: Migrating existing `business_accounts` rows to "company owner" without a transactional, idempotent backfill — breaking live sessions and `sb-biz-*` cookie auth mid-cutover

**What goes wrong:**
Every existing `business_accounts.user_id` row must become the permanent "owner" of a new `companies` row (or equivalent), and `business_paikka_links.business_account_id` must be repointed from `auth.users.id` to the new `companies.id`. If this migration is not done as a single transaction with idempotent inserts (`INSERT ... ON CONFLICT DO NOTHING`/`SELECT FOR UPDATE` guards), a partial failure mid-migration (e.g. Supabase connection drop, as already noted as an accepted risk in this project's Phase 53 history — "Ei varmuuskopiota... hyväksytty riski") leaves some companies migrated and others not, and any Route Handler written against the *new* schema will throw or silently misbehave for un-migrated rows. Because `sb-biz-*` session cookies are still valid JWTs referencing the old `auth.uid()`, a logged-in business user can hit a half-migrated state where their `auth.uid()` maps to an old-style `business_accounts.user_id` row but new code expects a `company_members` row — producing 403s/empty dashboards for existing live businesses, not just new ones.

**Why it happens:**
This project has direct precedent for a destructive, non-transactional migration going wrong: Phase 53's Google Places data wipe ("operaattori valitsi täyden 327/327-tyhjennyksen" instead of the planned provenance-preserving 322/327 partial delete) cost 2 business accounts their claimed venues with "ei seurantatoimenpiteitä tehty." The same operational risk pattern — an irreversible all-or-nothing migration choice made under live-gate pressure — applies here, but the blast radius is worse: this migration affects *every* existing business account's ability to log in and see their data, not just deleted venue rows.

**How to avoid:**
- Write the migration as: (1) `INSERT INTO companies (id, company_name, ...) SELECT gen_random_uuid(), company_name, ... FROM business_accounts` — generate new company IDs, don't reuse `user_id` as `company_id` (keeps the identity/company concepts cleanly separated going forward); (2) `INSERT INTO company_members (user_id, company_id, role) SELECT user_id, <new company id>, 'owner' FROM business_accounts` in the same transaction; (3) repoint `business_paikka_links.business_account_id` FK to the new `companies.id` via an `UPDATE ... FROM` join, still in the same transaction.
- Run the entire migration in one `BEGIN/COMMIT` block so Postgres guarantees all-or-nothing — no partial-migration state is ever observable to application code.
- Take an actual `pg_dump`/Supabase backup or snapshot immediately before running, given the explicit precedent of "no backup, accepted risk" causing unrecovered data loss last milestone. Do not repeat that pattern for an auth-adjacent migration — broken login is worse than missing venue photos.
- Keep old `business_accounts` table/columns readable (do not drop them in the same phase) so a fast rollback is possible if the new schema has a bug discovered post-migration; drop legacy columns in a later cleanup phase only after the new model is verified live.

**Warning signs:** Any migration script that does per-row application-level loops (e.g. a Node script calling Supabase REST per `business_accounts` row) instead of a single SQL transaction — this is slower, non-atomic, and was exactly how Phase 53's cleanup also had operational risk.

**Phase to address:** Schema-migration phase, executed and verified before any access-request UI ships, with an explicit backup/rollback step gated by human approval (the project already has precedent for a "live-gate" decision point — reuse that pattern here).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse `business_accounts.user_id` as `company_id` directly (skip creating a `companies` table) | Less migration code, fewer new tables | Re-introduces the identity/company conflation this milestone is meant to fix; second employee still has no home row | Never — defeats the purpose of the milestone |
| Allow any company member to remove any other member (including the owner) | Simpler permission model, less role logic | Risk of self-lockout (last approver removes themselves) or hostile employee locking out the owner | Never for the owner row; acceptable for non-owner members removing other non-owner members if owner removal is hard-blocked |
| Skip cooldown on re-requesting access after rejection | Faster to ship | Email spam loop (Pitfall 5), perceived as a bug by recipients | Never — cooldown is cheap to add (one timestamp column + one check) |
| Notify all company members on every request/approval without exclusion logic | Simplest fan-out code | Self-notification spam, recipients tune out real alerts | Acceptable only as a temporary v1 of the feature if explicitly flagged as a known gap, fixed within the same phase before shipping |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Supabase RLS + multi-tenant membership | Writing `auth.uid() = company_id` style direct equality after the migration (copy-pasting the old pattern) | Always use an `EXISTS`/`IN` subquery against `company_members` with an active-status filter, backed by a composite index |
| Resend email notifications | Sending to a hardcoded "the business account email" assumption (singular) when company now has N members | Fetch the recipient list per-event (requester, approver, or all active members minus the actor) explicitly each time — never assume one email per company |
| `sb-biz-*` session cookies during migration | Treating the migration as purely a DB change with no auth-session implication | Verify that existing logged-in sessions (valid JWT, old-shape data) degrade gracefully or force a clean re-auth/refresh after migration, rather than 500ing on a missing `company_members` row |
| Existing `reapply` UPDATE-not-INSERT pattern (for `business_paikka_links.claim_status`) | Building access-request resubmission as a fresh `INSERT`, which can collide with `UNIQUE` constraints copied from the old schema | Mirror the `reapply` idiom: `UPDATE access_requests SET status='pending' WHERE status='rejected' AND id=...`, and add a cooldown timestamp check beforehand |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Unindexed `EXISTS` subquery in RLS policies | Business dashboard queries slow down disproportionately as companies grow members | Composite index on `company_members(company_id, user_id, status)` from day one of the migration | Becomes noticeable once any company has >5-10 members or the venues table grows past current ~hundreds of rows |
| N+1 email lookups during multi-member notification fan-out | Approve/reject route latency grows with company member count | Batch-fetch all active member emails in one query (`auth.admin` bulk lookup or a denormalized `email` column on `company_members`) rather than looping `getUserById` per member | Noticeable once a company has more than a handful of members; today's `admin/approve` route already does one `getUserById` per approval — fine for 1 recipient, not for N |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-supplied `company_id` on an access-request INSERT instead of deriving it server-side from the authenticated venue/link row | Attacker requests access to a company they were never invited to / cross-company data exposure | Server resolves `company_id` from the target venue (`business_paikka_links.paikka_id` → owning company), never from request body, mirroring the existing `register` route's "never trust body.user_id" pattern |
| Allowing the request-target employee to approve their own access request | Privilege self-escalation — a malicious actor could submit and self-approve | Server-side check: `approved_by != requested_by`, enforced in the Route Handler in addition to any RLS/UI hiding |
| Relying solely on RLS to prevent removed members from acting, with no server-side re-check in the Route Handler | RLS gaps (Pitfall 2) become full authorization bypasses since this app's writes go through the service-role key in Route Handlers, which bypasses RLS entirely | Route Handlers performing privileged actions (approve/reject/remove) must independently re-verify the actor's active membership and role server-side before writing — do not assume RLS is the only gate, since service-role writes skip RLS by design in this codebase |
| Email-based invite flow leaking whether an email is already a registered business user | Account enumeration via response timing/content differences | Return identical generic responses regardless of whether the invited email exists yet |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Pending access request shown with no indication of who can approve it, or how long it might take | Requester thinks the feature is broken, contacts support or re-requests repeatedly (feeding Pitfall 5) | Show requester-facing status: "Waiting for approval from [owner name/role]", with the cooldown-gated re-request CTA only after rejection |
| No distinction between "Pending" (new feature) and "Kesken" (existing onboarding-draft status, already established in this app's `/business` dashboard per Phase 57) | Visual/status confusion — two different "in progress" badge meanings on the same dashboard | Use a visually distinct status pill/copy for access requests vs. the existing onboarding "Kesken" badge, consistent with the project's existing badge-color conventions in CLAUDE.md |
| Removing the last non-owner member silently changes nothing visible to the owner | Owner doesn't realize membership changed; no audit trail visible | Show a lightweight activity/audit list per company (who joined, who was removed, when) — cheap to add now, expensive to retrofit later |

## "Looks Done But Isn't" Checklist

- [ ] **RLS migration:** Often missing the composite index on `company_members` — verify with `EXPLAIN ANALYZE` that membership-check queries use an index scan, not a sequential scan, once more than a handful of test rows exist.
- [ ] **Owner protection:** Often missing a hard block on removing/demoting the original `business_accounts` owner — verify by attempting to remove the owner via the API directly (not just hiding the button in UI) and confirming a 403/409.
- [ ] **Concurrent approve/reject:** Often "working" in manual single-click testing but missing the conditional-update guard — verify by firing two simultaneous approve requests (e.g. via two terminal `curl` calls) against the same request id and confirming exactly one succeeds.
- [ ] **Email fan-out exclusions:** Often missing self-exclusion logic — verify by approving your own submitted request (if technically possible) or having the approver check their own inbox after approving someone else's request.
- [ ] **Migration backfill:** Often missing a backup/rollback step — verify a Supabase point-in-time recovery or manual `pg_dump` exists and is timestamped immediately before the migration runs, not after.
- [ ] **Orphaned pending requests:** Often missing reassignment/expiry logic when the only approver is removed — verify by removing the sole non-owner approver while a request is pending and confirming the request doesn't silently stall forever.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| RLS leak (cross-company data visible) | HIGH | Immediately disable the affected policy (revert to `DENY ALL` temporarily), audit logs for unauthorized reads if logging exists, patch policy with `EXISTS` + status filter, re-enable, add regression test |
| Partial migration (some companies migrated, some not) | HIGH | Restore from pre-migration backup if data integrity is in question; otherwise write a reconciliation script that detects `business_accounts` rows with no matching `company_members` row and backfills them idempotently |
| Duplicate-request email spam discovered in production | LOW | Add cooldown column via a fast follow-up migration; manually unsubscribe/mute via a feature flag if Resend rate limits are at risk |
| Last-approver-removed deadlock on a pending request | LOW | Manual admin/DB intervention to reassign `approved_by` rights to the owner; then ship the auto-reassignment logic from Pitfall 4 |
| Owner accidentally removed via a missed guard | MEDIUM | Re-insert the `company_members` row for the original owner manually via service-role; add the hard-block guard before re-enabling the remove-member feature |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| `user_id` overloaded as identity+company (Pitfall 1) | Schema-migration phase | New `companies`/`company_members` tables exist; no RLS policy still reads `auth.uid() = business_account_id` directly (grep check) |
| RLS subquery performance/correctness (Pitfall 2) | Schema-migration phase | `EXPLAIN ANALYZE` shows index usage; a real (non-service-role) authenticated test confirms removed members get zero rows |
| Concurrent approve/reject race (Pitfall 3) | Access-request feature phase | Two concurrent approve calls against the same request id: exactly one 200, one 409 |
| Orphaned requests / dangling membership on removal (Pitfall 4) | Access-request feature phase | Attempting to remove the sole approver/owner is blocked; pending requests do not silently stall when their approver is removed |
| Email spam/duplicate-request loops (Pitfall 5) | Access-request feature phase | Self-notification exclusion verified manually; cooldown enforced on re-request after rejection |
| Migration risk for existing `business_accounts` rows (Pitfall 6) | Schema-migration phase, gated by human approval before execution | Backup/snapshot exists pre-migration; migration runs as a single transaction; existing live business logins verified working post-migration |

## Sources

- Direct repository inspection: `supabase/migrations/20260605000000_business_accounts.sql` (1:1 `user_id` PK/FK model, `UNIQUE(paikka_id)` constraint, RLS policy shapes)
- Direct repository inspection: `app/api/admin/approve/route.ts` (conditional-update-with-count-check pattern already solving concurrent-approval races for the existing claim flow — the canonical pattern to replicate)
- Direct repository inspection: `app/api/business/register/route.ts` (never-trust-client-supplied-identity pattern, dangling-auth-user accepted-risk precedent)
- `.planning/PROJECT.md` Key Decisions log: Phase 53 Google Places full-wipe incident ("Ei varmuuskopiota, hyväksytty riski") — direct precedent for migration/backup risk in this exact codebase
- `.planning/PROJECT.md` Key Decisions log: Phase 35 `reapply` UPDATE-not-INSERT pattern — direct precedent for resubmission-after-rejection idiom to replicate in the access-request flow
- `.planning/PROJECT.md` Future/deferred list: "Ketjuadmin (yksi tili, useita toimipisteitä eri omistajilla)" explicitly deferred in CLAIM-05/v3.0 — confirms multi-owner-per-venue was already recognized as a related-but-separate problem from this milestone's multi-user-per-company scope; do not conflate the two when scoping the migration

---
*Pitfalls research for: multi-user-per-company + peer access-request flow on existing single-account Supabase/Postgres + RLS SaaS*
*Researched: 2026-06-24*
