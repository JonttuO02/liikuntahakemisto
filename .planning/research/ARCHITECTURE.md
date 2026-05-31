# Architecture: v1.5 Feature Integration

**Project:** AKTIIVI / Liikuntahakemisto
**Milestone:** v1.5 Visuaalinen elavöitys & UX-hienosäätö
**Researched:** 2026-05-31
**Confidence:** HIGH — based on direct codebase inspection + verified library patterns

---

## 1. Blue Gradient SVG Pins

### Existing files affected

- `lib/sportPins.ts` — sole author of the SVG data-URI pins; `buildPinSvg()`, `pinUrl()`, `clusterPinUrl()`
- `app/globals.css` — `.gmap-pin` CSS class (bounce animation, hover scale)
- `app/components/Etusivu.tsx` — renders `<img src={pinUrl(p.laji)} className="gmap-pin" />` inside `AdvancedMarker`

### New files needed

None — all changes stay in `lib/sportPins.ts` and `app/globals.css`. Optionally a new `app/components/SportPin.tsx` if upgrading to JSX (see below).

### Integration approach

The pins are rendered as `<img>` tags whose `src` is a `data:image/svg+xml` URI. The SVG is assembled as a string in `buildPinSvg()`. Gradients in SVG require a `<defs><linearGradient>` block.

Because the SVG is delivered as a data URI, it is parsed as a separate SVG document by the browser — not embedded in the page DOM. This means CSS classes on the `<img>` element do NOT apply inside the SVG content. The gradient definition must live inside the SVG string itself.

The id collision concern (multiple pins referencing the same `#pin-grad`) does not apply: each `<img>` renders its own isolated SVG document from the data URI; id references are scoped per document. This is standard SVG-in-data-URI behavior (HIGH confidence).

**Concrete change in `buildPinSvg()` in `lib/sportPins.ts`:**

Replace the flat `fill="${PIN_FILL}"` pin body path with a `<defs>` block declaring a `linearGradient` from light blue to deep blue, then use `fill="url(#pin-grad)"` on the teardrop path. The white circle interior and the icon remain unchanged.

**Shine (kiilto) animation in `app/globals.css`:**

The `.gmap-pin` class already applies CSS animations to the `<img>` element. Add a second `@keyframes pinShine` that pulses `filter: brightness(1.0) → brightness(1.3) → brightness(1.0)` on a 3–4 s repeat-infinite cycle. This attaches to `.gmap-pin` as a second animation alongside the existing `pinBounce` entry animation. No React or TypeScript changes.

**Upgrading to JSX component (optional, recommended for Framer Motion animation):**

If the goal is to apply Framer Motion `whileHover`, `animate`, or stagger to individual pins, the `<img>` approach is limiting — Framer Motion cannot animate inside a data URI SVG. The upgrade path is:

1. Create `app/components/SportPin.tsx` — a React component that renders the pin SVG as inline JSX (teardrop path, circle, icon), wrapped in a Framer `motion.div`
2. In `Etusivu.tsx`, replace `<img src={pinUrl(p.laji)} className="gmap-pin" />` with `<SportPin laji={p.laji} />`
3. Keep `lib/sportPins.ts` for `clusterPinUrl()` only (cluster pin stays as `<img>`)

The existing `.gmap-pin` CSS class becomes redundant for the JSX pin and can be removed from that element.

### Build order position: Phase A (standalone, no deps on other features)

---

## 2. AdvancedMarker Clustering

### Existing files affected

- `app/components/Etusivu.tsx` — the `mapItems` memo (lines ~467–484) and the JSX loop rendering `AdvancedMarker` items

### New files needed

None required; optionally `hooks/useMarkerClusterer.ts` if extracted for testability.

### Integration approach

`@googlemaps/markerclusterer` v2.6.2 is already installed in `package.json`. No new package install needed.

