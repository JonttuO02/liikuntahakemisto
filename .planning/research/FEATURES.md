# Feature Landscape: i18n FI/EN Toggle + SVG Sport Icon System

**Domain:** Sports venue directory app (AKTIIVI) — adding language switch and custom SVG icons
**Researched:** 2026-06-03
**App context:** Next.js 14 App Router, Tailwind v3, Framer Motion, @vis.gl/react-google-maps AdvancedMarker, Serwist PWA

---

## i18n Features

### What "without URL routing" means

"Without URL routing" means the locale is NOT encoded in the URL path (no `/fi/`, `/en/`). The URL stays `/` regardless of language. Locale preference is stored in a cookie (`NEXT_LOCALE` or custom key) and read server-side in `i18n/request.ts`. Switching language sets the cookie and calls `router.refresh()` to re-render server components with the new locale — no page navigation, no URL change.

This is an officially supported next-intl configuration called "App Router without i18n routing."

**Locale switching mechanism (cookie + refresh):**

1. `i18n/request.ts` reads locale from cookie: `cookies().get('NEXT_LOCALE')?.value ?? 'fi'`
2. A client-side button writes the cookie directly (`document.cookie`) or via a Server Action
3. Client calls `router.refresh()` — re-runs RSC render with new cookie value, no navigation
4. `NextIntlClientProvider` is rendered by a Server Component and inherits locale automatically

**Important constraint for AKTIIVI:** `router.refresh()` re-renders server components but does NOT remount client components. State in client components (map pan position, filter selections, open bottom sheet) survives the language switch. This is the desired behaviour.

### Library choice: next-intl (recommended)

| Criterion | next-intl | react-i18next | Custom React Context |
|-----------|-----------|---------------|---------------------|
| App Router / Server Components | First-class (RSC + client) | Client-only workarounds needed | Client-only |
| Without-routing mode | Official, documented, example in repo | Not designed for it | Trivial to implement |
| Type safety | Full (`AppConfig` augmentation) | Moderate | Manual |
| Bundle overhead | ~8 kB gzip | ~20 kB (i18next + react-i18next + detector plugins) | ~0 kB |
| Cookie persistence | Built-in `NEXT_LOCALE` cookie convention | DIY | DIY |
| Translation file format | JSON with ICU message syntax | JSON with ICU | Any |

**Recommendation:** Use next-intl. It is the only option with first-class App Router support and explicit documentation for the no-URL-routing pattern.

**Custom hook is acceptable if:** the team wants zero new dependencies and the translation surface is genuinely small. For ~83 strings it is viable but requires manually wiring cookie persistence, `router.refresh()`, and SSR hydration safety to avoid `useLayoutEffect` mismatches.

**Confidence:** HIGH — verified against next-intl official docs, Context7 source `/amannn/next-intl`, and multiple GitHub discussions.

### Translation surface for AKTIIVI (estimated)

| Area | String count | Notes |
|------|-------------|-------|
| NavBar labels | ~8 | "Kirjaudu", "Kirjaudu ulos", "Haku", "Suosikit" |
| Filter pill labels | ~10 | "Kaikki" + sport names — sport names may stay Finnish in both locales |
| Card UI labels | ~15 | "Auki nyt", "Näytä tiedot", "Sponsoroitu", price suffixes |
| Search/filter UI | ~12 | Placeholder text, city selector label, sort labels |
| Profile page | ~20 | Section headings, hours table, review labels |
| Auth modal | ~10 | Form labels, error messages |
| Error/empty states | ~8 | "Ei tuloksia", 404 message |
| **Total** | **~83** | Flat single namespace is fine; no need for multiple namespaces |

Sport category proper nouns (Padel, Tennis, Jooga, etc.) should stay Finnish in both locales. They are international sport names, not UI copy. This reduces translation work and avoids confusion for Finnish users who already know them.

---

## SVG Icon System Approaches

### Context: three rendering environments

