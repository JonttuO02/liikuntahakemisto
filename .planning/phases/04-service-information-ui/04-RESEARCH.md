# Phase 4: Service Information UI — Research

**Researched:** 2026-05-21
**Domain:** Next.js 14 client-side time computation, React state filtering, TypeScript strict null handling, Tailwind v3 badge components
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Show badge + today's time range together: `"Auki nyt · 09:00–21:00"` (green) or `"Suljettu"` (gray). Not badge-only, not text-only.
- **D-02:** Hours row placed **below venue name, above address row**. Reading order: sport badge → name → open status → where → price/CTA.
- **D-03:** When `aukioloajat` is null, render `"Aukioloajat lisätään pian"` placeholder in the same position.
- **D-04:** Detect drop-in eligibility from `hinta_kuvaus` text — case-insensitive match for `"kertakäynti"`. No new DB column.
- **D-06:** Replace `hintateksti(hinta_min, hinta_max)` with `hinta_kuvaus` on card and profile. When `hinta_kuvaus` is null, fall back to `hintateksti()`; if both null, keep `"Lisätään pian"`. Applies to both cards and profile page.
- **D-07:** "Auki nyt" filter lives in its own dedicated row above the card grid, separate from sport filter pills. Toggle only.
- **D-08:** When filter is active, venues with no `aukioloajat` data remain visible but show `"Aukioloajat tuntematon"` rather than being hidden. Lenient mode.
- **D-09:** Profile page shows hours in grouped ranges (e.g., `"Ma–Pe 06:00–22:00, La 09:00–18:00, Su suljettu"`). Finnish abbreviations: Ma, Ti, Ke, To, Pe, La, Su. Today's group highlighted bold.
- **D-10:** Hours appear as a new `Row` entry in the existing profile card layout, using Clock or similar Lucide icon.

### Claude's Discretion

- "Kertakäynti OK" badge visual treatment (D-05) — planner chooses placement and style based on card layout constraints.
- Exact Lucide icon for the hours row on the profile page.
- Exact Tailwind classes for open (green) vs. closed (gray) badge styling.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Palvelukortti näyttää aukioloajat ilman klikkaamista | Open status badge + today hours inserted into PaikkaKortti.tsx flex-col at D-02 position |
| UI-02 | Palvelukortti näyttää "Auki nyt" / "Suljettu" -badgen ja käyttäjä voi suodattaa vain avoinna olevat | `isOpen()` utility + `aukinyt` boolean state in LiikuntapaikatLista + useMemo filter logic |
| UI-03 | Palvelukortti näyttää "Kertakäynti OK" -badgen kun palvelu sallii kertakäynnin | `hinta_kuvaus?.toLowerCase().includes('kertakäynti')` detection, badge in top row |
| UI-04 | Palvelun profiilisivu näyttää hinta- ja aukioloajat kattavasti | `formatGroupedHours()` utility + new Row in profile page, `hinta_kuvaus` replaces `hintateksti()` |
</phase_requirements>

---

## Summary

Phase 4 is a pure UI phase — no backend routes, no schema changes, no new packages. The database columns (`aukioloajat`, `hinta_kuvaus`) have been present since Phase 1 and populated in Phase 3. This phase surfaces that data in three components: `PaikkaKortti.tsx` (badge + drop-in + price), `LiikuntapaikatLista.tsx` (filter toggle), and `app/paikat/[id]/page.tsx` (weekly hours table + full price description).

The principal technical challenge is the timezone problem on the server-rendered profile page: `new Date()` in a Next.js 14 Server Component runs on the server, which may be in UTC, while Finnish users are at UTC+2 (winter) or UTC+3 (summer). Client components already in use (`PaikkaKortti.tsx`) are unaffected because they use the browser's local time. For the profile page, the recommended solution is to extract today-highlighting into a small `'use client'` wrapper component that receives the pre-grouped hours from the server, computes today client-side, and applies the bold class. This avoids shipping a full client component for the entire profile page while getting timezone-correct highlighting.

No new npm packages are required — `lucide-react` (Clock icon) is already installed, `framer-motion` is already installed, and all badge styling uses inline Tailwind classes.

**Primary recommendation:** Extract two pure utility functions — `getOpenStatus(aukioloajat, now)` and `formatGroupedHours(aukioloajat)` — into `lib/aukiolo.ts`. Keep all display logic out of components; components only call these utilities and render the returned data.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Open status computation (card) | Browser / Client | — | `PaikkaKortti.tsx` is already `'use client'`; uses browser local time (correct timezone) |
| Open status computation (filter) | Browser / Client | — | `LiikuntapaikatLista.tsx` is already `'use client'`; useMemo runs in browser |
| Weekly hours grouping | API / Backend (SSR) | Browser / Client | `page.tsx` is a Server Component; grouping is pure data, runs server-side; only today-highlight needs client |
| Today-highlight on profile page | Browser / Client | — | Must use browser timezone — requires a small client island |
| Price display (hinta_kuvaus) | Browser / Client + SSR | — | Stateless render; same logic works in both server and client components |
| Drop-in badge detection | Browser / Client | — | Computed inline in `PaikkaKortti.tsx` from `hinta_kuvaus` string |

