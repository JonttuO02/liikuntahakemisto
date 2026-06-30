# Phase 62: Venuepage-konsolidaatio - Research

**Researched:** 2026-07-01
**Domain:** Next.js App Router route deletion, React component refactoring, i18n key migration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** "Näytä kartalla" migrated to PaikkaSheet as a new SheetRow (not removed).
- **D-02:** SheetRow placed in sheet body (same style as Phone/Hours/Description rows). Not in hero corner.
- **D-03:** Row shown only when `paikka.latitude != null && paikka.longitude != null`. Hidden in `preview=true`.
- **D-04:** DiagonaalKortti gets `onOpen?: (paikka: Liikuntapaikka) => void` prop.
- **D-05:** Without `onOpen`, replace `<Link href>` with a no-op `<div>` (pure visual, no navigation).
- **D-06:** sessionStorage scroll-state saving (`handleCardClick`) becomes unnecessary. Claude's discretion to delete or leave as dead code.
- **D-07:** PaikkaKortti `/paikat`-links NOT changed in Phase 62 (deferred to Phase 63 / PREV-04).
- **D-08:** Delete `app/paikat/[id]/` directory entirely. Next.js auto-returns 404. No redirect, no `not-found.tsx`.

### Claude's Discretion
- Exact SheetRow label and icon for "Näytä kartalla" row (MapPin icon, "SIJAINTI" label — same as old page).
- Prop name for `onOpen` — confirmed as `onOpen` matching the `onOpen?: (paikka: Liikuntapaikka) => void` pattern.
- sessionStorage cleanup: planner may delete `handleCardClick` and the restore `useEffect` (lines 492–505 and 598–622 of Etusivu.tsx), or leave as harmless dead code.

### Deferred Ideas (OUT OF SCOPE)
- PaikkaKortti `/paikat`-link fixes — Phase 63 (PREV-04).
- Scroll-state sessionStorage full cleanup — Claude's discretion.
- "Block business accounts from logging into customer site" (auth topic).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VENUEPAGE-01 | Delete `app/paikat/[id]` entirely from the application | D-08: directory deletion causes automatic 404 in Next.js App Router |
| VENUEPAGE-02 | Migrate unique content (specifically "Näytä kartalla") from deleted page to PaikkaSheet before deletion | D-01–D-03 + SheetRow pattern in PaikkaSheet; i18n keys need adding to PaikkaSheet namespace |
| VENUEPAGE-03 | All internal navigation paths that opened the separate venue page now open PaikkaSheet instead | D-04–D-05: DiagonaalKortti `onOpen` prop; two Etusivu wiring points (lines 1074 and 1460) |
| VENUEPAGE-04 | Direct URL to deleted route returns 404 (no redirect) | D-08: Next.js App Router 404 is automatic on page file removal; no custom `not-found.tsx` needed |
</phase_requirements>

---

## Summary

Phase 62 is a pure codebase refactoring with zero new dependencies. It consolidates the separate venue detail page (`app/paikat/[id]/page.tsx`) into the existing PaikkaSheet bottom sheet by (1) migrating the only unique content — the "Näytä kartalla" / show-on-map link — as a new `SheetRow` in PaikkaSheet, (2) rewiring DiagonaalKortti to call an `onOpen` callback instead of navigating, and (3) deleting the route entirely so its URL auto-404s.

All content that was on `app/paikat/[id]` (Hours, Phone, Price, BookNow, Description, Reviews) already exists in PaikkaSheet. The only gap is the "Näytä kartalla" row and its two i18n keys (`location`, `showOnMap`) which are currently in the `PaikkaPage` namespace but not in `PaikkaSheet`. `MapPin` is not currently imported in PaikkaSheet.tsx, though it is used in the deleted page.

