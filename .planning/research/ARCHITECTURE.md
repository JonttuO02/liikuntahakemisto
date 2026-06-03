# Architecture: i18n + SVG Icon System Integration

**Project:** Liikuntahakemisto (AKTIIVI)
**Scope:** FI/EN language toggle + custom SVG icon system into existing Next.js 14 App Router app
**Researched:** 2026-06-03

---

## i18n Architecture

### Chosen Pattern: Context/Hook with localStorage Persistence

The existing app uses URL-based state only for view switching (`?nakyma=lista`). Adding locale to the URL (`/en/`, `?lang=en`) would break the `CLAUDE.md` routing constraint that `/` renders `Etusivu`. The correct pattern for this codebase is **client-side React context + localStorage persistence**, mirroring how `useGPS` works as a hook in `hooks/`.

Next.js 14 App Router i18n via `next-intl` or `next-i18next` requires URL prefix routing (`/fi/`, `/en/`) by design. Both libraries are incompatible with the constraint that `/?nakyma=lista` and `/` route identically without locale prefix. Do not use either library. A hand-rolled context is 40 lines and has zero dependencies.

### Core Data Flow

```
localStorage('locale')
       |
       v
LocaleProvider (app/components/LocaleProvider.tsx)
  - owns locale: Locale state
  - hydrates from localStorage on mount (useEffect — avoids SSR mismatch)
  - writes to localStorage on setLocale()
  - provides LocaleContext
       |
       v
useLocale() (hooks/useLocale.ts)
  - reads LocaleContext
  - returns { locale, t, setLocale }
       |
       v
Every 'use client' component that has translated strings
```

### Server Component Constraint

`app/paikat/[id]/page.tsx` is a Server Component. It cannot use `useLocale()`. Three options:

1. **Keep it Finnish-only initially** — profile page is deep in the funnel, lowest i18n priority. Recommended for first iteration.
2. **Pass locale as a searchParam** (`?lang=en`) — allowed because it does not affect routing logic. Add a `lang` searchParam reader to the server component.
3. **Convert hero/metadata to Client Component** — loses RSC data-fetching benefits, not recommended.

**Recommendation:** Keep the profile page Finnish for the first iteration. The map-based homepage is where first-time English speakers land; the profile page content (hours, prices, descriptions) is data from Supabase in Finnish anyway.

### Hydration Mismatch Prevention

The `LocaleProvider` must render Finnish on the server and on the initial client render, then switch to the stored locale in a `useEffect`. This is the standard pattern for localStorage-hydrated state in Next.js App Router:

```tsx
// app/components/LocaleProvider.tsx
'use client'
const [locale, setLocale] = useState<Locale>('fi')  // always 'fi' on server/initial render

useEffect(() => {
  try {
    const stored = localStorage.getItem('locale') as Locale | null
    if (stored === 'en' || stored === 'fi') setLocale(stored)
  } catch {}
}, [])
```

The initial flash from FI to EN (if stored preference is EN) is acceptable — it is a sub-frame repaint on subsequent visits. For a language toggle feature this is the correct tradeoff.

### Translation Coverage

Components with hardcoded Finnish strings that need `useLocale()`:

| Component | Example strings |
|---|---|
| `Etusivu.tsx` | `"Hae liikuntapaikkaa..."`, `"TO DO"`, `"Palaa omalle sijainnille"`, `"Ei tuloksia"`, `"Tyhjennä haku"`, time-based fallback greeting (`"Huomenta"`, `"Hei"`, `"Iltaa"`), `"Lista on tyhjä"`, `"Lisätään pian"`, `"Kirjaudu ulos"`, `"Kirjaudu"`, `"Profiili"`, `"Yö"`, `"Päivä"`, `"Kävikö paikassa?"`, `"Tallennus epäonnistui"`, `"Jätä arvostelu"`, `"Ohita"`, `"TÄHTIARVOSANA"`, `"KOMMENTTI"` |
| `PaikkaKortti.tsx` | `"Sponsoroitu"`, `"Kertakäynti OK"`, `"Auki nyt"`, `"Suljettu"`, `"vain jäsenyys"`, `"Lisätään pian"`, `"Aukioloajat lisätään pian"`, `"Näytä tiedot"` |
| `DiagonaalKortti.tsx` | `"Auki"`, `"Suljettu"`, `"vain jäsenyys"`, `"Lisätään pian"`, `"Näytä kartalla"`, `"Lisää TO DO -listaan"`, `"Poista TO DO -listalta"` |
| `PaikkaSheet.tsx` | All section labels, open status text, price labels, button labels |
| `NavBar.tsx` | `"Avaa valikko"`, `"Sulje valikko"`, `"Kirjaudu ulos"`, `"Kirjaudu"`, `"Haku"`, `"TO DO"` |
| `AuthModal.tsx` | All modal text |
| `ReviewSection.tsx`, `ReviewForm.tsx` | All form labels and messages |

