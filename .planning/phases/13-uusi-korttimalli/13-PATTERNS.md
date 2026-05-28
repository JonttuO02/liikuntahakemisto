# Phase 13: Uusi korttimalli - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 2 (1 new, 1 modified)
**Analogs found:** 2 / 2

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/components/DiagonaalKortti.tsx` | component | request-response (read-only, receives props) | `app/components/PaikkaKortti.tsx` | exact |
| `app/components/Etusivu.tsx` | component | request-response (import swap only) | `app/components/Etusivu.tsx` (self) | self-modification |

---

## Pattern Assignments

### `app/components/DiagonaalKortti.tsx` (component, request-response)

**Analog:** `app/components/PaikkaKortti.tsx`

---

**Imports pattern** (`PaikkaKortti.tsx` lines 1–11):

```tsx
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
```

DiagonaalKortti copies this block verbatim (D-05). Drop `Heart` from the lucide import — no HeartButton (D-09). Add `MapPin` for the distance row. `cn` may be omitted if no conditional class merging is needed; keep it for consistency.

---

**Variants/animation constants** (`PaikkaKortti.tsx` lines 13–22):

```tsx
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

DiagonaalKortti exports its own `diagonaalKorttiVariants` with the same structure. Export it so a future stagger container in Etusivu can pick it up without changing this file.

---

**SPORT_ICONS record** (`PaikkaKortti.tsx` lines 24–32):

```tsx
const SPORT_ICONS: Record<string, LucideIcon> = {
  padel:         Zap,
  kuntosali:     Dumbbell,
  jooga:         Leaf,
  uinti:         Waves,
  tennis:        Target,
  liikuntahalli: Building2,
  liikunta:      Activity,
}
```

Copy verbatim (D-05). The same `Icon` variable drives both the sport pill and the right-panel fallback (at `w-8 h-8` for fallback, `w-3 h-3` for pill).

---

**Props interface** (`PaikkaKortti.tsx` lines 34–40 — adapted for DiagonaalKortti):

```tsx
// PaikkaKortti (reference):
interface PaikkaKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  aukinyt?: boolean
  isSuosikki?: boolean
  onToggleSuosikki?: (id: number) => void
}

// DiagonaalKortti (keep only):
interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
}
```

Drop `aukinyt`, `isSuosikki`, `onToggleSuosikki` — no HeartButton (D-09), no aukinyt filter display.

---

**Data derivation block** (`PaikkaKortti.tsx` lines 43–55 — adapted):

```tsx
// PaikkaKortti pattern (lines 43-55):
const laji         = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
const openStatus   = getOpenStatus(paikka.aukioloajat)
const hintaTeksti  = hintateksti(paikka.hinta_min, paikka.hinta_max)
const membershipOnly = isMembershipOnly(paikka)
const Icon         = SPORT_ICONS[paikka.laji] ?? Activity

// DiagonaalKortti adds:
const hasCoords    = paikka.latitude != null && paikka.longitude != null
// (latitude/longitude are `number | null` per lib/types.ts — this guard is mandatory, not optional)
```

The `priceText` derivation in DiagonaalKortti is simplified to single-line (no `priceLines` multiline block — the 128px height has no room):

```tsx
const priceText = membershipOnly
  ? null
  : (paikka.hinta_kuvaus?.split('\n')[0] ?? (hintaTeksti || null))
```

---

**Outer motion.div wrapper** (`PaikkaKortti.tsx` line 58–62 — adapted for DiagonaalKortti):

```tsx
// PaikkaKortti (reference):
<motion.div
  variants={korttiVariants}
  className="relative glass glass-hover rounded-2xl flex flex-col overflow-hidden cursor-default"
  whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
>

// DiagonaalKortti (use instead — D-10, fixed height, scale not y-lift):
<motion.div
  variants={diagonaalKorttiVariants}
  className="relative glass glass-hover rounded-2xl overflow-hidden h-32 cursor-pointer"
  whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
  whileTap={{ scale: 0.98, transition: { duration: 0.12, ease: 'easeOut' } }}
>
```

