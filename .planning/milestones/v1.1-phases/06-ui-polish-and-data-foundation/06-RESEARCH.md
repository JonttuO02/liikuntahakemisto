# Phase 6: UI Polish & Data Foundation — Research

**Researched:** 2026-05-21
**Domain:** Next.js 14 App Router UI, Supabase schema, GDPR static page, filter UX
**Confidence:** HIGH — all findings verified directly from codebase; zero new packages

---

## Summary

Phase 6 is a zero-dependency, zero-new-packages phase: every feature is implemented by editing existing components, adding one new page, and writing one SQL migration. The database schema already has the `featured` boolean column added in Phase 1. The `kaupunki` column already exists on the `Liikuntapaikka` type and is already selected in `app/page.tsx`. The AI widget weather logic already fetches temperature and city is effectively hardcoded as "Tampere" in the prompt — AI-04 just needs the city name surfaced in the UI display alongside the `°` reading. No new npm packages are needed — `@base-ui/react` (already installed) provides a `Select` primitive for the sport dropdown (UI-08).

The two changes that touch the most code are: (1) the sport-filter refactor in `LiikuntapaikatLista` from pill buttons to a `<select>`/Base-UI Select, and (2) the `PaikkaKortti` card changes (price-first layout, remove "Varaa aika" button, add "Sponsoroitu" badge). Both components are self-contained client components so changes are low-risk. The city filter (DATA-07) requires passing a city list derived from the fetched `paikat` array down to `LiikuntapaikatLista` and filtering with it — no API changes needed because `kaupunki` is already in the SELECT query.

**Primary recommendation:** Work in this order: (1) SQL migration for any needed schema changes, (2) `/tietosuoja` static page, (3) `PaikkaKortti` card changes, (4) sport filter → dropdown in `LiikuntapaikatLista`, (5) city filter in `LiikuntapaikatLista`, (6) "Sponsoroitu" badge in both list card and map pin bottom-sheet, (7) AI widget city display in `Etusivu`.

---

## Project Constraints (from CLAUDE.md)

| Directive | Category |
|-----------|----------|
| Primary color palette is indigo — never substitute other blues | Design |
| Tailwind v3 — use `@tailwind base/components/utilities`, not `@import "tailwindcss"` | Build |
| Sport-type colors defined in `lib/lajit.ts` — do not inline sport colors in components | Design |
| `lib/lajit.ts` is the single source of truth for sport labels and colors | Architecture |
| Server components fetch data; client components handle animation/interactivity | Architecture |
| Supabase writes: service role key only; anon key is read-only after RLS | Security |
| Kartta component is lazy-loaded: `const Kartta = lazy(() => import('./Kartta'))` | Architecture |
| `buttonVariants()` from `components/ui/button.tsx` on `<a>` tags for link-buttons | UI |
| No `spring` physics, no `layout` animations, `AnimatePresence` needs stable `key` | Animation |
| Card hover: scale only, `whileHover={{ scale: 1.02 }}` — never combine with y-lift | Animation |
| Filter buttons: `whileTap={{ scale: 0.95 }}` only | Animation |
| URL routing: `?nakyma=kartta` for map, `?nakyma=lista` for list | Routing |
| AI widget: never SSR, use `/api/saasuositus` Route Handler, non-blocking load | Architecture |
| LEGAL-01 must be live before auth (Phase 9) ships | Ordering |
| Zero new packages for Phase 6 — pure UI and schema work | Constraint |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEGAL-01 | User can navigate to `/tietosuoja` and read GDPR privacy policy before login | New Next.js App Router page at `app/tietosuoja/page.tsx` — pure server component, no data fetching needed |
| ADS-02 | Featured venues show "Sponsoroitu" badge on list cards and map pins | `featured` boolean already in DB schema (Phase 1) and in `Liikuntapaikka` type; add badge to `PaikkaKortti` and `Etusivu` bottom-sheet |
| AI-04 | AI widget shows city name next to temperature reading | `Etusivu.tsx` already has `saa.temp` display; add city name string alongside `{saa.temp}°` — city is "Tampere" (hardcoded) until DATA-07 city filter is multi-city |
| UI-05 | List card shows walk-in price at top if available, or "vain jäsenyys" | `PaikkaKortti.tsx` — restructure price section; use `hinta_kuvaus` to detect membership-only vs drop-in |
| UI-06 | Price shown at top of card; multiple prices on own rows | `PaikkaKortti.tsx` — move price display above description/address |
| UI-07 | Remove "Varaa aika" button from list cards; show booking URL as text on profile page | `PaikkaKortti.tsx` — remove `varauslinkki`-conditional button; `app/paikat/[id]/page.tsx` — show URL as text |
| UI-08 | Sport filter is a single-select dropdown instead of pills | `LiikuntapaikatLista.tsx` — replace pill `<button>` loop with a `<select>` or Base-UI `Select`; `LAJIT_FILTTERI` still the source of options |
| DATA-07 | User can filter venues by city | `LiikuntapaikatLista.tsx` — derive unique cities from `paikat` array, add city selector UI; filter logic mirrors existing `aktiivinen` laji filter |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GDPR static page | Frontend Server (SSR) | — | Server component, no auth, no data fetching — pure HTML render |
| Sponsoroitu badge (list) | Browser / Client | — | `PaikkaKortti` is a client component |
| Sponsoroitu badge (map pin bottom-sheet) | Browser / Client | — | `Etusivu` bottom-sheet is client-rendered |
| Price layout refactor | Browser / Client | — | `PaikkaKortti` client component |
| "Varaa aika" removal from list | Browser / Client | — | `PaikkaKortti` client component |
| Booking URL as text (profile) | Frontend Server (SSR) | — | `app/paikat/[id]/page.tsx` is a server component |
| Sport filter → dropdown | Browser / Client | — | `LiikuntapaikatLista` client component |
| City filter UI | Browser / Client | API / Backend | State in `LiikuntapaikatLista`; `kaupunki` data already fetched by `app/page.tsx` |
| AI widget city display | Browser / Client | — | `Etusivu` client component |

