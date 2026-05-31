# Feature Landscape: v1.5 Visual & UX Improvements

**Domain:** Finnish sports venue finder — mobile-first map app with bottom-sheet UI
**Researched:** 2026-05-31
**Milestone:** v1.5 Visuaalinen elävöitys & UX-hienosäätö

---

## Feature Analysis

Each feature is assessed across: complexity, expected interaction pattern, visual standard, codebase
dependencies, and anti-patterns to avoid.

---

### Feature 1: Blue Sporty Gradient Pins

**Category:** Table Stakes (for the redesign goal)
**Complexity:** Simple

**What production apps do:**
SVG data-URI pins rendered via `AdvancedMarkerElement` are the standard since legacy `google.maps.Marker`
was officially deprecated in Maps JS API v3.56. The content element is an HTML element in the DOM,
meaning CSS gradients, box-shadows, and filter drop-shadows all work directly. Blue gradient
(`#0099FF to #0055CC`) is a well-established "energetic sport tech" visual language (Strava, Nike
Run Club, AllTrails). White circle inside creates contrast for the sport icon.

**Interaction pattern:**
- Default state: gradient fill, white inner circle, sport icon in sport color (see Feature 5)
- Tapped/selected: scale 1.0 to 1.15 (spring, damping 28), z-index bump — signals selection
  without replacing the callout card UX already implemented with `layoutId`
- No hover state needed on mobile (touch target)

**Visual standard:**
- Gradient direction: top-left to bottom-right (135deg) feels sporty and energetic
- Recommended: `from #3b82f6 to #1d4ed8` (Tailwind blue-500 to blue-700) — matches existing
  padel sport color in `lajiKonfig`, creating system coherence
- White inner circle `r=10` on a `28x38` pin viewBox matches current geometry exactly
- Shadow: `filter: drop-shadow(0 2px 4px rgba(29,78,216,0.35))` — blue-tinted shadow ties gradient

**Codebase dependency:**
`lib/sportPins.ts` — `buildPinSvg()` and `PIN_FILL` constant. For a pure color change, update
`PIN_FILL` from `'#c0392b'` to a solid blue. For a true gradient in SVG, add a `<defs>` block
with `<linearGradient>` and reference it as `fill="url(#pin-gradient)"` inside the SVG template.
This requires the SVG to be inline (not a data-URI image src) for gradients that use `url()` refs
— a gradient defined inside a data-URI SVG works if self-contained, which it is here.

**Anti-patterns:**
- Do NOT use a radial gradient trying to look "3D shiny" — reads as cheap on a small pin
- Do NOT make the gradient animate (pulsing colors on every pin = chaos on a full map)
- Do NOT change per-sport pin colors back — the v1.3 decision to use uniform color with sport icon
  was deliberate for visual clarity

---

### Feature 2: Cluster Markers

**Category:** Table Stakes (replacing the current same-address-only clustering)
**Complexity:** Medium

**What production apps do:**
Two established approaches for `@vis.gl/react-google-maps`:
1. `@googlemaps/markerclusterer` — wraps the underlying Marker objects directly; the library's
   default algorithm already uses `supercluster` under the hood. Good for simple cases.
2. `supercluster` library directly — compute clusters from GeoJSON on the client, render results
   as `AdvancedMarker` components. More control, fully React-rendered, supports custom cluster
   shapes. Recommended by vis.gl docs for custom styling needs.

The project's existing same-address clustering uses `Record<string,T[]>` groups rendered manually
(workaround for a TS 5.9.3 Map generic regression, noted in Key Decisions). True zoom-based
clustering requires one of the two approaches above.

**Interaction pattern:**
- Zoom out (below level 12): markers cluster into bubble with count badge
- Zoom in (above level 14): clusters split back into individual pins — smooth, no jump
- Tap cluster: map zooms to cluster bounds (`fitBounds`) — standard Google Maps cluster behavior
- Cluster bubble: same blue gradient as pins, white circle, count number in bold
- Count format: 1-9 shows digit, 10-99 shows "10+", 100+ shows "99+" — current `clusterPinUrl`
  already uses "9+" cutoff which is correct

**Visual standard:**
- Cluster diameter slightly larger than pin: 36px circle (pin is 28px wide)
- Count text: `font-size: 11px`, bold, `#fff` on blue gradient background
- Optional: cluster size scales with count (50+ items = slightly bigger bubble) — this is common
  in Google Maps native but adds complexity; skip for v1.5

