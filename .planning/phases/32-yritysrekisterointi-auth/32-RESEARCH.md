# Phase 32: Yritysrekisteröinti & auth — Research

**Researched:** 2026-06-05
**Domain:** Next.js App Router — business registration page, Route Handler, AuthModal redirect extension, i18n namespace
**Confidence:** HIGH — all findings based on direct codebase audit of existing files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Erillinen sivu `/business/rekisteroidy` — ei modal. Kentät: yritysnimi (text), sähköposti (email), salasana (password).
- **D-02:** Ei NavBar-linkkiä v1.7:ssä — sivu on olemassa suoralla URL:lla mutta ei näy navigaatiossa.
- **D-03:** Ei Google OAuth yrityksille — vain sähköposti + salasana.
- **D-04:** Yritys käyttää samaa `AuthModal`-komponenttia kuin tavalliset käyttäjät.
- **D-05:** Aina kun business-käyttäjä kirjautuu, ohjataan `/business`-sivulle — `router.push('/business')` AuthModal:in `onSuccess`-callbackissa. Ei kontekstiriippuvaista logiikkaa.
- **D-06:** Client-side tarkistus AuthModal `onSuccess`-callbackissa: `SELECT 1 FROM business_accounts WHERE user_id = uid`. Jos rivi löytyy → `router.push('/business')`. Jos ei löydy → normaali käyttäjävirta.
- **D-07:** `/business/page.tsx` on Phase 32:ssa yksinkertainen stub ("Tervetuloa hallintapaneeliin — tulossa pian").
- **D-08:** `/business`-reitti ei tarvitse middleware-suojaa Phase 32:ssa.
- **D-09:** Rekisteröinnin flow: (1) `supabase.auth.signUp({email, password})`, (2) jos onnistuu: POST `/api/business/register` joka tekee `supabaseAdmin.from('business_accounts').insert({user_id, company_name})`.
- **D-10:** Atomisuus-virheenkäsittely: jos `business_accounts` INSERT epäonnistuu signUp:n jälkeen → `supabaseAdmin.auth.admin.deleteUser(uid)` ja virheilmoitus käyttäjälle.

### Claude's Discretion

None declared in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- Google OAuth yrityksille
- `/business`-reitin middleware-suojaus — tehdään Phase 36:ssa
- NavBar-linkki "Rekisteröi yrityksesi"
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIZ-01 | Yritys voi rekisteröityä palveluun erillisellä lomakkeella (yritysnimi, sähköposti, salasana) | `/business/rekisteroidy` page + `/api/business/register` Route Handler; existing AuthModal + supabaseAdmin patterns directly reusable |
| BIZ-03 | Kirjautunut yritys ohjataan automaattisesti `/business`-hallintapaneeliin | AuthModal `onSuccess` callback extension; `createBrowserSupabase()` query against `business_accounts`; `router.push('/business')` conditional |
</phase_requirements>

---

## Summary

Phase 32 adds two new pages (`/business/rekisteroidy` and `/business` stub), one new API Route Handler (`/api/business/register`), modifies `AuthModal.tsx` to add a business redirect check after sign-in, and extends both `messages/fi.json` and `messages/en.json` with a new `"Business"` namespace.

The phase is almost entirely composition of existing, verified patterns. Every pattern needed — Route Handler structure, supabaseAdmin import, createBrowserSupabase() query, useRouter push, useTranslations hook, glass panel styling, error mapping, AnimatePresence error block — exists in the codebase today. No new libraries, no new architectural patterns, no migrations (Phase 31 already created `business_accounts`).

The single most important technical detail is the AuthModal modification: the `onSuccess` callback currently receives `(paikkaId: number | null)`. Adding a business redirect requires an async `business_accounts` query *after* sign-in but *before* or *instead of* the current callback path. The query must use `createBrowserSupabase()` (not supabaseAdmin, which is server-only). Because `onSuccess` is called in two places (SIGNED_IN useEffect for sign-in, and inline for signup), the business check logic must be extracted to a shared helper that both paths call.