---

## Standard Stack

### No new packages — all work uses already-installed libraries

| Library | Version (installed) | Usage in this phase |
|---------|---------------------|---------------------|
| `next` | 14.2.35 | New `/tietosuoja` page (App Router) |
| `@base-ui/react` | ^1.4.1 | `Select` primitive for sport dropdown (UI-08) — already installed |
| `framer-motion` | ^12.38.0 | Existing animation primitives; no new variants needed |
| `lucide-react` | ^1.16.0 | `Star` or `Sparkles` icon for Sponsoroitu badge |
| `@supabase/supabase-js` | ^2.105.4 | Existing `supabase` client — no changes |
| `tailwindcss` | ^3.4.1 | Tailwind v3 utilities for badge styling |

[VERIFIED: codebase — package.json]

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
app/page.tsx (Server Component)
  └─ SELECT id, nimi, laji, osoite, kaupunki, ..., featured FROM liikuntapaikat
       │
       ├─ Etusivu (Client Component) — home view (?nakyma absent)
       │    ├─ AI Widget: shows city + temp  [AI-04]
       │    ├─ Map pins: Sponsoroitu badge in bottom-sheet  [ADS-02]
       │    └─ Map filter pills (unchanged — city filter only in lista)
       │
       └─ LiikuntapaikatLista (Client Component) — list view (?nakyma=lista)
            ├─ Sport filter: dropdown [UI-08]
            ├─ City filter: new selector [DATA-07]
            └─ PaikkaKortti (Client Component)
                 ├─ Price at top, "vain jäsenyys" fallback  [UI-05, UI-06]
                 ├─ No "Varaa aika" button  [UI-07]
                 └─ "Sponsoroitu" badge if featured=true  [ADS-02]

app/tietosuoja/page.tsx (Server Component, static)  [LEGAL-01]
  └─ GDPR prose — no data fetching

app/paikat/[id]/page.tsx (Server Component, existing)
  └─ Show varauslinkki as plain text (not button)  [UI-07]
