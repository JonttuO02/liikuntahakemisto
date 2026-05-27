# Phase 6: UI Polish & Data Foundation - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Tighten the list card UI (price at top, remove "Varaa aika" button, sport filter as dropdown), add a GDPR privacy page at `/tietosuoja`, implement the "Sponsoroitu" badge for featured venues on list cards and map bottom-sheet, add a city filter to the list view, and show the city name in the AI widget. Zero new npm packages — pure UI and schema work.

Requirements: LEGAL-01, ADS-02, AI-04, UI-05, UI-06, UI-07, UI-08, DATA-07.

**Out of scope for Phase 6:** city filter on map view (Phase 7/8), actual multi-city data (Phase 10), Sponsoroitu badge on map pin markers (Phase 7 AdvancedMarker migration is a prerequisite).

</domain>

<decisions>
## Implementation Decisions

### GDPR Page (LEGAL-01)
- **D-01:** Controller identity (rekisterinpitäjä): leave as `[Rekisterinpitäjä]` placeholder text — user fills in before Phase 9 ships.
- **D-02:** Contact email: leave as `[yhteyssähköposti@esimerkki.fi]` placeholder — user fills in before Phase 9 ships.
- **D-03:** Scope: minimal (current state only). The policy honestly states no personal data is collected yet; sessionStorage is used only for AI widget cache. Include a note that the policy will be updated when user accounts are added in Phase 9. Do NOT describe planned auth features as if they are live.
- **D-04:** Content sections (locked in UI-SPEC): rekisterinpitäjä, mitä tietoja kerätään, evästeet ja selaintallennus, käyttäjän oikeudet, yhteydenotot, muutokset.
- **D-05:** Navigation: "Tietosuoja" text link appears as a footer link at the bottom of `LiikuntapaikatLista` (after the venue grid). Do NOT add a BottomNav tab. Optionally also add to NavBar dropdown — this is Claude's discretion.

### Sponsoroitu Badge (ADS-02)
- **D-06:** "kartalla" (on the map) means the bottom-sheet popup only — not the actual map pin marker. The badge appears in the slide-up panel in `Etusivu.tsx` (inline JSX, ~lines 448–503) when a user taps a featured venue's map pin. Pin marker changes are deferred to Phase 7 (AdvancedMarker migration).
- **D-07:** Badge appears in both `PaikkaKortti.tsx` (list cards) and the Etusivu bottom-sheet independently (not via PaikkaKortti — the bottom-sheet has its own inline JSX).
- **D-08:** Badge placement in card: badge row after sport pill — `[Sport pill] [Sponsoroitu] [Kertakäynti OK]`.
- **D-09:** `featured` must be added to the `app/page.tsx` SELECT query — currently missing. Add `featured` to the explicit column list.

### Price Display (UI-05, UI-06)
- **D-10:** Price section moves to position 4 in the card (after open-status row, before address row). New card order: badge row → venue name → open status → price → address → description → CTA bottom row.
- **D-11:** "vain jäsenyys" shows ONLY when `hinta_kuvaus` exists AND contains "jäsenyys" (case-insensitive). Do NOT show "vain jäsenyys" when all price fields are null — use existing "Lisätään pian" fallback for venues with no pricing data at all.
- **D-12:** "vain jäsenyys" style: muted, not bold (`text-sm text-[rgba(17,17,17,0.5)]`). It is a constraint, not a selling point.
- **D-13:** Multiple prices: split `hinta_kuvaus` on `\n` if line breaks present; each price on its own row via `<span className="block">`.
- **D-14:** Bottom row after UI-06: retains CTA button only. Price `<div>` moves to position 4. Distance string stays in bottom row right side.

### List Card CTA (UI-07)
- **D-15:** Remove `varauslinkki`-conditional "Varaa aika →" button from `PaikkaKortti` entirely. Always show "Näytä tiedot" outlined link regardless of whether `varauslinkki` exists.
- **D-16:** Profile page (`app/paikat/[id]/page.tsx`): replace full-width "Varaa aika" button with a `Row` entry showing booking URL as a plain styled anchor. Add `ExternalLink` icon. Row label: "Varaussivu".
- **D-17:** Etusivu bottom-sheet "Varaa →" button: LEAVE UNCHANGED. This is an in-map quick action, not a list card — different context.

### Sport Filter (UI-08)
- **D-18:** Replace the pill scroll in `LiikuntapaikatLista.tsx` with a native `<select>`. Reason: zero new packages, full keyboard accessibility, native mobile UX. `LAJIT_FILTTERI` from `lib/lajit.ts` remains the options source. First option is "Kaikki" (already first in the array).
- **D-19:** Row 1 layout after change: `[City dropdown] [Sport dropdown] [Etäisyydet button]` — both dropdowns in the same row for visual economy.

### City Filter (DATA-07)
- **D-20:** City filter in `LiikuntapaikatLista` only. Not in `Etusivu` map view (map UX changes are Phase 7/8).
- **D-21:** City list derived via `useMemo`: `['Kaikki', ...Array.from(new Set(paikat.map(p => p.kaupunki).filter(Boolean).sort()))]`. `filter(Boolean)` excludes null/empty — venues with null `kaupunki` remain in "Kaikki" but are excluded when a specific city is selected. Do NOT show a "Tuntematon" bucket.
- **D-22:** Hero subtitle behavior: when "Kaikki" is selected → `"Kaikki kaupungit · {suodatettu.length} paikkaa"`. When a specific city is selected → `"{aktiivKaupunki} · {suodatettu.length} paikkaa"`. Count always reflects currently-filtered venue count (all active filters: city + sport + price + auki).
- **D-23:** "Tyhjennä haku" in empty state: resets ALL active filters including city filter.

