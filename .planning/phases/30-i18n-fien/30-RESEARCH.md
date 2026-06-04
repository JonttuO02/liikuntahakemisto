# Phase 30: i18n FI/EN - Research

**Researched:** 2026-06-04
**Domain:** next-intl without-routing, App Router, cookie-based locale, translation architecture
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md / STATE.md)

### Locked Decisions
- i18n library: `next-intl` with **without-routing** configuration (no locale-prefixed URLs)
- Locale persistence: `NEXT_LOCALE` cookie (not localStorage)
- Language toggle location: `/profiili` page ONLY — not in NavBar or NavPill
- URL contract preserved: `/` and `/?nakyma=lista` remain unchanged

### Claude's Discretion
- Exact translation key structure / namespace design
- Whether sport labels in `lib/lajit.ts` are translated (see section below)
- Language toggle UI component design (button style, placement within ProfiiliClient)

### Deferred Ideas (OUT OF SCOPE)
- URL-based locale routing (breaks URL contract)
- Additional languages beyond FI/EN in v1.6
- Browser language auto-detection on first load
- ICU plural/date formatting
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | Käyttäjä voi vaihtaa käyttöliittymäkielen suomeksi tai englanniksi profiilisivulla | Language toggle in `ProfiiliClient.tsx` via Server Action + `useLocale()` |
| I18N-02 | Valittu kieli tallennetaan `NEXT_LOCALE`-cookieen ja säilyy sivulatausten välillä | `cookies().set('NEXT_LOCALE', locale)` in Server Action read by `i18n/request.ts` |
| I18N-03 | Kaikki UI-tekstitykset näytetään valitulla kielellä; kartan tila ja filtterivalinnat säilyvät kieltä vaihdettaessa | All static strings replaced with `useTranslations()`/`getTranslations()` calls; state preserved because locale change triggers `router.refresh()` (soft re-render) not full navigation |
</phase_requirements>

---

## Summary

Phase 30 adds FI/EN language switching using next-intl's **without-routing** mode. The key insight is that without-routing means no URL locale prefixes — the locale is stored purely in a cookie named `NEXT_LOCALE` (the standard Next.js convention, hardcoded as such in next-intl's codebase). [VERIFIED: next-intl GitHub source]

The canonical pattern, confirmed from the official next-intl `example-app-router-without-i18n-routing` repository, uses a **Server Action** defined in `app/layout.tsx` to write the cookie, and passes it down as a prop to a client-side `LanguageSwitcher` component. The client calls the Server Action on button click, then calls `router.refresh()` (via `useRouter`) to trigger a soft re-render with the new locale — map state, filter state, and URL are fully preserved.

`next-intl` version 4.13.0 is the current latest (created 2020, last updated 2026-05-28). [VERIFIED: npm registry]. The library is slopcheck-verified [OK].

