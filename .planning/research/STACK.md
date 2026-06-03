# Technology Stack — i18n + SVG Icon System

**Project:** liikuntahakemisto (AKTIIVI)
**Researched:** 2026-06-03
**Scope:** Stack additions for Finnish/English toggle + custom SVG sport icon system

---

## Recommended Stack

| Addition | Version | Purpose | Confidence |
|----------|---------|---------|------------|
| `next-intl` | `^4.13.0` | i18n FI/EN translations, no URL routing | HIGH |
| `@svgr/webpack` | `^8.1.0` | Import SVG files as React components | HIGH |

No other new dependencies are needed. `next-intl` is a runtime dependency (ships hooks + context used at runtime). `@svgr/webpack` is a devDependency (build tool only).

---

## i18n Library

**Recommendation: `next-intl` v4 in "without routing" mode.**

### Why next-intl over alternatives

| Option | Bundle (gzipped) | App Router native | No-URL-routing support | Verdict |
|--------|-----------------|-------------------|----------------------|---------|
| **next-intl v4** | ~14 KB | Yes (Server Components first-class) | Yes (documented) | USE THIS |
| react-i18next + i18next | ~25 KB | Verbose, requires wrappers | Yes (plugin-based) | Too heavy, wrong tool |
| Lingui | ~3-5 KB | Requires Babel/SWC macro plugin | Yes | Smallest, but adds build complexity — overkill for 2 locales |

next-intl was purpose-built for Next.js App Router. Its `getTranslations()` server API and `useTranslations()` client hook are first-class. The "without routing" path is officially documented and supported since v3, stable in v4 (current: v4.13.0 as of 2026-06-03).

### How the "without routing" pattern works

No middleware, no URL locale segment (`/en/`, `/fi/`). The locale is stored in a cookie (`NEXT_LOCALE`). `i18n/request.ts` reads the cookie on every RSC render:

```ts
// i18n/request.ts
import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  const store = await cookies()
  const locale = store.get('NEXT_LOCALE')?.value ?? 'fi'
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

Locale switch: a Server Action sets the cookie, then calls `revalidatePath('/', 'layout')`. The client calls `router.refresh()` after the action completes. No page navigation, no URL change.

**v4 note:** `setRequestLocale` (an older static rendering API) is replaced in the cookie-read pattern — the `getRequestConfig` cookie approach above is the canonical v4 setup for without-routing mode.

### Translation file structure

```
messages/
  fi.json   <- default / source language
  en.json   <- English translation
```

Use flat keys, nest only when a component has many related keys:

```json
{
  "nav.search": "Haku",
  "nav.favorites": "Suosikit",
  "filter.all": "Kaikki",
  "card.open": "Auki nyt",
  "card.closed": "Suljettu",
  "sports.padel": "Padel",
  "sports.jooga": "Jooga"
}
```

### PWA / Serwist interaction

Translation JSON files are tiny (< 5 KB each). Serwist precaches all JS/CSS chunks by default. JSON files under `messages/` are bundled inline via dynamic `import()` inside `getRequestConfig` — Next.js includes them in the JS chunk graph and Serwist precaches them automatically. No extra `additionalPrecacheEntries` configuration is needed for translation files when using the `import()` pattern shown above.

The `/offline` fallback page has hardcoded Finnish text. This is acceptable because Finnish is the default locale and the offline page is static. Translate it when implementing i18n — it is already precached as a static entry.

---

## SVG Icon System

**Recommendation: SVGR via `@svgr/webpack`, imported as React components. No sprite sheet.**

### Why SVGR, not SVG sprites

The 35 custom sport icons are used in 4 contexts where CSS color overrides are required:
- Filter pills (colored accent per sport from `lib/lajit.ts`)
- Card badge row (`currentColor` on sport-color background)
- Map pins (`SportPin.tsx` — already uses `currentColor` via `dangerouslySetInnerHTML`)
- Callout card / bottom sheet

SVG sprites (`<use href="/icons.svg#padel">`) cannot reliably style `fill` and `stroke` with CSS `color` or `currentColor` across the `<use>` shadow boundary in all target browsers. SVGR produces standard React components where `fill="currentColor"` works exactly as expected.

**Performance:** 35 icons x ~300 bytes each = ~10 KB before tree-shaking. Next.js tree-shakes unused imports. Only imported icons appear in the bundle. Negligible at this scale.

**`@svgr/webpack` stability note:** v8.1.0 was published in 2023 and has not needed updates since — the webpack 5 / SVG transform API is stable. It is confirmed compatible with Next.js 14 (webpack 5 internal).

### Setup

Add a webpack rule inside `next.config.mjs`, composing with the existing `withSerwist` wrapper:

```js
export default withSerwist({
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })
    return config
  },
  async redirects() { /* existing */ },
})
```

The `issuer: /\.[jt]sx?$/` constraint is critical. It restricts the SVGR loader to imports from `.js`, `.jsx`, `.ts`, `.tsx` files only, preventing conflicts with Next.js's own SVG handling for `next/image` and `<img>` tags.

### TypeScript declaration

Create `types/svg.d.ts` (or add to `src/types/`):

```ts
declare module '*.svg' {
  import type { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGSVGElement>>
  export default ReactComponent
}
```

### Icon component pattern

Replace the `LucideIcon` refs in `lib/lajit.ts` with direct SVG imports:

```ts
// lib/lajit.ts
import type { FC, SVGProps } from 'react'
import PadelIcon from '@/public/icons/sports/padel.svg'
import KuntosaliIcon from '@/public/icons/sports/kuntosali.svg'
// ...

export const SPORT_ICONS: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  padel: PadelIcon,
  kuntosali: KuntosaliIcon,
  // ...
}
```

Usage in components is identical to the current `<Icon className="w-3 h-3" />` pattern — SVGR passes all props through to the SVG root element.

### Icon file location

Place the 35 SVGs in `public/icons/sports/`. The `public/` directory means icons are also accessible as static URLs if needed (manifest, meta tags, sharing). The SVGR webpack loader handles the `import` path regardless of whether the file is under `public/` or `app/`.

### SportPin.tsx — do not change

`SportPin.tsx` renders inside the Google Maps API DOM (outside the React tree) using `dangerouslySetInnerHTML`. SVGR-imported React components cannot render in this context. Keep `SportPin.tsx`'s inline path strings as-is. If the custom SVG files have materially different paths than the current Lucide-derived paths, update `SportPin.tsx`'s path strings manually to match — this is a copy-paste update, not an architectural issue.

---

## What NOT to Add

| Option | Why to avoid |
|--------|-------------|
| `next-i18next` | Pages Router library, requires `_app.tsx`, incompatible with App Router |
| `i18next` + `react-i18next` standalone | 25 KB runtime, verbose App Router wrappers, Server Components support bolted on |
| `lingui` | Requires Babel/SWC plugin — adds build complexity for a 2-locale use case |
| URL-based locale routing (`/fi/`, `/en/`) | Breaks existing URL contract (`/` and `/?nakyma=lista`), requires migrating all links and Serwist precache entries |
| SVG sprite sheet | `currentColor` inheritance broken across `<use>` shadow boundary; cannot drive individual icon colors needed for sport-colored badges |
| `svg-sprite-loader` | Last updated 5 years ago, not maintained for webpack 5 / Next.js 14 |
| `next-plugin-svgr` | Thin wrapper around `@svgr/webpack` with no benefit; use the webpack rule directly |
| Translations in Supabase | Network round-trip per render, offline-incompatible, unnecessary for 2 locales |
| `@svgr/cli` (build-time sprite generation) | Adds an npm script dependency; SVGR webpack loader is simpler and integrates with the existing build |

---

## Integration Notes

### next.config.mjs

The existing config uses `withSerwist()` as the outer wrapper. The `webpack()` function sits inside the config object passed to `withSerwist`. No wrapping order issue — Serwist does not modify webpack SVG rules:

```js
export default withSerwist({
  webpack(config) { /* SVGR rule */ return config },
  async redirects() { /* existing */ },
})
```

### layout.tsx

`layout.tsx` must become `async` to use `getLocale()` and `getMessages()`. Wrap with `NextIntlClientProvider` so Client Components can use `useTranslations()`:

```tsx
// app/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale} className={cn('font-sans', outfit.variable, playfair.variable)}>
      <body className="antialiased bg-white text-[#111111]">
        <NextIntlClientProvider messages={messages}>
          <MapProvider>
            <main>{children}</main>
          </MapProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