The `DiagonaalKortti` invisible `<Link>` overlay at line 91 is the only internal consumer-facing navigation path that opens `/paikat/[id]`. `PaikkaKortti` also links to `/paikat/[id]` but that is deferred to Phase 63. After Phase 62, PaikkaKortti links will lead to 404 — acceptable because PaikkaKortti only appears in the business-side PreviewModal.

**Primary recommendation:** Implement in four focused plans (A: PaikkaSheet SheetRow + i18n, B: DiagonaalKortti prop + overlay refactor, C: Etusivu wiring + handleCardClick removal, D: Delete route + PaikkaPage i18n cleanup). Plans A and B are parallel-safe. Plan C depends on B. Plan D is the final gate.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Venue detail display | Client (PaikkaSheet bottom sheet) | — | PaikkaSheet is a `'use client'` component opened via Etusivu `valittu` state |
| "Näytä kartalla" navigation | Client (`<a href="/?id=X">`) | — | Plain anchor navigates to homepage with `?id=X` param; Etusivu reads this to center map and open sheet |
| Route 404 | Next.js App Router | — | Automatic on file deletion — no code needed |
| Card-to-sheet trigger | Client (Etusivu `setValittu` state) | — | DiagonaalKortti `onOpen` calls `setValittu(p)` in parent |
| i18n copy | Client (next-intl `useTranslations`) | — | `messages/fi.json` and `messages/en.json` are the source of truth |
| Preview no-op (no navigation) | Client (DiagonaalKortti no-op div) | — | Missing `onOpen` prop → `<div>` overlay instead of `<Link>` |

---

## Standard Stack

No new packages are installed in this phase. All implementation uses existing project dependencies.

### Existing Dependencies Used

| Library | Current Version | Role in This Phase |
|---------|----------------|--------------------|
| Next.js App Router | (existing) | Route deletion = automatic 404; `Link` component removed from DiagonaalKortti |
| React | (existing) | Component prop additions, conditional rendering |
| lucide-react | (existing) | `MapPin` icon — add to PaikkaSheet imports |
| next-intl | (existing) | Add `location` + `showOnMap` keys to PaikkaSheet namespace |
| framer-motion | (existing) | SheetRow enter animation unchanged (no animation); DiagonaalKortti `whileHover`/`whileTap` unchanged |

### Package Legitimacy Audit

No packages are installed in this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious SUS:** none

---

## Architecture Patterns

### System Architecture Diagram

```
DiagonaalKortti (in Etusivu search list, line 1460)
    onOpen={(p) => { setSearchOpen(false); setValittu(p) }}
         │
         ▼
Etusivu.valittu state (setValittu)
         │
         ▼
PaikkaSheet renders (layoutId spring animation)
    ├── existing rows (Price, Hours, Phone, BookNow, Description)
    └── NEW: "Näytä kartalla" SheetRow (when coords present && !preview)
              │
              └── <a href="/?id={paikka.id}"> → Etusivu focusId handler
                       ├── centers map on venue
                       └── (currently does NOT auto-open PaikkaSheet on focusId — by design)

DiagonaalKortti (in TODO overlay, line 1074)
    onOpen={(p) => { setTodoOpen(false); setValittu(p) }}
         │
         └── same setValittu flow above

DiagonaalKortti (in preview contexts — no onOpen)
    <div className="absolute inset-0 block z-10" />  ← no-op, no navigation

/paikat/[id] URL
    → Next.js App Router 404 (automatic after directory deletion)
```

### Recommended Project Structure

No new files or directories. Changes are surgical edits to existing files.

```
app/
├── paikat/[id]/          ← DELETED (VENUEPAGE-01/04)
├── components/
│   ├── PaikkaSheet.tsx   ← Add MapPin import, SheetRow, i18n keys (VENUEPAGE-02)
│   ├── DiagonaalKortti.tsx ← Add onOpen prop, replace <Link> (VENUEPAGE-03)
│   └── Etusivu.tsx       ← Wire onOpen at lines 1074 + 1460 (VENUEPAGE-03)
└── ...
messages/
├── fi.json               ← Add PaikkaSheet.location + showOnMap; remove PaikkaPage block
└── en.json               ← Same
```

