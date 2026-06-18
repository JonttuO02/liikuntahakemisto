---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Onboarding-tekoälyn parannukset
current_phase: 51
status: executing
stopped_at: Phase 51 planned and verified
last_updated: "2026-06-18T11:49:06.243Z"
last_activity: 2026-06-18
last_activity_desc: Phase 51 complete
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 20
  completed_plans: 20
  percent: 100
current_phase_name: live-esikatselu-velhossa
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-16)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 51 — live-esikatselu-velhossa

## Current Position

Phase: 51
Plan: Not started
Status: Executing Phase 51
Last activity: 2026-06-18 — Phase 51 complete

Progress: [██████░░░░] 60%

## v2.2 Roadmap Summary

| Phase | Goal | Requirements |
|-------|------|---------------|
| 47. Skeema & monisivuinen scraper-putki | Multi-page crawl + SSRF re-validation + schema for plural branding data | SCRAP-06..09, BRDDB-03..05 |
| 48. Logo-, väri- ja galleriavalinta | User picks logo/colors from candidates; validated PATCH route; gallery prefill | ONBOARD-14..17 |
| 49. Esikatselu- ja kontrastikorjaukset | Step 6 CalloutCard swap; shared contrast-safe logo primitive | PREV-02, PREV-03 |
| 50. Flow-uudelleenjärjestys & pikahyväksyntä | StepPaikka before URL-analysis; quick-accept into admin queue | FLOW-01..04 |
| 51. Live-esikatselu velhossa | Shared live-preview state; desktop split / mobile toggle | LIVEPREV-01..04 |

Dependency order: 47 → 48 → 49 → 50 (parallel-safe with 48/49 if needed) → 51 (must be last; consumes final data shape from 47-49).

## v2.1 Summary

v2.1 AI-pohjainen yrityssivuanalyysi — shipped 2026-06-16.

- Phase 44: Brändidatan tietokantaperusta (1/1 plans) ✅
- Phase 45: Scraper & Claude API -putki (4/4 plans) ✅
- Phase 46: Pre-vaihe UI & velhointegraatio (5/5 plans) ✅

All 14 requirements delivered. Archive: `.planning/milestones/v2.1-ROADMAP.md`

## Active Decisions (carried forward)

- URL routing: `/` ja `/?nakyma=kartta` molemmat renderöivät Etusivun — `?nakyma=kartta` on kuollut parametri
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- Storage RLS: SECURITY DEFINER function in public schema (storage schema forbidden)
- JWT verification: supabaseAdmin.auth.getUser(token) at every Route Handler boundary
- Middleware: never query DB from middleware (Edge Runtime); use RSC layout for auth checks
- **v1.9**: Business routes use `sb-biz-*` cookie namespace; consumer routes use default `sb-*`
- **v1.9**: `createBusinessServerClient()` and `createBusinessBrowserClient()` in `lib/supabase-business.ts`
- **v1.9**: Single `WizardInner` component (mode: 'onboarding' | 'edit')
- **v2.0**: /business/map is a NEW standalone route — does NOT modify Etusivu.tsx
- **v2.0**: Consumer /profiili page is NOT touched — business users navigate to /business/profiili
- **v2.1**: No Playwright — `fetch` only; Framer/SPA fallback is manual entry
- **v2.1**: `business_branding` FK references `business_accounts`, not `businesses`
- **v2.1**: One Claude API call per analysis (vision + text in same message)
- **v2.1**: `waitUntil` fire-and-forget — POST returns immediately; background pipeline continues
- **v2.2 (research)**: New dependency `cheerio@^1.2.0` for DOM-based link/image discovery — replaces regex extraction
- **v2.2 (research)**: No concurrency-limiter, no headless browser, no state-management library, no form library — existing patterns (`Promise.all` + `AbortSignal.timeout`, React Context+reducer) are sufficient
- **v2.2 (research)**: Live preview (Phase 51) sequenced last — depends on final data shape from Phases 47-49; building earlier risks rework

## Carry-Forward (open items for next milestone)

- P45-WR-05: `lib/branding/storage.ts` uploadLogo — UUID format assertion on `businessAccountId`
- P45-WR-06: Migration timestamp order — on fresh db push, uploadLogo may fail before bucket creation
- P45-DNS: DNS rebinding bypasses hostname SSRF guard — post-DNS IP validation deferred (relevant to Phase 47's SSRF re-validation work)
- CR-01: `app/business/[id]/page.tsx` reads venue data without ownership check (pre-existing since Phase 38)
- CR-02: `app/api/business/onboarding/submit/route.ts` doesn't filter by `paikka_id` (pre-existing since Phase 38)

## Open Product Decisions (must resolve before relevant phase)

- **Phase 47**: Multi-venue `business_branding` scoping — confirm re-keying unique constraint to include `paikka_id` (BRDDB-05) is the chosen fix, not just documenting the limitation
- **Phase 47**: Empirically validate Vercel Hobby `waitUntil` 10s budget under 3-5 page parallel fetch load — do not assume the cap is safe by inspection alone
- **Phase 50**: Define "minimum viable draft" for quick-accept — what counts as good enough to submit without the remaining wizard steps

## Session Continuity

Last session: 2026-06-17T22:23:19.421Z
Stopped at: Phase 51 planned and verified
Resume file: .planning/phases/51-live-esikatselu-velhossa/51-04-PLAN.md

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 48 P04 | 10min | 2 tasks | 2 files |

## Decisions

- [Phase ?]: 48-04: handleConfirm save-step writes step:1 so WizardInner lands on Step 2 (Media), not skipping it
- [Phase ?]: 48-04: StepEsikatselu brandColor fallback uses colors.find(role==='background') instead of colors[0], mirroring AnalysoiSivusto