Key differences: `h-32` (fixed height D-03), `scale` not `y` (CLAUDE.md / D-10), `whileTap` added (D-10), `cursor-pointer` (entire card is a Link, D-08), no `flex flex-col` (children are `position: absolute`).

`overflow-hidden` on the outer wrapper is mandatory — it clips the clip-path panel children to the `rounded-2xl` corners. Missing this causes sharp card corners (RESEARCH.md Pitfall 2).

---

**Sport pill** (`PaikkaKortti.tsx` lines 77–83):

```tsx
// PaikkaKortti:
<span
  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
  style={{ backgroundColor: laji.color }}
>
  <Icon className="w-3 h-3" />
  {laji.label}
</span>

// DiagonaalKortti — tighter padding (space is 60% wide, p-3 panel):
<span
  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white self-start truncate max-w-full"
  style={{ backgroundColor: laji.color }}
>
  <Icon className="w-3 h-3 shrink-0" />
  {laji.label}
</span>
```

`self-start` keeps it from stretching to panel width. `truncate max-w-full` prevents overflow. `shrink-0` on the icon prevents icon collapse.

---

**Open status** (`PaikkaKortti.tsx` lines 104–121 — adapted):

```tsx
// PaikkaKortti (reference):
{openStatus.status === 'open' && (
  <div className="inline-flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
    <span className="text-xs font-bold text-green-700">Auki nyt · {openStatus.hours}</span>
  </div>
)}
{openStatus.status === 'closed' && (
  <div className="inline-flex items-center gap-2">
    <span className="text-xs text-[rgba(17,17,17,0.45)]">Suljettu</span>
  </div>
)}
{openStatus.status === 'no-data' && (
  <span className="text-xs text-[rgba(17,17,17,0.35)]">Aukioloajat lisätään pian</span>
)}
```

DiagonaalKortti collapses to single-line variants (no dot, no `div` wrapper, truncate):

```tsx
{openStatus.status === 'open' && (
  <span className="text-xs font-bold text-green-700 truncate">
    Auki · {openStatus.hours}
  </span>
)}
{openStatus.status === 'closed' && (
  <span className="text-xs text-[rgba(17,17,17,0.45)] truncate">Suljettu</span>
)}
```

`no-data` status is omitted in DiagonaalKortti — the 128px height has no room for the placeholder row.

---

**Price block** (`PaikkaKortti.tsx` lines 124–138 — adapted):

```tsx
// PaikkaKortti (reference) — supports multiline priceLines:
{membershipOnly ? (
  <span className="text-sm text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
) : priceLines ? (
  <span className="text-sm font-bold text-[#111111] tabular-nums">
    {priceLines.map((line, i) => <span key={i} className="block">{line}</span>)}
  </span>
) : priceText ? (
  <span className="text-sm font-bold text-[#111111] tabular-nums">{priceText}</span>
) : (
  <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
)}

// DiagonaalKortti — single-line only, truncate enforced:
{membershipOnly ? (
  <span className="text-xs text-[rgba(17,17,17,0.5)]">vain jäsenyys</span>
) : priceText ? (
  <span className="text-xs font-bold text-[#111111] tabular-nums truncate">{priceText}</span>
) : (
  <span className="text-xs text-[rgba(17,17,17,0.35)]">Lisätään pian</span>
)}
```

Size drops to `text-xs` (vs `text-sm`) to fit the 128px constraint without crowding. `truncate` prevents overflow.

---

**Distance row** (`PaikkaKortti.tsx` lines 164–168):

```tsx
// PaikkaKortti (bottom-right, after CTA):
{distanceStr && (
  <span className="text-xs text-[rgba(17,17,17,0.4)] tabular-nums flex items-center gap-0.5 shrink-0">
    <MapPin className="w-3 h-3 shrink-0" />
    {distanceStr}
  </span>
)}

// DiagonaalKortti (inside left panel, mt-auto pushes to bottom):
{distanceStr && (
  <div className="flex items-center gap-1 text-xs text-[rgba(17,17,17,0.4)] mt-auto">
    <MapPin className="w-3 h-3 shrink-0" />
    <span className="tabular-nums">{distanceStr}</span>
  </div>
)}
```

