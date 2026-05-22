---
phase: 06-ui-polish-and-data-foundation
reviewed: 2026-05-22T03:31:23Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - app/page.tsx
  - app/tietosuoja/page.tsx
  - app/paikat/[id]/page.tsx
  - lib/priceUtils.ts
  - lib/priceUtils.test.ts
  - lib/cityFilter.ts
  - lib/cityFilter.test.ts
  - app/components/PaikkaKortti.tsx
  - app/components/LiikuntapaikatLista.tsx
  - app/components/Etusivu.tsx
findings:
  critical: 3
  warning: 6
  info: 5
  total: 14
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-05-22T03:31:23Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 6 adds a GDPR privacy page, booking URL row on the profile page, two TDD utility modules (`isMembershipOnly`, `deriveKaupungit`), a full PaikkaKortti card overhaul, filter dropdowns in LiikuntapaikatLista, and Etusivu weather city label + bottom-sheet Sponsoroitu badge. The utility modules and their tests are solid. The primary concerns are: a routing logic inversion in `app/page.tsx` that silently swallows the `?nakyma=kartta` URL and renders the wrong view; an open-redirect / XSS vector from unvalidated `varauslinkki` rendered as a live `href`; and an `isNightHour` usage at module-scope that breaks SSR. Several design-system violations (`font-semibold` / 600-weight usage) and a stale placeholder in the live privacy policy text are also flagged.

---

## Critical Issues

### CR-01: Routing logic inverted — `?nakyma=kartta` silently renders Etusivu, not the intended view

**File:** `app/page.tsx:26`

**Issue:** The server component checks `searchParams.nakyma === 'lista'` and renders `<LiikuntapaikatLista>`. Every other value — including the canonical `?nakyma=kartta` — falls through to the `else` arm which renders `<Etusivu>`. This means navigating to `/?nakyma=kartta` renders `<Etusivu>` (the map-preview landing page) rather than any distinct map view, while navigating to `/?nakyma=lista` renders the list. CLAUDE.md mandates `?nakyma=kartta` as the single canonical URL routing scheme and the BottomNav/NavBar write that URL; if a future phase wires a dedicated Kartta component here, it will be silently ignored because the branch order is wrong. Currently the `kartta` value is consumed but produces no distinct behaviour, meaning direct deep-links to `/?nakyma=kartta` give the user the same page as `/` with no feedback. Any phase that adds a third branch for `kartta` must also ensure the `lista` branch is not accidentally promoted.

**Fix:**
```tsx
// app/page.tsx — make intent explicit and safe for future branches
if (searchParams.nakyma === 'kartta') {
  // Phase 7+ will render <Kartta> here; for now, fall through to Etusivu
  // with kartaAuki pre-opened once the prop is threaded through.
  // Leave as Etusivu until Kartta is wired; do NOT use 'lista' check as the
  // sole branch, because 'kartta' then becomes unreachable.
}
if (searchParams.nakyma === 'lista') {
  return (
    <Suspense>
      <LiikuntapaikatLista paikat={data} />
    </Suspense>
  )
}
return (
  <Suspense>
    <Etusivu paikat={data} />
  </Suspense>
)
```
At minimum document in a comment that `kartta` deliberately renders Etusivu so the next developer does not assume it is handled correctly by the existing else-branch.

---

### CR-02: Unvalidated `varauslinkki` rendered as live `href` — open redirect and javascript: XSS

**File:** `app/paikat/[id]/page.tsx:109`, `app/components/Etusivu.tsx:493`

**Issue:** `paikka.varauslinkki` is read from the database and placed directly into `href` attributes on `<a>` tags without any protocol validation. If a database row is ever inserted with `javascript:alert(1)` or `data:text/html,...` as the booking URL (whether by a malicious admin, a supply-chain compromise of the Supabase service role key, or a CSRF-equivalent write path added in a later phase), the link becomes executable script in the user's browser. CLAUDE.md notes that the service role key is the write path — any compromise of that key puts user browsers at risk through this vector. `rel="noopener noreferrer"` prevents the new-tab from accessing `window.opener` but does not stop `javascript:` execution in the current origin.

