# Phase 29: Kortit & sheet redesign — Research

**Researched:** 2026-06-04
**Domain:** React/Framer Motion component redesign — CSS animations, scroll-snap carousels, collapsible expand/collapse, layout restructuring
**Confidence:** HIGH

## Summary

Phase 29 is a purely visual redesign of three existing client components with no new data sources, routes, or external packages required. All dependencies (framer-motion 12.38.0, lucide-react 1.16.0) are already installed and contain every required icon and API. The phase introduces a hero carousel at the top of PaikkaSheet, a CSS marquee price strip in PaikkaKortti, and placeholder visuals in DiagonaalKortti.

The most technically interesting constraint is the `AnimatePresence` expand/collapse for the review widget. CONTEXT.md (D-14) specifies `height: 'auto'` for the expanded state — CLAUDE.md warns against this pattern — but the framer-motion 12 `motion.div` does support `height: 'auto'` as an animate target using its built-in ResizeObserver-based measurement. The risk is zero layout jank because the element is inside `overflow-y-auto` scroll area (not a layout-position-affecting ancestor), and `overflow: hidden` on the wrapper prevents paint overflow during animation. This is the right call.

The CSS marquee for PaikkaKortti must be a new `@keyframes marquee` (leftward: `0% { transform: translateX(0) }` to `100% { transform: translateX(-50%) }`) added to `globals.css`. The existing `tickerScrollRight` keyframe scrolls in the wrong direction (right) and cannot be reused.

The hero carousel is pure CSS `overflow-x: scroll` + `scroll-snap-type: x mandatory` with no JS state. The drag handle and close/bookmark buttons are absolutely positioned over the hero with `z-10`. The entire hero block lives inside the existing `scrollRef` scrollable div, not between the drag handle and the scrollable div — this preserves the `calc(100% - 32px)` height accounting and the `overflow: hidden` on the outer `motion.div` clips the rounded corners correctly.

**Primary recommendation:** No new packages. Implement in three focused tasks: (1) PaikkaSheet hero + collapsible review, (2) PaikkaKortti marquee, (3) DiagonaalKortti placeholders.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**PaikkaSheet — Hero section (SHEET-01)**
- D-01: Hero is `aspect-video` / `aspect-[16/9]`, full sheet width, at the very top of the sheet (no content above it except the floating controls).
- D-02: Drag handle floats at the very top of the hero image (visually over the image, centered, absolutely positioned).
- D-03: Close and bookmark buttons are floating `glass-btn` chips in the top-right corner of the hero image, absolutely positioned.
- D-04: Venue name and address at the bottom of hero with gradient overlay (`linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)`). White text.
- D-05: Sport badge pill removed from PaikkaSheet entirely.
- D-06: 3 placeholder slides; each: `rgba(0,0,0,0.08)` background + Lucide `Camera` size 32 `text-[rgba(255,255,255,0.4)]`.
- D-07: 3 dot indicators below carousel. Active: `bg-[#111111]`, inactive: `bg-[rgba(0,0,0,0.15)]`.
- D-08: Carousel is user-draggable scroll-snap, no auto-advance.

**PaikkaSheet — Pricing section (SHEET-02)**
- D-09: Pricing SheetRow immediately below hero + dots, `CircleDollarSign` icon, label "Hinta".
- D-10: Content inside pricing SheetRow unchanged from current.

**PaikkaSheet — Review widget (SHEET-03)**
- D-11: `ReviewSection` wrapped in a collapsible. Default: collapsed.
- D-12: Collapsed state: star average + review count text + `ChevronDown`. Uses existing `avgRating` and `reviewCount`.
- D-13: `reviewCount === 0`: static row "☆ Ei arvosteluja", no chevron, no tap action.
- D-14: Expand animation: `AnimatePresence` with `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: 'auto', opacity: 1 }}`. Duration 0.25s, ease `[0.25, 0.1, 0.25, 1]`.
- D-15: Collapsed header row lives in `PaikkaSheet.tsx`, not inside `ReviewSection.tsx`.

**PaikkaKortti — Price carousel (UI-25)**
- D-16: Marquee at bottom of card, above the bottom CTA row. Replaces or is inserted after existing price block.
- D-17: Content: `hinta_kuvaus.split('\n')`, each non-empty line = one item.
- D-18: Only activates when 2+ non-empty lines. 1 line or null or `membershipOnly=true` → static text as before.
- D-19: Plain text items separated by `·`, scrolling left continuously. Speed ~40px/s.
- D-20: `border-t border-[rgba(0,0,0,0.07)]` separator before marquee row.