The app must render sport icons in three distinct contexts with different constraints:

| Context | React control | Styling access | Current solution |
|---------|---------------|----------------|-----------------|
| React components (PaikkaKortti badge, filter pills, CalloutCard) | Full React | CSS, Tailwind, `currentColor` | Lucide icons from `lib/lajit.ts` |
| Google Maps AdvancedMarker DOM (`SportPin.tsx`) | None — raw DOM outside React tree | Inline styles only, no Tailwind, no CSS vars | Inline SVG path strings via `dangerouslySetInnerHTML` |
| Framer Motion animated elements (`motion.div` wrappers) | React (wraps content) | Same as React components | Lucide icons |

**The AdvancedMarker constraint is the dominant design driver.** The existing `SportPin.tsx` already solves it by storing SVG path strings as compile-time constants and injecting via `dangerouslySetInnerHTML`. Any new icon system must be compatible with this pattern or extend it — not replace it.

### Approach A: SVGR webpack plugin (import SVG as React component)

Each `.svg` file is transformed at build time into a React component (`import PadelIcon from '@/icons/padel.svg'`).

**Pros:** Full React control, `currentColor` works, TypeScript types automatic.

**Cons:**
- Adds ~3x bundle overhead vs sprite (each SVG = JS string in bundle)
- Does NOT help AdvancedMarker DOM — still need raw path strings for `SportPin.tsx`
- Next.js 14 with Turbopack (the default dev server) does not support webpack plugins; SVGR requires webpack config in `next.config.js` which conflicts with Turbopack in dev
- Adds a dependency and webpack config change for questionable gain

**Confidence:** HIGH (multiple official sources confirm the Turbopack limitation)

### Approach B: Public folder `<img src>` for all uses

SVG files placed in `/public/icons/padel.svg`, rendered as `<img src="/icons/padel.svg" />`.

**Pros:** Zero build complexity. Works in AdvancedMarker DOM (`pin.content.innerHTML = '<img src="/icons/padel.svg" />'`). Works offline if Serwist runtime caching is configured for `/icons/*`.

**Cons:**
- SVGs rendered as `<img>` cannot be styled with CSS or `currentColor` — fill/stroke colors are hardcoded in the file
- Requires per-icon HTTP request (mitigated by HTTP/2 and browser cache, but still latency on first load)
- CSS `filter: hue-rotate()` hacks to recolor are fragile and imprecise
- 35 icons = 35 separate files to maintain

**Confidence:** HIGH

### Approach C: SVG sprite (`/public/sprite.svg` with `<use href>`)

One build script combines 35 SVGs into `/public/icons/sprite.svg`. Components use `<svg><use href="/icons/sprite.svg#padel" /></svg>`.

**Pros:** One HTTP request for all 35 icons.

**Cons:**
- External `<use href="file.svg#id">` does NOT allow `currentColor` to cascade into the referenced SVG — colors must be hardcoded in the sprite file
- Does NOT work reliably in AdvancedMarker DOM — external resource `<use>` references can be blocked in sandboxed or isolated DOM contexts
- Requires a build script and keeping the sprite file in sync with source files
- For 35 icons, the single-request benefit is marginal (total payload ~15 kB)

**Confidence:** MEDIUM (external `<use>` cross-document styling limitation is a documented browser gotcha)

### Approach D: Inline path string registry (recommended)

Keep existing `SportPin.tsx` inline SVG path strings for AdvancedMarker (already works, proven in production). Extend to a central registry `lib/sportIcons.ts` that stores all 35 icon path strings. React components render via a thin `SportIcon` wrapper component using `dangerouslySetInnerHTML` — the same pattern already used in `SportPin.tsx`.

