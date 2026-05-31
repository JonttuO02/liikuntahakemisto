# Project Research Summary

**Project:** AKTIIVI (Liikuntahakemisto)
**Domain:** Finnish sports venue finder - mobile-first map app with bottom-sheet UI
**Researched:** 2026-05-31
**Confidence:** HIGH

## Executive Summary

AKTIIVI v1.5 is a visual polish and UX refinement milestone on top of a fully shipped v1.4 codebase (Next.js 14, @vis.gl/react-google-maps 1.8.3, Framer Motion 12, Tailwind v3, Supabase). The scope is additive: no stack replacements, no new runtime dependencies required for the core features. The work splits into three natural clusters: map visuals (gradient pins, clustering decision, glow animation), UX flows (TO DO overlay, filter simplification), and cosmetic polish (font swap, logo refinement, callout cycling). Research confirms all core features can ship without adding npm packages.

The recommended build order follows the dependency graph: pin visuals first (standalone, no blockers), then callout card interactions (uses upgraded pins), then sport icon consolidation (consumed downstream by the new overlay), then the TO DO overlay itself, and finally filter UI simplification. This sequence minimizes Etusivu.tsx merge conflicts -- five of the eight features modify the same 1150-line file. The key architectural risk is the Etusivu blast radius: each phase must leave the file compilable before the next begins.

The single largest risk is the intersection of CSS animation and the AdvancedMarker overlay layer. Looping CSS animations that touch background, box-shadow, or filter on all visible pins simultaneously will cause full repaints and jank on mid-range Android. Every pin animation must use only transform and opacity. Equally important: geographic clustering (@googlemaps/markerclusterer) is explicitly out of scope per PROJECT.md and confirmed by ARCHITECTURE.md -- the correct v1.5 approach is a visual-only update to clusterPinUrl() in the existing custom system.

## Key Findings

### Recommended Stack

The existing stack is unchanged for v1.5. No new runtime packages are required. @googlemaps/markerclusterer v2.6.2 is already installed but must NOT be activated -- doing so would require a full replacement of mapItems and all AdvancedMarker JSX, which is a UX redesign, not visual polish. The font swap (Inter to Geist) requires a one-line change in app/layout.tsx via next/font/google -- no npm install.

**Core technologies and their v1.5 roles:**
- lib/sportPins.ts (existing): SVG gradient change confined to buildPinSvg() -- add defs/linearGradient block; update clusterPinUrl() for visual parity with single pins
- app/globals.css (existing): @keyframes pin-pulse added here -- must use transform/opacity only, never box-shadow or filter on looping animations
- Framer Motion 12 (existing): AnimatePresence for TO DO overlay slide-up, icon crossfade, callout cycling; use mode=popLayout if exit animations added to DiagonaalKortti list
- next/font/google (existing): Geist font loaded with variable --font-sans -- zero downstream changes
- @vis.gl/react-google-maps 1.8.3 (existing): AdvancedMarker className prop is the attachment point for pin-pulse CSS animation; useAdvancedMarkerRef NOT needed (clustering deferred)

**Font decision -- Geist (not Plus Jakarta Sans):** STACK.md recommends Geist; FEATURES.md recommends Plus Jakarta Sans. Geist wins: geometric/sporty character, on Google Fonts with latin subset (Finnish chars confirmed), variable weight 100-900, trivial drop-in for Inter in Next.js 14, no extra npm dependency. Plus Jakarta Sans is wider and warmer -- better for a consumer wellness app than a sports finder. Decision is final for v1.5.

**Clustering decision -- visual-only update to custom system:** ARCHITECTURE.md recommends skipping @googlemaps/markerclusterer for v1.5. PITFALLS.md confirms that mixing the library with existing React-managed markers causes double markers and broken click handlers (Pitfall 3). PROJECT.md lists geographic cluster markers in Out of Scope. Correct approach: update clusterPinUrl() to use the blue gradient -- purely visual, zero library conflict.

**Logo API -- deferred:** FEATURES.md correctly categorizes Logo API as an anti-feature for v1.5. The paikat table has no website_domain column, only ~30% of venues have recognizable logos, 50+ simultaneous logo fetches per render cycle creates a performance regression, and Clearbit is dead since Dec 2025. If pursued later: Brandfetch CDN URL pattern with a server-side Route Handler cache and IntersectionObserver-based lazy loading.

