# Phase 39: Auth-Separaatio - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Consumer- and business-side auth sessions are fully separated via cookie namespaces:
- `/business/*` routes and `/api/business/*` + `/api/admin/*` handlers use a new `createBusinessServerClient()` / `createBusinessBrowserClient()` pair from `lib/supabase-business.ts`, which stores tokens in the `sb-biz-*` cookie namespace
- Consumer routes continue using the existing `createBrowserSupabase()` / `createServerSupabase()` pair (`sb-*` namespace)
- Middleware is updated to refresh the correct session per route prefix
- A new `/business/kirjaudu` login page is created (email + password)
- Existing `/business/rekisteroidy` is migrated to use the business client

This phase delivers AUTHSEP-01 through AUTHSEP-07. All cleanup (CLEAN-01 through CLEAN-05) is Phase 40.

**Note on old Phase 39 directory:** `.planning/phases/39-business-user-ux/` is a leftover from the deferred v1.8 Business User UX phase (BIZUX-03/04/05). Those requirements are now in the "Future Requirements" section of REQUIREMENTS.md. That directory is historical reference only — this is the canonical Phase 39 context.

</domain>

<decisions>
## Implementation Decisions

### lib/supabase-business.ts (AUTHSEP-01)
- **D-01:** Create `lib/supabase-business.ts` exporting `createBusinessServerClient(cookieStore)` and `createBusinessBrowserClient()`.
- **D-02:** Both clients use the `sb-biz-*` cookie namespace. Implementation mechanism (e.g., `auth.storageKey` option, cookie prefix filtering, or `cookieOptions.name` if supported by `@supabase/ssr` version in use) is Claude's discretion — choose the approach that is cleanest with the installed package version.
- **D-03:** `createBusinessBrowserClient()` follows a singleton pattern (same as `createBrowserSupabase()` in `lib/supabaseSSR.ts`) to avoid multiple auth listener registrations.

### Route migration (AUTHSEP-02, AUTHSEP-03, AUTHSEP-04)
- **D-04:** All `/business/*` pages (RSC and client) switch to `createBusinessServerClient()` / `createBusinessBrowserClient()`. Consumer pages (`/`, `/profiili`, `/suosikit`, etc.) stay on existing clients.
- **D-05:** All `/api/business/*` and `/api/admin/*` Route Handlers switch to `createBusinessServerClient()` for session verification. `supabaseAdmin.auth.getUser(token)` (JWT Bearer verification) is auth-agnostic — no change needed there.

### Middleware (AUTHSEP-05)
- **D-06:** Single `middleware.ts` with path-conditional logic: if `pathname.startsWith('/business')` refresh `sb-biz-*` session (business client); otherwise refresh `sb-*` session (consumer client). Two separate session refreshes per request are NOT needed — each request hits only one branch.
- **D-07:** Unauthenticated `/business/*` requests redirect to `/business/kirjaudu` (was previously `/`).
- **D-08:** Claude decides which paths are excluded from the business auth guard. At minimum: `/business/rekisteroidy` and `/business/kirjaudu` (both public entry points — must not redirect-loop).

### /business/kirjaudu — new login page (AUTHSEP-06)
- **D-09:** New page at `app/business/kirjaudu/page.tsx`. Email + password only — no Google OAuth.
- **D-10:** After successful login, redirect to `/business` dashboard.
- **D-11:** Page layout mirrors `app/business/rekisteroidy/page.tsx` (glass card, centered, same input/button styles).
- **D-12:** Includes a link to `/business/rekisteroidy` for new users ("Ei tiliä? Rekisteröidy").

### /business/rekisteroidy migration
- **D-13:** Replace `createBrowserSupabase()` with `createBusinessBrowserClient()` throughout `app/business/rekisteroidy/page.tsx`. This includes both the `detectRecovery` check and the `handleSubmit` flow — new business accounts land immediately in the `sb-biz-*` namespace.
- **D-14:** The "sign in" button that currently opens `<AuthModal>` is replaced with a plain link to `/business/kirjaudu`. `AuthModal` import is removed from this page.

### Session migration
- **D-15:** No special migration handling needed. All existing business accounts are test accounts and will be deleted in Phase 40 (CLEAN-01). Unauthenticated redirects to `/business/kirjaudu` are sufficient.

### Claude's Discretion
- Exact `@supabase/ssr` API for cookie namespace override (storageKey vs cookieOptions.name vs manual prefix filtering) — choose cleanest approach for installed version
- Which additional paths (if any beyond `rekisteroidy` and `kirjaudu`) are excluded from the business middleware guard
- Whether `createBusinessBrowserClient()` exposes a `subscribeToAuthUser`-style helper or just the raw client (follow `lib/supabaseSSR.ts` pattern if useful)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — AUTHSEP-01 through AUTHSEP-07 (Phase 39 scope) and success criteria
- `.planning/ROADMAP.md` §Phase 39 — Goal and success criteria
- `.planning/STATE.md` — Active decisions carried forward (middleware no-DB rule, service role key pattern)