### Pattern 1: SheetRow Addition in PaikkaSheet (VENUEPAGE-02)

**What:** Insert a new conditional SheetRow after the Description row, before the Reviews section.

**When to use:** When `paikka.latitude != null && paikka.longitude != null && !preview`.

**Position:** After line 262 (end of `{paikka.kuvaus && ...}` block), before line 265 (Reviews block start).

**Source:** [VERIFIED: app/components/PaikkaSheet.tsx lines 258–266 + UI-SPEC §Component Inventory]

```tsx
// Add MapPin to lucide-react import (currently absent in PaikkaSheet.tsx)
import { X, Phone, ExternalLink, Clock, CircleDollarSign, Info,
         Bookmark, BookmarkCheck, Camera, ChevronDown, Building2, BadgeCheck, MapPin } from 'lucide-react'

// Insert after Description SheetRow, before Reviews block:
{paikka.latitude != null && paikka.longitude != null && !preview && (
  <SheetRow
    icon={<MapPin className="w-4 h-4" />}
    label={t('location')}
  >
    <a
      href={`/?id=${paikka.id}`}
      className="text-[#111111] hover:text-[rgba(17,17,17,0.6)] text-sm font-bold underline underline-offset-2 [transition:color_150ms_var(--ease-out)]"
    >
      {t('showOnMap')}
    </a>
  </SheetRow>
)}
```

**Note:** The UI-SPEC uses `<a href>` not `<Link>` for this row, because clicking it causes a full URL change (`/?id=X`) that replaces the current page context. This is intentional.

### Pattern 2: DiagonaalKortti Conditional Overlay (VENUEPAGE-03)

**What:** Replace the invisible `<Link href="/paikat/${paikka.id}">` at line 91 with a prop-conditional element.

**Source:** [VERIFIED: app/components/DiagonaalKortti.tsx line 91; UI-SPEC §Interaction Contracts]

```tsx
// Props interface — add onOpen, remove onCardClick (or keep onCardClick as optional dead prop):
interface DiagonaalKorttiProps {
  paikka: Liikuntapaikka
  distanceStr?: string
  isSaved?: boolean
  onShowMap?: (paikka: Liikuntapaikka) => void
  onOpen?: (paikka: Liikuntapaikka) => void   // NEW — replaces navigation
  // onCardClick?: () => void                  // REMOVED (scroll-state, now unnecessary)
  onToggleTodo?: (id: number) => void
  brandColor?: string
  accentColor?: string
}

// Replace the existing <Link> block (line 91) with:
{onOpen ? (
  <div
    role="button"
    tabIndex={0}
    className="absolute inset-0 block z-10 cursor-pointer"
    onClick={() => onOpen(paikka)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(paikka) }}
  />
) : (
  <div className="absolute inset-0 block z-10" />
)}

// IMPORTANT: Remove the <Link> wrapper that currently encloses the LEFT and RIGHT panels.
// The LEFT info panel and RIGHT photo panel become direct children of the inner div.
```

**Critical detail:** `Link` from `next/link` becomes unused after this change. Remove the import to avoid TypeScript warnings.

### Pattern 3: Etusivu Wiring (VENUEPAGE-03)

**What:** Add `onOpen` to both DiagonaalKortti usages and remove `onCardClick`.

**Source:** [VERIFIED: app/components/Etusivu.tsx lines 1074, 1460–1472]