### Expected Features

**Must have (table stakes):**
- Blue gradient SVG pins -- replaces flat red #c0392b; gradient in buildPinSvg() as defs/linearGradient; blue-600 to sky-500 palette
- Colorful sport icons -- icon stroke uses lajiKonfig[laji].color instead of universal #374151
- TO DO overlay -- replaces Link /suosikit in toolbar; /suosikit page route stays intact (PWA deep links, auth redirects, Serwist precache)
- Simplified filters -- remove Kertakäynti OK and Auki nyt from quick filter bar; keep state vars for sessionStorage compatibility; replace sport select with LajiPillRow animated pill row

**Should have (differentiators):**
- Pin glow/pulse animation -- CSS @keyframes pin-pulse on AdvancedMarker wrapper div; transform/opacity only; selected pin only, not all pins simultaneously
- Callout card cycling text -- AnimatePresence cycling between sport label and venue name on 2.5s interval; width 130px to 160px; ResizeObserver clip-path auto-adjusts
- Font upgrade -- Inter to Geist via one-line change in app/layout.tsx
- Bottom sheet logo refinement -- ambient blue glow when sheet open; optionally slow breathing gradient on 5s idle; preserve existing sweep animation

**Defer to future milestone:**
- Logo API (Brandfetch/Logo.dev) -- requires schema migration, server-side cache, data quality validation; do not build in v1.5
- Remove to review prompt (Feature 9) -- simple but dependent on TO DO overlay; can be included in v1.5 if overlay ships early

### Architecture Approach

Five of eight features directly modify Etusivu.tsx (1150 lines) -- the blast-radius file for v1.5. Phases must execute sequentially on this file. Recommended component extractions (CalloutCard.tsx, TodoOverlay.tsx, LajiPillRow.tsx) reduce future blast radius. Icon consolidation belongs in lib/lajit.ts by adding Icon: LucideIcon to LajiKonfig -- use import type to keep the module server-safe. Three icon sources currently exist out of sync (lib/lajit.ts, lib/sportPins.ts, DiagonaalKortti.tsx); the overhaul unifies them.

**Major components and their v1.5 changes:**
1. lib/sportPins.ts -- gradient in buildPinSvg(), visual update to clusterPinUrl(), optional stroke color parameter for sport icon colorization
2. app/globals.css -- @keyframes pin-pulse; .no-scrollbar for pill row; all looping animations must use transform/opacity only
3. app/components/Etusivu.tsx -- callout cycling state (nearCandidates, cycleIdx), todoOverlayOpen state, toolbar button swap, filter UI simplification; touched by Phases 2/4/5
4. app/components/TodoOverlay.tsx -- new component; z-index 70 (above PaikkaSheet at 66); bottom-up slide animation; receives todoIds, paikat, onToggleTodo from Etusivu
5. app/components/LajiPillRow.tsx -- new component; layoutId sport-active-bg inside LayoutGroup; scoped to avoid collision with vc-{id} layoutId in CalloutCard/PaikkaSheet
6. lib/lajit.ts -- add Icon: LucideIcon to LajiKonfig; use import type so app/page.tsx (Server Component) importing LAJIT_FILTTERI is unaffected

### Critical Pitfalls

1. **Looping CSS animation on pins causes full repaint on Android** -- Any looping @keyframes on .gmap-pin or AdvancedMarker content must use ONLY transform and opacity. Never box-shadow, background, border-color, or filter on looping animations. Static will-change: transform on .gmap-pin in CSS exhausts GPU compositing layer budget at 80+ pins -- use JS to add/remove will-change dynamically on animation start/end only.

2. **Mixing @googlemaps/markerclusterer with React-managed markers creates double pins** -- The library is installed but unused. If activated alongside existing mapItems + AdvancedMarker rendering, every venue appears twice with broken click handlers. Decision: extend clusterPinUrl() visually only. Never layer the two systems.