**DiagonaalKortti — Placeholders (UI-26, UI-27)**
- D-21: Logo placeholder: `40×40px` `rounded-lg` `bg-[rgba(0,0,0,0.06)]` + Lucide `Building2` size 20 `text-[rgba(0,0,0,0.25)]`.
- D-22: Logo placeholder sits left of sport pill in same top row: `[logo box] [sport pill]`.
- D-23: Right panel fallback (no image): gray `bg-[rgba(0,0,0,0.06)]` + Lucide `Camera` size 24 `text-[rgba(0,0,0,0.2)]`. Real-image branch untouched.
- D-24: `hidden={!!paikka.image_url}` + `data-fallback` pattern maintained.

### Claude's Discretion
None specified.

### Deferred Ideas (OUT OF SCOPE)
- Real images in hero carousel and DiagonaalKortti right panel
- Logo API (pulling real company logos via website_domain)
- Auto-advance hero carousel
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-25 | PaikkaKortti alareunassa rullaava hinnastokaruselli | CSS `@keyframes marquee` in globals.css; two-copy seamless loop pattern |
| UI-26 | DiagonaalKortin vasempaan yläkulmaan logopaikka (placeholder) | Lucide `Building2` confirmed present; flex row with sport pill |
| UI-27 | DiagonaalKortin oikealle puolelle kuva laji-ikonin/värin sijaan (placeholder) | Lucide `Camera` confirmed present; `data-fallback`/`hidden` pattern verified |
| SHEET-01 | PaikkaSheet hero-osio: kuvien karuselli + nimi & osoite kuvien päälle | CSS scroll-snap carousel; absolute overlay with gradient; floating glass-btn controls |
| SHEET-02 | Hero-osion alle hinnasto-osio | SheetRow component already exists; move existing price block to SheetRow below hero |
| SHEET-03 | Arvosteluwidget oletuksena pienessä tilassa, klikkaamalla aukeaa | framer-motion `height: 'auto'` animation; AnimatePresence; local state in PaikkaSheet |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hero carousel (PaikkaSheet) | Browser / Client | — | Pure CSS scroll-snap; no server data needed |
| Marquee animation (PaikkaKortti) | Browser / Client | — | CSS keyframe animation on existing string data |
| DiagonaalKortti placeholders | Browser / Client | — | Static visual fallback; no data fetch |
| Collapsible review widget | Browser / Client | — | Local `useState` toggle; ReviewSection is already client |
| Pricing SheetRow restructure | Browser / Client | — | Moves existing markup; no new data |

All capabilities are client-side UI changes only. No API tier, CDN, or database changes.

---

## Standard Stack

No new packages are required. All libraries are already installed.

### Core (already installed)
| Library | Installed Version | Purpose | Notes |
|---------|-------------------|---------|-------|
| framer-motion | 12.38.0 [VERIFIED: npm registry] | AnimatePresence, motion.div, height:auto animation | Already imported in PaikkaSheet |
| lucide-react | 1.16.0 [VERIFIED: npm registry] | Camera, Building2, ChevronDown icons | All three icons confirmed present |
| tailwindcss | 3.4.x | Utility classes, aspect-video | Tailwind v3; no v4 imports |

### No new installations needed

**Version verification:**
- `npm view framer-motion version` → 12.40.0 (registry latest); installed: 12.38.0 — no update needed, both versions support `height: 'auto'` animation [VERIFIED: npm registry]
- `npm view lucide-react version` → 1.17.0 (registry latest); installed: 1.16.0 — all required icons (Camera, Building2, ChevronDown, ChevronUp, Star) confirmed present in installed version [VERIFIED: codebase check]

---

## Package Legitimacy Audit

No new packages are installed in this phase. All required functionality exists in the current dependency tree.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User tap on PaikkaKortti/DiagonaalKortti
        │
        ▼
PaikkaSheet opens (layoutId spring animation)
        │
        ├─► [Hero section] ─────────────────────────────────┐
        │    3 slides (CSS scroll-snap)                      │
        │    Floating: drag handle (absolute top-center)     │
        │    Floating: close+bookmark (absolute top-right)   │
        │    Overlay: name+address (absolute bottom, gradient)│
        │    Dot indicators (below hero, outside image)       │
        └────────────────────────────────────────────────────┘
        │
        ├─► [Scrollable content div] (overflow-y-auto)
        │    ├─ [Pricing SheetRow] (CircleDollarSign)
        │    ├─ [Hours SheetRow] (Clock)
        │    ├─ [Phone SheetRow] (Phone)
        │    ├─ [Booking button] (if varauslinkki)
        │    ├─ [Description SheetRow] (Info)
        │    └─ [Collapsible review widget]
        │         ├─ [Collapsed header] (tap to expand)
        │         │   stars + count text + ChevronDown
        │         └─ [AnimatePresence motion.div]
        │              height: 0→auto, opacity: 0→1
        │              └─ [ReviewSection] (unchanged)