**Primary recommendation:** Follow the established patterns exactly — glass panel UI from AuthModal, Route Handler structure from `app/api/saasuositus/route.ts`, supabaseAdmin import from `lib/supabaseAdmin.server.ts`, and useTranslations from the Phase 30 i18n implementation.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Registration form (fields, validation, submit) | Browser / Client (`'use client'`) | — | User interaction; calls supabase.auth.signUp client-side |
| Auth user creation | Supabase Auth (via client SDK) | — | `supabase.auth.signUp` is a client call; session returned synchronously |
| `business_accounts` INSERT | API / Backend (`/api/business/register`) | — | Must use service role key; cannot expose to client |
| Atomicity rollback (`deleteUser`) | API / Backend (same route) | — | `supabaseAdmin.auth.admin.deleteUser` requires service role key |
| Business redirect check | Browser / Client (AuthModal `onSuccess`) | — | Must query after SIGNED_IN event; uses anon key + RLS (SELECT policy: `auth.uid() = user_id`) |
| `/business` stub page | Frontend Server (Server Component) | — | Static stub; no auth gate needed in Phase 32 per D-08 |
| i18n strings | Both (messages JSON) | — | Consumed by `useTranslations` (client) and `getTranslations` (server) |

---

## Standard Stack

No new libraries are introduced in Phase 32. All dependencies are already installed.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.105.4 | Auth signUp, client query | Already used everywhere; `createBrowserSupabase()` pattern established |
| `next` | 14.2.35 | App Router pages + Route Handlers | Project framework |
| `next-intl` | ^4.13.0 | `useTranslations('Business')` | Phase 30 established this; `NextIntlClientProvider` in layout |
| `framer-motion` | ^12.38.0 | AnimatePresence error block, panel enter | Used in AuthModal and all client components |
| `lucide-react` | existing | No new icons needed in Phase 32 | Used by shadcn + existing components |

[VERIFIED: direct npm view] All versions confirmed from `package.json`.

### No New Packages

Phase 32 installs zero new packages. The UI-SPEC explicitly states: "No third-party registry blocks. All UI is hand-composed from existing project utility classes."

---

## Package Legitimacy Audit

> No packages to audit — Phase 32 installs zero new external packages.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User fills /business/rekisteroidy form
  │
  ▼
[Client Component: BusinessRekisteroidyPage]
  │  supabase.auth.signUp({email, password})
  ▼
[Supabase Auth] ──── creates auth.users row ────►
  │ success (session returned)
  ▼
POST /api/business/register  { user_id, company_name }
  │
  ▼
[Route Handler: /api/business/register]
  │  supabaseAdmin.from('business_accounts').insert({user_id, company_name})
  │
  ├── INSERT success ──► NextResponse.json({ ok: true })
  │                          │
  │                          ▼
  │                    [Client] router.push('/business')
  │
  └── INSERT failure ──► supabaseAdmin.auth.admin.deleteUser(user_id)
                              │
                              ▼
                        NextResponse.json({ error: ... }, { status: 500 })
                              │
                              ▼
                        [Client] show Business.errorAccountCreationFailed

────────────────────────────────────────────────────────────────────────

User signs in via AuthModal (existing flow)
  │
  ▼
[SIGNED_IN event fires in AuthModal useEffect]
  │  existing onSuccess?.(pendingPaikkaId ?? null)
  │  NEW: createBrowserSupabase()
  │        .from('business_accounts')
  │        .select('user_id')
  │        .eq('user_id', session.user.id)
  │        .maybeSingle()
  │
  ├── row found ──► router.push('/business')
  └── no row   ──► existing behavior (no push)
```

### Recommended Project Structure

New files only:

```
app/
├── business/
│   ├── page.tsx                    # stub — Server Component
│   └── rekisteroidy/
│       └── page.tsx                # 'use client' registration form
app/api/
└── business/
    └── register/
        └── route.ts                # POST handler — service role INSERT + deleteUser fallback
