# Phase 21: TO DO -lista - Research

**Researched:** 2026-05-31
**Domain:** React component rename + UI rebrand (suosikit → TO DO, Heart → Bookmark)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** URL stays `/suosikit` — path unchanged. Supabase table `suosikit` stays as-is. No data migration.
- **D-02:** UI label is "TO DO". NavPill: "TO DO", page heading: "TO DO -lista", aria-labels: "Lisää TO DO -listalle" / "Poista TO DO -listalta".
- **D-03:** `app/components/HeartButton.tsx` renamed to `app/components/BookmarkButton.tsx`. Component name `HeartButton` → `BookmarkButton`, props type `HeartButtonProps` → `BookmarkButtonProps`. All import sites updated (minimum: `app/paikat/[id]/page.tsx`).
- **D-04:** Lucide icon Heart → Bookmark (empty) / BookmarkCheck (filled). Aria-labels updated in Finnish.
- **D-05:** `PaikkaSheet.tsx` props: `suosikki: boolean` → `todo: boolean`, `onToggleSuosikki: (id: number) => void` → `onToggleTodo: (id: number) => void`. Heart → Bookmark inside toggle button.
- **D-06:** `Etusivu.tsx` internal vars: `suosikitIds` → `todoIds`, `toggleSuosikki` → `toggleTodo`, `suosikkiNimet` → `todoNimet`. API payload key in `/api/saasuositus` call is Claude's discretion.
- **D-07:** `SuosikitClient` fully replaced with new implementation using `DiagonaalKortti`.
- **D-08:** List layout per item: `flex flex-row items-start gap-2` — `[DiagonaalKortti flex-1]` + `[remove-button shrink-0]`.
- **D-09:** Remove button: filled bookmark icon. Optimistic delete, rollback on error.
- **D-10:** No `onShowMap` prop passed to `DiagonaalKortti` on TO DO page — pin button does not appear.
- **D-11:** Empty state: Bookmark icon + "Ei vielä TO DO -paikkoja" + "Selaa hakemistoa" button.
- **D-12:** Unauthenticated state: Bookmark icon + "TO DO -lista vaatii kirjautumisen" + "Kirjaudu sisään" button.
- **D-13:** `NavPill.tsx`: Heart → Bookmark, "Suosikit" → "TO DO".
- **D-14:** `NavBar.tsx`: Heart → Bookmark, "Suosikit" → "TO DO". Do NOT change the `/?nakyma=lista` Haku link or any other nav items.

### Claude's Discretion

- Exact Bookmark vs BookmarkCheck vs BookmarkX icon choice for each state (filled/empty).
- Remove button exact size and placement to the right of DiagonaalKortti.
- Whether the `suosikit` API payload key in `/api/saasuositus` should be renamed to `todo` or kept as-is.
- Exact copy text for empty states.

### Deferred Ideas (OUT OF SCOPE)

- "Merkitse vierailtu" action on TO DO list — not v1.4 scope.
- TO DO list sharing with other users — not v1.4 scope.
- NavBar's `/?nakyma=lista` Haku link cleanup — not this phase's scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TODO-01 | Suosikit is renamed to TO DO list in all UIs; heart icon replaced with bookmark icon (bookmark) in HeartButton and all pages | Confirmed — `Bookmark` and `BookmarkCheck` exist in lucide-react 1.16.0. All 8 affected files identified. |
| TODO-02 | /suosikit page shows logged-in user's TO DO places as a list and functions as "I want to visit here" list | Confirmed — DiagonaalKortti supports the required layout; optimistic delete pattern already exists in HeartButton and Etusivu. |

</phase_requirements>

---

## Summary

Phase 21 is a focused rename/rebrand: the "suosikit" (favorites) system becomes the "TO DO" list across the entire UI. The underlying Supabase table `suosikit` and URL `/suosikit` are unchanged — only presentation changes. The work splits into three areas: (1) replacing Heart with Bookmark icons everywhere, (2) renaming the HeartButton component to BookmarkButton, and (3) replacing SuosikitClient with a DiagonaalKortti-based list that supports optimistic item removal.

