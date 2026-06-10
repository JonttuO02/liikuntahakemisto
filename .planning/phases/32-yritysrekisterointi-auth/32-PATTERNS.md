# Phase 32: Yritysrekisteröinti & auth - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 6
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/business/rekisteroidy/page.tsx` | component (client, form) | request-response | `app/components/AuthModal.tsx` | exact — same glass panel, same input/button classes, same error mapping, same supabase.auth.signUp flow |
| `app/business/page.tsx` | page (server component, stub) | static | `app/tietosuoja/page.tsx` | role-match — server component, static content, same layout shell |
| `app/api/business/register/route.ts` | route handler | request-response | `app/api/hae-paikat/route.ts` + `lib/supabaseAdmin.server.ts` | exact — supabaseAdmin INSERT + error → NextResponse.json, same import pattern |
| `app/components/AuthModal.tsx` (modify) | component (client) | event-driven | self — existing SIGNED_IN useEffect at lines 77-88 | self-modification — add async business_accounts query to existing useEffect |
| `messages/fi.json` | config | static | `messages/fi.json` lines 77-97 (`"Auth"` namespace) | exact — identical namespace structure, same key format |
| `messages/en.json` | config | static | `messages/en.json` lines 77-97 (`"Auth"` namespace) | exact — identical namespace structure, same key format |

---

## Pattern Assignments

### `app/business/rekisteroidy/page.tsx` (client component, request-response)

**Analog:** `app/components/AuthModal.tsx`

**Imports pattern** (AuthModal.tsx lines 1-9):
```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import type { AuthError } from '@supabase/supabase-js'
import { useTranslations } from 'next-intl'
```

**Error mapping pattern** (AuthModal.tsx lines 20-35):
```tsx
function mapError(message: string): 'errorInvalidCredentials' | 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'errorInvalidCredentials'
  }
  if (message.includes('User already registered') || message.includes('already been registered') || message.includes('already exists')) {
    return 'errorEmailInUse'
  }
  if (
    (message.includes('Password should be at least') ||
      message.includes('password')) &&
    message.includes('6')
  ) {
    return 'errorWeakPassword'
  }
  return 'errorGeneric'
}
```
Copy this pattern verbatim for `mapBusinessError` — only the return type union changes (drop `errorInvalidCredentials`, add `errorAccountCreationFailed`).

**useTranslations hook** (AuthModal.tsx line 38):
```tsx
const t = useTranslations('Business')
```

**useRouter** (AuthModal.tsx line 44):
```tsx
const router = useRouter()
// ...
router.push('/business')
```

**Glass panel container** (AuthModal.tsx lines 172-179):
```tsx
<motion.div
  key="panel"
  className="relative glass rounded-2xl p-6 w-full max-w-sm mx-4 mb-0 sm:mb-0"
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 16 }}
  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