**Fix:**
```ts
// lib/urlUtils.ts — add this guard
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
```
```tsx
// app/paikat/[id]/page.tsx and Etusivu.tsx
import { isSafeUrl } from '@/lib/urlUtils'

{isSafeUrl(paikka.varauslinkki) && (
  <a href={paikka.varauslinkki!} target="_blank" rel="noopener noreferrer">
    {paikka.varauslinkki}
  </a>
)}
```

---

### CR-03: `isNightHour` called at module scope during SSR — runtime crash

**File:** `app/components/Etusivu.tsx:72`

**Issue:** Line 72 reads:
```ts
const [isDark, setIsDark] = useState(isNightHour)
```
`isNightHour` is a plain function (not a hook), so this passes the function reference as the `useState` lazy-initialiser — this is correct React pattern. **However**, because `Etusivu` is a `'use client'` component, React will call `isNightHour()` on the server during SSR (Next.js App Router pre-renders client components on the server). `isNightHour` calls `new Date().getHours()`, which works on the server but produces a different value than on the client (server timezone may differ from user locale, and server-side render time differs from client hydration time). This is a hydration mismatch: the server renders one `isDark` value, the client sees a different value, React logs a warning and the DOM flashes between light and dark states on every page load for users near the 07:00 / 20:00 threshold. Additionally, the night-mode background overlay is an always-rendered `<div>` whose `opacity` is driven by `isDark` — if server renders `opacity: 0` and client hydrates with `opacity: 1` (or vice versa), React's hydration reconciliation may suppress the client-side correction.

**Fix:**
```tsx
// Always start with isDark = false on the server; correct on the client after mount
const [isDark, setIsDark] = useState(false)
useEffect(() => {
  setIsDark(isNightHour())
}, [])
```
This defers the time-based check to the client, avoiding server/client mismatch. The 60-second interval effect already runs client-side.

---

## Warnings

### WR-01: Price filter compares `hinta_min` only — venues with `hinta_min = null` always pass through

**File:** `app/components/LiikuntapaikatLista.tsx:58–59`

**Issue:** The price filter logic is:
```ts
const hintaRef = p.hinta_min ?? p.hinta_max
const matchesHinta = aktiivHinta === null || hintaRef == null || hintaRef <= aktiivHinta
```
When `hintaRef == null` (both `hinta_min` and `hinta_max` are null), `matchesHinta` is always `true` regardless of the selected price cap. This means venues with no price data always appear in "≤10 €" results, misleading users who filter by budget. A user selecting "≤10 €" will see venues that may cost far more; they just have no recorded price. Consider either excluding null-price venues from max-price filter results, or treating null price as "unknown" and filtering them out when an explicit cap is selected.

**Fix:**
```ts
const matchesHinta = aktiivHinta === null
  || (hintaRef != null && hintaRef <= aktiivHinta)
```

---

### WR-02: `membershipOnly` rendering branch not mutually exclusive with `priceLines` — stale `hinta_kuvaus` can bleed through

**File:** `app/components/PaikkaKortti.tsx:111–123`

**Issue:** `isMembershipOnly` returns `true` only when `hinta_min === null && hinta_max === null` AND `hinta_kuvaus` contains "jäsenyys". In that case the card shows "vain jäsenyys" (muted, correct). However `priceLines` is derived from `paikka.hinta_kuvaus?.includes('\n')` regardless of whether `membershipOnly` is true. The render order is:
```
membershipOnly → "vain jäsenyys"   // first branch, correct
priceLines → multiline price       // second branch — never reached if membershipOnly
priceText → single price           // third branch
```
Because `membershipOnly` is the first branch in the ternary chain, the `priceLines` and `priceText` branches are shadowed when `membershipOnly` is true, so the output is correct today. **The bug is latent**: if a future developer moves the `membershipOnly` branch or extracts `priceLines` into a separate rendering block, the membership `hinta_kuvaus` text (e.g., "jäsenyys vaaditaan") will re-appear in bold as a price string. Document the invariant explicitly.