`mt-auto` pins distance to the bottom of the flex column inside the left panel.

---

**Glassmorphism surface** (from `app/globals.css` lines 26–39):

```css
/* Applied via className="glass glass-hover rounded-2xl overflow-hidden" on outer wrapper */
.glass {
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.60) 50%, rgba(240,240,245,0.80) 100%);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1);
  transition: box-shadow 180ms ease, transform 180ms ease;
}
.glass-hover:hover {
  box-shadow: 0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1);
}
```

Apply `.glass .glass-hover` ONLY on the outer `motion.div`. Inner panels must NOT carry `.glass` — they should be transparent or solid color only (RESEARCH.md anti-patterns).

---

**Clip-path diagonal split** (new pattern — no direct codebase analog; from RESEARCH.md Pattern 1):

```tsx
{/* Outer wrapper: relative + overflow-hidden is mandatory */}
<motion.div className="relative glass glass-hover rounded-2xl overflow-hidden h-32 cursor-pointer" ...>
  <Link href={`/paikat/${paikka.id}`} className="absolute inset-0 block">

    {/* LEFT panel: info, z-10 to sit above right panel */}
    <div
      className="absolute inset-0 z-10 flex flex-col gap-1 p-3"
      style={{ clipPath: 'polygon(0 0, 62% 0, 57% 100%, 0 100%)' }}
    >
      {/* content */}
    </div>

    {/* RIGHT panel: map image or fallback */}
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ clipPath: 'polygon(57% 0, 100% 0, 100% 100%, 52% 100%)' }}
    >
      {/* image or fallback div */}
    </div>

  </Link>
</motion.div>
```

The 5% polygon overlap (left ends at 62%/57%, right starts at 57%/52%) prevents the 1px anti-aliasing seam (RESEARCH.md Pitfall 1). `style={{ clipPath: ... }}` is required — Tailwind v3 has no polygon clip-path utilities (RESEARCH.md anti-patterns).

---

**Static Maps image** (new pattern — from RESEARCH.md Pattern 2):

```tsx
// URL builder (module-level constant):
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

function staticMapsUrl(lat: number, lng: number): string {
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=15&size=200x128&scale=2` +
    `&maptype=roadmap&markers=color:red%7C${lat},${lng}` +
    `&key=${API_KEY}`
  )
}

// Usage (right panel, when hasCoords is true):
<img
  src={staticMapsUrl(paikka.latitude!, paikka.longitude!)}
  alt={`Karttakuva: ${paikka.nimi}`}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

`%7C` encodes `|` (RESEARCH.md Pitfall 6). `loading="lazy"` defers fetch until card enters viewport. `object-cover` fills the right panel without distortion.

---

**Fallback right panel** (when `hasCoords` is false — D-06):

```tsx
<div
  className="w-full h-full flex items-center justify-center"
  style={{ backgroundColor: laji.color }}
>
  <Icon className="w-8 h-8 text-white opacity-80" />
</div>
```

`laji.color` comes from `lajiKonfig[paikka.laji].color` — the same hex used in the sport pill background. `opacity-80` softens the icon on the solid color background.

---

### `app/components/Etusivu.tsx` (import swap, lines 27 and 800–807)

**Analog:** self (modification of existing file)

**Import change** (line 27):

```tsx
// REMOVE:
import PaikkaKortti from './PaikkaKortti'

// ADD:
import DiagonaalKortti from './DiagonaalKortti'
```

Verify first: `PaikkaKortti` appears only once in Etusivu.tsx (line 800 confirmed by grep). The import at line 27 can be safely replaced.

---

**Card list swap** (lines 797–809 — exact current code):