**Codebase dependency:**
`lib/sportPins.ts` has `clusterPinUrl()` already implemented and generating SVG clusters.
`app/components/Etusivu.tsx` renders `AdvancedMarker` per item today. The clustering layer needs
to wrap this with either `@googlemaps/markerclusterer` (imperative) or `supercluster` (declarative).
The existing `expandedCluster` state and `setExpandedCluster` are already in `Etusivu.tsx` — this
infrastructure was built for same-address expansion and can be adapted.

**New dependency:** `@googlemaps/markerclusterer` (noted as already in package.json v2.6.2 from
v1.1 research) OR `supercluster` + `@types/supercluster`. `supercluster` is ~7KB gzipped and is
the vis.gl recommended custom approach for fully React-rendered clusters.

**Anti-patterns:**
- Do NOT cluster at high zoom levels (above 14) — individual venue discovery is the core UX
- Do NOT use MarkerClusterer's default yellow circles — must match the blue pin theme
- Do NOT let clusters appear over the open bottom sheet — `zIndex` management required

---

### Feature 3: Pin Shine / Glow Animation

**Category:** Differentiator
**Complexity:** Simple (after HTML element pin migration)

**What production apps do:**
Two standard patterns:
1. **Pulsing ring** (location beacon style): `@keyframes ping` — a ring scales from 1.0 to 1.8
   and fades to opacity 0, loops at ~2-3s interval. Tailwind ships `animate-ping` for this exact
   effect.
2. **Orbiting ring** (shine effect): a semi-arc SVG element or box-shadow rotates 360deg around the
   pin. Less common, more distinctive, but implies "loading" to many users.

For a sport app, the pulsing ring reads as "alive / open now" — better semantic fit. A sporadic
pulse (not continuous loop) feels less annoying on a screen full of pins.

**Interaction pattern:**
- All pins pulse once on map load (staggered by index, 60ms apart) — signals the map is live
- After initial entrance pulse, only "auki nyt" (open now) venues continue pulsing on a 3s interval
- Closed or unknown venues: no pulse after initial entrance
- Tapped pin: pulse stops, pin scales up (Feature 1 selected-state behavior takes over)

**Visual standard:**
- Ring color: `rgba(59,130,246,0.4)` (blue-500 at 40% opacity) — matches gradient pins
- Ring size: starts at pin diameter (28px), expands to 50px, fades out
- Duration: 0.8s ease-out — snappy, not floaty
- Tailwind `animate-ping` class on an absolutely-positioned ring `div` injected into
  `AdvancedMarker` content is the simplest implementation path

**Critical prerequisite — HTML element pin migration:**
The current `pinUrl()` function in `lib/sportPins.ts` returns a `data:image/svg+xml` string used
as an `<img src>`. CSS `@keyframes` animations cannot target content inside a `src="data:..."` image
element. To support glow animations, selected-state transforms, and per-sport colored icons, the pins
need to become actual HTML elements rendered as `AdvancedMarker` content (via `content` prop or
a React element child). This migration is a shared prerequisite for Features 1, 3, and 5.

**Anti-patterns:**
- Do NOT animate all pins continuously — 50+ pulsing rings simultaneously creates visual noise
- Do NOT use `filter: drop-shadow` for the glow on 50+ elements (GPU cost)
- Do NOT use a spinning/orbiting ring — it implies loading, not liveliness

---

### Feature 4: Callout Card — Larger with Cycling Text

**Category:** Differentiator
**Complexity:** Simple

**What production apps do:**
Text carousels in small UI components (toasts, map tooltips, status indicators) use `AnimatePresence`
with `mode="wait"` and a `setInterval` to advance the content. Standard UX: 2.5-3s per item,
smooth opacity crossfade only (no slide — slide inside a pinned callout is disorienting due to
the clip-path boundary).

**Interaction pattern:**
- Default shows: sport label (e.g. "Kuntosali")
- After 2.5s: fades to venue name (e.g. "Fressi Tampere")
- After another 2.5s: fades back to sport label — loops indefinitely while callout is visible
- When user taps the callout: opens PaikkaSheet, interval is cleared
- Width: increase from current 130px to 160px — gives venue names room without crowding nearby pins
- Height: add one more line slot for a distance/logo row — total approximately 72px tall vs current 52px