3. **Converting /suosikit to overlay-only breaks PWA deep links and auth redirects** -- Keep /suosikit/page.tsx as a real Next.js route. Toolbar button calls setTodoOverlayOpen(true) instead of navigating. Serwist precaches the route -- do not delete it. Audit all three existing href=/suosikit references -- only the Etusivu toolbar reference changes.

4. **Framer Motion layoutId loses snapshot on fast pan+tap** -- layoutId=vc-{p.id} connects CalloutCard to PaikkaSheet. If the map re-renders during tap, AnimatePresence may unmount the card before PaikkaSheet mounts and the expand animation starts from top-left. Do not break the existing zoomRef/zoomLevel debounce. Extend the pendingValittuRef pattern rather than adding competing state paths.

5. **sessionStorage scroll state versioning required when removing filter keys** -- Do NOT remove searchKertakaynti/searchAukinyt state vars -- the etusivu-scroll-state sessionStorage restore logic reads them. Add _v: 2 version field to the scroll state JSON and bail out in the restore effect on version mismatch -- prevents silent filter-active-but-invisible bug for mid-session users across the v1.5 deploy.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Visual Foundation -- Pin Gradient + Glow + Font
**Rationale:** Standalone changes to lib/sportPins.ts, app/globals.css, and app/layout.tsx. No dependencies on other v1.5 features. Establishes the blue visual language that all subsequent phases build on.
**Delivers:** Blue gradient pins, CSS pulse on selected pin, Geist font, updated cluster pin visual via clusterPinUrl().
**Addresses:** Table stakes (gradient pins, colorful icons) and differentiators (glow animation, font upgrade).
**Avoids:** Pitfall 1 (looping animations on pins), Pitfall 12 (static will-change). Verify with 4x CPU throttle and Paint Flashing in DevTools before shipping.

### Phase 2: Callout Card Cycling
**Rationale:** Depends on Phase 1 upgraded pin visuals. State changes confined to Etusivu.tsx (new nearCandidates, cycleIdx) and optional extraction of CalloutCard.tsx. Width increase 130px to 160px.
**Delivers:** Animated callout cycling between sport label and venue name on 2.5s interval; wider card; CSS.supports fallback for Safari 15 clip-path: path() (Pitfall 11).
**Avoids:** Pitfall 4 (layoutId snapshot loss) -- preserve the existing zoomRef debounce pattern; no new layoutId on AdvancedMarker content.

### Phase 3: Sport Icon Consolidation
**Rationale:** lib/lajit.ts changes are consumed by DiagonaalKortti.tsx, which is used inside TodoOverlay (Phase 4). Must complete before the overlay. Consolidates three out-of-sync icon sources.
**Delivers:** Icon: LucideIcon field in LajiKonfig; DiagonaalKortti.tsx removes local SPORT_ICONS map; unified icon source of truth.
**Avoids:** Server-component import issue -- import type (type-only) keeps app/page.tsx unaffected.

### Phase 4: TO DO Overlay
**Rationale:** Most complex feature; modifies Etusivu.tsx heavily. Must not run in parallel with Phases 2 or 5. New TodoOverlay.tsx at z-index 70.
**Delivers:** TodoOverlay.tsx with bottom-up slide animation, backdrop, swipe-to-close; toolbar bookmark button with count badge; optional Remove to review prompt for authenticated users.
**Avoids:** Pitfall 5 (PWA/auth breakage) -- /suosikit/page.tsx survives intact; TodoOverlay at z-[70] closes when PaikkaSheet opens.

### Phase 5: Filter UI Simplification
**Rationale:** Last phase touching Etusivu. Removing filter buttons is low-risk but requires sessionStorage versioning. LajiPillRow.tsx is a new isolated component.
**Delivers:** LajiPillRow.tsx animated sport pill row with shared layoutId background; Kertakäynti OK and Auki nyt buttons removed from visible UI; _v: 2 sessionStorage version field added.
**Avoids:** Pitfall 10 (sessionStorage filter state breakage) -- version the scroll state JSON; keep state vars alive but hidden.

### Phase Ordering Rationale