This is low-risk, well-scoped work. No new dependencies are needed. All required Lucide icons (`Bookmark`, `BookmarkCheck`) are confirmed present in the already-installed lucide-react 1.16.0. The optimistic update pattern is already established in HeartButton.tsx and Etusivu.tsx — the TO DO page remove button is the same pattern applied to deletes only.

**Primary recommendation:** Execute as a single wave — all changes are tightly coupled (a HeartButton rename must match the import in paikat/[id]/page.tsx, and the PaikkaSheet interface rename must match Etusivu.tsx simultaneously). Atomic execution avoids a broken intermediate state.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bookmark toggle (profile page) | Browser/Client | — | `BookmarkButton` is a standalone client component with auth check + Supabase write |
| Bookmark toggle (map sheet) | Browser/Client | — | `PaikkaSheet` owned by Etusivu client; state held in `todoIds` Set |
| TO DO list display | Browser/Client | — | `SuosikitClient` is already `'use client'`; no SSR needed |
| Optimistic delete | Browser/Client | — | Local state + background Supabase delete, same as existing pattern |
| AI personalization payload key | API/Backend | Browser/Client | `/api/saasuositus` Route Handler reads `body.suosikit`; Etusivu sends it |

---

## Standard Stack

### Core (no new packages — everything already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | 1.16.0 | `Bookmark`, `BookmarkCheck` icons | Already installed; both icons confirmed present [VERIFIED: npm registry] |
| framer-motion | ^12.38.0 | `motion.button whileTap` for remove button | Already in use on all icon buttons |
| @supabase/supabase-js | ^2.105.4 | `supabase.from('suosikit').delete()` | Already used for all DB writes |
| next | 14.2.35 | `'use client'` components, file routing | Project framework |

### No New Dependencies

This phase installs zero new packages. All capabilities are provided by the existing stack.

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. This section is not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
User taps Bookmark button
        │
        ▼
BookmarkButton (client)
  ├── not authed → AuthModal → on success → supabase.insert()
  └── authed → optimistic setState(!current)
                    └── supabase.delete() or insert()
                         ├── success → no-op
                         └── error → rollback setState

User visits /suosikit
        │
        ▼
SuosikitPage (server shell)
  └── SuosikitClient (client)
        │
        ├── loading → blank screen
        ├── unauthenticated → Bookmark empty-state + "Kirjaudu sisään"
        ├── authenticated + empty → Bookmark empty-state + "Selaa hakemistoa"
        └── authenticated + data →
              supabase.from('suosikit').select('paikka_id, liikuntapaikat(*)')
                        │
                        ▼
              list of: [DiagonaalKortti flex-1] [remove-btn shrink-0]
                remove btn tap → optimistic remove from paikat[]
                              └── supabase.delete() bg → rollback on error

User on Etusivu map, taps sheet Bookmark
        │
        ▼
Etusivu.tsx toggleTodo(id)
  ├── not authed → setPendingFavoriteId + setAuthModalOpen
  └── authed → optimistic Set mutation → supabase.delete/insert
PaikkaSheet receives todo={todoIds.has(id)} onToggleTodo={toggleTodo}
```

### Recommended Project Structure

No new folders. All changes are in-place edits to existing files:

```
app/
├── components/
│   ├── BookmarkButton.tsx    ← rename of HeartButton.tsx (D-03)
│   ├── PaikkaSheet.tsx       ← prop rename (D-05)
│   ├── NavPill.tsx           ← icon + label swap (D-13)
│   ├── NavBar.tsx            ← icon + label swap (D-14)
│   └── Etusivu.tsx           ← var renames + PaikkaSheet prop update (D-06)
├── suosikit/
│   └── SuosikitClient.tsx    ← full replacement (D-07)
└── paikat/[id]/
    └── page.tsx              ← import BookmarkButton (D-03)
