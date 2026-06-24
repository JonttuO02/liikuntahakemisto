# Phase 58: Admin-sijaintikartta - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase originally targeted ADMIN-06 (operator can't access `/admin`) and QA-01 (verify approved venue locations render correctly on the customer map). Both were resolved/dropped during discussion (see Decisions below). The phase now delivers a single new capability: **a read-only venue-location map on the admin application detail page** (`app/admin/[id]/page.tsx`), so the admin can visually verify a venue's pin position before approving/rejecting it.

</domain>

<decisions>
## Implementation Decisions

### Dropped requirements (do not re-investigate)
- **D-01:** ADMIN-06 dropped. Operator (joona.orava@gmail.com) re-tested `/admin` and it now loads normally — bug is not currently reproducible. No root-cause investigation or fix needed this phase. REQUIREMENTS.md and ROADMAP.md updated to reflect this (struck through, marked "Dropped 2026-06-24").
- **D-02:** QA-01 dropped. Operator manually verified that admin-approved venues display at the correct position on the customer-facing map (main `/` map) — no issue found. No regression test or fix needed this phase.

### New scope: ADMIN-07 — venue-location map on admin detail page
- **D-03:** Add a new "Sijainti" section to `app/admin/[id]/page.tsx`, alongside the existing Listakortti / Diagonaalikortti / Profiilisivu preview sections (same `SectionLabel` pattern, same `glass rounded-2xl` container style used elsewhere on that page).
- **D-04:** The map must reuse the same visual primitives as the main site map: `@vis.gl/react-google-maps` `Map` + `AdvancedMarker`, `SportPin` component for the pin, `CalloutCard` component for the info popup. `APIProvider` is already available app-wide via `MapProvider` in `app/layout.tsx` — no new provider needed.
- **D-05:** The map shows only the one venue being reviewed (no clustering, no other pins).
- **D-06:** Map must be zoomable/pannable (standard Google Maps interaction) — not a static image.
- **D-07:** Initial view: centered on the venue's `latitude`/`longitude`, fixed close zoom (~15, street-level). No auto-fit-bounds logic needed since there's only one pin.
- **D-08:** Click behavior: clicking the pin shows the `CalloutCard` popup (same as the main map), but the CalloutCard itself does nothing on click — it must NOT open `PaikkaSheet` or navigate anywhere. This differs from `Etusivu.tsx`, where the `AdvancedMarker`'s `onClick` opens the bottom sheet (`app/components/Etusivu.tsx:911`) — that onClick handler must be omitted/no-op'd in this read-only context.
- **D-09:** Map container sizing: match `SijaintiPicker.tsx`'s style — 320px height, `rounded-2xl`, bordered (`border border-[rgba(0,0,0,0.07)]`), `overflow-hidden`. Width fits the page's `max-w-2xl` column.
- **D-10:** No null-coordinate fallback needed. Confirmed: `liikuntapaikat.latitude`/`longitude` are populated for every venue going through the create flow (`app/api/business/create-paikka/route.ts` requires both — see D-11). Do not build placeholder/fallback UI for missing coordinates.

### Claude's Discretion
- Exact component name/file structure for the new map section (e.g. whether to extract a small `AdminVenueMap` component or inline it in `app/admin/[id]/page.tsx`) is left to the planner/executor.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Admin detail page (where the new map goes)
- `app/admin/[id]/page.tsx` — existing admin application detail page; preview sections pattern (`SectionLabel`, `glass rounded-2xl` containers) to match for the new "Sijainti" section
- `app/api/admin/applications/[id]/route.ts` — confirms what venue data (incl. `latitude`/`longitude`) is already returned to this page

### Map primitives to reuse
- `app/components/Etusivu.tsx` (lines ~853-993) — reference implementation of `Map` + `AdvancedMarker` + `SportPin` + `CalloutCard`, including the `onClick` pattern on `AdvancedMarker` that opens the sheet (line 911) — must be omitted for the read-only admin map
- `app/components/SportPin.tsx` — pin component to reuse as-is
- `app/components/CalloutCard.tsx` — popup component to reuse as-is
- `app/components/MapProvider.tsx` + `app/layout.tsx` — confirms `APIProvider` is already mounted app-wide; no new provider setup needed
- `app/components/SijaintiPicker.tsx` — reference for map container sizing/styling (320px height, rounded-2xl, bordered) to match

### Data model
- `lib/types.ts` — `Liikuntapaikka.latitude`/`longitude: number | null` (nullable in the type, but confirmed always populated via the create flow)
- `app/api/business/create-paikka/route.ts` — confirms `latitude`/`longitude` are required (validated, non-null) at venue creation time

No external specs/ADRs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SportPin`, `CalloutCard`, `Map`/`AdvancedMarker` from `@vis.gl/react-google-maps` — all directly reusable, no new dependencies
- `APIProvider` already mounted globally via `MapProvider` in `app/layout.tsx` — the new map just needs to render inside it, which it will automatically since it's a descendant

### Established Patterns
- Admin detail page already follows a "SectionLabel + glass card per preview type" layout (`Listakortti`, `Diagonaalikortti`, `Profiilisivu`) — the new "Sijainti" section should follow the same visual pattern
- `Etusivu.tsx` puts the sheet-opening `onClick` on the `AdvancedMarker` wrapper (not inside `CalloutCard` itself) — confirms the read-only version just needs to drop that one handler, not modify `CalloutCard`

### Integration Points
- New section slots into `app/admin/[id]/page.tsx`'s existing JSX between the "Toiminnot" (approve/reject) block and the "Listakortti" preview section, per discussion (D-03 placement: alongside the other preview sections)

</code_context>

<specifics>
## Specific Ideas

User's own framing of the feature: "Add a map object that shows only that one venue on the map. The map should be zoomable etc. And has the same custompin as in the mainpage. It should work the same as the mainpage map, except clicking the calloutcard doesn't open anything."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (the scope itself was renegotiated with the user, see Decisions).

</deferred>

---

*Phase: 58-admin-p-sy-kartta-qa*
*Context gathered: 2026-06-24*