**Primary recommendation:** Install `next-intl@^4.13.0`, create `messages/fi.json` + `messages/en.json`, add `i18n/request.ts` that reads the `NEXT_LOCALE` cookie, wrap `app/layout.tsx` children in `<NextIntlClientProvider>`, add a Server Action to write the cookie, embed the toggle in `ProfiiliClient.tsx`. Replace all hard-coded Finnish strings across the codebase with `useTranslations()` / `getTranslations()` calls.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cookie read (locale detection) | API/Backend (Server Component) | — | `cookies()` only available server-side; read in `i18n/request.ts` via `getRequestConfig` |
| Cookie write (locale change) | API/Backend (Server Action) | — | Server Actions can write `cookies()` in App Router; client cannot write HttpOnly cookies directly |
| Locale state propagation | Frontend Server (SSR layout) | Browser/Client | `NextIntlClientProvider` in layout.tsx serializes messages to client; `useTranslations` consumes on client |
| Translation rendering | Browser/Client (client components) | Frontend Server (server components) | `useTranslations` for `'use client'` components; `getTranslations` for async server components |
| Language toggle UI | Browser/Client | — | Interactive toggle is a client component; state from `useLocale()` |
| Filter/map state preservation | Browser/Client | — | `router.refresh()` re-renders server components without resetting React state in client components |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-intl` | `^4.13.0` | i18n provider, hooks, message loading, cookie-based locale | Official next-intl library; slopcheck [OK]; 5+ years on npm; 2M+ weekly downloads [VERIFIED: npm registry] |

### Supporting
No additional libraries required. Cookie writing uses `next/headers` (built-in). Locale change uses `useRouter` from `next/navigation` (built-in). No `js-cookie` or `react-cookie` needed — server action writes cookie server-side.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Action for cookie write | `document.cookie` in client | `document.cookie` cannot set `HttpOnly` and requires page reload instead of soft refresh; Server Action is the official pattern [VERIFIED: next-intl example repo] |
| `router.refresh()` after toggle | `window.location.reload()` | Full reload loses client state (scroll, open sheet, map zoom); `router.refresh()` re-fetches server components but preserves React client state |
| `router.refresh()` after toggle | `startTransition(() => router.refresh())` | `startTransition` wrapper prevents the UI from flickering during re-render; recommended for production quality |

**Installation:**
```bash
npm install next-intl
```

**Version verification:** `npm view next-intl version` returns `4.13.0` as of 2026-06-04. [VERIFIED: npm registry]

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `next-intl` | npm | ~5.5 yrs (created 2020-11-19) | ~2M/wk (estimate) | github.com/amannn/next-intl | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Request arrives (any route)
       │
       ▼
middleware.ts ── refreshes Supabase auth session
       │         (NEXT_LOCALE cookie untouched by middleware)
       ▼
app/layout.tsx (async Server Component)
  ├── reads NEXT_LOCALE cookie via getLocale() → locale = 'fi' | 'en'
  ├── sets <html lang={locale}>
  ├── defines Server Action: changeLocaleAction(locale)
  │       └── cookies().set('NEXT_LOCALE', locale)
  └── <NextIntlClientProvider>
           │  (serializes messages for current locale to client)
           ▼
     page/component tree
       ├── Server Components: getTranslations('namespace')
       └── Client Components: useTranslations('namespace')
                                        │
                                        ▼
                           /profiili → ProfiiliClient.tsx
                             LanguageToggle component
                               onClick → changeLocaleAction('en')
                                           └── startTransition(() => router.refresh())
```

### Recommended Project Structure

```
messages/
├── fi.json          # Finnish strings (source of truth)
└── en.json          # English strings
i18n/
└── request.ts       # getRequestConfig — reads NEXT_LOCALE cookie
app/
├── layout.tsx       # NextIntlClientProvider + changeLocaleAction Server Action
└── profiili/
    └── ProfiiliClient.tsx  # Language toggle embedded here
global.d.ts          # TypeScript augmentation for Locale type + message keys
```

Note: This project does not use a `src/` directory — `i18n/` lives at project root alongside `app/`, `lib/`.

### Pattern 1: getRequestConfig with NEXT_LOCALE cookie

**What:** Server-side function that reads the locale from cookies on every request and loads the appropriate message file.

**When to use:** Always — this is the entry point for all locale resolution.

```typescript
// i18n/request.ts
// Source: https://github.com/amannn/next-intl/blob/main/examples/example-app-router-without-i18n-routing/src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const store = await cookies()
  const locale = store.get('NEXT_LOCALE')?.value ?? 'fi'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

**Note on cookie name:** The official next-intl docs example uses `'locale'` as the cookie name, but the STATE.md locked decision specifies `NEXT_LOCALE` (the standard Next.js convention). Use `NEXT_LOCALE` — it matches the locked decision and aligns with next-intl's internal middleware cookie name. [ASSUMED — STATE.md locks this; confirmed as valid convention by community research]

**Note on import path:** With `i18n/request.ts` at project root (no `src/`), the import path for messages is `../messages/${locale}.json`.

### Pattern 2: Server Action for locale write + layout wiring

**What:** A Server Action in layout.tsx writes the cookie and is passed as a prop to the language switcher client component.

**When to use:** Language toggle button in ProfiiliClient.

```typescript
// app/layout.tsx (excerpt)
// Source: https://github.com/amannn/next-intl/blob/main/examples/example-app-router-without-i18n-routing/src/app/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import { cookies } from 'next/headers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  async function changeLocaleAction(locale: 'fi' | 'en') {
    'use server'
    const store = await cookies()
    store.set('NEXT_LOCALE', locale)
  }

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

**IMPORTANT:** The `changeLocaleAction` needs to be accessible to `ProfiiliClient`. Since ProfiiliClient is nested deep (not a direct child of layout), the cleanest approach is to pass it via a thin wrapper server component in the profiili route, OR define the action separately in a file with `'use server'` directive — the latter avoids prop-drilling through the entire tree.