PaikkaKortti (list card)
  ├─ badge row
  ├─ name
  ├─ open status
  ├─ [Marquee row] ← NEW (only when 2+ price lines)
  │   border-t separator
  │   CSS @keyframes marquee, overflow hidden
  │   two copies of price text concatenated for seamless loop
  └─ bottom row (CTA + distance)

DiagonaalKortti (diagonal card)
  LEFT panel (clipPath polygon):
  ├─ [logo placeholder box 40×40] + [sport pill] ← UPDATED badge row
  ├─ name
  ├─ open status / price
  └─ distance
  RIGHT panel (clipPath polygon):
  ├─ image (if image_url) ← unchanged
  └─ fallback: gray bg + Camera icon ← UPDATED (was sport-color + SportIcon)
```

### Recommended Project Structure

No new files or folders needed. All changes are in existing component files plus `app/globals.css`.

```
app/
├── globals.css          # Add @keyframes marquee (leftward)
└── components/
    ├── PaikkaSheet.tsx  # Hero section, review collapsible, pricing SheetRow order
    ├── PaikkaKortti.tsx # Marquee price row
    └── DiagonaalKortti.tsx # Logo placeholder, right panel fallback
```

---

## Pattern 1: CSS Scroll-Snap Hero Carousel (SHEET-01)

**What:** Three fixed-width slides in a horizontal scrollable container with CSS snap alignment. No JS carousel state. Dot indicators are driven by `useState` + `onScroll` listener.

**When to use:** When slides are fixed-count, no auto-advance is needed, and touch/mouse scroll is the primary interaction.

**Implementation:**

```tsx
// Source: MDN CSS scroll-snap + project pattern
// Container: overflow-x scroll, snap mandatory
<div
  ref={carouselRef}
  className="flex overflow-x-auto snap-x snap-mandatory"
  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
  onScroll={() => {
    if (!carouselRef.current) return
    const idx = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth)
    setActiveSlide(idx)
  }}
>
  {[0, 1, 2].map(i => (
    <div
      key={i}
      className="snap-start shrink-0 w-full aspect-video bg-[rgba(0,0,0,0.08)] flex items-center justify-center"
    >
      <Camera size={32} className="text-[rgba(255,255,255,0.4)]" />
    </div>
  ))}
