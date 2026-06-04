# Phase 29: Kortit & sheet redesign — Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual redesign of three components:
1. **PaikkaSheet** — replace the current text-only header with a 16:9 hero image carousel (3 placeholder slides + dot indicators), venue name + address as dark-gradient overlay at the bottom of the image, floating drag handle + close/bookmark buttons, pricing section below hero, and review widget collapsed by default.
2. **PaikkaKortti** — add a marquee-style auto-scrolling price carousel at the bottom of the card (splits `hinta_kuvaus` by `\n`, shows as plain scrolling text; static when only 1 line).
3. **DiagonaalKortti** — replace sport-icon/color right panel with a gray+camera placeholder; add a 40×40px logo placeholder in the top-left of the left panel next to the sport pill.

No new data sources, no new routes, no real images — all image slots are placeholders in v1.6.

</domain>

<decisions>
## Implementation Decisions

### PaikkaSheet — Hero section (SHEET-01)

- **D-01:** Hero is a 16:9 aspect ratio image area (`aspect-video` or `aspect-[16/9]`), full sheet width, at the very top of the sheet (no content above it except the floating controls).
- **D-02:** Drag handle floats at the very top of the hero image (visually over the image, centered).
- **D-03:** Close button and bookmark button are floating glass-btn chips in the top-right corner of the hero image — same glass-btn style as current but absolutely positioned over the image.
- **D-04:** Venue name and address render at the **bottom of the hero image** with a dark-to-transparent gradient overlay (`linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)`). White text.
- **D-05:** Sport badge pill is **removed** from PaikkaSheet entirely — not moved elsewhere.
- **D-06:** 3 placeholder slides in the carousel. Each placeholder: gray background (`rgba(0,0,0,0.08)`) + centered camera icon (Lucide `Camera`, size 32, `text-[rgba(255,255,255,0.4)]`).
- **D-07:** Dot indicators (3 dots) centered below the carousel area, outside the image (not overlapping). Active dot = `bg-[#111111]`, inactive = `bg-[rgba(0,0,0,0.15)]`.
- **D-08:** Carousel scroll is user-draggable (overflow-x scroll with snap, or Framer drag). No auto-advance.

### PaikkaSheet — Pricing section (SHEET-02)

- **D-09:** Pricing section appears immediately below the hero (and dot indicators) as a `SheetRow` — same icon+label+content pattern as the existing `SheetRow` component (`CircleDollarSign` icon, label "Hinta").
- **D-10:** Content inside the pricing SheetRow is unchanged from current — `hinta_kuvaus` as paragraph text, or `priceDisplay` as serif bold text.

### PaikkaSheet — Review widget (SHEET-03)

- **D-11:** `ReviewSection` is wrapped in a collapsible widget. Default state: **collapsed**.
- **D-12:** Collapsed state shows a single tappable row: star average (filled/empty stars) + review count text (e.g. "4.2 · 12 arvostelua") + chevron-down icon. Uses the existing `avgRating` and `reviewCount` props already passed to ReviewSection.
- **D-13:** When `reviewCount === 0`: show static row "☆ Ei arvosteluja" with **no chevron** and no tap action.
- **D-14:** Expand animation: `AnimatePresence` with `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: 'auto', opacity: 1 }}` on a wrapper div. Duration `0.25s`, ease `[0.25, 0.1, 0.25, 1]`.
- **D-15:** The collapsed header row lives inside `PaikkaSheet.tsx` as a local widget — **not** inside `ReviewSection.tsx` (which stays a pure review list + form). The collapsible wrapper is new code in PaikkaSheet.

### PaikkaKortti — Price carousel (UI-25)

- **D-16:** Price carousel appears at the **bottom of the card**, below the existing price block (which is removed/replaced) and **above** the "Näytä tiedot" / distance bottom row — or replaces the current price block position entirely. The bottom row (CTA + distance) stays at the very bottom.
- **D-17:** Content: split `hinta_kuvaus` on `\n`. Each non-empty line is one item in the marquee.
- **D-18:** If `hinta_kuvaus` has only 1 non-empty line, or is null, or `membershipOnly` is true: **no marquee** — render the existing static price text as before (no animation, no carousel). The marquee only activates when 2+ lines exist.
- **D-19:** Marquee style: plain text items separated by a `·` bullet, scrolling left continuously. No pill borders. CSS `@keyframes marquee` or Framer `animate={{ x }}` loop. Speed: ~40px/s so it's readable.
- **D-20:** The marquee row is visually separated from the card content above it — a thin `border-t border-[rgba(0,0,0,0.07)]` before it, same as the existing bottom row separator.

### DiagonaalKortti — Placeholders (UI-26, UI-27)

