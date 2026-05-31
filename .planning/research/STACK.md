# Technology Stack — v1.5 Visuaalinen elävöitys & UX-hienosäätö

**Project:** AKTIIVI (liikuntahakemisto)
**Researched:** 2026-05-31
**Scope of this update:** v1.5 additions ONLY. Existing stack (Next.js 14.2.35, @vis.gl/react-google-maps ^1.8.3, @googlemaps/markerclusterer ^2.6.2, framer-motion ^12.38.0, Tailwind v3, TypeScript strict, Supabase, @anthropic-ai/sdk, Serwist) is validated from prior milestones and unchanged.

---

## Feature 1: AdvancedMarker Zoom-Out Clustering

### Situation

The current clustering in `Etusivu.tsx` is a same-address manual cluster (`Record<string, T[]>`): it groups pins at identical coordinates but does NOT cluster by geographic proximity at zoom-out. v1.5 wants zoom-based geographic clustering (cluster icon + count when zoomed out).

### Recommended Approach

**Use `@googlemaps/markerclusterer@2.6.2` (already installed) + its custom renderer.**

The vis.gl team ships two official clustering examples:
1. `marker-clustering` — uses `@googlemaps/markerclusterer` directly with `AdvancedMarkerElement`. The clusterer takes a Map instance and an array of `AdvancedMarkerElement` DOM refs, handles all zoom-based grouping automatically.
2. `custom-marker-clustering` — uses `supercluster` directly, rendering cluster bubbles as custom `<AdvancedMarker>` React components. Full control over cluster SVG appearance at cost of manual algorithm management.

**For AKTIIVI, use approach 1** (MarkerClusterer with AdvancedMarker refs) because:
- `@googlemaps/markerclusterer` is already in `package.json` at v2.6.2.
- In v2.x, the library's `Marker` type union covers both legacy Marker and `AdvancedMarkerElement`, so it works natively with `@vis.gl/react-google-maps` AdvancedMarker components.
- Custom `renderer` option allows the cluster icon to be the same blue-gradient SVG pin from Feature 2.
- Zero new dependencies.

**Do NOT use `@react-google-maps/api`'s MarkerClusterer** — that is the abandoned `@react-google-maps/api` ecosystem, fully incompatible with `@vis.gl/react-google-maps`.

### Integration Pattern

```tsx
// Collect AdvancedMarker DOM refs via imperative AdvancedMarker API
// Feed them to a MarkerClusterer instance managed in a useEffect
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps'

const map = useMap()
const clustererRef = useRef<MarkerClusterer | null>(null)

useEffect(() => {
  if (!map) return
  clustererRef.current = new MarkerClusterer({
    map,
    renderer: { render: ({ count, position }) => buildClusterMarker(count, position) },
  })
  return () => clustererRef.current?.setMap(null)
}, [map])
```

### supercluster (optional, for fully custom rendering path)

If custom-rendering path is chosen instead of MarkerClusterer:

| Package | Version | Notes |
|---------|---------|-------|
| supercluster | 8.0.1 | Mapbox geospatial clustering. Bundles its own TS types since v7+. |
| @types/supercluster | 7.1.3 | DefinitelyTyped supplement (last published 3yr ago but still accurate for v8 API surface) |

**Recommendation:** Start with the `MarkerClusterer` approach — no new package. Add `supercluster` only if the default clustering algorithm (grid-based) proves inadequate for Finnish city density.

### Confidence: HIGH
Official vis.gl examples demonstrate both patterns. `@googlemaps/markerclusterer` is already installed at the correct version and confirmed to support `AdvancedMarkerElement`.

---

## Feature 2: Blue Gradient SVG Pins (Redesign of sportPins.ts)

### Situation

Current pins: `PIN_FILL = '#c0392b'` (red), white circle, grey Lucide icon paths. v1.5 wants a blue gradient + sporty feel.

### Recommended Approach

**Pure SVG — no new library.** Modify `lib/sportPins.ts` only.

Replace the flat `fill="#c0392b"` with a `<linearGradient>` in the SVG `<defs>`:

```svg
<defs>
  <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#2563eb"/>   <!-- blue-600 -->
    <stop offset="100%" stop-color="#0ea5e9"/>  <!-- sky-500 -->
  </linearGradient>
</defs>
<path d="M14 0C6.268 0 0 6.268..." fill="url(#pg)"/>
```

