# Phase 4: Service Information UI - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface `aukioloajat` and `hinta_kuvaus` data on venue cards and the profile page. Delivers: "Auki nyt"/"Suljettu" badge with today's hours on every card, a "Kertakäynti OK" drop-in indicator, an "Auki nyt" filter row in the list view, and grouped weekly hours + full pricing description on the venue profile page.

No new backend routes, no schema changes, no data ingestion — Phase 3 already populated the DB. This phase is entirely UI.

</domain>

<decisions>
## Implementation Decisions

### Card — Opening Hours Display
- **D-01:** Show badge + today's time range together: `"Auki nyt · 09:00–21:00"` (green) or `"Suljettu"` (gray). Not badge-only, not text-only.
- **D-02:** Hours row is placed **below the venue name, above the address row**. Reading order: sport badge → name → open status → where → price/CTA.
- **D-03:** When `aukioloajat` is null, render an `"Aukioloajat lisätään pian"` placeholder in the same position — consistent with the existing `"Lisätään pian"` price fallback pattern.

### Card — Drop-in Indicator
- **D-04:** Detect drop-in eligibility from `hinta_kuvaus` text — case-insensitive match for `"kertakäynti"`. No new DB column required; all seeded venues that allow drop-in already use this word in their price text.
- **D-05 (Claude's Discretion):** Visual treatment of the "Kertakäynti OK" badge — planner chooses placement and style based on card layout constraints. Keep it unobtrusive; the open/closed badge is the primary status signal.

### Card — Pricing
- **D-06:** Replace `hintateksti(hinta_min, hinta_max)` with `hinta_kuvaus` on the card. When `hinta_kuvaus` is null, fall back to `hintateksti()` as before; if both are null, keep the `"Lisätään pian"` placeholder. This applies to **both cards and the profile page**.

### Open Now Filter
- **D-07:** "Auki nyt" filter lives in its own **dedicated row above the card grid**, separate from the sport filter pills. It is a toggle (on/off), not a pill in the sport row.
- **D-08:** When the filter is active, venues with no `aukioloajat` data remain **visible** but show an `"Aukioloajat tuntematon"` note rather than being hidden. Lenient mode — avoids hiding real venues that may be open.

### Profile Page — Weekly Hours
- **D-09:** Display hours in **grouped ranges**: consecutive days with identical hours are collapsed (e.g., `"Ma–Pe 06:00–22:00, La 09:00–18:00, Su suljettu"`). Finnish day abbreviations: Ma, Ti, Ke, To, Pe, La, Su. Today's group is visually highlighted (bold or accent color).
- **D-10:** Hours appear as a new `Row` entry in the existing profile card layout, using the existing `<Clock>` or similar Lucide icon.

### Profile Page — Pricing
- **D-06 (continued):** `hinta_kuvaus` replaces `hintateksti(hinta_min, hinta_max)` on the profile page too. Render as plain text in the existing `Row` pattern — no parsing needed. Fallback to `hintateksti()` when null.

### Claude's Discretion
- "Kertakäynti OK" badge visual treatment (D-05) — planner chooses placement.
- Exact Lucide icon for the hours row on the profile page.
- Exact Tailwind classes for open (green) vs. closed (gray) badge styling — should follow the `glass` + accent color system already in `PaikkaKortti.tsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Component files to modify
- `app/components/PaikkaKortti.tsx` — card component; adds hours badge row (D-01–D-03), drop-in badge (D-04–D-05), and hinta_kuvaus price (D-06)
- `app/paikat/[id]/page.tsx` — profile page; adds grouped hours Row (D-09–D-10) and hinta_kuvaus price (D-06)
- `app/components/LiikuntapaikatLista.tsx` — list view; adds "Auki nyt" filter toggle row (D-07–D-08)

### Types and utilities
- `lib/types.ts` — `Liikuntapaikka` type; `aukioloajat: Record<string, {open, close}> | null`, `hinta_kuvaus?: string | null`
- `lib/utils.ts` — `hintateksti()` fallback utility
- `lib/lajit.ts` — sport config (colors, labels); do not inline sport colors

### Design system
- `CLAUDE.md` (Design Guidelines section) — card structure, typography, animation principles, color tokens; MUST follow
- `app/globals.css` — `glass` and `glass-hover` utility classes used by both PaikkaKortti and profile page

### Data shape (from Phase 3)
- `.planning/phases/03-data-enrichment/03-CONTEXT.md` — `aukioloajat` JSON format (`monday`/`tuesday`/… keys, `"HH:MM"` strings); `hinta_kuvaus` sample values for the top 20 venues

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaikkaKortti.tsx` — existing card with `glass glass-hover` shell, sport badge, address row, bottom CTA strip. The hours/drop-in rows insert into the existing flex-col structure.
- `Row` component in `app/paikat/[id]/page.tsx` — icon + label + children pattern; reuse for hours and pricing rows on profile page.
- `hintateksti()` in `lib/utils.ts` — keep as fallback when `hinta_kuvaus` is null.
- `lajiKonfig` colors — already used for sport badges; open/closed badge should use its own green/gray tokens, not sport colors.

### Established Patterns
- Placeholder text pattern: `"Lisätään pian"` in `text-xs text-[rgba(17,17,17,0.35)]` — use the same for `"Aukioloajat lisätään pian"` (D-03).
- Filter state in `LiikuntapaikatLista` is `useState` booleans — add `aukinyt: boolean` alongside existing sport/price/text filters.
- All filtering runs in-memory via `useMemo` — the "Auki nyt" filter derives open status from `aukioloajat` + current time client-side; no server refetch.
- `aukioloajat` keys are English lowercase day names (`monday`, `tuesday`, …); map to Finnish abbreviations (Ma, Ti, Ke, To, Pe, La, Su) in display logic.

### Integration Points
- `app/page.tsx` fetches all venues via `supabase.from('liikuntapaikat').select('*')` — already includes `aukioloajat` and `hinta_kuvaus` columns (schema exists since Phase 1). No server-side changes needed.
- Open status computed client-side: get current day name (Sunday=0…Saturday=6 → English day key), compare current time against `open`/`close` strings.

</code_context>

<specifics>
## Specific Ideas

- Badge wording: `"Auki nyt"` (green) and `"Suljettu"` (gray) — these exact Finnish strings, not translated.
- Placeholder wording: `"Aukioloajat lisätään pian"` — mirrors existing `"Lisätään pian"` price placeholder.
- Hours badge format on card: `"Auki nyt · 09:00–21:00"` (middle dot separator, en-dash for range).
- Profile hours: grouped Finnish abbreviations `Ma–Pe`, `La`, `Su`; closed day shows `"suljettu"`.
- Drop-in detection: `hinta_kuvaus?.toLowerCase().includes('kertakäynti')`.
- "Auki nyt" filter: separate row, toggle only — no "Suljettu" filter needed.
- Lenient filter (D-08): venues without hours show `"Aukioloajat tuntematon"` note, remain visible when filter is on.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-service-information-ui*
*Context gathered: 2026-05-21*