**Visual standard:**
- Crossfade only: `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`,
  `transition={{ duration: 0.25 }}` — matches Emil Kowalski view transition philosophy from CLAUDE.md
- Use `<AnimatePresence mode="wait">` with the cycling content as a child keyed by cycle index
- The existing dynamic clip-path in `CalloutCard` uses `ResizeObserver` and self-adjusts to the
  new width automatically — no manual path calculation change needed

**Codebase dependency:**
`app/components/Etusivu.tsx` contains `CalloutCard` as an inner component. The `layoutId`
animation from pin to `PaikkaSheet` continues to work because `CalloutCard` is the tap trigger,
not the animation origin.

**Anti-patterns:**
- Do NOT animate with slide/translateY inside the callout — the clip-path cuts off overflow
- Do NOT cycle through more than 2 items (sport and venue name) — 3+ means users wait too long
  to see the venue name they actually care about
- Do NOT loop after the card has been open for more than 10s without interaction — becomes
  distracting background noise

---

### Feature 5: Better Sport Icons

**Category:** Table Stakes (for the redesign goal)
**Complexity:** Simple

**What production apps do:**
Sport-specific color per icon (not uniform gray stroke) is the dominant pattern in mature fitness
apps (Strava segment types, Garmin activity types, Apple Fitness+ categories). The existing
`lajiKonfig` in `lib/lajit.ts` already defines per-sport accent colors — the icons just do not
use them yet.

**Interaction pattern:**
Icons appear in: pin circles (18x18 viewBox slot) and sport badge pills (on CalloutCard and list
cards). Color change: icon stroke uses the sport's `lajiKonfig.color` instead of universal
`#374151`. No interaction change — icons are passive decorators.

**Visual standard:**
- Icon stroke color: use `lajiKonfig[laji].color` for the icon stroke, white fill circle stays white
- Keep `strokeWidth: 2.5`, `strokeLinecap: round`, `strokeLinejoin: round` — matches existing style
  contract in `sportPins.ts`
- Icon path quality: the current tennis icon (three concentric circles, reads as target) and padel
  icon (lightning bolt, reads as power/electric) are misleading. Consider replacing:
  - Tennis: a racket silhouette (circle head + handle) is universally understood
  - Padel: a short-handled paddle with holes is distinctive and correct

**Codebase dependency:**
`lib/sportPins.ts` — `SPORT_ICONS_SVG` and the `g()` helper function hardcode `stroke="#374151"`.
Either pass color as a parameter to `g()`, or switch to HTML element pins (Feature 3 migration)
where the stroke color can be passed as a CSS variable at render time. The HTML element migration
is the cleaner path.

**Anti-patterns:**
- Do NOT use filled (solid) icons in pins — they look muddy at 18x18px
- Do NOT use different stroke widths per sport — creates visual inconsistency across the pin grid
- Do NOT add sport colors as background fills to the pin itself — the gradient fill (Feature 1)
  is the pin body color; icon color is the secondary accent only

---

### Feature 6: Font Upgrade

**Category:** Differentiator
**Complexity:** Simple

**What production apps do:**
Inter is universally legible but has no personality. Finnish sport apps (Firstbeat, Polar Flow,
Suunto app) tend to use geometric grotesques with slightly warmer or wider letterforms than Inter.
Two strong Google Fonts candidates evaluated:

- **Plus Jakarta Sans** — Warmer, slightly wider, more energetic feel than Inter while remaining
  professional. Variable font (weight range 200-800). Strong Finnish-language rendering (a-umlaut,
  o-umlaut, a-ring all in Latin subset). Used in sport-adjacent SaaS products. Recommended.
- **DM Sans** — Cleaner and more minimal than Plus Jakarta Sans. Less personality boost but still
  warmer than Inter. Good fallback if Plus Jakarta Sans feels too expressive.
- **Outfit** — More playful, good for headlines but too informal for the data-dense list view.
  Not recommended.

**Interaction pattern:**
Font is passive — no interaction change. The CLAUDE.md typography rules (4 sizes, 2 weights only)
remain unchanged. Variable font allows `font-weight: 700` and `font-weight: 400` — same as current
Inter usage. No Tailwind config changes needed.