</div>
```

**Dot indicators:**
```tsx
// Outside the carousel div, below it
<div className="flex justify-center gap-1.5 py-2">
  {[0, 1, 2].map(i => (
    <span
      key={i}
      className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${
        activeSlide === i ? 'bg-[#111111]' : 'bg-[rgba(0,0,0,0.15)]'
      }`}
    />
  ))}
</div>
```

**Tailwind scroll-snap classes used:** `snap-x snap-mandatory` on container, `snap-start shrink-0 w-full` on each slide. These are Tailwind v3 built-ins [ASSUMED — Tailwind v3 scroll-snap utilities; verification: `snap-x`, `snap-mandatory`, `snap-start` are listed in Tailwind v3 docs].

---

## Pattern 2: Floating Controls Over Hero (SHEET-01, D-02, D-03)

**What:** Drag handle and action buttons absolutely positioned over the hero image.

**Critical insight:** The current drag handle is OUTSIDE the scrollable `div` (before it), and the `scrollRef` div uses `calc(100% - 32px)`. After the redesign, the drag handle moves INSIDE the `scrollRef` div as an absolutely-positioned element over the hero. This means `calc(100% - 32px)` can become `100%` (or the drag handle height offset can be removed) — OR the hero div becomes the new first child of the scrollable div with `position: relative` to contain the absolute-positioned controls.

**Recommended approach:** Keep the existing drag handle `div` outside the scroll area (for height accounting), but make it `position: relative` and use `position: absolute` within it to float the handle visually. Alternatively, collapse the standalone drag handle and let it float over the hero. The simplest approach that preserves the `calc(100% - 32px)` contract:

```
motion.div (overflow: hidden, height: calc(100dvh - 116px))
├── drag handle div [pt-3 pb-1, 32px total] — KEEP AS-IS for height accounting
│    └── visible handle bar — remains centered
└── scrollRef div (overflow-y-auto, height: calc(100% - 32px))
     └── [first child] relative hero container
          ├── <div class="aspect-video w-full relative overflow-hidden">
          │    ├── carousel slides
          │    ├── [absolute top-2 left-1/2 -translate-x-1/2] drag handle indicator
          │    ├── [absolute top-2 right-2] close+bookmark buttons
          │    └── [absolute bottom-0 inset-x-0] gradient overlay + name/address
          └── dot indicators (normal flow, below aspect-video div)
```

The outer drag handle div stays (preserving height calc), but its visible bar is hidden (or kept — the CONTEXT says drag handle floats OVER the image, so the outer div can be `h-0 overflow-visible` or we simply duplicate the visual indicator inside the hero). The simplest: make the outer handle `div` zero-height (`pt-0 pb-0`) and use only the one inside the hero.

**Updated height:** If the outer drag handle div becomes `h-0`, change `calc(100% - 32px)` to `100%` on `scrollRef`.

---

## Pattern 3: CSS Marquee (UI-25)

**What:** Seamless leftward-scrolling text. Two identical copies of the text concatenated; the keyframe moves from `translateX(0)` to `translateX(-50%)`, making it loop seamlessly.

**When to use:** When `hinta_kuvaus` has 2+ non-empty lines and `membershipOnly` is false.

**New keyframe for globals.css:**
```css
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

The existing `tickerScrollRight` keyframe goes the opposite direction (`translateX(-50%)` → `translateX(0%)`) and is used by FilterCarouselPill. Do NOT reuse it.

**Component pattern:**
```tsx
// Source: CSS marquee two-copy pattern [ASSUMED — standard practice]
{priceLines && priceLines.length >= 2 && (
  <div className="border-t border-[rgba(0,0,0,0.07)] pt-2 overflow-hidden">
    <div
      className="flex whitespace-nowrap text-sm font-bold text-[#111111] tabular-nums"
      style={{
        animation: 'marquee 8s linear infinite',
        willChange: 'transform',
      }}
    >
      {/* Two copies for seamless loop */}
      {[...priceLines, ...priceLines].map((line, i) => (
        <span key={i} className="mr-4">{line}{i < priceLines.length * 2 - 1 ? <span className="mx-2 text-[rgba(17,17,17,0.35)]">·</span> : null}</span>
      ))}
    </div>
  </div>
)}
```

**Speed calculation:** At ~40px/s, for a typical price line of ~100–150px rendered width, 2 copies ≈ 300px. Duration = 300 / 40 = ~7.5s. Use a computed duration based on item count or fix at 8s which gives a good default. [ASSUMED — speed/duration calculation based on typical text widths]

**Width requirement:** The inner `div` must NOT have `width: fit-content` or any width constraint — it must be wide enough that the two-copy content is wider than the container. With `whitespace-nowrap flex` and the text being natural inline width, this is guaranteed. The container needs `overflow-hidden` to clip the scrolling content.

---

## Pattern 4: AnimatePresence height:auto Expand/Collapse (SHEET-03)

**What:** Expand a `motion.div` from `height: 0` to `height: 'auto'` using Framer Motion's built-in measurement.

**CLAUDE.md warning:** "Avoid animating `height: auto` — use opacity + y instead."

**Why D-14 still uses it:** The warning is about layout reflow jank. In this context, `ReviewSection` is inside `overflow-y-auto` scroll div — expanding it pushes scroll content down, which is expected behavior. The `overflow: hidden` on the `motion.div` wrapper prevents paint overflow. Framer Motion 12 handles this correctly via internal ResizeObserver. [VERIFIED: framer-motion 12 installed, AnimatePresence and motion confirmed available]

**Key requirement:** The `motion.div` wrapper needs `style={{ overflow: 'hidden' }}` to prevent content from being visible before the animation reaches its target height.

```tsx
// Source: framer-motion docs pattern [ASSUMED — from training knowledge; framer-motion 12 confirmed installed]
const [reviewOpen, setReviewOpen] = useState(false)

{/* Collapsed header */}
<div
  className="flex items-center gap-2 border-t border-[rgba(0,0,0,0.07)] pt-4 cursor-pointer"
  onClick={() => reviewCount > 0 && setReviewOpen(prev => !prev)}
>
  <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0 text-[rgba(17,17,17,0.5)]">
    <Star className="w-4 h-4" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">Arvostelut</p>
    {reviewCount === 0 ? (
      <span className="text-sm text-[rgba(17,17,17,0.45)]">☆ Ei arvosteluja</span>
    ) : (
      <span className="text-sm text-[#111111]">
        {'★'.repeat(Math.round(avgRating ?? 0))}{'☆'.repeat(5 - Math.round(avgRating ?? 0))}
        {' '}{(avgRating ?? 0).toFixed(1)} · {reviewCount} arvostelua
      </span>
    )}
  </div>
  {reviewCount > 0 && (
    <ChevronDown
      className={cn('w-4 h-4 text-[rgba(17,17,17,0.4)] transition-transform duration-200', reviewOpen && 'rotate-180')}
    />
  )}
</div>

{/* Expandable content */}
<AnimatePresence initial={false}>
  {reviewOpen && (
    <motion.div
      key="reviews"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ overflow: 'hidden' }}
    >
      {reviews !== null && (
        <ReviewSection
          paikkaId={paikka.id}
          initialReviews={reviews}
          avgRating={avgRating}
          reviewCount={reviews.length}
        />
      )}
    </motion.div>
  )}
</AnimatePresence>
```

**`initial={false}` on AnimatePresence:** Prevents the "already rendered" state from running entry animation on first mount. Standard pattern for toggles. [ASSUMED — framer-motion best practice from training]

---

## Pattern 5: DiagonaalKortti Logo Placeholder (UI-26)

**What:** Add `40×40px` rounded box with `Building2` icon to the left of the sport pill in the badge row.

**Current badge row (line 57):**
```tsx
<span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white self-start truncate max-w-full"
  style={{ backgroundColor: laji.color }}>
  <SportIcon ... />{laji.label}
</span>
```

**Updated badge row:**
```tsx
<div className="flex items-center gap-2 self-start">
  {/* Logo placeholder */}
  <div className="w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
    <Building2 size={20} className="text-[rgba(0,0,0,0.25)]" />
  </div>
  {/* Sport pill */}
  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white truncate max-w-full"
    style={{ backgroundColor: laji.color }}>
    <SportIcon ... />{laji.label}
  </span>
</div>
```

**Sizing note:** `w-10 h-10` = 40×40px in Tailwind (1rem = 16px, 10 × 4px = 40px). [VERIFIED: Tailwind v3 spacing scale confirmed]

**Clip-path constraint:** The left panel uses `clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)'`. Adding a `40×40px` logo box may push content if the panel is narrow on small screens. The panel is `position: absolute inset-0` with `flex flex-col gap-1 p-3` — the badge row is the first child. Since DiagonaalKortti has fixed `h-32` (128px), the badge row at top should have enough room, but the `40px` logo + `~28px` sport pill = combined height of the badge row may push the name text. Consider: use `items-start` on the flex row to align to top, not center.