```tsx
// CURRENT (lines 797-809):
{searchSuodatettu.length > 0 ? (
  <div className="flex flex-col gap-3">
    {searchSuodatettu.map(p => (
      <PaikkaKortti
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

// AFTER SWAP:
{searchSuodatettu.length > 0 ? (
  <div className="flex flex-col gap-3">
    {searchSuodatettu.map(p => (
      <DiagonaalKortti
        key={p.id}
        paikka={p}
        distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
      />
    ))}
  </div>
)}
```

Props removed: `aukinyt`, `isSuosikki`, `onToggleSuosikki` — DiagonaalKortti does not accept these (D-09). The `<div className="flex flex-col gap-3">` wrapper stays unchanged — do not convert to `motion.div` (not in UI-11 scope per RESEARCH.md open question 2).

---

## Shared Patterns

### Glassmorphism surface (`.glass .glass-hover`)
**Source:** `app/globals.css` lines 26–39
**Apply to:** outer `motion.div` in DiagonaalKortti only — never inner panels

```tsx
className="glass glass-hover rounded-2xl overflow-hidden h-32 cursor-pointer"
```

### Color system
**Source:** `CLAUDE.md` Design Guidelines
**Apply to:** all text and border elements in DiagonaalKortti

| Usage | Value |
|---|---|
| Primary text | `text-[#111111]` |
| Muted text | `text-[rgba(17,17,17,0.45)]` |
| Disabled/placeholder | `text-[rgba(17,17,17,0.35)]` |
| Distance/secondary | `text-[rgba(17,17,17,0.4)]` |
| Open status | `text-green-700` |

### Animation (CLAUDE.md Emil Kowalski style)
**Source:** `CLAUDE.md` Animation Principles + `PaikkaKortti.tsx` lines 58–62
**Apply to:** DiagonaalKortti outer `motion.div`

```tsx
whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
whileTap={{ scale: 0.98, transition: { duration: 0.12, ease: 'easeOut' } }}
```

Never combine with `y` movement (CLAUDE.md: "Use scale only — never combine with y-lift").

### Sport pill pattern
**Source:** `PaikkaKortti.tsx` lines 77–83, `lib/lajit.ts` lines 1–18
**Apply to:** DiagonaalKortti left panel

```tsx
// lajiKonfig always provides .color (hex string) and .label (Finnish string)
// Fallback for unknown laji:
const laji = lajiKonfig[paikka.laji] ?? { label: paikka.laji, badgeTw: 'text-white', accentBg: '', color: '#6b7280' }
```

### Utility function signatures
**Source:** `lib/utils.ts`, `lib/aukiolo.ts`, `lib/priceUtils.ts`

```ts
// hintateksti(min, max) — returns '' when both null
hintateksti(paikka.hinta_min, paikka.hinta_max): string

// getOpenStatus(aukioloajat) — returns discriminated union
getOpenStatus(paikka.aukioloajat): OpenStatus
// { status: 'open'; hours: string } | { status: 'closed'; hours: string | null } | { status: 'no-data' }

// isMembershipOnly(p) — D-11 heuristic
isMembershipOnly(paikka): boolean
// true only when hinta_kuvaus contains 'jäsenyys' AND hinta_min/hinta_max are both null

// cn(...) — Tailwind class merge
cn(...inputs: ClassValue[]): string
```

---

## No Analog Found

No files in this phase lack a codebase analog. `DiagonaalKortti.tsx` has `PaikkaKortti.tsx` as an exact role-match analog. The two genuinely new sub-patterns (CSS clip-path geometry, Static Maps URL) are fully specified in RESEARCH.md Patterns 1 and 2 and are reproduced in the Pattern Assignments above.

---

## Metadata

**Analog search scope:** `app/components/`, `lib/`, `app/globals.css`
**Files read:** `PaikkaKortti.tsx`, `Etusivu.tsx` (imports + lines 793–822), `lib/lajit.ts`, `lib/aukiolo.ts`, `lib/priceUtils.ts`, `lib/utils.ts`, `app/globals.css`
**Pattern extraction date:** 2026-05-27