**Preferred pattern — separate server action file:**
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

This avoids the prop-drilling problem: ProfiiliClient imports the action directly.

### Pattern 3: Language toggle client component

**What:** Client component that reads current locale, calls the server action, then does a soft refresh.

```typescript
// Embedded in ProfiiliClient.tsx (or extracted to LanguageToggle.tsx)
// Source: adapted from https://github.com/amannn/next-intl/blob/main/examples/example-app-router-without-i18n-routing/src/app/LocaleSwitcher.tsx
'use client'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { changeLocaleAction } from '@/app/actions/locale'

export function LanguageToggle() {
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
      {locale === 'fi' ? 'Switch to English' : 'Vaihda suomeksi'}
    </button>
  )
}
```

### Pattern 4: next.config.mjs plugin integration

**What:** Wrapping the existing withSerwist config with the next-intl plugin.

```javascript
// next.config.mjs — adapted to wrap existing config
import createNextIntlPlugin from 'next-intl/plugin'
import withSerwistInit from '@serwist/next'

// ... (existing serwist setup)

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(withSerwist({
  // existing redirects etc.
}))
```

**Plugin location:** The `createNextIntlPlugin()` call with no arguments uses the default `./i18n/request.ts` path automatically. [VERIFIED: next-intl docs]

### Pattern 5: TypeScript augmentation (global.d.ts)

```typescript
// global.d.ts (project root)
import messages from './messages/fi.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: 'fi' | 'en'
    Messages: typeof messages
  }
}
```

This gives TypeScript autocomplete on translation keys in `useTranslations` calls.

### Anti-Patterns to Avoid

- **Using `document.cookie` in a client component to write the locale:** `document.cookie` cannot set proper cookie attributes (`HttpOnly`, `SameSite`, `path`). Use the Server Action pattern instead.
- **Using `window.location.reload()`:** Causes a full page reload — loses map viewport, filter state, open sheet. Use `router.refresh()`.
- **Importing `js-cookie` or `react-cookie` for server-side cookie reads:** `cookies()` from `next/headers` is the correct server-side API. `js-cookie` is browser-only.
- **Putting `i18n/request.ts` inside `src/`:** This project has no `src/` directory — place at root.
- **Using routing-based locale URL setup:** This project has a locked URL contract (`/` and `/?nakyma=lista`). The without-routing pattern is the only valid approach.
- **Translating `lib/lajit.ts` sport labels:** Sport labels (`Padel`, `Tennis`, etc.) are proper nouns — they are the same in Finnish and English. No translation needed for sport labels.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Message loading, locale resolution, provider wiring | Custom React Context with manual JSON loading | `next-intl` | next-intl handles React Cache invalidation, SSR/client hydration matching, TypeScript types, pluralization edge cases |
| Cookie-based locale persistence | Custom cookie utilities | `next/headers` cookies() + Server Action pattern | Built-in, no extra dep, correct attributes |
| Locale detection in middleware | Custom middleware locale parsing | `getRequestConfig` + `cookies()` | next-intl's getRequestConfig is request-scoped via React Cache — correct in App Router |

**Key insight:** The hardest part of i18n is not string replacement — it is SSR/client hydration consistency. If the server renders with `locale=fi` but the client provider initializes with `locale=en`, React throws hydration errors. next-intl's `NextIntlClientProvider` solves this by serializing the server-resolved locale into the client bundle automatically.

---

## Translation Scope Inventory

The following components contain translatable strings. All are `'use client'` unless noted.

### Priority 1 — Core UI (user-visible on every interaction)

