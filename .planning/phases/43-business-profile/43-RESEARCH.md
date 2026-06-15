# Phase 43: Business Profile - Research

**Researched:** 2026-06-15
**Domain:** Next.js RSC + Supabase RLS + next-intl i18n — business profile page within the sb-biz-* auth session
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01**: Only one editable contact field: `contact_phone TEXT NULLABLE`. New migration adds this column to `business_accounts`.
- **D-02**: No `contact_email` or `contact_website` on this page. Venue-level contact info is managed via WizardInner.
- **D-03**: Migration: `ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS contact_phone TEXT;` — nullable, no default, no constraints. RLS already allows UPDATE for own account.
- **D-04**: `app/business/profiili/page.tsx` — RSC wrapper. Fetches `company_name` and `contact_phone` from `business_accounts` using `createBusinessServerClient(cookies())`. Gets auth email from `getUser()`. Passes all as props to client component.
- **D-05**: `app/business/profiili/BusinessProfiiliClient.tsx` — client component (`'use client'`). Receives `companyName`, `email`, `contactPhone` as props. Handles phone input state, save, language toggle, and sign-out.
- **D-06**: If `business_accounts` row is not found for the session user (edge case), RSC redirects to `/business`.
- **D-07**: Direct Supabase browser client for phone save: `createBusinessBrowserClient().from('business_accounts').update({ contact_phone: trimmed }).eq('user_id', user.id)`. RLS `Business updates own account` policy allows this — no Route Handler needed. Mirrors consumer `ProfiiliClient` save pattern.
- **D-08**: Client component obtains `user.id` from `createBusinessBrowserClient().auth.getUser()` on mount (or via prop from RSC via session). Save triggered by button click; optimistic "Tallennettu" feedback for 2.5s.
- **D-09**: Top glass card: `company_name` as heading (`text-sm font-bold`), auth email as subtitle (`text-[rgba(17,17,17,0.45)] text-sm`), 'Yritystili' badge (`text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 rounded-full px-2 py-0.5`).
- **D-10**: Page layout: read-only account card → editable phone card → language toggle card → sign-out button.
- **D-11**: Reuse `app/actions/locale.ts` `changeLocaleAction` verbatim. Call via `useTransition` + `router.refresh()`.
- **D-12**: `createBusinessBrowserClient().auth.signOut()` then `router.push('/business/kirjaudu')`.
- **D-13**: Add profile keys to existing `Business` namespace: `profileTitle`, `profileCompanyName`, `profileEmail`, `profileAccountType`, `profilePhone`, `profilePhonePlaceholder`, `profileSave`, `profileSaved`, `profileSaveError`, `profileLanguage`, `profileSignOut`.

### Claude's Discretion

- Exact `pt-16` vs `pt-20` on `<main>` — follow Phase 42 D-06 value (`pt-16`) unless visually clipped
- Whether phone card and sign-out button are inside a single wrapper or standalone glass cards — separate cards per section (language parity with consumer `/profiili`)
- Error handling for save failure: `text-sm text-red-600` inline below the save button
- Loading skeleton while RSC data arrives: RSC pattern avoids client-side loading; if client-side fetch needed (user.id), show minimal spinner consistent with `app/business/page.tsx` spinner style

### Deferred Ideas (OUT OF SCOPE)

- `contact_email` and `contact_website` on `/business/profiili`
- Admin-facing display of `contact_phone` in the admin approval panel
- Supabase auth email change (login email update)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIZPRO-01 | `/business/profiili` displays company name, email, and account type as read-only | RSC server-fetches `company_name` from `business_accounts` + `email` from `getUser()`; displayed in glass card with 'Yritystili' badge |
| BIZPRO-02 | Editable contact fields (phone only per D-01) saved to `business_accounts.contact_phone` | New migration adds column; browser client UPDATE with existing RLS policy; mirrors ProfiiliClient save pattern |
| BIZPRO-03 | FI/EN language toggle persisting in `NEXT_LOCALE` cookie | `changeLocaleAction` Server Action reused verbatim; `useTransition` + `router.refresh()` pattern confirmed in ProfiiliClient |
| BIZPRO-04 | Sign-out clears `sb-biz-*` session, redirects to `/business/kirjaudu`, consumer session unaffected | `createBusinessBrowserClient().auth.signOut()` confirmed in BusinessNav; sb-biz-* namespace isolation confirmed in lib/supabase-business.ts |
</phase_requirements>