```

### Pattern 1: Optimistic Delete in SuosikitClient

**What:** Remove from local state immediately, fire Supabase delete in background, rollback on error.
**When to use:** Exactly this pattern for the remove button on TO DO page.

```typescript
// Source: existing HeartButton.tsx + Etusivu.tsx pattern (verified in codebase)
const [paikat, setPaikat] = useState<Liikuntapaikka[]>(initialPaikat)

async function removeTodo(paikkaId: number) {
  const previous = paikat
  // Optimistic remove
  setPaikat(prev => prev.filter(p => p.id !== paikkaId))

  const { error } = await supabase
    .from('suosikit')
    .delete()
    .eq('user_id', userId)
    .eq('paikka_id', paikkaId)

  if (error) {
    console.error('[SuosikitClient] delete error:', error)
    // Rollback
    setPaikat(previous)
  }
}
```

### Pattern 2: Icon State (empty / filled)

**What:** Bookmark (outline) when not saved, BookmarkCheck (filled) when saved.
**Rationale:** `BookmarkCheck` has a checkmark that makes "saved" state unambiguous. `Bookmark` outline for "not yet saved" state. This is clearer than toggling fill on the same icon.

```typescript
// Source: confirmed lucide-react 1.16.0 export list (verified in codebase)
import { Bookmark, BookmarkCheck } from 'lucide-react'

// In BookmarkButton render:
{isTodo
  ? <BookmarkCheck className="w-5 h-5 fill-[#111111] text-[#111111]" />
  : <Bookmark className="w-5 h-5 text-[rgba(17,17,17,0.35)]" />
}

// In PaikkaSheet toggle button (smaller, w-4 h-4):
{todo
  ? <BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
  : <Bookmark className="w-4 h-4 text-[rgba(17,17,17,0.35)]" />
}