**Visual standard:**
- Replace `Inter` in `app/layout.tsx` `next/font/google` import with `Plus_Jakarta_Sans`
- CSS variable name stays `--font-sans` — zero component changes needed
- Subsets: `['latin']` covers all Finnish characters (a-umlaut, o-umlaut, a-ring are in Latin-1
  Supplement, included in Google Fonts latin subset)
- `display: 'swap'` — matches current pattern, prevents FOIT
- The existing `font-serif` display heading pattern (profile page price, hero headings) stays
  unchanged — Plus Jakarta Sans pairs cleanly with system serif

**Codebase dependency:**
`app/layout.tsx` — single file change. No component, Tailwind, or CSS changes.

**Anti-patterns:**
- Do NOT use a condensed all-caps "sports display" font for body text — illegible at small sizes
  and reads as "gym poster" not "polished Finnish app"
- Do NOT change the `font-serif` display heading pattern — deliberate design decision in CLAUDE.md
- Do NOT load more than 400 and 700 weights — extra payload, violates the 2-weight rule

---

### Feature 7: Bottom Sheet Logo Redesign

**Category:** Differentiator
**Complexity:** Medium

**What production apps do:**
Animated logo wordmarks in bottom sheets and splash screens typically use:
1. SVG `stroke-dashoffset` draw-on animation — letters draw themselves in
2. Gradient sweep (already implemented via `AktiiviLogo.tsx`) — the current solution
3. Subtle "breathing" gradient animation — gradient color stops shift slowly, adds liveness
   without interaction trigger

The current `AktiiviLogo.tsx` already implements a sophisticated sweep animation with 5 sport
gradients cycling on each sheet open. The redesign opportunity is refinement, not replacement.

**What to actually change:**
- Make the logo visible at appropriate size in the closed pill state (currently 56px height
  compressed into a 44px HANDLE_H tab — slightly cramped)
- Add a subtle ambient glow behind the logo container when the sheet is open, connecting the
  logo to the blue pin glow visual language introduced in Feature 3
- Consider a very slow "breathing" gradient animation when the sheet is idle for 5+ seconds
  (no user interaction): Framer Motion `animate` with `repeat: Infinity, repeatType: 'reverse',
  duration: 3` on the gradient stop colors — perceptible movement but not distracting

**Interaction pattern:**
- Sheet closed (pill): logo visible at reduced scale, static (no animation)
- Sheet opens: gradient sweep fires (existing behavior, preserve it)
- Sheet idle for 5s: breathing gradient begins, very slow 3s cycle between two adjacent colors
- User interacts with sheet: breathing pauses until next 5s idle period

**Visual standard:**
- Ambient glow when open: `box-shadow: 0 0 28px rgba(29,78,216,0.15)` behind the SVG container
  — blue tint connects logo to the new blue pin theme
- Do NOT redesign the letter paths — they represent significant prior effort and are recognizable

**Codebase dependency:**
`app/components/AktiiviLogo.tsx` — self-contained component. `app/components/Etusivu.tsx` controls
`gradientIndex` prop and `sheetPhase` — the idle timer logic for the breathing animation needs to
live in `Etusivu.tsx` alongside the existing sheet phase state machine.

**Anti-patterns:**
- Do NOT restart the gradient sweep animation on map interactions — it celebrates the sheet open
  moment only
- Do NOT add a spinning wordmark — reads as broken loading state, not intentional animation

---

### Feature 8: TO DO as Overlay (Not Page)

**Category:** Table Stakes (required to hit the milestone goal)
**Complexity:** Complex

**What production apps do:**
Overlay panels triggered by a floating action or toolbar button are the dominant mobile pattern:
Notion page info drawer, Linear command palette, Apple Maps Favorites sheet. The panel slides up
from the bottom (same animation language as the existing `PaikkaSheet`), has a backdrop, and
dismisses on outside tap or swipe down.

The key UX difference from the current `/suosikit` page: no navigation away from the map, list
renders inside an overlay `div`, and the button lives in the toolbar area (not in NavBar).

**Interaction pattern:**
- Trigger: bookmark icon button below or integrated into the toolbar, with a count badge
  (`todoIds.size > 0` shows a small blue dot) when items exist