```

### Recommended Project Structure

No new directories needed. New files:

```
app/
├── tietosuoja/
│   └── page.tsx          # New — LEGAL-01 GDPR page
app/components/
├── PaikkaKortti.tsx       # Edit — UI-05, UI-06, UI-07, ADS-02
├── LiikuntapaikatLista.tsx # Edit — UI-08, DATA-07
├── Etusivu.tsx            # Edit — AI-04, ADS-02 (bottom-sheet badge)
app/paikat/[id]/page.tsx   # Edit — UI-07 (booking URL as text)
```

### Pattern 1: Sponsoroitu Badge

**What:** Conditionally render a "Sponsoroitu" pill badge when `paikka.featured === true`
**When to use:** In `PaikkaKortti` name+badge row; in `Etusivu` bottom-sheet; optionally on map marker label
**Example:**
```tsx
// Source: [VERIFIED: codebase — PaikkaKortti.tsx badge pattern]
{paikka.featured && (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
    Sponsoroitu
  </span>
)}
```
The amber/gold color is semantically correct for "sponsored" and does not conflict with the indigo primary palette. Keep it as a small secondary badge, not an accent color override.

### Pattern 2: Price-at-top with "vain jäsenyys" fallback

**What:** UI-05 says show walk-in price at top if available, else "vain jäsenyys". UI-06 says move price to top of card.
**Heuristic:** If `hinta_kuvaus` exists and does NOT contain "kertakäynti" (drop-in), AND `hinta_min`/`hinta_max` are both null, then show "vain jäsenyys". Otherwise show price normally.

Current logic in `PaikkaKortti`:
```tsx
// Source: [VERIFIED: codebase — PaikkaKortti.tsx lines 42–44]
const hasDropIn   = paikka.hinta_kuvaus?.toLowerCase().includes('kertakäynti') ?? false
const hintaTeksti = hintateksti(paikka.hinta_min, paikka.hinta_max)
const priceToShow = paikka.hinta_kuvaus || (hintaTeksti !== '' ? hintaTeksti : null)
```

New logic needed:
```tsx
// Membership-only: has hinta_kuvaus, no drop-in mention, no numeric price
const isMembershipOnly =
  !hasDropIn && paikka.hinta_min == null && paikka.hinta_max == null

const priceDisplay = hasDropIn
  ? (paikka.hinta_kuvaus || hintaTeksti)
  : isMembershipOnly
  ? 'vain jäsenyys'
  : (priceToShow || null)
```

Move this block above the description and address in the JSX layout.

### Pattern 3: Sport filter as dropdown

**What:** Replace the horizontal pill scroll in `LiikuntapaikatLista` with a single-select `<select>` or `@base-ui/react` Select. `LAJIT_FILTTERI` from `lib/lajit.ts` is the options source.
**Native `<select>` approach (simplest):**
```tsx
// Source: [ASSUMED — standard HTML pattern]
<select
  value={aktiivinen}
  onChange={e => setAktiivinen(e.target.value)}
  className="h-10 rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 text-sm font-semibold text-[#111111] focus:ring-1 focus:ring-[#111111]"
>
  {LAJIT_FILTTERI.map(l => (
    <option key={l} value={l}>{l}</option>
  ))}
</select>
```
**Base-UI Select approach** (consistent with existing Base UI usage): `@base-ui/react` Select component uses `Select.Root`, `Select.Trigger`, `Select.Positioner`, `Select.Popup`, `Select.Item`. More composable but more markup. Since the requirement says "pudotusvalikko (single-select)" and the project already has `@base-ui/react`, either is valid. The native `<select>` is the least risky for a no-new-packages phase.

### Pattern 4: City filter

**What:** Derive unique cities from `paikat` prop, render a city selector, filter `suodatettu` by city.
**When to use:** Only in `LiikuntapaikatLista` (not in `Etusivu` map view, which has its own filter pills).
```tsx
// Source: [VERIFIED: codebase — derived from existing aktiivinen filter pattern in LiikuntapaikatLista.tsx]
const kaupungit = useMemo(
  () => ['Kaikki', ...Array.from(new Set(paikat.map(p => p.kaupunki).filter(Boolean)))],
  [paikat]
)
const [aktiivKaupunki, setAktiivKaupunki] = useState('Kaikki')