---

## Pattern 6: DiagonaalKortti Right Panel Fallback (UI-27)

**Current fallback div (lines 113–121):**
```tsx
<div
  className="w-full h-full flex items-center justify-center"
  style={{ backgroundColor: laji.color }}
  aria-hidden
  data-fallback
  hidden={!!paikka.image_url}
>
  <SportIcon laji={paikka.laji} size={32} className="text-white opacity-80" />
</div>
```

**Updated:**
```tsx
<div
  className="w-full h-full flex items-center justify-center bg-[rgba(0,0,0,0.06)]"
  aria-hidden
  data-fallback
  hidden={!!paikka.image_url}
>
  <Camera size={24} className="text-[rgba(0,0,0,0.2)]" />
</div>
```

Remove `style={{ backgroundColor: laji.color }}`. Add `bg-[rgba(0,0,0,0.06)]` via className. Keep all other attributes identical (`aria-hidden`, `data-fallback`, `hidden={!!paikka.image_url}`). [VERIFIED: existing code read]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Carousel scroll state | Custom JS scroll tracker | CSS `scroll-snap` + `onScroll` offset math | One-liner; browser-native touch scrolling |
| Height animation | ResizeObserver + requestAnimationFrame | `framer-motion` `height: 'auto'` | FM handles measurement internally in v12 |
| Icon placeholders | SVG strings or `<svg>` inline | `lucide-react` Camera, Building2 | Already installed, tree-shaken, consistent |
| Marquee animation | JS interval + `scrollLeft` | CSS `@keyframes marquee` | Zero JS overhead; GPU composited transform |

**Key insight:** Everything in this phase is achievable with CSS transforms + framer-motion + existing installed Lucide icons. No new runtime dependencies.

---

## Common Pitfalls

### Pitfall 1: Hero insertion breaks `calc(100% - 32px)` height accounting

**What goes wrong:** Moving the drag handle visually inside the hero while keeping the outer div for height accounting creates confusion. If the outer drag handle div is kept with its `pt-3 pb-1` (≈ 32px), the scrollable div correctly occupies `calc(100% - 32px)`. If the outer div is removed or resized without updating `calc(100% - 32px)`, the scrollable area overflows or underflows.

**Why it happens:** The scroll div height is explicitly calculated to fill the remaining space below the drag handle strip.