---

## Summary

Phase 43 delivers `/business/profiili` — a four-section profile page for authenticated business users. The implementation is a direct structural mirror of `app/profiili/ProfiiliClient.tsx` (the consumer profile page) adapted to the business auth session (`sb-biz-*`), the `business_accounts` table, and the business i18n namespace.

The work breaks into three parallel tracks: (1) a new DB migration adding `contact_phone TEXT NULLABLE` to `business_accounts`; (2) the RSC page + client component; and (3) i18n key additions to both locale files. No Route Handlers are needed — the phone save goes directly through the browser Supabase client, which is authorized by the existing `Business updates own account` RLS policy.

The `changeLocaleAction` Server Action, `createBusinessBrowserClient`/`createBusinessServerClient` factories, `.glass` utility classes, and `BusinessNav` (auto-inherited from `app/business/layout.tsx`) are all drop-in reuses. The only net-new code is the page RSC, the client component, the migration file, and 11 i18n keys per locale.

**Primary recommendation:** Write the migration first (it unblocks the RSC SELECT query), then RSC + client component, then i18n keys last. Two files, one migration, two JSON patches — no architectural unknowns.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch company_name + contact_phone | Server (RSC) | — | Data available at request time; avoids client loading state for static fields |
| Fetch auth email | Server (RSC) | — | `getUser()` runs server-side in RSC via `createBusinessServerClient` |
| Auth guard / redirect | Server (RSC) | — | Same pattern as other business RSCs; edge-case redirect to `/business` if no account row |
| Phone edit + save | Client component | Browser Supabase client | Needs interactivity (input state, button, feedback); save goes directly via browser client with RLS |
| Language toggle | Client component | Server Action | `changeLocaleAction` sets httpOnly cookie server-side; client calls via `useTransition` |
| Sign-out | Client component | Browser Supabase client | Requires `createBusinessBrowserClient().auth.signOut()` + client-side router.push |
| i18n string loading | Server (next-intl middleware) | — | Locale cookie read at middleware level; strings injected via `useTranslations('Business')` |
| Nav bar | Server layout | — | `app/business/layout.tsx` renders BusinessNav automatically; no work needed in this phase |

---

## Standard Stack

No new packages are installed in this phase. All dependencies are already in `package.json`.

### Core (all already installed)

| Library | Version (installed) | Purpose | Role in Phase 43 |
|---------|---------------------|---------|-----------------|
| next | 14.2.35 | App Router RSC + Server Actions | RSC page + `'use client'` split |
| @supabase/ssr | 0.10.3 | Supabase SSR clients | `createBusinessServerClient` + `createBusinessBrowserClient` |
| next-intl | 4.13.0 | i18n with cookie-persisted locale | `useTranslations('Business')`, `useLocale()`, `changeLocaleAction` |
| framer-motion | 12.38.0 | Animation primitives | Not used directly on this page — no new animations needed |
| lucide-react | 1.16.0 | Icon set | Not required; sign-out is text button per design |

### Installation

No `npm install` step required — all dependencies are already present.

---

## Package Legitimacy Audit

No new packages are installed in this phase.