```tsx
// Line 1460 (search list) — replace onCardClick with onOpen + close search first:
<DiagonaalKortti
  key={p.id}
  paikka={p}
  distanceStr={distancesMap[p.id] != null ? formatDistance(distancesMap[p.id]) : undefined}
  onShowMap={(paikka) => {
    setSearchOpen(false)
    if (sheetPhase === 'open') setSheetPhase('sliding')
    if (paikka.latitude != null && paikka.longitude != null) {
      setAutoZoomTarget({ lat: paikka.latitude, lng: paikka.longitude })
    }
  }}
  onOpen={(p) => {            // NEW
    setSearchOpen(false)      // dismiss search overlay before opening sheet
    setValittu(p)
  }}
  // onCardClick removed
/>

// Line 1074 (TODO overlay) — add onOpen to open sheet + dismiss TODO:
<DiagonaalKortti
  paikka={p}
  isSaved={true}
  onShowMap={pk => { if (pk.latitude != null && pk.longitude != null) setAutoZoomTarget({ lat: pk.latitude, lng: pk.longitude }) }}
  onToggleTodo={handleOverlayDelete}
  onOpen={(p) => {            // NEW
    setTodoOpen(false)
    setValittu(p)
  }}
/>
```

**handleCardClick removal:** Delete lines 492–505. The `sessionStorage.setItem` call inside it is the only write to `'etusivu-scroll-state'`. The restore `useEffect` (lines 598–622) can be removed too since the key will never be set — or left as harmless dead code (reads undefined, exits early).

### Pattern 4: i18n Key Migration

**What:** Add `location` and `showOnMap` to the `PaikkaSheet` namespace. Remove the now-unused `PaikkaPage` namespace.

**Source:** [VERIFIED: messages/fi.json + messages/en.json — PaikkaSheet section lines 23–34, PaikkaPage section lines 300–309]

```json
// messages/fi.json — PaikkaSheet section, add after "close":
"location": "Sijainti",
"showOnMap": "Näytä kartalla"

// messages/en.json — PaikkaSheet section, add after "close":
"location": "Location",
"showOnMap": "Show on map"

// Both files — remove PaikkaPage block entirely after deletion of app/paikat/[id]/:
// "PaikkaPage": { "backToDirectory": ..., "price": ..., ... }
```

**i18n note:** The old `PaikkaPage.showOnMap` value has a trailing arrow "→" (`"Näytä kartalla →"`). The new `PaikkaSheet.showOnMap` omits the arrow, matching the UI-SPEC.

### Anti-Patterns to Avoid

- **Leaving Link import in DiagonaalKortti after removing the `<Link>` usage:** TypeScript will warn about an unused import. Remove `Link` from the import line when replacing the overlay.
- **Nesting the new no-op div inside the old `<Link>` wrapper:** The current `<Link>` also wraps the LEFT and RIGHT panels. The entire `<Link>` must be removed; the panels become direct children of the container `<div>`.
- **Adding `MapPin` to PaikkaSheet using a different icon size:** Existing PaikkaSheet SheetRows use `w-4 h-4` for icons (see line 207, 227, 234, 258). Use `w-4 h-4`, NOT `w-5 h-5` (which is what the old page used).
- **Placing the "Näytä kartalla" SheetRow inside the hero area:** D-02 explicitly puts it in the sheet body with the other data rows, not in the hero corner.
- **Adding a redirect at `/paikat/[id]`:** D-08 says no redirect. 404 by deletion only.
- **Making PaikkaKortti changes in this phase:** D-07 defers those to Phase 63. The PaikkaKortti links to `/paikat/[id]` will temporarily 404 — acceptable (business-side only, PreviewModal context).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Venue detail UI | Custom expanded card | Existing `PaikkaSheet` component (bottom sheet) | Already feature-complete for all data fields |
| Map centering URL | Custom param format | Existing `/?id=X` mechanism (lines 748–758 of Etusivu) | Already implemented, tested, and working |
| Sheet open trigger | New open mechanism | Existing `setValittu(p)` state in Etusivu | The only mechanism; CalloutCard already uses this pattern |
| i18n translation lookup | Inline string literals | `t('location')` and `t('showOnMap')` via `useTranslations('PaikkaSheet')` | Consistency + locale switching |