```typescript
// lib/sportIcons.ts — single source of truth for all 35 icons
export const SPORT_SVG_PATHS: Record<string, string> = {
  padel:    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2..." />',
  tennis:   '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/>...',
  // 33 more entries
}

// Thin React wrapper — no SVGR plugin needed
export function SportIcon({ laji, size = 24, color = 'currentColor', className }: SportIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         className={className}
         dangerouslySetInnerHTML={{ __html: SPORT_SVG_PATHS[laji] ?? SPORT_SVG_PATHS.fallback }}
    />
  )
}
```

AdvancedMarker (`SportPin.tsx`) uses the same path string from the same registry — zero duplication.

**Pros:**
- Zero new npm dependencies
- Zero webpack/Turbopack config changes
- Works in all three contexts: React, AdvancedMarker DOM, Framer Motion wrappers
- Single source of truth for all 35 icon paths
- `currentColor` / CSS color control works everywhere via `stroke={color}` prop
- Icons ship in the JS bundle, already covered by Serwist's default precaching of JS chunks — no explicit PWA cache rule needed
- Pattern is proven in production (existing `SportPin.tsx`)

**Cons:**
- `dangerouslySetInnerHTML` on every icon render — safe because paths are compile-time constants, never user data
- Icon paths must be manually maintained as strings in `lib/sportIcons.ts` (no file-system auto-discovery)
- 35 icons adds ~15–20 kB unminified to the JS bundle (Lucide-react is already ~100 kB, so this is a modest increase)

**Confidence:** HIGH — pattern already proven in production codebase (`SportPin.tsx` lines 12–21)

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| FI/EN language toggle button | Any app with international audience has this | Low | Single button or pill in NavBar; cookie write + `router.refresh()` |
| Preference persists across sessions | Users expect browser to remember language | Low | Cookie (not localStorage — must be readable server-side for RSC) |
| All visible UI strings translated | Partial translation = broken trust | Medium | ~83 strings; sport names stay Finnish |
| Language switch takes effect without full page reload | Modern UX expectation | Low | `router.refresh()` re-renders RSC in-place, client state survives |
| Sport icons consistent across all views | Card badges, map pins, filter pills should show same icon | Low | Single `lib/sportIcons.ts` registry ensures consistency |
| Icons readable at minimum size (16px) | Icons fail at small sizes if paths are too complex | Medium | Paths must be simplified/optimized for small viewBox; avoid thin strokes |
| Icons use sport-type accent colors | Design system coherence with existing `lajiKonfig` | Low | Pass `lajiKonfig[laji].color` as `color` prop to `SportIcon` |

## Differentiators

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Browser language auto-detection on first visit | Frictionless onboarding for English-speaking tourists | Low | Read `navigator.language` if no cookie set; fall back to `'fi'` as default |
| Animated FI/EN toggle pill | On-brand, polished feel consistent with Framer Motion system | Low | `whileTap={{ scale: 0.95 }}` + text crossfade with `AnimatePresence` |
| Sport icons as animated map pin glyphs with custom paths | Distinctive, recognizable map experience | Medium | Extends existing `SportPin.tsx`; custom paths replace Lucide-derived paths |
| Icons reinforce color-coding in filter carousel | Faster cognitive scan — color + icon vs color alone | Low | `SportIcon` in `FilterCarouselPill` with `lajiKonfig[laji].color` |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| URL-based locale routing (`/fi/`, `/en/`) | Changes URL structure, requires redirect middleware, breaks existing `/suosikit`, `/paikat/[id]` routes, breaks all existing links and SEO | Cookie-based locale, same URL |
| SVGR webpack plugin for `.svg` file imports | Next.js 14 + Turbopack friction; double implementation needed (SVGR for React + path strings for AdvancedMarker anyway); bundle penalty for 35 icons | Inline path string registry in `lib/sportIcons.ts` |
| SVG sprite file in public folder | External `<use href>` blocks CSS `currentColor`; unreliable in AdvancedMarker DOM; adds a build step | Inline path strings |
| Third-party i18n CMS (Phrase, Lokalise, Crowdin) | Overkill for 2 locales + 83 strings; adds SaaS cost and integration surface | Static JSON files: `messages/fi.json`, `messages/en.json` |
| ICU pluralization, date/number formatting | Not needed for this UI surface (no count-dependent strings, no formatted dates) | Plain string interpolation (`{count} paikkaa`) is sufficient |
| More than 2 locales | Out of scope; adds N×83 translation maintenance burden | Design toggle as binary FI ↔ EN flip |
| `next-i18next` (Pages Router library) | Designed for Pages Router, requires `serverSideTranslations` in every `getStaticProps` — incompatible with App Router | Use next-intl which has first-class App Router support |
| `localStorage` for locale persistence | Not accessible server-side — Server Components cannot read it; causes hydration mismatch on first render | Cookie readable by both server and client |
| Separate icon fonts (`@font-face` with icon glyphs) | Accessibility problems (screen readers read glyph characters), poor rendering at small sizes, outdated pattern | SVG paths with semantic aria-hidden |

