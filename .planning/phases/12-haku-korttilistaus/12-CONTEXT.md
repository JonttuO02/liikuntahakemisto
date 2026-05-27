# Phase 12: Haku & korttilistaus etusivulle - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 integrates real-time venue search and a scrollable card listing directly into the existing `Etusivu.tsx` homepage component — and completely removes the separate `/?nakyma=lista` route, its redirect, and the `LiikuntapaikatLista` component. After this phase, there is exactly one homepage view: the map with an optional full-screen search overlay.

</domain>

<decisions>
## Implementation Decisions

### Hakupaneelin layout
- **D-01:** Search panel is a **full-screen glass overlay** (`.glass`, partially translucent) rendered over the map. Search field at the top, scrollable `PaikkaKortti` card list below. Activated by a Search icon added inside the existing left toolbar pill (alongside `SlidersHorizontal`).
- **D-02:** Panel opens with **fade-in (opacity 0→1)** animation — no slide/y movement. Closes with fade-out via `AnimatePresence`.
- **D-03:** Panel is closed by an **X button inside the panel** (not by toggling the search icon again).
- **D-04:** The search panel includes **city and sport filters** alongside the search field — same filter dimensions as the current left toolbar.

### Tyhjä hakutila
- **D-05:** When the search panel opens with an **empty query**, all filter-matching venues are shown immediately in the card list — no placeholder state. The list always has content (unless filters produce zero results).
- **D-06:** Each card in the list is an **individual `PaikkaKortti` instance** in a scrollable list — not an aggregated widget. Distance is shown on each card if GPS coords are available.

### Bottom sheet yhteistoiminta
- **D-07:** Bottom sheet and search panel **cannot be open simultaneously**. When the search icon is tapped while the bottom sheet is `'open'`, the bottom sheet collapses first (slides to `'closed'` state) and the search panel fades in.
- **D-08:** When the search panel is closed via X, the bottom sheet **stays closed** — the user sees the map only. Bottom sheet is not auto-restored.

### Vanhan reitin käsittely
- **D-09:** `/?nakyma=lista` is removed via a **301 permanent redirect in `next.config.ts`**: `/?nakyma=lista → /`. This is the authoritative redirect — `app/page.tsx` routing branch for `nakyma === 'lista'` is also removed.
- **D-10:** `LiikuntapaikatLista` component (`app/components/LiikuntapaikatLista.tsx`) is **deleted entirely**. Its filtering logic (`hakuteksti`, `aktiivinen`, `useMemo`) is migrated into `Etusivu.tsx` (or a dedicated hook if Etusivu grows too large).

### Claude's Discretion
- State shape for search open/closed: `useState<boolean>` or extension of `sheetPhase` — Claude chooses whichever is cleaner given the bottom sheet coordination requirement.
- Exact z-index layering for the search overlay (must be above map at z-50 and toolbar at z-64).
- Scroll container implementation for the card list (height calculation, overflow-y).
- Animation duration/easing for fade in/out — follow CLAUDE.md animation principles (view transitions: `duration: 0.2`, opacity only).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & constraints
- `CLAUDE.md` — glassmorphism utilities (`.glass`, `.glass-btn`, `.glass-nav`), animation principles (Emil Kowalski style, no spring unless drag), color system, Finnish UI vocabulary

### Requirements
- `.planning/REQUIREMENTS.md` §UI-09, §UI-10 — exact requirement text for search icon and card listing
- `.planning/ROADMAP.md` §Phase 12 — success criteria (all 4 must be true)

### Key files to modify
- `app/components/Etusivu.tsx` — sheetPhase state machine, left toolbar structure, existing filter/state pattern; new search state + overlay goes here
- `app/components/LiikuntapaikatLista.tsx` — filtering logic (hakuteksti, aktiivinen, hintaValinta useMemo) to migrate; then DELETE this file
- `app/components/PaikkaKortti.tsx` — reuse directly in the card list (no changes expected)
- `app/page.tsx` — remove `nakyma === 'lista'` routing branch; remove `LiikuntapaikatLista` import
- `next.config.ts` — add redirects entry for `/?nakyma=lista → /`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaikkaKortti.tsx` (~115 lines): fully functional venue card with sport badge, name, price, open status, distance, CTA. Reuse directly in the card list — no changes expected.
- `LiikuntapaikatLista.tsx` filtering logic: `hakuteksti` (text search via `useMemo`), `aktiivinen` (sport filter), `hintaValinta` (price filter) — migrate this into `Etusivu.tsx` then delete the component.
- `Search` icon already imported in `Etusivu.tsx` line 7 (from lucide-react) — not yet in the toolbar.

### Established Patterns
- **sheetPhase state machine** (`'open' | 'sliding' | 'closed'`): bottom sheet coordination lives here. New search open/close state must coordinate — when search opens, set sheetPhase to `'sliding'` → `'closed'`.
- **anyOverlayOpen + backdrop div** at z-63: existing pattern for `leftOpen`, `rightOpen`, `filterOpen` overlays — new search overlay follows same dismiss-on-backdrop-click pattern.
- **Left toolbar pill** (`glass rounded-full`, z-64, `motion.div layout`): add Search icon button inside this pill alongside `SlidersHorizontal`. Pill already expands with `AnimatePresence` for filter content.
- **In-memory filtering via `useMemo`**: all filter logic runs client-side, no server refetch. SSR data from `app/page.tsx` is passed as `paikat` prop — same approach in the search panel.
- **Finnish UI strings**: search placeholder = `"Hae liikuntapaikkaa..."` (already in CONVENTIONS.md vocabulary).

### Integration Points
- `app/page.tsx`: currently `if (searchParams.nakyma === 'lista') return <LiikuntapaikatLista paikat={data} />` — this branch and import are removed.
- `next.config.ts`: add `redirects()` async function returning `[{ source: '/', has: [{ type: 'query', key: 'nakyma', value: 'lista' }], destination: '/', permanent: true }]`.
- `Etusivu.tsx`: add `searchOpen` state (or equivalent), new full-screen overlay panel component/section, move filtering logic from `LiikuntapaikatLista`.

</code_context>

<specifics>
## Specific Ideas

- Search panel uses `.glass` utility — partially translucent, consistent with existing cards and toolbar widgets
- Cards in search panel list are the same `PaikkaKortti` components used elsewhere — no new card variant for this phase (new diagonal card model is Phase 13)
- When bottom sheet is `'open'` and user taps Search: trigger `setSheetPhase('sliding')` first, then after sheet closes (or on same tick), set `searchOpen(true)` — sheet and search never overlap
- Fade animation follows CLAUDE.md view transition rule: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}` with `duration: 0.2`

</specifics>

<deferred>
## Deferred Ideas

- Diagonaalinen korttimalli hakukorttipaneelissa — tämä on Phase 13 scope; Phase 12 käyttää nykyistä `PaikkaKortti`-komponenttia
- Etäisyyspohjainen lajittelu korttilistassa — v1.3
- Hakutulosten lajittelu (hinta, aukiolo jne.) — v1.3

</deferred>

---

*Phase: 12-haku-korttilistaus*
*Context gathered: 2026-05-27*