**Key insight:** The existing `/?id=X` URL param handler in Etusivu (lines 748–758) already centers the map and sets `sheetPhase('sliding')` — the "Näytä kartalla" link gets this behavior for free by reusing the existing URL scheme.

---

## Common Pitfalls

### Pitfall 1: DiagonaalKortti `<Link>` Wraps Panels — Must Remove Entire Element

**What goes wrong:** Developer replaces just the `className` or `href` on the `<Link>` but leaves it in place, thinking the card content is inside the link. In fact the current code structure is: `<Link>` → LEFT panel + RIGHT panel as children. Removing the `<Link>` and replacing with `{onOpen ? <div role="button" ...> : <div ...>}` means the LEFT and RIGHT panels become siblings of the replacement div inside the container, not children of it. Misreading the nesting causes broken layout.

**Why it happens:** The invisible overlay pattern (`absolute inset-0 z-10`) makes the `<Link>` visually indistinguishable from a zero-height element — easy to miss that the LEFT/RIGHT divs are its children.

**How to avoid:** Read DiagonaalKortti.tsx lines 89–246 in full before editing. The `<Link>` at line 91 closes at line 246 (`</Link>`). Everything between is its child. The replacement div goes at the same position but does NOT wrap the panels.

**Warning signs:** After edit, card content disappears or layout breaks completely — indicates the panels were accidentally made children of the wrong element.

### Pitfall 2: Search Overlay Stays Open After Card Click

**What goes wrong:** `onOpen={(p) => setValittu(p)}` is added without first calling `setSearchOpen(false)`. PaikkaSheet opens but the search overlay remains visible, creating a layered UI conflict.

**Why it happens:** CONTEXT.md shows `(p) => setValittu(p)` as the handler, which is correct for the TODO overlay context but incomplete for the search list context where the overlay must be dismissed first.

**How to avoid:** For line 1460 (search list), the handler must be `(p) => { setSearchOpen(false); setValittu(p) }`. This mirrors the existing `onShowMap` handler pattern at lines 1464–1470 which also calls `setSearchOpen(false)` first.

**Warning signs:** After clicking a card in the search list, PaikkaSheet is visible but the search overlay is still layered on top of it.

### Pitfall 3: Missing MapPin Import in PaikkaSheet

**What goes wrong:** The `SheetRow` for "Näytä kartalla" uses `MapPin` but it is NOT currently in PaikkaSheet.tsx's import list. TypeScript compile error on build.

**Why it happens:** `MapPin` is imported in DiagonaalKortti.tsx and the deleted `app/paikat/[id]/page.tsx`, giving a false impression it's available globally.

**How to avoid:** Add `MapPin` to the existing lucide-react import in PaikkaSheet.tsx (line 4). Current imports: `X, Phone, ExternalLink, Clock, CircleDollarSign, Info, Bookmark, BookmarkCheck, Camera, ChevronDown, Building2, BadgeCheck`.

### Pitfall 4: i18n Keys Under Wrong Namespace

**What goes wrong:** `t('location')` and `t('showOnMap')` in PaikkaSheet use `useTranslations('PaikkaSheet')` — but the keys currently only exist under `PaikkaPage`. If the planner adds them to `PaikkaPage` instead of `PaikkaSheet`, the translations will not be found at runtime.

**Why it happens:** The old page used `getTranslations('PaikkaPage')`. It's easy to add keys to the existing namespace by habit.

**How to avoid:** Add `location` and `showOnMap` to the `PaikkaSheet` object in both `messages/fi.json` and `messages/en.json`. Do not add to `PaikkaPage`. Then remove `PaikkaPage` block after route deletion.

### Pitfall 5: Stale `onCardClick` Call Site in Etusivu After Removing the Prop

**What goes wrong:** `onCardClick` is removed from DiagonaalKortti's props interface, but Etusivu still passes `onCardClick={handleCardClick}` at line 1471. TypeScript reports unknown prop error.