### `lajiKonfig.label` is Finnish

The `label` field in `lib/lajit.ts` (`'Padel'`, `'Kuntosali'`, `'Jooga'`, etc.) is used as display text in sport badges and filter pills. Most sport names are internationally understood, but `'Kuntosali'` (gym), `'Liikuntahalli'` (sports hall), and `'Uinti'` (swimming) need translation.

**Recommended approach:** Add a `labelEn` field to `LajiKonfig`:

```typescript
export interface LajiKonfig {
  label: string      // Finnish
  labelEn: string    // English
  badgeTw: string
  accentBg: string
  color: string
}
```

Components read `locale === 'en' ? laji.labelEn : laji.label`. This keeps translations co-located with the sport definition rather than scattering them into `lib/i18n.ts`.

### `LAJIT_FILTTERI` Sentinel Value

`LAJIT_FILTTERI = ['Kaikki', 'Padel', ...]` — `'Kaikki'` (All) is used as both a display string and a sentinel (`searchKaupunki === 'Kaikki'`). Do NOT translate the sentinel value at the data layer. Translate only the display label in the UI. The internal comparison logic stays `=== 'Kaikki'`.

---

## SVG Icon Architecture

### Current State: Two Parallel Systems

There are two separate icon systems that must be consolidated:

**System 1 — `lib/lajit.ts` `SPORT_ICONS: Record<string, LucideIcon>`**

Used as React components: `<Icon className="w-3 h-3" />`. Imported in:
- `app/components/Etusivu.tsx` — `CalloutCard` and `CombinedFilterPill`
- `app/components/DiagonaalKortti.tsx` — sport badge and fallback background
- `app/components/PaikkaKortti.tsx` — has a **duplicated local copy** of the same Lucide mapping (not imported from `lib/lajit.ts`)

**System 2 — `app/components/SportPin.tsx` local `SPORT_ICONS: Record<string, string>`**

Raw SVG path strings (inner content only, no `<svg>` wrapper). Used only in the Google Maps pin component via `dangerouslySetInnerHTML`. The `lib/sportPins.ts` file is now empty (migration already done in Phase 23).

### Recommended Approach: Single SVG Path Registry

Create `lib/sportIcons.ts` as the single source of truth. It holds SVG path content strings and derives both the React component and the Maps string from them.

```typescript
// lib/sportIcons.ts

// Inner SVG content only — no <svg> wrapper, no stroke attributes.
// Paths match Lucide React v1.16.0 (same source as current SportPin.tsx).
export const SPORT_SVG_PATHS: Record<string, string> = {
  padel: `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2..." />`,
  kuntosali: `<path d="..." />`,
  jooga: `<path d="..." />`,
  uinti: `<path d="..." />`,
  tennis: `<circle cx="12" cy="12" r="10"/>...`,
  liikuntahalli: `<path d="..." />`,
  liikunta: `<path d="..." />`,
  fallback: `<circle cx="12" cy="12" r="4"/>`,
}

// React component — replaces LucideIcon usage in JSX
export function SportIcon({
  laji,
  className,
  style,
}: {
  laji: string
  className?: string
  style?: React.CSSProperties
}) {
  const paths = SPORT_SVG_PATHS[laji.toLowerCase()] ?? SPORT_SVG_PATHS['fallback']
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <g dangerouslySetInnerHTML={{ __html: paths }} />
    </svg>
  )
}

