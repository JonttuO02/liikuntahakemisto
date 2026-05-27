# Phase 13: Uusi korttimalli - Research

**Researched:** 2026-05-27
**Domain:** CSS clip-path diagonal layout, Google Static Maps API, React/Framer Motion component patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** CSS clip-path diagonal split — both sides angled, meeting in middle
- **D-02:** 60/40 split — info left (60%), map right (40%)
- **D-03:** Fixed h-32 (128px) height, ellipsis for overflow
- **D-04:** New component `DiagonaalKortti.tsx`; `PaikkaKortti.tsx` unchanged
- **D-05:** Import utilities directly — no shared wrapper
- **D-06:** Fallback if no lat/lng: lajiKonfig.color background + LucideIcon centered
- **D-07:** Static Maps 200×128px zoom=15 scale=2, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, client-side `<img>` tag
- **D-08:** Entire card is a `<Link href={/paikat/${paikka.id}}>`
- **D-09:** No HeartButton/favorites in DiagonaalKortti
- **D-10:** whileHover scale 1.02 duration 0.18, whileTap scale 0.98

### Claude's Discretion

- Static Maps URL exact form (marker color, marker size, map type — roadmap or terrain)
- clip-path exact geometry (e.g., `polygon(0 0, 58% 0, 63% 100%, 0 100%)` for left)
- Left panel inner padding (p-3 vs p-4)
- Map image alt text for accessibility

### Deferred Ideas (OUT OF SCOPE)

