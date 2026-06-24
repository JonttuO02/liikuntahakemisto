# Research Summary — Liikuntahakemisto v3.1

**Project:** Liikuntahakemisto (Finnish sports-venue directory)
**Milestone:** v3.1 — Multi-user-per-company peer-to-peer access-request flow
**Domain:** B2B SaaS team/workspace access — employee requests management access to shared venue, colleague approves
**Researched:** 2026-06-24
**Confidence:** HIGH (stack, architecture, pitfalls grounded in direct codebase inspection; features validated against industry patterns)

## Executive Summary

v3.1 adds multi-user-per-company business accounts with peer-to-peer access-request approval. This is a pure data-modeling and RLS-policy problem — the existing Postgres/Supabase stack handles it natively with no new dependencies. The core change introduces a `companies` table, a `business_access_requests` table, and RLS policies checking same-company membership.

**Recommended approach:** Add new tables as additive migrations, introduce `SECURITY DEFINER` SQL helper function (a proven pattern already used in this codebase), and sequence work in two layers: (1) schema/RLS foundation allowing multiple employees per company, then (2) UX layer (request form, pending list, approve/reject buttons, emails).

**Key risks:** (1) RLS recursion, mitigated by `SECURITY DEFINER` functions; (2) Cross-row authorization requires database-level uniqueness constraints; (3) Pre-existing in-flight onboarding state requires careful coordination; (4) `UNIQUE(business_account_id, paikka_id)` constraint on `business_paikka_links` is load-bearing and must be explicitly reviewed.

## Key Findings

### Recommended Stack

No new runtime technologies. Build with **Postgres + Supabase RLS + Resend** (all existing).

**Core technologies:**
- **Postgres `companies` table** — New entity separate from login. Enables one-to-many employee logins per company.
- **Postgres `business_access_requests` table** — Dedicated lifecycle table, separate from `business_paikka_links`.
- **Supabase RLS + `SECURITY DEFINER` SQL functions** — Same-company checks via `current_company_id()` helper (existing pattern precedent).
- **Postgres composite uniqueness** — `UNIQUE(business_account_id, paikka_id)` prevents double-claims.
- **Resend (existing)** — Email notifications, reuses existing pattern with new templates.

### Expected Features

**Must have (P1):**
- Employee-to-company data model + RLS rewrite (foundation)
- Request-access entry point (venue name search)
- Pending-request list on approver's dashboard
- Approve/Reject buttons
- Email notifications (request, approval, rejection)
- RLS-enforced zero access for pending requester
- Requester pending-state UI

**Should have (P2):**
- Audit log of request/approval actions
- Self-service remove-colleague

**Defer (P3+):**
- Role levels (owner vs. member)
- Request expiry/reminders
- In-app notification badge
- Domain-based auto-approval (explicitly rejected)

### Critical Pitfalls

1. **RLS same-table-recursion** — Use `SECURITY DEFINER` helper like existing pattern
2. **Service-role write paths** — Code must re-verify ownership, never assume RLS protection
3. **TOCTOU race on approval** — `UNIQUE(requester_account_id, paikka_id)` prevents duplicate pending requests
4. **Constraint change** — `UNIQUE(paikka_id)` to `UNIQUE(business_account_id, paikka_id)` is load-bearing
5. **Cross-row authorization queries** — Require EXPLAIN ANALYZE review for performance

## Implications for Roadmap

### Phase 1: Multi-user Data Model & RLS Foundation
**Rationale:** Foundation layer — must exist before Phase 2
**Delivers:** `companies` table, `business_accounts.company_id` FK, RLS rewrite, `current_company_id()`, constraint update, backfill
**Research flags:** YES — RLS performance verification during `/gsd-plan-phase`. Recommend EXPLAIN ANALYZE.

### Phase 2: Request Submission & Approval UX
**Rationale:** UX layer — builds on Phase 1
**Delivers:** `business_access_requests` table, request handler + form, request list, approve/reject handler, 3 email templates, requester pending-state UI
**Research flags:** NO — well-documented SaaS patterns (Slack, GitHub). Minimal novel risk.

### Phase 3: Audit Logging (Optional, P2)
**Rationale:** Cheap insurance — append-only table, no UI at launch
**Delivers:** `business_access_log` table, logging triggers
**Research flags:** NO — straightforward append-only. Can defer after Phase 2.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct inspection of existing migrations validates. No new dependencies. |
| Features | HIGH | Validated against Slack/GitHub/Notion patterns. Grounded in scope. |
| Architecture | HIGH | Components identified from codebase. Sequencing forced by dependencies. |
| Pitfalls | HIGH | Direct schema inspection, existing TOCTOU precedent, Postgres anti-patterns. |

**Overall confidence:** HIGH

### Gaps to Address

1. **RLS performance** — Query plans must be validated against production-scale data
2. **Approval workflow edge cases** — Product decisions on duplicate requests, deleted logins
3. **Multi-employee testing** — Fixtures may assume single-employee accounts
4. **Backfill completeness** — Pre-phase audit of in-flight onboarding_draft rows

---

**Research completed:** 2026-06-24
**Ready for roadmap:** YES