| Package | Status |
|---------|--------|
| (none) | N/A — zero new dependencies |

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (authenticated business user)
  │
  ├─► GET /business/profiili
  │     │
  │     ▼
  │   app/business/profiili/page.tsx  [RSC]
  │     │  createBusinessServerClient(cookies())
  │     │  ├─ .auth.getUser()  → email
  │     │  └─ .from('business_accounts')
  │     │       .select('company_name, contact_phone')
  │     │       .eq('user_id', uid)
  │     │       .maybeSingle()
  │     │         ├── no row → redirect('/business')
  │     │         └── row found → pass props to client
  │     │
  │     ▼
  │   BusinessProfiiliClient.tsx  [Client Component]
  │     ├── Read-only card  (companyName, email, 'Yritystili' badge)
  │     ├── Phone card       (input, save button)
  │     │     └─► createBusinessBrowserClient()
  │     │           .from('business_accounts')
  │     │           .update({ contact_phone })
  │     │           .eq('user_id', user.id)    ← RLS allows this
  │     ├── Language card    (toggle button)
  │     │     └─► changeLocaleAction('fi'|'en')  [Server Action]
  │     │           sets NEXT_LOCALE cookie (httpOnly, 1yr, path=/)
  │     │           + router.refresh()
  │     └── Sign-out button
  │           └─► createBusinessBrowserClient().auth.signOut()
  │                 clears sb-biz-* cookies only
  │                 router.push('/business/kirjaudu')
  │
  └── BusinessNav  [auto-rendered by app/business/layout.tsx]
        (no changes in this phase)
```

### Recommended Project Structure

```
app/business/
├── profiili/
│   ├── page.tsx                    # NEW — RSC wrapper (auth guard + data fetch)
│   └── BusinessProfiiliClient.tsx  # NEW — client component (all interactivity)
supabase/migrations/
└── 20260615000000_business_accounts_contact_phone.sql  # NEW — ADD COLUMN
messages/
├── fi.json                         # PATCH — add 11 Business.profile* keys
└── en.json                         # PATCH — add 11 Business.profile* keys
```

### Pattern 1: RSC Auth Guard + Server-side Data Fetch

The exact pattern is already established in other business RSCs. The `app/business/map/page.tsx` file shows the `createBusinessBrowserClient` used client-side; for the RSC profiili page the server-side variant applies.

Key facts verified from `lib/supabase-business.ts` [VERIFIED: codebase]:
- `createBusinessServerClient(cookieStore)` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` with `cookieOptions: { name: 'sb-biz' }`
- The server client's `setAll()` is a no-op (server components cannot set cookies)
- This means the RSC can read the `sb-biz-*` session but not refresh it — acceptable for a one-shot page load

```tsx
// Source: app/business/map/page.tsx pattern (adapted for profiili)
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createBusinessServerClient } from '@/lib/supabase-business'

export default async function BusinessProfiiliPage() {
  const cookieStore = await cookies()
  const supabase = createBusinessServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/business/kirjaudu')

  const { data: account } = await supabase
    .from('business_accounts')
    .select('company_name, contact_phone')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account) redirect('/business')

  return (
    <BusinessProfiiliClient
      companyName={account.company_name}
      email={user.email ?? ''}
      contactPhone={account.contact_phone ?? ''}
    />
  )
}
```

[VERIFIED: codebase] — `maybeSingle()` is the correct method here (returns null instead of error on no-row); confirmed in `app/business/page.tsx` line 181.

### Pattern 2: Browser Client Save with RLS

Verified from `supabase/migrations/20260605000000_business_accounts.sql` [VERIFIED: codebase]:

```sql
-- Business updates own account
CREATE POLICY "Business updates own account"
  ON business_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

This policy covers UPDATE for any column on the business user's own row, including the new `contact_phone` column. No Route Handler is needed. The save pattern from `ProfiiliClient.tsx` applies directly:

```tsx
// Source: app/profiili/ProfiiliClient.tsx lines 61-78 (adapted)
async function handleSave() {
  const supabase = createBusinessBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const trimmed = phone.trim()
  const { error } = await supabase
    .from('business_accounts')
    .update({ contact_phone: trimmed })
    .eq('user_id', user.id)
  if (!error) {
    setSaved(true)
    setSaveError(null)
    setTimeout(() => setSaved(false), 2500)
  } else {
    setSaveError(t('profileSaveError'))
  }
}
```

[VERIFIED: codebase] — `.update()` not `.upsert()` because the row always exists for a business user (created during registration).

### Pattern 3: Language Toggle via Server Action

Verified from `app/actions/locale.ts` [VERIFIED: codebase]:

```ts
'use server'
import { cookies } from 'next/headers'

