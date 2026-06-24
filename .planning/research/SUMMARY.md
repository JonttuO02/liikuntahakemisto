# Project Research Summary

**Project:** Liikuntahakemisto
**Domain:** B2B SaaS team/workspace access — multi-user-per-company business accounts with peer access-request/approval, layered onto an existing Next.js 14 + Supabase venue-directory business portal
**Researched:** 2026-06-24
**Confidence:** HIGH

## Executive Summary

This is a data-modeling and RLS-policy problem, not a new-technology problem — no new npm packages or services are needed. The existing stack (Postgres + Supabase RLS + Resend) expresses the whole feature natively: a `companies` table to decouple "company" from "login," a `role` column distinguishing one **päähallitsija** (primary manager/owner) from sub-managers, and a `business_access_requests` table for the request/approve/reject lifecycle.

**Resolved during research:** STACK.md and ARCHITECTURE.md initially proposed contradictory access models — STACK.md recommended co-management (multiple employees hold simultaneous access to one venue), ARCHITECTURE.md recommended a hand-off (approval transfers the sole management slot, original manager loses access). The user has confirmed **co-management is correct**, with one added constraint: each venue has exactly one "päähallitsija" (primary manager) who is the only person who can approve/reject access requests and remove sub-managers; sub-managers cannot approve others. This requires loosening `business_paikka_links`'s existing `UNIQUE(paikka_id)` constraint to a composite `UNIQUE(business_account_id, paikka_id)` plus a `role` column (`owner` / `member`) — STACK.md's schema direction, refined with the explicit single-owner-approves rule. ARCHITECTURE.md's hand-off design should be discarded.

**Central risk:** `business_accounts.user_id` is currently overloaded as simultaneously the auth identity, the company's primary key, and the FK target every other table points at. This conflation must be resolved by a dedicated `companies` table before any request/approve UX can work — it is the gating prerequisite, not parallel work, and it is the single largest structural change in the milestone.