`getMessages()` reads the messages already loaded by `getRequestConfig` — no double network fetch.

### Locale toggle Server Action

```ts
// actions/locale.ts
'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setLocale(locale: 'fi' | 'en') {
  const store = await cookies()
  store.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/', 'layout')
}
```

In `NavBar.tsx` (already a Client Component):

```tsx
import { setLocale } from '@/actions/locale'
import { useRouter } from 'next/navigation'

const router = useRouter()
async function toggle(locale: 'fi' | 'en') {
  await setLocale(locale)
  router.refresh()
}
```

### Sport labels in lajit.ts

`lajiKonfig` currently hardcodes Finnish labels (`'Padel'`, `'Tennis'`, `'Jooga'`). These labels are used in client components that can call `useTranslations('sports')`. The pattern: keep `lajiKonfig` as a pure data object (no hooks), and resolve translated labels in each component that renders them. Do not add i18n logic to `lib/lajit.ts` — lib files must stay hook-free.

### GDPR / cookies

`NEXT_LOCALE` stores only a UI language preference, not personal data. No cookie consent banner is required under GDPR recital 25 (functional/strictly necessary category). next-intl v4 release notes confirm this classification explicitly.

### html[lang] attribute

The `<html lang="fi">` in `layout.tsx` is currently hardcoded. After i18n, it becomes `<html lang={locale}>` — automatically correct for both locales, which also improves screen reader behavior.

---

## Installation

```bash
npm install next-intl
npm install --save-dev @svgr/webpack
```

No other packages required.

---

## Sources

- next-intl without-routing docs: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
- next-intl v4.0 release notes: https://next-intl.dev/blog/next-intl-4-0
- next-intl npm (v4.13.0): https://www.npmjs.com/package/next-intl
- App Router without-routing discussion: https://github.com/amannn/next-intl/discussions/1081
- Locale change without routing issue: https://github.com/amannn/next-intl/issues/1334
- @svgr/webpack docs for Next.js: https://react-svgr.com/docs/next/
- @svgr/webpack npm (v8.1.0): https://www.npmjs.com/package/@svgr/webpack
- SVG-in-JS performance analysis: https://kurtextrem.de/posts/svg-in-js
- SVG sprites in Next.js: https://jakerob.pro/blog/svg-sprite-icons-in-next-js
- i18n library comparison 2026: https://trybuildpilot.com/910-next-intl-vs-i18next-vs-lingui-2026
- next-intl vs next-i18next: https://dev.to/adrai/next-intl-vs-next-i18next-choosing-the-right-i18n-library-for-nextjs-646