export async function changeLocaleAction(locale: 'fi' | 'en') {
  const store = await cookies()
  store.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
  })
}
```

Client-side call pattern (from `ProfiiliClient.tsx` lines 102-108) [VERIFIED: codebase]:

```tsx
const [isPending, startTransition] = useTransition()

function toggle() {
  const next = locale === 'fi' ? 'en' : 'fi'
  startTransition(async () => {
    await changeLocaleAction(next)
    router.refresh()
  })
}
```

### Pattern 4: Sign-out

Verified from `app/components/BusinessNav.tsx` lines 19-26 [VERIFIED: codebase]:

```tsx
async function handleSignOut() {
  try {
    await createBusinessBrowserClient().auth.signOut()
  } finally {
    router.push('/business/kirjaudu')
  }
}
```

The `try/finally` pattern ensures navigation happens even if `signOut()` throws. The `sb-biz-*` cookie namespace isolation means consumer `sb-*` cookies are untouched.

### Pattern 5: Glass Card Structure

Verified from `app/profiili/ProfiiliClient.tsx` and `app/globals.css` [VERIFIED: codebase]:

```tsx
<div className="glass rounded-2xl p-4 flex flex-col gap-3">
  <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
    {t('profilePhone')}
  </label>
  <input
    type="tel"
    value={phone}
    onChange={e => setPhone(e.target.value)}
    placeholder={t('profilePhonePlaceholder')}
    className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)]"
  />
  <button
    onClick={handleSave}
    className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
  >
    {t('profileSave')}
  </button>
  {saved && <p className="text-sm text-green-700">{t('profileSaved')}</p>}
  {saveError && <p className="text-sm text-red-600">{saveError}</p>}
</div>
```

### Pattern 6: Main Wrapper Padding

Verified from `app/business/page.tsx` line 268 [VERIFIED: codebase]:

```tsx
<main className="min-h-screen bg-white pt-16 px-4 pb-24">
```

`pt-16` clears the fixed BusinessNav elements (brand text top-left at `max(12px, env(safe-area-inset-top))` + pill top-right at same position). Confirmed in D-06 of Phase 42 CONTEXT.md.

### Anti-Patterns to Avoid

- **Using `.upsert()` on `business_accounts`**: The row is always present for business users; `.update()` is correct and semantically clearer. `.upsert()` would silently succeed on a missing row by inserting a partial record, violating data integrity.
- **Fetching user.id client-side when it's already available from RSC**: Pass `userId` as a prop from the RSC (via `user.id`) to avoid the extra `getUser()` call on mount. The RSC already has the user object.
- **Using `createBusinessServerClient` in the client component**: This factory requires `cookies()` (server-only API). Client components must use `createBusinessBrowserClient()`.
- **Modifying `app/profiili/ProfiiliClient.tsx`**: The consumer profile page is out of scope per STATE.md active decisions. Do not touch it.
- **Adding a `changeLocaleAction` for business**: The existing Server Action at `app/actions/locale.ts` is locale-agnostic (sets `NEXT_LOCALE` cookie, not tied to consumer vs. business). Reuse verbatim; do not create a second action.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie-persisted locale | Custom cookie setter in client component | `changeLocaleAction` Server Action | Already exists; handles `httpOnly`, `path=/`, `maxAge` correctly; Server Actions are the Next.js 14 pattern for cookie mutations |
| RLS-authorized DB write | Route Handler with service role key | Direct browser client `.update()` | The `Business updates own account` RLS policy already covers this; Route Handler would add latency and code with no security benefit |
| Auth guard | Middleware DB query | RSC `getUser()` + conditional redirect | Middleware must not query DB (Edge Runtime, confirmed in STATE.md active decisions) |
| i18n string management | Inline hardcoded Finnish/English | `useTranslations('Business')` with keys in fi.json/en.json | Consistent with all other business pages; locale switch requires zero UI code changes |
| Session namespace isolation | Manual cookie clearing | `createBusinessBrowserClient().auth.signOut()` | The `sb-biz` cookie prefix was established in Phase 39; `signOut()` correctly clears only `sb-biz-*` cookies |

**Key insight:** This phase has no novel engineering problems. Every mechanism (auth guard, RLS write, locale toggle, sign-out) is a drop-in of patterns proven in prior phases. The planner should allocate time to the migration and i18n keys, not to architectural decisions.

---

## DB Migration Details

### Current `business_accounts` schema

Verified from `supabase/migrations/20260605000000_business_accounts.sql` [VERIFIED: codebase]:

```
user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
company_name    TEXT NOT NULL
approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (...)
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

