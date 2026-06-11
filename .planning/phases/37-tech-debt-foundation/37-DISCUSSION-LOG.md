# Phase 37: Tech Debt Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 37-tech-debt-foundation
**Areas discussed:** RSC guard depth, onboarding_completed column, Middleware redirect target

---

## RSC Guard Depth (DEBT-01 + BIZUX-01)

### What should app/business/layout.tsx verify server-side?

| Option | Description | Selected |
|--------|-------------|----------|
| Auth only | Check that the user has a Supabase session — unauthenticated → redirect. Fast: one getUser() call, no DB query. | ✓ |
| Auth + business_accounts row | Check session AND that the user has a business_accounts row. Matches exactly what the old useEffect in EditWizardInner checked, but now server-side. | |
| Auth + business_accounts row + claim | Full check: session, business_accounts row, AND at least one paikka_id in business_paikka_links. Adds 2 DB queries on every /business page load. | |

**User's choice:** Auth only
**Notes:** Existing Route Handlers already verify business ownership at the API boundary. The layout guard's job is to prevent auth flash, not to duplicate ownership checks.

---

### When the RSC guard removes the auth useEffect, what stays client-side?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove auth redirect only | Delete the 'if (!user) redirect' logic from the useEffect, keep draft-loading logic in OnboardingWizardInner. EditWizardInner loses the entire useEffect. | ✓ |
| Remove entire useEffect + loading=false guard | Delete the full useEffect from both wizards; OnboardingWizardInner's draft loading moves to a separate useEffect. | |

**User's choice:** Remove auth redirect only
**Notes:** OnboardingWizardInner's useEffect mixes auth check with draft loading. Only the auth-redirect branch is removed; the draft loading remains client-side.

---

## onboarding_completed Column (DEBT-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Drop the column via migration | Add a Supabase migration that removes the column entirely. Clean removal — no dormant field. | ✓ |
| Remove writes only, keep column | Delete the onboarding_completed=true write from submit route. Column stays in DB but stops being updated. | |

**User's choice:** Drop the column via migration
**Notes:** Column is confirmed never-read. Dropping it prevents future confusion. Requirements explicitly allowed either option; user chose the cleaner one.

---

## Middleware Redirect Target (DEBT-03)

### Where should unauthenticated /business/* visitors be redirected?

| Option | Description | Selected |
|--------|-------------|----------|
| /kirjaudu | The business login page. Most natural entry point for business users. | ✓ |
| / | The consumer homepage. Simpler single target but confusing for business users. | |

**User's choice:** /kirjaudu

---

### Where should unauthenticated /admin visitors be redirected?

| Option | Description | Selected |
|--------|-------------|----------|
| /kirjaudu | Same destination as /business. Admins log in via the same Supabase auth. | ✓ |
| / | The consumer homepage. Separate target for /admin vs /business. | |

**User's choice:** /kirjaudu
**Notes:** There is no separate admin login page. Admins authenticate via the same /kirjaudu flow. Consistent redirect target for all protected routes.

---

## Claude's Discretion

- Exact middleware path-check pattern (startsWith string check vs regex)
- Whether to add a `?redirect=` param to the /kirjaudu redirect URL
- Migration timestamp and filename for the DROP COLUMN migration

## Deferred Ideas

None — discussion stayed strictly within the six debt items.
