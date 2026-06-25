# Phase 60: Hallintaoikeuspyynnöt — backend & sähköposti - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 60-Hallintaoikeuspyynnöt — backend & sähköposti
**Areas discussed:** Venue lookup UX, Post-approval access scope, UI surface in this phase, Request table & edge cases

---

## Venue lookup UX

| Option | Description | Selected |
|--------|-------------|----------|
| Search by name/address | Type-ahead against the public liikuntapaikat table; matches ACCESS-03's literal wording | |
| Shared deep link | Owner generates/shares a link manually; no search UI needed | ✓ |
| Both | Search primary, deep link as convenience | |

**User's choice:** Shared deep link.
**Notes:** User elaborated: signup itself should happen after opening the link (full onboarding for that scenario deferred to later), and the owner-approval model ("every venue has a mainowner that accepts the newly signed profiles") controls access correctly without a search UI.

| Disambiguation option | Selected |
|---|---|
| Show address alongside name | (moot — superseded by deep-link decision) |
| Only show venues with existing owner | (moot) |
| Both | (moot) |

| Company-scope option | Selected |
|---|---|
| Search is open, request creates the company link | (moot — superseded by deep-link decision) |
| Requester must already belong to same company | (moot) |

---

## Post-approval access scope

| Option | Description | Selected |
|--------|-------------|----------|
| Widen to company-wide now | Rewrite business_paikka_links RLS to current_company_id() — delivers what Phase 59 deferred | |
| Grant access to just the requested venue | Narrower; re-defers company-wide widening to Phase 64 | ✓ |

**User's choice:** Grant access to just the requested venue.

| Approval write path option | Description | Selected |
|---|---|---|
| Route Handler via service role | Mirrors admin/approve — supabaseAdmin does the write, concurrency-safe UPDATE...WHERE pending | ✓ |
| RLS-permitted owner UPDATE | New RLS policy letting owner write another user's business_accounts row | |

**User's choice:** Route Handler via service role.

---

## UI surface in this phase

| Option | Description | Selected |
|--------|-------------|----------|
| Bare-minimum status page only | One simple "odottaa hyväksyntää" banner on /business | ✓ |
| Zero UI — email only | ACCESS-06 satisfied by the decision email alone | |

**User's choice:** Bare-minimum status page only.

| Link generation option | Description | Selected |
|---|---|---|
| Manual URL construction | Owner builds the link by hand from the paikka_id in their own dashboard URL | |
| One small "Copy invite link" button | Tiny UI addition removing guesswork | ✓ |

**User's choice:** One small "Copy invite link" button.

---

## Request table & edge cases

| Duplicate-submit option | Description | Selected |
|---|---|---|
| UNIQUE constraint, idempotent re-submit | Second submit while pending returns the existing request | ✓ |
| UNIQUE constraint, reject with 409 | Second submit errors, matching admin/approve's 409 pattern | |

**User's choice:** UNIQUE constraint, idempotent re-submit.

| Already-member option | Description | Selected |
|---|---|---|
| Block with a clear error | Reject at submission — one account, one company | ✓ |
| Allow — approval would reassign company_id | Riskier, no requirement calls for it | |

**User's choice:** Block with a clear error.

| Invalid-link option | Description | Selected |
|---|---|---|
| Reject at submission with a friendly error | Validates owner exists before creating the request row | ✓ |
| Allow — creates an orphan pending request | Simpler but leaves dangling state | |

**User's choice:** Reject at submission with a friendly error.

---

## Claude's Discretion

- Exact `business_access_requests` table columns beyond requester_id, paikka_id, status, timestamps, and the partial UNIQUE constraint.
- Exact wording/placement of the "Pyyntösi odottaa hyväksyntää" banner and the "Copy invite link" button within `/business`.
- Whether the new-employee signup-via-link flow reuses the existing business registration form as-is or needs a thin wrapper.

## Deferred Ideas

- Polished signup-via-invite-link onboarding UX (user's own framing: "later we could make an onboarding for that scenario").
- Company-wide `business_paikka_links` visibility widening — re-deferred from Phase 59 to Phase 64 or later.
- Full request-management dashboard (approve/reject list, sub-manager removal) — already Phase 64 scope (ACCESS-04/ACCESS-07).
- Name/address search for venues — superseded by the deep-link decision; noted in case ACCESS-03's literal wording is revisited.