- Opening animation ("spit out"): panel slides up from `y+400` to `y=0` with spring overshoot
  (`stiffness: 380, damping: 28` — approximately 5px overshoot at top), combined with list items
  staggering in (`staggerChildren: 0.04`, each item `y: 20 to 0, opacity: 0 to 1`)
- Close: swipe down gesture or X button — panel slides to `y+400`, backdrop fades
  (`dragElastic: { top: 0, bottom: 0.15 }`, `onDragEnd` velocity threshold same as PaikkaSheet)
- Backdrop: `rgba(0,0,0,0.35)` behind the overlay, tap-to-close
- Height: 75vh maximum, scrollable list inside (same `overflow-y: auto` pattern as PaikkaSheet)
- Empty state: "Ei vielä TO DO -paikkoja" identical to current page

**Visual standard:**
- Panel: `.glass` surface, `rounded-t-3xl`, drag handle at top — identical language to `PaikkaSheet`
- List items: same `DiagonaalKortti` components as current `/suosikit` page — no new card design
- Remove button: `BookmarkCheck` icon, `whileTap={{ scale: 0.85 }}` same as current page
- Trigger button badge: small blue circle `w-2 h-2 bg-blue-500 rounded-full absolute -top-0.5 -right-0.5`

**Codebase dependency:**
`app/components/Etusivu.tsx` — `todoIds` Set already exists. The overlay needs access to `todoIds`
and the full `paikat` array to filter and render the list — both available in `Etusivu.tsx`.
The `/suosikit` page should remain as a fallback deep-link route for PWA users who have bookmarked it.
New state: `todoOverlayOpen: boolean` in `Etusivu.tsx`.
The `removeTodo` logic from `SuosikitClient.tsx` should be extracted to a shared hook
`useTodoList(userId, supabase)` used by both `Etusivu.tsx` and `SuosikitClient.tsx`.

**Anti-patterns:**
- Do NOT remove the `/suosikit` page route — PWA users may have it bookmarked as a standalone page
- Do NOT set the overlay `z-index` above `PaikkaSheet` (z-66) — the overlay should close when a
  venue sheet opens, not sit on top of it
- Do NOT animate item exit during active scroll — use `AnimatePresence` with `mode="popLayout"` to
  avoid layout jump when an item is removed mid-scroll

---

### Feature 9: Remove from TO DO → "Did You Visit?" Prompt

**Category:** Differentiator
**Complexity:** Simple (dependent on Feature 8 overlay existing)

**What production apps do:**
"Congratulatory redirect" patterns after completing a saved item are used in productivity apps to
capture feedback at peak relevance (Todoist, Things 3). The prompt is non-blocking, dismissable,
and time-limited — a transient toast-like card, not a full-screen flow. The pattern only makes
semantic sense inside the overlay (user is removing a to-visit venue) not on the separate page.

**Interaction pattern:**
1. User taps the remove button on a TO DO item inside the overlay
2. Item disappears from list (optimistic delete, existing behavior)
3. Immediately after: a small toast card appears at the bottom of the overlay panel
   — "Kävisitkö [Nimi]? Jätä arvostelu" with a right-arrow link
4. Tap "Jätä arvostelu": closes overlay, navigates to `/paikat/[id]` where the review form lives
5. Tap X or wait: prompt auto-dismisses after 4s with a visible timeout bar
6. Only shows for authenticated users (unauthenticated cannot write reviews, so prompt is meaningless)

**Visual standard:**
- Toast card: `.glass` surface, `rounded-xl`, entrance `y: 16 to 0, opacity: 0 to 1`, `duration: 0.2`
- CTA link text: `text-blue-600 font-bold text-sm` — blue accent, visually distinct from the
  glassmorphism dark color system used elsewhere
- Progress bar for auto-dismiss: 4px tall, blue, `width: 100% to 0%` over 4s
- Position: pinned to bottom of the overlay panel content area, above the scroll region

**Codebase dependency:**
`app/components/Etusivu.tsx` — add `pendingReviewPrompt: Liikuntapaikka | null` state.
Auth check: `supabaseUser !== null` is already in `Etusivu.tsx` state.
Navigation: `router.push('/paikat/' + id)` already used in other flows.

**Anti-patterns:**
- Do NOT show the prompt for unauthenticated users — the review form requires login
- Do NOT block the overlay list while prompt is visible — user should continue scrolling
- Do NOT chain the prompt to the delete Supabase call — show it after the optimistic UI update,
  not after the network response (avoids perceived latency)