**Fix:** Extract into a helper function with clear precedence comments, or gate `priceLines` and `priceText` on `!membershipOnly`:
```tsx
const priceLines = !membershipOnly && paikka.hinta_kuvaus?.includes('\n')
  ? paikka.hinta_kuvaus.split('\n')
  : null
const priceText = !membershipOnly
  ? (paikka.hinta_kuvaus ?? (hintaTeksti !== '' ? hintaTeksti : null))
  : null
```

---

### WR-03: Privacy policy contains placeholder text that will be live for real users

**File:** `app/tietosuoja/page.tsx:33, 94`

**Issue:** Two literal placeholder strings are present in the live privacy policy:
- Line 33: `[Rekisterinpitäjä]` — controller name is a template token
- Line 94: `[yhteyssähköposti@esimerkki.fi]` — contact email is a template example address

A GDPR privacy notice with unfilled controller identity and a non-existent contact address is not legally compliant. If a data subject sends a GDPR request to `yhteyssähköposti@esimerkki.fi` it will bounce. LEGAL-01 (per CLAUDE.md) must be live before auth ships — if this page is the LEGAL-01 artifact, it is incomplete.

**Fix:** Replace both placeholders with actual values before this page ships. If values are not yet known, block deployment of this page (not just auth) until they are filled.

---

### WR-04: `useGPS` auto-requests location on mount — affects `LiikuntapaikatLista` silently

**File:** `app/components/LiikuntapaikatLista.tsx:39`

**Issue:** `LiikuntapaikatLista` calls `useGPS()` at line 39. `useGPS` (`hooks/useGPS.ts:39–41`) fires `requestLocation()` in a `useEffect` on mount with an empty dependency array — this unconditionally triggers the browser geolocation permission prompt the moment the list view loads, before the user clicks "Etäisyydet". Unprompted permission requests are a known UX anti-pattern that browsers increasingly block by default and that reduces user trust. The "Etäisyydet" button exists precisely to give users control over when this happens, but the hook bypasses it.

**Fix:** Remove the auto-request `useEffect` from `useGPS`, or add an `autoRequest` parameter (default `false`) so only callers that explicitly need auto-request (e.g., Etusivu) opt in:
```ts
export function useGPS(autoRequest = false): GPSState {
  // ...
  useEffect(() => {
    if (autoRequest) requestLocation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
```

---

### WR-05: `Suspense` boundaries in `app/page.tsx` have no fallback — visible content jump

**File:** `app/page.tsx:28–38`

**Issue:** Both `<Suspense>` wrappers around `<LiikuntapaikatLista>` and `<Etusivu>` are passed with no `fallback` prop. This means any async boundary hit inside those components (streaming, lazy imports, etc.) will render nothing until the component resolves — a blank white flash. `Etusivu` lazy-loads weather data and AI text client-side (which are fine), but the outer `Suspense` without a fallback is fragile. If any inner component starts throwing a promise (e.g., a future lazy-loaded map), the user sees a blank page with no loading indicator.

**Fix:**
```tsx
<Suspense fallback={<div className="min-h-screen bg-white" />}>
  <Etusivu paikat={data} />
</Suspense>
```

---

### WR-06: `hintateksti()` called twice in Etusivu bottom sheet — redundant computation

**File:** `app/components/Etusivu.tsx:482–485`

**Issue:** Lines 482 and 485 both call `hintateksti(valittu.hinta_min, valittu.hinta_max)` — once for the truthiness check and once for the rendered value. This is not a performance issue (the function is trivial), but it is a maintainability defect: the two calls can drift if the function is ever made stateful or if one call site is updated. The bottom sheet price block also ignores `valittu.hinta_kuvaus` entirely: a venue with only `hinta_kuvaus` set (and `hinta_min/max` both null) shows "Lisätään pian" even though it has a price description.

**Fix:**
```tsx
{(() => {
  const priceStr = hintateksti(valittu.hinta_min, valittu.hinta_max)
  const displayPrice = valittu.hinta_kuvaus || priceStr || null
  return displayPrice
    ? <p className="font-serif text-xl font-bold text-[#111111] tabular-nums">{displayPrice}</p>
    : <p className="text-sm text-[rgba(17,17,17,0.4)]">Lisätään pian</p>
})()}
```

---

## Info