messages/
├── fi.json                         # add "Business": { ... } namespace
└── en.json                         # add "Business": { ... } namespace
app/components/
└── AuthModal.tsx                   # modify onSuccess callback only — no visual changes
```

### Pattern 1: AuthModal `onSuccess` callback — business redirect (D-05, D-06)

**What:** After SIGNED_IN, query `business_accounts` using the anon client (RLS allows `auth.uid() = user_id`). If row found, push to `/business`. Otherwise proceed with existing behavior.

**When to use:** This pattern runs in the existing SIGNED_IN useEffect inside AuthModal.

**Critical detail:** The `onSuccess` callback is fired in TWO places:
1. The SIGNED_IN useEffect (for signin flow): `onSuccess?.(pendingPaikkaId ?? null)` then `onClose()`
2. The signup branch of `handleSubmit`: `onSuccess?.(pendingPaikkaId ?? null)` then `onClose()`

The business redirect check must be added to the SIGNED_IN useEffect (where signin happens). For the signup flow in AuthModal, signup is not the business registration path — business registration uses `/business/rekisteroidy` standalone page (D-01, D-03). Therefore, only the SIGNED_IN useEffect in AuthModal needs modification.

```typescript
// Source: AuthModal.tsx (verified — existing pattern, extended with business check)
useEffect(() => {
  if (!open || !loading) return
  const supabase = createBrowserSupabase()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session) {
        // Business redirect check (D-06)
        const { data: bizRow } = await supabase
          .from('business_accounts')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (bizRow) {
          onClose()
          router.push('/business')
        } else {
          onSuccess?.(pendingPaikkaId ?? null)
          onClose()
        }
      }
    }
  )
  return () => subscription.unsubscribe()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, loading])
