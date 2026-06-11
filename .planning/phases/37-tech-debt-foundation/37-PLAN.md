# Phase 37: Tech Debt Foundation — Plan

**Phase goal:** Data-integriteetti- ja turvallisuusaukot suljetaan ennen uusien ominaisuuksien rakentamista — business_managed asetetaan claim-hetkellä, wizard-auth siirretään RSC guardiin, /admin ja /business suojataan middleware-tasolla, ja kuollut kolumni poistetaan.

**Requirements:** DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05, BIZUX-01

**Wave structure overview:**
| Wave | Plans | Autonomous |
|------|-------|------------|
| 1 | 37-01, 37-02, 37-03, 37-04 | yes, yes, yes, yes |
| 2 | 37-05, 37-06 | yes, yes |

Wave 1 plans are fully independent — no shared files, each addresses a distinct code location. Wave 2 plans depend on Wave 1: 37-05 (wizard cleanup) requires the layout.tsx RSC guard from 37-02 to exist first; 37-06 (DROP COLUMN migration) depends on the write removal in 37-04.

---

## Plan 37-01: Middleware redirect for /admin and /business (DEBT-03)

**Wave:** 1 (parallel with 37-02, 37-03, 37-04 — touches only `middleware.ts`)
**Requirements:** DEBT-03
**Depends on:** —

### Goal

Add path-based redirect logic to `middleware.ts` so that unauthenticated visitors to any `/admin/*` or `/business/*` route are redirected to `/kirjaudu` at the Edge layer — before any HTML is served. The existing session-refresh call is preserved.

### Tasks