// In filter:
const matchesKaupunki = aktiivKaupunki === 'Kaikki' || p.kaupunki === aktiivKaupunki
```

### Pattern 5: GDPR Privacy Page

**What:** A new Next.js App Router page at `app/tietosuoja/page.tsx`. Pure server component — no `'use client'`, no data fetching.
**Structure follows existing page patterns (white bg, max-w-2xl, prose).**
```tsx
// Source: [VERIFIED: codebase — app/paikat/[id]/page.tsx structure pattern]
export default function TietosuojaPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        <h1 className="font-serif text-3xl font-bold text-[#111111]">Tietosuojaseloste</h1>
        {/* GDPR content prose */}
      </div>
    </div>
  )
}
```
GDPR content needs: data controller identity, what data is collected (none until Phase 9 auth), cookies/localStorage, user rights (access/deletion).

### Pattern 6: AI widget city display

**What:** Show city name next to `{saa.temp}°` in `Etusivu.tsx` weather row.

Current code (lines ~186–192 of Etusivu.tsx):
```tsx
// Source: [VERIFIED: codebase — Etusivu.tsx]
{saa && (
  <div className="flex items-center gap-1.5">
    <span className="text-base leading-none select-none" aria-hidden>
      {getWeatherEmoji(saa.code)}
    </span>
    <span className="text-sm font-semibold text-[#111111] tabular-nums">
      {saa.temp}°
    </span>
  </div>
)}
```

Add city name as muted text after the `°`:
```tsx
<span className="text-sm font-semibold text-[#111111] tabular-nums">
  {saa.temp}° <span className="font-normal text-[rgba(17,17,17,0.45)]">Tampere</span>
