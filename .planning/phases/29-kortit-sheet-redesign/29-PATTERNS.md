# Phase 29: Kortit & sheet redesign — Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 4 (app/globals.css, PaikkaSheet.tsx, PaikkaKortti.tsx, DiagonaalKortti.tsx)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/globals.css` | config/style | transform animation | self — `tickerScrollRight` keyframe (lines 144–147) | exact (same file, opposite direction) |
| `app/components/PaikkaSheet.tsx` | component (sheet/modal) | request-response + event-driven | self — existing `SheetRow`, `motion.div`, `AnimatePresence` structure | exact (in-file restructure) |
| `app/components/PaikkaKortti.tsx` | component (card) | transform animation | self — existing price block lines 115–130 + bottom row lines 146–163 | exact (in-file restructure) |
| `app/components/DiagonaalKortti.tsx` | component (card) | event-driven | self — right panel fallback div lines 113–121 + badge row line 56–63 | exact (in-file restructure) |

---

## Pattern Assignments

### `app/globals.css` — New `@keyframes marquee`

**Analog:** Existing `tickerScrollRight` keyframe, lines 144–147

**Existing keyframe to copy structure from** (lines 144–147):
```css
@keyframes tickerScrollRight {
  0%   { transform: translateX(-50%); }
  100% { transform: translateX(0%); }
}
```

**New keyframe to add immediately after `tickerScrollRight`:**
```css
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

Direction is opposite: `tickerScrollRight` goes `-50% → 0` (rightward); `marquee` must go `0 → -50%` (leftward). Insert after line 147, before the `.pill-orbit-ring` rule block at line 149.

---

### `app/components/PaikkaSheet.tsx` — Hero section + collapsible reviews

**Analog:** The file itself — extract and extend existing patterns.

**Imports pattern** (lines 1–14):
```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, Phone, ExternalLink, Clock, CircleDollarSign, Info, Bookmark, BookmarkCheck } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { hintateksti, cn } from '@/lib/utils'
import { formatGroupedHours, getOpenStatus } from '@/lib/aukiolo'
import { isSafeUrl } from '@/lib/urlUtils'
import HoursTable from './HoursTable'
import ReviewSection, { type ReviewRow } from './ReviewSection'
import type { Liikuntapaikka } from '@/lib/types'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { computeAvgRating } from '@/lib/reviewUtils'
import { formatDistance } from '@/lib/geo'
```

**New imports to add** — append to the lucide-react import line:
- `Camera` — hero slide placeholder icon
- `Star` or use `★`/`☆` text (Star is not currently imported; use unicode is simpler)
- `ChevronDown` — collapsible review toggle
- `AnimatePresence` from `framer-motion` — for expand/collapse animation

Revised framer-motion import:
```tsx
import { motion, AnimatePresence } from 'framer-motion'
```

Revised lucide-react import:
```tsx
import { X, MapPin, Phone, ExternalLink, Clock, CircleDollarSign, Info, Bookmark, BookmarkCheck, Camera, ChevronDown } from 'lucide-react'
```

New local state to add inside the component function (after existing `useState` on line 25):
```tsx
const [activeSlide, setActiveSlide] = useState(0)
const [reviewOpen, setReviewOpen] = useState(false)
const carouselRef = useRef<HTMLDivElement>(null)
```

**Outer `motion.div` — must not be broken** (lines 49–70):
```tsx
<motion.div
  layoutId={`vc-${paikka.id}`}            // CRITICAL: keep unchanged
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="glass rounded-t-3xl"
  style={{
    position: 'fixed',
    left: 0, right: 0, bottom: 0,
    height: 'calc(100dvh - 116px)',
    zIndex: 66,
    overflow: 'hidden',               // CRITICAL: clips rounded-t-3xl corners
  }}
  transition={{ type: 'spring', damping: 32, stiffness: 260 }}
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={{ top: 0, bottom: 0.15 }}
  onDragEnd={(_, info) => {
    if (info.velocity.y > 400 || info.offset.y > 100) onClose()
  }}
  onClick={e => e.stopPropagation()}
>
```

**Drag handle div — keep at 32px for height accounting** (lines 72–74):
```tsx
{/* Drag handle — keep h-8 (32px) for calc(100% - 32px) on scrollRef */}
<div className="flex justify-center pt-3 pb-1 shrink-0">
  <div className="w-10 h-1 bg-[rgba(0,0,0,0.12)] rounded-full" />