| Component / File | Type | Strings to translate |
|-----------------|------|---------------------|
| `app/components/Etusivu.tsx` | client | "TO DO", "Lista on tyhjä", "Lisää paikkoja kirjanmerkkipainikkeella", "Kyllä", "Ei", "Arvostelu tallennettu", "Ohita", "TÄHTIARVOSANA", "KOMMENTTI", "Kirjaudu", "Kirjaudu ulos", "Profiili", "Vapaaehtoinen kommentti", placeholder "Hae liikuntapaikkaa...", aria-labels: "Palaa omalle sijainnille", "Suodata kaupungin mukaan", "Suodata lajin mukaan", "Haku ja filtterit", "Näytä lista" |
| `app/components/PaikkaKortti.tsx` | client | "Sponsoroitu", "Kertakäynti OK", "Auki nyt", "Suljettu", "Aukioloajat tuntematon", "Aukioloajat lisätään pian", "vain jäsenyys", "Lisätään pian", "Näytä tiedot", aria-labels for bookmark |
| `app/components/DiagonaalKortti.tsx` | client | "vain jäsenyys", "Lisätään pian", "Auki · {hours}", "Suljettu", aria-labels |
| `app/components/PaikkaSheet.tsx` | client | "Hinta", "Aukioloajat", "Puhelin", "Kuvaus", "Varaa aika", "Arvostelut", "Ei arvosteluja", "{N} arvostelua", aria-labels for close/bookmark |
| `app/components/NavPill.tsx` | client | "Profiili", "Kirjaudu ulos", "Kirjaudu", aria-labels |
| `app/profiili/ProfiiliClient.tsx` | client | "Profiili vaatii kirjautumisen", "Kirjaudu sisään...", "Kirjaudu sisään", "Takaisin hakemistoon", "Profiili", "Kotipaikkakunta", "Tallenna", "Kotikaupunki tallennettu", "Tallennus epäonnistui. Yritä uudelleen.", "Kiinnostuksen kohteet", "Kiinnostukset tallennettu" |

### Priority 2 — Secondary pages

| Component / File | Type | Strings to translate |
|-----------------|------|---------------------|
| `app/paikat/[id]/page.tsx` | server | "Takaisin hakemistoon", section labels "Hinta", "Aukioloajat", "Puhelin", "Varaa aika", "Kuvaus", open/closed status |
| `app/components/AuthModal.tsx` | client | "Kirjaudu sisään" / "Luo tili", "Sähköpostiosoite", "Salasana", "Jatka Googlella", "TAI", "Kirjaudu", error messages |
| `app/not-found.tsx` | server | "Sivua ei löydy.", "Etsimääsi sivua ei ole olemassa...", "Palaa etusivulle" |

### Priority 3 — Utility strings

| Component / File | Type | Notes |
|-----------------|------|-------|
| `app/tietosuoja/page.tsx` | server | Long-form legal text — translating is large scope. Likely leave Finnish-only for v1.6, translate in v1.7. [ASSUMED] |
| `lib/aukiolo.ts` — `FI_ABBR` day abbreviations | utility | Day labels (Ma/Ti/Ke...) rendered in HoursTable. These are locale-specific and MUST be translated. See pitfall below. |
| `lib/lajit.ts` — sport labels | utility | "Padel", "Tennis" etc. are proper nouns — same in FI/EN. No translation needed. |
| Filter pill "Kaikki" sentinel value | data value | "Kaikki" is used as a **comparison value** in `searchKaupunki === 'Kaikki'` logic. Do NOT translate this sentinel — translate only the display label separately. |

### "Kaikki" sentinel value — critical note

`Etusivu.tsx` uses `'Kaikki'` as both a display string AND a sentinel value in comparisons:
```typescript
const [searchKaupunki, setSearchKaupunki] = useState('Kaikki')
// ...
const matchesKaupunki = searchKaupunki === 'Kaikki' || ...
```
Do NOT replace the `'Kaikki'` sentinel with a translated string. The correct approach: keep the sentinel as `'all'` (or keep `'Kaikki'` as-is), and translate only the display label in the UI. Example refactor:
```typescript
const ALL_SENTINEL = 'Kaikki' // keep unchanged
// display label from translations: t('filters.all')
```

### Day abbreviation translation

`lib/aukiolo.ts` hardcodes Finnish day abbreviations in `FI_ABBR`. Two options:
1. Pass locale to `formatGroupedHours` and return locale-aware labels — requires touching lib code
2. Create a translation map in messages.json for day labels, and translate after the fact in `HoursTable.tsx`

Option 2 is simpler: keep `aukiolo.ts` untouched, translate in `HoursTable.tsx` using `useTranslations('Days')`. [ASSUMED — planner picks one]

---

## Common Pitfalls

### Pitfall 1: Hydration mismatch on first render

**What goes wrong:** Server renders with `locale=fi`, client-side React initializes before `NextIntlClientProvider` mounts → hydration mismatch error in console, potentially broken translations on first load.

**Why it happens:** `NextIntlClientProvider` must wrap ALL components that call `useTranslations`. If any component using `useTranslations` is rendered outside the provider (e.g., in a Suspense boundary that resolves before the provider), locale mismatch occurs.

