---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Oma tietokanta
current_phase: 52
current_phase_name: next to plan
status: roadmap_complete
stopped_at: Phase 52 context gathered
last_updated: "2026-06-22T08:04:35.834Z"
last_activity: 2026-06-22
last_activity_desc: v3.0 roadmap created (6 phases, 12 requirements, 100% coverage)
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-21)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v3.0 roadmap created (Phases 52–57) — ready for /gsd-plan-phase 52

## Current Position

Phase: 52 (next to plan) — Cleanup — i18n-merkkijonot & AuthModal-bugi
Plan: —
Status: Roadmap complete; ready to plan Phase 52
Last activity: 2026-06-22 — v3.0 roadmap created (6 phases, 12 requirements, 100% coverage)

## v3.0 Roadmap Summary

| Phase | Goal | Requirements |
|-------|------|---------------|
| 52. Cleanup — i18n & AuthModal | EN-locale UI fully localized; AuthModal precedence bug fixed | CLEAN-06, CLEAN-07 |
| 53. Google Places -datan & synkkauksen poisto | sync route removed; pure-Google rows deleted via link_type provenance check | DATA-11, DATA-12 |
| 54. Sijainti — karttapinni & osoitehaku | Map-pin + autocomplete location step; only lat/lng + typed address persisted | SIJAINTI-01..03 |
| 55. AI-lajiluokitus sivuanalyysiin | AI suggests sport category (lib/lajit.ts taxonomy); user confirms/edits | AI-06 |
| 56. Claim/create-rework — luo alusta + nimikäytäntö | Create-only flow; separate company/branch name fields + normalization + backfill | CLAIM-04, CLAIM-05 |
| 57. Dashboard-redirect-korjaus & Kesken-tila | /business never auto-redirects; per-venue Kesken badge with resume | BIZPANEL-04, BIZPANEL-05 |

Dependency order: 52, 53, 55 independent (parallel-safe) → 54 feeds 56 → 57 LAST (after 56's claim/create rework; per PITFALLS Pitfall 9 the dashboard/redirect entry point couples to the reworked create flow).

Open product decisions to resolve before the relevant phase:

- **Phase 53**: Fate of unclaimed-but-kept venues post sync-removal (delete vs. keep with staleness signal) — PITFALLS Pitfall 2; take a pre-migration pg_dump.
- **Phase 56**: Company/branch naming = cosmetic (one venue per flow) vs. multi-branch precursor — log decision in PROJECT.md before writing the migration (PITFALLS Pitfall 7). Chain support stays deferred.

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
- **Cleanup phase candidate** — fold into a small early phase of the next milestone:
  - P23-GAP (23-VERIFICATION.md, status gaps_found, never fixed): `AktiiviLogo.tsx` redesigned correctly but orphaned — not imported in `Etusivu.tsx` or anywhere else; bottom sheet still renders the old static SVG watermark (lines 906-933). Wiring attempt was reverted once before in Phase 16 per HANDOFF.json.
  - P30-GAP (30-VERIFICATION.md, status gaps_found, never fixed): hardcoded Finnish strings still visible to EN-locale users in `AuthModal.tsx` (loading states + mode-toggle paragraph, lines 274/284-303), `Etusivu.tsx` CalloutCard (`'vain jäsenyys'` line 278, review overlay line 1262), `app/paikat/[id]/page.tsx` location row (lines 91/96), `DiagonaalKortti.tsx` aria-label (line 205).
  - P30-BUG (same report): `AuthModal.tsx` line 27 operator-precedence bug — `A || B && C` should be `(A || B) && C` in error-message classification.

## Deferred Items

Items acknowledged and deferred at v2.2 milestone close on 2026-06-21 (pre-close audit — all from phases 20-44, pre-existing debt unrelated to v2.2 scope; v2.2's own phases 47-51.1 are clean):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 02: 02-UAT.md | unknown |
| uat_gap | Phase 04: 04-UAT.md | in_progress |
| uat_gap | Phase 20: 20-HUMAN-UAT.md | partial (4 pending scenarios) |
| uat_gap | Phase 32: 32-HUMAN-UAT.md | partial (5 pending scenarios) |
| uat_gap | Phase 33: 33-UAT.md | in_progress |
| uat_gap | Phase 39: 39-HUMAN-UAT.md | partial (4 pending scenarios) |
| uat_gap | Phase 42: 42-UAT.md | passed |
| uat_gap | Phase 43: 43-UAT.md | passed |
| verification_gap | Phase 20: 20-VERIFICATION.md | human_needed |
| verification_gap | Phase 21: 21-VERIFICATION.md | human_needed |
| verification_gap | Phase 22: 22-VERIFICATION.md | human_needed |
| verification_gap | Phase 23: 23-VERIFICATION.md | gaps_found (see Carry-Forward — P23-GAP) |
| verification_gap | Phase 25: 25-VERIFICATION.md | human_needed |
| verification_gap | Phase 26: 26-VERIFICATION.md | human_needed |
| verification_gap | Phase 27: 27-VERIFICATION.md | human_needed |
| verification_gap | Phase 30: 30-VERIFICATION.md | gaps_found (see Carry-Forward — P30-GAP, P30-BUG) |
| verification_gap | Phase 32: 32-VERIFICATION.md | human_needed |
| verification_gap | Phase 34: 34-VERIFICATION.md | human_needed |
| verification_gap | Phase 38: 38-VERIFICATION.md | human_needed |
| verification_gap | Phase 39: 39-VERIFICATION.md | human_needed |
| verification_gap | Phase 40: 40-VERIFICATION.md | human_needed |
| verification_gap | Phase 44: 44-VERIFICATION.md | human_needed |

## Open Product Decisions (must resolve before relevant phase)

- **Phase 47**: Multi-venue `business_branding` scoping — confirm re-keying unique constraint to include `paikka_id` (BRDDB-05) is the chosen fix, not just documenting the limitation
- **Phase 47**: Empirically validate Vercel Hobby `waitUntil` 10s budget under 3-5 page parallel fetch load — do not assume the cap is safe by inspection alone
- **Phase 50**: Define "minimum viable draft" for quick-accept — what counts as good enough to submit without the remaining wizard steps

## Session Continuity

Last session: 2026-06-22T08:04:35.826Z
Stopped at: Phase 52 context gathered
Resume file: .planning/phases/52-cleanup-i18n-merkkijonot-authmodal-bugi/52-CONTEXT.md

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 48 P04 | 10min | 2 tasks | 2 files |

## Decisions

- [Phase ?]: 48-04: handleConfirm save-step writes step:1 so WizardInner lands on Step 2 (Media), not skipping it
- [Phase ?]: 48-04: StepEsikatselu brandColor fallback uses colors.find(role==='background') instead of colors[0], mirroring AnalysoiSivusto

## Accumulated Context

### Roadmap Evolution

- Phase 51.1 inserted after Phase 51: Live preview missing on AnalysoiSivusto analyze/quick-accept results screen — flagged by Phase 50 summary, scoped out of Phase 51 CONTEXT.md by mistake (the preview sub-phase has brandingResult data available, contrary to the blanket pre-phase exclusion reasoning) (URGENT)

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