Additional columns added in later migrations:
- `rejection_reason TEXT` — added in Phase 42 (confirmed by 42-CONTEXT.md D-02, migration file `20260612000000_cleanup_test_accounts.sql` is the last migration)

**Note:** The Phase 42 migration for `rejection_reason` is referenced in 42-CONTEXT.md D-02 but no migration file with that specific addition appears in the current migration list. The last migration is `20260612000000_cleanup_test_accounts.sql`. This means either (a) the rejection_reason column was not yet added via a separate migration file (it may exist in an existing file or was applied directly), or (b) it was deferred. [ASSUMED] — The executor should verify whether `rejection_reason` already exists in `business_accounts` before writing the Phase 43 migration; if it does not yet exist, a combined migration may be appropriate, but per D-03, Phase 43's migration is scoped to `contact_phone` only.

### New migration to write

**Filename convention:** `YYYYMMDD######_description.sql` — most recent files use `20260612000000_*`. For Phase 43 (today 2026-06-15):

```
supabase/migrations/20260615000000_business_accounts_contact_phone.sql
```

**Migration content (verbatim from D-03):**

```sql
-- Phase 43: Add contact_phone to business_accounts
-- Purpose: Business users can store their personal phone number for admin-to-user contact.
-- RLS: existing "Business updates own account" policy covers UPDATE on this column.
ALTER TABLE business_accounts ADD COLUMN IF NOT EXISTS contact_phone TEXT;
```

No index needed (not queried, not unique). No CHECK constraint (free-form phone string). `IF NOT EXISTS` guard makes migration safe to re-run.

### Supabase push workflow

`supabase/config.toml` does not exist in this project [VERIFIED: codebase — file not found]. The project uses remote Supabase (not local Docker). The DB push command is:

```bash
npx supabase db push
```

[ASSUMED] — Without `config.toml`, Supabase CLI relies on environment variables (`SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`) or the project reference set via `supabase link`. The executor should verify the project is linked (`supabase status`) before running `db push`. Prior phases (e.g., `CLEAN-01` note in STATE.md: "supabase db push ajettu 2026-06-12") confirm `supabase db push` is the correct command for this project.

---

## i18n Key Inventory

### Keys to add — `Business` namespace

Per D-13, 11 keys are needed in both `messages/fi.json` and `messages/en.json`. Current Business namespace in both files has been verified [VERIFIED: codebase] — none of the `profile*` keys exist yet.

**Finnish (`fi.json`) additions:**

```json
"profileTitle": "Yritysprofiili",
"profileCompanyName": "Yritys",
"profileEmail": "Sähköposti",
"profileAccountType": "Yritystili",
"profilePhone": "Puhelinnumero",
"profilePhonePlaceholder": "esim. +358 40 123 4567",
"profileSave": "Tallenna",
"profileSaved": "Tallennettu",
"profileSaveError": "Tallennus epäonnistui. Yritä uudelleen.",
"profileLanguage": "Kieli",
"profileSignOut": "Kirjaudu ulos"
```

**English (`en.json`) additions:**

```json
"profileTitle": "Business Profile",
"profileCompanyName": "Company",
"profileEmail": "Email",
"profileAccountType": "Business Account",
"profilePhone": "Phone number",
"profilePhonePlaceholder": "e.g. +358 40 123 4567",
"profileSave": "Save",
"profileSaved": "Saved",
"profileSaveError": "Save failed. Please try again.",
"profileLanguage": "Language",
"profileSignOut": "Sign out"
```