// Remove button in SuosikitClient (always filled — item is on the list):
<BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
```

### Pattern 3: DiagonaalKortti Row in SuosikitClient

**What:** Each list item is a flex row — DiagonaalKortti takes flex-1, remove button is shrink-0 to the right.
**When to use:** All TO DO list items.

```typescript
// Source: D-08 decision + DiagonaalKortti interface (verified in codebase)
{paikat.map(p => (
  <li key={p.id} className="flex flex-row items-start gap-2">
    <div className="flex-1 min-w-0">
      <DiagonaalKortti paikka={p} />
    </div>
    <motion.button
      whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
      onClick={() => removeTodo(p.id)}
      className="glass-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-2"
      aria-label="Poista TO DO -listalta"
    >
      <BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
    </motion.button>
  </li>
))}
```

### Pattern 4: saasuositus API Payload Key

**What:** Etusivu.tsx currently sends `{ suosikit: suosikkiNimet, ... }` and route.ts reads `body.suosikit`. This is an internal API (no external consumers). The variable name inside the function body also refers to it as "suosikit".
**Recommendation (Claude's Discretion):** Keep the API payload key as `suosikit` — this is an internal API field in an internal prompt string ("Käyttäjän suosikit: ..."), not user-visible. Changing it would require updating both Etusivu.tsx and route.ts with no user-visible benefit. The variable rename in Etusivu.tsx (`suosikkiNimet` → `todoNimet` per D-06) is a code-level rename only; the JSON key sent over the wire can stay `suosikit`.

### Anti-Patterns to Avoid

- **Renaming the Supabase table or URL:** D-01 locks these. Do not change `suosikit` table name or `/suosikit` URL.
- **Passing `onShowMap` to DiagonaalKortti on the TO DO page:** D-10 forbids it. The pin button must not appear.
- **Changing NavBar's `/?nakyma=lista` Haku link:** D-14 explicitly says to not touch it.
- **Using PaikkaKortti instead of DiagonaalKortti:** PaikkaKortti has its own `onToggleSuosikki/isSuosikki` Heart props — it is NOT the component used on the TO DO page. D-07 specifies DiagonaalKortti explicitly.
- **Importing Heart anywhere in updated files:** All Heart imports must be replaced. Running a grep for `Heart` after the phase should return zero results in any modified file.
- **BottomNav.tsx:** This file has a Heart icon but is a dead file (not imported anywhere per CLAUDE.md). Update it for completeness (it will never render) but do not prioritize it as a blocker.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filled bookmark state | Custom SVG or CSS fill hack | `BookmarkCheck` from lucide-react | Already installed, semantically correct |
| Optimistic UI with rollback | Custom state machine | Existing pattern in HeartButton.tsx | Pattern already tested in production |
| Auth gate on button click | Custom redirect logic | Existing `AuthModal` + `subscribeToAuthUser` | Full auth flow already in HeartButton |
| List data fetch | Custom hook | Direct `supabase.from('suosikit').select(...)` in useEffect | Existing SuosikitClient pattern |

**Key insight:** This phase is a rename, not a feature build. Resist the temptation to add any new abstractions.

---

## Runtime State Inventory

> Included — this is a rename/rebrand phase.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Supabase table `suosikit` — rows with `user_id` + `paikka_id` | None — table name is locked (D-01); existing rows remain valid |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no secret key references "suosikit" | None |
| Build artifacts | No compiled artifacts reference the HeartButton name | None |

**Nothing found in category:** Verified by grep across app/ — no external service configs, no env vars, no Supabase storage buckets use the "suosikit" or "heart" string in ways that require runtime migration.

---

## Complete File Impact List

Every file that must be edited in this phase (confirmed by codebase grep):

| File | What Changes |
|------|-------------|
| `app/components/HeartButton.tsx` | Rename to `BookmarkButton.tsx`; Heart→Bookmark/BookmarkCheck; props rename; aria-labels |
| `app/components/PaikkaSheet.tsx` | Props: `suosikki`→`todo`, `onToggleSuosikki`→`onToggleTodo`; Heart→Bookmark icon |
| `app/components/NavPill.tsx` | Heart→Bookmark import; "Suosikit"→"TO DO" label |
| `app/components/NavBar.tsx` | Heart→Bookmark import; "Suosikit"→"TO DO" label; keep Haku link |
| `app/components/Etusivu.tsx` | Vars: `suosikitIds`→`todoIds`, `toggleSuosikki`→`toggleTodo`, `suosikkiNimet`→`todoNimet`; PaikkaSheet props updated; keep `suosikit` as payload key |
| `app/suosikit/SuosikitClient.tsx` | Full replacement with DiagonaalKortti-based implementation |
| `app/paikat/[id]/page.tsx` | Import: `HeartButton`→`BookmarkButton` |
| `app/components/BottomNav.tsx` | Heart→Bookmark (dead file; update for consistency, not a blocker) |
| `app/components/PaikkaKortti.tsx` | Heart icon + `isSuosikki`/`onToggleSuosikki` props — NOT actively used (no importers found); update for correctness but not a blocker |

**Files NOT changed:**
- `app/suosikit/page.tsx` — just mounts NavPill + SuosikitClient; no Heart/suosikit references
- `app/api/saasuositus/route.ts` — payload key `suosikit` stays; "Käyttäjän suosikit:" prompt text is acceptable (it's internal, not user-visible)
- `app/tietosuoja/page.tsx` — contains "suosikit" only in legal copy text; this is accurate (the data feature still exists); leave as-is

---

## Common Pitfalls

### Pitfall 1: Forgetting PaikkaSheet's caller (Etusivu)
**What goes wrong:** PaikkaSheet props are renamed (`suosikki`→`todo`, `onToggleSuosikki`→`onToggleTodo`) but Etusivu.tsx still passes the old prop names — TypeScript compile error.
**Why it happens:** Two files must change atomically.
**How to avoid:** Update PaikkaSheet interface and Etusivu call site in the same task.
**Warning signs:** TypeScript: "Property 'suosikki' does not exist on type Props".

### Pitfall 2: Leaving Heart import in any modified file
**What goes wrong:** After renaming, the `Heart` icon from lucide-react is still imported but not used — or worse, still rendered in a non-obvious branch.
**How to avoid:** After editing each file, verify `Heart` is removed from both the import statement and all JSX.
**Warning signs:** ESLint "no-unused-vars" or lingering Heart renders.

### Pitfall 3: DiagonaalKortti min-w-0 missing
**What goes wrong:** DiagonaalKortti inside `flex-1` can overflow if `min-w-0` is not set on the wrapper div, because flex children default to `min-width: auto`.
**How to avoid:** Always wrap DiagonaalKortti in `<div className="flex-1 min-w-0">`.
**Warning signs:** Card overflows its container or causes horizontal scroll on narrow viewports.

### Pitfall 4: SuosikitClient user identity race condition
**What goes wrong:** The existing SuosikitClient uses `subscribeToAuthUser` which fires asynchronously. If `removeTodo` is called before `userId` is resolved, the Supabase delete has no `user_id` constraint and fails silently.
**How to avoid:** Follow the existing pattern — store userId in a ref or local state that is populated by `subscribeToAuthUser`; gate `removeTodo` on `userId` being non-null. The existing `loadFavorites(userId)` pattern in the current SuosikitClient handles this correctly — replicate it.

### Pitfall 5: `BookmarkCheck` fill color
**What goes wrong:** `BookmarkCheck` has a stroke+fill structure. Using only `text-[#111111]` without `fill-[#111111]` renders as outline only. The existing HeartButton uses `fill-[#111111] text-[#111111]` — the same pattern must apply.
**How to avoid:** Always pair `fill-[#111111]` with `text-[#111111]` for filled bookmark states.

---

## Code Examples

### BookmarkButton (complete replacement for HeartButton)

```typescript
// Source: HeartButton.tsx pattern + D-03/D-04 decisions (verified in codebase)
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import AuthModal from './AuthModal'

interface BookmarkButtonProps {
  paikkaId: number
}

export default function BookmarkButton({ paikkaId }: BookmarkButtonProps) {
  const [isTodo, setIsTodo] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const currentUser = useRef<{ id: string } | null>(null)

  // ... same useEffect/toggle logic as HeartButton, table 'suosikit' unchanged ...

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
        onClick={toggle}
        className="glass-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        aria-label={isTodo ? 'Poista TO DO -listalta' : 'Lisää TO DO -listalle'}
      >
        {isTodo
          ? <BookmarkCheck className={cn('w-5 h-5 fill-[#111111] text-[#111111]')} />
          : <Bookmark className={cn('w-5 h-5 text-[rgba(17,17,17,0.35)]')} />
        }
      </motion.button>
      {/* AuthModal same as before */}
    </>
  )
}
```

### SuosikitClient — authenticated + data state (key section)

```typescript
// Source: D-07/D-08/D-09 decisions + DiagonaalKortti interface (verified in codebase)
import { motion } from 'framer-motion'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'

// In authenticated+data render:
<div className="min-h-screen bg-white px-4 py-8 max-w-2xl mx-auto">
  <h1 className="font-serif text-2xl font-bold text-[#111111] mb-6">
    TO DO -lista
  </h1>
  <ul className="flex flex-col gap-3">
    {paikat.map(p => (
      <li key={p.id} className="flex flex-row items-start gap-2">
        <div className="flex-1 min-w-0">
          <DiagonaalKortti paikka={p} />
          {/* onShowMap intentionally omitted per D-10 */}
        </div>
        <motion.button
          whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
          onClick={() => removeTodo(p.id)}
          className="glass-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-2"
          aria-label="Poista TO DO -listalta"
        >
          <BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
        </motion.button>
      </li>
    ))}
  </ul>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Heart icon for saved state | Bookmark/BookmarkCheck icon | Phase 21 | Semantically "I want to go here" vs "I liked this" |
| "Suosikit" label | "TO DO" label | Phase 21 | Matches actual user intent (planning future visits) |
| SuosikitClient with plain glass cards | SuosikitClient with DiagonaalKortti | Phase 21 | Visual consistency with main listing view |

**Deprecated/outdated after this phase:**
- `Heart` icon import in all UI components (replaced by `Bookmark`/`BookmarkCheck`)
- `HeartButton.tsx` filename (replaced by `BookmarkButton.tsx`)
- `suosikki`, `isSuosikki`, `onToggleSuosikki` prop names (replaced by `todo`, `isTodo`, `onToggleTodo`)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `app/components/PaikkaKortti.tsx` has no active importers — it is safe to update without checking callers | Complete File Impact List | If PaikkaKortti is imported somewhere not found by grep, that caller would render with old prop names |
| A2 | `app/tietosuoja/page.tsx` "suosikit" mention is legal copy text that accurately describes the data feature — no change needed | Complete File Impact List | If the legal page uses the word as a UI label (not description), it should be updated |
| A3 | Keeping `/api/saasuositus` payload key as `suosikit` is acceptable (internal, non-user-visible) | Pattern 4 | No risk — this is an internal API field used only in AI prompt construction |

**Note on A1:** Grep confirmed PaikkaKortti is not imported anywhere in `app/` — the only references are the component's own definition lines.

---

## Open Questions (RESOLVED)

1. **`mt-2` on remove button alignment**
   - What we know: DiagonaalKortti has `h-32` fixed height. The remove button is `w-8 h-8`. With `items-start`, some top offset may be needed for visual centering.
   - What's unclear: Whether `mt-2` (8px) or `mt-3` (12px) looks better — depends on the diagonal card's top padding.
   - RESOLVED: Use `mt-2` as a starting point; the executor can adjust by visual inspection if needed.

2. **SuosikitClient stagger animation**
   - What we know: DiagonaalKortti exports `diagonaalKorttiVariants` for use with `motion.ul`/`motion.li`.
   - What's unclear: Whether the TO DO list should use stagger animation (consistent with Etusivu list) or plain rendering (simpler for a small personal list).
   - RESOLVED: Skip stagger for the TO DO page — it's a personal list, not a discovery list. Plain `flex flex-col gap-3` is sufficient.

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external tool dependencies. All changes are code edits to existing files using already-installed packages.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not detected — no jest.config, vitest.config, or pytest.ini found |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TODO-01 | All UI references to Heart/Suosikit replaced | manual-only | — | N/A |
| TODO-02 | TO DO page shows list with DiagonaalKortti + remove | manual-only | — | N/A |

**Justification for manual-only:** This project has no test infrastructure. All verification is done via `/gsd:verify-work` visual inspection against the success criteria in REQUIREMENTS.md.

### Wave 0 Gaps

None — no test infrastructure exists and none is in scope for this phase.

---

## Security Domain

This phase involves no new authentication flows, no new API endpoints, and no new data access patterns. The `suosikit` Supabase table RLS policy is unchanged (Supabase anon key is read-only; writes use service role via existing browser client pattern). No ASVS categories are newly introduced.

V5 Input Validation: The `saasuositus` route already sanitizes the `suosikit` array. The API payload key rename (if performed) does not change sanitization behavior.

---

## Sources

### Primary (HIGH confidence)

- Codebase grep + direct file reads — all file paths, prop names, import sites, and icon availability verified by reading source files directly
- `node -e` check — confirmed `Bookmark: true`, `BookmarkCheck: true`, `BookmarkX: true` in installed lucide-react 1.16.0

### Secondary (MEDIUM confidence)

- CLAUDE.md — glassmorphism utilities, animation principles, Tailwind v3 constraints
- `.planning/phases/21-todo-lista/21-CONTEXT.md` — all locked decisions

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified as installed; no new dependencies
- Architecture: HIGH — all patterns read directly from existing source files
- Pitfalls: HIGH — derived from reading actual component code and identifying real coupling points
- File impact list: HIGH — verified by codebase grep

**Research date:** 2026-05-31
**Valid until:** Stable — this is a closed rename with no external dependencies; findings do not expire