**Success requires:** sequencing the schema migration (companies, roles, loosened constraint, RLS rewrite) strictly before the request/approve feature work; running the migration as one transaction with a pre-migration backup (this project has direct precedent for an unbacked, irreversible migration losing data — Phase 53's Google Places wipe); and replicating the existing `admin/approve` route's conditional-update-with-count-check concurrency pattern rather than reinventing it for peer approval.

## Key Findings

### Recommended Stack

No new runtime technologies. The capability is fully solvable with Postgres DDL, Supabase RLS, and the existing Resend integration — confirmed by direct inspection of `supabase/migrations/20260605000000_business_accounts.sql` and the existing `set_business_managed_on_approval()` `SECURITY DEFINER` trigger, which already proves this codebase's RLS idiom for cross-row checks.

**Core technologies:**
- Postgres (existing Supabase) — new `companies` table, `role` column on `business_accounts`, new `business_access_requests` table — already the system of record, no new infra
- Supabase RLS + one `SECURITY DEFINER` helper function (`current_company_id()`) — resolves cross-row "same company" checks without same-table RLS recursion — pattern already proven in this codebase
- Resend (existing) — two new email senders appended to `lib/email.ts`, same call shape as existing admin-approval emails — no new provider
- `@supabase/ssr` / `sb-biz-*` cookie namespace (existing) — no change; every new employee is just another `auth.users` row plus a `business_accounts` row

**Explicitly avoid:** a generic authorization/policy library (CASL, Oso, Cerbos, Permit.io), an ORM, or a new auth provider (Clerk/WorkOS/Stytch) — all unjustified scope for a single relationship ("same company, one approves, others request") that two or three RLS policies already express.

### Expected Features

This request/approve pattern is extremely well-established (Slack workspace joins, GitHub org access requests, Notion/Figma team requests) — it is a well-trodden UX problem, not a novel one.

**Must have (table stakes):**
- Request-access entry point — employee searches for the venue they want to help manage and submits a request (not a company-name search, since employees know "the gym I work at")
- Pending-request list visible to the päähallitsija, rendered inside the existing `/business` dashboard
- Approve / Reject buttons with immediate effect, restricted to the päähallitsija only
- Email notification to the päähallitsija when a request arrives (Resend, reusing the `ADMIN-01` pattern)
- Email notification to the requester on approval/rejection, optional reason on rejection (mirrors `ADMIN-03`/`ADMIN-04`)
- Explicit "pending" waiting state shown to the requester, with zero leaked venue-management access until approved
- Päähallitsija can remove a sub-manager's access

**Should have (competitive, but cheap — recommend including at MVP):**
- Audit log of request/approve/reject/remove actions — append-only, no UI required at launch, cheap insurance
- Cooldown on re-requesting after rejection (mirrors the existing `reapply` UPDATE-not-INSERT idiom)

**Defer (v2+):**
- Role levels beyond owner/member (e.g. finer-grained permissions) — flat member access is sufficient per the user's confirmed model
- Self-service "leave/remove" beyond owner-initiated removal
- In-app notification badge (email-only is sufficient at this scale)
- Request expiry/reminders — defer until real usage shows abandoned requests are a problem
- Domain-based auto-approval — explicitly rejected as an anti-feature (Finnish small businesses commonly use generic consumer email domains, making this both unhelpful and a security hole)

### Architecture Approach

A `companies` table becomes the entity venues' management roles attach to, decoupling "company" from "login." `business_accounts` gains `company_id` (FK) and `role` (`owner`/`member`). `business_paikka_links` keeps `business_account_id` but its `UNIQUE(paikka_id)` constraint loosens to `UNIQUE(business_account_id, paikka_id)`, allowing multiple employees of the same company to each hold their own link row to the same venue. A new `business_access_requests` table tracks the pending/approved/rejected lifecycle, separate from `business_paikka_links` so "an active grant" and "a pending request" are never conflated.

**Major components:**
1. `companies` + `business_accounts.company_id`/`role` — decouples company identity from login identity; backfilled from existing `business_accounts` rows (each becomes its own company, owner role) in one transaction
2. `business_access_requests` table — requester, target `paikka_id`, status, `decided_by`, `rejection_reason` — mirrors the existing `business_paikka_links.claim_status` vocabulary
3. `current_company_id()` `SECURITY DEFINER` helper — avoids RLS recursion on same-table policies, same pattern already used by `set_business_managed_on_approval()`
4. New Route Handlers under `app/api/business/access-requests/` (create, list, `[id]/approve`, `[id]/reject`) — mirror `admin/approve`/`admin/reject`'s JWT-verify + conditional-update-with-count-check pattern exactly
5. Dashboard UI (`AccessRequestsPanel`, `RequestAccessButton`) inside the existing `/business` page — sequence **after** this milestone's dashboard redesign phase (both touch `app/business/page.tsx`)
6. `lib/email.ts` additions — two new senders, same Resend singleton and `sub()`/`esc()` escaping helpers

### Critical Pitfalls

1. **`user_id` overloaded as both identity and company** — every existing RLS policy and FK assumes 1 login = 1 company; fix by introducing `companies` + role-bearing `business_accounts.company_id`, never by adding a second `business_accounts` row with a matching name string.
2. **Unindexed/incorrect RLS subqueries** — converting `auth.uid() = x` to `EXISTS` checks against company membership needs a composite index and must filter on an active/role status, or removed members silently retain access.
3. **Race condition on concurrent approve/reject** — must replicate the existing `admin/approve` route's `UPDATE ... WHERE status = 'pending'` + `count: 'exact'` pattern exactly; a check-then-act `SELECT` followed by `UPDATE` allows two simultaneous approvals to both "succeed."
4. **Owner removal / orphaned requests** — the päähallitsija role must be permanent and un-removable via this flow (never demote/remove the original account holder), or a company can end up with zero approvers and permanently stuck pending requests.
5. **Migration risk on the `business_accounts` → `companies` backfill** — must run as a single transaction with a pre-migration backup; this project has direct precedent (Phase 53's unbacked Google Places wipe) for an irreversible migration causing unrecovered data loss, and this migration is auth-adjacent — broken login is worse than that incident.

## Implications for Roadmap

Based on research, suggested phase structure for the multi-user/access-request feature (one workstream within the broader v3.1 milestone, which also includes the admin bugfix, dashboard redesign, page consolidation, and onboarding reorder covered elsewhere in REQUIREMENTS.md):

### Phase A: Multi-company schema migration
**Rationale:** Gating prerequisite — nothing in the request/approve feature can work until "company" exists as an entity independent of "login." Must be its own reviewed phase, not folded into feature work.
**Delivers:** `companies` table, `business_accounts.company_id`/`role` columns, transactional backfill (every existing account becomes a single-owner company), loosened `business_paikka_links` constraint, `current_company_id()` helper, rewritten RLS policies, composite index.
**Addresses:** the data-model foundation for all "Must have" features above.
**Avoids:** Pitfall 1 (identity/company conflation), Pitfall 5 (unbacked migration risk) — requires an explicit backup/rollback gate before execution, mirroring the live-gate pattern already used in Phase 53.

### Phase B: Access-request Route Handlers + email
**Rationale:** Depends only on Phase A's schema; independent of the dashboard-redesign and other v3.1 UI work, so it can proceed in parallel with those.
**Delivers:** `business_access_requests` table, create/list/approve/reject Route Handlers (mirroring `admin/approve`'s concurrency-safe pattern), two new Resend senders, owner-only approval enforcement, owner-removal hard-block.
**Uses:** existing Resend integration, existing JWT-verify pattern from `register`/`admin/approve` routes.
**Implements:** `business_access_requests` lifecycle component from Architecture Approach.

### Phase C: Dashboard UI integration
**Rationale:** Should land after — or be carefully coordinated with — the "/business dashboard → DiagonaalKortti redesign" phase elsewhere in this milestone, since both touch `app/business/page.tsx`. Building this UI against the old list-view layout would be throwaway work.
**Delivers:** `AccessRequestsPanel` (päähallitsija-facing pending-request list with approve/reject), `RequestAccessButton` (shown when viewer isn't yet a manager of a venue), requester-facing pending-state UI, sub-manager removal control for the päähallitsija.

### Phase Ordering Rationale

- Phase A is a strict prerequisite for B and C — the schema must exist before any route or UI can read/write it.
- B and C can be sequenced independently of each other in principle, but C should follow this milestone's separate dashboard-redesign phase to avoid file-level conflicts and throwaway UI work.
- None of A/B/C block or are blocked by this milestone's admin-bugfix, page-consolidation, or onboarding-reorder work — those are unrelated code paths.

### Research Flags

Phases likely needing deeper research/scrutiny during planning:
- **Phase A:** RLS policy performance once the `EXISTS`-subquery pattern replaces direct equality — verify with `EXPLAIN ANALYZE` that the composite index is actually used, not just assumed.
- **Phase A:** the exact pre-migration backup/rollback mechanism (Supabase point-in-time recovery vs. manual `pg_dump`) should be confirmed operationally before the migration is written, given this project's prior unbacked-migration incident.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase B:** the concurrency-safe approve/reject pattern already exists verbatim in `admin/approve/route.ts` — copy, don't reinvent.
- **Phase C:** request/approve dashboard UX is a well-documented SaaS pattern (Slack/GitHub/Notion precedent) with no novel UI problem to solve.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against this repo's existing migrations and an already-shipped `SECURITY DEFINER` precedent; zero new dependencies |
| Features | MEDIUM-HIGH | The request/approve pattern itself is extremely well-established industry-wide; codebase-specific dependency claims are HIGH, general UX-pattern claims are MEDIUM (industry consensus, not a single primary spec) |
| Architecture | HIGH | Grounded directly in existing migrations and route code (`admin/approve`, `register`, `business_accounts` schema) — but see the resolved STACK/ARCHITECTURE conflict above; this summary reflects the co-management model the user confirmed, not ARCHITECTURE.md's original hand-off recommendation |
| Pitfalls | HIGH | Derived from direct inspection of this codebase's schema/RLS/routes plus this project's own incident history (Phase 53 migration risk, Phase 35 reapply pattern, Phase 38 TOCTOU bug) |

**Overall confidence:** HIGH, with one resolved design conflict (see Executive Summary) and one open product detail below.

### Gaps to Address

- **Venue lookup UX for the requester:** how does an employee identify "the venue my colleague manages" — by venue name search, or a shared deep link? Not architecturally blocking, but should be confirmed during `/gsd-discuss-phase` for Phase C.
- **Audit log scope:** confirm during planning whether the append-only action log ships in Phase A's schema or is deferred to a fast-follow — it's cheap either way and was recommended as a "should have."
- **Multi-draft / in-flight account interaction:** confirm no existing `onboarding_draft` or pending-claim rows are affected by the `companies` backfill (likely none, since this migration only touches `business_accounts`/`business_paikka_links` shape, not venue data) — worth a quick pre-migration audit query regardless.

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `supabase/migrations/20260605000000_business_accounts.sql` — existing 1:1 `user_id` PK/FK model, `UNIQUE(paikka_id)` constraint, RLS policy shapes
- `supabase/migrations/20260611000001_approval_trigger.sql` — existing `SECURITY DEFINER` precedent (`set_business_managed_on_approval`)
- `app/api/admin/approve/route.ts` / `app/api/admin/reject/route.ts` — conditional-update-with-count-check concurrency pattern to replicate
- `app/api/business/register/route.ts` — never-trust-client-supplied-identity convention
- `lib/email.ts` — Resend singleton, `sub()`/`esc()` escaping helpers, env var conventions
- `.planning/PROJECT.md` — Phase 53 migration-risk precedent, Phase 35 reapply pattern, Phase 38 TOCTOU bug, deferred "Ketjuadmin" scope note

### Secondary (MEDIUM confidence — industry pattern consensus)
- Slack/GitHub/Notion/Figma request-to-join and org-access-request UX conventions — general product knowledge, internally consistent across sources, not independently re-verified against current vendor docs

---
*Research completed: 2026-06-24*
*Ready for roadmap: yes*