### Files being modified
- `middleware.ts` — path-conditional session refresh + redirect to `/business/kirjaudu` (D-06, D-07, D-08)
- `app/business/rekisteroidy/page.tsx` — swap to business browser client, replace AuthModal link with /business/kirjaudu link (D-13, D-14)
- All `/api/business/*` route handlers — switch to `createBusinessServerClient()` for session verification
- All `/api/admin/*` route handlers — switch to `createBusinessServerClient()` for session verification
- All `/business/*` RSC pages — switch to `createBusinessServerClient()`
- All `/business/*` client components — switch to `createBusinessBrowserClient()`

### New files
- `lib/supabase-business.ts` — `createBusinessServerClient()` and `createBusinessBrowserClient()` (D-01, D-02, D-03)
- `app/business/kirjaudu/page.tsx` — business login page, email + password (D-09 through D-12)

### Existing patterns to follow
- `lib/supabaseSSR.ts` — `createBrowserSupabase()` singleton pattern and `createServerSupabase()` — mirror these for the business equivalents
- `app/business/rekisteroidy/page.tsx` — layout, input/button styling, glass card — replicate for kirjaudu
- `middleware.ts` — existing session refresh + guard pattern — extend with path-conditional logic
- `supabaseAdmin.auth.getUser(token)` in API routes — already auth-agnostic, no change needed

### i18n
- `messages/fi.json` and `messages/en.json` — new strings needed for `/business/kirjaudu` (login title, email/password placeholders, CTA, sign-up link text, error messages)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/business/rekisteroidy/page.tsx` — glass card layout, input styles, submit button styles, error animation — copy all of this for kirjaudu; no need to rebuild from scratch
- `lib/supabaseSSR.ts` `createBrowserSupabase()` singleton — copy this exact singleton pattern for `createBusinessBrowserClient()`
- `lib/supabaseSSR.ts` `createServerSupabase(cookieStore)` — copy this exact pattern for `createBusinessServerClient(cookieStore)`

### Established Patterns
- **Middleware no-DB rule:** `middleware.ts` only refreshes sessions — never queries the database. This constraint remains. The business middleware path also only refreshes the `sb-biz-*` session.
- **JWT Bearer in API routes:** `supabaseAdmin.auth.getUser(token)` is the established pattern for Route Handler auth verification. It uses the service role key and is cookie-namespace-agnostic — no change needed in any Route Handler's verification logic.
- **RSC data fetching:** `createServerSupabase(cookieStore)` is called with `cookies()` from `next/headers`. `createBusinessServerClient()` follows the same calling convention.
- **Singleton browser client:** `createBrowserSupabase()` uses module-level `_browserClient` variable with lazy init. Same approach for business client avoids double auth listener.

### Integration Points
- `middleware.ts` currently has one `createServerClient(...)` call — this becomes two separate client constructions (one for `/business/*`, one for all other paths), each with its own cookie namespace
- `app/business/layout.tsx` is currently just a passthrough (`<>{children}</>`) — no RSC auth guard there (guard is in middleware). This stays as-is.
- Business API routes currently authenticate via JWT Bearer + `supabaseAdmin` — this stays unchanged. The `createBusinessServerClient()` may also be needed for reading session-derived user info in routes that don't use JWT Bearer (if any exist — check during planning).

</code_context>

<specifics>
## Specific Ideas

- The `sb-biz-*` cookie prefix is the naming convention for business session cookies — use this prefix consistently
- `/business/kirjaudu` form: same glass card centered layout as `rekisteroidy`, two inputs (email + password), submit button, link to `/business/rekisteroidy` for new users
- After successful business login, `router.push('/business')` — same as what `rekisteroidy` does post-registration
- Both `createBusinessBrowserClient()` and `createBrowserSupabase()` will be active in the same browser — they are independent singletons writing to different cookie namespaces, so there is no interference

</specifics>

<deferred>
## Deferred Ideas

- BIZUX-03, BIZUX-04, BIZUX-05 — deferred Business User UX features (see `.planning/phases/39-business-user-ux/39-CONTEXT.md` for their full implementation decisions). Still in "Future Requirements" in REQUIREMENTS.md.
- Google OAuth for business login — email + password is sufficient for now

</deferred>

---

*Phase: 39-auth-separaatio*
*Context gathered: 2026-06-12*