The SVG is embedded as a `data:image/svg+xml` URL string in an `<img>` tag inside AdvancedMarker. SVG `linearGradient` renders correctly in all target browsers (mobile Chrome, Safari) when delivered via data URI. Each marker gets its own self-contained SVG document, so `id="pg"` reuse across multiple simultaneous markers is safe — no ID collision.

White inner circle and Lucide icon strokes stay unchanged — they read well on blue background.

### Confidence: HIGH
SVG linearGradient in data URIs is a standard browser feature with broad support. No library change required.

---

## Feature 3: CSS/SVG Shine/Glow Animation on Selected Pin

### Situation

A "ring pulse" around the selected/active pin edge. Must not degrade scroll/pan performance on mobile.

### Recommended Approach

**Pure CSS `@keyframes` on the AdvancedMarker wrapper div — no new library.**

`@vis.gl/react-google-maps` `<AdvancedMarker>` renders a wrapper `<div>`. Add a `className` prop to that div. Define the animation in `globals.css`:

```css
@keyframes pin-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
}
.pin-pulse {
  animation: pin-pulse 1.6s ease-out infinite;
  border-radius: 50%;
}
```

Apply class only to the selected marker (`valittu?.id === p.id`).

**Do not use SVG `<animate>` for the ring** — the pin is rendered as `<img src={pinUrl(...)}>` inside AdvancedMarker; there is no accessible SVG DOM to attach SMIL animations to. CSS on the wrapper div is the only correct attachment point.

**Do not use Framer Motion for this** — CLAUDE.md animation principles prohibit `spring` physics for non-gesture animations, and a continuous ring pulse is decorative, not gesture-driven. Pure CSS `box-shadow` animation is GPU-composited and will not affect map pan performance.

### Confidence: HIGH
Standard CSS animation pattern; AdvancedMarker wrapper div is confirmed accessible via the `className` prop.

---

## Feature 4: Font Replacement — Inter → Geist

### Situation

Current: `next/font/google` with Inter, CSS variable `--font-sans`. CLAUDE.md typography rules apply to usage (4 sizes, 2 weights), not to the specific typeface. v1.5 wants a more contemporary, sporty feel.

### Recommended Font: Geist

**Geist** by Vercel/Andrés Briganti (released 2023, on Google Fonts since 2024, open source SIL OFL).

| Criterion | Inter | Geist | Why Geist Wins |
|-----------|-------|-------|----------------|
| Variable font (100-900) | Yes | Yes | Same flexibility |
| Available via next/font/google | Yes | Yes | Zero-friction swap |
| Finnish characters (ä, ö) | Yes | Yes (latin subset) | Confirmed |
| Visual personality | Neutral UI workhorse | Geometric, clean, slightly edgier | Better for sports brand |
| Open source license | SIL OFL | SIL OFL | Identical |
| Drop-in for Next.js 14 | — | Trivial | One import rename |

**Why Geist over other Inter alternatives:**
- **DM Sans** — friendly but rounded, reads as consumer app, not sports
- **Satoshi** — not on Google Fonts (requires Fontsource package, adds a dependency)
- **General Sans** — not on Google Fonts
- **Figtree** — friendly/rounded, similar to DM Sans

Geist is the only font that is simultaneously: on Google Fonts, variable weight (100-900), geometric/sporty character, and a trivial drop-in for Inter in Next.js 14.

### Migration (1 file change)

```tsx
// app/layout.tsx
// Before:
import { Inter } from 'next/font/google'
const sans = Inter({ variable: '--font-sans', subsets: ['latin'] })

// After:
import { Geist } from 'next/font/google'
const sans = Geist({ variable: '--font-sans', subsets: ['latin'] })
```

`tailwind.config.ts`, `globals.css`, and all components using `font-sans` are unchanged. The CSS variable name `--font-sans` is preserved.

CLAUDE.md typography constraints (4 sizes, 2 weights: 400 + 700) still apply unchanged.

### Confidence: HIGH
Geist is on Google Fonts with latin subset, documented for Next.js 14 via `next/font/google`, Finnish character support confirmed.

---

## Feature 5: Logo API for Company Logos in CalloutCard

### Situation