---

### Feature 10: Simplified Filters with Carousel Animation

**Category:** Table Stakes (required for the simplified filter spec)
**Complexity:** Medium

**What production apps do:**
Horizontal scroll chip rows for active filter selections are the dominant mobile pattern (Google
Maps filter bar, Booking.com search refinements, Apple Maps category bar). The innovation here is
an "active filters" row that appears below the search bar only when filters are non-default, showing
each active selection as a dismissible chip.

The existing filter system has four filter states: `searchKaupunki`, `searchLaji`, `searchAukinyt`,
`searchKertakaynti`. The v1.5 spec simplifies to two: paikkakunta and laji only. "Auki nyt" and
"Kertakäynti OK" are removed from the quick filter bar.

**Interaction pattern:**
- Filter bar: two controls — paikkakunta dropdown and laji dropdown (as today)
- Remove `searchAukinyt` and `searchKertakaynti` from the quick filter bar entirely
- Active filters row: appears below toolbar when either filter is non-default
  - Each active chip: sport name or city name, with an X to clear that specific filter
  - Chips animate in: `x: -16 to 0, opacity: 0 to 1`, `staggerChildren: 0.06`
  - Chips animate out: `opacity: 1 to 0`, shrink via `scale: 1 to 0.8`
  - Row appears/disappears: use opacity + y (`y: -8 to 0`) not `height: auto` animation (listed as
    anti-pattern in CLAUDE.md — causes reflow jank)
- The "carousel" in the spec refers to horizontal scroll of the chip row when multiple filters are
  active simultaneously, not a 3D card carousel

**Visual standard:**
- Active chip: `bg-[#111111] text-white rounded-full px-3 py-1.5 text-[10px] font-bold`
  — matches existing active filter pill style defined in CLAUDE.md
- Clear-all option: small "Tyhjennä" text link at the end of the chip row
- Chip entrance uses `AnimatePresence` with stable `key` per filter (e.g. `"laji-kuntosali"`)

**Codebase dependency:**
`app/components/Etusivu.tsx` — filter state is flat variables in component scope. The filter
controls live inside the toolbar drawer (implemented in Phase 17). Full understanding of the
toolbar component structure requires reading the complete `Etusivu.tsx` — only the first ~220
lines were reviewed for this research.

**Anti-patterns:**
- Do NOT implement a true 3D `Karuselli`-style carousel for filter chips — overkill for 2 possible
  active chips; the existing `Karuselli.tsx` component is for ad cards, different use case
- Do NOT animate chips on every re-render — only on mount and unmount of individual chips via
  `AnimatePresence` keyed entries
- Do NOT add a confirmation before clearing a filter — clearing is not destructive

---

### Feature 11: Logo API — Company Logos in Callout Cards

**Category:** Anti-Feature for v1.5 (spike/defer)
**Complexity:** Complex (requires schema migration + external API + performance work)

**What production apps do:**
Logo APIs (Brandfetch, Logo.dev, formerly Clearbit) return SVG or PNG logos by company domain.
Clearbit deprecated December 1, 2025. Logo.dev is the recommended drop-in replacement — same URL
pattern: `https://img.logo.dev/{domain}?token={token}`. Brandfetch is higher quality (full SVG
vector assets) but requires per-brand API calls with rate limits on free tiers.

**Why this is an Anti-Feature for v1.5:**
1. The `paikat` Supabase table has no `website` or `domain` column — schema migration required
   before logos can be fetched for any venue
2. Only roughly 30% of venues (gym chains: Fressi, Elixia, major padel centers) will have
   recognizable logos; local standalone venues will consistently return 404 or generic favicons
3. A per-venue logo HTTP request waterfall — 50+ callout-visible pins on a single map render
   means 50+ logo fetches per render cycle; clear performance regression
4. Logo.dev free tier: 1,000 requests per month — a single session with 50 visible pins consumes
   50 requests; paid tier required before any real usage
5. Callout card dimensions (current 130px width, proposed 160px) leave very little room for a
   logo that is meaningful at small size