// String factory — for Maps DOM injection (SportPin.tsx internal use)
export function sportIconSvgString(laji: string): string {
  const paths = SPORT_SVG_PATHS[laji.toLowerCase()] ?? SPORT_SVG_PATHS['fallback']
  return `<g stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`
}
```

The `dangerouslySetInnerHTML` on the SVG `<g>` element is safe because `SPORT_SVG_PATHS` is a compile-time constant — no user input ever flows into it. This is the identical guarantee stated in the existing `SportPin.tsx` comment.

### Updating `lib/lajit.ts` Without Breaking Consumers

The existing `SPORT_ICONS: Record<string, LucideIcon>` in `lib/lajit.ts` is used by:
- `Etusivu.tsx` — imports `SPORT_ICONS` from `@/lib/lajit`, uses as `const Icon = SPORT_ICONS[p.laji] ?? Activity`, renders `<Icon className="w-4 h-4" />`
- `DiagonaalKortti.tsx` — same import and usage pattern

`PaikkaKortti.tsx` does NOT import from `lib/lajit.ts` — it has its own local `const SPORT_ICONS: Record<string, LucideIcon>` duplicate.

**Migration:** Remove `SPORT_ICONS` from `lib/lajit.ts` and the `lucide-react` component imports. The `type { LucideIcon }` import is safe to keep if needed for interface typing, but with the `labelEn` approach it is no longer needed. Update all call sites to use `SportIcon` from `lib/sportIcons.ts`.

The call site change at each component is:

```tsx
// Before
const Icon = SPORT_ICONS[p.laji] ?? Activity
// ...
<Icon className="w-3 h-3 shrink-0" style={{ color: isSelected ? color : undefined }} />