---

## Standard Stack

### Core

No new packages. All required libraries are already installed. [VERIFIED: package.json]

| Library | Installed Version | Purpose | Status |
|---------|-------------------|---------|--------|
| `next` | 14.2.35 | App framework (Server Components + Route Handlers) | In use |
| `react` | ^18 | Client component rendering | In use |
| `framer-motion` | 12.38.0 | `whileTap` animation on filter toggle | In use |
| `lucide-react` | 1.16.0 | `Clock` icon for hours Row | In use — Clock import added |
| `tailwindcss` | ^3.4.1 | Tailwind v3 (not v4) | In use |
| `typescript` | ^5 | Strict type checking | In use |

### No New Packages Required

Phase 4 installs zero new npm packages. All badge styling uses Tailwind utility classes. The `Clock` icon is already available in the installed `lucide-react` package.

---

## Package Legitimacy Audit

No new packages to install. Audit not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client Components)
  PaikkaKortti.tsx ('use client')
    ├── getOpenStatus(aukioloajat, new Date())  ← lib/aukiolo.ts
    │     returns: { status: 'open'|'closed'|'no-data', hours: string|null }
    ├── Badge render: "Auki nyt · HH:MM–HH:MM" | "Suljettu" | "Aukioloajat lisätään pian"
    ├── Drop-in detect: hinta_kuvaus?.toLowerCase().includes('kertakäynti')
    └── Price: hinta_kuvaus ?? hintateksti() ?? "Lisätään pian"

  LiikuntapaikatLista.tsx ('use client')
    ├── useState: aukinyt: boolean
    ├── useMemo suodatettu: includes aukinyt filter (lenient — null passes)
    ├── getOpenStatus() called per venue in filter predicate
    └── grid key includes aukinyt for stagger re-trigger

Server Component
  app/paikat/[id]/page.tsx (async Server Component)
    ├── formatGroupedHours(aukioloajat)  ← lib/aukiolo.ts (pure, no Date needed)
    │     returns: { key: string; label: string; hours: string; days: string[] }[]
    ├── Passes groups to <HoursTable groups={groups} /> (client island)
    └── hinta_kuvaus ?? hintateksti() → Row render

  HoursTable.tsx ('use client' island) — NEW small component
    ├── Receives pre-grouped hours from server
    ├── Computes today's day name client-side: new Date()
    └── Applies bold class to today's group
```

### Recommended Project Structure

```
lib/
├── aukiolo.ts         # NEW: getOpenStatus() + formatGroupedHours() utilities
├── types.ts           # Existing — no changes
├── utils.ts           # Existing — hintateksti() remains as fallback
└── lajit.ts           # Existing — no changes

app/
├── components/
│   ├── PaikkaKortti.tsx        # Modified — badge row + drop-in + price update
│   ├── LiikuntapaikatLista.tsx # Modified — aukinyt state + filter + new Row 3
│   └── HoursTable.tsx          # NEW — client island for today-highlighting
└── paikat/
    └── [id]/
        └── page.tsx            # Modified — hours Row + price update
```

### Pattern 1: Open Status Utility (`lib/aukiolo.ts`)

**What:** Pure function that derives open/closed status from aukioloajat JSON and a Date instance.
**When to use:** Called from both PaikkaKortti (client, browser time) and filter predicate.

```typescript
// Source: derived from 04-CONTEXT.md + 03-CONTEXT.md aukioloajat format spec

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const
type DayKey = typeof DAY_KEYS[number]

export type OpenStatus =
  | { status: 'open';    hours: string }  // "09:00–21:00"
  | { status: 'closed';  hours: string | null }
  | { status: 'no-data' }

