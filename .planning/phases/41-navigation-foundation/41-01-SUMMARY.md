---
phase: 41-navigation-foundation
plan: 01
subsystem: ui
tags: [next-intl, framer-motion, lucide-react, glassmorphism, supabase-ssr, business-nav]

# Dependency graph
requires:
  - phase: 39-auth-separaatio
    provides: createBusinessBrowserClient() and sb-biz-* cookie namespace for sign-out
  - phase: 30-i18n-fien
    provides: next-intl useTranslations pattern and Business namespace in fi.json/en.json

provides:
  - BusinessNav client component (app/components/BusinessNav.tsx) — glass pill nav for /business/* area
  - 6 Business.navX i18n keys in both fi.json and en.json

affects:
  - 41-02 (Plan 02 wires BusinessNav into app/business/layout.tsx)
  - 42-business-map (will be linked by BusinessNav bottom-left Kartta button)
  - 43-business-profiili (will be linked by BusinessNav top-right pill Profiili link)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BusinessNav as structural clone of NavPill.tsx with business-specific substitutions
    - createBusinessBrowserClient() for sign-out (sb-biz-* cookie namespace isolation)
    - usePathname() for active route detection in client component nav
    - Fixed pill at top: max(12px, env(safe-area-inset-top)); bottom button: max(16px, env(safe-area-inset-bottom))

key-files:
  created:
    - app/components/BusinessNav.tsx
  modified:
    - messages/fi.json
    - messages/en.json

key-decisions:
  - "BusinessNav uses createBusinessBrowserClient() exclusively — consumer createBrowserSupabase() never referenced (T-41-01 mitigation)"
  - "Plain text 'AKTIIVI Business' in top-left Link — AktiiviLogo not used (animation loop too heavy for nav per RESEARCH.md)"
  - "sign-out calls router.push('/business/kirjaudu') not router.refresh() — want navigation to login, not in-place state refresh"
  - "No subscribeToAuthUser — middleware guarantees all /business/* routes are authenticated; always show Profiili link"

patterns-established:
  - "Pattern: BusinessNav glass pill clone — replicate NavPill.tsx architecture for business routes; substitute createBusinessBrowserClient for createBrowserSupabase"
  - "Pattern: bottom-left fixed glass button for standalone route shortcut — w-10 h-10 glass-btn rounded-full, safe-area-inset-bottom"

requirements-completed:
  - BIZNAV-01

# Metrics
duration: 8min
completed: 2026-06-12
---

# Phase 41 Plan 01: BusinessNav Component Summary

**BusinessNav glass pill client component with business-specific sign-out (sb-biz-*), active route highlighting via usePathname(), and 6 i18n keys added to Business namespace**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-12T09:04:00Z
- **Completed:** 2026-06-12T09:12:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added 6 BusinessNav i18n keys (navDashboard, navMap, navProfile, navSignOut, navOpenMenu, navCloseMenu) to both fi.json and en.json under Business namespace
- Created BusinessNav.tsx as a structural clone of NavPill.tsx with business-specific substitutions: createBusinessBrowserClient(), no subscribeToAuthUser, no AuthModal, usePathname() for active state
- All three nav elements implemented: top-left "AKTIIVI Business" brand link, top-right glass pill with Profiili + Kirjaudu ulos, bottom-left Map icon button to /business/map
- TypeScript strict compilation passes with 0 errors; all 116 vitest tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add BusinessNav i18n keys to fi.json and en.json** - `451af40` (feat)
2. **Task 2: Create BusinessNav.tsx client component** - `c85ac27` (feat)

## Files Created/Modified

- `app/components/BusinessNav.tsx` - New business nav client component; glass pill nav for /business/* area
- `messages/fi.json` - 6 navX keys added to Business namespace (Finnish)
- `messages/en.json` - 6 navX keys added to Business namespace (English)

## Decisions Made

- Used plain text "AKTIIVI Business" in top-left Link (not AktiiviLogo) — AktiiviLogo has a continuous framer-motion animation loop in useEffect that is too heavy for a nav label
- sign-out uses `router.push('/business/kirjaudu')` not `router.refresh()` — NavPill uses refresh because consumer stays on same page; business nav wants navigation to the login page
- No user state / subscribeToAuthUser in BusinessNav — middleware already guarantees authentication on all non-public /business/* routes; Profiili link is always shown
- Profiili link always visible in expanded pill (no conditional rendering) — consistent with middleware guarantee

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- BusinessNav component is ready to be imported in app/business/layout.tsx (Plan 02)
- Bottom-left Kartta button links to /business/map — 404 until Phase 42 implements the map page (acceptable per D-04)
- Profiili link leads to /business/profiili — Phase 43 will implement the profile page

---

## Self-Check

**Files exist:**
- app/components/BusinessNav.tsx: FOUND
- messages/fi.json: FOUND (with navX keys)
- messages/en.json: FOUND (with navX keys)

**Commits exist:**
- 451af40: FOUND
- c85ac27: FOUND

## Self-Check: PASSED

---
*Phase: 41-navigation-foundation*
*Completed: 2026-06-12*
