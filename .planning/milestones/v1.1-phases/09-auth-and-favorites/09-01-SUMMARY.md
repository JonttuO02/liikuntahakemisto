---
phase: "09"
plan: "01"
subsystem: auth-foundation
tags: [auth, supabase-ssr, middleware, database, typescript]
dependency_graph:
  requires: [phase-06-legal, phase-08-map-features]
  provides: [supabase-ssr-helpers, session-middleware, suosikit-schema, suosikki-type]
  affects: [middleware, lib/supabaseSSR.ts, lib/types.ts, supabase/migrations]
tech_stack:
  added: ["@supabase/ssr@^0.10.3"]
  patterns: [supabase-ssr-server-client, middleware-session-refresh, rls-with-check]
key_files:
  created:
    - middleware.ts
    - lib/supabaseSSR.ts
    - supabase/migrations/20260523_suosikit.sql
  modified:
    - lib/types.ts
    - package.json
    - package-lock.json
decisions:
  - "@supabase/ssr 0.10.3 käytetään; createServerClient per-request, createBrowserClient asiakaskomponenteille"
  - "middleware.ts käyttää getAll/setAll cookie-mallia Supabase SSR -dokumentaation mukaisesti"
  - "suosikit-taulun INSERT-käytäntö käyttää WITH CHECK -lauseketta (ei USING) L-04:n mukaisesti"
  - "Migration SQL on kirjoitettu tiedostoon; käyttäjä ajaa sen manuaalisesti ennen plan 09-03:a"
metrics:
  duration_seconds: 88
  completed_date: "2026-05-23"
  tasks_completed: 5
  tasks_total: 5
  files_created: 3
  files_modified: 3
---

# Phase 9 Plan 01: Foundation — SSR package, middleware, DB schema — Summary

**One-liner:** Asennettu @supabase/ssr, luotu middleware.ts-istunnon virkistysketju, SSR-asiakasapufunktiot ja suosikit-taulun SQL-migraatio RLS-käytäntöineen.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| T-01-1 | Install @supabase/ssr | 06de39a | package.json, package-lock.json |
| T-01-2 | Create middleware.ts | ba31423 | middleware.ts |
| T-01-3 | Create lib/supabaseSSR.ts | d7f53e3 | lib/supabaseSSR.ts |
| T-01-4 | Add Suosikki type to lib/types.ts | c69f834 | lib/types.ts |
| T-01-5 | Create suosikit migration SQL | 136182c | supabase/migrations/20260523_suosikit.sql |

## Acceptance Criteria

- [x] `@supabase/ssr` on `package.json`-riippuvuuksissa (versio ^0.10.3)
- [x] `middleware.ts` on projektin juuressa; käyttää Supabase SSR -istunnon virkistysmallia
- [x] `lib/supabaseSSR.ts` vie `createBrowserSupabase` ja `createServerSupabase`
- [x] `Suosikki`-tyyppi on `lib/types.ts`:ssa
- [x] `suosikit`-taulun SQL on valmis ajettavaksi Supabase-dashboardissa
- [x] `npm run build` läpäisty (TypeScript kääntyy, ei import-virheitä)

## Build Output

```
✓ Compiled successfully
ƒ Middleware  81.5 kB
```

Kaksi ESLint-varoitusta `Etusivu.tsx`:ssä (react-hooks/exhaustive-deps ja no-img-element) ovat peräisin edellisistä vaiheista — ei liity tähän suunnitelmaan.

## Manual Step Required Before Plan 09-03

**Kriittinen:** `suosikit`-taulu täytyy luoda Supabase-dashboardissa ennen plan 09-03:n testaamista.

Aja tiedoston `supabase/migrations/20260523_suosikit.sql` sisältö Supabase Dashboard → SQL Editor -osiossa.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes beyond those explicitly modeled in the plan's threat register.

## Self-Check: PASSED

- [x] middleware.ts exists at C:\ClaudeCodeTestit\liikuntahakemisto\middleware.ts
- [x] lib/supabaseSSR.ts exists at C:\ClaudeCodeTestit\liikuntahakemisto\lib\supabaseSSR.ts
- [x] supabase/migrations/20260523_suosikit.sql exists
- [x] lib/types.ts contains Suosikki type
- [x] package.json contains @supabase/ssr
- [x] Commits 06de39a, ba31423, d7f53e3, c69f834, 136182c all present