export function getOpenStatus(
  aukioloajat: Record<string, { open: string; close: string }> | null | undefined,
  now: Date = new Date()
): OpenStatus {
  if (!aukioloajat) return { status: 'no-data' }

  const dayKey: DayKey = DAY_KEYS[now.getDay()]
  const entry = aukioloajat[dayKey]

  if (!entry || !entry.open || !entry.close) {
    // Day exists with empty strings, or day key absent — treat as closed today
    // Check if any day has data to distinguish "closed today" from "no data at all"
    const hasAnyData = Object.values(aukioloajat).some(v => v.open && v.close)
    if (!hasAnyData) return { status: 'no-data' }
    return { status: 'closed', hours: null }
  }

  const nowMins = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = entry.open.split(':').map(Number)
  const [ch, cm] = entry.close.split(':').map(Number)
  const openMins  = oh * 60 + om
  const closeMins = ch * 60 + cm

  // Handle after-midnight close (e.g., open: "22:00", close: "02:00")
  const isOpen = closeMins < openMins
    ? nowMins >= openMins || nowMins < closeMins  // spans midnight
    : nowMins >= openMins && nowMins < closeMins  // same day

  const rangeStr = `${entry.open}–${entry.close}`
  return isOpen
    ? { status: 'open',   hours: rangeStr }
    : { status: 'closed', hours: rangeStr }
}
```

### Pattern 2: Grouped Hours Formatter (`lib/aukiolo.ts`)

**What:** Pure function that produces grouped Finnish day-range strings from aukioloajat.
**When to use:** Called from `app/paikat/[id]/page.tsx` server component at render time.

```typescript
// Source: derived from 04-UI-SPEC.md grouping spec + 04-CONTEXT.md D-09

const ORDERED_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const
const FI_ABBR: Record<string, string> = {
  monday:'Ma', tuesday:'Ti', wednesday:'Ke', thursday:'To',
  friday:'Pe', saturday:'La', sunday:'Su'
}

export interface HourGroup {
  key: string        // e.g. "monday-friday" — stable React key
  label: string      // e.g. "Ma–Pe" or "La"
  hours: string      // e.g. "06:00–22:00" or "suljettu"
  dayKeys: string[]  // original day keys in this group
}

export function formatGroupedHours(
  aukioloajat: Record<string, { open: string; close: string }> | null | undefined
): HourGroup[] {
  if (!aukioloajat) return []

  const groups: HourGroup[] = []
  let i = 0

  while (i < ORDERED_DAYS.length) {
    const dayKey = ORDERED_DAYS[i]
    const entry  = aukioloajat[dayKey]
    const hours  = entry?.open && entry?.close ? `${entry.open}–${entry.close}` : 'suljettu'

    // Find the run of consecutive days with the same hours
    let j = i + 1
    while (j < ORDERED_DAYS.length) {
      const nextKey   = ORDERED_DAYS[j]
      const nextEntry = aukioloajat[nextKey]
      const nextHours = nextEntry?.open && nextEntry?.close
        ? `${nextEntry.open}–${nextEntry.close}`
        : 'suljettu'
      if (nextHours !== hours) break
      j++
    }

    const span = ORDERED_DAYS.slice(i, j)
    const label = span.length === 1
      ? FI_ABBR[span[0]]
      : `${FI_ABBR[span[0]]}–${FI_ABBR[span[span.length - 1]]}`

    groups.push({ key: span.join('-'), label, hours, dayKeys: span })
    i = j
  }

  return groups
}
```

### Pattern 3: HoursTable Client Island

**What:** Thin client component that receives pre-grouped hours, computes today's day client-side, and applies highlighting.
**Why needed:** Profile page is a Server Component — `new Date()` runs on the server (UTC), not in the user's browser (UTC+2/+3). A client island gets the correct local time.

```typescript
// app/components/HoursTable.tsx
'use client'