- **D-21:** Logo placeholder: a `40×40px` rounded rectangle (`rounded-lg`) with `bg-[rgba(0,0,0,0.06)]` background + centered Lucide `Building2` icon (size 20, `text-[rgba(0,0,0,0.25)]`). Positioned in the top-left of the left panel.
- **D-22:** Logo placeholder sits **to the left of the sport pill** in the same top row. The badge row becomes: `[logo box] [sport pill]` side-by-side, aligned to the top of the left panel.
- **D-23:** Right panel (UI-27): replace the `style={{ backgroundColor: laji.color }}` fallback div with a gray placeholder (`bg-[rgba(0,0,0,0.06)]`) + centered Lucide `Camera` icon (size 24, `text-[rgba(0,0,0,0.2)]`). The existing `paikka.image_url` real-image branch stays — placeholder only shows when there's no image.
- **D-24:** The `hidden={!!paikka.image_url}` pattern on the fallback div stays; only the visual style of the fallback changes from sport-color to gray+camera.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — v1.6 requirements; Phase 29 scope: UI-25, UI-26, UI-27, SHEET-01, SHEET-02, SHEET-03

### Design system
- `CLAUDE.md` — Color system, animation principles, component conventions (authoritative)
- `app/globals.css` — `.glass`, `.glass-btn` utility class definitions

### Key implementation files
- `app/components/PaikkaSheet.tsx` — Full sheet component to redesign; contains SheetRow helper, ReviewSection integration
- `app/components/PaikkaKortti.tsx` — Small card; price block (~lines 115–130) to be replaced/extended with marquee
- `app/components/DiagonaalKortti.tsx` — Diagonal card; right panel (~lines 94–122) and badge row (~line 57) to update
- `app/components/ReviewSection.tsx` — Pure review list + form; stays unchanged; wrapped in collapsible from PaikkaSheet
- `lib/types.ts` — `Liikuntapaikka` type; no new fields needed for placeholders

### No external specs
No external ADRs or SPECs beyond requirements listed above — all decisions captured here.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SheetRow` component (PaikkaSheet.tsx:197–209): icon+label+content row pattern — pricing section reuses this directly
- `glass-btn` class: close/bookmark buttons in hero floating controls
- `SportIcon` from `lib/sportIcons` (already in DiagonaalKortti): stays in left panel badge
- Lucide `Camera` icon: not yet imported in these components — import needed for placeholders
- Lucide `Building2` icon: not yet imported — import needed for logo placeholder
- Lucide `ChevronDown`/`ChevronUp`: for collapsed review row toggle
- `avgRating`, `reviewCount` computed in PaikkaSheet (lines 46): already available for collapsed header
- `motion.div` + `AnimatePresence` from framer-motion: already imported in PaikkaSheet

### Established Patterns
- `hidden={!!paikka.image_url}` + `data-fallback` on DiagonaalKortti right panel: maintain this pattern for the new gray placeholder
- `border-t border-[rgba(0,0,0,0.07)]` separator: used before the bottom row in PaikkaKortti — reuse for marquee row separator
- `overflow-hidden` on sheet outer wrapper: hero carousel must clip inside the rounded-t-3xl corners
- `layoutId={vc-${paikka.id}}` on the sheet motion.div: don't break this — hero must be inside the motion.div

### Integration Points
- PaikkaSheet: hero goes between the drag handle and the scrollable content `<div ref={scrollRef}>`; or the drag handle floats over the hero image as an absolutely positioned element inside the same motion.div
- PaikkaKortti: marquee row inserted between the price block position (lines 115–130) and the bottom row (lines 145–163)
- DiagonaalKortti left panel: badge row line 57 becomes a flex row `[logo box] [sport pill]`
- DiagonaalKortti right panel: fallback div (lines 113–121) — change `style` from `backgroundColor: laji.color` to `bg-[rgba(0,0,0,0.06)]`

</code_context>

<specifics>
## Specific Ideas

- Hero drag handle: `position: absolute`, `top: 12px`, centered horizontally — floats over the top edge of the carousel image.
- Hero overlay gradient: `linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)` — dark at bottom, fades up. Name in `font-bold text-white text-lg`, address in `text-sm text-white/70`.
- Carousel snap: `overflow-x: scroll scroll-snap-type-x: mandatory` on the container, `scroll-snap-align: start` on each slide — or Framer drag with `dragConstraints`. Avoid auto-advance complexity.
- Marquee animation: prefer CSS `@keyframes` in `globals.css` for the marquee loop (simple, no JS overhead) — two copies of the text concatenated so the loop is seamless.
- Collapsed review header: `border-t border-[rgba(0,0,0,0.07)]` like other SheetRows; uses same icon slot (StarIcon or ★ text).

</specifics>

<deferred>
## Deferred Ideas

- Real images in hero carousel and DiagonaalKortti right panel — deferred to when `image_url` is populated per venue (future milestone)
- Logo API (pulling real company logos via website_domain) — flagged in REQUIREMENTS.md future items
- Auto-advance hero carousel — deferred; user interaction only for now

</deferred>

---

*Phase: 29-Kortit & sheet redesign*
*Context gathered: 2026-06-04*