**Recommendation:** Scope as a dedicated spike phase only. Do not build in v1.5.
If implemented later:
- Add `website_domain` (nullable text) column to `paikat` Supabase table
- Pre-populate only for known gym chains (Fressi, Elixia, Liikuntakeskus Energia)
- Lazy-load via `IntersectionObserver` only when the CalloutCard is in the viewport
- Cache in `sessionStorage` keyed by domain to prevent repeat fetches in a session
- Show sport icon as fallback on 404 (current behavior already) — no blank space

---

## Table Stakes vs Differentiators Summary

| Feature | Category | Complexity | Phases Needed |
|---------|----------|------------|---------------|
| Blue gradient pins | Table Stakes | Simple | 1 |
| Cluster markers | Table Stakes | Medium | 1-2 |
| Pin glow animation | Differentiator | Simple | 1 (after HTML pin migration) |
| Callout card cycling text | Differentiator | Simple | 1 |
| Better sport icons (colorful) | Table Stakes | Simple | 1 (same PR as pins) |
| Font upgrade | Differentiator | Simple | 1 |
| Bottom sheet logo refinement | Differentiator | Medium | 1 |
| TO DO overlay | Table Stakes | Complex | 1-2 |
| Remove → review prompt | Differentiator | Simple | 1 (after overlay) |
| Simplified filters + chips | Table Stakes | Medium | 1 |
| Logo API | Anti-Feature (defer) | Complex | Spike only |

---

## Feature Dependencies

```
HTML element pin migration (from data-URI img src to React DOM element in AdvancedMarker)
  -> Blue gradient pins (Feature 1)          CSS gradient on DOM element
  -> Colorful sport icons (Feature 5)        stroke color as prop at render time
  -> Pin glow animation (Feature 3)          CSS @keyframes on DOM element
  -> Selected-state scale (Feature 2)        CSS transform on DOM element

TO DO overlay (Feature 8)
  -> Remove -> review prompt (Feature 9)     prompt lives inside overlay

Feature 10 (filter simplification)           standalone, filter state only
Feature 6 (font upgrade)                     standalone, layout.tsx only
Feature 7 (logo animation refinement)        standalone, AktiiviLogo.tsx
Feature 4 (callout cycling text)             standalone, CalloutCard in Etusivu.tsx
Feature 11 (logo API)                        blocked by schema migration, defer indefinitely
```

---

## MVP Recommendation

**Phase 1 — Visual foundation (all simple/standalone):**
Features 1 + 5 + 6 — gradient pins, colorful icons, font swap. One cohesive visual upgrade.
The HTML element pin migration (prerequisite for Feature 3) should happen in this phase even if
the glow animation (Feature 3) ships in Phase 2.

**Phase 2 — Map interactions (requires pin migration from Phase 1):**
Features 2 + 3 + 4 — clustering, pin glow, callout cycling.
Clustering requires `supercluster` or `@googlemaps/markerclusterer` — real integration work.
Callout cycling and glow are simple after Phase 1's pin migration.

**Phase 3 — UX flows (independent of map work):**
Features 7 + 8 + 9 + 10 — logo refinement, TO DO overlay, review prompt, filter chips.
The overlay (Feature 8) is the most complex item and should be started first within this phase.
Logo refinement and filter chips are independent and can run in parallel.

**Defer:** Feature 11 (Logo API) — no timeline until schema migration is justified by data quality.

---

## Sources

- vis.gl react-google-maps marker clustering: https://visgl.github.io/react-google-maps/examples/marker-clustering
- vis.gl custom marker clustering (supercluster): https://visgl.github.io/react-google-maps/examples/custom-marker-clustering
- Google Maps AdvancedMarker graphics: https://developers.google.com/maps/documentation/javascript/advanced-markers/graphic-markers
- Logo.dev (Clearbit replacement), Brandfetch: https://www.abstractapi.com/guides/company-enrichment/best-company-logo-apis
- Framer Motion stagger: https://www.framer.com/motion/stagger/
- Framer Motion AnimatePresence + transitions: https://www.framer.com/motion/transition/
- Plus Jakarta Sans on Google Fonts: https://fonts.google.com/specimen/Plus+Jakarta+Sans
- Map UI Patterns — callout: https://mapuipatterns.com/call-out/
- Map UI Patterns — cluster marker: https://mapuipatterns.com/cluster-marker/
- supercluster npm: referenced via @googlemaps/markerclusterer which uses it as default algorithm