// After
<SportIcon laji={p.laji} className="w-3 h-3 shrink-0" style={{ color: isSelected ? color : undefined }} />
```

`SportIcon` handles its own fallback internally, so `?? Activity` is removed.

### Server Safety of `lib/lajit.ts`

`app/page.tsx` (Server Component) imports `LAJIT_FILTTERI` from `lib/lajit.ts`. This is a plain `string[]` — no React components. After removing `SPORT_ICONS` and the Lucide imports from `lib/lajit.ts`, the file becomes fully server-safe. The `labelEn` string fields are also server-safe. There is no issue.

---

## Google Maps SVG Challenge

### Current Status: Already Solved

`SportPin.tsx` is a React component that renders into a real React DOM node inside `AdvancedMarker`. It does NOT use string injection into a non-React context. The `AdvancedMarker` from `@vis.gl/react-google-maps` renders its children as normal React DOM — the pin is a `<div>` containing an `<svg>` with React-managed elements.

The legacy `sportPins.ts` `buildPinSvg()` pattern (which did generate HTML strings for DOM injection) was already migrated to `SportPin.tsx` in Phase 23. `lib/sportPins.ts` now only exports `export {}`.

The only `dangerouslySetInnerHTML` in `SportPin.tsx` is for the inner SVG path string inside an `<svg>` element that is itself a React-managed JSX element. This is a narrow, controlled use.

### Migration of `SportPin.tsx` to Use `lib/sportIcons.ts`

The local `SPORT_ICONS` constant in `SportPin.tsx` (SVG path strings) is the same data that will live in `lib/sportIcons.ts`. The migration is:

1. Remove the `const SPORT_ICONS: Record<string, string>` block and the `const g = ...` helper from `SportPin.tsx`
2. Import `sportIconSvgString` from `@/lib/sportIcons`
3. Replace `SPORT_ICONS[laji.toLowerCase()] ?? SPORT_ICONS['fallback']` with `sportIconSvgString(laji)`

The rendered output is identical. This is an import swap, not an architectural change.

### If True DOM-String Injection Is Needed in the Future

If a future feature requires building a complete HTML/SVG string (e.g., for canvas rendering, PDF export, or a Google Maps InfoWindow with icons), the pattern using `SPORT_SVG_PATHS` is:

```typescript
function buildPinHtml(laji: string, color: string): string {
  const iconPaths = SPORT_SVG_PATHS[laji] ?? SPORT_SVG_PATHS['fallback']
  return `
    <div style="position:relative;width:28px;height:38px">
      <svg viewBox="0 0 28 38" width="28" height="38">
        <path d="${PIN_PATH}" fill="${color}" />
        <circle cx="14" cy="14" r="10" fill="white" />
        <g transform="translate(5,5) scale(0.75)"
           stroke="#1e3a8a" stroke-width="2.5" fill="none"
           stroke-linecap="round" stroke-linejoin="round">
          ${iconPaths}
        </g>
      </svg>
    </div>
  `
}
```

Safe because all inputs are compile-time constants — `SPORT_SVG_PATHS` values are authored, `color` comes from `lajiKonfig` (also a constant). No user input, no XSS risk.

---

## Modified Files

| File | What Changes | Driver |
|---|---|---|
| `lib/lajit.ts` | Remove `SPORT_ICONS` export and lucide component imports; add `labelEn` to `LajiKonfig` and populate all entries | SVG icons + i18n |
| `app/components/SportPin.tsx` | Remove local `SPORT_ICONS` const and `g()` helper; import `sportIconSvgString` | SVG icons |
| `app/components/Etusivu.tsx` | Add `useLocale()`; replace all hardcoded Finnish strings with `t()`; replace `SPORT_ICONS` import/usage with `SportIcon` | i18n + SVG icons |
| `app/components/DiagonaalKortti.tsx` | Add `useLocale()`; replace strings; replace `SPORT_ICONS` import/usage with `SportIcon` | i18n + SVG icons |
| `app/components/PaikkaKortti.tsx` | Add `useLocale()`; replace strings; remove duplicated local `SPORT_ICONS` constant; use `SportIcon` | i18n + SVG icons |
| `app/components/NavBar.tsx` | Add `useLocale()`; replace aria-labels and UI strings; add FI/EN toggle button | i18n |
| `app/components/PaikkaSheet.tsx` | Add `useLocale()`; replace all labels | i18n |
| `app/components/AuthModal.tsx` | Add `useLocale()`; replace all modal text | i18n |
| `app/layout.tsx` | Wrap `<MapProvider>` with `<LocaleProvider>` | i18n |

---

## New Files

| File | Purpose |
|---|---|
| `lib/sportIcons.ts` | `SPORT_SVG_PATHS` record; `SportIcon` React component; `sportIconSvgString()` for Maps/string injection |
| `lib/i18n.ts` | `Locale` type, `Translations` interface, full FI dictionary, full EN dictionary, `TranslationKey` type |
| `hooks/useLocale.ts` | `useLocale()` hook — reads `LocaleContext`, returns `{ locale, t, setLocale }` |
| `app/components/LocaleProvider.tsx` | Client component — owns locale state, localStorage persistence, provides `LocaleContext` |

---

## Build Order

Dependencies must be resolved bottom-up. Build strictly in this sequence:

### Step 1 — SVG Path Registry (no consumer changes yet)
**Create `lib/sportIcons.ts`.** Port the SVG path strings from `SportPin.tsx`'s local `SPORT_ICONS` constant into `SPORT_SVG_PATHS`. Add `SportIcon` component. Add `sportIconSvgString()`. No other files change. Run the dev server and confirm the file compiles cleanly.

### Step 2 — Update `SportPin.tsx` (isolated, Maps-critical)
**Swap `SportPin.tsx` to use `sportIconSvgString`.** Remove local constants, add import. This is a pure refactor — rendered output is identical. Verify visually that map pins render correctly. This step touches only one file and has zero cascade risk.

### Step 3 — Update `lib/lajit.ts`
**Remove `SPORT_ICONS` and add `labelEn` to `LajiKonfig`.** Fill in English labels for all sports. Remove lucide component imports. This will break `Etusivu.tsx` and `DiagonaalKortti.tsx` (they import `SPORT_ICONS` from here) — fix immediately in Steps 4–6.

### Step 4 — Update `DiagonaalKortti.tsx`
Replace `SPORT_ICONS[paikka.laji] ?? Activity` with `<SportIcon laji={paikka.laji} ... />`. The `Activity` fallback is now handled inside `SportIcon`.

### Step 5 — Update `PaikkaKortti.tsx`
Remove the duplicated local `SPORT_ICONS` constant. Replace with `SportIcon`. This file has no `lib/lajit.ts` icon import to fix — only the local duplicate.

### Step 6 — Update `Etusivu.tsx` icon usage
Fix `CalloutCard` and `CombinedFilterPill` which import `SPORT_ICONS` from `@/lib/lajit`. Replace all `SPORT_ICONS[...] ?? Activity` patterns with `<SportIcon laji={...} ... />`. At this point the entire SVG icon migration is complete and no Lucide sport icon components remain in use.

### Step 7 — i18n Infrastructure (no UI strings yet)
**Create `lib/i18n.ts`** with the complete FI and EN dictionaries. Write all strings before wiring — this forces an audit of every hardcoded string upfront. The TypeScript `TranslationKey` type will enforce completeness.

**Create `hooks/useLocale.ts`** — reads context, returns typed `t()` function.

**Create `app/components/LocaleProvider.tsx`** — context + localStorage hydration.

**Update `app/layout.tsx`** — add `<LocaleProvider>` wrapper around `<MapProvider>`.

### Step 8 — Wire i18n: NavBar first
**`NavBar.tsx`** — smallest string surface, contains the language toggle button. Add `useLocale()`, replace strings, add the FI/EN toggle. Testing the toggle here validates the entire context/localStorage pipeline before touching larger components.

### Step 9 — Wire i18n: Card components
**`PaikkaKortti.tsx`** and **`DiagonaalKortti.tsx`** — already modified in Steps 4–5. Adding `useLocale()` is an incremental change to open files.

### Step 10 — Wire i18n: Etusivu
**`Etusivu.tsx`** — largest and most complex file (1670 lines). Do last to avoid re-opening it before the icon changes stabilize.

### Step 11 — Wire i18n: Sheet and Modal
**`PaikkaSheet.tsx`** and **`AuthModal.tsx`** — isolated client components, no dependencies on the icon work.

### Step 12 — Verification
- Toggle FI → EN → FI; verify all visible strings update without page reload
- Refresh page with `locale=en` in localStorage; verify English loads correctly
- Verify map pins render correctly (SportPin visual regression)
- Verify sport badge icons in cards match previous Lucide icons in visual weight and alignment

---

## Key Pitfalls

### `LocaleProvider` must be a Client Component but `app/layout.tsx` is a Server Component
Compatible: a Server Component can render a Client Component as a child. The `children` passed through `LocaleProvider` can still be Server Components — Next.js handles the boundary correctly. The `'use client'` directive on `LocaleProvider` only affects `LocaleProvider` itself and its subtree that is not passed as `children` props.

### `LAJIT_FILTTERI` sentinel `'Kaikki'` must not be translated at the data layer
`searchKaupunki === 'Kaikki'` is a data comparison, not a display string. Translate the display label only in the render path. Keep the sentinel value as Finnish.

### `SportIcon` SVG stroke control
Tailwind `stroke-*` utilities and SVG `stroke` attribute are different things. Use `stroke="currentColor"` as an SVG presentation attribute inside the `<svg>` element definition. Control the color by setting `color` via the parent's `style` or via `className` on the wrapping element — matching the current `SportPin.tsx` approach where `style={{ color: '#1e3a8a' }}` on the `<g>` element sets `currentColor`.

### `PaikkaKortti.tsx` has a fully duplicated icon map
The file has `const SPORT_ICONS: Record<string, LucideIcon> = { padel: Zap, ... }` as a local constant — it does NOT import from `lib/lajit.ts`. This is an existing duplication. It must be removed and replaced with `SportIcon`, or it will stay out of sync.

### ReviewSection and ReviewForm may also contain hardcoded Finnish strings
These components were not fully read but given their review form functionality (`"TÄHTIARVOSANA"`, `"Vapaaehtoinen kommentti"`, `"Jätä arvostelu"`, `"Tallennus epäonnistui"`) they will need `useLocale()` wiring. Scan them during the Step 11 phase.

---

## Component Dependency Graph

```
lib/sportIcons.ts
  └── SportPin.tsx (svgString only)
  └── lib/lajit.ts (re-exports or removes SPORT_ICONS)
      └── DiagonaalKortti.tsx (SportIcon)
      └── PaikkaKortti.tsx (SportIcon, local copy removed)
      └── Etusivu.tsx (CalloutCard, CombinedFilterPill)

lib/i18n.ts
  └── hooks/useLocale.ts
      └── app/components/LocaleProvider.tsx
          └── app/layout.tsx (wraps MapProvider)
              └── NavBar.tsx (toggle + strings)
              └── PaikkaKortti.tsx (strings)
              └── DiagonaalKortti.tsx (strings)
              └── Etusivu.tsx (strings)
              └── PaikkaSheet.tsx (strings)
              └── AuthModal.tsx (strings)
```