**Overlap note:** `profileSave`, `profileSaved`, `profileSaveError`, `profileSignOut` have semantic equivalents in the existing Business namespace (`saveCta`, `saving`, various error keys, `navSignOut`). Per D-13, the decision is to add dedicated profile keys for cleaner separation — do not reuse `navSignOut` or `saveCta` for the profile page labels.

---

## Common Pitfalls

### Pitfall 1: Passing userId from RSC vs. re-fetching on client

**What goes wrong:** Client component calls `createBusinessBrowserClient().auth.getUser()` on mount to get `user.id` for the save handler. This adds a network round-trip and a brief loading state.

**Why it happens:** Developers forget that the RSC already has the user object and can pass `userId` as a prop.

**How to avoid:** Pass `userId={user.id}` as a prop from the RSC to `BusinessProfiiliClient`. The client component then uses it directly in the save handler without an extra `getUser()` call.

**Warning signs:** A `useEffect` that calls `getUser()` just to extract an ID — when that ID was already available at render time.

### Pitfall 2: Using `createBusinessServerClient` inside the client component

**What goes wrong:** TypeScript error or runtime crash — `cookies()` from `next/headers` is a server-only API and cannot be imported in a `'use client'` file.

**Why it happens:** Copy-pasting the RSC auth pattern into the client component.

**How to avoid:** Client component always uses `createBusinessBrowserClient()` (singleton, no arguments). Server component always uses `createBusinessServerClient(cookieStore)`.

### Pitfall 3: phone field uses `type="text"` not `type="tel"`

**What goes wrong:** Mobile devices show the wrong keyboard (text keyboard instead of phone keyboard).

**Why it happens:** The mirror pattern in `ProfiiliClient.tsx` uses `type="text"` for `kotikaupunki`. The phone field should use `type="tel"`.

**How to avoid:** Explicitly set `type="tel"` on the phone input. This also enables OS-level phone number autofill.

### Pitfall 4: `router.refresh()` not called after `changeLocaleAction`

**What goes wrong:** The locale cookie is set, but the UI strings don't update until the user navigates to another page. The toggle appears to do nothing.

**Why it happens:** `changeLocaleAction` only sets the cookie; it doesn't trigger a re-render. `router.refresh()` is required to re-fetch the server component and re-inject the new locale strings via next-intl.

**How to avoid:** Always call `router.refresh()` inside the `startTransition` callback after `await changeLocaleAction(next)`. This is the exact pattern in `ProfiiliClient.tsx` lines 102-108.

### Pitfall 5: Hardcoding FI strings instead of using i18n keys

**What goes wrong:** 'Yritystili' badge text, button labels, and feedback messages are hardcoded in Finnish. Language toggle works but profile page stays in Finnish.

**Why it happens:** The 'Yritystili' badge and page title may seem static/decorative.

**How to avoid:** Every user-visible string on this page goes through `t('profileXxx')`. The badge text is `{t('profileAccountType')}`.

### Pitfall 6: `maybeSingle()` vs `single()` in RSC query

**What goes wrong:** Using `.single()` causes a PostgREST 406 error (not a single row) if the business_accounts row is missing, which Next.js surfaced as an unhandled server error instead of a clean redirect.

**Why it happens:** `.single()` throws on 0 or 2+ rows. For an edge-case guard, `.maybeSingle()` is correct — it returns null on 0 rows.

**How to avoid:** Use `.maybeSingle()` and check `if (!account) redirect('/business')`. This matches the pattern already used in `app/business/page.tsx` line 181. [VERIFIED: codebase]

---

## Environment Availability

This phase adds no external tooling beyond the existing project stack. The Supabase CLI is needed for the migration push.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| `supabase` CLI | `supabase db push` | [ASSUMED] already linked | Prior `db push` runs confirmed in STATE.md (CLEAN-01 note) |
| Node.js / npm | Next.js dev | Available | Confirmed by existing project |
| Supabase project | DB migration | Available | Project has been running since v1.7 |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.7 |
| Config file | `vitest.config.ts` (exists, environment: node) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |
| Test file include pattern | `lib/**/*.test.ts`, `app/**/__tests__/*.test.ts`, `tests/**/*.test.ts` |