**Why it happens:** Props are removed from the interface but call sites are not updated simultaneously.

**How to avoid:** When removing `onCardClick` from DiagonaalKortti's interface, also remove `onCardClick={handleCardClick}` from the Etusivu call site at line 1471, and delete the `handleCardClick` function at lines 492–505.

---

## Code Examples

Verified patterns from official codebase inspection:

### Existing SheetRow Usage (reference for new row)
```tsx
// Source: app/components/PaikkaSheet.tsx lines 257–261 [VERIFIED: codebase]
{paikka.kuvaus && (
  <SheetRow icon={<Info className="w-4 h-4" />} label={t('description')}>
    <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{paikka.kuvaus}</p>
  </SheetRow>
)}
```

### SheetRow Component Definition (reference for consistent styling)
```tsx
// Source: app/components/PaikkaSheet.tsx lines 322–334 [VERIFIED: codebase]
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

### Existing focusId / "Näytä kartalla" URL Handler
```tsx
// Source: app/components/Etusivu.tsx lines 748–758 [VERIFIED: codebase]
// This handler already exists and fires when user navigates to /?id=X
useEffect(() => {
  if (!focusId) return
  const id = Number(focusId)
  const target = paikat.find(p => p.id === id)
  if (!target || target.latitude == null || target.longitude == null) return
  setSheetVisible(true)
  setAutoZoomTarget({ lat: target.latitude, lng: target.longitude })
  setSheetPhase('sliding')
}, [focusId, paikat])
```

### i18n PaikkaSheet Namespace (current state)
```json
// Source: messages/fi.json lines 23–34 [VERIFIED: codebase]
"PaikkaSheet": {
  "price": "Hinta",
  "hours": "Aukioloajat",
  "phone": "Puhelin",
  "description": "Kuvaus",
  "bookNow": "Varaa aika",
  "reviews": "Arvostelut",
  "noReviews": "Ei arvosteluja",
  "reviewCountSingular": "1 arvostelu",
  "reviewCountPlural": "{count} arvostelua",
  "close": "Sulje"
  // ADD: "location": "Sijainti", "showOnMap": "Näytä kartalla"
}
```

---

## Runtime State Inventory

> This phase does NOT involve rename/migration/refactor of stored data or live service config. Included for completeness.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | None — venue data in Supabase is unchanged | None |
| Live service config | None — no external services configured for this route | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no env vars reference `/paikat/[id]` | None |
| Build artifacts | None — `app/paikat/[id]/page.tsx` is source code; Next.js build cache will rebuild automatically | None |

---

## Environment Availability

> Phase has no external dependencies beyond the project's existing Next.js dev server.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev/build | ✓ | (existing) | — |
| `npm run dev` / `npm run build` | TypeScript verification after edits | ✓ | (existing) | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no automated test framework installed in this project |
| Config file | none |
| Quick run command | `npm run build` (TypeScript + Next.js compile check) |
| Full suite command | `npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VENUEPAGE-01 | `app/paikat/[id]/` directory does not exist | manual | `ls app/paikat/ 2>&1` → directory absent | N/A |
| VENUEPAGE-01 | TypeScript compiles without PaikkaPage imports | build | `npm run build` | ✓ |
| VENUEPAGE-02 | PaikkaSheet shows "Näytä kartalla" row when venue has coordinates | manual UAT | Open PaikkaSheet for coordinated venue | N/A |
| VENUEPAGE-02 | "Näytä kartalla" row absent when coordinates null | manual UAT | Open PaikkaSheet for venue without coords | N/A |
| VENUEPAGE-02 | "Näytä kartalla" row absent in preview mode | manual UAT | Open PreviewModal, check PaikkaSheet | N/A |
| VENUEPAGE-03 | DiagonaalKortti click in search list opens PaikkaSheet (no navigation) | manual UAT | Click card in search list | N/A |
| VENUEPAGE-03 | DiagonaalKortti click in TODO overlay opens PaikkaSheet | manual UAT | Click card in TODO list | N/A |
| VENUEPAGE-03 | DiagonaalKortti in PreviewModal has no click action | manual UAT | Click card in business preview modal | N/A |
| VENUEPAGE-03 | DiagonaalKortti in LivePreviewPane has no click action | manual UAT | Click card in onboarding live preview | N/A |
| VENUEPAGE-04 | GET /paikat/123 returns 404 | manual UAT | Navigate browser to `/paikat/1` | N/A |