</span>
```
Currently the city is always "Tampere" (the weather fetch is hardcoded to Tampere lat/lng). When DATA-07 is implemented and a city filter exists, this string could become dynamic, but for now a hardcoded "Tampere" string is correct and honest. [ASSUMED: "Tampere" is acceptable until multi-city phase; confirm with user if the city name should be dynamic based on selected city filter.]

### Anti-Patterns to Avoid

- **Inline sport colors:** Never put hex color values in component JSX. Always read from `lajiKonfig[laji].color`.
- **Indigo substitution:** Do not use blue-500, sky, or any non-indigo blue for badges/buttons.
- **Spring animations:** Do not use `type: "spring"` unless the element has direct drag/cursor tracking.
- **`layout` animation prop:** Do not add `layout` to cards — causes reflow jank.
- **`'use client'` on tietosuoja page:** The GDPR page is static — it MUST be a server component.
- **`NEXT_PUBLIC_` on ANTHROPIC_API_KEY:** Already correct in `/api/saasuositus`; do not change.
- **Filter state in URL for city/sport filters:** Per CLAUDE.md, the only URL-encoded view state is `?nakyma=`. Sport and city filter state stays in React `useState` in the client component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Single-select dropdown | Custom pill-based select with escape/arrow logic | Native `<select>` or `@base-ui/react` Select | Keyboard accessibility, mobile UX, focus management are complex |
| Unique city list | Custom dedup algorithm | `Array.from(new Set(...))` | Already a standard JS pattern — one line |
| Membership-only detection | Complex price parsing engine | Simple boolean: `!hasDropIn && hinta_min == null && hinta_max == null` | Current data model is simple enough |
| GDPR page content | Auto-generated from DB | Static prose authored once | GDPR text requires legal accuracy, not dynamic generation |

---

## Common Pitfalls

### Pitfall 1: "Sponsoroitu" badge in Etusivu bottom-sheet is hidden

**What goes wrong:** The bottom-sheet in `Etusivu.tsx` renders a simplified card for `valittu` (selected venue). It does not use `PaikkaKortti` — it has its own inline JSX (lines 448–503). ADS-02 requires the badge on "listakortit ja kartalla" — the map pin bottom-sheet counts as "kartalla".
**Why it happens:** ADS-02 badge is added to `PaikkaKortti` but the map bottom-sheet is separate code.
**How to avoid:** Add the badge check to the `Etusivu` bottom-sheet's name+badge row independently from `PaikkaKortti`.
**Warning signs:** Badge appears in list view but not when tapping map pin.

### Pitfall 2: Price "vain jäsenyys" shows for venues with no data at all

**What goes wrong:** If `hinta_kuvaus` is null, `hinta_min` is null, `hinta_max` is null — that is "no pricing data" not "membership only". Showing "vain jäsenyys" is incorrect for venues where pricing simply isn't entered yet.
**Why it happens:** Overly broad null-check for membership detection.
**How to avoid:** "vain jäsenyys" should ONLY show when there is affirmative evidence of membership-only pricing (e.g., `hinta_kuvaus` contains "jäsenyys" or similar indicator). If all price fields are null, show nothing (or "Lisätään pian" as today). Consider: only show "vain jäsenyys" when `hinta_kuvaus` contains "jäsenyys" (case-insensitive).
**Warning signs:** All venues without price data show "vain jäsenyys" instead of the fallback text.

### Pitfall 3: City filter only in LiikuntapaikatLista, not in Etusivu

**What goes wrong:** DATA-07 requirement says "user can filter venues by city". The map view in `Etusivu` already has filter pills but those are sport-type filters. Adding city filter to the map view is out of scope for Phase 6 (map UX changes are Phase 7/8).
**Why it happens:** Over-engineering scope.
**How to avoid:** City filter goes in `LiikuntapaikatLista` only. The map view filter pills remain unchanged.
**Warning signs:** Attempting to add city selector to the map overlay at the bottom.

### Pitfall 4: `featured` column not added to Supabase SELECT query

**What goes wrong:** `featured` is in the `Liikuntapaikka` type but `app/page.tsx` has an explicit column list in the SELECT query. If `featured` is not in that list, it will be `undefined` on the client.
**Why it happens:** `app/page.tsx` uses a named column select, not `select('*')`.
**How to avoid:** Verify the SELECT in `app/page.tsx` includes `featured`. [VERIFIED: codebase — current SELECT at line 13 of app/page.tsx does NOT include `featured`.]

Current SELECT: `'id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus'`
**Missing:** `featured` — must be added to the SELECT string.

### Pitfall 5: GDPR page missing from NavBar/BottomNav links

**What goes wrong:** The GDPR page exists at `/tietosuoja` but is not linked from anywhere — users cannot find it.
**Why it happens:** The page is created but not wired into navigation.
**How to avoid:** Add a "Tietosuoja" footer link or add it to the NavBar dropdown. The BottomNav is only 3 tabs so adding there would disrupt layout — a footer link on the `/tietosuoja` page and a small link in the NavBar dropdown (or in `LiikuntapaikatLista` footer) is appropriate.
**Warning signs:** `curl localhost:3000/tietosuoja` works but no UI links to it.

### Pitfall 6: kaupunki values inconsistent in DB

**What goes wrong:** The `sync-paikat` script hardcodes `'Tampere'` as `kaupunki`. The actual data may have null, empty string, or different capitalization for some rows added manually.
**Why it happens:** Data entry inconsistency.
**How to avoid:** The city filter should handle null gracefully (`p.kaupunki === aktiivKaupunki` already excludes null rows when a specific city is selected). Consider adding a "Tuntematon" city bucket for null rows during display, or simply omit null rows from the city list.
**Warning signs:** City filter shows "undefined" or blank option in the dropdown.

---

## Code Examples

### Add `featured` to SELECT query

```tsx
// Source: [VERIFIED: codebase — app/page.tsx]
// Change line 13 from:
.select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus')
// To:
.select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin, aukioloajat, hinta_kuvaus, featured')
```

### Remove "Varaa aika" button from PaikkaKortti

```tsx
// Source: [VERIFIED: codebase — PaikkaKortti.tsx lines 113–133]
// The bottom row currently shows "Varaa aika →" button if varauslinkki exists.
// UI-07: remove it. Replace with always showing "Näytä tiedot" link.
<motion.div whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}>
  <Link
    href={`/paikat/${paikka.id}`}
    className="border border-[rgba(0,0,0,0.12)] text-[rgba(17,17,17,0.6)] hover:text-[#111111] hover:border-[rgba(0,0,0,0.25)] text-sm font-medium py-2 px-4 rounded-full [transition:color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
  >
    Näytä tiedot
  </Link>