import type { HourGroup } from '@/lib/aukiolo'

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export default function HoursTable({ groups }: { groups: HourGroup[] }) {
  const todayKey = DAY_KEYS[new Date().getDay()]
  return (
    <div className="flex flex-col gap-1">
      {groups.map(group => {
        const isToday = group.dayKeys.includes(todayKey)
        return (
          <p key={group.key}
             className={isToday
               ? 'text-sm font-bold text-[#111111]'
               : 'text-sm text-[rgba(17,17,17,0.65)]'}>
            {group.label} {group.hours}
          </p>
        )
      })}
    </div>
  )
}
```

### Pattern 4: Price Fallback Chain

**What:** Unified price display logic for both card and profile page.
**Rule:** `hinta_kuvaus` → `hintateksti()` → placeholder.

```typescript
// Inline in component or extract to lib/utils.ts as hinnanäyttö()
function priceDisplay(
  hinta_kuvaus: string | null | undefined,
  hinta_min: number | null,
  hinta_max: number | null
): { text: string; isFallback: boolean } {
  if (hinta_kuvaus) return { text: hinta_kuvaus, isFallback: false }
  const hinta = hintateksti(hinta_min, hinta_max)
  if (hinta) return { text: hinta, isFallback: false }
  return { text: 'Lisätään pian', isFallback: true }
}
```

On the profile page, when `isFallback` is false and text came from `hinta_kuvaus`, render as `text-sm text-[rgba(17,17,17,0.65)] leading-relaxed`. When text came from `hintateksti()`, render as `font-serif text-xl font-bold text-[#111111]`. When placeholder, omit the Row entirely (spec: "both null → omit the Row").

### Pattern 5: aukinyt Filter in useMemo

**What:** Extension of existing `suodatettu` useMemo in LiikuntapaikatLista.

```typescript
// Lenient mode: venues with null aukioloajat pass through when filter is ON
const suodatettu = useMemo(() =>
  paikat.filter(p => {
    const matchesLaji  = aktiivinen === 'Kaikki' || p.laji.toLowerCase() === aktiivinen.toLowerCase()
    const q            = haku.toLowerCase()
    const matchesHaku  = !haku || p.nimi.toLowerCase().includes(q) || ...
    const hintaRef     = p.hinta_min ?? p.hinta_max
    const matchesHinta = aktiivHinta === null || hintaRef == null || hintaRef <= aktiivHinta
    // Lenient: null aukioloajat → passes (D-08); only explicitly closed venues filtered
    const matchesAuki  = !aukinyt || (() => {
      const s = getOpenStatus(p.aukioloajat)
      return s.status !== 'closed'  // 'open' and 'no-data' both pass
    })()
    return matchesLaji && matchesHaku && matchesHinta && matchesAuki
  }),
  [paikat, aktiivinen, haku, aktiivHinta, aukinyt]
)
```

### Anti-Patterns to Avoid

- **Parsing time strings with `new Date("HH:MM")`:** `new Date("06:00")` is invalid — returns Invalid Date in some environments. Always split on ":" and convert to minutes-since-midnight integers manually.
- **Putting open-status logic in render JSX:** Open status computation must be in a utility function so the filter predicate and the badge both share the same logic. Duplicating the logic in two places causes split-brain where a card shows "Auki nyt" but the filter excludes it.
- **Today-highlighting via server-side `new Date()`:** The server may be UTC while Finnish users are UTC+2/+3. Always do today-highlighting in a `'use client'` component.
- **Assuming every day key exists in aukioloajat:** Some venues have partial data (e.g., only weekdays populated). Access patterns must handle missing keys gracefully with optional chaining.
- **Using tennis sport color (#16a34a / green-700) for "Auki nyt" badge:** Tennis sport uses the same green as the open badge. The open badge must use its own Tailwind green tokens (`text-green-700`, `bg-green-50`), not `lajiKonfig` colors.
- **Animating badge state changes with AnimatePresence:** The badge is always rendered in the same DOM position — its content changes, not its presence. `AnimatePresence` is not needed; it would add unnecessary layout complexity.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Minutes-since-midnight comparison | Custom Date parser | Two-line split+multiply | `new Date("HH:MM")` is unreliable across environments; manual is simpler and correct |
| Timezone-aware server rendering | Server-side timezone detection | Client island (`'use client'`) | Shipping a client island is 10 lines; timezone detection is fragile and adds bundle weight |
| Grouped consecutive ranges | Complex reduce with state machine | Simple while-loop index-walk | The ordered array is fixed at 7 elements; a while loop with a run-length pointer is the simplest correct implementation |
| Badge component library | Custom badge component | Inline `<span>` with Tailwind | The design spec gives exact classes; a generic Badge component adds indirection without value |

**Key insight:** All logic in this phase is pure data transformation over a small fixed-size structure (7 days). No algorithmic complexity warrants external libraries.

---

## Runtime State Inventory

Not applicable — this is a UI-only phase with no rename, refactor, or data migration. No stored state changes.

---

## Common Pitfalls

### Pitfall 1: After-Midnight Close Time

**What goes wrong:** A venue that closes at 02:00 (e.g., a gym open until 2 AM) has `close: "02:00"` which is numerically less than `open: "22:00"`. A naive `nowMins >= openMins && nowMins < closeMins` check produces `false` at 23:00 (wrong — venue is open).

**Why it happens:** HH:MM strings converted to minutes-since-midnight assume no day boundary crossing.

**How to avoid:** When `closeMins < openMins`, the venue spans midnight. The correct check is `nowMins >= openMins || nowMins < closeMins`.

**Warning signs:** Test with `now = 23:00` and `open="22:00" close="02:00"` — should return `'open'`.

### Pitfall 2: Empty String vs. Missing Key

**What goes wrong:** Some aukioloajat records have `{ "sunday": { "open": "", "close": "" } }` for days the venue is closed, rather than omitting the key entirely. A check like `if (aukioloajat[dayKey])` passes because the object exists, then `entry.open` is `""` (falsy), leading to `"suljettu"` display — correct. But `entry.close` being `""` can cause `"22:00–"` in a naive string template.

**Why it happens:** The Google Places API ingestion script uses `""` for closed periods in some edge cases.

**How to avoid:** Always guard: `entry?.open && entry?.close` before constructing the range string. Both must be truthy.

**Warning signs:** Badge shows "Auki nyt · 06:00–" (dangling en-dash) for a day with empty close string.

### Pitfall 3: Server-Side Today Detection (Profile Page)

**What goes wrong:** `app/paikat/[id]/page.tsx` is an async Server Component. `new Date()` in the server context returns the server's UTC time. Finnish users are UTC+2 (winter) or UTC+3 (summer). At midnight Finnish time, the server may still be on the previous day, causing incorrect today-highlighting.

**Why it happens:** Next.js Server Components run on the server, not in the browser.

**How to avoid:** The `formatGroupedHours()` utility produces groups server-side (no Date needed — pure data grouping). Pass groups as props to `<HoursTable>`, a `'use client'` component that calls `new Date()` in the browser.

**Warning signs:** Today's hours are highlighted for the wrong day when testing near midnight, or timezone offset tests fail.

### Pitfall 4: Grid Key Missing aukinyt

**What goes wrong:** When the "Auki nyt" toggle is switched, the card grid re-renders with filtered venues but the Framer Motion stagger animation does not re-trigger because the `key` prop hasn't changed.

**Why it happens:** The existing grid `key` is `key={grid-${aktiivinen}-${aktiivHinta ?? 'all'}}` — it doesn't include the `aukinyt` state.

**How to avoid:** Update the grid key to `key={`grid-${aktiivinen}-${aktiivHinta ?? 'all'}-${aukinyt}`}`. This causes React to unmount/remount the motion div, re-triggering `staggerChildren`.

**Warning signs:** Filter toggle changes the visible venues but the cards don't animate in — they just pop in instantly.

### Pitfall 5: "Tyhjennä haku" Not Resetting aukinyt

**What goes wrong:** A user has the "Auki nyt" filter on, which produces zero results. They click "Tyhjennä haku" expecting to see all venues. If the reset handler doesn't include `setAukinyt(false)`, the zero-results state persists.

**Why it happens:** The existing reset handler only resets `haku`, `aktiivinen`, and `aktiivHinta`.

**How to avoid:** Update the reset handler to also call `setAukinyt(false)`.

### Pitfall 6: CTA Button Text Mismatch

**What goes wrong:** Current PaikkaKortti.tsx uses `"Varaa →"` as the booking link label. The spec requires `"Varaa aika →"` to match the profile page CTA.

**Why it happens:** Card was originally implemented with a shorter label.

**How to avoid:** Update the string at line 85 in PaikkaKortti.tsx from `"Varaa →"` to `"Varaa aika →"`.

---

## Code Examples

### Verified: Existing PaikkaKortti.tsx Card Structure

```typescript
// Source: app/components/PaikkaKortti.tsx — actual code (read 2026-05-21)
// Current flex-col structure inside p-4:
//   gap-2.5 flex flex-col flex-1
//   [1] sport badge (self-start inline-flex)
//   [2] venue name Link → h3
//   [3] address row (MapPin + osoite)    ← hours row inserts HERE (between [2] and [3])
//   [4] description (optional)
//   [5] bottom row: CTA + price

// D-02 insertion point: between h3 (line 56-60) and address div (line 63-67)
```

### Verified: Existing LiikuntapaikatLista State Pattern

```typescript
// Source: app/components/LiikuntapaikatLista.tsx — actual code (read 2026-05-21)
// Line 30-32:
const [haku, setHaku]               = useState('')
const [aktiivinen, setAktiivinen]   = useState('Kaikki')
const [aktiivHinta, setAktiivHinta] = useState<number | null>(null)
// Add: const [aukinyt, setAukinyt] = useState(false)

// Line 171 — grid key (must add aukinyt):
// key={`grid-${aktiivinen}-${aktiivHinta ?? 'all'}`}
// → key={`grid-${aktiivinen}-${aktiivHinta ?? 'all'}-${aukinyt}`}

// Line 194 — reset handler (must add setAukinyt):
// onClick={() => { setHaku(''); setAktiivinen('Kaikki'); setAktiivHinta(null) }}
// → onClick={() => { setHaku(''); setAktiivinen('Kaikki'); setAktiivHinta(null); setAukinyt(false) }}
```

### Verified: Existing Profile Page Row Pattern

```typescript
// Source: app/paikat/[id]/page.tsx — actual code (read 2026-05-21)
// Row component (lines 121-133):
function Row({ icon, label, children }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-[rgba(17,17,17,0.4)] uppercase tracking-widest mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
// New hours Row inserts after Sijainti Row (line 66) and before Puhelin Row (line 79)
// New icon: <Clock className="w-5 h-5 text-[rgba(17,17,17,0.5)]" />
// New label: "Aukioloajat"
```

### Verified: hintateksti() Return Type

```typescript
// Source: lib/utils.ts — actual code (read 2026-05-21)
// hintateksti() returns empty string '' (not null) when both min and max are null.
// Price fallback chain must check for empty string, not null:
const hintaTeksti = hintateksti(paikka.hinta_min, paikka.hinta_max)
const priceText = paikka.hinta_kuvaus || (hintaTeksti !== '' ? hintaTeksti : null)
// → show "Lisätään pian" when priceText is null
```

### Verified: Day Key Mapping

```typescript
// Source: 03-CONTEXT.md aukioloajat format + 04-UI-SPEC.md day key mapping
// getDay() index → aukioloajat key → Finnish abbreviation:
const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
// getDay(): 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
// DAYS[new Date().getDay()] gives the correct aukioloajat key for today
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Single price line with hintateksti() | hinta_kuvaus prose text (fallback to hintateksti) | Richer pricing info for seeded venues |
| No hours display on cards | Hours badge inline in card without tap | Zero-friction info discovery |
| No open/closed filtering | useMemo client-side filter, lenient for unknown | No server round-trips needed |

---

## Critical Research Answers

### Q1: UTC/Timezone for Client Components

`PaikkaKortti.tsx` is `'use client'` — `new Date()` returns the browser's local time. Finnish browsers are UTC+2 (winter) or UTC+3 (summer/EEST). No UTC issue in the client component. The day-key derivation `DAYS[new Date().getDay()]` uses the browser's local day, which is correct. [ASSUMED — standard browser behavior; no tooling available to verify in this session]

**getDay() → day key mapping (verified against 03-CONTEXT.md):** [VERIFIED: 03-CONTEXT.md]
- 0 = Sunday → `"sunday"`
- 1 = Monday → `"monday"`
- 2 = Tuesday → `"tuesday"`
- 3 = Wednesday → `"wednesday"`
- 4 = Thursday → `"thursday"`
- 5 = Friday → `"friday"`
- 6 = Saturday → `"saturday"`

### Q2: aukioloajat JSON Shape

Confirmed from 03-CONTEXT.md Phase 3 target format: [VERIFIED: .planning/phases/03-data-enrichment/03-CONTEXT.md]

```json
{
  "monday":    { "open": "06:00", "close": "22:00" },
  "tuesday":   { "open": "06:00", "close": "22:00" },
  "friday":    { "open": "06:00", "close": "21:00" },
  "saturday":  { "open": "09:00", "close": "18:00" },
  "sunday":    { "open": "10:00", "close": "16:00" }
}
```

Keys are lowercase English day names. Values are `"HH:MM"` strings. A day may be absent from the object (venue closed that day) or present with empty strings (`{ "open": "", "close": "" }`). Both cases must be handled as "closed." [VERIFIED: codebase inspection]

### Q3: Open Status Edge Cases

Three cases documented and handled in `getOpenStatus()`:

1. **Key absent (day not in object):** `aukioloajat["sunday"]` is `undefined`. Handled: `if (!entry || !entry.open || !entry.close)`.
2. **Key present, empty strings:** `{ "open": "", "close": "" }`. Same guard handles it (`!entry.open` is true for `""`).
3. **After-midnight close:** When `closeMins < openMins`, the venue spans midnight. Use: `nowMins >= openMins || nowMins < closeMins`.
4. **24-hour venue (00:00–24:00):** `close = "24:00"` → `closeMins = 1440`. This exceeds the maximum valid minutes-since-midnight (1439). Guard: treat `closeMins === 1440` as always-open. However, the seeded data uses `"00:00"–"00:00"` as a potential edge case — `openMins === closeMins === 0` → after-midnight branch fires → `nowMins >= 0` is always true → venue treated as always open. This is the correct behavior for a 24/7 venue. [ASSUMED — based on seeded data patterns; no actual 24h venue confirmed in seed data]

### Q4: PaikkaKortti.tsx Insertion Point

Verified from reading the actual file: [VERIFIED: codebase inspection]

```
Line 44: <div className="p-4 flex flex-col gap-2.5 flex-1">
Line 46:   {/* Badge with sport icon */}   [row 1: sport badge]
Line 56:   {/* Name */}                    [row 2: venue name → h3]
           ← INSERT hours/status row HERE  [row 2.5: D-02 position]
Line 63:   {/* Address */}                 [row 3: address]
Line 71:   {/* Description */}             [row 4: optional]
Line 76:   {/* Bottom row */}              [row 5: CTA + price]
```

The drop-in badge (D-05) goes in row 1 — appended inline after the sport badge in the same `inline-flex` row. The sport badge `<span>` (lines 47-53) must become `flex items-center gap-2 flex-wrap` to accommodate both badges. [VERIFIED: codebase inspection]

### Q5: LiikuntapaikatLista Filter State

Confirmed: [VERIFIED: codebase inspection]
- Existing state: `haku`, `aktiivinen`, `aktiivHinta` (lines 30-32)
- Add: `const [aukinyt, setAukinyt] = useState(false)`
- useMemo deps: add `aukinyt` to deps array (line 55)
- Lenient mode: `status !== 'closed'` passes both `'open'` and `'no-data'`

### Q6: Profile Page Server Component + Today Highlighting

The profile page `app/paikat/[id]/page.tsx` is an async Server Component. [VERIFIED: codebase inspection — no `'use client'` directive, uses `async` function]

**Recommendation: Client island (option a).** Create `app/components/HoursTable.tsx` as a `'use client'` component. The server component calls `formatGroupedHours(paikka.aukioloajat)` (pure, no Date), passes `groups` as a prop to `<HoursTable>`. The client island calls `new Date()` for today-detection.

This is preferable to option (b) (CSS data-today attribute) because it avoids HTML attribute manipulation for a styling concern, and preferable to option (c) (accept server timezone) because Finnish users at midnight would see wrong highlighting.

Cost: one new ~15-line client component file.

### Q7: hinta_kuvaus vs hintateksti() Fallback Chain

Confirmed `hintateksti()` returns `''` (empty string), not `null`, when both min and max are null. [VERIFIED: lib/utils.ts lines 8-13]

Correct fallback chain:
```typescript
const hintaTeksti = hintateksti(paikka.hinta_min, paikka.hinta_max)
const priceToShow = paikka.hinta_kuvaus || (hintaTeksti !== '' ? hintaTeksti : null)
// priceToShow === null → show placeholder "Lisätään pian"
// priceToShow !== null → render text
```

On profile page: `hinta_kuvaus` → prose style; `hintateksti()` result → serif bold style; both null → omit Row entirely.

### Q8: Grouped Hours Algorithm

The `formatGroupedHours()` function uses an index-walk while loop over a fixed 7-element ordered array. Time complexity O(7) = constant. No recursion, no reduce accumulator. Groups consecutive days with identical `"HH:MM–HH:MM"` strings (or both "suljettu"). [ASSUMED — algorithm designed in this session; no external reference needed for 7-element array]

### Q9: TypeScript Null Checks

The `Liikuntapaikka` type has `aukioloajat?: Record<string, { open: string; close: string }> | null`. [VERIFIED: lib/types.ts line 16]

All access patterns in scope:
- `PaikkaKortti.tsx`: `getOpenStatus(paikka.aukioloajat)` — function handles null/undefined internally
- `LiikuntapaikatLista.tsx`: `getOpenStatus(p.aukioloajat)` — same
- `page.tsx`: `formatGroupedHours(paikka.aukioloajat)` — returns `[]` for null/undefined
- Drop-in: `paikka.hinta_kuvaus?.toLowerCase().includes('kertakäynti') ?? false` — optional chain handles null/undefined

No unsafe access. `hinta_kuvaus` is `?: string | null` — the `?.` chain correctly handles both `null` and `undefined`.

### Q10: "Kertakäynti OK" Badge Placement (D-05)

Based on card layout analysis: [VERIFIED: codebase inspection]

**Recommendation: Option (a) — inline after sport badge in the top badge row.**

The UI-SPEC (04-UI-SPEC.md section "Drop-in Badge") specifies this placement: "Appended inline after the sport badge in the top badge row... Not a second row." The sport badge row currently renders a single `<span>`. Change the container to `<div className="flex items-center gap-2 flex-wrap">` and add the drop-in badge after it. The `flex-wrap` prevents overflow on narrow cards.

The muted styling (`bg-[rgba(17,17,17,0.06)] text-[rgba(17,17,17,0.55)]`) keeps it clearly secondary to the sport badge's solid color.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Dev/build | ✓ | v24.15.0 | — |
| next | App framework | ✓ | 14.2.35 | — |
| framer-motion | Filter toggle animation | ✓ | 12.38.0 | — |
| lucide-react | Clock icon | ✓ | 1.16.0 | — |
| tailwindcss | Styling | ✓ | ^3.4.1 (v3) | — |
| typescript | Type checking | ✓ | ^5 | — |

No missing dependencies. All tools available.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — no jest.config.*, vitest.config.*, or test files found in app/ or lib/ |
| Config file | None — Wave 0 must install |
| Quick run command | `npx vitest run lib/aukiolo.test.ts` (after Wave 0) |
| Full suite command | `npx vitest run` (after Wave 0) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Card shows today's hours without tap | unit (utility) | `npx vitest run lib/aukiolo.test.ts` | ❌ Wave 0 |
| UI-02 | Open badge shows correctly; filter hides closed; null passes | unit (utility + filter logic) | `npx vitest run lib/aukiolo.test.ts` | ❌ Wave 0 |
| UI-03 | Drop-in badge shown when hinta_kuvaus contains "kertakäynti" | unit | `npx vitest run lib/aukiolo.test.ts` | ❌ Wave 0 |
| UI-04 | Grouped hours format correct; profile shows hinta_kuvaus | unit (utility) | `npx vitest run lib/aukiolo.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run lib/aukiolo.test.ts`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** TypeScript clean (`npx tsc --noEmit`) + full vitest suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/aukiolo.test.ts` — covers all getOpenStatus() cases (open, closed, no-data, after-midnight, empty strings) + formatGroupedHours() (grouping, single days, all-closed)
- [ ] `vitest.config.ts` (or `vitest.config.mts`) — minimal config for Next.js project
- [ ] Framework install: `npm install -D vitest @vitest/ui` — no test runner detected

---

## Security Domain

Phase 4 is purely client-side display logic with no new API routes, no authentication changes, no user input to external systems, and no data mutations. ASVS categories are not applicable.

| ASVS Category | Applies | Rationale |
|---------------|---------|-----------|
| V2 Authentication | No | No auth changes |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | Read-only display |
| V5 Input Validation | No | No user input processed (hinta_kuvaus is read from DB, not user-provided in this phase) |
| V6 Cryptography | No | No crypto |

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 4 |
|-----------|-------------------|
| **Tailwind v3** — use `@tailwind` directives, not `@import "tailwindcss"` | No new CSS files; existing globals.css is already correct |
| **No sport colors inlined** — use `lajiKonfig[laji].color` from `lib/lajit.ts` | Open status badge uses its own `text-green-700` / gray tokens, NOT sport colors |
| **`glass` and `glass-hover` from globals.css** | No new CSS needed — badge elements use inline Tailwind only |
| **Supabase writes: service role key only** | Phase 4 makes no DB writes |
| **GPS: client-side only, never URL params** | Not relevant to Phase 4 |
| **Design system note from UI-SPEC:** Running codebase uses monochrome glass system, NOT CLAUDE.md indigo tokens | Follow UI-SPEC color values, not CLAUDE.md's indigo section |
| **`buttonVariants()` from `components/ui/button.tsx`** | Not needed in Phase 4 — no new `<a>` styled as buttons |
| **No `spring` physics** | Filter toggle uses `whileTap` only — confirmed in spec |
| **TypeScript strict mode** — no errors allowed | All new code must handle null/undefined with optional chaining |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Browser `new Date().getDay()` returns local time in Finnish timezone (UTC+2/+3) | Q1, open status | Open badge and filter could show wrong status near day boundaries — mitigated by client island for profile page; low risk for card (client component always runs in browser) |
| A2 | `closeMins === openMins === 0` (both "00:00") is treated as 24/7 open via the after-midnight branch | Q3 edge cases | A 24/7 venue configured as "00:00–00:00" would be treated as open — this is the intended behavior, but no actual seeded venue has this pattern to verify against |
| A3 | Vitest is the appropriate test runner for this Next.js 14 project (no existing test infrastructure detected) | Validation Architecture | If the team prefers Jest or Playwright, the Wave 0 setup differs — low risk, easily changed |

---

## Open Questions

1. **Are any seeded venues actually 24/7 (open: "00:00", close: "00:00")?**
   - What we know: No 24/7 seeded venues appear in the hinta seed data; gym venues typically have real closing times
   - What's unclear: Whether the Google Places ingestion produces "00:00"/"00:00" for any venue
   - Recommendation: Implement the after-midnight guard (handles it correctly regardless); log a warning if this pattern is encountered

2. **Vitest vs Jest — which test runner to use?**
   - What we know: No test infrastructure exists; package.json has no test script
   - What's unclear: Team preference
   - Recommendation: Use Vitest — it has native ESM support, works with TypeScript without babel, and is the modern choice for Next.js projects with no legacy Jest config

---

## Sources

### Primary (HIGH confidence)
- `app/components/PaikkaKortti.tsx` — read directly, all structural claims verified
- `app/components/LiikuntapaikatLista.tsx` — read directly, state/filter pattern verified
- `app/paikat/[id]/page.tsx` — read directly, Row component pattern and server component status verified
- `lib/types.ts` — read directly, Liikuntapaikka type confirmed
- `lib/utils.ts` — read directly, hintateksti() return type and behavior confirmed
- `lib/lajit.ts` — read directly, sport color system verified
- `app/globals.css` — read directly, glass/glass-btn/glass-hover utilities confirmed
- `.planning/phases/04-service-information-ui/04-CONTEXT.md` — all decisions verified
- `.planning/phases/04-service-information-ui/04-UI-SPEC.md` — visual/interaction contract verified
- `.planning/phases/03-data-enrichment/03-CONTEXT.md` — aukioloajat JSON format confirmed
- `scripts/seed-hinnat.ts` — read directly, hinta_kuvaus sample values confirmed
- `package.json` — read directly, all package versions verified

### Secondary (MEDIUM confidence)
- None required — all claims verified from codebase directly

### Tertiary (LOW confidence)
- A1: Browser timezone behavior — standard JavaScript spec, not verified via tooling in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — all component files read directly
- Pitfalls: HIGH — derived from reading actual code; after-midnight case is standard JS date math
- Utility implementations: HIGH — pure functions over a 7-element fixed structure; logic is straightforward

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable codebase; no external APIs in scope)
