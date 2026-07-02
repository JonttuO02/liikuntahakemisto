# Phase 64: Hallintaoikeuspyynnöt — dashboard-UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 64-Hallintaoikeuspyynnöt — dashboard-UI
**Areas discussed:** Pending-requests entry point, Team & removal UI, Reject interaction detail, Owner self-protection UX

---

## Todo cross-reference

| Todo | Fold in? |
|------|----------|
| Block business accounts from logging into customer site | Left deferred (Recommended) |

**User's choice:** Leave deferred.
**Notes:** Already reviewed and deferred once in Phase 63 as a different domain (auth/session boundary). Re-confirmed unrelated to access-request/team management.

---

## Pending-requests entry point

### Q1: Where should the owner see pending requests?

| Option | Description | Selected |
|--------|-------------|----------|
| Icon on the card | 5th icon button on DiagonaalKortti controls panel, opens popup listing requesters with approve/reject | ✓ |
| Separate section on /business | Dedicated "Pending access requests" list across all owned venues | |
| Both | Icon badge + top-of-page section | |

**User's choice:** Icon on the card.

### Q2: What should each pending request row show?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + email + approve/reject buttons | Requester's business_accounts info plus inline buttons | ✓ |
| Email only + buttons | Just email plus approve/reject | |
| You decide | Claude picks based on available fields | |

**User's choice:** Name + email + approve/reject buttons.
**Notes:** This triggered a correction — `business_accounts` has no name field (dropped Phase 59). Follow-up asked below.

### Q3 (correction): Email-only vs. add a name field, given no name column exists

| Option | Description | Selected |
|--------|-------------|----------|
| Email only | Fetched via service-role Route Handler, no schema change | |
| Add a name field | New scope: name-collection column + input somewhere | ✓ |

**User's choice:** Add a name field.

### Q4 (scope-creep check): Where should the name come from?

| Option | Description | Selected |
|--------|-------------|----------|
| Add a name input to invite-link signup now | Expands Phase 64 into the deferred signup-via-invite-link flow | ✓ |
| Email only for now | Keep Phase 64 scoped to dashboard UI, revisit name collection later | |

**User's choice:** Add a name input to invite-link signup now.
**Notes:** User confirmed twice after being shown this touches Phase 60's explicitly deferred "polished signup-via-invite-link onboarding UX." Locked as D-05/D-06 in CONTEXT.md — not to be redirected back to "defer" during planning.

---

## Team & removal UI

### Q1: Where does the owner see/manage the current team?

| Option | Description | Selected |
|--------|-------------|----------|
| Same popup as pending requests | One popup, two sections (pending requests + current team) | ✓ |
| Separate icon/popup | Dedicated "Team" icon, distinct from requests | |

**User's choice:** Same popup as pending requests.

### Q2: Confirmation step before removing a sub-manager?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, confirm dialog | Lightweight confirm before DELETE fires | ✓ |
| No, one-click remove | Immediate removal, no confirm | |

**User's choice:** Yes, confirm dialog.

### Q3: Email notification on removal?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, notify by email | New sendAccessRemovedEmail function | |
| No email, silent removal | DB update only, member finds out via RLS/UI | ✓ |

**User's choice:** No email, silent removal.

---

## Reject interaction detail

### Q1: Should the UI offer a reason text field when rejecting?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline optional text field | Small optional textarea, mirrors admin rejection pattern | |
| One-click reject, no reason field | Reject fires immediately, rejection_reason stays null | ✓ |

**User's choice:** One-click reject, no reason field.

---

## Owner self-protection UX

### Q1: How should the team list handle the owner's own row?

| Option | Description | Selected |
|--------|-------------|----------|
| Owner never listed | List only shows role='member' rows | |
| Owner shown, remove control disabled | Owner appears labeled, remove icon visibly disabled | ✓ |

**User's choice:** Owner shown, remove control disabled.

---

## Claude's Discretion

- Exact icon choice for the combined team-management entry point (Users/UserPlus/UserCog from lucide-react)
- Exact column name for the new `business_accounts` name field (display_name/requester_name/contact_name)
- Whether the team-list/removal read uses a new RLS SELECT policy or a service-role Route Handler
- Exact UI copy for the owner's disabled remove control and the removal confirm-dialog text
- Whether the popup reuses/extends `RejectionReasonPopup.tsx` or is built as a new component

## Deferred Ideas

- Full polished signup-via-invite-link onboarding UX (Phase 60's original deferred item) — only the minimal name field is added, not a full onboarding redesign
- In-app notification badge/bell system for pending requests — explicitly Out of Scope per REQUIREMENTS.md
- Removal email notification — explicitly declined (D-11), not just unaddressed
- Company-wide `business_paikka_links` visibility widening — still re-deferred, remains open beyond Phase 64
- "Block business accounts from logging into customer site" todo — reviewed again, left deferred (different domain)