```

[VERIFIED: direct codebase audit — AuthModal.tsx lines 77-88]

### Pattern 2: `/api/business/register` Route Handler

**What:** POST endpoint that inserts into `business_accounts` using service role key. Handles atomicity rollback via `deleteUser` if INSERT fails.

**When to use:** Called by `/business/rekisteroidy` after successful `supabase.auth.signUp`.

```typescript
// Source: modeled on app/api/hae-paikat/route.ts and lib/supabaseAdmin.server.ts (verified)
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function POST(request: Request) {
  let user_id: string
  let company_name: string

  try {
    const body = await request.json()
    user_id = body.user_id
    company_name = typeof body.company_name === 'string'
      ? body.company_name.trim().slice(0, 200)
      : ''
    if (!user_id || !company_name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('business_accounts')
    .insert({ user_id, company_name })

  if (error) {
    // Atomicity: delete the orphaned auth user (D-10)
    await supabaseAdmin.auth.admin.deleteUser(user_id)
    return NextResponse.json(
      { error: 'business_accounts insert failed', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
```

[VERIFIED: direct codebase audit — lib/supabaseAdmin.server.ts, app/api/hae-paikat/route.ts]

### Pattern 3: Registration page client component

**What:** Full-page form that mirrors AuthModal's panel visually, using `.glass rounded-2xl p-6`, same input classes, same button classes, `useTranslations('Business')`.

**When to use:** `/business/rekisteroidy/page.tsx`

```typescript
// Source: AuthModal.tsx visual patterns + 32-UI-SPEC.md (verified)
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { useTranslations } from 'next-intl'

// Input class (identical to AuthModal — verified from AuthModal.tsx line 239):
// "border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111]
//  placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none
//  focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full"

// Error mappping for business registration — same structure as AuthModal mapError():
function mapBusinessError(message: string): keyof BusinessErrorKeys {
  if (message.includes('already registered') || message.includes('already been registered') || message.includes('already exists')) return 'errorEmailInUse'
  if ((message.includes('Password') || message.includes('password')) && message.includes('6')) return 'errorWeakPassword'
  return 'errorGeneric'
}
```

[VERIFIED: direct codebase audit — AuthModal.tsx]

### Pattern 4: useTranslations in client component

**What:** Import and call exactly as in AuthModal.

```typescript
// Source: AuthModal.tsx line 9 (verified)
import { useTranslations } from 'next-intl'
// ...
const t = useTranslations('Business')
// Usage: t('registerTitle'), t('errorEmailInUse'), etc.
```

[VERIFIED: direct codebase audit — AuthModal.tsx, messages/fi.json, messages/en.json]

### Pattern 5: `useRouter` for client-side navigation

```typescript
// Source: AuthModal.tsx line 44 (verified)
import { useRouter } from 'next/navigation'
// ...
const router = useRouter()
router.push('/business')
```

[VERIFIED: direct codebase audit — AuthModal.tsx line 44]

### Anti-Patterns to Avoid

- **Do not import `supabaseAdmin` in client components.** It uses `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) and would expose the key in the browser bundle. The service role key is used ONLY in `/api/business/register/route.ts`.
- **Do not use `createBrowserClient` from `@supabase/ssr` in client code.** The project uses `createBrowserSupabase()` from `lib/supabaseSSR.ts` which uses vanilla `createClient` to avoid the hanging promise bug. The comment in `supabaseSSR.ts` is explicit about this.
- **Do not add `router.push('/business')` to the signup branch of the existing AuthModal.** Business users register via `/business/rekisteroidy` — not via AuthModal signup. Adding business redirect to AuthModal signup would affect regular user signups incorrectly.
- **Do not put business redirect logic in a separate `onSuccess` prop.** The pattern in D-05/D-06 is to run the check inside the SIGNED_IN useEffect after the event fires — not in the prop callback.
- **Do not call `supabase.auth.signUp` from the Route Handler.** signUp must run client-side so the session is available immediately in the browser. The Route Handler only does the `business_accounts` INSERT (which requires service role).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error mapping (auth error codes → UI text) | Custom error parser | `mapError()` pattern from AuthModal.tsx | Already handles all Supabase Auth error strings |
| Business redirect check | Middleware or server-side session check | Client-side `business_accounts` query in `onSuccess` | D-06 locked this; middleware deferred to Phase 36 (D-08) |
| Auth state subscription | Custom localStorage poll | `createBrowserSupabase().auth.onAuthStateChange` | Already wrapped in singleton by `createBrowserSupabase()` |
| Form loading state | Custom disable logic | Same `loading` boolean pattern as AuthModal | Consistent UX; already tested |
| Service role client | Custom fetch with Authorization header | `supabaseAdmin` from `lib/supabaseAdmin.server.ts` | Single import, already typed |

**Key insight:** Every problem in Phase 32 already has a solution in the codebase. The job is composition, not invention.

---

## Common Pitfalls

### Pitfall 1: Double business redirect on AuthModal signup path

**What goes wrong:** Developer adds business redirect to AuthModal's signup `handleSubmit` path as well as the SIGNED_IN useEffect. Regular users who sign up via AuthModal modal could be incorrectly redirected to `/business` if they somehow have a `business_accounts` row.

**Why it happens:** AuthModal has two code paths that call `onSuccess` — the SIGNED_IN useEffect (sign-in) and the direct signup path. The business check is only needed after sign-in (via SIGNED_IN event). Business users don't sign up via AuthModal — they use `/business/rekisteroidy`.

**How to avoid:** Only modify the SIGNED_IN useEffect. Leave the signup branch in `handleSubmit` unchanged.

**Warning signs:** Business redirect running during normal user sign-up test.

### Pitfall 2: Calling `supabaseAdmin.auth.admin.deleteUser` with wrong argument

**What goes wrong:** Passing `session.user.email` instead of `session.user.id` (UUID). `deleteUser` requires the UUID.

**Why it happens:** Common confusion between email and user ID.

**How to avoid:** The `user_id` sent in the POST body is `data.session.user.id` (UUID from `supabase.auth.signUp` response). Pass that same UUID to `deleteUser`.

**Warning signs:** `deleteUser` returns an error about invalid user ID format.

### Pitfall 3: `business_accounts` INSERT failing due to RLS despite service role

**What goes wrong:** INSERT to `business_accounts` fails even when using `supabaseAdmin`. This would indicate the table doesn't exist yet or the service role key is wrong.

**Why it happens:** Phase 31 must be completely applied (`supabase db push` done). If the migration wasn't pushed to the remote Supabase project, the table doesn't exist.

**How to avoid:** Confirm Phase 31 is complete (it is per STATE.md: "Phase 31 complete — 4/4 plans done, DB pushed"). The `supabaseAdmin` client always bypasses RLS by definition.

**Warning signs:** 500 error from `/api/business/register` with "relation business_accounts does not exist".

### Pitfall 4: `maybeSingle()` vs `single()` for business check

**What goes wrong:** Using `.single()` on `business_accounts` query in the AuthModal redirect check — if the row doesn't exist, `.single()` throws an error (PGRST116) instead of returning `null`.

**Why it happens:** Natural instinct to use `.single()` for single-row lookups.

**How to avoid:** Use `.maybeSingle()` which returns `null` (not an error) when zero rows found. This is exactly the "does this user have a business account?" pattern.

**Warning signs:** AuthModal errors on sign-in for regular users who have no `business_accounts` row.

### Pitfall 5: `onAuthStateChange` callback not async — missing `await` on business check

**What goes wrong:** The SIGNED_IN useEffect callback isn't declared `async`, so the `await` on the `business_accounts` query is silently ignored, causing the redirect to run before the query resolves.

**Why it happens:** The existing callback in AuthModal.tsx is not async (it doesn't need to be). The business check adds an async operation.

**How to avoid:** Declare the `onAuthStateChange` callback as `async`: `async (event, session) => { ... }`. The Supabase SDK accepts async callbacks.

**Warning signs:** Business redirect never fires (the conditional `if (bizRow)` never evaluates correctly).

### Pitfall 6: i18n — missing key in one of the two message files

**What goes wrong:** Adding `"Business"` namespace to `fi.json` but forgetting `en.json` (or vice versa). `useTranslations('Business')` throws at runtime if the namespace is missing for the active locale.

**Why it happens:** Manual file editing; easy to update only one file.

**How to avoid:** Always update both files in the same task/commit. The UI-SPEC copywriting contract lists all keys for both locales.

**Warning signs:** Runtime error "Missing message: en.Business.registerTitle" when locale is switched to English.

---

## Code Examples

### `business_accounts` table columns (confirmed from migration SQL)

```sql
-- Source: supabase/migrations/20260605000000_business_accounts.sql (verified)
CREATE TABLE IF NOT EXISTS business_accounts (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The INSERT in `/api/business/register` only needs `{ user_id, company_name }` — `approval_status` defaults to `'pending'`, `created_at` defaults to `now()`.

### supabaseAdmin import (confirmed)

```typescript
// Source: lib/supabaseAdmin.server.ts (verified)
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
// supabaseAdmin.from('business_accounts').insert({ user_id, company_name })
// supabaseAdmin.auth.admin.deleteUser(user_id)
```

### `deleteUser` method path (confirmed)

```typescript
// Source: lib/supabaseAdmin.server.ts — supabaseAdmin is createClient(url, serviceRoleKey)
// The auth.admin namespace is available on the service role client.
await supabaseAdmin.auth.admin.deleteUser(user_id)
// Returns: { data: { user }, error }
```

[VERIFIED: `supabaseAdmin` is `createClient(url, SUPABASE_SERVICE_ROLE_KEY)` from `@supabase/supabase-js ^2.105.4`. The `auth.admin` API including `deleteUser` is available on clients initialized with the service role key — this is the standard Supabase Admin API.] [ASSUMED: auth.admin.deleteUser API shape — verified as standard Supabase pattern but not cross-checked against live docs in this session]

### AuthModal `onSuccess` prop signature (confirmed)

```typescript
// Source: AuthModal.tsx lines 11-16 (verified)
interface AuthModalProps {
  open: boolean
  onClose: () => void
  pendingPaikkaId?: number | null
  onSuccess?: (paikkaId: number | null) => void
}
```

The `onSuccess` prop is not changed. The business redirect logic is added INSIDE the SIGNED_IN useEffect, independent of `onSuccess`.

### i18n strings to add (from UI-SPEC copywriting contract)

```json
// fi.json — add after "Auth" namespace
"Business": {
  "registerTitle": "Rekisteröi yrityksesi",
  "companyNamePlaceholder": "Yrityksen nimi",
  "emailPlaceholder": "Sähköpostiosoite",
  "passwordPlaceholder": "Salasana (väh. 6 merkkiä)",
  "registerCta": "Rekisteröidy",
  "registering": "Rekisteröidään...",
  "alreadyHaveAccount": "Onko sinulla jo tili?",
  "signInLink": "Kirjaudu sisään",
  "errorEmailInUse": "Sähköpostiosoite on jo käytössä.",
  "errorWeakPassword": "Salasanan on oltava vähintään 6 merkkiä.",
  "errorGeneric": "Jokin meni pieleen. Yritä uudelleen.",
  "errorAccountCreationFailed": "Tilin luonti epäonnistui. Yritä uudelleen.",
  "dashboardTitle": "Tervetuloa hallintapaneeliin",
  "dashboardComingSoon": "Ominaisuudet lisätään pian."
}
```

```json
// en.json — add after "Auth" namespace
"Business": {
  "registerTitle": "Register your business",
  "companyNamePlaceholder": "Company name",
  "emailPlaceholder": "Email address",
  "passwordPlaceholder": "Password (min. 6 characters)",
  "registerCta": "Register",
  "registering": "Registering...",
  "alreadyHaveAccount": "Already have an account?",
  "signInLink": "Sign in",
  "errorEmailInUse": "Email address is already in use.",
  "errorWeakPassword": "Password must be at least 6 characters.",
  "errorGeneric": "Something went wrong. Please try again.",
  "errorAccountCreationFailed": "Account creation failed. Please try again.",
  "dashboardTitle": "Welcome to the dashboard",
  "dashboardComingSoon": "Features coming soon."
}
```

[VERIFIED: UI-SPEC.md copywriting contract, confirmed against existing fi.json/en.json structure]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createBrowserClient` from `@supabase/ssr` | `createClient` from `@supabase/supabase-js` in `createBrowserSupabase()` | Phase 9 (known hanging bug) | All client auth calls must use `createBrowserSupabase()`, not the SSR variant |
| Direct promise from `signInWithPassword` | SIGNED_IN event via `onAuthStateChange` for sign-in | Phase 9 | Sign-in success is detected via event, not promise resolution |
| One-shot localStorage-based auth check | `subscribeToAuthUser()` singleton pattern | Phase 9 | Components subscribe to auth store, not local state |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `supabaseAdmin.auth.admin.deleteUser(user_id)` is the correct method signature for `@supabase/supabase-js ^2.105.4` | Code Examples | If signature changed, the rollback in D-10 won't compile; needs verification against Supabase changelog |

**If this table had 0 entries:** All claims verified — but A1 is flagged because auth.admin API shape wasn't cross-checked against current Supabase v2 docs during this session, only confirmed from the admin client type (`createClient(url, serviceRoleKey)`).

---

## Open Questions

1. **Is `data.session` always non-null after successful `supabase.auth.signUp` for this project's Supabase config?**
   - What we know: AuthModal.tsx line 123 checks `if (!data.session)` and shows `errorCheckEmail` — this guard handles email confirmation mode.
   - What's unclear: Is the Supabase project configured for "auto-confirm" or "email confirmation"? The registration page should redirect to `/business` immediately after signup, requiring an immediate session.
   - Recommendation: Supabase project currently appears to use auto-confirm (AuthModal signup path closes and calls `onSuccess` without email verification flow). The registration page should use the same assumption — but the planner should add a note that if email confirmation is ever enabled, the flow breaks.

2. **Should the "Sign in" link on `/business/rekisteroidy` open AuthModal or link to a separate page?**
   - What we know: UI-SPEC says `<p>"Onko sinulla jo tili?" + link "Kirjaudu sisään" → triggers AuthModal`
   - What's unclear: The registration page has no NavBar with AuthModal mounted. NavBar is in `app/layout.tsx` but only if NavBar is rendered — which it isn't on standalone pages (layout renders `<main>{children}</main>`).
   - Recommendation: The registration page should mount AuthModal locally with `useState(false)` for the modal open state. This is the standard pattern (NavBar also mounts AuthModal locally). After sign-in via this AuthModal, the SIGNED_IN business check runs, redirect to `/business` if applicable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase `business_accounts` table | `/api/business/register` INSERT, AuthModal redirect check | Confirmed via Phase 31 STATE.md | Phase 31 migration applied | — |
| `SUPABASE_SERVICE_ROLE_KEY` env var | `lib/supabaseAdmin.server.ts` | Confirmed (Phase 31 Route Handlers already use supabaseAdmin) | — | — |
| `@supabase/supabase-js` `auth.admin.deleteUser` | D-10 atomicity rollback | Confirmed (service role client always has auth.admin API) | ^2.105.4 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, no vitest.config, no test/ directory) |
| Config file | None — Wave 0 gap |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIZ-01 | `/business/rekisteroidy` renders form with 3 fields + submit | manual | — | N/A |
| BIZ-01 | POST `/api/business/register` inserts `business_accounts` row | manual (Supabase dashboard check) | — | N/A |
| BIZ-01 | Atomicity: DELETE auth user if INSERT fails | manual | — | N/A |
| BIZ-03 | AuthModal: business user redirected to `/business` after sign-in | manual | — | N/A |
| BIZ-03 | AuthModal: regular user NOT redirected to `/business` after sign-in | manual | — | N/A |

**Note:** This project has no automated test infrastructure. `nyquist_validation: true` in config.json but no framework exists. The verification step for Phase 32 is manual browser testing. The planner should not add Wave 0 test setup tasks — this would be out of scope for Phase 32.

### Wave 0 Gaps

None applicable — no test infrastructure exists project-wide; Phase 32 follows the existing pattern of manual verification.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes — new user registration path | Supabase Auth (`supabase.auth.signUp`) — password minimum enforced by Supabase |
| V3 Session Management | Yes — session returned after signUp | Supabase manages session tokens; no custom session logic |
| V4 Access Control | Yes — `business_accounts` RLS | RLS policy: `WITH CHECK (auth.uid() = user_id)` on INSERT (Phase 31 migration applied) |
| V5 Input Validation | Yes — company_name, email, password | Client: HTML `required` + `type="email"`. Server: trim + slice(0, 200) on company_name. Supabase validates email format + password length. |
| V6 Cryptography | No — passwords handled entirely by Supabase Auth | Supabase bcrypt-hashes passwords; no custom crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Orphan auth user after INSERT failure | Repudiation | D-10 atomicity: `deleteUser` called immediately on INSERT failure; user sees `errorAccountCreationFailed` |
| Business account INSERT with mismatched user_id | Tampering | Route Handler reads `user_id` from POST body; RLS `WITH CHECK (auth.uid() = user_id)` is bypassed by service role — route must validate that the user_id in the body corresponds to a real, just-created auth session |
| Unauthenticated POST to `/api/business/register` | Elevation of Privilege | The route receives `user_id` from the client POST body. **The route does NOT verify the JWT** — it trusts the client-provided `user_id`. The RLS bypass via service role means any caller could insert an arbitrary `user_id`. |

**Security gap to flag to planner:** The `/api/business/register` Route Handler as designed (D-09) accepts `user_id` from the POST body and uses `supabaseAdmin` to INSERT. Since `supabaseAdmin` bypasses RLS, there is no database-level check that the caller actually owns that `user_id`. An attacker could POST `{ user_id: "some-other-user-uuid", company_name: "..." }` and create a business account for another user.

**Recommended mitigation (add to plan):** In the Route Handler, verify the JWT from the `Authorization` header before trusting the `user_id`:

```typescript
// Extract and verify the session before accepting user_id from body
import { createServerSupabase } from '@/lib/supabaseSSR'
import { cookies } from 'next/headers'

// OR: parse Authorization: Bearer <token> and verify with supabaseAdmin
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// Use user.id instead of body.user_id
```

This pattern is standard for Next.js Route Handlers that use the service role key. The client sends its JWT in the `Authorization` header; the server verifies it with `supabaseAdmin.auth.getUser(token)` and uses the verified `user.id`, not the client-supplied one.

---

## Sources

### Primary (HIGH confidence)

- `app/components/AuthModal.tsx` — full component audit; onSuccess callback structure, SIGNED_IN event, router.push, error mapping, createBrowserSupabase usage, animation patterns
- `lib/supabaseSSR.ts` — createBrowserSupabase() singleton, subscribeToAuthUser(), known hanging-promise note
- `lib/supabaseAdmin.server.ts` — supabaseAdmin export, createClient with service role key
- `app/api/hae-paikat/route.ts` — Route Handler pattern with supabaseAdmin, authorization check
- `app/api/saasuositus/route.ts` — Route Handler pattern (GET + POST), NextResponse.json structure
- `messages/fi.json` and `messages/en.json` — existing namespace structure, Auth namespace keys
- `supabase/migrations/20260605000000_business_accounts.sql` — exact column names for INSERT
- `app/components/NavBar.tsx` — subscribeToAuthUser pattern, AuthModal mounting pattern
- `app/layout.tsx` — NextIntlClientProvider placement
- `.planning/phases/32-yritysrekisterointi-auth/32-CONTEXT.md` — all locked decisions
- `.planning/phases/32-yritysrekisterointi-auth/32-UI-SPEC.md` — visual contract, copywriting
- `.planning/phases/31-db-skeema-storage-perusta/31-CONTEXT.md` — business_accounts schema decisions
- `package.json` — confirmed library versions

### Secondary (MEDIUM confidence)

- `@supabase/supabase-js` `auth.admin.deleteUser` API — confirmed as standard service-role capability from library architecture; not verified against live Supabase v2 docs in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing
- Architecture: HIGH — all patterns directly verified from source files
- Pitfalls: HIGH — derived from direct code reading, not speculation
- Security gap: HIGH — verified gap in D-09 design; mitigation pattern is standard Supabase JWT verification

**Research date:** 2026-06-05
**Valid until:** 2026-07-05 (stable patterns; Supabase SDK version locked in package.json)