### IN-01: `font-semibold` (600-weight) used in multiple places — violates design system rule

**File:** `app/components/LiikuntapaikatLista.tsx:160`, `app/components/Etusivu.tsx:200, 361, 394, 455, 497`

**Issue:** CLAUDE.md states "2 weights only: 400 (normal) and 700 (bold). Never use 600 (semibold)." `font-semibold` maps to font-weight: 600. It is used on price filter buttons (LiikuntapaikatLista line 160), the day/night toggle button (Etusivu lines 200, 361), map filter pills (Etusivu line 394), the sport badge in the bottom sheet (Etusivu line 455), and the "Varaa" CTA button (Etusivu line 497). All should be `font-bold` (700).

**Fix:** Replace `font-semibold` with `font-bold` at each location listed above.

---

### IN-02: `isMembershipOnly` test at line 38 tests an ambiguous case as `true`

**File:** `lib/priceUtils.test.ts:38–39`

**Issue:** The test "palauttaa true kun hinta_kuvaus sisältää 'jäsenyys' osana pidempää tekstiä (osajono)" uses input `'kertakäynti 8€, jäsenyys 50€/v'`. This venue clearly has both a drop-in price (`kertakäynti 8€`) and a membership option. Calling `isMembershipOnly` on it returns `true` and the card would display "vain jäsenyys" (membership only), which is factually wrong — the venue accepts drop-in visits. The function docstring says "kaikki kolme ehtoa täyttyvät" but does not guard against this mixed-price case. The test asserts the wrong expected value: `true` is incorrect for a venue that explicitly offers drop-in.

**Fix:** The test assertion should be `toBe(false)`, or the function should be strengthened to return `false` when `hinta_kuvaus` also contains "kertakäynti":
```ts
if (kuvaus.toLowerCase().includes('kertakäynti')) return false
```

---

### IN-03: `deriveKaupungit` uses locale-insensitive `.sort()` — Finnish city names may sort incorrectly

**File:** `lib/cityFilter.ts:27`

**Issue:** `Array.from(unique).sort()` uses the JavaScript engine's default string comparison, which is not locale-aware. Finnish characters `ä`, `ö` sort before `a` in Unicode code-point order (ä=0xe4, ö=0xf6 > z=0x7a), so "Äänekoski" would sort after "Tampere" and "Örebro" would sort after all ASCII-named cities. In a Finnish application the expected alphabetical order puts ä/ö at the end of the alphabet, after z. The city dropdown will appear unsorted to Finnish users.

**Fix:**
```ts
const sorted = Array.from(unique).sort((a, b) =>
  a.localeCompare(b, 'fi', { sensitivity: 'base' })
)
```

---

### IN-04: `kuvaus` description text missing `text-sm` sizing on profile page

**File:** `app/paikat/[id]/page.tsx:121`

**Issue:** The `Row` component's description `<p>` at line 121 applies `text-[rgba(17,17,17,0.65)] leading-relaxed` but omits `text-sm`. All other body text in this design system uses `text-sm` as the base body size. Without it, the description falls back to the browser's default (16px on most browsers), making it larger than every other text element on the page.

**Fix:**
```tsx
<p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.kuvaus}</p>
```

---

### IN-05: `app/page.tsx` — `?nakyma=kartta` URL renders `Etusivu` without documentation

**File:** `app/page.tsx:26–38`

**Issue:** (Informational complement to CR-01.) Apart from the logic correctness concern in CR-01, the current else-arm has no comment explaining that `?nakyma=kartta` intentionally falls through to Etusivu (because Etusivu has an integrated map). Without this comment, the next developer will either assume it is a bug and add an incorrect Kartta branch above, or assume the `lista` check is the only relevant branch and not notice that `kartta` is silently treated as the default.

**Fix:** Add a comment:
```tsx
// nakyma=kartta also renders Etusivu — Etusivu has an integrated fullscreen map.
// Wire to a standalone Kartta component in Phase 7 when AdvancedMarker migration is done.
return (
  <Suspense fallback={<div className="min-h-screen bg-white" />}>
    <Etusivu paikat={data} />
  </Suspense>
)
```

---

_Reviewed: 2026-05-22T03:31:23Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
