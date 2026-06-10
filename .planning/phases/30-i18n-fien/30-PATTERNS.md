# Phase 30: i18n FI/EN - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 17 (6 new, 11 modified)
**Analogs found:** 14 / 17 (3 new-territory files have no codebase analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `i18n/request.ts` | config | request-response | `next.config.mjs` (plugin wrapping) | partial — same "entry-point config" role; pattern from RESEARCH.md |
| `lib/i18nUtils.ts` | utility | transform | `lib/priceUtils.ts` | role-match |
| `lib/i18nUtils.test.ts` | test | — | `lib/priceUtils.test.ts` | exact |
| `app/actions/locale.ts` | server-action | request-response | `app/profiili/ProfiiliClient.tsx` (supabase upsert) | partial — same "write via server" intent; pattern from RESEARCH.md |
| `messages/fi.json` | config/data | — | none | no analog |
| `messages/en.json` | config/data | — | none | no analog |
| `global.d.ts` | config | — | `next-env.d.ts` | partial — same `/// <reference>` + `declare module` convention |
| `next.config.mjs` | config | — | self (modify) | exact — wrap existing `withSerwist` |
| `app/layout.tsx` | provider | request-response | self (modify) | exact — add `NextIntlClientProvider` |
| `app/components/NavPill.tsx` | component (client) | request-response | self (modify) | exact — replace string literals |
| `app/components/Etusivu.tsx` | component (client) | request-response | self (modify) | exact — replace string literals |
| `app/components/PaikkaKortti.tsx` | component (client) | request-response | self (modify) | exact — replace string literals |
| `app/components/DiagonaalKortti.tsx` | component (client) | request-response | self (modify) | exact — replace string literals |
| `app/components/PaikkaSheet.tsx` | component (client) | request-response | self (modify) | exact — replace string literals |
| `app/components/AuthModal.tsx` | component (client) | request-response | self (modify) | exact — replace string literals |
| `app/profiili/ProfiiliClient.tsx` | component (client) | CRUD | self (modify) | exact — replace strings + add toggle |
| `app/paikat/[id]/page.tsx` | page (server) | CRUD | self (modify) | exact — replace strings |
| `app/not-found.tsx` | page (server) | request-response | self (modify) | exact — replace strings |

---

## Pattern Assignments

### `i18n/request.ts` (config, request-response)

**Analog:** No direct codebase analog. The closest structural role is `next.config.mjs` as a project-root config entry point.

**Key reference — existing `next.config.mjs` plugin pattern** (lines 1-3, 16):
```javascript
import withSerwistInit from "@serwist/next";
// ...
const withSerwist = withSerwistInit({ ... });
export default withSerwist({ ... });
```

**Pattern to implement** (from RESEARCH.md Pattern 1 — high confidence, verified from official next-intl example repo):
```typescript
// i18n/request.ts — project root (no src/ directory in this project)
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED_LOCALES = ['fi', 'en'] as const
type Locale = typeof SUPPORTED_LOCALES[number]

export default getRequestConfig(async () => {
  const store = await cookies()
  const raw = store.get('NEXT_LOCALE')?.value
  const locale: Locale = SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : 'fi'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

**Note:** The locale validation guard (`SUPPORTED_LOCALES.includes(...)`) is mandatory — prevents path traversal via malformed cookie. The `../messages/` path is correct because `i18n/request.ts` is one level below the project root.

---

### `lib/i18nUtils.ts` (utility, transform)

**Analog:** `lib/priceUtils.ts`

**Imports pattern** (`lib/priceUtils.ts` lines 1):
```typescript
import type { Liikuntapaikka } from './types'
```
No external deps — pure utility. `lib/i18nUtils.ts` will similarly have zero imports.

**Core pattern** (`lib/priceUtils.ts` lines 14-23 — JSDoc + exported pure function):
```typescript
/**
 * isMembershipOnly — D-11 heuristic (UI-05)
 * ...
 */
export function isMembershipOnly(
  p: Pick<Liikuntapaikka, 'hinta_kuvaus' | 'hinta_min' | 'hinta_max'>
): boolean {
  // ... pure logic, no side effects
}
```

**Pattern to implement:**
```typescript
// lib/i18nUtils.ts — testable locale resolution, extracted from i18n/request.ts

const SUPPORTED_LOCALES = ['fi', 'en'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]

/**
 * resolveLocale — validates and normalises a raw cookie value into a supported locale.
 * Falls back to 'fi' for any invalid or missing value.
 */
export function resolveLocale(raw: string | undefined): Locale {
  return SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : 'fi'
}
```

---

### `lib/i18nUtils.test.ts` (test, —)

**Analog:** `lib/priceUtils.test.ts` — exact match for role, structure, and test runner.

**Full structure pattern** (`lib/priceUtils.test.ts` lines 1-8):
```typescript
import { describe, it, expect } from 'vitest'
import { isMembershipOnly, marqueePriceLines } from './priceUtils'

describe('isMembershipOnly', () => {
  it('palauttaa true kun ...', () => {
    expect(isMembershipOnly({ ... })).toBe(true)
  })
  // ...
})
```

**Test runner command** (from `vitest.config.ts`):
```
npx vitest run lib/
```

**Pattern to implement:**
```typescript
import { describe, it, expect } from 'vitest'
import { resolveLocale } from './i18nUtils'

describe('resolveLocale', () => {
  it('returns "fi" when raw is undefined (no cookie)', () => {
    expect(resolveLocale(undefined)).toBe('fi')
  })
  it('returns "fi" when raw is "fi"', () => {
    expect(resolveLocale('fi')).toBe('fi')
  })
  it('returns "en" when raw is "en"', () => {
    expect(resolveLocale('en')).toBe('en')
  })
  it('returns "fi" for an invalid locale value', () => {
    expect(resolveLocale('de')).toBe('fi')
  })
  it('returns "fi" for an empty string', () => {
    expect(resolveLocale('')).toBe('fi')
  })
  it('returns "fi" for a path-traversal attempt', () => {
    expect(resolveLocale('../etc/passwd')).toBe('fi')
  })
})
```

---

### `app/actions/locale.ts` (server-action, request-response)

**Analog:** No `app/actions/` directory exists yet. Closest structural reference is the server-side Supabase write in `app/profiili/ProfiiliClient.tsx` — same "write data server-side" intent.

**ProfiiliClient server-write pattern** (`ProfiiliClient.tsx` lines 53-70):
```typescript
async function handleSave() {
  if (!userId) return
  const supabase = createBrowserSupabase()
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, kotikaupunki: trimmed, ... }, { onConflict: 'user_id' })
  if (!error) { ... }
  else { setSaveError('Tallennus epäonnistui. Yritä uudelleen.') }
}
```

**Pattern to implement** (from RESEARCH.md Pattern 2 — server action file, avoids prop-drilling):
```typescript
// app/actions/locale.ts
'use server'
import { cookies } from 'next/headers'

