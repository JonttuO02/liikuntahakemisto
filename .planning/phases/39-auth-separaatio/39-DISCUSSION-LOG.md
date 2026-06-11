# Phase 39: Auth-Separaatio - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 39-auth-separaatio
**Areas discussed:** Login page (/business/kirjaudu), Middleware redirect target, Session migration, rekisteroidy page migration

---

## Login page (/business/kirjaudu)

| Option | Description | Selected |
|--------|-------------|----------|
| Email + password only | Matches rekisteroidy style. Simpler, no OAuth setup needed. | ✓ |
| Email + password + Google OAuth | Reuse existing OAuth infrastructure. More setup. | |

**User's choice:** Email + password only
**Notes:** B2B use case, simpler is better.

---

| Option | Description | Selected |
|--------|-------------|----------|
| /business dashboard | Direct to dashboard after login — same as rekisteroidy does post-registration. | ✓ |
| Back to originally-requested URL | Redirect to returnTo param. More work to implement. | |

**User's choice:** /business dashboard
**Notes:** Standard flow, no need for returnTo complexity.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Link to /business/kirjaudu | Simple navigation, no more AuthModal on business pages. | ✓ |
| Keep AuthModal but wire to business client | Technically doable but mixes UI patterns. | |

**User's choice:** Link to /business/kirjaudu
**Notes:** Consistent with the business-is-separate theme.

---

## Middleware redirect target

| Option | Description | Selected |
|--------|-------------|----------|
| /business/kirjaudu | Natural landing for unauthenticated business user. | ✓ |
| /business/rekisteroidy | Better than /, but returning users want login not registration. | |

**User's choice:** /business/kirjaudu
**Notes:** Correct — returning users want to log in, not re-register.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, exclude from guard | Both rekisteroidy and kirjaudu are public entry points. | |
| You decide | Claude handles the exclusion detail. | ✓ |

**User's choice:** Claude decides
**Notes:** Obvious that both public entry points must be excluded; Claude handles the implementation detail.

---

## Session migration / forced re-login

| Option | Description | Selected |
|--------|-------------|----------|
| Silent forced re-login — redirect to kirjaudu | No migration handling needed. | |
| Show a one-time notice on kirjaudu | Brief message "please log in again". Extra polish. | |

**User's choice:** Free text — "It was already planned that all existing business accounts will be deleted"
**Notes:** All existing business accounts are test accounts. Phase 40 (CLEAN-01) will delete them. No migration handling whatsoever is needed — just let the redirect do its job.

---

## rekisteroidy page migration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — use business client | New accounts immediately in sb-biz-* namespace. | ✓ |
| Keep consumer client for now | Defer; new business users start in consumer namespace. | |

**User's choice:** Yes — use business client
**Notes:** Full separation from the first moment of registration.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — business client for recovery check | Consistent recovery via business client. | ✓ |
| You decide | Claude handles this detail. | |

**User's choice:** Yes — business client for recovery check
**Notes:** Recovery check and normal flow both use the business client throughout.

---

## Claude's Discretion

- Exact `@supabase/ssr` API for cookie namespace override (storageKey vs cookieOptions.name vs manual prefix filtering)
- Which additional paths beyond rekisteroidy and kirjaudu are excluded from the business middleware guard
- Whether `createBusinessBrowserClient()` exposes a `subscribeToAuthUser`-style helper or just the raw client

## Deferred Ideas

- Google OAuth for business login — email + password is sufficient for now
- BIZUX-03, BIZUX-04, BIZUX-05 — Business User UX features remain in "Future Requirements" (see `.planning/phases/39-business-user-ux/39-CONTEXT.md`)