>
```
For the full-page registration form, wrap in `<div className="min-h-screen bg-white flex items-center justify-center px-4">` and place the glass panel inside it (no backdrop overlay needed — it's a standalone page, not a modal).

**Input class** (AuthModal.tsx lines 239, 249):
```tsx
className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full"
```
Use this exact string for all three inputs (company name, email, password) on the registration form.

**Submit button class** (AuthModal.tsx lines 272-281):
```tsx
<button
  type="submit"
  disabled={loading}
  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 w-full [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
>
  {loading ? t('registering') : t('registerCta')}
</button>
```

**Error display block** (AuthModal.tsx lines 255-269):
```tsx
<AnimatePresence>
  {error && (
    <motion.p
      key="error"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="text-sm text-red-600"
      role="alert"
    >
      {error}
    </motion.p>
  )}
</AnimatePresence>
```

**signup flow / error handling** (AuthModal.tsx lines 116-134):
```tsx
try {
  const { data, error: err } = await supabase.auth.signUp({ email, password })
  if (err) {
    setError(t(mapError(err.message)))
    return
  }
  if (!data.session) {
    setError(t('errorCheckEmail'))
    return
  }
  // After signUp: call POST /api/business/register with data.session.user.id
  // On register success: router.push('/business')
  // On register failure: show t('errorAccountCreationFailed')
} catch (e) {
  console.error('[BusinessRekisteroidyPage] signup error:', e)
  setError(t('errorGeneric'))
} finally {
  setLoading(false)
}
```

**"Already have account?" toggle** (AuthModal.tsx lines 285-309):
```tsx
<p className="text-sm text-[rgba(17,17,17,0.45)] text-center">
  {t('alreadyHaveAccount')}{' '}
  <button
    type="button"
    onClick={() => setAuthModalOpen(true)}
    className="font-bold text-[#111111] hover:underline"
  >
    {t('signInLink')}
  </button>
</p>
```
The registration page mounts `<AuthModal>` locally with `useState(false)` (see NavBar.tsx lines 17, 121-125 for this mounting pattern). After sign-in via the local AuthModal, the SIGNED_IN business check runs automatically.

---

### `app/business/page.tsx` (server component, static stub)

**Analog:** `app/tietosuoja/page.tsx`

**Full file structure** (tietosuoja/page.tsx lines 1-10):
```tsx
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import NavPill from '@/app/components/NavPill'

export default function TietosuojaPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavPill />
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
```
The stub page follows this exact shell: `min-h-screen bg-white` wrapper, `max-w-2xl mx-auto px-4` content container, no client directive. The heading uses `font-serif text-3xl font-bold text-[#111111]` (tietosuoja/page.tsx line 22).

**Heading style** (tietosuoja/page.tsx line 22):
```tsx
<h1 className="font-serif text-3xl font-bold text-[#111111] mt-6">
  {/* dashboardTitle from Business namespace */}
</h1>
```

**Body text style** (tietosuoja/page.tsx line 34):
```tsx
<p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed mb-4">
  {/* dashboardComingSoon from Business namespace */}
</p>
```
Note: The stub page uses `getTranslations` (server-side) from next-intl, not `useTranslations`. Pattern from `app/profiili/page.tsx` if needed.

---

### `app/api/business/register/route.ts` (route handler, request-response)

**Analog:** `app/api/hae-paikat/route.ts` (supabaseAdmin usage) + `app/api/saasuositus/route.ts` (POST body parsing pattern)

**Imports pattern** (hae-paikat/route.ts lines 1-2):
```tsx
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
```

**supabaseAdmin import** (lib/supabaseAdmin.server.ts lines 3-8):
```tsx
// Server-only admin client — bypasses RLS. NEVER import in client components.
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**POST body parsing with validation** (saasuositus/route.ts lines 85-111):
```tsx
export async function POST(request: Request) {
  let field1: string
  let field2: string
  try {
    const body = await request.json()
    field1 = body.field1
    field2 = typeof body.field2 === 'string'
      ? body.field2.trim().slice(0, 200)
      : ''
    if (!field1 || !field2) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  // ... service logic ...
}
```

**supabaseAdmin INSERT + error response** (hae-paikat/route.ts lines 165-181):
```tsx
const { data: tallennettu, error } = await supabaseAdmin
  .from('liikuntapaikat')
  .upsert(rivit, { onConflict: 'place_id', ignoreDuplicates: false })
  .select('id')

if (error) {
  return NextResponse.json(
    { error: `Supabase-virhe: ${error.message}` },
    { status: 500 }
  )
}

return NextResponse.json({ loydetty: allResults.length, tallennettu: tallennettu?.length ?? 0 })
```
For `business/register`, replace upsert with plain `.insert({ user_id, company_name })` and add the atomicity rollback: `await supabaseAdmin.auth.admin.deleteUser(user_id)` before returning the 500.

**Authorization header verification pattern** (hae-paikat/route.ts lines 113-117):
```tsx
if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```
For `business/register`, use JWT verification instead of a static secret (see RESEARCH.md security gap section). Pattern:
```tsx
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token ?? '')
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Use user.id — not body.user_id — to prevent privilege escalation
```

---

### `app/components/AuthModal.tsx` (modify — SIGNED_IN useEffect only)

**Target:** Lines 77-88 — the SIGNED_IN useEffect. This is the only block to modify.

**Existing code to replace** (AuthModal.tsx lines 77-88):
```tsx
useEffect(() => {
  if (!open || !loading) return
  const supabase = createBrowserSupabase()
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    if (event === 'SIGNED_IN' && session) {
      onSuccess?.(pendingPaikkaId ?? null)
      onClose()
    }
  })
  return () => subscription.unsubscribe()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, loading])