**How to avoid:** Option A — Keep the outer drag handle div exactly as-is (visible bar stays), then add an additional floating handle indicator inside the hero as `position: absolute`. This is redundant but safe. Option B — Make the outer div `h-8` (same 32px, `h-0` would break), hide its content (`overflow-hidden opacity-0`), and put the visible handle inside the hero. Change `calc(100% - 32px)` to `calc(100% - 32px)` — no change needed. **Recommended: Option B with the outer div kept at 32px height (`h-8`) but transparent.**

**Warning signs:** Sheet content scrolls past bottom, or sheet height appears shorter/taller than expected.

---

### Pitfall 2: CSS marquee two-copy loop desync

**What goes wrong:** If the inner `div` does not have exactly twice the text content, the loop appears to jump or stutter at the cycle point.

**Why it happens:** The `translateX(-50%)` endpoint assumes exactly two copies of equal width. If any conditional rendering produces unequal copies, the loop breaks.

**How to avoid:** Always spread `[...priceLines, ...priceLines]` with the same `priceLines` array for both copies. Never render extra separator after the last item of the second copy (that would make the second copy longer than the first).

**Warning signs:** Visible jump/stutter at the end of each animation cycle.

---

### Pitfall 3: `height: 'auto'` animation requires `overflow: hidden` on the wrapper

