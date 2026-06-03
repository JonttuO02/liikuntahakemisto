# Domain Pitfalls: i18n + SVG Icons in Existing Next.js 14 App Router + Google Maps + PWA

**Domain:** Adding FI/EN i18n (localStorage) and SVG sport icon system to existing app
**Researched:** 2026-06-03
**Stack context:** Next.js 14 App Router, @serwist/next 9.5, Framer Motion 12, @vis.gl/react-google-maps, TypeScript strict, Tailwind v3

---

## Critical Pitfalls

---

### Pitfall 1: Hydration Mismatch from localStorage Locale Read on First Render

**What goes wrong:**
Any component that reads `localStorage.getItem('locale')` during render — even inside a Context initializer value — produces server HTML with the default locale and client HTML with the stored locale. React detects the mismatch and either throws a hydration error in development or silently dehydrates in production, causing a visible flash and possibly broken layout.

In this codebase, `app/layout.tsx` is a **Server Component** and sets `<html lang="fi">`. If the locale Context is initialized with a synchronous `localStorage` read in the provider's initial state, the very first render already diverges from the server output.

**Why it happens:**
The server renders with `locale = 'fi'` (no localStorage). The client mounts the Context provider, reads `localStorage.getItem('locale') === 'en'`, and sets state to `'en'`. React runs its first client render with `'en'`, which does not match the server-rendered `'fi'` subtree.

**Consequences:**
- React hydration error or full client re-render penalty
- `<html lang>` attribute out of sync unless also patched client-side
- Text content that drives layout (button labels, nav items) may re-flow after hydration, causing a visible jump

**Prevention:**
Always initialize locale state to the server default (`'fi'`) and resolve localStorage in a `useEffect`. The provider must render the same output on first client pass as the server did:

```tsx
// LanguageProvider.tsx — 'use client'
const [locale, setLocale] = useState<'fi' | 'en'>('fi') // always server default

useEffect(() => {
  const stored = localStorage.getItem('locale') as 'fi' | 'en' | null
  if (stored && stored !== locale) setLocale(stored)
}, [])
```

The `<html lang>` attribute in `layout.tsx` cannot be made dynamic in a Server Component without moving to a Client Component. Use `suppressHydrationWarning` on `<html>` and patch `document.documentElement.lang` in the same `useEffect`:

```tsx
// layout.tsx — Server Component
<html lang="fi" suppressHydrationWarning>
```

```tsx
// LanguageProvider.tsx — same useEffect
document.documentElement.lang = stored
```

Do not use `suppressHydrationWarning` anywhere else — it silences real bugs. Keep it only on `<html>` where the mismatch is intentional and bounded.

**Detection:**
Console warning `"Text content did not match"` or `"Hydration failed"` in dev. In production: flash of Finnish text briefly replaced by English on page load. To reproduce: DevTools → Application → Storage → set `locale: en` → hard reload.

**Phase:** Implement provider in the same phase as the toggle UI. This is the first thing to verify with a hard reload from a non-default locale.

---

### Pitfall 2: `lib/lajit.ts` Type Change Breaks the Entire Consumer Chain

**What goes wrong:**
`lib/lajit.ts` currently exports:

```ts
export const SPORT_ICONS: Record<string, LucideIcon> = { ... }
```

`LucideIcon` is `React.ForwardRefExoticComponent<LucideProps>`. Every consumer — `Etusivu.tsx` (filter pill carousel, `CalloutCard`), `PaikkaKortti`, etc. — calls it as `<Icon className="w-4 h-4" />` with Lucide's `className`, `style`, `size`, `strokeWidth` props.

If the registry value is replaced with a different type (e.g., a string path, a raw SVG React component imported via SVGR, or a render function returning SVG markup), TypeScript strict mode will error at every callsite because the props interface differs.

**Why it happens:**
Lucide icons accept `{ className, style, size, strokeWidth, ... }`. SVGR-generated components accept only `{ className, style }` — not `size` or `strokeWidth`. A string path value cannot be JSX-rendered at all.

**Consequences:**
- Minimum 5 files break at compile time if the registry type changes without a coordinated update
- `CalloutCard` in `Etusivu.tsx` line 179 (`const Icon = SPORT_ICONS[p.laji] ?? Activity`) fails if `Activity` (a LucideIcon) remains as the fallback while registry values are a different type
- `CombinedFilterPill` renders icons inline in the ticker carousel — any prop mismatch produces a runtime error in production if TypeScript is bypassed

**Prevention:**
Define an explicit interface **before** migrating the registry, and ensure all callsites compile against it:

