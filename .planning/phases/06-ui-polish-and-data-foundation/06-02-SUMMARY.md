---
phase: 06-ui-polish-and-data-foundation
plan: 02
subsystem: ui
tags: [next.js, react, server-component, gdpr, legal, tietosuoja]

# Dependency graph
requires: []
provides:
  - "Static GDPR privacy page at /tietosuoja (server component, no auth required)"
  - "Six-section Finnish prose tietosuojaseloste with placeholder tokens"
affects:
  - "Phase 9 (auth) — LEGAL-01 must be live before auth ships"
  - "Plan 06-07 (footer link) — will wire navigation link to this page"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure server component prose page: no 'use client', no data fetching, non-async default export"
    - "Placeholder token pattern: [Rekisterinpitäjä] and [yhteyssähköposti@esimerkki.fi] for pre-launch filling"

key-files:
  created:
    - "app/tietosuoja/page.tsx"
  modified: []

key-decisions:
  - "Controller identity ([Rekisterinpitäjä]) and contact email ([yhteyssähköposti@esimerkki.fi]) are placeholder tokens — user fills before Phase 9 ships (D-01, D-02)"
  - "Policy scope: minimal/honest current state only — no personal data collected yet, sessionStorage for AI cache only (D-03)"
  - "Six section order locked by D-04: rekisterinpitäjä, mitä tietoja kerätään, evästeet ja selaintallennus, käyttäjän oikeudet, yhteydenotot, muutokset"

patterns-established:
  - "Tietosuoja page pattern: max-w-2xl mx-auto px-4 pt-10 pb-16 container, font-serif h1/h2, text-sm body at rgba(17,17,17,0.65)"

requirements-completed:
  - LEGAL-01

# Metrics
duration: 8min
completed: 2026-05-22
---

# Phase 6 Plan 02: GDPR Privacy Page Summary

**Static Finnish GDPR tietosuojaseloste at /tietosuoja — pure server component with six D-04-ordered prose sections and placeholder tokens for controller identity and contact email**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-22T03:09:00Z
- **Completed:** 2026-05-22T03:17:50Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `app/tietosuoja/page.tsx` as a pure server component (no `'use client'`, no data fetching)
- Six Finnish prose sections in D-04 order with semantic h1/h2 hierarchy
- Back link to `/` using ChevronLeft from lucide-react, matching project muted text pattern
- Both literal placeholder tokens present verbatim: `[Rekisterinpitäjä]` and `[yhteyssähköposti@esimerkki.fi]`
- Typography follows CLAUDE.md rules: font-serif headings, text-sm body, 400/700 weights only, no font-semibold
- Satisfies LEGAL-01; page is live before Phase 9 (auth) ships

## Task Commits

Each task was committed atomically:

1. **Task 1: Create static GDPR page at app/tietosuoja/page.tsx** - `0a04903` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/tietosuoja/page.tsx` - Static GDPR privacy page (Tietosuojaseloste), 118 lines, pure server component

## Decisions Made

- Used `font-serif text-xl font-bold` for h2 (UI-SPEC LEGAL-01 variant) rather than `text-sm font-bold uppercase tracking-widest` — both are valid per spec; serif variant gives visual hierarchy consistent with the profile page h1
- Back link placed above h1, consistent with `app/paikat/[id]/page.tsx` pattern
- No glassmorphism card — plain white bg throughout, matching UI-SPEC LEGAL-01 "no glassmorphism, no hero section"

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- LEGAL-01 is now satisfied; Plan 06-07 (footer link wiring) will add the "Tietosuoja" navigation link to LiikuntapaikatLista
- Phase 9 (auth) prerequisite met: LEGAL-01 is live before auth ships

---

## Self-Check

**Files exist:**
- FOUND: app/tietosuoja/page.tsx

**Commits exist:**
- FOUND: 0a04903

## Self-Check: PASSED

---

*Phase: 06-ui-polish-and-data-foundation*
*Completed: 2026-05-22*