1. **Read** `middleware.ts` (29 lines, current state provided in codebase_facts).

   Edit `middleware.ts`: after the `let response = NextResponse.next({ request })` line and before the `createServerClient` call, insert path-based redirect logic using `request.nextUrl.pathname.startsWith('/business')` and `request.nextUrl.pathname.startsWith('/admin')` (per D-06, D-07).

   The check must use the **cookie-based session** to decide whether to redirect. The existing `supabase.auth.getUser()` call already parses the session cookie — use its return value. Change `await supabase.auth.getUser()` from discarding its return value to capturing it: `const { data: { user } } = await supabase.auth.getUser()`. Then after that call, add:

   ```
   const isProtectedPath =
     request.nextUrl.pathname.startsWith('/business') ||
     request.nextUrl.pathname.startsWith('/admin')
   if (isProtectedPath && !user) {
     return NextResponse.redirect(new URL('/kirjaudu', request.url))
   }
   ```

   Return `response` at the end as before. Do NOT add a `?redirect=` query param (no redirect-back is specified in decisions — this is Claude's discretion, and simplicity wins here). Do NOT change the `config.matcher` — it already covers these paths.

   The `createServerClient` call and cookie plumbing remain unchanged. Only the return value of `getUser()` is captured and used.

### Acceptance Criteria

- `middleware.ts` calls `const { data: { user } } = await supabase.auth.getUser()` (not discarding the return value).
- Source contains `request.nextUrl.pathname.startsWith('/business')`.
- Source contains `request.nextUrl.pathname.startsWith('/admin')`.
- Source contains `NextResponse.redirect(new URL('/kirjaudu', request.url))`.
- The redirect is conditional on `!user` — authenticated users pass through normally.
- `npx tsc --noEmit` passes.

### Files Changed

- `middleware.ts` — capture getUser() return value; add isProtectedPath redirect block

---

## Plan 37-02: RSC auth guard — app/business/layout.tsx (DEBT-01 + BIZUX-01)

**Wave:** 1 (parallel with 37-01, 37-03, 37-04 — creates a new file, no conflicts)
**Requirements:** DEBT-01, BIZUX-01
**Depends on:** —

### Goal

Create `app/business/layout.tsx` as a minimal async Server Component that checks auth via `createServerSupabase().auth.getUser()` and calls `redirect('/kirjaudu')` for unauthenticated users. Authenticated users receive `{children}` with no wrapper elements. This RSC guard is the authoritative auth check for all `/business/*` routes — it makes the redundant client-side checks in the wizard components removable (done in Wave 2 plan 37-05).

### Tasks

1. Read `app/business/page.tsx` to confirm the `createServerSupabase(cookies())` auth pattern used there (the same pattern applies to the new layout).

   Create `app/business/layout.tsx` as an async React Server Component (no `'use client'` directive).

   The file must:
   - Import `redirect` from `'next/navigation'`.
   - Import `cookies` from `'next/headers'`.
   - Import `createServerSupabase` from `'@/lib/supabaseSSR'`.
   - Export a default async function `BusinessLayout({ children }: { children: React.ReactNode })`.
   - Inside: call `const supabase = createServerSupabase(cookies())` (synchronous `cookies()` — Next.js 14.2.x, per codebase_facts). Call `const { data: { user } } = await supabase.auth.getUser()`. If `!user`, call `redirect('/kirjaudu')`. Otherwise return `<>{children}</>` (no wrapper divs, no providers — per D-01, D-02, CONTEXT.md specifics).

   This layout sits in `app/business/` and the Next.js App Router will automatically apply it to all sub-routes: `onboarding/`, `rekisteroidy/`, `[id]/`, and `page.tsx`. No import wiring needed.

### Acceptance Criteria

- `app/business/layout.tsx` exists.
- File does NOT contain `'use client'`.
- File exports a default async function (source contains `export default async function`).
- Source contains `createServerSupabase(cookies())`.
- Source contains `await supabase.auth.getUser()`.
- Source contains `redirect('/kirjaudu')` inside an `if (!user)` check.
- Return value is `<>{children}</>` with no wrapper elements.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/business/layout.tsx` — new RSC auth guard (create)

---

## Plan 37-03: claim-paikka sets business_managed=true (DEBT-02)

**Wave:** 1 (parallel with 37-01, 37-02, 37-04 — touches only `app/api/business/claim-paikka/route.ts`)
**Requirements:** DEBT-02
**Depends on:** —

### Goal

Merge `business_managed: true` into the existing `liikuntapaikat` UPDATE in `claim-paikka/route.ts` so the flag is set atomically at claim time. This prevents sync-script runs after the claim from clobbering the flag. The `business_managed` column already exists (migration `20260605000001_business_managed.sql` confirmed in codebase_facts).

### Tasks

1. **Read** `app/api/business/claim-paikka/route.ts` lines 54–61 (key section provided in codebase_facts).

   Edit the `.update({ is_claimed: true })` call at lines 54–61 to include `business_managed: true` in the same object: `.update({ is_claimed: true, business_managed: true })`. No other changes to the file. Error handling pattern remains unchanged — log on failure, do not rollback the claim (per D-05).

### Acceptance Criteria

- `app/api/business/claim-paikka/route.ts` contains `.update({ is_claimed: true, business_managed: true })` (single UPDATE call with both fields).
- The file does NOT contain a separate `.update({ business_managed: true })` call (one merged call only).
- `npx tsc --noEmit` passes.

### Files Changed

- `app/api/business/claim-paikka/route.ts` — merge business_managed: true into existing liikuntapaikat UPDATE

---

## Plan 37-04: submit route — remove onboarding_completed write + scope draft delete (DEBT-04 + DEBT-05)

**Wave:** 1 (parallel with 37-01, 37-02, 37-03 — touches only `app/api/business/onboarding/submit/route.ts`)
**Requirements:** DEBT-04, DEBT-05
**Depends on:** —

### Goal

Two surgical edits to `onboarding/submit/route.ts`: (1) remove the Step 5 `onboarding_completed: true` UPDATE block entirely (per D-08), and (2) add `.eq('paikka_id', draft.paikka_id)` to the Step 6 draft DELETE so multi-venue accounts cannot accidentally delete the wrong venue's draft (per D-10).

### Tasks

1. **Read** `app/api/business/onboarding/submit/route.ts` in full to identify exact line numbers for both edits before modifying (key sections described in codebase_facts: Step 5 is lines 100–110, Step 6 delete is lines 112–121).

   **Edit 1 — Remove Step 5 block (DEBT-04, per D-08):** Delete the entire block at approximately lines 100–110:
   ```
   const { error: completedError } = await supabaseAdmin
     .from('business_accounts')
     .update({ onboarding_completed: true })
     .eq('user_id', user.id)
   if (completedError) {
     console.error('[onboarding/submit] onboarding_completed UPDATE failed (non-critical):', completedError.message)
   }
   ```
   Remove this block in its entirety. Do NOT remove Step 5a (lines 88–98, the `claim_status` reset to `'pending'`) — that block is unrelated and must stay.

   **Edit 2 — Scope draft delete (DEBT-05, per D-10):** In the Step 6 draft DELETE (approximately lines 112–121), add `.eq('paikka_id', draft.paikka_id)` as a second condition after `.eq('business_account_id', user.id)`. The `draft` object is already in scope at this point (loaded earlier in the function). The result must be:
   ```
   .from('onboarding_draft')
   .delete()
   .eq('business_account_id', user.id)
   .eq('paikka_id', draft.paikka_id)
   ```

### Acceptance Criteria

- `app/api/business/onboarding/submit/route.ts` does NOT contain `onboarding_completed` anywhere.
- File does NOT contain `.update({ onboarding_completed: true })`.
- The draft DELETE chain contains both `.eq('business_account_id', user.id)` and `.eq('paikka_id', draft.paikka_id)`.
- Step 5a (`claim_status` reset to `'pending'`) is still present and unchanged.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/api/business/onboarding/submit/route.ts` — remove onboarding_completed UPDATE block; add paikka_id scope to draft delete

---

## Plan 37-05: Wizard auth cleanup — remove client-side auth checks (DEBT-01)

**Wave:** 2 (depends on 37-02 — layout.tsx RSC guard must exist before client auth checks are removed)
**Requirements:** DEBT-01
**Depends on:** 37-02

### Goal

Remove the now-redundant client-side auth checks from `OnboardingWizardInner.tsx` and `EditWizardInner.tsx`. The `app/business/layout.tsx` RSC guard (created in 37-02) guarantees that no unauthenticated user reaches these components, so the client-side checks are dead code that also cause auth flash.

### Tasks

1. **Read** `app/business/onboarding/OnboardingWizardInner.tsx` lines 55–70 (key section provided in codebase_facts).

   Edit `OnboardingWizardInner.tsx`: in the `loadDraft` `useEffect`, remove only the auth-redirect branch — the four lines starting with `if (!user) {` through the closing `}` (lines 59–62 per codebase_facts). Keep the `const { data: { user } } = await supabase.auth.getUser()` call because `user.id` is used in the subsequent DB queries for loading the draft. Keep all other draft-loading logic unchanged (per D-03).

   The resulting `loadDraft` function opens with `getUser()`, captures `user`, and proceeds directly to the DB query using `user.id` — without the early-return guard.

2. **Read** `app/business/[id]/EditWizardInner.tsx` lines 20–66 (key section provided in codebase_facts).

   Edit `EditWizardInner.tsx`: remove the following items (per D-04):
   - Line 25: `const [authChecked, setAuthChecked] = useState(false)` — remove this state declaration.
   - Lines 27–41: the entire `useEffect(() => { async function checkAuth() { ... } checkAuth() }, [router])` block — remove in full.
   - Lines 60–66: the `if (!authChecked) { return (<div>...</div>) }` early-return guard — remove in full.
   - If `router` is no longer used after removing the `checkAuth` effect (check all remaining usages in the file), remove the `const router = useRouter()` declaration too. If `router` is still used elsewhere in the component (e.g., for navigation), keep it.

### Acceptance Criteria

- `OnboardingWizardInner.tsx` does NOT contain `if (!user) { setLoading(false); return }` (the auth-redirect branch is gone).
- `OnboardingWizardInner.tsx` still contains `supabase.auth.getUser()` (the call itself is kept).
- `EditWizardInner.tsx` does NOT contain `checkAuth` anywhere.
- `EditWizardInner.tsx` does NOT contain `authChecked` anywhere.
- `EditWizardInner.tsx` does NOT contain the `if (!authChecked)` guard.
- `npx tsc --noEmit` passes.

### Files Changed

- `app/business/onboarding/OnboardingWizardInner.tsx` — remove auth-redirect branch from loadDraft useEffect (lines 59–62)
- `app/business/[id]/EditWizardInner.tsx` — remove checkAuth useEffect, authChecked state, and loading guard

---

## Plan 37-06: Drop onboarding_completed column — Supabase migration (DEBT-04)

**Wave:** 2 (depends on 37-04 — the write must be removed from code before the column is dropped)
**Requirements:** DEBT-04
**Depends on:** 37-04

### Goal

Create a Supabase migration that drops the `onboarding_completed` column from `business_accounts`. The column write was removed in 37-04; this migration makes the removal permanent at the DB level. The column is confirmed unread anywhere in the codebase (per codebase_facts).

### Tasks

1. Create `supabase/migrations/20260611000000_drop_onboarding_completed.sql`.

   File contents (per D-08, D-09 — no IF EXISTS guard, clean removal):
   ```
   ALTER TABLE business_accounts DROP COLUMN onboarding_completed;
   ```

   Single statement, no transaction wrapper needed for a column drop.

2. Apply the migration to the local Supabase instance by running:
   ```
   npx supabase db push
   ```
   or if using `supabase migration up`:
   ```
   npx supabase migration up
   ```

   Confirm the command completes without error. If the local DB is not running, start it first with `npx supabase start`.

### Acceptance Criteria

- `supabase/migrations/20260611000000_drop_onboarding_completed.sql` exists.
- File contains `ALTER TABLE business_accounts DROP COLUMN onboarding_completed`.
- File does NOT contain `IF EXISTS` (per D-09).
- Migration applies without error (`supabase db push` exits 0, or migration shows as applied in `supabase migration list`).
- After migration, running `npx supabase db diff` shows no pending changes for `onboarding_completed`.
- `npx tsc --noEmit` passes (TypeScript should not reference this column anywhere after 37-04 removed the write).

### Files Changed

- `supabase/migrations/20260611000000_drop_onboarding_completed.sql` — DROP COLUMN migration (create)

---

## Source Audit

| Source | Item | Covered by |
|--------|------|-----------|
| GOAL | business_managed asetetaan claim-hetkellä | 37-03 |
| GOAL | wizard-auth siirretään RSC guardiin | 37-02, 37-05 |
| GOAL | /admin ja /business suojataan middleware-tasolla | 37-01 |
| GOAL | kuollut kolumni poistetaan | 37-04, 37-06 |
| DEBT-01 | Auth flash eliminated — RSC guard replaces client-side useEffect auth checks | 37-02, 37-05 |
| DEBT-02 | claim-paikka sets business_managed=true at claim time | 37-03 |
| DEBT-03 | middleware.ts redirects unauthenticated /admin/* and /business/* to /kirjaudu | 37-01 |
| DEBT-04 | onboarding_completed column dropped; write removed from submit route | 37-04, 37-06 |
| DEBT-05 | Draft delete scoped by paikka_id | 37-04 |
| BIZUX-01 | app/business/layout.tsx RSC guard for all /business/* routes | 37-02 |
| D-01 | business/layout.tsx checks auth only, no business_accounts query | 37-02 |
| D-02 | Unauthenticated → redirect('/kirjaudu') | 37-01, 37-02 |
| D-03 | OnboardingWizardInner: remove only auth-redirect branch, keep getUser() call | 37-05 |
| D-04 | EditWizardInner: remove entire checkAuth useEffect + authChecked state + guard | 37-05 |
| D-05 | claim-paikka: merge business_managed=true into same UPDATE as is_claimed=true | 37-03 |
| D-06 | middleware: startsWith('/business') and startsWith('/admin') path checks | 37-01 |
| D-07 | Same /kirjaudu redirect target for both /admin and /business | 37-01 |
| D-08 | Drop onboarding_completed via migration; remove write from submit route | 37-04, 37-06 |
| D-09 | No IF EXISTS in migration | 37-06 |
| D-10 | Draft delete: add .eq('paikka_id', draft.paikka_id) | 37-04 |

---

## Phase Verification

### Must-haves

1. Kirjautumaton käyttäjä, joka navigoi suoraan `/business/dashboard` tai `/admin`-osoitteeseen, ohjataan `/kirjaudu`-sivulle ennen kuin sivu latautuu (middleware redirect, DEBT-03).
2. `app/business/layout.tsx` on olemassa, on async Server Component, ja kutsuu `redirect('/kirjaudu')` jos `!user` (DEBT-01 + BIZUX-01).
3. `EditWizardInner.tsx` ei sisällä `checkAuth`-funktiota eikä `authChecked`-tilaa — ei auth-flashia wizard-sivuilla (DEBT-01).
4. `OnboardingWizardInner.tsx` ei sisällä auth-redirect-haaraa `loadDraft`-funktioissa, mutta `getUser()`-kutsu on edelleen tallella (DEBT-01).
5. `claim-paikka/route.ts` sisältää `.update({ is_claimed: true, business_managed: true })` yhtenä kutsuna (DEBT-02).
6. `onboarding/submit/route.ts` ei sisällä `onboarding_completed` missään muodossa (DEBT-04).
7. `onboarding/submit/route.ts` draft DELETE -ketjussa on sekä `.eq('business_account_id', user.id)` että `.eq('paikka_id', draft.paikka_id)` (DEBT-05).
8. `supabase/migrations/20260611000000_drop_onboarding_completed.sql` on olemassa ja sisältää `ALTER TABLE business_accounts DROP COLUMN onboarding_completed` (DEBT-04).
9. `npx tsc --noEmit` läpäisee ilman virheitä kaikkien muutosten jälkeen.
