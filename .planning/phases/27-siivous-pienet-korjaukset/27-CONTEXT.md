# Phase 27: Siivous & pienet korjaukset — Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Cleanup pass for v1.6: remove dead routes and nav links, fix filter pill ghost element and background, eliminate unwanted search text, add card list fade, fix map cluster zoom behavior, and fix sheet open timing. No new features — every task either removes something or fixes an existing regression.

</domain>

<decisions>
## Implementation Decisions

### NAV-06 — Remove /suosikit route
- **D-01:** Delete `app/suosikit/page.tsx` and `app/suosikit/SuosikitClient.tsx` entirely.
- **D-02:** Remove `/suosikit` nav links from `app/components/NavBar.tsx` (the link with `href="/suosikit"` and "TO DO" text) and `app/components/NavPill.tsx` (the `<Link href="/suosikit">TO DO</Link>` block around line 70).
- **D-03:** Supabase `suosikit` table queries in `app/components/Etusivu.tsx` STAY — they power the TODO overlay feature and are unrelated to the /suosikit page.

### NAV-07 — Remove TODO toolbar link
- **D-04:** The "TO DO" link in the hamburger/nav toolbar (NavBar.tsx + NavPill.tsx) is removed as part of D-02 above — NAV-06 and NAV-07 overlap here.
- **D-05:** The fixed right-side bookmark button in Etusivu.tsx (comment: `TodoButton — fixed below nav-pill, right side`, around line 1384) STAYS — it opens the TODO overlay and is not the toolbar link.

### FILTER-04 — Pill background
- **D-06:** The `.glass` class is already removed from the filter pill. Add `rgba(0,0,0,0.04)` as background directly on the pill container. No other background changes.

### FILTER-05 — Ghost element fix
- **D-07:** Symptom: the pill (or a hidden search input inside it) occupies touch area even when search is closed, blocking map interactions below.
- **D-08:** Fix: add `pointer-events: none` to the hidden search input / its wrapper when search is not active. The element can remain in the DOM — no conditional rendering needed.

### SEARCH-01 — Remove search text elements
- **D-09:** Remove the "Ei tuloksia" element (Etusivu.tsx ~line 1620) and the "Tyhjennä haku" element (~line 1630) entirely. These elements should not appear in any search state.

### UI-24 — Card list fade
- **D-10:** Implement as a `position: absolute` gradient overlay div at the bottom of the card list scroll container.
- **D-11:** Gradient direction: transparent (top) → sheet background color (bottom). Match the exact background of the scroll container, not hardcoded white.

### MAP-16 — Cluster zoom behavior (CHANGED from original)
- **D-12:** All cluster clicks → zoom in. Use `sc.getExpansionZoom(clusterId)` for the target zoom level, then `map.setZoom(level)` + `map.panTo(cluster center)`.
- **D-13:** Remove the `expandedCluster` popup state and all related JSX entirely — no popup list for any cluster type.
- **D-14:** Same-coordinate venues become accessible as individual pins after zooming to max zoom level (existing single-pin tap behavior handles them).

### SHEET-04 — Remove browser link
- **D-15:** Remove the "Avaa paikkasivu selaimessa" link from `app/components/PaikkaSheet.tsx`. No replacement.

### SHEET-05 — Sheet max height
- **D-16:** Reduce the sheet's maximum open height so the fixed TODO button (positioned at `top: calc(max(12px, env(safe-area-inset-top)) + 48px)`, right: 16) is not covered by the sheet when fully open.

### SHEET-06 — Sheet opening delay
- **D-17:** Investigate and fix whatever causes the delay when a small card (CalloutCard / pin popup) is tapped — trace the click handler path from pin tap to sheet open (`setValittu` → `sheetPhase` state update → animation start) and identify the bottleneck (setTimeout, state batching, or animation duration).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — v1.6 requirements; Phase 27 scope: NAV-06, NAV-07, FILTER-04, FILTER-05, SEARCH-01, UI-24, MAP-16, SHEET-04, SHEET-05, SHEET-06

### Design system
- `CLAUDE.md` — Color system, animation principles, component conventions (the authoritative design reference)
- `app/globals.css` — `.glass`, `.glass-btn` utility class definitions

### Key implementation files
- `app/components/Etusivu.tsx` — Main component; contains FilterCarouselPill, TODO button, cluster handling, search elements, card list, sheet
- `app/components/PaikkaSheet.tsx` — Sheet component; contains the "Avaa paikkasivu selaimessa" link (SHEET-04)
- `app/components/NavBar.tsx` — Contains `/suosikit` nav link (line ~91)
- `app/components/NavPill.tsx` — Contains `/suosikit` nav link (line ~70)
- `app/suosikit/page.tsx` — Route to delete (NAV-06)
- `app/suosikit/SuosikitClient.tsx` — Component to delete (NAV-06)

### No external specs
No external ADRs or SPECs beyond requirements listed above — all decisions captured here.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Supercluster` (already imported in Etusivu.tsx): `sc.getExpansionZoom(clusterId)` available for MAP-16 zoom target
- `useMap()` hook (Google Maps): provides `map.setZoom()` and `map.panTo()` for MAP-16
- `expandedCluster` state + popup JSX (Etusivu.tsx ~lines 1060–1120): DELETE entirely as part of MAP-16

### Established Patterns
- `pointer-events-none` Tailwind class used on several elements in Etusivu.tsx — consistent with the FILTER-05 fix approach
- Sheet position controlled via `contentH` and inline `style={{ position: 'fixed', bottom: 0, height: contentH }}` at line ~1438 — this is the lever for SHEET-05
- Card list scroll container uses `overflow-y: auto` — the UI-24 fade overlay should be placed as a sibling, positioned absolutely

### Integration Points
- MAP-16 cluster click handler (Etusivu.tsx ~line 1070): replace `setExpandedCluster()` call with `map.setZoom(sc.getExpansionZoom(clusterId))` + `map.panTo()`
- FILTER-04/05: FilterCarouselPill renders inside Etusivu.tsx around line 1538+
- "Ei tuloksia" ~line 1620 and "Tyhjennä haku" ~line 1630 are inside the search results section of Etusivu.tsx

</code_context>

<specifics>
## Specific Ideas

- MAP-16: User explicitly requested that the popup-list behavior be removed for ALL clusters (including same-coordinate ones). Same-location venues rely on individual pin selection after zooming — no special list popup.
- NAV-06/07: The Supabase `suosikit` table name in Etusivu.tsx database queries is NOT to be changed — it's the bookmark/TODO data store, not the page.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 27-Siivous & pienet korjaukset*
*Context gathered: 2026-06-03*