### Verification Strategy for Phase 43

This phase has no pure-logic library functions that lend themselves to Vitest unit tests. All behaviors are either:
- RSC data fetching (requires Supabase connection — integration test territory)
- Client interactivity (requires browser DOM — e2e territory)
- i18n key presence (verifiable with a simple grep)
- DB schema (verifiable with `supabase db push` + query)

Playwright is installed as a devDependency (`"playwright": "^1.60.0"`) but there is no `playwright.config.ts` [VERIFIED: codebase — file not found].

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZPRO-01 | `/business/profiili` displays company_name, email, 'Yritystili' | Manual smoke | navigate to page as business user | N/A |
| BIZPRO-02 | Phone field saves to `business_accounts.contact_phone` | Manual smoke | enter phone, save, reload, verify persisted | N/A |
| BIZPRO-03 | Language toggle sets NEXT_LOCALE cookie + UI updates | Manual smoke | toggle FI/EN, verify strings change | N/A |
| BIZPRO-04 | Sign-out clears sb-biz-* session, redirects to /business/kirjaudu | Manual smoke | sign out, verify redirect + session cleared | N/A |
| DB migration | `contact_phone TEXT` column exists in business_accounts | Structural | `supabase db push` + query result check | Migration file (to be created) |
| i18n keys | All 11 Business.profile* keys present in fi.json + en.json | Structural | `grep profileTitle messages/fi.json messages/en.json` | N/A (keys to be added) |

### Sampling Rate

- **Per task commit:** `npx vitest run` (will pass trivially — no new unit-testable code in this phase)
- **Per wave merge:** Manual smoke test checklist as described above
- **Phase gate:** All 4 BIZPRO requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps

No Vitest test files need to be created for this phase — the behaviors are not unit-testable in a `node` environment without mocking the full Supabase client and next-intl stack. The verifier will use manual smoke testing against the running dev server.

