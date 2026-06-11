# Phase 37: Tech Debt Foundation - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Six security and data-integrity gaps in the v1.7 business portal are closed before any new features are built. No new user-visible functionality — only correctness fixes:

1. **DEBT-01 + BIZUX-01**: Auth flash eliminated — `app/business/layout.tsx` RSC guard replaces client-side `useEffect` auth checks in `OnboardingWizardInner` and `EditWizardInner`.
2. **DEBT-02**: `claim-paikka/route.ts` sets `business_managed=true` at claim time so sync-script runs after claim don't clobber that flag.
3. **DEBT-03**: `middleware.ts` redirects unauthenticated visitors from `/admin/*` and `/business/*` to `/kirjaudu` — no DB query, no HTML served.
4. **DEBT-04**: `onboarding_completed` column dropped from `business_accounts` via migration; write removed from submit route.
5. **DEBT-05**: Draft delete in `onboarding/submit` scoped by `paikka_id` to prevent multi-venue cross-deletion.

Requirements: DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, BIZUX-01

</domain>

<decisions>
## Implementation Decisions

### RSC Auth Guard (DEBT-01 + BIZUX-01)

- **D-01:** `app/business/layout.tsx` — new async Server Component. Checks **auth only**: `createServerSupabase().auth.getUser()`. No `business_accounts` DB query in the layout (that check belongs at individual route level if needed).
- **D-02:** Unauthenticated user → `redirect('/kirjaudu')`. Authenticated user → layout renders children normally.
- **D-03:** `OnboardingWizardInner.tsx` cleanup — remove only the **auth-redirect branch** from the `loadDraft` useEffect (the `if (!user) { setLoading(false); return }` part). Keep the rest of the draft-loading logic client-side; the layout already guarantees auth.
- **D-04:** `EditWizardInner.tsx` cleanup — remove the **entire `checkAuth` useEffect** (auth was its only responsibility). The `authChecked` state and the `if (!authChecked)` guard can be removed too — the RSC guard handles this server-side now.

### claim-paikka business_managed (DEBT-02)

- **D-05:** `app/api/business/claim-paikka/route.ts` — add `business_managed: true` to the `liikuntapaikat` UPDATE that already sets `is_claimed: true`. Same non-critical error handling pattern — log on failure, don't rollback the claim.

### Middleware redirect (DEBT-03)

- **D-06:** `middleware.ts` — add path-based redirect logic: if request path starts with `/business` or `/admin` AND session cookie is absent → `NextResponse.redirect(new URL('/kirjaudu', request.url))`. No DB query — Edge Runtime constraint maintained.
- **D-07:** Same redirect target (`/kirjaudu`) for both `/admin` and `/business`. There is no separate admin login page; admins use the same Supabase auth flow.

### onboarding_completed column (DEBT-04)

- **D-08:** **Drop the column** via a new Supabase migration (`ALTER TABLE business_accounts DROP COLUMN onboarding_completed`). Remove the corresponding write in `app/api/business/onboarding/submit/route.ts` (Step 5 block: the `onboarding_completed: true` UPDATE).
- **D-09:** Do not add `IF EXISTS` guard to the migration — this is a clean removal, not a conditional one.

### Draft delete scope (DEBT-05)

- **D-10:** `app/api/business/onboarding/submit/route.ts` draft DELETE — add `.eq('paikka_id', draft.paikka_id)` after `.eq('business_account_id', user.id)`. The `draft.paikka_id` is already available in scope at that point in the code.

### Claude's Discretion

- Exact matcher pattern in `middleware.ts` for detecting `/admin` and `/business` path prefixes (startsWith check vs regex)
- Whether to add a `?redirect=` query param to the `/kirjaudu` redirect URL so the login page can redirect back after successful auth
- Migration timestamp and filename for the DROP COLUMN migration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, BIZUX-01 (Phase 37 requirements)
- `.planning/ROADMAP.md` §Phase 37 — Success criteria and phase details

### Files being modified
- `middleware.ts` — current state: session-refresh only; DEBT-03 adds redirect logic
- `app/business/onboarding/OnboardingWizardInner.tsx` — current state: auth check inside loadDraft useEffect; DEBT-01 removes the auth-redirect branch
- `app/business/[id]/EditWizardInner.tsx` — current state: full checkAuth useEffect; DEBT-01 removes it entirely
- `app/api/business/claim-paikka/route.ts` — current state: sets is_claimed=true but not business_managed; DEBT-02 adds business_managed=true
- `app/api/business/onboarding/submit/route.ts` — current state: writes onboarding_completed=true (Step 5) and deletes draft without paikka_id scope; DEBT-04 removes the write, DEBT-05 adds paikka_id scope to delete

