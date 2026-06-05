---
phase: 33-claim-paikan-luonti
plan: 06
subsystem: ui
tags: [next.js, server-component, supabase, ssr, i18n, glassmorphism]

# Dependency graph
requires:
  - phase: 33-02
    provides: ClaimSearchForm client component
  - phase: 33-03
    provides: business_paikka_links DB table with RLS policies
  - phase: 33-05
    provides: Business i18n keys (pendingTitle, pendingVenueLabel, pendingBody, claimTitle)

provides:
  - "app/business/page.tsx — full Server Component claim/create entry point"
  - "Path A: ClaimSearchForm inside glass panel for unauthenticated / no-links users"
  - "Path B: status placeholder with venue name for users with pending business_paikka_links"

affects:
  - "33-07+ (all subsequent business dashboard phases build on this page)"
  - "Phase 34 onboarding wizard (will replace Path B status placeholder)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component with server-side Supabase auth check before rendering — same pattern as app/paikat/[id]/page.tsx"
    - "createServerSupabase(cookies()) for anon+RLS query in Server Component"
    - "Branched render paths (hasLinks true/false) decided on the server — no client-side flicker"

key-files:
  created: []
  modified:
    - app/business/page.tsx

key-decisions:
  - "Used createServerSupabase (anon key + RLS) not supabaseAdmin — business_paikka_links SELECT policy USING (auth.uid() = business_account_id) correctly returns only the current user's own links"
  - "Unauthenticated users (user == null) see Path A — consistent with Phase 32 D-08 deferral (no middleware auth guard yet)"
  - "Outer glass panel is a static server-rendered div — no motion.div wrapper (Server Components cannot use framer-motion hooks); ClaimSearchForm handles all internal animations"
  - "TypeScript cast via 'as unknown as' for Supabase join return type mismatch (join returns array, not object | null)"

patterns-established:
  - "Server Component with session check: const { data: { user } } = await supabase.auth.getUser() — then branch on user"
  - "Supabase join cast: links[0] as unknown as { ... } when Supabase infers array for nested select"

requirements-completed:
  - CLAIM-01
  - CLAIM-02
  - CLAIM-03

# Metrics
duration: 12min
completed: 2026-06-05
---

# Phase 33 Plan 06: Business Page Server Component Summary

**Server Component /business entry point with server-side business_paikka_links check — Path A (ClaimSearchForm) for new users, Path B (pending status placeholder) for users with existing links**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-05T16:06:00Z
- **Completed:** 2026-06-05T16:18:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Korvattu Phase 32:n stub taydellisella Server Component -toteutuksella
- Palvelinpuolen business_paikka_links-tarkistus — ei client-side flikkeria autentikointitilassa
- Path A: ClaimSearchForm max-w-md glass-paneelissa kirjautumattomille / ilman linkkeja oleville kayttajille
- Path B: tilaplaceholder (paikan nimi + "Odottaa admin-hyvaksyntaa") kayttajille joilla on olemassa olevia linkkeja

## Task Commits

1. **Task 1: Replace app/business/page.tsx with server component claim/create UI** - `4d155c9` (feat)

## Files Created/Modified
- `app/business/page.tsx` - Server Component joka tarkistaa business_paikka_links palvelimella ja renderoi Path A tai Path B

## Decisions Made
- `createServerSupabase` (anon key + RLS) on oikea valinta — business_paikka_links SELECT-policy palauttaa vain nykyisen kayttajan omat linkit; supabaseAdmin ei tarvita
- Kirjautumaton kayttaja (user == null) saa Path A:n — yhteinen Phase 32 D-08 -paatoksen kanssa (middleware-suojaus siirretty Phase 36:lle)
- Supabase join TypeScript-cast: as unknown as tarvitaan koska Supabase inferoi nested selectin paluutyypiksi taulukon, ei objektia

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript-cast korjattu as unknown as:ksi**
- **Found during:** Task 1 (TypeScript-tarkistus)
- **Issue:** Supabase join palauttaa `{ nimi: any }[]` (taulukko), ei `{ nimi: any } | null` — suora cast epaonnistui TS2352-virheella
- **Fix:** Muutettu `links[0] as { ... }` -> `links[0] as unknown as { ... }`
- **Files modified:** app/business/page.tsx
- **Verification:** `npx tsc --noEmit` ei raportoi virheita business/page.tsx:lle
- **Committed in:** 4d155c9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Pieni TypeScript-korjaus — ei vaikutusta toiminnallisuuteen tai arkkitehtuuriin.

## Issues Encountered
- Supabase join-tyypin inferenssi: liikuntapaikat(nimi) palauttaa `{ nimi: any }[]` eika `{ nimi: any } | null` kuten plan-dokumentaatiossa oletettiin. as unknown as on vakiokiertotie tahan Supabase-rajoitukseen.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /business-reitti on valmis: nayttaa ClaimSearchFormin uusille kayttajille, tilaplaceholderin olemassa oleville
- Phase 34 onboarding-velho korvaa Path B tilaplaceholderin taydella hallintanakymalla
- Phase 36 lisaa middleware-suojauksen kirjautumattomilta (Phase 32 D-08 deferral)

## Self-Check

Files exist:
- app/business/page.tsx: EXISTS (committed in 4d155c9)

Commits exist:
- 4d155c9: EXISTS (verified via git log)

## Self-Check: PASSED

---
*Phase: 33-claim-paikan-luonti*
*Completed: 2026-06-05*