*(If a future phase adds pure utility functions derived from business_accounts data, those would be unit-testable.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `createBusinessBrowserClient().auth.getUser()` — Supabase JWT verification; no custom auth code |
| V3 Session Management | Yes | `sb-biz-*` cookie namespace (httpOnly implicit via @supabase/ssr); `signOut()` clears session |
| V4 Access Control | Yes | RLS policy `Business updates own account` enforces row-level isolation server-side |
| V5 Input Validation | Yes | `contact_phone` is free-form TEXT; trim on save; no server-side format constraint (by design, D-03) |
| V6 Cryptography | No | No cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Horizontal privilege escalation (user A updates user B's phone) | Elevation of Privilege | RLS policy `auth.uid() = user_id` prevents cross-account UPDATE; verified in migration |
| Session fixation / consumer session contamination | Elevation of Privilege | `sb-biz-*` namespace isolation; `auth.signOut()` on business client clears only business cookies |
| Phone field injection (XSS) | Tampering | React's JSX escaping handles output encoding; `contact_phone` is TEXT not executable |
| Unauthorized profile page access | Information Disclosure | RSC guard: `getUser()` returns null → redirect to `/business/kirjaudu` |

**No custom crypto or auth logic is hand-rolled in this phase.** All auth decisions delegate to Supabase's JWT and RLS layer.

---

## State of the Art

| Old Approach | Current Approach | Impact on Phase 43 |
|--------------|------------------|---------------------|
| Client-side data fetch on mount (Phase 36 dashboard) | RSC server-fetch + props (Phase 42 D-07) | RSC pattern is the correct approach for profiili/page.tsx |
| `useEffect` + auth state subscription (consumer ProfiiliClient) | Props from RSC (business pattern) | Business RSC passes companyName, email, contactPhone as props — no `subscribeToAuthUser` needed |
| Inline hardcoded strings | `useTranslations('Business')` | All strings use i18n keys — established since Phase 30 |

**Deprecated/outdated for this phase:**
- `subscribeToAuthUser` pattern: The consumer ProfiiliClient uses `subscribeToAuthUser` for reactive auth state because it must handle log-in/log-out from the same page. BusinessProfiiliClient is auth-gated at the RSC level — if there's no session, the RSC redirects. No reactive auth listener is needed.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `rejection_reason` column may or may not exist in business_accounts yet | DB Migration Details | If it already exists (Phase 42 applied it), the Phase 43 migration is unaffected. If it doesn't exist, the Phase 43 migration should NOT add it (out of scope, D-03). Low risk. |
| A2 | `supabase db push` is the correct push command (no `supabase link` step needed in this session) | DB Migration Details | If the project is not linked, `db push` will fail with an auth error. Executor must run `supabase status` first. |
| A3 | `profileSave` and `profileSaved` keys are intentionally separate from existing `saveCta`/`saving` keys | i18n Key Inventory | If the planner reuses existing keys, D-13 intent is violated (profile page uses different label phrasing than wizard). Low risk — either approach works functionally. |

**All other claims in this research were verified directly from codebase files.**

---

## Open Questions

1. **Does `rejection_reason` already exist in `business_accounts`?**
   - What we know: Phase 42 CONTEXT.md D-02 says a new migration adds it. The migration list ends at `20260612000000_cleanup_test_accounts.sql` with no obvious `rejection_reason` migration filename.
   - What's unclear: Was that migration written and applied, or was it deferred?
   - Recommendation: The executor should `SELECT column_name FROM information_schema.columns WHERE table_name='business_accounts'` before writing the Phase 43 migration. The Phase 43 migration is scoped to `contact_phone` only regardless.

2. **Should `user.id` be passed as a prop from RSC, or should the client call `getUser()` on mount?**
   - What we know: D-08 says "Client component obtains `user.id` from `createBusinessBrowserClient().auth.getUser()` on mount (or can be passed from RSC via session)."
   - What's unclear: The CONTEXT.md leaves this as a discretion item implicitly.
   - Recommendation: Pass `userId` as a prop from the RSC. The RSC already has `user.id`; re-fetching it client-side is a gratuitous round-trip. This is the cleaner pattern and avoids a loading state in the save handler.

---

## Sources

### Primary (HIGH confidence — verified from codebase)

- `supabase/migrations/20260605000000_business_accounts.sql` — business_accounts schema + RLS policies
- `app/profiili/ProfiiliClient.tsx` — consumer profile mirror pattern (glass cards, save handler, language toggle, error display)
- `app/business/page.tsx` — spinner style, `pt-16 px-4 pb-24` main padding, `maybeSingle()` usage, `createBusinessBrowserClient()` usage
- `app/components/BusinessNav.tsx` — sign-out implementation, z-index 64
- `app/actions/locale.ts` — `changeLocaleAction` signature and cookie options
- `lib/supabase-business.ts` — `createBusinessBrowserClient()` + `createBusinessServerClient()` factories, cookie namespace
- `messages/fi.json` + `messages/en.json` — existing Business namespace keys (confirmed no profile* keys exist)
- `app/business/layout.tsx` — BusinessNav auto-rendered, no layout changes needed
- `app/globals.css` — `.glass`, `.glass-btn` class definitions
- `vitest.config.ts` — test framework config
- `.planning/config.json` — `nyquist_validation: true`
- `.planning/phases/42-dashboard-map/42-CONTEXT.md` — D-06 (`pt-16` main padding), RSC + client split pattern

### Secondary (MEDIUM confidence)

- `app/business/map/page.tsx` — RSC pattern reference (client-side map page, not a server-fetch RSC; shows `createBusinessBrowserClient()` in `useEffect`, which is the auth check pattern the profiili RSC must NOT use)

### Tertiary (LOW / ASSUMED)

- Supabase CLI `db push` workflow — assumed from STATE.md CLEAN-01 note; `config.toml` absent from repo

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all dependencies verified in package.json
- Architecture: HIGH — all patterns verified directly from existing code
- DB migration: HIGH — schema verified from migration file; RLS policy text confirmed
- i18n keys: HIGH — existing namespace confirmed; new keys follow established format
- Supabase push workflow: MEDIUM — `db push` confirmed from prior session notes; CLI state not verified this session

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (stable stack, no fast-moving dependencies)