</div>
```
Per RESEARCH.md recommendation: keep this outer div at 32px height (`pt-3 pb-1`). The visible drag bar inside the hero is a second indicator floating over the image. Do NOT remove or resize this div — changing its height requires updating `calc(100% - 32px)` on line 77.

**scrollRef div — height accounting** (line 77):
```tsx
<div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100% - 32px)' }}>
```
Hero carousel goes inside this div as its first child. The `calc(100% - 32px)` value stays unchanged.

**Hero structure to insert as first child of scrollRef div:**
```tsx
{/* Hero carousel — first child of scrollable area */}
<div className="relative aspect-video w-full overflow-hidden">
  {/* Floating drag indicator (visual only — outer div handles height accounting) */}
  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-10 h-1 bg-[rgba(255,255,255,0.5)] rounded-full" />

  {/* Close + bookmark — absolute top-right */}
  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
    <motion.button
      whileTap={{ scale: 0.85, transition: { duration: 0.12 } }}
      onClick={() => onToggleTodo(paikka.id)}
      aria-label={todo ? 'Poista TO DO -listalta' : 'Lisää TO DO -listalle'}
      className="glass-btn w-8 h-8 rounded-full flex items-center justify-center"
    >
      {todo
        ? <BookmarkCheck className={cn('w-4 h-4 fill-[#111111] text-[#111111]')} />
        : <Bookmark className={cn('w-4 h-4 text-[rgba(17,17,17,0.35)]')} />
      }
    </motion.button>
    <button
      onClick={onClose}
      className="glass-btn w-8 h-8 rounded-full flex items-center justify-center text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
    >
      <X className="w-4 h-4" />
    </button>
  </div>

  {/* Carousel slides — CSS scroll-snap, stop pointer events from bubbling to drag="y" */}
  <div
    ref={carouselRef}
    className="flex overflow-x-auto snap-x snap-mandatory w-full h-full"
    style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    onPointerDown={e => e.stopPropagation()}    // prevent conflict with drag="y" on motion.div
    onScroll={() => {
      if (!carouselRef.current) return
      const idx = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth)
      setActiveSlide(idx)
    }}
  >
    {[0, 1, 2].map(i => (
      <div
        key={i}
        className="snap-start shrink-0 w-full h-full bg-[rgba(0,0,0,0.08)] flex items-center justify-center"
      >
        <Camera size={32} className="text-[rgba(255,255,255,0.4)]" />
      </div>
    ))}
  </div>

  {/* Gradient overlay with name + address */}
  <div
    className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-8"
    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)' }}
  >
    <h2 className="font-bold text-white text-lg leading-tight">{paikka.nimi}</h2>
    {(paikka.osoite || paikka.kaupunki) && (
      <p className="text-sm text-white/70 mt-0.5">
        {[paikka.osoite, paikka.kaupunki].filter(Boolean).join(', ')}
      </p>
    )}
  </div>
</div>

{/* Dot indicators — below hero, outside image */}
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

**SheetRow component — copy verbatim** (lines 197–209):
```tsx
function SheetRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t border-[rgba(0,0,0,0.07)] pt-4">
      <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0 text-[rgba(17,17,17,0.5)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">{label}</p>
        {children}
      </div>
    </div>
  )
}
```

**Pricing SheetRow — current pattern** (lines 139–147):
```tsx
{priceDisplay && (
  <SheetRow icon={<CircleDollarSign className="w-4 h-4" />} label="Hinta">
    {paikka.hinta_kuvaus
      ? <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.hinta_kuvaus}</p>
      : <span className="font-serif text-xl font-bold text-[#111111]">{priceDisplay}</span>
    }
  </SheetRow>
)}
```
Per D-09/D-10: move this block to immediately after the dot indicators, above the hours SheetRow. The content inside is unchanged.

**Sport badge pill to REMOVE** (lines 80–86):
```tsx
{/* DELETE this entire block — D-05: sport badge removed from PaikkaSheet */}
<span
  className="inline-flex text-[10px] font-bold px-2 py-1 rounded-full text-white"
  style={{ backgroundColor: lajiKonfig[paikka.laji]?.color ?? '#6b7280' }}
>
  {lajiKonfig[paikka.laji]?.label ?? paikka.laji}
</span>
```

Also remove the outer header row `<div className="flex items-center justify-between gap-2 pt-1">` (lines 80–106) — the close/bookmark buttons move to the hero overlay, the sport badge is deleted, so the entire header row div goes away.

**Name + address block to REMOVE from scrollable content** (lines 108–120):
```tsx
{/* DELETE — name/address moves to hero gradient overlay */}
<div>
  <h2 className="font-serif text-2xl font-bold text-[#111111] leading-tight">{paikka.nimi}</h2>
  ...
</div>
```

**Collapsible review widget — replace existing ReviewSection block** (lines 182–189):

Replace:
```tsx
{reviews !== null && (
  <ReviewSection
    paikkaId={paikka.id}
    initialReviews={reviews}
    avgRating={avgRating}
    reviewCount={reviews.length}
  />
)}
```