- Phase 1 before all others: blue visual language is the foundation; HTML element pin migration (if chosen) enables colorful icons and glow animation
- Phase 2 after Phase 1: callout card should display with upgraded pin visuals
- Phase 3 before Phase 4: LajiKonfig.Icon is consumed by DiagonaalKortti used inside TodoOverlay
- Phase 4 before Phase 5: both heavily modify Etusivu; sequential reduces merge conflict risk
- Bottom sheet logo refinement (Feature 7) can slot into Phase 1 or as a standalone micro-phase -- only touches AktiiviLogo.tsx; keep minimum 800ms between gradient index changes (Pitfall 8)
- Logo API: do not include in v1.5 roadmap; schedule as a separate spike after website_domain data quality check

### Research Flags

Phases likely needing attention during planning:
- **Phase 4 (TO DO Overlay):** Most complex; three separate files reference /suosikit; useTodoList hook extraction recommended; test PWA back-button behavior explicitly
- **Phase 2 (Callout Cycling):** nearCandidates computation changes nearestCardId semantics; verify no regression in layoutId to PaikkaSheet expand animation; test Safari 15 clip-path fallback

Phases with standard patterns (low planning risk):
- **Phase 1 (Pin Gradient + Font):** All changes in two files; well-documented SVG gradient and next/font patterns
- **Phase 3 (Icon Consolidation):** Mechanical refactor; TypeScript compiler catches missed references
- **Phase 5 (Filter UI):** New component in isolation; sessionStorage versioning is a one-line guard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase inspection; all packages confirmed at correct versions; Geist confirmed on Google Fonts with Finnish character support |
| Features | HIGH | Features grounded in existing codebase with line citations; dependency graph explicit; anti-features identified with specific technical reasons |
| Architecture | HIGH | Based on direct codebase inspection of 1150-line Etusivu.tsx and all affected files; z-index stack documented; build order validated against dependency graph |
| Pitfalls | HIGH | Each pitfall tied to specific line numbers and mechanisms in the existing code; not generic advice |

**Overall confidence:** HIGH

### Gaps to Address

- **HTML element pin migration scope:** FEATURES.md calls it a critical prerequisite for glow animation and colorful icons; ARCHITECTURE.md and STACK.md treat it as optional (CSS-only path also viable). Decide at Phase 1 planning: if CSS-only, colorful icon stroke must be parameterized in buildPinSvg() rather than set at JSX render time.
- **Brandfetch Finnish venue coverage:** Unverified. Before any future Logo API spike, query Brandfetch index for top 10 Finnish gym chains. If less than 50% return valid logos, the feature is not worth the schema migration.
- **app/page.tsx server-component safety of LucideIcon import:** ARCHITECTURE.md flags this but does not confirm. Verify that import type LucideIcon in lib/lajit.ts does not cause a Next.js 14 server bundle warning when app/page.tsx imports LAJIT_FILTTERI from the same file.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection -- Etusivu.tsx (1150 lines), sportPins.ts, lajit.ts, PaikkaSheet.tsx, AktiiviLogo.tsx, Karuselli.tsx, DiagonaalKortti.tsx, SuosikitClient.tsx, globals.css, types.ts, package.json
- https://www.npmjs.com/package/@googlemaps/markerclusterer -- v2.6.2 confirmed in package.json
- https://visgl.github.io/react-google-maps/examples/marker-clustering -- AdvancedMarker + MarkerClusterer integration patterns
- https://github.com/visgl/react-google-maps/discussions/404 -- unmemoized setMarkerRef infinite loop footgun confirmed
- https://fonts.google.com/specimen/Geist -- latin subset, variable 100-900 confirmed
- https://www.framer.com/motion/animate-presence/ -- popLayout mode confirmed in v10+

### Secondary (MEDIUM confidence)
- https://brandfetch.com/developers/logo-api -- 500K free/month, no attribution required; Finnish chain coverage unverified
- https://developers.hubspot.com/changelog/upcoming-sunset-of-clearbits-free-logo-api -- Clearbit dead Dec 8 2025
- https://fonts.google.com/specimen/Plus+Jakarta+Sans -- evaluated and rejected in favor of Geist

### Tertiary (informational)
- https://mapuipatterns.com/call-out/ -- UX pattern reference for callout card cycling
- https://mapuipatterns.com/cluster-marker/ -- cluster UX patterns

---
*Research completed: 2026-05-31*
*Ready for roadmap: yes*