### New files
- `app/business/layout.tsx` — RSC auth guard (DEBT-01 + BIZUX-01); does not exist yet
- `supabase/migrations/YYYYMMDDXXXXXX_drop_onboarding_completed.sql` — DROP COLUMN migration (DEBT-04)

### Prior phase context (architecture decisions)
- `.planning/phases/34-onboarding-velhou/34-CONTEXT.md` — onboarding_draft table, wizard structure, draft lifecycle
- `.planning/phases/35-admin-hyvaksyntajarjestelma/35-CONTEXT.md` — admin Server Component auth pattern (same pattern business/layout.tsx uses)
- `.planning/phases/36-hallintapaneeli/36-CONTEXT.md` — Edit wizard structure, business/[id] routing

### Auth and Supabase patterns
- `lib/supabaseSSR.ts` — `createServerSupabase()` for RSC auth check in business/layout.tsx
- `lib/supabaseAdmin.server.ts` — service role client; used in Route Handlers (not in the layout)

### i18n
- `messages/fi.json` and `messages/en.json` — no new business strings expected for this phase (all fixes are non-visible)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/admin/page.tsx` — existing Server Component auth pattern (getUser + is_admin check); business/layout.tsx follows the same RSC guard shape but simpler (auth only, no role check)
- `app/business/page.tsx` — existing Server Component with createServerSupabase() auth guard; copy the getUser call pattern
- `lib/supabaseSSR.ts#createServerSupabase()` — already used in other business Server Components; use this for the layout guard

### Established Patterns
- **RSC auth guard pattern:** `const supabase = createServerSupabase(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/kirjaudu')` — visible in `app/business/page.tsx` and `app/admin/page.tsx`
- **Middleware session refresh:** existing `middleware.ts` already calls `supabase.auth.getUser()` to refresh the cookie — the redirect logic wraps around this, not replaces it
- **Route Handler UPDATE pattern:** `app/api/business/claim-paikka/route.ts` line 54-61 — the UPDATE that needs business_managed=true added alongside is_claimed=true

### Integration Points
- `app/business/layout.tsx` — new file; sits above all `/business/*` pages in the App Router hierarchy. Next.js App Router will automatically apply it to: onboarding, rekisteroidy, [id], and page.tsx
- `middleware.ts` config.matcher — current matcher already covers `/business` and `/admin` paths (it's a broad catch-all); only the redirect logic needs adding

### Affected files summary
| File | Change type | Debt item |
|---|---|---|
| `middleware.ts` | Edit: add redirect logic | DEBT-03 |
| `app/business/layout.tsx` | New file: RSC guard | DEBT-01 + BIZUX-01 |
| `app/business/onboarding/OnboardingWizardInner.tsx` | Edit: remove auth-redirect branch | DEBT-01 |
| `app/business/[id]/EditWizardInner.tsx` | Edit: remove checkAuth useEffect | DEBT-01 |
| `app/api/business/claim-paikka/route.ts` | Edit: add business_managed=true to UPDATE | DEBT-02 |
| `app/api/business/onboarding/submit/route.ts` | Edit: remove onboarding_completed write + scope draft delete | DEBT-04, DEBT-05 |
| `supabase/migrations/YYYYMMDD_drop_onboarding_completed.sql` | New file: DROP COLUMN | DEBT-04 |

</code_context>

<specifics>
## Specific Ideas

- `business/layout.tsx` — keep it minimal: auth check + redirect + `{children}`. No wrapper divs, no providers. The existing `app/business/page.tsx` can remain as-is; the layout wraps it automatically.
- Middleware redirect: check path with `request.nextUrl.pathname.startsWith('/business')` and `startsWith('/admin')` — simple string checks, no regex needed.
- `claim-paikka/route.ts` DEBT-02 fix: the `is_claimed` and `business_managed` updates happen in the same UPDATE call on `liikuntapaikat` — merge into one `.update({ is_claimed: true, business_managed: true })`.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed strictly within the six debt items. No scope creep occurred.

</deferred>

---

*Phase: 37-tech-debt-foundation*
*Context gathered: 2026-06-11*