```ts
// lib/lajit.ts
export type SportIconComponent = React.FC<{ className?: string; style?: React.CSSProperties }>
export const SPORT_ICONS: Record<string, SportIconComponent> = { ... }
```

Migrate callsites first (remove `size`, `strokeWidth` props), then replace registry values. Replace the `Activity` fallback with a neutral SVG component of the same `SportIconComponent` type — never mix types in the same Record.

**Detection:**
TypeScript build errors at any `<Icon className=...>` callsite. Run `npx tsc --noEmit` after changing the type to catch all consumers before runtime.

**Phase:** Type migration must happen in the same commit as the registry value replacement, not spread across phases.

---

### Pitfall 3: SVG Files in `public/` Not Precached by Serwist When `additionalPrecacheEntries` Is Set

**What goes wrong:**
`@serwist/next` has a known behavior (tracked in serwist/serwist#139): when `additionalPrecacheEntries` is non-empty, the automatic `globPublicPatterns` scan of the `public/` directory is skipped. The current `next.config.mjs` already sets:

```js
additionalPrecacheEntries: [{ url: "/offline", revision }]
```

This means any SVG files placed in `public/icons/` will NOT appear in the precache manifest — even if you also add `globPublicPatterns: ["icons/*.svg"]`. The two options are mutually exclusive in this version of `@serwist/next`.

**Why it happens:**
The `@serwist/next` integration performs either automatic glob scanning OR manual entries when `additionalPrecacheEntries` is present. It does not merge them.

**Consequences:**
- SVG sport icons load on first visit but are not available offline
- Service worker install does not fail visibly — the omission is silent
- After a deploy, returning offline users see broken icon slots instead of the fallback

**Prevention:**
Add SVG icons explicitly to `additionalPrecacheEntries`, enumerating them programmatically at build time:

```js
// next.config.mjs
import { readdirSync } from 'node:fs'

const svgEntries = readdirSync('./public/icons')
  .filter(f => f.endsWith('.svg'))
  .map(f => ({ url: `/icons/${f}`, revision })) // use git SHA revision for cache busting

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [
    { url: '/offline', revision },
    ...svgEntries,
  ],
})
```

**Detection:**
After a production build, open DevTools → Application → Cache Storage → find the precache manifest and verify SVG URLs appear. Or: build, go offline, reload — missing icons confirm the omission.

**Phase:** Address in the same phase that moves SVG files into `public/`. Verify precache manifest before shipping.

---

### Pitfall 4: SVG String Injected into Google Maps DOM Cannot Inherit React CSS Variables or Tailwind Classes

**What goes wrong:**
The existing `SportPin.tsx` is rendered by React via `AdvancedMarker` children — this works because `@vis.gl/react-google-maps` portals the React component into the Maps DOM. However, if any migration introduces a code path where SVG content is injected as a raw HTML string (e.g., via `element.innerHTML = svgString` in an imperative Maps API callback), those SVG elements live outside React's reconciliation tree.

This means:
- Tailwind utility classes in the string (`w-4 h-4`, `text-[#3b82f6]`) do NOT apply — the Tailwind JIT scanner never sees them inside a runtime string
- CSS custom properties (`var(--color-padel)`) are not inherited because the element has no ancestor React component providing them
- `currentColor` on `stroke` or `fill` resolves to the Maps tile container's inherited color, not the sport color

**Why it happens:**
The Google Maps JS API's `AdvancedMarkerElement.content` property accepts a DOM element, not a React element. If an SVG React component is rendered to a static string with `renderToStaticMarkup` and then set as `.innerHTML`, Tailwind classes in the string exist as attribute tokens only — they need to be present in the CSS file, which requires being scanned at build time.

**Consequences:**
Icons appear with wrong or missing colors in AdvancedMarker custom content pins. No TypeScript error — the bug is purely visual and only visible in a Maps context.

**Prevention:**
Keep SVG sport icons as React components rendered via `AdvancedMarker` children (the current `SportPin.tsx` pattern is correct). If imperative DOM insertion is ever needed, use inline `style` attributes in the SVG string, not class names:

```ts
// Safe for DOM string injection — no Tailwind dependency
const svgString = `<svg ...><path stroke="${sportColor}" .../></svg>`
element.innerHTML = svgString
```

Never use `renderToStaticMarkup` on a component that relies on Tailwind classes and inject the output into Maps DOM.

**Detection:**
Visual regression: icons appear gray or unstyled inside map markers. Only visible in a running browser with Maps loaded. Cannot be caught by TypeScript or build tools.

**Phase:** Enforce the React portal path as the only path for map pins. Add a comment to `SportPin.tsx` prohibiting DOM string fallback. Any code that constructs SVG strings for Maps must use inline style attributes.

---

## Moderate Pitfalls

---

### Pitfall 5: Framer Motion `motion.svg` Without Explicit `width`/`height` Renders at 0×0 on Some Browsers

**What goes wrong:**
If an SVG component is wrapped in `motion.svg` and omits explicit `width` and `height` attributes (relying only on `viewBox`), the element has no intrinsic size in browsers that do not infer dimensions from `viewBox` alone for replaced content. The element collapses to 0×0 and becomes invisible.

This is specifically relevant to `CalloutCard` in `Etusivu.tsx` where `<Icon className="w-4 h-4" />` is currently a Lucide component that always emits `width={24} height={24}` internally. A replacement SVG React component must do the same.

**Prevention:**
Always emit explicit `width` and `height` on `<svg>`. Do not rely on `viewBox` alone for sizing. Provide them as props with a default, and also accept `className` for Tailwind sizing overrides:

```tsx
// SportIcon.tsx pattern
export function SportIcon({ className, style, size = 24 }: SportIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {/* paths */}
    </svg>
  )
}
```

Note: SVG elements do not support Framer Motion `layout` animations. Do not add `layout` to `motion.svg` wrappers.

**Detection:**
Elements invisible in Safari or Firefox despite being in the DOM. Check computed dimensions in DevTools — `width: 0`, `height: 0` confirms the issue.

---

### Pitfall 6: React Context Locale Provider Placed as a Parent of `MapProvider` Causes Map Reinitialization on Locale Toggle

**What goes wrong:**
If `LanguageProvider` wraps `MapProvider` in `layout.tsx` such that locale state changes cause `MapProvider` to remount, the Maps JS API reinitializes — tiles go blank, the `Map` component fires its initialization sequence again, and any open sheets or cluster popups are reset.

The current `layout.tsx` has:

```tsx
<MapProvider>
  <main>{children}</main>
</MapProvider>
```

Adding `LanguageProvider` as a wrapper around `MapProvider` with the wrong structure (e.g., the Provider re-renders `MapProvider` on context value change) triggers this.

**Why it happens:**
React Context value changes cause all consuming children to re-render. If `MapProvider` does not consume the locale context but is structurally inside a component that re-renders, React may still reconcile and remount it depending on component identity.

**Prevention:**
Make `LanguageProvider` a sibling of `MapProvider`, not a parent:

```tsx
// layout.tsx — correct nesting order
<LanguageProvider>
  <MapProvider>
    <main>{children}</main>
  </MapProvider>
</LanguageProvider>
```

Ensure locale context value changes do NOT cause `MapProvider` to remount by memoizing the context value object.

**Detection:**
Google Maps reloads (tiles go blank briefly, `Maps JS API loaded` fires twice in console) after toggling locale.

---

### Pitfall 7: SVGR Webpack Loader Without `issuer` Constraint Breaks Future `next/image` SVG Usage

**What goes wrong:**
Adding `@svgr/webpack` with a rule matching `/\.svg$/i` without an `issuer` constraint will intercept ALL `.svg` imports — including any `next/image` usage with `.svg` files. The Next.js image optimizer and SVGR cannot both handle the same file extension without scoping.

Without `issuer`, importing an SVG via `next/image` returns a React component (from SVGR) instead of an object with `src`, breaking the Image component at runtime.

**Prevention:**
Always add the `issuer` constraint to scope SVGR to JSX/TSX imports only:

```js
// next.config.mjs
config.module.rules.push({
  test: /\.svg$/i,
  issuer: /\.[jt]sx?$/,
  use: ['@svgr/webpack'],
})
```

**Detection:**
`TypeError: src must be a string` or `Expected src to be a string` at runtime when using `next/image` with an SVG path after SVGR is added.

---

### Pitfall 8: Translation Keys in Server Components Turn Static Pages Dynamic

**What goes wrong:**
If Server Components render translated strings by calling a locale-aware `t('key')` function where the locale is derived from a cookie or header, those components can no longer be statically cached. In this app, `app/page.tsx` and `app/paikat/[id]/page.tsx` are Server Components that do database fetches — if they also call a locale-aware translation function, they become dynamic per request.

The Finnish-only content model means the current Server Components are potentially cacheable. Adding i18n that varies per user preference breaks that.

**Prevention:**
Keep Server Components locale-agnostic — they render Finnish content only. All locale-dependent UI text lives in Client Components fed by the locale Context. Translate only UI chrome (labels, button text, nav items) client-side. Database content (venue names, descriptions) remains Finnish-only unless a full content translation strategy is in scope.

**Detection:**
`next build` output shows pages that were `○ Static` become `λ Server` (dynamic) after adding locale-aware translation to Server Components.

---

## Minor Pitfalls

---

### Pitfall 9: SVG `useId()` Gradient ID Conflicts When Multiple Icon Instances Are Rendered

**What goes wrong:**
`SportPin.tsx` already uses `useId()` to generate unique `linearGradient` IDs to prevent cross-SVG `url(#id)` reference conflicts. If new SVG icon components also use `<defs>` with `filter`, `clipPath`, or `linearGradient` elements and hardcode IDs (e.g., `id="sport-icon-glow"`), multiple instances of the same icon on one page share the same ID, and only the first definition wins — all subsequent icons render with incorrect effects.

**Prevention:**
Any SVG component that uses `<defs>` with an ID must call `useId()` and prefix all `id` and `href`/`url()` references with the unique value. Path-only icons (no `<defs>`) are immune to this.

**Detection:**
Visual regression only when 2+ instances of the same icon appear simultaneously. The cluster popup in `Etusivu.tsx` shows multiple sport badges — test there first.

---

### Pitfall 10: Missing `aria-hidden` on Decorative SVG Icons After Lucide Replacement

**What goes wrong:**
Lucide icons default to `aria-hidden="true"` when no `aria-label` is provided. Raw SVG components or SVGR-generated components do not include this default — they render a fully accessible `<svg>` element that screen readers attempt to read, announcing empty or garbled content for each icon.

**Prevention:**
All decorative icons must have `aria-hidden="true"` and `focusable="false"` on the `<svg>` element. Either bake this into the default props of every sport icon component, or enforce it at every callsite.

```tsx
// Default in SportIconComponent
<svg aria-hidden="true" focusable="false" ...>
```

**Detection:**
`axe` or Lighthouse accessibility scan reports "SVG element has no accessible name" warnings. Also testable manually with VoiceOver/NVDA.

---

## Phase-Specific Warnings

| Phase Topic | Pitfall # | Mitigation |
|---|---|---|
| LanguageProvider initial implementation | 1 | Initialize state to `'fi'`, patch `lang` in `useEffect`, `suppressHydrationWarning` on `<html>` only |
| `lib/lajit.ts` type migration | 2 | Define `SportIconComponent` type first, run `tsc --noEmit` before merging |
| Moving SVG files to `public/icons/` | 3 | Add SVGs explicitly to `additionalPrecacheEntries`; verify precache manifest |
| SVGR webpack loader setup | 7 | Add `issuer` constraint to webpack rule |
| Replacing Lucide in `CalloutCard` | 5 | Emit explicit `width`/`height` on every SVG component |
| Replacing Lucide everywhere | 10 | Default `aria-hidden="true"` `focusable="false"` in all icon components |
| Any SVG with `<defs>` (gradients, filters) | 9 | Use `useId()` for all `<defs>` IDs |
| Locale toggle interacting with Maps | 6 | `LanguageProvider` is a parent of `MapProvider`, not ancestor that causes remount |
| Adding `t()` calls to Server Components | 8 | Translate only in Client Components; keep Server Components locale-agnostic |
| SVG content in map pin DOM string path | 4 | Use React portal path (`SportPin.tsx`) exclusively; never `innerHTML` with Tailwind classes |

---

## Sources

- [Next.js hydration error documentation](https://nextjs.org/docs/messages/react-hydration-error)
- [How to Fix Next.js localStorage and Hydration Errors Cleanly — FluentReact](https://www.fluentreact.com/blog/nextjs-localstorage-hydration-errors-fix)
- [serwist/serwist#139 — additionalPrecacheEntries prevents globPublicPatterns](https://github.com/serwist/serwist/issues/139)
- [Serwist Next.js getting started](https://serwist.pages.dev/docs/next/getting-started)
- [Serwist precaching docs](https://serwist.pages.dev/docs/serwist/guide/precaching)
- [SVGR Next.js integration docs](https://react-svgr.com/docs/next/)
- [Motion React SVG Animation docs](https://motion.dev/docs/react-svg-animation)
- [react-google-maps AdvancedMarker API reference](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker)
- [Google Maps advanced markers graphics guide](https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers)
- [next-intl Server/Client Component internationalization](https://next-intl.dev/docs/environments/server-client-components)
- [Using React Context in combination with Server Components — Medium](https://medium.com/@sjoerd3000/using-react-context-in-combination-with-server-components-afe6b5c8923c)
- [Serwist/langgenius precache 404 path prefix issue](https://github.com/langgenius/dify/issues/31677)