---

## Feature Dependencies

```
Cookie-based locale storage
  -> i18n/request.ts reads cookie server-side
  -> NextIntlClientProvider wraps layout.tsx children
  -> useTranslations() usable in all components (RSC + client)
  -> Language toggle button in NavBar (writes cookie, calls router.refresh())

lib/sportIcons.ts path registry
  -> SportIcon React component (card badges, filter pills, CalloutCard)
  -> SportPin.tsx AdvancedMarker DOM injection (Google Maps pins)
  -> FilterCarouselPill icon slot
  -> PaikkaKortti sport badge
```

---

## MVP Recommendation

For a single milestone, recommended build order:

1. **`lib/sportIcons.ts`** — build the 35-icon path registry first; this unblocks all icon usage in all contexts
2. **`SportIcon` React component** — thin wrapper over the registry; replaces Lucide icons in card badges and filter pills
3. **`SportPin.tsx` update** — swap Lucide-derived path strings for custom paths from registry; AdvancedMarker pins get new icons
4. **next-intl setup** — `messages/fi.json`, `messages/en.json`, `i18n/request.ts` reading `NEXT_LOCALE` cookie, `NextIntlClientProvider` in `layout.tsx`
5. **Language toggle button in NavBar** — FI/EN pill with cookie write + `router.refresh()`
6. **Translate all UI strings** — systematic pass through all components using `useTranslations()`

**Defer:**
- Browser language auto-detection: low value for a Finnish-first product; Finnish speakers are the primary audience
- Icon animation polish beyond what `SportPin.tsx` already does: nice-to-have, not MVP

---

## Sources

- [next-intl App Router without i18n routing (official docs)](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) — HIGH confidence
- [next-intl cookie locale configuration](https://next-intl.dev/docs/usage/configuration) — HIGH confidence
- [next-intl issue #1334: Change locale without routing (community discussion)](https://github.com/amannn/next-intl/issues/1334) — MEDIUM confidence (verified against docs)
- [How to import SVGs into Next.js — LogRocket 2025](https://blog.logrocket.com/import-svgs-next-js-apps/) — MEDIUM confidence
- [SVG sprite icons in Next.js — Jake Roberts](https://jakerob.pro/blog/svg-sprite-icons-in-next-js) — MEDIUM confidence
- [Google Maps AdvancedMarker graphic markers (official Google docs)](https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers) — HIGH confidence
- [@vis.gl/react-google-maps AdvancedMarker component (official docs)](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker) — HIGH confidence
- [SVG icon management comparison in React — DEV Community](https://dev.to/simprl/a-comprehensive-comparison-of-svg-icon-management-options-in-react-js-projects-glc) — LOW confidence (single source, unverified benchmarks; direction aligns with other sources)
- [i18next language detection docs — Context7 `/i18next/i18next`](https://github.com/i18next/i18next/blob/master/_autodocs/README.md) — HIGH confidence
- [Serwist precaching assets](https://serwist.pages.dev/docs/serwist/guide/precaching) — MEDIUM confidence