### Sampling Rate

- **Per task commit:** `npm run build` — catches TypeScript errors immediately
- **Per wave merge:** `npm run build` + manual smoke test of DiagonaalKortti click → PaikkaSheet open
- **Phase gate:** Full manual UAT checklist above before `/gsd-verify-work`

### Wave 0 Gaps

- No test infrastructure gaps — this project has no test framework and manual UAT is the only available verification method.

---

## Security Domain

> security_enforcement is not explicitly false in config.json, so this section is included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth changes in this phase |
| V3 Session Management | No | sessionStorage cleanup (D-06) removes data, does not introduce auth risk |
| V4 Access Control | No | Route deletion removes a public page; no access control changes |
| V5 Input Validation | Minimal | `/?id=X` link uses `paikka.id` (a numeric database PK, not user input); no injection risk |
| V6 Cryptography | No | No cryptography involved |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open redirect via `/?id=X` link | Tampering | Not applicable — `paikka.id` is a numeric PK from Supabase, not user-supplied input. The URL is constructed from trusted DB data. |
| Dead link injection via PaikkaKortti `/paikat/` links | Tampering | Accepted risk (D-07): these are internal links to a 404 route, not external redirects. Phase 63 resolves. |

**Security assessment:** This phase has no meaningful security surface changes. It removes a public server-side rendered page and replaces internal navigation with a client-side state transition. No auth, no data writes, no user input handling introduced.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 62 |
|-----------|-------------------|
| `.glass`, `.glass-hover`, `.glass-btn` utility classes — never replicate inline | SheetRow already uses `.glass` in icon wrapper; new SheetRow follows same pattern |
| Tailwind v3 (not v4) — no `@import "tailwindcss"` | No new CSS; existing Tailwind classes only |
| NavBar/BottomNav — dead `BottomNav` not referenced | No impact |
| URL routing: `?nakyma=kartta` is a dead parameter | No new URL params introduced |
| No new runtime dependencies in v3.1 | Confirmed: zero new packages |
| `buttonVariants()` from `components/ui/button.tsx` for link-as-button | Not needed in this phase; using plain `<a>` tag |
| `Kartta` is lazy-loaded | No impact |
| Supabase writes: service role key only | No Supabase writes in this phase |
| 4 font sizes only, 2 weights only (400 + 700) | SheetRow uses `text-[10px] font-bold` (label) + `text-sm font-bold` (link) — within budget |
| No Spring animations unless direct drag/cursor tracking | SheetRow has no animation; DiagonaalKortti animation unchanged |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate venue detail page (`/paikat/[id]`) | Bottom sheet (PaikkaSheet) opened inline | Phase 62 | Eliminates full-page navigation; scroll context preserved; single page UX |
| `<Link href="/paikat/X">` overlay in DiagonaalKortti | `onOpen` callback prop with no-op fallback | Phase 62 | Cards become context-aware: trigger sheet in consumer view, inert in preview view |

**Deprecated after this phase:**
- `PaikkaPage` i18n namespace — unused once `app/paikat/[id]/page.tsx` is deleted; remove from both `messages/*.json`
- `handleCardClick` function in Etusivu — scroll-state save for navigation that no longer occurs
- sessionStorage `'etusivu-scroll-state'` key — will never be written after `handleCardClick` removal

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `focusId` / `/?id=X` handler in Etusivu (lines 748–758) does NOT auto-open PaikkaSheet (it centers map and sets `sheetPhase('sliding')` but does not call `setValittu`). The "Näytä kartalla" link therefore lands on a map view, not a sheet view. | Code Examples | If the handler DOES open the sheet (possible via future change), the link becomes redundant rather than wrong — low risk. |