export async function changeLocaleAction(locale: 'fi' | 'en') {
  const store = await cookies()
  store.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
}
```

**Note:** The `'use server'` directive at the top of the file makes every exported function in this file a Server Action — no need for inline `'use server'` on each function.

---

### `messages/fi.json` and `messages/en.json` (config/data)

**Analog:** None — JSON message files have no codebase precedent.

**Namespace structure** (from RESEARCH.md Translation Scope Inventory — complete structure):

9 namespaces: `Nav`, `PaikkaKortti`, `PaikkaSheet`, `Filters`, `Todo`, `Profiili`, `Auth`, `Map`, `PaikkaPage`, `NotFound`, `Days`

Full content is specified verbatim in RESEARCH.md "Code Examples" section (lines 494–713). Planner should copy those JSON blocks directly — no further extraction needed.

**Kaikki sentinel — critical:** Do NOT translate the `'Kaikki'` comparison value used in `Etusivu.tsx`. Only translate the display label via `t('Filters.all')`. The state variable `searchKaupunki` must remain initialized to `'Kaikki'` (or refactored to `'all'`/`null`).

---

### `global.d.ts` (config, TypeScript augmentation)

**Analog:** `next-env.d.ts` (lines 1-5) — same `/// <reference>` style and module-declaration convention.