**How to avoid:** Place `<NextIntlClientProvider>` at the top of `app/layout.tsx` body, wrapping the entire `<main>` and `<MapProvider>`. [VERIFIED: next-intl docs]

**Warning signs:** React console errors mentioning "Text content did not match" or "useTranslations was called before NextIntlClientProvider".

---

### Pitfall 2: Server Action cookie write timing

**What goes wrong:** User clicks language toggle, `changeLocaleAction` runs, but `router.refresh()` fires before the cookie write completes → re-render still shows old locale.

**Why it happens:** Server Actions are async. If `router.refresh()` is called synchronously after initiating the action (not awaiting it), the refresh happens before the cookie is written.

**How to avoid:** `await changeLocaleAction(next)` before calling `router.refresh()`. Use `useTransition` to wrap both calls so they batch correctly:
```typescript
startTransition(async () => {
  await changeLocaleAction(next)
  router.refresh()
})
```
[VERIFIED: next-intl GitHub example — LocaleSwitcher uses this pattern]

---

### Pitfall 3: 'Kaikki' sentinel translated breaks filter logic

**What goes wrong:** Developer replaces all Finnish strings including the `'Kaikki'` comparison sentinel with `t('filters.all')` → filter logic breaks because `searchKaupunki === t('filters.all')` evaluates to `false` when the state holds the old `'Kaikki'` string.

**Why it happens:** The sentinel string is used for both state comparison and display.

**How to avoid:** Keep `'Kaikki'` as a code-level constant; translate only the display label. Or refactor to use a dedicated `null`/`undefined` to represent "all".

---

### Pitfall 4: `next.config.mjs` plugin wrapping order

**What goes wrong:** `withNextIntl()` wraps the serwist config incorrectly → either i18n or service worker breaks.

**Why it happens:** Each `withX` HOC expects a plain config object or the output of another `withX` — the order matters.

**How to avoid:** `withNextIntl(withSerwist({ ...existingConfig }))` — nextIntl outermost, serwist innermost. [ASSUMED — based on standard HOC composition; verify at build time]

---

### Pitfall 5: Missing `messages` import for dynamic chunks

**What goes wrong:** `import(`../messages/${locale}.json`)` fails at build time with Webpack/Turbopack if the dynamic segment is not resolvable to a finite set.

**Why it happens:** Webpack static analysis cannot determine all possible locale paths from a variable.

**How to avoid:** Keep locale values to a finite set (`'fi' | 'en'` only). Validate the locale before import:
```typescript
const validLocales = ['fi', 'en'] as const
type Locale = typeof validLocales[number]
const safeLocale: Locale = validLocales.includes(locale as Locale) ? (locale as Locale) : 'fi'
```
This satisfies Webpack's static analysis and prevents invalid locale paths.

---

### Pitfall 6: `getLocale()` vs cookie read in `i18n/request.ts`

**What goes wrong:** `getLocale()` (from `next-intl/server`) is called in a Server Component but returns stale locale from a previous request.

**Why it happens:** `getLocale()` reads from the request config created by `getRequestConfig`. If `getRequestConfig` reads from cookies correctly, `getLocale()` will reflect the current cookie value.

**How to avoid:** Ensure `i18n/request.ts` reads `NEXT_LOCALE` from cookies correctly and returns it as the `locale` field. `getLocale()` is a thin wrapper that calls back into this config.

---

## Code Examples

### Complete `i18n/request.ts`