**Risk assessment on A1:** Reading Etusivu.tsx lines 748–758 directly confirms: `setSheetVisible(true)`, `setAutoZoomTarget(...)`, `setSheetPhase('sliding')` — no `setValittu`. Confidence is HIGH that the link opens the map without the sheet. Clicking the pin then opens the sheet via the existing `onClick` handler.

**If this table had more entries:** All other claims were verified directly from codebase reads — no additional user confirmation needed.

---

## Open Questions

1. **sessionStorage restore `useEffect` (lines 598–622) cleanup**
   - What we know: `handleCardClick` is the only writer of `'etusivu-scroll-state'`. Removing the writer makes the restore effect harmless dead code.
   - What's unclear: Whether the planner should proactively remove the restore `useEffect` (60 lines of Etusivu churn) or leave it as dead code.
   - Recommendation: Remove it. The `searchResultsRef` at line 427 is also only used for scroll tracking (lines 494 + 619) — removing all three (function, effect, ref) is cleanest and reduces future confusion. Claude's discretion per D-06.

2. **`onCardClick` prop on DiagonaalKortti**
   - What we know: It was used only for sessionStorage scroll-state saving before navigation. That navigation is removed.
   - What's unclear: Whether any preview context passes `onCardClick` (they don't — confirmed by grep).
   - Recommendation: Remove the prop entirely. No call sites remain after line 1471 is updated.

---

## Sources

### Primary (HIGH confidence)

- `app/paikat/[id]/page.tsx` — Full read; confirmed "Näytä kartalla" link at lines 90–99 is the only unique content
- `app/components/PaikkaSheet.tsx` — Full read; confirmed SheetRow pattern, MapPin absent from imports, position for new row
- `app/components/DiagonaalKortti.tsx` — Full read; confirmed `<Link>` overlay at line 91, existing props interface
- `app/components/Etusivu.tsx` — Targeted reads at lines 380–505, 598–622, 730–758, 905–930, 1065–1078, 1435–1474; confirmed two DiagonaalKortti wiring points and handleCardClick function
- `app/components/PreviewModal.tsx` — Lines 1–70 read; confirmed `<DiagonaalKortti paikka={paikka} />` with no onOpen (no-op)
- `app/business/onboarding/LivePreviewPane.tsx` — Grep; confirmed `<DiagonaalKortti ... />` with no onOpen (no-op)
- `app/admin/[id]/page.tsx` — Grep; confirmed `<DiagonaalKortti paikka={paikka} />` with no onOpen (no-op)
- `messages/fi.json` — Grep; confirmed PaikkaSheet namespace (lines 23–34) missing `location`/`showOnMap`; PaikkaPage namespace (lines 300–309) has them
- `messages/en.json` — Grep; confirmed same structure as fi.json
- `.planning/phases/62-venuepage-konsolidaatio/62-CONTEXT.md` — Full read; all locked decisions
- `.planning/phases/62-venuepage-konsolidaatio/62-UI-SPEC.md` — Full read; exact code contract for SheetRow

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — Phase 62 requirements VENUEPAGE-01..04
- `.planning/STATE.md` — Active decisions and phase dependency order
- `.planning/config.json` — nyquist_validation: true; commit_docs: true; no new deps constraint

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all existing
- Architecture: HIGH — verified by direct codebase reading
- Pitfalls: HIGH — derived from actual code structure inspection, not general knowledge
- i18n keys: HIGH — verified exact key names in both JSON files

**Research date:** 2026-07-01
**Valid until:** 2026-07-31 (stable codebase, no external API changes possible)