</motion.div>
```

### Show varauslinkki as text on profile page

```tsx
// Source: [VERIFIED: codebase — app/paikat/[id]/page.tsx lines 114–129]
// Current: full "Varaa aika →" button block at bottom of content card
// UI-07: replace with a Row showing the URL as a plain anchor link
{paikka.varauslinkki && (
  <Row icon={<ExternalLink className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />} label="Varaussivu">
    <a
      href={paikka.varauslinkki}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-[#111111] font-medium underline underline-offset-2 break-all hover:text-[rgba(17,17,17,0.6)] [transition:color_150ms_var(--ease-out)]"
    >
      {paikka.varauslinkki}
    </a>
  </Row>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pill-button sport filters (always visible) | Single-select dropdown | Phase 6 (now) | Less horizontal scroll; cleaner on mobile |
| No price hierarchy | Walk-in price at top, membership text as fallback | Phase 6 (now) | Clearer price information scent for new users |
| "Varaa aika" on list card | Removed from list; shown as URL on profile only | Phase 6 (now) | Reduces list card complexity; booking intent belongs on detail page |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Tampere" hardcoded in AI widget city display is acceptable for Phase 6 | Code Examples (Pattern 6) | If user expects dynamic city from DATA-07 city filter, requires wiring city state from `LiikuntapaikatLista` up through page props — significant refactor |
| A2 | Membership-only detection via `hinta_kuvaus` containing "jäsenyys" is the correct heuristic | Common Pitfalls #2 | If data uses different terminology, "vain jäsenyys" never shows — needs DB audit |
| A3 | City filter is only needed in `LiikuntapaikatLista` (not in `Etusivu` map view) | Common Pitfalls #3 | If user expects city filter on map view too, scope expands |
| A4 | Amber/gold color for "Sponsoroitu" badge is acceptable (not constrained by indigo system) | Architecture Patterns #1 | If brand requires indigo-only palette for all badges, must use indigo tones instead |
| A5 | Native `<select>` is acceptable for UI-08 (vs Base-UI Select) | Architecture Patterns #3 | If user wants consistent custom styling with Base-UI Select, native select needs custom CSS wrapper |

---

## Open Questions (RESOLVED)

1. **Should the city name in the AI widget be dynamic (reflecting the selected city filter)?**
   - What we know: Weather fetch is hardcoded to Tampere lat/lng; DATA-07 city filter state lives in `LiikuntapaikatLista` (a sibling component, not ancestor of `Etusivu`)
   - What's unclear: Whether "Tampere" hardcoded is good enough for Phase 6, or if the widget should reflect whatever city the user has filtered to
   - Recommendation: Hardcode "Tampere" in Phase 6. Update in Phase 10 when multi-city data is live and weather API calls become city-aware.
   - RESOLVED: see D-24 — `const WEATHER_CITY = 'Tampere'` hardcoded at top of Etusivu.tsx.

2. **What GDPR content is required for the `/tietosuoja` page?**
   - What we know: The app currently collects no personal data (no auth until Phase 9). Phase 9 adds Supabase Auth which will store email/password.
   - What's unclear: Whether the policy should be forward-looking (mention planned auth) or minimal (current state only)
   - Recommendation: Write a minimal policy covering current state (no personal data collected, no cookies beyond sessionStorage for AI cache), with a note that the policy will be updated when accounts are added in Phase 9.
   - RESOLVED: see D-03 — minimal current-state scope; include a note the policy updates when Phase 9 auth ships.

3. **How should "vain jäsenyys" be detected — via heuristic or a new DB column?**
   - What we know: `hinta_kuvaus` is free text; no boolean `membership_only` column exists
   - What's unclear: Whether text heuristic (`hinta_kuvaus` contains "jäsenyys") is reliable for all current records
   - Recommendation: Use text heuristic for Phase 6. If unreliable, add a `membership_only boolean` column in a follow-up migration.
   - RESOLVED: see D-11 — show "vain jäsenyys" only when `hinta_kuvaus` exists AND contains "jäsenyys" (case-insensitive); null price rows use existing "Lisätään pian" fallback.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — zero new packages, pure UI and schema work; Supabase and Google Maps already configured in .env.local from v1.0)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.7 |
| Config file | `vitest.config.ts` — `include: ['lib/**/*.test.ts']`, `environment: 'node'` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEGAL-01 | `/tietosuoja` page renders | smoke (manual) | `next build` compiles page | ❌ Wave 0 — manual verify |
| ADS-02 | `featured=true` renders "Sponsoroitu" badge | unit | `npx vitest run lib/` | ❌ Wave 0 |
| AI-04 | City name appears next to temperature | smoke (manual) | manual browser check | ❌ Wave 0 — manual verify |
| UI-05 | "vain jäsenyys" shows when no drop-in price | unit | `npx vitest run lib/` | ❌ Wave 0 |
| UI-06 | Price at top of card (layout order) | smoke (manual) | manual browser check | ❌ Wave 0 — manual verify |
| UI-07 | No "Varaa aika" in list; URL text in profile | smoke (manual) | manual browser check | ❌ Wave 0 — manual verify |
| UI-08 | Sport filter is `<select>` not pills | smoke (manual) | manual browser check | ❌ Wave 0 — manual verify |
| DATA-07 | City filter reduces venue list | unit | `npx vitest run lib/` | ❌ Wave 0 |

**Note:** vitest config scopes to `lib/**/*.test.ts` — component-level tests would need `jsdom` environment. Pure logic tests (price heuristic, filter logic) can live in `lib/`.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run` + manual browser smoke (list view, card price, GDPR page)
- **Phase gate:** All automated tests green + manual success criteria checklist before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/priceUtils.test.ts` — unit tests for "vain jäsenyys" heuristic (UI-05)
- [ ] `lib/cityFilter.test.ts` — unit tests for city filter dedup logic (DATA-07)

*(Or co-locate price/city logic in existing lib files and test inline — choose at plan time)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no auth in Phase 6) |
| V3 Session Management | no | — |
| V4 Access Control | no | — (RLS already in place from Phase 1) |
| V5 Input Validation | no | — (no user inputs that reach the DB; city/sport filter is client-side only) |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via venue data in GDPR page | Tampering | Server component with no `dangerouslySetInnerHTML` — React escapes all content |
| `featured` column manipulation via anon key | Tampering | RLS `public_read` policy is SELECT-only; anon cannot UPDATE featured column — already mitigated |

---

## Sources

### Primary (HIGH confidence)

- `app/components/PaikkaKortti.tsx` — exact current price logic, button structure
- `app/components/LiikuntapaikatLista.tsx` — exact sport filter pill pattern, filter state
- `app/components/Etusivu.tsx` — AI widget weather display, bottom-sheet code, map pin rendering
- `app/page.tsx` — SELECT column list (confirmed `featured` is missing)
- `lib/types.ts` — `Liikuntapaikka` type (confirmed `featured?: boolean | null` exists)
- `supabase/migrations/20260519000000_add_phase1_columns.sql` — confirmed `featured boolean DEFAULT false` column exists in DB schema
- `lib/lajit.ts` — `LAJIT_FILTTERI` array confirmed
- `app/paikat/[id]/page.tsx` — confirmed "Varaa aika" button location, Row component pattern
- `app/api/saasuositus/route.ts` — confirmed weather hardcoded to Tampere lat/lng
- `package.json` — confirmed `@base-ui/react` ^1.4.1 installed, `vitest` ^4.1.7 installed
- `vitest.config.ts` — confirmed test scope and environment
- `CLAUDE.md` — project design system constraints

### Tertiary (LOW confidence / assumed)

- Membership-only heuristic (text contains "jäsenyys") — [ASSUMED] — needs verification against live data

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero new packages, all libraries verified in package.json
- Architecture: HIGH — all component file locations verified by reading source
- Pitfalls: HIGH — identified by direct code inspection (featured not in SELECT, separate bottom-sheet code in Etusivu)
- Test infrastructure: HIGH — vitest.config.ts confirmed

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable project, no moving dependencies)