With:
```tsx
{reviews !== null && (
  <>
    {/* Collapsed header */}
    <div
      className="flex items-center gap-3 border-t border-[rgba(0,0,0,0.07)] pt-4 cursor-pointer"
      onClick={() => reviews.length > 0 && setReviewOpen(prev => !prev)}
    >
      <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0 text-[rgba(17,17,17,0.5)]">
        <span className="text-sm">★</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">Arvostelut</p>
        {reviews.length === 0 ? (
          <span className="text-sm text-[rgba(17,17,17,0.45)]">☆ Ei arvosteluja</span>
        ) : (
          <span className="text-sm text-[#111111]">
            {'★'.repeat(Math.round(avgRating ?? 0))}{'☆'.repeat(5 - Math.round(avgRating ?? 0))}
            {' '}{(avgRating ?? 0).toFixed(1)} · {reviews.length} arvostelua
          </span>
        )}
      </div>
      {reviews.length > 0 && (
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
          <ReviewSection
            paikkaId={paikka.id}
            initialReviews={reviews}
            avgRating={avgRating}
            reviewCount={reviews.length}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </>
)}
```

Note: `reviewCount` variable in `avgRating` computation at line 46 becomes `reviews.length` in the collapsed header display. The `avgRating` const at line 46 stays unchanged: `const avgRating = reviews ? computeAvgRating(reviews.map(r => r.rating)) : null`.

---

### `app/components/PaikkaKortti.tsx` — Price marquee row

**Analog:** Existing price block (lines 115–130) and bottom row separator (lines 146–148).

**Imports pattern** (lines 1–12) — add `AnimatePresence` only if needed; no new imports required for CSS marquee. The `animation` style attribute uses the new `marquee` keyframe from globals.css.

No new lucide imports needed (the marquee row has no icon).

**Existing `priceLines` computation to update** (lines 38–40):
```tsx
// CURRENT (lines 38–40):
const priceLines   = !membershipOnly && paikka.hinta_kuvaus?.includes('\n')
  ? paikka.hinta_kuvaus.split('\n')
  : null

// UPDATED — filter empty lines, guard requires 2+ non-empty lines:
const priceLines   = !membershipOnly && paikka.hinta_kuvaus
  ? paikka.hinta_kuvaus.split('\n').filter(l => l.trim().length > 0)
  : null
// priceLines is now always null (falsy) when < 1 line, or an array of 1+ items.
// Marquee only when priceLines && priceLines.length >= 2.
```

**Existing price block to REPLACE** (lines 115–130):
```tsx
{/* CURRENT price block — lines 115–130 */}
<div>
  {membershipOnly ? (
    <span className="text-sm text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
  ) : priceLines ? (
    <span className="text-sm font-bold text-[#111111] tabular-nums">
      {priceLines.map((line, i) => (
        <span key={i} className="block">{line}</span>
      ))}
    </span>
  ) : priceText ? (
    <span className="text-sm font-bold text-[#111111] tabular-nums">{priceText}</span>
  ) : (
    <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
  )}
</div>
```

**Replace with** (marquee when 2+ lines, static otherwise):
```tsx
{/* Price / Marquee — replaces lines 115–130 */}
{membershipOnly ? (
  <span className="text-sm text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
) : (priceLines && priceLines.length >= 2) ? (
  <div className="border-t border-[rgba(0,0,0,0.07)] overflow-hidden pt-2">
    <div
      className="flex whitespace-nowrap text-sm font-bold text-[#111111] tabular-nums"
      style={{ animation: 'marquee 8s linear infinite', willChange: 'transform' }}
    >
      {[...priceLines, ...priceLines].map((line, i) => (
        <span key={i} className="flex items-center shrink-0">
          {line}
          <span className="mx-2 text-[rgba(17,17,17,0.3)]">·</span>
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

**Bottom row separator — copy pattern** (lines 146–148):
```tsx
{/* Existing bottom row separator — reference for marquee border-t: */}
<div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-[rgba(0,0,0,0.07)]">
```
The marquee row uses the same `border-t border-[rgba(0,0,0,0.07)]` class. The bottom row separator stays unchanged.

---

### `app/components/DiagonaalKortti.tsx` — Logo placeholder + right panel fallback

**Analog:** The file itself — targeted changes to badge row and fallback div.

**Imports pattern** (lines 1–12):
```tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Check } from 'lucide-react'
import { lajiKonfig } from '@/lib/lajit'
import { SportIcon } from '@/lib/sportIcons'
import { hintateksti } from '@/lib/utils'
import { getOpenStatus } from '@/lib/aukiolo'
import { isMembershipOnly } from '@/lib/priceUtils'
import type { Liikuntapaikka } from '@/lib/types'
```

**New imports to add** — append to lucide-react import:
```tsx
import { MapPin, Check, Building2, Camera } from 'lucide-react'
```

**Badge row (LEFT panel) — current pattern** (lines 56–63):
```tsx
<span
  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white self-start truncate max-w-full"
  style={{ backgroundColor: laji.color }}
