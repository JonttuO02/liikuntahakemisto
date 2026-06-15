---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: AI-pohjainen yrityssivuanalyysi
status: archived
stopped_at: milestone complete (2026-06-16)
last_updated: "2026-06-16T00:00:00.000Z"
last_activity: 2026-06-16
progress:
  total_phases: 46
  completed_phases: 46
  total_plans: 125
  completed_plans: 125
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-16)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v2.1 milestone shipped — ready for next milestone

## Current Position

Phase: 46 (complete)
Plan: All complete
Status: Milestone shipped

Last activity: 2026-06-16

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

## Carry-Forward (open items for next milestone)

- P45-WR-05: `lib/branding/storage.ts` uploadLogo — UUID format assertion on `businessAccountId`
- P45-WR-06: Migration timestamp order — on fresh db push, uploadLogo may fail before bucket creation
- P45-DNS: DNS rebinding bypasses hostname SSRF guard — post-DNS IP validation deferred
- CR-01: `app/business/[id]/page.tsx` reads venue data without ownership check (pre-existing since Phase 38)
- CR-02: `app/api/business/onboarding/submit/route.ts` doesn't filter by `paikka_id` (pre-existing since Phase 38)

## Session Continuity

Last session: 2026-06-16
Stopped at: milestone complete
Resume file: None