Sports venue chains (Elixia, GoGo, Liikuntakeskus) may have company logos fetchable by domain. v1.5 spike: show a small logo in the callout/detail card.

### Clearbit Status

**Clearbit Logo API (logo.clearbit.com) is permanently dead.** Shut down December 8, 2025. Do not implement against it.

### Logo API Comparison

| Provider | Free Tier | Attribution | API Key | Finnish Coverage | Verdict |
|----------|-----------|-------------|---------|------------------|---------|
| **Brandfetch Logo API** | 500K req/month | NOT required | YES (clientId in URL) | Good (index of 15M+ brands) | Recommended |
| **Logo.dev** | 500K req/month | Required on free | YES (token param) | Good | Alternative |
| **Google Favicon API** | Unlimited (undocumented) | Not required | NO | Any domain | Fallback only |
| **geticon.dev** | Unlimited | Not required | NO | Any domain (favicons) | Last resort fallback |

### Recommendation: Brandfetch Logo API (free tier) with dual fallback

**Use Brandfetch Logo API** for the spike:
- 500K req/month free, no attribution requirement on free tier
- Returns proper brand logos (SVG or PNG), not just favicons
- CDN URL pattern: `https://cdn.brandfetch.io/{domain}/w/40/h/40` — safe to use in client `<img>` tags directly, no backend proxy needed
- Finnish chains known to have entries: Elixia, GoGo, Liikuntakeskus, Pajulahti

**ToS:** Brandfetch grants a non-exclusive license to display brand assets for display purposes. Assets remain third-party property. 30-day HTTP cache is permitted. Do not store logos in Supabase Storage — browser HTTP cache is sufficient.

**Mandatory fallback chain:**