>
  <SportIcon laji={paikka.laji} size={12} className="shrink-0" />
  {laji.label}
</span>
```

**Badge row — replace with** (D-21, D-22 — logo placeholder to the left of sport pill):
```tsx
<div className="flex items-start gap-2 self-start">
  {/* Logo placeholder — 40×40px rounded box */}
  <div className="w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
    <Building2 size={20} className="text-[rgba(0,0,0,0.25)]" />
  </div>
  {/* Sport pill — unchanged */}
  <span
    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white truncate max-w-full mt-1"
    style={{ backgroundColor: laji.color }}
  >
    <SportIcon laji={paikka.laji} size={12} className="shrink-0" />
    {laji.label}
  </span>
</div>
```
`items-start` on the outer div ensures the 40px logo box and sport pill align to the top, not center — preventing vertical overflow within the `h-32` card.

**Right panel fallback div — current pattern** (lines 113–121):
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

**Right panel fallback — replace with** (D-23, D-24 — gray + Camera, keep all boolean attrs):
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
`style={{ backgroundColor: laji.color }}` is removed. `aria-hidden`, `data-fallback`, and `hidden={!!paikka.image_url}` are all kept verbatim.

---

## Shared Patterns

### glass-btn — floating action buttons
**Source:** `app/globals.css` lines 51–64
**Apply to:** Close button and bookmark button floating over PaikkaSheet hero (D-03)
```css
.glass-btn {
  background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255,255,255,1);
  border-left: 1px solid rgba(255,255,255,0.9);
  border-right: 1px solid rgba(255,255,255,0.9);
  border-bottom: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8);
  transition: box-shadow 150ms ease;
}
```
Usage: `className="glass-btn w-8 h-8 rounded-full flex items-center justify-center"` — exact pattern from PaikkaSheet lines 99–104 and motion.button lines 88–98.

### border-t separator
**Source:** `PaikkaKortti.tsx` line 146, `PaikkaSheet.tsx` (SheetRow) line 199
**Apply to:** Marquee row top border (PaikkaKortti), collapsible review header top border (PaikkaSheet)
```tsx
className="... border-t border-[rgba(0,0,0,0.07)] ..."
```

### whileTap scale for buttons
**Source:** `PaikkaSheet.tsx` line 89, `PaikkaKortti.tsx` line 54
**Apply to:** Bookmark button in hero overlay
```tsx
whileTap={{ scale: 0.85, transition: { duration: 0.12 } }}
```

### `[transition:color_150ms_var(--ease-out)]` on interactive text/icon
**Source:** `PaikkaSheet.tsx` line 101
**Apply to:** Close button in hero overlay
```tsx
className="... text-[rgba(17,17,17,0.5)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
```

### label caps pattern (SheetRow and collapsible header)
**Source:** `PaikkaSheet.tsx` SheetRow lines 204
```tsx
<p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-1">
```

---

## No Analog Found

No files are without analog — all changes are in-file modifications with self-referential analogs.

---

## Critical Constraints Summary (for planner)

| Constraint | Source | What It Guards |
|-----------|--------|----------------|
| `layoutId={vc-${paikka.id}}` must stay on outer `motion.div` | PaikkaSheet.tsx line 50 | Card → sheet expand animation |
| `overflow: 'hidden'` on outer `motion.div` style | PaikkaSheet.tsx line 61 | Clips rounded-t-3xl corners, must not be removed |
| `drag="y"` on outer `motion.div` | PaikkaSheet.tsx line 63 | Sheet drag-to-close; hero carousel needs `onPointerDown={e => e.stopPropagation()}` to prevent conflict |
| `height: 'calc(100% - 32px)'` on scrollRef div | PaikkaSheet.tsx line 77 | Requires outer drag handle div to stay at 32px (`pt-3 pb-1`) |
| `data-fallback` + `hidden={!!paikka.image_url}` on fallback div | DiagonaalKortti.tsx lines 117–118 | JS `onError` handler uses `querySelector('[data-fallback]')` on img error (line 109) |
| `@keyframes marquee` direction: `0 → -50%` (leftward) | `tickerScrollRight` goes `-50% → 0` (rightward) | New keyframe must be opposite direction |
| `overflow: 'hidden'` on `motion.div` for `height: 'auto'` animation | RESEARCH.md Pitfall 3 | Without it, review content shows before animation |

---

## Metadata

**Analog search scope:** `app/globals.css`, `app/components/PaikkaSheet.tsx`, `app/components/PaikkaKortti.tsx`, `app/components/DiagonaalKortti.tsx`, `app/components/ReviewSection.tsx`
**Files scanned:** 5
**Pattern extraction date:** 2026-06-04