- Animated Static Maps image loading (skeleton/blur-up) — possible v1.3 optimization
- DiagonaalKortti in search panel (Phase 12's overlay) — Phase 12 uses PaikkaKortti
- Favorites feature in DiagonaalKortti — not Phase 13 scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-11 | Etusivun hakukorttilista käyttää uutta diagonaalista korttimallia: vasen puoli sisältää paikan tiedot (nimi, laji, hinta, aukiolo, etäisyys), oikea puoli näyttää Google Static Maps -snapshоtin paikan sijainnista pin-ikonin kanssa — kartan zoom-kortit (MAP-06) pysyvät ennallaan | clip-path diagonal split pattern (D-01–D-03), Static Maps API (D-07), Etusivu integration replacing PaikkaKortti with DiagonaalKortti in the card list |
</phase_requirements>

---

## Summary

Phase 13 creates `DiagonaalKortti.tsx`, a new fixed-height (h-32) card component using CSS clip-path to produce a diagonal split between a left info panel (60%) and a right Google Static Maps image panel (40%). The new component replaces `PaikkaKortti` only in Etusivu's search card list — PaikkaKortti remains unchanged for the search-panel overlay that Phase 12 introduced.

The technical core is two `position: absolute`-filled child divs inside a `position: relative` outer wrapper, each clipped with complementary `polygon()` values to create the seamless diagonal join. The outer wrapper carries the `.glass .glass-hover rounded-2xl overflow-hidden` surface and the `motion.div` animation; `overflow-hidden` on the wrapper is critical — it prevents clip-path geometry from bleeding outside the rounded corners.

The integration point in `Etusivu.tsx` is the search-results card list at line 798 (`searchSuodatettu.map(p => <PaikkaKortti .../>)`). That `PaikkaKortti` import and usage is swapped for `DiagonaalKortti`, which requires only `paikka` and `distanceStr` props (no HeartButton wiring needed).

**Primary recommendation:** Implement the diagonal split with two `position: absolute; inset: 0` children using complementary polygon clip-paths. Use `roadmap` map type at `zoom=15&scale=2` for the Static Maps URL. Constrain left panel content to `line-clamp-1` for name, single-line rows for price and status — the 128px fixed height leaves no room for multiline text.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Diagonal card layout | Browser / Client | — | Pure CSS clip-path + Framer Motion on a 'use client' component |
| Google Static Maps image | Browser / Client | — | Client-side `<img src>` tag with NEXT_PUBLIC_ key; no server proxy |
| Info data (nimi, laji, hinta, aukiolo, etäisyys) | Browser / Client | — | Data flows from server-fetched paikat prop through Etusivu to DiagonaalKortti |
| Fallback (no lat/lng) | Browser / Client | — | Laji color background + LucideIcon, no external call needed |
| Etusivu card list swap | Browser / Client | — | Import swap at integration point in Etusivu.tsx |
| MAP-06 zoom-cards | Browser / Client | — | Separate component — not touched in this phase |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | ^12.38.0 | whileHover, whileTap, variants | Already used in PaikkaKortti; korttiVariants pattern is established |
| lucide-react | ^1.16.0 | LucideIcon type, sport icons, MapPin | Already used; SPORT_ICONS record already defined in PaikkaKortti |
| next/link | 14.2.35 | Card-level Link wrapping entire surface | Established Next.js routing pattern |
| tailwindcss | ^3.4.1 (v3) | Layout, spacing, line-clamp | Project standard; v3 — no v4 imports |

### No new packages required

This phase installs zero new dependencies. All required utilities (`lajiKonfig`, `hintateksti`, `cn`, `getOpenStatus`, `isMembershipOnly`) are already in the codebase. The Google Static Maps API is accessed via a plain `<img>` tag — no SDK needed. [VERIFIED: codebase grep + package.json]

---

## Package Legitimacy Audit

> No external packages are installed in this phase. Audit section is not applicable.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Etusivu.tsx (client component)
  │
  ├── searchSuodatettu (filtered Liikuntapaikka[])
  │     └── distancesMap[p.id] → distanceStr
  │
  └── <DiagonaalKortti paikka={p} distanceStr={...} />
        │
        ├── motion.div (outer wrapper)
        │     className="glass glass-hover rounded-2xl overflow-hidden relative h-32 cursor-pointer"
        │     whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        │
        └── <Link href={`/paikat/${paikka.id}`} className="absolute inset-0">
              ├── LEFT PANEL (position: absolute, inset: 0)
              │     clip-path: polygon(0 0, 62% 0, 57% 100%, 0 100%)
              │     p-3, flex col, z-10
              │     ├── sport pill (laji.color bg, laji.label, LucideIcon)
              │     ├── nimi (font-bold text-sm line-clamp-1)
              │     ├── open status (green dot + hours / "Suljettu" / nothing)
              │     ├── price (hintateksti / hinta_kuvaus / "vain jäsenyys")
              │     └── distanceStr (MapPin icon + distance)
              │
              └── RIGHT PANEL (position: absolute, inset: 0)
                    clip-path: polygon(57% 0, 100% 0, 100% 100%, 52% 100%)
                    overflow: hidden
                    IF lat/lng present:
                      <img src={staticMapsUrl} className="w-full h-full object-cover" />
                    IF no lat/lng:
                      background-color: laji.color
                      <LucideIcon className="text-white w-8 h-8" centered />
```

### Recommended Project Structure

```
app/components/
├── DiagonaalKortti.tsx     ← NEW — this phase
├── PaikkaKortti.tsx        ← UNCHANGED
└── Etusivu.tsx             ← MODIFIED: import swap at search card list
```

---

### Pattern 1: CSS clip-path Diagonal Split (Both Sides Angled)

**What:** Two absolutely-positioned panels inside a `relative overflow-hidden` wrapper. Each panel uses a `polygon()` clip-path that creates a diagonal cut. The left panel's right boundary and the right panel's left boundary share the same diagonal line, creating a seamless visual join.

**When to use:** Fixed-height cards where the split must be consistent across all screen sizes.

**Geometry for 60/40 split at 128px height:**

The diagonal spans from a point at roughly 60% from the top to roughly 55% from the bottom (a ~5% horizontal offset across 128px ≈ 6.4px lean, creating a subtle angle). The exact values below are the recommended starting point — Claude's Discretion per D-01 allows minor adjustment.

```tsx
// Source: MDN clip-path + CLAUDE.md D-01/D-02 requirements
// Left panel: occupies left ~60%, right edge is diagonal (top-right at 62%, bottom-right at 57%)
<div
  className="absolute inset-0 z-10 flex flex-col gap-1.5 p-3"
  style={{ clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)' }}
>
  {/* info content */}
</div>

// Right panel: fills remainder, left edge mirrors the diagonal
<div
  className="absolute inset-0 overflow-hidden"
  style={{ clipPath: 'polygon(57% 0, 100% 0, 100% 100%, 52% 100%)' }}
>
  {/* map image or fallback */}
</div>
```

**Key insight — why these specific values work:**
- Top seam: left panel top-right = 62%, right panel top-left = 57% → 5% overlap at the top
- Bottom seam: left panel bottom-right = 57%, right panel bottom-left = 52% → the overlap creates the visual diagonal join
- Both panels render behind each other; the overlap zone is intentional and creates a sharp diagonal line visually
- `overflow-hidden` on the outer wrapper ensures the polygon shapes are clipped to the rounded corners

[ASSUMED — specific percentage values are a recommended starting point; implementer should verify visual result and adjust if needed]

**Alternative geometry (if the lean needs to be more pronounced):**
```
Left:  polygon(0 0, 65% 0, 58% 100%, 0 100%)
Right: polygon(58% 0, 100% 0, 100% 100%, 51% 100%)
```

**Browser compatibility:** `clip-path: polygon()` is supported in all modern browsers (Chrome 55+, Firefox 54+, Safari 9.1+, Edge 79+). [CITED: developer.mozilla.org/en-US/docs/Web/CSS/clip-path]

---

### Pattern 2: Google Static Maps `<img>` Tag

**What:** A plain HTML `<img>` tag with a Google Static Maps URL as `src`. No JavaScript Maps SDK required. The API returns a PNG/JPEG image.

**Recommended URL (Claude's Discretion — roadmap type, red marker):**

```tsx
// Source: CONTEXT.md D-07 + developers.google.com/maps/documentation/maps-static/start
const staticMapsUrl = (lat: number, lng: number) =>
  `https://maps.googleapis.com/maps/api/staticmap` +
  `?center=${lat},${lng}` +
  `&zoom=15` +
  `&size=200x128` +
  `&scale=2` +
  `&maptype=roadmap` +
  `&markers=color:red%7C${lat},${lng}` +
  `&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`

// Usage:
<img
  src={staticMapsUrl(paikka.latitude!, paikka.longitude!)}
  alt={`Karttakuva: ${paikka.nimi}`}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

**Why `roadmap` (not `terrain`):** Roadmap is the default, most readable map type for showing a street-level pin. Terrain adds topographic detail that is visually noisy at zoom=15 in a 200×128 thumbnail.

**Why `scale=2`:** scale=2 doubles the pixel resolution to 400×256, which renders crisply on Retina/HiDPI screens. The CSS display size remains 200×128 (controlled by `object-cover` + container h-32). [CITED: developers.google.com/maps/documentation/maps-static/start]

**Why `loading="lazy"`:** The card list may contain many items. Lazy loading defers image fetches until the card enters the viewport, reducing initial page weight.

**Marker color syntax:** The `|` separator in the markers parameter must be URL-encoded as `%7C` in template literals to avoid URL parsing issues. Both `color:red` (named color) and `color:0xFF0000` (hex) are accepted. [CITED: developers.google.com/maps/documentation/maps-static/start]

**Alt text (accessibility — Claude's Discretion):** `alt={`Karttakuva: ${paikka.nimi}`}` — descriptive in Finnish, matching the app language.

---

### Pattern 3: HTTP Referrer Restrictions and `<img>` Tag

**Critical finding:** The existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is already configured with HTTP referrer restrictions (it is used by `APIProvider` in `MapProvider.tsx` for the Maps JS API). The STATE.md notes this as a confirmed open question.

**What the docs say:** Modern browsers restrict the `Referer` header to Origin for cross-origin requests; for some requests they omit it entirely. If the API key has HTTP referrer restrictions, this can cause Static Maps `<img>` requests to fail with "RefererNotAllowedMapError" because the browser's `Referer` header may not match the configured allowed domain. [CITED: developers.google.com/maps/api-security-best-practices]

**Practical recommendation (Claude's Discretion):**

1. **Test first:** The key already works for `APIProvider` (which makes browser-side requests). If the referrer restriction allows `https://yourdomain.com/*`, most browser `<img>` requests will send `Referer: https://yourdomain.com/` and pass. In development (`localhost`), the Referer may be empty — plan for this.

2. **If images fail in dev but work in production:** Add `localhost` to the key's allowed referrers in Google Cloud Console, or test with a `localhost` exemption during development only.

3. **If images fail in production:** The safest path is to create a second API key with no HTTP referrer restriction, restricted only to the Static Maps API service (not the JS API). This is the recommended Google security guidance for Static Web APIs used in `<img>` tags. [CITED: mapsplatform.google.com/resources/blog/google-maps-platform-best-practices-securing-api-keys-when-using-static-maps-and-street-view-apis]

4. **For the plan:** The plan should include a verification step — render DiagonaalKortti with a known place that has coordinates and confirm the image loads. If it does not load, the plan should include a task to configure API key restrictions. [ASSUMED — actual referrer config on this project's key is not known to the researcher]

---

### Pattern 4: Framer Motion with clip-path (no conflict)

**What:** `motion.div` with `whileHover={{ scale: 1.02 }}` on the outer wrapper does NOT conflict with the inner `clip-path` on child divs. Framer Motion's scale transform applies at the wrapper level; clip-path is a paint-level property on each child.

**Potential conflict to avoid:** Do not apply Tailwind `transition-` classes on the same element as Framer Motion animations. The `glass` and `glass-hover` classes use CSS `transition: box-shadow 180ms ease, transform 180ms ease` — this could conflict with Framer Motion's transform animation on the wrapper. Solution: apply `glass glass-hover` normally (the box-shadow transition is fine), but ensure no separate Tailwind `transition-transform` class is added.

**Clip-path is NOT hardware accelerated** in all browsers. For 128px fixed-height cards with a `whileHover` scale that triggers often (card list), this is acceptable — clip-path is a static property, not animated. [ASSUMED — no layout jank expected for static clip-path on scale hover]

**Pattern from SKILL.md (Emil Kowalski):** `scale()` scales children proportionally. The clip-path values are percentage-based, so they scale correctly with the wrapper. No layout animations needed.

---

### Pattern 5: Liikuntapaikka Type — latitude/longitude Optionality

**Critical finding from `lib/types.ts`:**

```ts
export type Liikuntapaikka = {
  latitude: number | null    // ← CAN BE NULL
  longitude: number | null   // ← CAN BE NULL
  ...
}
```

Both `latitude` and `longitude` are explicitly `number | null`. **Not all places have coordinates.** The fallback (D-06) is required, not optional. The implementation must check `paikka.latitude != null && paikka.longitude != null` before constructing the Static Maps URL. [VERIFIED: codebase — lib/types.ts]

---

### Pattern 6: LucideIcon Usage

**Established pattern from PaikkaKortti.tsx:**

```tsx
// Source: app/components/PaikkaKortti.tsx (lines 24-32)
import { MapPin, Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SPORT_ICONS: Record<string, LucideIcon> = {
  padel:         Zap,
  kuntosali:     Dumbbell,
  jooga:         Leaf,
  uinti:         Waves,
  tennis:        Target,
  liikuntahalli: Building2,
  liikunta:      Activity,
}

// Usage:
const Icon = SPORT_ICONS[paikka.laji] ?? Activity
<Icon className="w-3 h-3" />
```

DiagonaalKortti should replicate this SPORT_ICONS record directly (D-05: no shared wrapper). [VERIFIED: codebase — app/components/PaikkaKortti.tsx]

**For the fallback right panel (no coordinates):** The same `Icon` variable used for the sport pill doubles as the centered fallback icon on the right panel. Size should be larger — `w-8 h-8` — centered with `flex items-center justify-center`.

---

### Pattern 7: Etusivu Integration Point

**Exact location in Etusivu.tsx (lines 797–809):**

```tsx
// Source: app/components/Etusivu.tsx lines 797-809 — THIS IS WHERE THE SWAP HAPPENS
{searchSuodatettu.length > 0 ? (
  <div className="flex flex-col gap-3">
    {searchSuodatettu.map(p => (
      <PaikkaKortti          // ← SWAP TO DiagonaalKortti
        key={p.id}
        paikka={p}
        distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
        aukinyt={searchAukinyt}
        isSuosikki={suosikitIds.has(p.id)}
        onToggleSuosikki={toggleSuosikki}
      />
    ))}
  </div>
)}
```

**Props that change:**
- `aukinyt`, `isSuosikki`, `onToggleSuosikki` → **removed** (DiagonaalKortti has no HeartButton, D-09)
- `paikka` and `distanceStr` → **kept** (same types)

**Import changes in Etusivu.tsx:**
- Add `import DiagonaalKortti from './DiagonaalKortti'`
- Remove `import PaikkaKortti from './PaikkaKortti'` only if PaikkaKortti is no longer used elsewhere in Etusivu — **check: PaikkaKortti is currently the only card import** so it CAN be replaced, but verify no other usage exists in the file.

After checking `Etusivu.tsx`: `PaikkaKortti` appears only once (line 800). The import at line 27 can be replaced with `DiagonaalKortti`. [VERIFIED: codebase — app/components/Etusivu.tsx]

**MAP-06 zoom-cards (lines 396–411 in Etusivu.tsx):** These use inline `motion.div` elements directly inside `AdvancedMarker`, not PaikkaKortti. They are not affected by this phase. [VERIFIED: codebase — app/components/Etusivu.tsx]

---

### Pattern 8: korttiVariants Stagger Animation

**Existing pattern from PaikkaKortti.tsx:**

```tsx
// Source: app/components/PaikkaKortti.tsx (lines 14-22)
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export const korttiVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}
```

DiagonaalKortti should export its own `diagonaalKorttiVariants` with the same structure. The stagger container in Etusivu wraps the card list — if the parent uses `staggerChildren`, DiagonaalKortti needs `variants` set to pick up the stagger. However, looking at `Etusivu.tsx`, the current card list (`<div className="flex flex-col gap-3">`) is NOT a `motion.div` with stagger — it's a plain div. The stagger animation from PaikkaKortti is configured via `variants` but there is no parent motion container providing `staggerChildren`. This means the `variants` on each card are independent — they animate individually as they mount.

**Recommendation:** DiagonaalKortti can export `diagonaalKorttiVariants` mirroring PaikkaKortti's structure. Apply `variants={diagonaalKorttiVariants}` on the outer `motion.div`. This future-proofs for a stagger container without requiring changes to Etusivu today.

---

### Pattern 9: Content Layout for 128px Fixed Height

With `h-32` (128px) as the card height, the left panel at `p-3` (12px padding) gives 128 - 24 = 104px of usable height. Content rows to fit:

| Row | Element | Height estimate |
|-----|---------|-----------------|
| 1 | Sport pill (text-[10px] font-bold px-2.5 py-1) | ~22px |
| 2 | Venue name (text-sm font-bold line-clamp-1) | ~20px |
| 3 | Open status (text-xs) | ~18px |
| 4 | Price (text-sm font-bold) | ~20px |
| 5 | Distance (text-xs with MapPin icon) | ~18px |

Total: ~98px — fits within 104px with `gap-1` between rows. Use `gap-1` (4px) not `gap-2.5` (10px) — the 128px constraint is tight. Address (osoite) from PaikkaKortti should be **omitted** in DiagonaalKortti to fit within height. [ASSUMED — actual pixel heights depend on font rendering; implementer should verify visually]

**line-clamp enforcement:**
- Nimi: `line-clamp-1 overflow-hidden` (D-03 mandates ellipsis for overflow)
- All other rows: single-line only, use `truncate` where needed
- No description (kuvaus) row — omitted in DiagonaalKortti design (not specified in UI-11)

---

### Anti-Patterns to Avoid

- **Do not use `overflow: hidden` on the left/right panel divs** — it is needed only on the outer wrapper. Inner panels need to show their full content without additional clipping layers.
- **Do not use `position: relative` on the left/right panels** — they are both `position: absolute; inset: 0`, which fills the outer wrapper entirely. clip-path handles the visible boundary.
- **Do not apply `.glass` to the inner panels** — the outer wrapper carries the glassmorphism surface. Inner panels should have transparent or solid color backgrounds only.
- **Do not use Tailwind `clip-path` utilities** — Tailwind v3 does not ship clip-path utilities for polygon values; use inline `style={{ clipPath: '...' }}`. [VERIFIED: Tailwind v3 docs — no built-in polygon clip-path utilities]
- **Do not animate clip-path itself** — only the outer wrapper scales on hover. Animating clip-path triggers paint on every frame and can cause jank.
- **Do not add `transition-transform` Tailwind class** on the motion.div — conflicts with Framer Motion's transform control.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sport label + color | Custom sport-to-color map | `lajiKonfig[paikka.laji]` from `lib/lajit.ts` | Single source of truth; 9 sports already mapped |
| Open/closed status | Time comparison logic | `getOpenStatus(paikka.aukioloajat)` from `lib/aukiolo.ts` | Handles edge cases (overnight hours, missing data, no-data) |
| Price text | Custom price formatter | `hintateksti(paikka.hinta_min, paikka.hinta_max)` + `isMembershipOnly(paikka)` from `lib/utils.ts` + `lib/priceUtils.ts` | Handles min/max, membership-only heuristic, null cases |
| Class merging | String concatenation | `cn(...)` from `lib/utils.ts` | Tailwind class conflicts resolved correctly |
| LucideIcon type | Custom icon interface | `type { LucideIcon } from 'lucide-react'` | Already in the project; PaikkaKortti pattern |

**Key insight:** DiagonaalKortti replicates PaikkaKortti's import pattern verbatim (D-05). The only novel logic is the clip-path geometry and Static Maps URL construction.

---

## Common Pitfalls

### Pitfall 1: clip-path seam gap (1px white line between panels)

**What goes wrong:** A 1-pixel white line appears between the left and right panels because the clip-path polygons don't overlap — they meet exactly at the boundary.
**Why it happens:** Anti-aliasing at the diagonal boundary creates a sub-pixel gap when the polygons are flush (e.g., left ends at 60%, right starts at 60%).
**How to avoid:** Overlap the polygons by 5–8% (left ends at 62%, right starts at 57%). The background behind both panels is the `.glass` surface — the overlap zone just renders both panels on top of each other, with no visual artifact.
**Warning signs:** Visible in Chrome with zoom != 100%. Test at 110% and 90% zoom.

### Pitfall 2: `overflow-hidden` missing on outer wrapper

**What goes wrong:** The clip-path panels extend beyond the `rounded-2xl` corners of the card, creating sharp corners on a supposedly rounded card.
**Why it happens:** `clip-path` operates within the element's box; `border-radius` clips at the paint step but clip-path can render outside it.
**How to avoid:** `overflow-hidden` on the outer `.glass.rounded-2xl` wrapper ensures content (including clip-path children) is contained within the rounded rect.
**Warning signs:** Card corners appear sharp in the top-left and bottom-right of the diagonal panels.

### Pitfall 3: Static Maps image not loading in development

**What goes wrong:** The `<img>` tag renders but shows a broken image icon.
**Why it happens:** The API key has HTTP referrer restrictions configured for production domains. In development, the browser may send `Referer: http://localhost:3000/` or omit it entirely, failing the allowlist check.
**How to avoid:** Add `http://localhost:3000/*` and `localhost/*` to the API key's allowed referrers in Google Cloud Console during development. Remove before production if desired.
**Warning signs:** Browser DevTools Network tab shows the Static Maps request returning a 403 or an error image.

### Pitfall 4: Framer Motion `y: 14` in variants conflicts with scale

**What goes wrong:** If DiagonaalKortti's variants include `y` movement (like PaikkaKortti's hidden state `y: 14`), the hidden→show animation may look odd when combined with `whileHover scale`.
**Why it happens:** `y` and `scale` are both transform properties; Framer Motion composes them.
**How to avoid:** The `hidden`/`show` variants only fire on initial mount (stagger animation), not on hover. The `whileHover` scale fires on mouse enter. These do not overlap in time — no conflict in practice.
**Warning signs:** Cards appear to "jump" on first render hover.

### Pitfall 5: Content overflow in 128px height

**What goes wrong:** Long venue names wrap to two lines, pushing price/status rows out of the panel.
**Why it happens:** `line-clamp-1` only works with `overflow-hidden` also set. Text can still wrap if `overflow-hidden` is missing.
**How to avoid:** Always pair `line-clamp-1` with `overflow-hidden` on the name element. Use `truncate` (which sets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) as an alternative.
**Warning signs:** Cards where nimi > 30 characters break the layout.

### Pitfall 6: `%7C` vs `|` in Static Maps URL

**What goes wrong:** The Static Maps URL fails to parse markers correctly.
**Why it happens:** Template literal `|` inside a URL query string is treated as a literal character; some browsers/servers may interpret it differently. Google's docs show `|` as the separator.
**How to avoid:** Encode `|` as `%7C` in template literals. Both work, but `%7C` is unambiguous.

---

## Code Examples

### Complete DiagonaalKortti shell (structural pattern)

```tsx
// Source: derived from PaikkaKortti.tsx patterns + CONTEXT.md decisions
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti, cn } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly } from '@/lib/priceUtils'
import type { Liikuntapaikka } from '@/lib/types'

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

export const diagonaalKorttiVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}

const SPORT_ICONS: Record<string, LucideIcon> = {
  padel: Zap, kuntosali: Dumbbell, jooga: Leaf,
  uinti: Waves, tennis: Target, liikuntahalli: Building2, liikunta: Activity,
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

function staticMapsUrl(lat: number, lng: number): string {
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=15&size=200x128&scale=2` +
    `&maptype=roadmap&markers=color:red%7C${lat},${lng}` +
    `&key=${API_KEY}`
  )
}

interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
}

export default function DiagonaalKortti({ paikka, distanceStr }: DiagonaalKorttiProps) {
  const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
  const openStatus   = getOpenStatus(paikka.aukioloajat)
  const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
  const membershipOnly = isMembershipOnly(paikka)
  const priceText    = membershipOnly ? null : (paikka.hinta_kuvaus?.split('\n')[0] ?? (hintaTeksti || null))
  const hasCoords    = paikka.latitude != null && paikka.longitude != null
  const Icon         = SPORT_ICONS[paikka.laji] ?? Activity

  return (
    <motion.div
      variants={diagonaalKorttiVariants}
      className="relative glass glass-hover rounded-2xl overflow-hidden h-32 cursor-pointer"
      whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.12, ease: 'easeOut' } }}
    >
      <Link href={`/paikat/${paikka.id}`} className="absolute inset-0 block">

        {/* LEFT: info panel */}
        <div
          className="absolute inset-0 z-10 flex flex-col gap-1 p-3"
          style={{ clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)' }}
        >
          {/* sport pill */}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white self-start truncate max-w-full"
            style={{ backgroundColor: laji.color }}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {laji.label}
          </span>

          {/* venue name */}
          <p className="font-bold text-[#111111] text-sm leading-snug line-clamp-1 overflow-hidden">
            {paikka.nimi}
          </p>

          {/* open status */}
          {openStatus.status === 'open' && (
            <span className="text-xs font-bold text-green-700 truncate">
              Auki · {openStatus.hours}
            </span>
          )}
          {openStatus.status === 'closed' && (
            <span className="text-xs text-[rgba(17,17,17,0.45)] truncate">Suljettu</span>
          )}

          {/* price */}
          {membershipOnly ? (
            <span className="text-xs text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
          ) : priceText ? (
            <span className="text-xs font-bold text-[#111111] tabular-nums truncate">{priceText}</span>
          ) : (
            <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
          )}

          {/* distance */}
          {distanceStr && (
            <div className="flex items-center gap-1 text-xs text-[rgba(17,17,17,0.4)] mt-auto">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="tabular-nums">{distanceStr}</span>
            </div>
          )}
        </div>

        {/* RIGHT: map image or fallback */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: 'polygon(57% 0, 100% 0, 100% 100%, 52% 100%)' }}
        >
          {hasCoords ? (
            <img
              src={staticMapsUrl(paikka.latitude!, paikka.longitude!)}
              alt={`Karttakuva: ${paikka.nimi}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: laji.color }}
            >
              <Icon className="w-8 h-8 text-white opacity-80" />
            </div>
          )}
        </div>

      </Link>
    </motion.div>
  )
}
```

### Etusivu.tsx swap (minimal diff)

```tsx
// Source: app/components/Etusivu.tsx — integration change
// Line 27: replace
- import PaikkaKortti from './PaikkaKortti'
+ import DiagonaalKortti from './DiagonaalKortti'

// Line 800: replace
- <PaikkaKortti
-   key={p.id}
-   paikka={p}
-   distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
-   aukinyt={searchAukinyt}
-   isSuosikki={suosikitIds.has(p.id)}
-   onToggleSuosikki={toggleSuosikki}
- />
+ <DiagonaalKortti
+   key={p.id}
+   paikka={p}
+   distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
+ />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pseudo-element `::before/::after` for diagonal dividers | CSS `clip-path: polygon()` | ~2017 (broad support) | No extra DOM elements, works on any content |
| Google Maps JS SDK for all map displays | Static Maps API `<img>` for thumbnails | Ongoing | No JS overhead; pure HTTP image request |
| Separate "lista" page (`/` route + `?nakyma=lista`) | Integrated card list in Etusivu bottom sheet | Phase 12 | List and map share one view; PaikkaKortti used in search overlay |

**Deprecated/outdated:**
- `?nakyma=kartta` URL parameter: dead parameter per CLAUDE.md — never generate in new code
- `?nakyma=lista` URL route: removed in Phase 12 — do not reference

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | clip-path polygon values (`62%/57%/52%`) produce a visually seamless diagonal join | Pattern 1 | Minor — implementer adjusts percentages; no structural impact |
| A2 | HTTP referrer restrictions on the existing API key will not block Static Maps `<img>` in production | Pattern 3 | Medium — images fail to load; requires API key configuration or creating a second key |
| A3 | Content for 5 rows fits within 104px (128px - 24px padding) at `gap-1` with `text-xs/text-sm` | Pattern 9 | Minor — implementer adjusts gap or font size; visual regression only |
| A4 | No Framer Motion / clip-path jank at scale 1.02 on 128px cards | Pattern 4 | Low — static clip-path on hover scale is not a known performance issue |

---

## Open Questions

1. **Static Maps API key referrer restriction**
   - What we know: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured in `.env.local` with HTTP referrer restrictions (it's used by `APIProvider` for Maps JS API with "HTTP referrer restrictions OK" per CLAUDE.md)
   - What's unclear: Whether the referrer restriction allowlist includes patterns that cover cross-origin `<img>` requests to `googleapis.com`
   - Recommendation: Include a verification task in the plan — render one DiagonaalKortti with a known-coordinate place and confirm the map image loads. If it fails, add a task to configure the key or create a separate key for Static Maps.

2. **Stagger container in Etusivu search results**
   - What we know: The current search results `<div className="flex flex-col gap-3">` is a plain div, not a motion container. PaikkaKortti variants never stagger because there's no `staggerChildren` parent.
   - What's unclear: Whether the phase should add a stagger container to the search results list.
   - Recommendation: Export `diagonaalKorttiVariants` from DiagonaalKortti for future use, but do not add stagger container in this phase — not in UI-11 scope.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| framer-motion | whileHover, variants | ✓ | ^12.38.0 | — |
| lucide-react | LucideIcon, sport icons | ✓ | ^1.16.0 | — |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Static Maps `<img>` | ✓ | configured in .env.local | Fallback to lajiKonfig.color (D-06) |
| Tailwind v3 | Layout, h-32, line-clamp-1 | ✓ | ^3.4.1 | — |

**Missing dependencies with no fallback:** none

**Note on Static Maps in development:** If referrer restrictions block `<img>` in `localhost`, the fallback panel (laji color + icon) will display instead — this is acceptable for development but must be verified before considering Phase 13 complete.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.7 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/` |
| Full suite command | `npx vitest run` |

**Note:** The vitest config includes only `lib/**/*.test.ts`. DiagonaalKortti is a React component — it cannot be unit-tested under the current `environment: 'node'` config without adding jsdom. Component-level testing is out of scope for this phase.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-11 | Diagonal card renders with left info + right map | Manual (visual) | n/a — React component, no jsdom | ❌ Not applicable |
| UI-11 | Fallback renders when lat/lng = null | Manual (visual) | n/a | ❌ Not applicable |
| UI-11 | Entire card is a Link to /paikat/{id} | Manual (click test) | n/a | ❌ Not applicable |
| UI-11 | MAP-06 zoom-cards unchanged | Manual (visual) | n/a | ❌ Not applicable |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/` — ensures utility functions not broken
- **Per wave merge:** `npx vitest run` — full suite
- **Phase gate:** Full suite green + visual verification of DiagonaalKortti in browser before `/gsd:verify-work`

### Wave 0 Gaps
- None for existing lib tests — they already exist and pass
- No new lib tests required for this phase (no new pure functions to test)

*(DiagonaalKortti is a pure UI component — verification is visual/manual per success criteria)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Static Maps URL constructed from `number | null` fields — no user input injected into URL |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposure in client bundle | Information Disclosure | `NEXT_PUBLIC_` key is intentionally client-side; restricted by HTTP referrer + API scope in Google Cloud Console |
| URL injection via paikka.latitude/longitude | Tampering | Both fields are `number | null` typed — TypeScript prevents string injection; number-to-string conversion is safe |

**No new attack surface introduced.** The Static Maps URL uses only numeric coordinates from the database — no user-controlled input. The API key is already in client-side use via `APIProvider`.

---

## Project Constraints (from CLAUDE.md)

- Tailwind v3 — `@tailwind base/components/utilities` directives; no v4 imports, no `tw-animate-css`
- `.glass`, `.glass-hover`, `.glass-btn` utility classes — always use these, never replicate inline
- Color system: `#111111` foreground, `rgba(17,17,17,0.45)` muted, `rgba(0,0,0,0.07)` border
- Animation: `whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}` — scale only, no y-lift (D-10 matches CLAUDE.md)
- `font-bold` is 700 weight only — never semibold (600)
- `text-[10px] font-bold` for badge/pill labels
- `text-sm font-bold` for card names and price
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is the correct env var for client-side Maps usage
- `lib/lajit.ts` is single source of truth for sport labels and colors — never inline sport colors
- `lib/aukiolo.ts` `getOpenStatus` is single source of truth for open status

---

## Sources

### Primary (HIGH confidence)
- `app/components/PaikkaKortti.tsx` — import structure, korttiVariants, SPORT_ICONS, animation patterns
- `app/components/Etusivu.tsx` — integration point, prop types, exact line of swap
- `lib/types.ts` — Liikuntapaikka type (latitude/longitude as `number | null`)
- `lib/lajit.ts` — lajiKonfig structure (.color, .label, .badgeTw)
- `lib/aukiolo.ts` — getOpenStatus signature and return type
- `lib/priceUtils.ts` — isMembershipOnly signature
- `lib/utils.ts` — hintateksti, cn
- `app/globals.css` — .glass, .glass-hover definitions
- `package.json` — confirmed versions: framer-motion 12.38, lucide-react 1.16, tailwindcss 3.4.1
- `.env.local` — NEXT_PUBLIC_GOOGLE_MAPS_API_KEY present
- `CLAUDE.md` — design system constraints, animation principles

### Secondary (MEDIUM confidence)
- [developers.google.com/maps/documentation/maps-static/start](https://developers.google.com/maps/documentation/maps-static/start) — Static Maps URL format, scale parameter, marker options, map types
- [developer.mozilla.org/en-US/docs/Web/CSS/clip-path](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path) — clip-path polygon() syntax and browser support

### Tertiary (LOW confidence)
- [developers.google.com/maps/api-security-best-practices](https://developers.google.com/maps/api-security-best-practices) — HTTP referrer restriction behavior with `<img>` tags (flagged as open question A2)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase, no new packages
- Architecture: HIGH — exact integration points verified by reading source files
- clip-path geometry: MEDIUM — pattern is correct, specific % values are recommendations that need visual verification
- Static Maps API key + referrer: MEDIUM — documented behavior, but project-specific key config unknown
- Pitfalls: HIGH — derived from actual codebase patterns and documented CSS behavior

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (30 days — stable tech stack)