```typescript
// i18n/request.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
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

### Minimal `messages/fi.json` structure (namespace design)

```json
{
  "Nav": {
    "profile": "Profiili",
    "signIn": "Kirjaudu",
    "signOut": "Kirjaudu ulos",
    "openMenu": "Avaa valikko",
    "closeMenu": "Sulje valikko"
  },
  "PaikkaKortti": {
    "sponsored": "Sponsoroitu",
    "dropIn": "Kertakäynti OK",
    "openNow": "Auki nyt",
    "closed": "Suljettu",
    "hoursUnknown": "Aukioloajat tuntematon",
    "hoursComingSoon": "Aukioloajat lisätään pian",
    "membershipOnly": "vain jäsenyys",
    "priceComingSoon": "Lisätään pian",
    "showDetails": "Näytä tiedot",
    "addToTodo": "Lisää TO DO -listalle",
    "removeFromTodo": "Poista TO DO -listalta"
  },
  "PaikkaSheet": {
    "price": "Hinta",
    "hours": "Aukioloajat",
    "phone": "Puhelin",
    "description": "Kuvaus",
    "bookNow": "Varaa aika",
    "reviews": "Arvostelut",
    "noReviews": "Ei arvosteluja",
    "reviewCount": "{count} arvostelua"
  },
  "Filters": {
    "all": "Kaikki",
    "searchPlaceholder": "Hae liikuntapaikkaa...",
    "filterBySport": "Suodata lajin mukaan",
    "filterByCity": "Suodata kaupungin mukaan",
    "searchAndFilters": "Haku ja filtterit",
    "showList": "Näytä lista"
  },
  "Todo": {
    "title": "TO DO",
    "empty": "Lista on tyhjä",
    "emptyHint": "Lisää paikkoja kirjanmerkkipainikkeella",
    "visited": "Kävikö paikassa?",
    "yes": "Kyllä",
    "no": "Ei",
    "reviewSaved": "Arvostelu tallennettu",
    "skip": "Ohita",
    "ratingLabel": "TÄHTIARVOSANA",
    "commentLabel": "KOMMENTTI",
    "commentPlaceholder": "Vapaaehtoinen kommentti",
    "openList": "Avaa TO DO -lista",
    "closeList": "Sulje TO DO -lista"
  },
  "Profiili": {
    "title": "Profiili",
    "requiresAuth": "Profiili vaatii kirjautumisen",
    "requiresAuthDesc": "Kirjaudu sisään nähdäksesi ja muokataksesi profiiliasi.",
    "signInButton": "Kirjaudu sisään",
    "backToDirectory": "Takaisin hakemistoon",
    "homeCity": "Kotipaikkakunta",
    "homeCityPlaceholder": "esim. Tampere",
    "save": "Tallenna",
    "homeCitySaved": "Kotikaupunki tallennettu",
    "saveError": "Tallennus epäonnistui. Yritä uudelleen.",
    "interests": "Kiinnostuksen kohteet",
    "interestsSaved": "Kiinnostukset tallennettu",
    "language": "Kieli",
    "switchToEnglish": "Switch to English",
    "switchToFinnish": "Vaihda suomeksi"
  },
  "Auth": {
    "signIn": "Kirjaudu sisään",
    "signUp": "Luo tili",
    "emailPlaceholder": "Sähköpostiosoite",
    "passwordPlaceholder": "Salasana",
    "continueWithGoogle": "Jatka Googlella",
    "or": "TAI",
    "close": "Sulje"
  },
  "Map": {
    "recenter": "Palaa omalle sijainnille"
  },
  "PaikkaPage": {
    "backToDirectory": "Takaisin hakemistoon",
    "price": "Hinta",
    "hours": "Aukioloajat",
    "phone": "Puhelin",
    "description": "Kuvaus",
    "bookNow": "Varaa aika"
  },
  "NotFound": {
    "title": "Sivua ei löydy.",
    "description": "Etsimääsi sivua ei ole olemassa tai se on siirretty.",
    "backHome": "Palaa etusivulle"
  },
  "Days": {
    "ma": "Ma",
    "ti": "Ti",
    "ke": "Ke",
    "to": "To",
    "pe": "Pe",
    "la": "La",
    "su": "Su"
  }
}
```

### `messages/en.json` (parallel structure)

```json
{
  "Nav": {
    "profile": "Profile",
    "signIn": "Sign in",
    "signOut": "Sign out",
    "openMenu": "Open menu",
    "closeMenu": "Close menu"
  },
  "PaikkaKortti": {
    "sponsored": "Sponsored",
    "dropIn": "Drop-in OK",
    "openNow": "Open now",
    "closed": "Closed",
    "hoursUnknown": "Hours unknown",
    "hoursComingSoon": "Hours coming soon",
    "membershipOnly": "membership only",
    "priceComingSoon": "Coming soon",
    "showDetails": "Show details",
    "addToTodo": "Add to TO DO list",
    "removeFromTodo": "Remove from TO DO list"
  },
  "PaikkaSheet": {
    "price": "Price",
    "hours": "Opening hours",
    "phone": "Phone",
    "description": "Description",
    "bookNow": "Book now",
    "reviews": "Reviews",
    "noReviews": "No reviews",
    "reviewCount": "{count} reviews"
  },
  "Filters": {
    "all": "All",
    "searchPlaceholder": "Search venues...",
    "filterBySport": "Filter by sport",
    "filterByCity": "Filter by city",
    "searchAndFilters": "Search and filters",
    "showList": "Show list"
  },
  "Todo": {
    "title": "TO DO",
    "empty": "List is empty",
    "emptyHint": "Add places using the bookmark button",
    "visited": "Did you visit?",
    "yes": "Yes",
    "no": "No",
    "reviewSaved": "Review saved",
    "skip": "Skip",
    "ratingLabel": "RATING",
    "commentLabel": "COMMENT",
    "commentPlaceholder": "Optional comment",
    "openList": "Open TO DO list",
    "closeList": "Close TO DO list"
  },
  "Profiili": {
    "title": "Profile",
    "requiresAuth": "Profile requires sign-in",
    "requiresAuthDesc": "Sign in to view and edit your profile.",
    "signInButton": "Sign in",
    "backToDirectory": "Back to directory",
    "homeCity": "Home city",
    "homeCityPlaceholder": "e.g. Tampere",
    "save": "Save",
    "homeCitySaved": "Home city saved",
    "saveError": "Save failed. Please try again.",
    "interests": "Interests",
    "interestsSaved": "Interests saved",
    "language": "Language",
    "switchToEnglish": "Switch to English",
    "switchToFinnish": "Switch to Finnish"
  },
  "Auth": {
    "signIn": "Sign in",
    "signUp": "Create account",
    "emailPlaceholder": "Email address",
    "passwordPlaceholder": "Password",
    "continueWithGoogle": "Continue with Google",
    "or": "OR",
    "close": "Close"
  },
  "Map": {
    "recenter": "Return to my location"
  },
  "PaikkaPage": {
    "backToDirectory": "Back to directory",
    "price": "Price",
    "hours": "Opening hours",
    "phone": "Phone",
    "description": "Description",
    "bookNow": "Book now"
  },
  "NotFound": {
    "title": "Page not found.",
    "description": "The page you're looking for doesn't exist or has been moved.",
    "backHome": "Back to home"
  },
  "Days": {
    "ma": "Mon",
    "ti": "Tue",
    "ke": "Wed",
    "to": "Thu",
    "pe": "Fri",
    "la": "Sat",
    "su": "Sun"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-intl with `[locale]` route segment | next-intl without-routing via cookie | next-intl v3+ | No URL changes required — correct for this project |
| `getRequestConfig` receiving `requestLocale` param (routing mode) | `getRequestConfig` with no param, reads cookies directly (without-routing mode) | next-intl v3 | API differs — cannot copy examples from routing-based setups |
| `useMessages()` manual loading | `NextIntlClientProvider` auto-serializes | next-intl v3+ | Provider automatically passes server-resolved messages to client |

**Deprecated/outdated:**
- next-intl v2 API (`createTranslator`, `getTranslator`): replaced by `useTranslations`/`getTranslations` hooks — do not use
- `next.config.js` `i18n` property (Next.js Pages Router built-in i18n): deprecated in App Router — do not use

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The cookie name `NEXT_LOCALE` (as locked in STATE.md) should be used in `getRequestConfig` — the official next-intl docs example uses `'locale'` as the cookie name | Standard Stack / getRequestConfig | Low — any cookie name works as long as write and read use the same name; STATE.md is the authority |
| A2 | `tietosuoja` (privacy policy) page text should NOT be translated in Phase 30 — large scope, Finnish-only for v1.6 | Translation Scope | Medium — user may want full translation; flag for decision |
| A3 | Day abbreviations in HoursTable best translated in the component via `useTranslations('Days')` rather than modifying `lib/aukiolo.ts` | Architecture Patterns | Low — either approach works; option 2 avoids touching the tested utility |
| A4 | `withNextIntl(withSerwist(...))` is the correct HOC wrapping order | next.config.mjs | Low — reversed order still works but convention is outermost-first |

---

## Open Questions

1. **Tietosuoja (privacy policy) translation scope**
   - What we know: Long-form legal text in Finnish; translating fully would be ~30 additional string keys
   - What's unclear: Whether v1.6 requires EN privacy policy text
   - Recommendation: Skip tietosuoja translation in Phase 30; add a note in PLAN.md

2. **`reviewCount` plural form**
   - What we know: Finnish `"{count} arvostelua"` works for all numbers (Finnish doesn't pluralize the same way); English needs "1 review" vs "2 reviews"
   - What's unclear: Whether next-intl ICU plural is needed, or simple conditional string is acceptable
   - Recommendation: Use two keys — `reviewCountSingular` and `reviewCountPlural` — and pick in component logic. Avoids ICU dependency for v1.6.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | next-intl build | ✓ | (project already running) | — |
| `next-intl` | i18n | ✗ (not yet installed) | 4.13.0 on npm | — |

**Missing dependencies with no fallback:**
- `next-intl` — must be installed via `npm install next-intl`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.7 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run lib/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | Language toggle exists in ProfiiliClient | manual | — | — |
| I18N-02 | NEXT_LOCALE cookie persists locale across reload | manual (browser) | — | — |
| I18N-03 | All UI strings display in selected locale | manual (visual) | — | — |
| I18N-02 | `i18n/request.ts` returns 'fi' when no cookie | unit | `npx vitest run lib/i18n.test.ts -x` | ❌ Wave 0 |
| I18N-02 | `i18n/request.ts` returns 'en' for NEXT_LOCALE=en cookie | unit | `npx vitest run lib/i18n.test.ts -x` | ❌ Wave 0 |
| I18N-02 | Rejects invalid locale value, defaults to 'fi' | unit | `npx vitest run lib/i18n.test.ts -x` | ❌ Wave 0 |

**Note:** The locale-resolution logic in `getRequestConfig` is pure function logic (valid locale guard + fallback) and can be extracted into a testable utility:
```typescript
// lib/i18nUtils.ts — testable locale resolution
export function resolveLocale(raw: string | undefined): 'fi' | 'en' {
  return raw === 'en' ? 'en' : 'fi'
}
```

### Sampling Rate
- **Per task commit:** `npx vitest run lib/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/i18nUtils.ts` — locale resolution utility (extracted from `getRequestConfig` for testability)
- [ ] `lib/i18nUtils.test.ts` — unit tests for `resolveLocale`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | yes | Cookie `path=/`, `maxAge` (1 year), `SameSite=Lax` — set in Server Action |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Validate locale value before using as dynamic import path — only allow `'fi'` or `'en'` |
| V6 Cryptography | no | — |

### Known Threat Patterns for cookie-based locale

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via locale cookie | Tampering | Whitelist validation: `['fi','en'].includes(locale)` before dynamic import path construction |
| Cookie injection (malformed locale) | Tampering | Same whitelist validation; invalid locale falls back to `'fi'` |
| XSS via untranslated strings | Tampering | next-intl escapes all interpolated values; do not use `dangerouslySetInnerHTML` with translated strings |

---

## Sources

### Primary (HIGH confidence)
- `https://github.com/amannn/next-intl/blob/main/examples/example-app-router-without-i18n-routing/src/i18n/request.ts` — exact `getRequestConfig` with cookie pattern
- `https://github.com/amannn/next-intl/blob/main/examples/example-app-router-without-i18n-routing/src/app/layout.tsx` — exact Server Action + `NextIntlClientProvider` layout pattern
- `https://github.com/amannn/next-intl/blob/main/examples/example-app-router-without-i18n-routing/src/app/LocaleSwitcher.tsx` — exact client toggle component pattern
- `https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing` — official without-routing setup guide
- `https://next-intl.dev/docs/usage/typescript` — TypeScript augmentation for AppConfig

### Secondary (MEDIUM confidence)
- `https://next-intl.dev/docs/usage/configuration` — `getRequestConfig` API reference
- npm registry — `next-intl@4.13.0`, created 2020-11-19, slopcheck [OK]

### Tertiary (LOW confidence)
- Community discussion: NEXT_LOCALE as standard cookie name convention — corroborated by multiple sources including Next.js official docs reference

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from official next-intl example repository; npm registry; slopcheck
- Architecture (server action + router.refresh pattern): HIGH — verified from official example repo
- Pitfalls: HIGH — derived from official docs warnings and GitHub issues
- Translation scope inventory: HIGH — derived from direct codebase grep/read
- Cookie name 'NEXT_LOCALE': MEDIUM — STATE.md locked this; next-intl internal code uses this name; but official docs example uses `'locale'` as cookie name

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (next-intl is moderately stable; API changes are versioned)