**`next-env.d.ts` pattern** (lines 1-2):
```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

**Pattern to implement** (from RESEARCH.md Pattern 5):
```typescript
// global.d.ts (project root, alongside next-env.d.ts)
import messages from './messages/fi.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: 'fi' | 'en'
    Messages: typeof messages
  }
}
```

---

### `next.config.mjs` — modify (config)

**Analog:** Self — existing file at `next.config.mjs`.

**Current export pattern** (lines 16-27):
```javascript
export default withSerwist({
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'query', key: 'nakyma', value: 'lista' }],
        destination: '/',
        permanent: true,
      },
    ]
  },
});
```

**Pattern to implement** — add `withNextIntl` as outermost wrapper (from RESEARCH.md Pattern 4):
```javascript
import createNextIntlPlugin from 'next-intl/plugin'
// ... existing imports ...

const withNextIntl = createNextIntlPlugin()
// createNextIntlPlugin() with no args auto-discovers ./i18n/request.ts

export default withNextIntl(withSerwist({
  async redirects() { /* existing redirects unchanged */ },
}));
```

**Wrapping order:** `withNextIntl` outermost, `withSerwist` innermost. Each HOC receives plain config or prior HOC output.

---

### `app/layout.tsx` — modify (provider, request-response)

**Analog:** Self — existing `app/layout.tsx`.

**Current structure** (lines 1-30):
```typescript
import type { Metadata, Viewport } from 'next'
import { Outfit, Playfair_Display } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import MapProvider from './components/MapProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={cn('font-sans', outfit.variable, playfair.variable)}>
      <body className="antialiased bg-white text-[#111111]">
        <MapProvider>
          <main>{children}</main>
        </MapProvider>
      </body>
    </html>
  )
}
```

**Pattern to implement** — convert to `async`, add `NextIntlClientProvider`, dynamic `lang`:
```typescript
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={cn('font-sans', outfit.variable, playfair.variable)}>
      <body className="antialiased bg-white text-[#111111]">
        <MapProvider>
          <NextIntlClientProvider>
            <main>{children}</main>
          </NextIntlClientProvider>
        </MapProvider>
      </body>
    </html>
  )
}
```

**Note:** `NextIntlClientProvider` auto-serializes messages to client — no `messages` prop needed in next-intl v4+. Place it inside `<MapProvider>` to preserve the existing provider nesting.

---

### `app/components/NavPill.tsx` — modify (component, request-response)

**Analog:** Self. Current hard-coded strings to replace (lines 65, 72, 76-78, 89):

| Current string | Translation key |
|---|---|
| `Profiili` | `t('Nav.profile')` |
| `Kirjaudu ulos` | `t('Nav.signOut')` |
| `Kirjaudu` | `t('Nav.signIn')` |
| `aria-label={open ? 'Sulje valikko' : 'Avaa valikko'}` | `aria-label={open ? t('Nav.closeMenu') : t('Nav.openMenu')}` |

**Hook addition pattern** — copy from `ProfiiliClient.tsx` pattern for adding `useTranslations`:
```typescript
// Add at top of component, after existing hooks:
import { useTranslations } from 'next-intl'
// Inside component function:
const t = useTranslations('Nav')
```

**Existing import block** (lines 1-9):
```typescript
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, MoreHorizontal, X } from 'lucide-react'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'
```

---

### `app/components/PaikkaKortti.tsx` — modify (component, request-response)

**Analog:** Self. Current hard-coded strings (lines 54, 75, 79, 97-109, 113, 158, 180):

| Current string | Translation key |
|---|---|
| `'Poista TO DO -listalta'` | `t('PaikkaKortti.removeFromTodo')` |
| `'Lisää TO DO -listalle'` | `t('PaikkaKortti.addToTodo')` |
| `Sponsoroitu` | `t('PaikkaKortti.sponsored')` |
| `Kertakäynti OK` | `t('PaikkaKortti.dropIn')` |
| `Auki nyt · {openStatus.hours}` | `t('PaikkaKortti.openNow') + ' · ' + openStatus.hours` |
| `Suljettu` | `t('PaikkaKortti.closed')` |
| `'Aukioloajat tuntematon'` | `t('PaikkaKortti.hoursUnknown')` |
| `'Aukioloajat lisätään pian'` | `t('PaikkaKortti.hoursComingSoon')` |
| `vain jäsenyys` | `t('PaikkaKortti.membershipOnly')` |
| `Lisätään pian` | `t('PaikkaKortti.priceComingSoon')` |
| `Näytä tiedot` | `t('PaikkaKortti.showDetails')` |

**Existing import block** (lines 1-12) — add `useTranslations` import alongside existing imports:
```typescript
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
// ... (keep all existing imports)
// ADD:
import { useTranslations } from 'next-intl'
```

---

### `app/components/DiagonaalKortti.tsx` — modify (component, request-response)

**Analog:** Self. Grep for hard-coded strings to replace:

| Current string | Translation key |
|---|---|
| `vain jäsenyys` | `t('PaikkaKortti.membershipOnly')` |
| `Lisätään pian` | `t('PaikkaKortti.priceComingSoon')` |
| `'Poista TO DO -listalta'` / `'Lisää TO DO -listalle'` | `t('PaikkaKortti.removeFromTodo')` / `t('PaikkaKortti.addToTodo')` |
| `Auki · {hours}` / `Suljettu` | `t('PaikkaKortti.openNow')` / `t('PaikkaKortti.closed')` |

Uses the same `PaikkaKortti` namespace as `PaikkaKortti.tsx` — shared strings. Same `useTranslations` import pattern.

**Existing import block** (lines 1-13):
```typescript
'use client'
import { useRef, useState, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
// ... (keep all existing)
// ADD: import { useTranslations } from 'next-intl'
```

---

### `app/components/PaikkaSheet.tsx` — modify (component, request-response)

**Analog:** Self. Hard-coded strings are in the section not yet read (lines 160+). Key strings per RESEARCH.md:

| Current string | Translation key |
|---|---|
| `Hinta` | `t('PaikkaSheet.price')` |
| `Aukioloajat` | `t('PaikkaSheet.hours')` |
| `Puhelin` | `t('PaikkaSheet.phone')` |
| `Kuvaus` | `t('PaikkaSheet.description')` |
| `Varaa aika` | `t('PaikkaSheet.bookNow')` |
| `Arvostelut` | `t('PaikkaSheet.reviews')` |
| `Ei arvosteluja` | `t('PaikkaSheet.noReviews')` |
| `{N} arvostelua` | `t('PaikkaSheet.reviewCount', { count: N })` |
| `'Poista TO DO -listalta'` / `'Lisää TO DO -listalle'` | `t('PaikkaKortti.removeFromTodo')` / `t('PaikkaKortti.addToTodo')` |

**Existing import block** (lines 1-14):
```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// ... (keep all existing)
// ADD: import { useTranslations } from 'next-intl'
```

---

### `app/components/AuthModal.tsx` — modify (component, request-response)

**Analog:** Self. Hard-coded strings (lines 152, 187, 204, 210, 229, 240, 268-275):

| Current string | Translation key |
|---|---|
| `aria-label={mode === 'signin' ? 'Kirjaudu sisään' : 'Luo tili'}` | `t('Auth.signIn')` / `t('Auth.signUp')` |
| `{mode === 'signin' ? 'Kirjaudu sisään' : 'Luo tili'}` (h2) | same |
| `Jatka Googlella` | `t('Auth.continueWithGoogle')` |
| `TAI` | `t('Auth.or')` |
| `placeholder="Sähköpostiosoite"` | `placeholder={t('Auth.emailPlaceholder')}` |
| `placeholder="Salasana"` | `placeholder={t('Auth.passwordPlaceholder')}` |
| `Kirjaudu` / `Luo tili` (submit button) | `t('Auth.signIn')` / `t('Auth.signUp')` |
| `aria-label="Sulje"` (close button, line 178) | `aria-label={t('Auth.close')}` |

**Existing import block** (lines 1-8):
```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import type { AuthChangeEvent, Session, AuthError } from '@supabase/supabase-js'
// ADD: import { useTranslations } from 'next-intl'
```

---

### `app/profiili/ProfiiliClient.tsx` — modify + LanguageToggle (component, CRUD)

**Analog:** Self. This is the most complex modification — string replacement PLUS adding the language toggle.

**Existing import block** (lines 1-9):
```typescript
'use client'
import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import { lajiKonfig } from '@/lib/lajit'
// ADD:
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { changeLocaleAction } from '@/app/actions/locale'
```

**Hard-coded strings to replace:**

| Current string | Translation key |
|---|---|
| `Profiili vaatii kirjautumisen` (h1, line 105) | `t('Profiili.requiresAuth')` |
| `Kirjaudu sisään nähdäksesi...` (p, line 108) | `t('Profiili.requiresAuthDesc')` |
| `Kirjaudu sisään` (button, line 115) | `t('Profiili.signInButton')` |
| `Takaisin hakemistoon` (link, line 119) | `t('Profiili.backToDirectory')` |
| `Profiili` (h1, line 134) | `t('Profiili.title')` |
| `Kotipaikkakunta` (label, line 137) | `t('Profiili.homeCity')` |
| `placeholder="esim. Tampere"` (line 143) | `placeholder={t('Profiili.homeCityPlaceholder')}` |
| `Tallenna` (button, line 148) | `t('Profiili.save')` |
| `Kotikaupunki tallennettu` (line 153) | `t('Profiili.homeCitySaved')` |
| `'Tallennus epäonnistui...'` (line 68) | `t('Profiili.saveError')` |
| `Kiinnostuksen kohteet` (label, line 159) | `t('Profiili.interests')` |
| `Tallenna` (second, line 177) | `t('Profiili.save')` |
| `Kiinnostukset tallennettu` (line 182) | `t('Profiili.interestsSaved')` |
| `Takaisin hakemistoon` (bottom link, line 188) | `t('Profiili.backToDirectory')` |

**LanguageToggle pattern** (from RESEARCH.md Pattern 3 — verified from official next-intl LocaleSwitcher example):
```typescript
// Embed directly in ProfiiliClient, in a new glass card section after kiinnostukset card:
function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('Profiili')

  function toggle() {
    const next = locale === 'fi' ? 'en' : 'fi'
    startTransition(async () => {
      await changeLocaleAction(next)
      router.refresh()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60"
    >
      {locale === 'fi' ? t('switchToEnglish') : t('switchToFinnish')}
    </button>
  )
}
```

**Button style source** — copy exactly from `ProfiiliClient.tsx` line 148 (the existing "Tallenna" button class): `"bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"`. Add `disabled:opacity-60` for pending state.

**Glass card section pattern** (copy from existing kiinnostukset section, lines 156-184):
```tsx
<div className="glass rounded-2xl p-4 flex flex-col gap-3 mt-4">
  <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
    {t('Profiili.language')}
  </label>
  <LanguageToggle />
</div>
```

---

### `app/paikat/[id]/page.tsx` — modify (page, server/CRUD)

**Analog:** Self. This is a server component (async) — uses `getTranslations` not `useTranslations`.

**Existing import block** (lines 1-15):
```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Phone, MapPin, CircleDollarSign, Info, ChevronLeft, Clock, ExternalLink } from 'lucide-react'
import { cookies } from 'next/headers'
// ... (keep all existing)
// ADD:
import { getTranslations } from 'next-intl/server'
```

**Server component translation pattern:**
```typescript
// Inside the async function, after data fetching:
const t = await getTranslations('PaikkaPage')
// Then use: t('backToDirectory'), t('price'), t('hours'), t('phone'), t('description'), t('bookNow')
```

**Hard-coded strings to replace** (lines 54, 99, 104, 114, 123, 137):

| Current string | Translation key |
|---|---|
| `Takaisin hakemistoon` (line 54) | `t('PaikkaPage.backToDirectory')` |
| `label="Aukioloajat"` (line 99) | `label={t('PaikkaPage.hours')}` |
| `label="Puhelin"` (line 104) | `label={t('PaikkaPage.phone')}` |
| `label="Hinta"` (line 114) | `label={t('PaikkaPage.price')}` |
| `label="Varaussivu"` (line 124) | `label={t('PaikkaPage.bookNow')}` |
| `label="Kuvaus"` (line 137) | `label={t('PaikkaPage.description')}` |

**Also:** The `Row` sub-component's `label` prop is already typed as `string` — no type changes needed.

---

### `app/not-found.tsx` — modify (page, server)

**Analog:** Self. Server component — uses `getTranslations`.

**Current structure** (lines 1-22):
```typescript
import Link from 'next/link'
import { SearchX } from 'lucide-react'
// ADD: import { getTranslations } from 'next-intl/server'

export default function NotFound() { ... }
```

**Server component requires `async`:**
```typescript
export default async function NotFound() {
  const t = await getTranslations('NotFound')
  // ...
  <h1>...{t('title')}</h1>
  <p>...{t('description')}</p>
  <Link ...>{t('backHome')}</Link>
}
```

---

## Shared Patterns

### `useTranslations` hook — client components
**Source:** RESEARCH.md Pattern (next-intl official API)
**Apply to:** All `'use client'` components — NavPill, Etusivu, PaikkaKortti, DiagonaalKortti, PaikkaSheet, AuthModal, ProfiiliClient

```typescript
// 1. Add to imports:
import { useTranslations } from 'next-intl'

// 2. Add inside component function (before JSX return):
const t = useTranslations('NamespaceName')

// 3. Replace string literals:
// Before: "Kirjaudu ulos"
// After:  {t('signOut')}

// 4. Replace placeholder strings:
// Before: placeholder="Sähköpostiosoite"
// After:  placeholder={t('emailPlaceholder')}

// 5. Replace aria-label strings:
// Before: aria-label="Sulje valikko"
// After:  aria-label={t('closeMenu')}
```

### `getTranslations` — server components
**Source:** RESEARCH.md Pattern (next-intl official API)
**Apply to:** All `async` server components — `app/paikat/[id]/page.tsx`, `app/not-found.tsx`

```typescript
// 1. Add to imports:
import { getTranslations } from 'next-intl/server'

// 2. Make component async if not already:
export default async function PageName() {

// 3. Await translations before use:
const t = await getTranslations('NamespaceName')

// 4. Use t() in JSX same as useTranslations
```

### Existing button class — copy for LanguageToggle
**Source:** `app/profiili/ProfiiliClient.tsx` line 148
**Apply to:** `LanguageToggle` button in ProfiiliClient

```typescript
className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
// Add for toggle: disabled:opacity-60
```

### `router.refresh()` pattern after server-side state change
**Source:** `app/components/NavPill.tsx` lines 23-28 (handleSignOut)
**Apply to:** `LanguageToggle` in ProfiiliClient

```typescript
// NavPill existing pattern:
async function handleSignOut() {
  setUser(null)
  setOpen(false)
  try {
    await createBrowserSupabase().auth.signOut()
  } finally {
    router.refresh()
  }
}
// Language toggle adaptation — wrap in startTransition to prevent UI flicker:
startTransition(async () => {
  await changeLocaleAction(next)
  router.refresh()
})
```

### Glass card section pattern
**Source:** `app/profiili/ProfiiliClient.tsx` lines 136-155
**Apply to:** New Language section in ProfiiliClient

```tsx
<div className="glass rounded-2xl p-4 flex flex-col gap-3 mt-4">
  <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
    {/* section label */}
  </label>
  {/* content */}
</div>
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `messages/fi.json` | config/data | — | JSON message files have no codebase precedent; full content specified in RESEARCH.md |
| `messages/en.json` | config/data | — | Same — parallel English structure; full content in RESEARCH.md |
| `i18n/request.ts` | config | request-response | No `getRequestConfig`/next-intl pattern exists yet; use RESEARCH.md Pattern 1 verbatim |

---

## Metadata

**Analog search scope:** `app/`, `lib/`, project root config files
**Files scanned:** 12 source files read directly; vitest config and test files for test pattern
**Pattern extraction date:** 2026-06-04