```tsx
function VenueLogo({ domain }: { domain: string | null }) {
  const [src, setSrc] = useState(
    domain ? `https://cdn.brandfetch.io/${domain}/w/40/h/40` : null
  )
  if (!src) return null
  return (
    <img
      src={src}
      onError={() => {
        // Step 2: try Google Favicon
        if (src.includes('brandfetch')) {
          setSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`)
        } else {
          setSrc(null) // Step 3: hide
        }
      }}
      width={40} height={40} alt=""
    />
  )
}
```

**Data prerequisite:** The `paikat` Supabase table needs a `website_domain` column (extract from `website_url`, or add manually). If `website_url` is NULL for most records, logo coverage will be low. Verify data quality before committing layout space to logos in the card design.

### No new package required.

### Confidence: MEDIUM
Brandfetch free tier terms and URL pattern confirmed. Finnish company-specific coverage in Brandfetch index is unverified — this is a spike/experiment, not a guarantee.

---

## Feature 6: TO DO Overlay Animation (Button → List → X Dismiss)

### Situation

A TO DO overlay triggered from a button in the toolbar. Not a separate page — an overlay on the map. Button transforms/transitions to an X when open. Smooth open/close animation.

### Recommended Approach

**Framer Motion `AnimatePresence` — no new library.**

The existing codebase already uses `AnimatePresence` and `layoutId` (PaikkaSheet uses `layoutId` for in-place expansion, confirmed in v1.3 Key Decisions).

Two patterns; use Pattern B for this case:

**Pattern A: layoutId morphing (button physically morphs into overlay)**
- Works when button and overlay share a `<LayoutGroup>` ancestor
- Risk: cross-hierarchy layoutId morphs can stutter on low-end Android (the toolbar button and overlay are in different DOM subtrees)
- CLAUDE.md warns: "No `layout` animations unless absolutely required — they cause reflow jank"

**Pattern B: AnimatePresence crossfade + icon swap (recommended)**
```tsx
// Toolbar button area
<AnimatePresence mode="wait">
  {isOpen
    ? <motion.button key="close" onClick={() => setOpen(false)}
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 1, rotate: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}>
        <X size={20} />
      </motion.button>
    : <motion.button key="open" onClick={() => setOpen(true)}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}>
        <Bookmark size={20} />
      </motion.button>
  }
</AnimatePresence>

// Overlay (sibling to map, z-index above it)
<AnimatePresence>
  {isOpen && (
    <motion.div
      key="todo-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}>
      {/* TO DO list items */}
    </motion.div>
  )}
</AnimatePresence>
```

**CLAUDE.md compliance:**
- Icon swap duration: `0.18s ease-out` (hover transition rule)
- Overlay fade: `0.2s ease-out` (view transition rule)
- No spring physics
- `AnimatePresence` children have stable `key` props
- No `height: auto` animation — use opacity only

### No new library needed.

### Confidence: HIGH
Framer Motion AnimatePresence and icon crossfade are already used in the codebase. This is a documented and tested pattern.

---

## New Dependencies Summary

| Package | Action | Version | Justification |
|---------|--------|---------|---------------|
| `supercluster` | OPTIONAL add | `^8.0.1` | Only if custom cluster rendering chosen over MarkerClusterer |
| `@types/supercluster` | OPTIONAL add (devDep) | `^7.1.3` | Pair with supercluster |
| Geist font | No install needed | via `next/font/google` | CDN delivery, no npm package |

**Packages explicitly NOT to add:**
- `use-supercluster` — unnecessary React wrapper; direct `supercluster` is simpler and has 0 extra abstraction cost
- `@react-google-maps/marker-clusterer` — wrong ecosystem (incompatible with `@vis.gl/react-google-maps`)
- `@react-google-maps/api` — abandoned, wrong ecosystem
- Any Lottie or CSS-in-JS animation library — Framer Motion covers everything
- Any Logo.dev SDK, Brandfetch SDK — plain `<img>` CDN URL is sufficient, no JS SDK needed
- `next-google-fonts` or any font package — `next/font/google` is the correct approach

---

## Integration Constraints

| Constraint | Impact on v1.5 |
|------------|----------------|
| Tailwind v3 (not v4) | CSS pulse animation goes in `globals.css` as `@keyframes`, not as a Tailwind `animate-*` utility |
| AdvancedMarker already migrated | MarkerClusterer integration is straightforward; no legacy Marker migration blocker |
| `lib/sportPins.ts` self-contained | SVG gradient change is isolated in one file; no component changes needed |
| Emil Kowalski animation rules (CLAUDE.md) | Pin pulse MUST be CSS (not Framer Motion). Overlay fade ≤ 0.2s. No spring physics. |
| Font variable `--font-sans` must stay | Geist uses same variable name; zero downstream changes to Tailwind or components |
| Brandfetch logo spike | Needs `website_domain` data in Supabase `paikat` table — verify coverage before building card layout |
| Clearbit is dead | Do not reference logo.clearbit.com anywhere in new code |

---

## Sources

- [@googlemaps/markerclusterer npm](https://www.npmjs.com/package/@googlemaps/markerclusterer) — v2.6.2 confirmed
- [vis.gl Marker Clustering example](https://visgl.github.io/react-google-maps/examples/marker-clustering) — AdvancedMarker + MarkerClusterer
- [vis.gl Custom Marker Clustering example](https://visgl.github.io/react-google-maps/examples/custom-marker-clustering) — supercluster path
- [vis.gl Discussion #325 — clustering with AdvancedMarker + InfoWindow](https://github.com/visgl/react-google-maps/discussions/325)
- [supercluster npm](https://www.npmjs.com/package/supercluster) — v8.0.1 confirmed
- [Clearbit Logo API Dead 2026 — context.dev](https://www.context.dev/blog/clearbit-logo-api-dead-2026-migration-guide) — sunset Dec 8 2025 confirmed
- [HubSpot announcement — Clearbit Logo API sunset](https://developers.hubspot.com/changelog/upcoming-sunset-of-clearbits-free-logo-api)
- [Logo.dev pricing](https://www.logo.dev/pricing) — 500K free, attribution required on free tier
- [Brandfetch Logo API](https://brandfetch.com/developers/logo-api) — 500K free, no attribution required
- [Brandfetch ToS](https://brandfetch.com/terms) — non-exclusive license, 30-day cache permitted
- [Google Favicon API (hidden)](https://www.google.com/s2/favicons) — no key, no documented rate limit
- [Geist on Google Fonts](https://fonts.google.com/specimen/Geist) — latin subset, variable 100-900
- [Geist in Next.js 14 guide](https://peerlist.io/blog/engineering/how-to-use-vercel-geist-font-in-nextjs)
- [Framer Motion AnimatePresence](https://www.framer.com/motion/animate-presence/)