**What goes wrong:** Without `style={{ overflow: 'hidden' }}` on the `motion.div`, the review content is visible at full height before the animation begins (since `height: 0` with no overflow clip doesn't actually hide children in some browser contexts).

**Why it happens:** `overflow: visible` (default) means even `height: 0` does not clip children.

**How to avoid:** Always set `style={{ overflow: 'hidden' }}` on the `motion.div` that animates `height`.

**Warning signs:** ReviewSection content visible before tapping the header row.

---

### Pitfall 4: Drag conflict between PaikkaSheet `drag="y"` and carousel `overflow-x` scroll

**What goes wrong:** The `motion.div` on PaikkaSheet has `drag="y"`. When the user tries to scroll the hero carousel horizontally, Framer Motion may intercept the gesture and interpret it as a y-drag, triggering sheet close.

**Why it happens:** Framer Motion's drag gesture detection has a directional threshold but can conflict with native scroll on the initial touch movement.

**How to avoid:** Wrap the hero carousel container in a `div` with `onPointerDown={e => e.stopPropagation()}` to prevent the pointer event from reaching the `motion.div` drag handler. Alternatively, `dragDirectionLock={true}` on the parent `motion.div` (only locks after direction is established, but doesn't prevent conflict on the first frame).

**Best solution:** `onPointerDown={e => e.stopPropagation()}` on the carousel container div. This is the same pattern used for buttons inside draggable sheets.

**Warning signs:** Swiping the hero carousel left/right causes the sheet to close or jerk.

---

### Pitfall 5: DiagonaalKortti logo box overflows clipPath panel

**What goes wrong:** The left panel's `clipPath` cuts the visible area diagonally. Content near the right edge of the left panel (which tapers from 62% at top to 57% at bottom) can be clipped, including the sport pill or logo box if they are too wide.

**Why it happens:** The `clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)'` clips everything outside the polygon — the right portion of the left panel is cut off.

**How to avoid:** The logo box (40px) + sport pill together need to fit within the ~57-62% width at `p-3` padding. At 375px screen width, 57% ≈ 214px, minus 24px padding = 190px available. A 40px box + 8px gap + sport pill at ~80px = ~128px total — fits comfortably.

**Warning signs:** Logo box or sport pill appears cut off on narrow screens.

---

### Pitfall 6: `reviewCount` available only after reviews load (async)

**What goes wrong:** The collapsible review header shows `reviewCount` and `avgRating`, but `reviews` state starts as `null` and is populated via `useEffect`. The header renders before reviews are loaded.

**Why it happens:** `reviews === null` on first render; `avgRating = reviews ? computeAvgRating(...) : null`.

**How to avoid:** Show the collapsible header only when `reviews !== null`, or show a skeleton state when `reviews === null`. The current code already conditionally renders the ReviewSection block: `{reviews !== null && <ReviewSection .../>}`. The collapsed header can either (a) always render but show a loading placeholder for count, or (b) render only when `reviews !== null` — consistent with the current conditional.

**Recommended:** Match the current pattern — wrap the entire collapsible block (header + expandable content) in `{reviews !== null && (...)}`.

---

## Code Examples

### globals.css — New marquee keyframe
```css
/* Source: CSS animation standard — leftward marquee for two-copy seamless loop */
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

Add this after the existing `tickerScrollRight` keyframe. Note the direction difference: `tickerScrollRight` goes `-50% → 0%` (rightward); `marquee` goes `0 → -50%` (leftward). [VERIFIED: existing globals.css read]

### PaikkaSheet — Hero outer structure
```tsx
{/* motion.div outer: overflow: hidden, height: calc(100dvh - 116px) */}
{/* Keep drag handle div at h-8 for height accounting */}
<div className="h-8 relative flex items-center justify-center" aria-hidden>
  {/* Outer bar hidden; visible bar is inside hero */}
</div>
{/* scrollRef div: height: calc(100% - 32px) UNCHANGED */}
<div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100% - 32px)' }}>
  {/* Hero is first child of scrollable area */}
  <div className="relative aspect-video w-full overflow-hidden">
    {/* ... carousel slides, absolute overlays ... */}
  </div>
  {/* dot indicators */}
  {/* SheetRow: Hinta */}
  {/* SheetRow: Aukioloajat */}
  {/* ... rest of content ... */}
  {/* Collapsible reviews */}
</div>
```

### PaikkaKortti — Marquee row position

The marquee row replaces the current `{/* Price block */}` div at lines 116–130. The static price display (`membershipOnly`, single-line `priceText`, null) moves inside the marquee logic as the non-marquee fallback:

```tsx
{/* Price / Marquee */}
{membershipOnly ? (
  <span className="text-sm text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
) : priceLines ? (
  // Marquee (2+ lines)
  <div className="border-t border-[rgba(0,0,0,0.07)] overflow-hidden">
    <div
      className="flex whitespace-nowrap text-sm font-bold text-[#111111] tabular-nums py-2"
      style={{ animation: 'marquee 8s linear infinite', willChange: 'transform' }}
    >
      {[...priceLines, ...priceLines].map((line, i) => (
        <span key={i} className="flex items-center gap-2 mr-4">
          {line}
          <span className="text-[rgba(17,17,17,0.3)]">·</span>
        </span>
      ))}
    </div>
  </div>
) : priceText ? (
  <span className="text-sm font-bold text-[#111111] tabular-nums">{priceText}</span>
) : (
  <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
)}
```

Note: `priceLines` is already computed in the existing code at line 38: `const priceLines = !membershipOnly && paikka.hinta_kuvaus?.includes('\n') ? paikka.hinta_kuvaus.split('\n') : null`. This must be updated to filter empty lines: `paikka.hinta_kuvaus.split('\n').filter(Boolean)`. The guard for `priceLines.length >= 2` can be folded into the ternary or left explicit. [VERIFIED: existing PaikkaKortti.tsx code read]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sport-color right panel in DiagonaalKortti | Gray + Camera placeholder | Phase 29 | Visual brand refresh; prepares for real images |
| Text-only PaikkaSheet header | Hero carousel with overlay | Phase 29 | More visual, follows mobile-first sheet patterns |
| Static price display in PaikkaKortti | Marquee when 2+ lines | Phase 29 | Better information density without vertical space |
| Always-open ReviewSection | Collapsible, collapsed by default | Phase 29 | Reduces initial scroll depth |

**Deprecated in this phase:**
- Sport badge pill in PaikkaSheet header — removed per D-05 (not moved elsewhere)
- Standalone `priceLines` multi-line block in PaikkaKortti — replaced by marquee (or falls back to single-line static)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tailwind v3 scroll-snap utilities (`snap-x`, `snap-mandatory`, `snap-start`) are available | Pattern 1, Standard Stack | Low — Tailwind v3.4 includes these; verified by Tailwind v3 changelog presence |
| A2 | CSS `@keyframes marquee` two-copy seamless loop technique | Pattern 3 | Low — standard CSS animation pattern; well-established |
| A3 | framer-motion 12 `height: 'auto'` works without ResizeObserver polyfill on mobile browsers | Pattern 4 | Low — iOS 14.5+ / Chrome 64+ support ResizeObserver natively; project targets modern mobile |
| A4 | Speed calculation of 8s duration for marquee feels ~40px/s | Pattern 3 | Low — duration is easily tunable; visual QA will catch if too fast/slow |
| A5 | `AnimatePresence initial={false}` prevents mount animation for collapsed state | Pattern 4 | Low — standard FM behavior; if wrong, entry animation plays once on page load (acceptable) |

**Verified claims:** Icon presence (Camera, Building2, ChevronDown, ChevronUp — confirmed in installed lucide-react 1.16.0 via Node.js check). framer-motion 12.38.0 exports confirmed. Existing `tickerScrollRight` direction confirmed from globals.css source. All component line numbers confirmed from source reads.

---

## Open Questions (RESOLVED)

1. **Outer drag handle div height accounting**
   - What we know: Current `calc(100% - 32px)` assumes 32px for the drag handle strip above the scroll area.
   - What's unclear: Decision D-02 says drag handle floats OVER the hero image. If the outer drag handle div is hidden/collapsed, `calc(100% - 32px)` must become `100%`. The plan must decide: (a) keep outer div as invisible spacer for the height calc, or (b) change the height calc.
   - Recommendation: Keep the outer drag handle div at `h-8` (32px) but with `opacity-0` or no visible content; put only the visual drag bar indicator inside the hero overlay. This is a zero-risk change.

2. **Active dot state tracking without JS**
   - What we know: CSS scroll-snap does not expose scroll position without JS.
   - What's unclear: CONTEXT.md says "CSS scroll-snap or Framer drag" — pure CSS cannot drive the dot indicator active state.
   - Recommendation: Use `useState(0)` + `onScroll` handler on the carousel container to compute active index. This is ~5 lines of JS and does not constitute a custom carousel implementation.

3. **`priceLines` guard: should the marquee require exactly 2+ non-empty lines, or 2+ total split items?**
   - What we know: D-17 says "split on `\n`, each non-empty line is one item". D-18 says "2+ lines" activates marquee.
   - Recommendation: Filter empty lines before counting: `hinta_kuvaus.split('\n').filter(l => l.trim().length > 0)`. Marquee activates when filtered array length >= 2.

---

## Environment Availability

Step 2.6: No external dependencies beyond the project's own installed packages. All required tools (Node.js, Next.js, TypeScript) confirmed working (TypeScript compilation passes with zero errors).

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| lucide-react | Camera, Building2, ChevronDown icons | Yes | 1.16.0 | — |
| framer-motion | AnimatePresence, motion.div | Yes | 12.38.0 | — |
| tailwindcss | snap-x, aspect-video utilities | Yes | 3.4.x | — |
| TypeScript | Type safety | Yes | 5.x (tsc clean) | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.7 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/priceUtils.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-25 | `priceLines` filter logic (2+ non-empty lines activates marquee) | unit | `npx vitest run lib/priceUtils.test.ts` | Partial — `isMembershipOnly` covered; marquee guard logic is new |
| UI-26 | Logo placeholder renders (visual) | manual | visual QA | ❌ Wave 0 |
| UI-27 | Right panel fallback renders gray+camera (visual) | manual | visual QA | ❌ Wave 0 |
| SHEET-01 | Hero carousel renders 3 slides (visual) | manual | visual QA | ❌ Wave 0 |
| SHEET-02 | Pricing SheetRow appears below hero (visual) | manual | visual QA | ❌ Wave 0 |
| SHEET-03 | Review widget collapsed by default, expands on tap (visual+interaction) | manual | visual QA | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (existing lib tests must stay green)
- **Per wave merge:** `npx vitest run` + `npx tsc --noEmit`
- **Phase gate:** Full suite green + visual QA before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/priceUtils.test.ts` — add test for marquee guard: `split('\n').filter(Boolean).length >= 2`
- [ ] Manual visual QA checklist in VERIFICATION.md

*(Existing test infrastructure covers lib-level logic. Component-level rendering is manual-only — no jsdom/React Testing Library is configured in this project.)*

---

## Security Domain

This phase contains no auth, input handling, cryptography, or external data fetching. All changes are static visual/CSS/component restructuring. Security domain: N/A.

---

## Sources

### Primary (HIGH confidence)
- `app/components/PaikkaSheet.tsx` — full source read; all line numbers and patterns verified
- `app/components/PaikkaKortti.tsx` — full source read; priceLines logic at lines 38–42 verified
- `app/components/DiagonaalKortti.tsx` — full source read; right panel fallback div at lines 113–121 verified
- `app/globals.css` — full source read; `tickerScrollRight` direction confirmed; existing keyframes inventoried
- `package.json` + Node.js runtime checks — framer-motion 12.38.0 and lucide-react 1.16.0 confirmed installed; Camera, Building2, ChevronDown, ChevronUp all confirmed present

### Secondary (MEDIUM confidence)
- `.planning/phases/29-kortit-sheet-redesign/29-CONTEXT.md` — all decisions D-01 through D-24 captured verbatim
- `vitest.config.ts` + `lib/priceUtils.test.ts` — test infrastructure confirmed; vitest 4.1.7 installed

### Tertiary (LOW confidence — training knowledge)
- CSS two-copy marquee seamless loop pattern [A2]
- framer-motion `height: 'auto'` animation behavior [A3]
- `AnimatePresence initial={false}` mount animation suppression [A5]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed installed and icons verified at runtime
- Architecture: HIGH — all component source code read; no ambiguous integration points
- Pitfalls: HIGH — identified from direct source inspection (drag conflict, height calc, clipPath overflow)
- Animation patterns: MEDIUM — framer-motion height:auto and CSS marquee based on established patterns plus installed version confirmation

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (stable stack; 30-day window)