```

**New code** — callback must be declared `async` (Pitfall 5 in RESEARCH.md) and use `.maybeSingle()` (Pitfall 4):
```tsx
useEffect(() => {
  if (!open || !loading) return
  const supabase = createBrowserSupabase()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session) {
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
`router` is already declared at line 44 (`const router = useRouter()`). No new imports needed.

---

### `messages/fi.json` (add `"Business"` namespace)

**Analog:** `messages/fi.json` lines 77-97 — the `"Auth"` namespace

**Insertion point:** After the closing `}` of the `"Auth"` namespace (line 97), before `"Map"` (line 98). Maintain the same indentation (2-space JSON).

**Exact block to add:**
```json
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
},
```

---

### `messages/en.json` (add `"Business"` namespace)

**Analog:** `messages/en.json` lines 77-97 — the `"Auth"` namespace

**Insertion point:** After the closing `}` of the `"Auth"` namespace (line 97), before `"Map"` (line 98). Identical structure to fi.json.

**Exact block to add:**
```json
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
},
```

---

## Shared Patterns

### createBrowserSupabase — client-side Supabase singleton
**Source:** `lib/supabaseSSR.ts` lines 22-39
**Apply to:** `app/business/rekisteroidy/page.tsx` (auth.signUp call), `app/components/AuthModal.tsx` (business_accounts query)
```tsx
import { createBrowserSupabase } from '@/lib/supabaseSSR'
// ...
const supabase = createBrowserSupabase()
// Use for client-side auth and DB queries. NEVER use createBrowserClient from @supabase/ssr.
```

### supabaseAdmin — server-only service role client
**Source:** `lib/supabaseAdmin.server.ts` lines 1-8
**Apply to:** `app/api/business/register/route.ts` only
```tsx
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
// supabaseAdmin bypasses RLS. NEVER import in client components or 'use client' files.
```

### Error display with AnimatePresence
**Source:** `app/components/AuthModal.tsx` lines 255-269
**Apply to:** `app/business/rekisteroidy/page.tsx`
```tsx
<AnimatePresence>
  {error && (
    <motion.p
      key="error"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="text-sm text-red-600"
      role="alert"
    >
      {error}
    </motion.p>
  )}
</AnimatePresence>
```

### AuthModal local mount pattern
**Source:** `app/components/NavBar.tsx` lines 17, 121-125
**Apply to:** `app/business/rekisteroidy/page.tsx` (for the "Sign in" link)
```tsx
const [authModalOpen, setAuthModalOpen] = useState(false)
// ...
<AuthModal
  open={authModalOpen}
  onClose={() => setAuthModalOpen(false)}
/>
```

### Glass panel visual
**Source:** `app/components/AuthModal.tsx` lines 172-179, 190-193
**Apply to:** `app/business/rekisteroidy/page.tsx`
```tsx
className="relative glass rounded-2xl p-6 w-full max-w-sm mx-4"
// Heading inside panel:
<h2 className="text-xl font-bold text-[#111111]">
```

### useTranslations hook
**Source:** `app/components/AuthModal.tsx` line 38
**Apply to:** `app/business/rekisteroidy/page.tsx` (client, useTranslations), `app/business/page.tsx` (server, getTranslations)
```tsx
// Client component:
import { useTranslations } from 'next-intl'
const t = useTranslations('Business')

// Server component (if needed for stub):
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('Business')
```

---

## No Analog Found

All 6 files have analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `app/components/`, `app/api/`, `app/tietosuoja/`, `lib/`, `messages/`
**Files scanned:** 8 source files read
**Pattern extraction date:** 2026-06-05
