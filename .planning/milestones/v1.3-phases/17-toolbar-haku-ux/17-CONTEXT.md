# Phase 17: Toolbar & Haku-UX — Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the two separate toolbar buttons (SlidersHorizontal filter + Search) with one unified search+filter button and one dedicated list-toggle button. Merge the parallel map pin filter (`aktiivinen`) and card list filter (`searchLaji`) into a single unified filter state. Both new buttons live in the existing left toolbar glass pill. No new routes or overlays — the existing search overlay is reused for both modes.

</domain>

<decisions>
## Implementation Decisions

### List Toggle Behavior (UI-18)
- **D-01:** The list toggle button opens the existing search overlay (`searchOpen = true`) WITHOUT auto-focusing the search input. Search input is visible but not highlighted.
- **D-02:** The search+filter button opens the same overlay WITH `autoFocus` on the search input, signaling "type to search".
- **D-03:** Both buttons are true toggles — tapping again when the overlay is already open closes it (`setSearchOpen(false)`).

### Map Filter Unification (UI-17)
- **D-04:** The `aktiivinen` map pin filter and `searchLaji` card list filter are merged into one unified filter state. The `paikatKartalla` computation (pins shown on map) must use the same filter state as the search overlay card list.
- **D-05:** The unified filter persists when the overlay is closed — the map remains filtered to the selected sport until explicitly cleared.
- **D-06:** `aktiivinen` state is removed entirely. `searchLaji` (or a renamed unified variable, e.g., `aktiviinenLaji`) drives both map pins and card list results.

### Toolbar Layout
- **D-07:** The left toolbar glass pill is simplified to exactly two icon buttons: [Search icon] for unified search+filter, [List icon] for list toggle. No text labels, no expansion.
- **D-08:** `leftOpen`, `filterOpen`, and the sport filter dropdown that appeared below the pill are removed. Sport filter lives only inside the search overlay.
- **D-09:** `SlidersHorizontal` button removed; `leftOpen`, `filterOpen`, `aktiivinen` states removed. `suodatettu` useMemo (which was derived from `aktiivinen`) is also removed or merged.
- **D-10:** The "Haku" shortcut link inside the right toolbar's MoreHorizontal expansion (`rightOpen`) is removed — it duplicates the new unified search+filter button.
- **D-11:** Filter-active state: when a sport filter or other filter (price, auki, city) is active, the Search icon button gets a subtle active visual — e.g., a small filled dot below the icon, or the icon fills `#111111` instead of muted `rgba(17,17,17,0.7)`.

### Claude's Discretion
- Exact lucide-react icon for list toggle (`LayoutList` or `List` — pick whichever looks cleaner at 16px in the glass pill).
- Active state styling for both buttons when the overlay is open (e.g., icon goes full `#111111`, or a subtle filled/underline indicator).
- Whether the filter-active indicator is a dot, a badge, or simply full-opacity icon color — keep it subtle and consistent with the glassmorphism design system.
- Whether to rename `searchLaji` to `aktiviinenLaji` or keep the name — either is fine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary Implementation File
- `app/components/Etusivu.tsx` — the full current implementation. All states to modify/remove are here:
  - `aktiivinen` (line 101), `leftOpen` (line 105), `filterOpen` (line 106) → to be removed
  - `searchOpen` (line 118), `searchLaji` (line 120) → to be extended/unified
  - `suodatettu` useMemo (line 301) → driven by `aktiivinen`, to be replaced
  - `paikatKartalla` useMemo (line 311) → currently uses `suodatettu`, must use unified filter
  - Left toolbar (lines 451–547): replace two-button pill with simpler two-icon pill
  - Right toolbar (lines 549–634): remove "Haku" link from `rightOpen` expansion
  - Search input `autoFocus` attribute (line 765): conditionally based on open mode

### Requirements
- `.planning/REQUIREMENTS.md` §UI-17, UI-18 — the two requirements with acceptance criteria.

### Design System
- `app/globals.css` — `.glass`, `.glass-btn` classes (pill and icon button surfaces).
- `CLAUDE.md` §Color System — `rgba(17,17,17,0.7)` for inactive icons, `#111111` for active.
- `CLAUDE.md` §Animation Principles — hover `duration: 0.18` easeOut; no spring unless drag.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `searchOpen` state — already controls the full search overlay (search input + filter pills + card list). Reuse for both "search mode" (autoFocus) and "list mode" (no autoFocus).
- `searchSuodatettu` useMemo — the filtered card list results. Already uses `searchLaji`, `searchHaku`, `searchHinta`, `searchAukinyt`, `searchKaupunki`. Stays as-is; `searchLaji` now also drives map pins.
- Left toolbar glass pill pattern (`Etusivu.tsx:460–547`): `motion.div layout` + `glass rounded-full` + icon buttons. Simplify in-place — remove AnimatePresence expansion, keep the outer pill with two icon buttons.
- `toggleSearch()` function (line 165): currently sets `searchOpen`, clears `valittu`, slides sheet. Adapt to accept a `focused: boolean` parameter (or split into two functions).

### States to Remove
- `aktiivinen` / `setAktiivinen` — replaced by unified `searchLaji`
- `leftOpen` / `setLeftOpen` — the toolbar expansion state; removed
- `filterOpen` / `setFilterOpen` — the sport dropdown below the toolbar; removed
- `suodatettu` useMemo — was `paikat.filter(aktiivinen)`, no longer needed

### Integration Points
- `paikatKartalla` (line 311): currently filters via `suodatettu` (which used `aktiivinen`). After merge, it should filter using `searchLaji` directly:
  ```ts
  paikat.filter(p =>
    (searchLaji === 'Kaikki' || p.laji.toLowerCase() === searchLaji.toLowerCase())
    && p.latitude != null && p.longitude != null
    && lajitKartalla.has(p.laji.toLowerCase())
  )
  ```
- `closeOverlays()` (line 159): currently closes `leftOpen`, `rightOpen`, `filterOpen`. Remove `leftOpen`/`filterOpen` from it.
- Right toolbar expansion content (lines 575–631): remove the "Haku" button block (lines 575–581).

### Established Patterns
- Glass pill toolbar buttons: `w-10 h-10 flex items-center justify-center text-[rgba(17,17,17,0.7)] hover:text-[#111111] [transition:color_150ms_ease]`
- `motion.div layout` on pill for smooth width changes — keep but expansion is now instant (no expand/collapse, so `layout` may not be needed anymore).
- `whileTap={{ scale: 0.95 }}` on icon buttons for tap feedback.

</code_context>

<specifics>
## Specific Ideas

- `autoFocus` on the search input (`Etusivu.tsx:765`) should be conditional: `autoFocus={searchFocused}` where `searchFocused` is a new boolean state set to `true` by the search+filter button and `false` by the list button. Or: extract to a separate state rather than re-using `autoFocus` prop toggle.
- The list icon (`LayoutList` from lucide-react) communicates "view as list" clearly. `Search` icon stays for the unified search+filter button — it already has the right mental model for "open the search panel".
- Both buttons in the pill with a thin divider between them (`div className="w-px h-4 bg-[rgba(0,0,0,0.1)]"`) — existing pattern from Phase 12 toolbar.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-Toolbar & Haku-UX*
*Context gathered: 2026-05-29*