### AI Widget City Name (AI-04)
- **D-24:** City string is hardcoded as `"Tampere"` for Phase 6. Define as `const WEATHER_CITY = 'Tampere'` at the top of `Etusivu.tsx` to make Phase 10 update easier. Style: `font-normal text-[rgba(17,17,17,0.45)]` inline after `{saa.temp}°`.

### Claude's Discretion
- Whether to also add "Tietosuoja" to the NavBar dropdown (in addition to the mandatory LiikuntapaikatLista footer link).
- Exact Lucide icon for the booking URL row on the profile page (ExternalLink is suggested).
- Max-width container and vertical rhythm of the GDPR prose page within the locked 6-section structure.
- Order of Row components on profile page (booking URL row goes after Hinta row and before Kuvaus row — exact position if ambiguous).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Components to modify
- `app/components/PaikkaKortti.tsx` — card component; target for UI-05, UI-06, UI-07, ADS-02 (price layout, badge, CTA change)
- `app/components/LiikuntapaikatLista.tsx` — list view; target for UI-08, DATA-07 (sport → dropdown, city filter)
- `app/components/Etusivu.tsx` — homepage; target for AI-04 (weather city label) and ADS-02 (bottom-sheet badge, ~lines 448–503)
- `app/paikat/[id]/page.tsx` — profile page; target for UI-07 (booking URL as text)

### Data layer
- `app/page.tsx` — SELECT query that must include `featured` column (currently missing — add to explicit column list)
- `lib/types.ts` — `Liikuntapaikka` type with `featured?: boolean | null` and `kaupunki` fields
- `lib/lajit.ts` — `LAJIT_FILTTERI` array (sport filter options source)
- `lib/utils.ts` — `hintateksti()` fallback utility for price display

### New file
- `app/tietosuoja/page.tsx` — to create; pure server component, no `'use client'`

### Design system and constraints
- `CLAUDE.md` — glassmorphism utilities, color tokens, animation rules, typography; MUST follow
- `app/globals.css` — `.glass`, `.glass-btn`, `.glass-hover`, `.glass-nav` utility class definitions

### Planning artifacts (these contain detailed implementation patterns and pitfalls)
- `.planning/phases/06-ui-polish-and-data-foundation/06-RESEARCH.md` — verified code patterns, pitfalls (especially Pitfall 1: bottom-sheet badge must be added independently; Pitfall 4: featured not in SELECT)
- `.planning/phases/06-ui-polish-and-data-foundation/06-UI-SPEC.md` — visual contracts per requirement with exact Tailwind classes

### Requirements
- `.planning/REQUIREMENTS.md` — LEGAL-01, ADS-02, AI-04, UI-05, UI-06, UI-07, UI-08, DATA-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaikkaKortti.tsx` — existing card with `.glass .glass-hover` shell, badge row, `korttiVariants` animation, bottom CTA strip. Price and badge changes are within this flex-col structure.
- `Row` component in `app/paikat/[id]/page.tsx` — icon + label + children pattern; reuse for booking URL row.
- `hintateksti()` in `lib/utils.ts` — keep as fallback when `hinta_kuvaus` is null.
- `lajiKonfig` in `lib/lajit.ts` — `LAJIT_FILTTERI` array provides the option list for the sport dropdown.
- `getWeatherEmoji()` and weather display block in `Etusivu.tsx` (~lines 186–192) — city name inserts inline after `{saa.temp}°`.

### Established Patterns
- Filter state in `LiikuntapaikatLista` via `useState` + `useMemo` — city filter follows the same `aktiivinen` (sport) pattern: `const [aktiivKaupunki, setAktiivKaupunki] = useState('Kaikki')`.
- Placeholder text: `"Lisätään pian"` in `text-[rgba(17,17,17,0.35)]` — reuse for null price fallback (already exists; no change needed).
- `filter(Boolean)` and `new Set()` for deriving unique values from array — used for city list.
- `useCallback` for stable event handler references — apply to city/sport change handlers if passed to children.

### Integration Points
- `app/page.tsx` passes `paikat` array to both `Etusivu` and `LiikuntapaikatLista` — `kaupunki` and `featured` are already in the type; `featured` just needs to be added to the SELECT query.
- `Etusivu.tsx` bottom-sheet is inline JSX (~lines 448–503) — does NOT use `PaikkaKortti`; badge must be added independently there.
- `LiikuntapaikatLista` receives `paikat: Liikuntapaikka[]` prop — derive city list from this, no API changes needed.

</code_context>

<specifics>
## Specific Ideas

- `WEATHER_CITY` constant: `const WEATHER_CITY = 'Tampere'` at top of `Etusivu.tsx` — named constant for Phase 10 update ease.
- City subtitle copy: `"Kaikki kaupungit · {suodatettu.length} paikkaa"` (Kaikki) / `"{aktiivKaupunki} · {suodatettu.length} paikkaa"` (specific city).
- Sponsoroitu badge exact class: `"inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200"` — from UI-SPEC.
- GDPR page heading: `<h1 className="font-serif text-3xl font-bold text-[#111111]">Tietosuojaseloste</h1>`.
- Sport select exact class (from UI-SPEC): `"h-10 rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 text-sm font-bold text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] [transition:border-color_150ms_var(--ease-out)] cursor-pointer"`.
- City select: identical class to sport select. `aria-label="Suodata kaupungin mukaan"`.

</specifics>

<deferred>
## Deferred Ideas

- Sponsoroitu badge on actual map pin markers — deferred to Phase 7 (AdvancedMarker migration is a prerequisite for custom badge rendering on pins).
- Dynamic city in AI weather widget (beyond "Tampere") — deferred to Phase 10 when multi-city weather API calls become city-aware.

</deferred>

---

*Phase: 06-ui-polish-and-data-foundation*
*Context gathered: 2026-05-22*