**The current system is already doing coordinate-based clustering.** The `mapItems` memo in `Etusivu.tsx` groups venues at matching rounded lat/lng (4 decimal places) into clusters before render. The existing cluster UI (badge count, expandedCluster popup) is custom and working. This is the "same-address clustering" built in Phase 18 — it handles the specific use case of multiple venues at the same building.

**Option A — Retain manual clustering (recommended for v1.5).** The existing approach handles the same-address scenario that was the explicit design requirement (Phase 18). @googlemaps/markerclusterer adds zoom-aware geographic clustering, which was previously listed in PROJECT.md's "Out of Scope" section (Klusterointi). Introducing it creates new UI questions: what does a cluster of 5 venues from different addresses look like? How does click-to-expand work? This is a significant UX redesign, not a "visual polish" task.

**Option B — Replace manual clustering with @googlemaps/markerclusterer.** The `MarkerClusterer` class accepts `AdvancedMarkerElement` handles (the underlying DOM elements from `@vis.gl/react-google-maps`'s `AdvancedMarker`). The integration pattern requires `useAdvancedMarkerRef` per marker. A documented footgun: the `setMarkerRef` callback must be memoized with `useCallback`, otherwise it triggers infinite re-render loops (confirmed in GitHub discussions #404). The `expandedCluster` state would need to be reworked since MarkerClusterer manages cluster click events through its `renderer` option rather than through React state.

**Recommendation: Skip @googlemaps/markerclusterer for v1.5.** The existing clustering is functional. If zoom-aware geographic clustering is wanted in a future milestone, allocate a dedicated phase — it is not a "visual polish" addition.

### Build order position: Phase D (optional, skip if keeping manual clustering)

---

## 3. Pin Entry and Hover Animations

### Existing files affected

- `app/globals.css` — `@keyframes pinBounce`, `.gmap-pin`, `.gmap-pin:hover`
- `app/components/Etusivu.tsx` — the `<motion.div key="pin">` wrapper around `<img className="gmap-pin">`

### New files needed

`app/components/SportPin.tsx` if upgrading to JSX (shared with Feature 1).

### Integration approach

The existing entry bounce (`pinBounce` keyframe) and hover scale already work. The `<motion.div>` wrapper in `Etusivu.tsx` (line ~584) handles `exit={{ opacity: 0 }}` for when the pin transitions to a callout card — this is already Framer Motion.

For additional animation on the pin itself:

**CSS-only approach:** Add `@keyframes pinShine` to `globals.css`, reference on `.gmap-pin` as a second animation. Works immediately, no component changes.

**Framer Motion approach:** Only available if the `<img>` is replaced with `<SportPin>` (JSX component). Then the `SportPin` component can use `whileHover={{ scale: 1.15 }}` (replacing the CSS `:hover { transform: scale(1.15) }`) and `initial/animate` for entry. The existing `motion.div` wrapper around the pin already provides `exit` — the pin itself getting its own `motion.div` is nested but not conflicting since they animate different properties.

**No layoutId on the pin.** The callout card uses `layoutId="vc-${p.id}"` (shared with `PaikkaSheet`). The pin must NOT get a `layoutId` — the visual transition is pin → card → PaikkaSheet, and the `layoutId` is only on the card element.

### Build order position: Phase A (same as gradient — same files)

---

## 4. Callout Card Cycling

### Existing files affected

- `app/components/Etusivu.tsx` — `nearestCardId` (useMemo, ~lines 502–511), `CalloutCard` component (inline, lines ~104–148), the `AnimatePresence` wrapping the card transition

### New files needed

`app/components/CalloutCard.tsx` — optional extraction (recommended to isolate hover-pause logic).

### Integration approach

Currently `nearestCardId` is a `useMemo` computing a single `number | null`. Cycling requires tracking multiple candidates and an animated index.

**State changes in `Etusivu.tsx`:**

- Replace `nearestCardId: number | null` with two pieces of state: `nearCandidates: number[]` (sorted by distance to map center, filtered to ≤ 500 m radius) and `cycleIdx: number`
- `nearCandidates` is derived by the same computation as current `nearestCardId` but keeps all venues within 500 m (not just the nearest one), sorted by distance
- `cycleIdx` is the displayed index; only relevant when `zoomLevel >= 16` and `nearCandidates.length > 0`
- The currently displayed card id is `nearCandidates[cycleIdx % nearCandidates.length] ?? null`

**Interval management:**

```
const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
const cyclingPausedRef = useRef(false)   // set true on hover, false on leave

// Effect: start/stop interval when nearCandidates changes
useEffect(() => {
  if (nearCandidates.length <= 1) return   // nothing to cycle
  cycleTimerRef.current = setInterval(() => {
    if (!cyclingPausedRef.current) {
      setCycleIdx(i => i + 1)              // modulo applied at read site
    }
  }, 3000)
  return () => {
    if (cycleTimerRef.current) clearInterval(cycleTimerRef.current)
  }
}, [nearCandidates])
```

This pattern is identical to `Karuselli.tsx`'s `timerRef` + `resetTimer` approach. Copy it exactly to avoid the memory leak footgun.

**Hover pause:** Pass `onMouseEnter={() => { cyclingPausedRef.current = true }}` and `onMouseLeave={() => { cyclingPausedRef.current = false }}` to `CalloutCard`. Using a `useRef` flag (not state) means the pause/resume does not trigger a re-render.

**AnimatePresence:** The existing `AnimatePresence initial={false}` wrapper around the card handles enter/exit when the displayed card id changes. `cycleIdx` changing will cause `nearestCardId` to change → card exits with `opacity: 0` → new card enters. This is already the right behavior. The `key` on the card motion element must be `"card"` (already is) so AnimatePresence tracks it as the same element type.

**layoutId coordination:** The callout card uses `layoutId="vc-${p.id}"` where `p.id` is the currently displayed venue. When cycling, this id changes. `PaikkaSheet` also uses `layoutId="vc-${paikka.id}"`. As long as the cycling card's `p.id` matches what the user taps (setting `valittu`), the expand animation will work correctly.

### Build order position: Phase B (after Phase A — should display upgraded pin/card visuals)

---

## 5. Sport Icon Overhaul in lib/lajit.ts

### Existing files affected

- `lib/lajit.ts` — `LajiKonfig` interface and `lajiKonfig` record
- `lib/sportPins.ts` — `SPORT_ICONS_SVG` record (separate set of SVG path strings for data-URI pins)
- `app/components/DiagonaalKortti.tsx` — local `SPORT_ICONS` record mapping sport keys to Lucide components
- `app/components/Etusivu.tsx` — `CalloutCard` uses `lajiKonfig[p.laji]` for badge color and label only (no icons currently)
- `app/components/PaikkaSheet.tsx` — uses `lajiKonfig[p.laji]` for badge color and label only

### Current architecture gap

Three separate icon/color definitions exist out of sync:

| Source | What it holds | Consumers |
|--------|---------------|-----------|
| `lib/lajit.ts` | colors, labels | CalloutCard, PaikkaSheet, DiagonaalKortti badge, Etusivu cluster popup |
| `lib/sportPins.ts` | SVG path strings (lucide paths as raw strings) | Pin data-URI generation |
| `app/components/DiagonaalKortti.tsx` | Lucide React components | Card icon, fallback background icon |

`jääkiekko` has a pin icon in `sportPins.ts` but NO lucide component in `DiagonaalKortti.tsx` (falls back to `Activity`). `kiipeily` similarly. The overhaul should consolidate.

### Recommended consolidation

Add an `Icon` field to `LajiKonfig` in `lib/lajit.ts`:

```typescript
import type { LucideIcon } from 'lucide-react'

export interface LajiKonfig {
  label: string
  badgeTw: string
  accentBg: string
  color: string
  Icon: LucideIcon   // add this
}
```

Assign a lucide icon to each sport in `lajiKonfig`. Then `DiagonaalKortti.tsx` removes its local `SPORT_ICONS` map and uses `lajiKonfig[paikka.laji]?.Icon ?? Activity`.

`lib/sportPins.ts` cannot use the lucide React components — those are JSX and `sportPins.ts` generates SVG strings, not React elements. Its `SPORT_ICONS_SVG` stays as-is. If upgrading pins to the JSX `SportPin.tsx` component (Feature 1), `SportPin.tsx` could import `Icon` from `lajiKonfig` directly and render it as JSX inside the SVG using `<foreignObject>` — but this is complex and may not render in all SVG contexts. Safer: `SportPin.tsx` maintains its own SVG path strings (same as current `SPORT_ICONS_SVG`).

**Client-side import concern:** Adding `LucideIcon` import to `lib/lajit.ts` makes the module import lucide-react. Lucide is a client-only library. Verify: `lib/lajit.ts` is currently imported in `app/page.tsx` (Server Component) — search reveals it imports `LAJIT_FILTTERI` for the filter list passed to client children. If `LajiKonfig` with `LucideIcon` is imported in the server context, Next.js may warn or error.

**Safe approach:** Split `lib/lajit.ts` into two exports:
- `lib/lajit.ts` — keeps `LajiKonfig` (with `Icon`), `lajiKonfig`, `LAJIT_FILTTERI`, `getInfoWindowStyle` but marks the Icon field as optional with a type import
- `lib/lajiKonfigServer.ts` — a server-safe subset with only colors/labels/keys for use in `app/page.tsx`

Alternatively: `app/page.tsx` only imports `LAJIT_FILTTERI` (a plain string array) — not `lajiKonfig`. So the import is already client-component-only in practice. Adding `LucideIcon` is safe. Verify by checking the actual import in `app/page.tsx`.

### Build order position: Phase C (icons consumed by DiagonaalKortti and CalloutCard — do before visual work on those)

---

## 6. TO DO Overlay

### Existing files affected

- `app/components/Etusivu.tsx` — toolbar "TO DO" link (line ~806, `<Link href="/suosikit">`); owns `todoIds` state and `toggleTodo()` logic
- `app/suosikit/page.tsx` and `app/suosikit/SuosikitClient.tsx` — the full-page TO DO route (stays intact for direct URL access)
- `app/components/NavPill.tsx` — has its own `<Link href="/suosikit">` (used on `/suosikit` and `/profiili` pages — stays unchanged)

### New files needed

- `app/components/TodoOverlay.tsx` — new client component

### Integration approach

The overlay replaces navigation to `/suosikit` from Etusivu's top-right toolbar only. The `/suosikit` page remains reachable directly and via NavPill on other pages.

**State in Etusivu.tsx:**

Add `todoOverlayOpen: boolean` state. In the `rightOpen` toolbar expansion (line ~784–835), change the "TO DO" entry from:

```tsx
<Link href="/suosikit" ...>TO DO</Link>
```

to:

```tsx
<button onClick={() => { setTodoOverlayOpen(true); closeOverlays() }} ...>TO DO</button>
```

**TodoOverlay props:**

```typescript
interface TodoOverlayProps {
  open: boolean
  onClose: () => void
  todoIds: Set<number>
  paikat: Liikuntapaikka[]
  onToggleTodo: (id: number) => void
  supabaseUser: { id: string; email?: string } | null
}
```

All of these already exist in `Etusivu.tsx` state — no new data fetching needed. The overlay reads `todoIds` to display the TO DO list, and calls `onToggleTodo` to remove items.

**z-index layering:** Current Etusivu z-index stack:
- 48: night overlay
- 50: Map
- 56: tap-to-close overlay
- 60: bottom sheet
- 61: search results
- 63: backdrops
- 64: toolbars
- 65: venue sheet backdrop
- 66: PaikkaSheet

TodoOverlay should use `z-[70]` with its own backdrop at `z-[69]`. This ensures it sits above PaikkaSheet and toolbars.

**Animation:** Bottom-up slide (`y: '100%' → 0`) via Framer Motion `AnimatePresence`, consistent with the bottom sheet convention. Full height (`100dvh`) or `90dvh`.

**Removal → review prompt:** After removing a venue from the overlay, show an inline prompt within the overlay: "Kävitkö siellä? Jätä arvostelu" with a link to `/paikat/${id}#reviews`. Use local `removedPaikka: Liikuntapaikka | null` state inside `TodoOverlay`. Show the prompt for ~4 s, then clear it.

**Unauthenticated state:** If `supabaseUser` is null and user taps "TO DO" in toolbar, the overlay shows a login prompt rather than the list — same as the existing `/suosikit` page's unauthenticated state, but inline.

### Build order position: Phase E (after Phase C — uses icons; touches Etusivu heavily; do before filter changes)

---

## 7. Filter Carousel Animation

### Existing files affected

- `app/components/Etusivu.tsx` — filter pill row (~lines 1036–1073): city select, sport select, Kertakäynti OK button, Auki nyt button; also `searchKertakaynti` and `searchAukinyt` state

### New files needed

- `app/components/LajiPillRow.tsx` — animated sport selector

### Integration approach

**Filter reduction:** Remove Kertakäynti OK and Auki nyt pills from the visible UI. Do NOT remove the underlying state vars (`searchKertakaynti`, `searchAukinyt`) — `etusivu-scroll-state` in sessionStorage may contain these keys from saved sessions, and the restore logic must still handle them without error. Simply stop rendering the buttons.

**Sport selector upgrade:** Replace the `<select>` with a horizontally scrollable pill row. The animation is the "magic underline" / "active pill background" pattern: a single `motion.div` with a shared `layoutId="sport-active-bg"` renders as the background of whichever pill is currently selected and animates between pills on change.

```tsx
// LajiPillRow.tsx
import { motion, LayoutGroup } from 'framer-motion'

interface Props {
  value: string
  onChange: (v: string) => void
  options: string[]
}

export default function LajiPillRow({ value, onChange, options }: Props) {
  return (
    <LayoutGroup>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className="relative flex-shrink-0 h-8 px-3 rounded-full text-xs font-bold"
            style={{ color: value === opt ? '#111111' : 'rgba(17,17,17,0.45)' }}
          >
            {value === opt && (
              <motion.span
                layoutId="sport-active-bg"
                className="absolute inset-0 rounded-full bg-[#111111]"
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              />
            )}
            <span className="relative" style={{ color: value === opt ? 'white' : undefined }}>
              {opt}
            </span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  )
}
```

**In Etusivu.tsx:** Replace the sport `<select>` with `<LajiPillRow value={searchLaji} onChange={setSearchLaji} options={LAJIT_FILTTERI} />`. The city select can remain as `<select>` — the pill carousel is specifically for sport where there are exactly 9 options (manageable in a row).

**Scrollbar hiding:** Add `.no-scrollbar { scrollbar-width: none; }` / `::-webkit-scrollbar { display: none }` to `globals.css` for the pill row container.

**State shape:** No change to `searchLaji` type (still `string`). No change to filter logic in `searchSuodatettu` memo.

### Build order position: Phase F (last — only touches search overlay UI; minimal risk; safe to do after all other changes to Etusivu)

---

## 8. Logo API

### Existing files affected

- `app/components/Etusivu.tsx` — `CalloutCard` component (inline, lines ~104–148)
- `lib/types.ts` — `Liikuntapaikka` type

### New files needed

- `scripts/seed-logos.ts` — manual data entry script (same pattern as `scripts/seed-hinnat.ts`)
- Optionally `app/api/logo/route.ts` if logos are fetched dynamically from a third-party API

### Integration approach

This is a spike. Two viable approaches:

**Approach A — Store `logo_url` in Supabase (recommended).** Same pattern as `image_url` added in v1.4. Add `logo_url: string | null` to the `liikuntapaikat` table and to `lib/types.ts`. CalloutCard renders a small `<img src={p.logo_url} />` (24–32 px) if present. No new API route. Data entry via `scripts/seed-logos.ts`. Caching is free (Supabase CDN or the venue's CDN for the URL). Consistent with existing data ops pattern.

**Approach B — Clearbit/Logo API per-domain on demand.** A Route Handler `app/api/logo/route.ts` accepts `?domain=example.fi`, fetches from Clearbit or similar, returns URL or null. CalloutCard calls this on mount. This adds a fetch-per-card on every map view, complicates CalloutCard (becomes async/Effect-driven), and introduces a third-party API dependency. Not recommended for a polish milestone.

**Type change in `lib/types.ts`:**

```typescript
export type Liikuntapaikka = {
  // ... existing fields ...
  logo_url?: string | null   // add this
}
```

**CalloutCard change:** The `CalloutCard` component (currently inline in Etusivu.tsx) receives the `Liikuntapaikka` data. Add a logo `<img>` at the top of the card, right-aligned, if `p.logo_url` is truthy. Use `onError` to hide the img on broken URLs (same pattern as `DiagonaalKortti.tsx` image handling).

**Database migration:** Add `logo_url text` column to `liikuntapaikat` table in Supabase. No RLS change needed — the column is public data.

### Build order position: Phase G (fully isolated; additive only; can be last or concurrent spike)

---

## Build Order Recommendation

```
Phase A: Pin gradient + shine animation
  lib/sportPins.ts     — gradient in buildPinSvg()
  app/globals.css      — @keyframes pinShine
  app/components/SportPin.tsx   — optional JSX upgrade

Phase B: Callout card cycling
  app/components/Etusivu.tsx    — nearCandidates, cycleIdx, interval, hover pause
  app/components/CalloutCard.tsx — optional extraction

Phase C: Sport icon overhaul
  lib/lajit.ts                  — add Icon: LucideIcon to LajiKonfig
  app/components/DiagonaalKortti.tsx — remove local SPORT_ICONS, use lajiKonfig

Phase D: Clustering (skip if keeping manual — recommended)
  app/components/Etusivu.tsx    — useAdvancedMarkerRef, MarkerClusterer effect
  hooks/useMarkerClusterer.ts   — optional extraction

Phase E: TO DO overlay
  app/components/TodoOverlay.tsx — new component
  app/components/Etusivu.tsx    — todoOverlayOpen state, button swap in toolbar

Phase F: Filter carousel
  app/components/LajiPillRow.tsx — new animated pill row
  app/components/Etusivu.tsx    — replace sport select, remove kertakaynti/aukinyt pills

Phase G: Logo API spike
  lib/types.ts         — add logo_url
  app/components/Etusivu.tsx (CalloutCard)  — render logo
  scripts/seed-logos.ts — new data entry script
```

**Why this order:**
- A before B: callout card should display with upgraded pin visuals
- C before E: icons in `lajit.ts` are consumed by `DiagonaalKortti` which is used inside `TodoOverlay`
- E before F: both modify Etusivu heavily; sequential reduces merge conflict risk; E establishes a stable state shape
- D is optional and isolated — if pursued, requires A (pins must be JSX for ref attachment)
- G is fully isolated — can run in parallel with any phase or be the last spike

---

## Component Map: New vs Modified

| File | Status | Phase |
|------|--------|-------|
| `lib/sportPins.ts` | Modified | A |
| `app/globals.css` | Modified | A |
| `app/components/SportPin.tsx` | New (optional) | A |
| `app/components/Etusivu.tsx` | Modified (multiple times) | B, D, E, F, G |
| `app/components/CalloutCard.tsx` | New (optional extraction) | B |
| `lib/lajit.ts` | Modified | C |
| `app/components/DiagonaalKortti.tsx` | Modified | C |
| `hooks/useMarkerClusterer.ts` | New (optional) | D |
| `app/components/TodoOverlay.tsx` | New | E |
| `app/components/LajiPillRow.tsx` | New | F |
| `lib/types.ts` | Modified | G |
| `scripts/seed-logos.ts` | New | G |

---

## Critical Integration Constraints

### Etusivu.tsx is the blast radius

Five of eight features directly modify `Etusivu.tsx` (currently 1150 lines). Phases B, E, and F each add new state and JSX to this file. Execute them sequentially and ensure each phase leaves the file in a compilable state before the next begins.

### layoutId collision avoidance

`PaikkaSheet` uses `layoutId="vc-${paikka.id}"` (line 51 of PaikkaSheet.tsx). `CalloutCard` in Etusivu uses the same `layoutId` on the card's `motion.div` (lines ~599–605) — this shared id enables the expand-from-card animation. Any new `motion.div` added inside `AdvancedMarker` (e.g., for `SportPin`) must NOT use the `vc-` prefix. The `LajiPillRow` uses `layoutId="sport-active-bg"` — keep this scoped inside a `LayoutGroup` to avoid colliding with existing `LayoutGroup` in Etusivu.

### z-index stack for TodoOverlay

Etusivu's existing layers:
- 48: night overlay
- 50: Map
- 56: tap-to-close
- 60: bottom sheet
- 61: search results
- 63: backdrops
- 64: toolbars
- 65: venue sheet backdrop
- 66: PaikkaSheet

TodoOverlay: backdrop at `z-[69]`, overlay panel at `z-[70]`.

### sessionStorage backward compatibility

`etusivu-scroll-state` persists `searchKertakaynti` and `searchAukinyt`. Phase F removes these filter controls from the UI but must NOT remove the state variables. The restore logic reads these keys from sessionStorage and sets the state — if the keys are present (from a pre-Phase-F session) but the UI controls are hidden, the state is set but has no visual effect. This is correct and safe.

### CSS animation on `.gmap-pin` — no Framer Motion conflict

The `.gmap-pin` class applies CSS `animation: pinBounce ...`. The `motion.div key="pin"` wrapper in Etusivu applies Framer Motion `exit={{ opacity: 0 }}`. These operate on different CSS properties and elements (the wrapper vs the `<img>`) — they do not conflict. A `pinShine` animation added to `.gmap-pin` also does not conflict.

### Icon import in lib/lajit.ts — verify server safety

`app/page.tsx` imports `LAJIT_FILTTERI` from `lib/lajit.ts`. This is a server component. If `lib/lajit.ts` imports lucide-react (for `LucideIcon`), verify that the import does not cause a server-side error. Mitigation: use `import type { LucideIcon }` (type-only import, erased at compile time) for the interface field — the actual lucide component values are only assigned in the object literal, which is also fine since Next.js bundles server/client correctly. If any issue arises, move `lajiKonfig` to a `lib/lajiKonfig.client.ts` file with `'use client'` directive.

---

## Sources

- Direct codebase inspection: `Etusivu.tsx` (1150 lines), `sportPins.ts`, `lajit.ts`, `PaikkaSheet.tsx`, `AktiiviLogo.tsx`, `Karuselli.tsx`, `DiagonaalKortti.tsx`, `SuosikitClient.tsx`, `globals.css`, `types.ts`, `package.json`
- `@googlemaps/markerclusterer` v2.6.2 already in `package.json` (no new install needed)
- `@vis.gl/react-google-maps` v1.8.3 clustering ref pattern — GitHub discussions #325 (pattern), #404 (infinite loop footgun with unmemoized setMarkerRef)
- SVG linearGradient in data-URI: isolated SVG document scope per image element, id collision is not a concern (HIGH confidence — standard SVG spec behavior)
- Karuselli.tsx `timerRef` + `resetTimer` pattern — direct codebase inspection, used as reference for callout card cycling interval management
