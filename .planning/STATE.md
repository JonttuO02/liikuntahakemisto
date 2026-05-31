---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Visuaalinen elävöitys & UX-hienosäätö
status: executing
stopped_at: Phase 23 executing — Wave 3 in progress
last_updated: "2026-06-01T00:00:00.000Z"
last_activity: 2026-06-01 — Phase 23 Wave 2 complete (plan 03 done)
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# Project State

## Current Position

Phase: 23 of 26 (Visuaalinen perusta)
Plan: 4 plans ready (waves 1–3)
Status: Ready to execute
Last activity: 2026-06-01 — Phase 23 planned (4 plans, 3 waves)

Progress: [__________] 0%

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-31)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.5 — Phase 23: Visuaalinen perusta

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 23 | Visuaalinen perusta | Planned (4 plans) |
| 24 | Callout-kortti & ikonit | Not started |
| 25 | TO DO overlay | Not started |
| 26 | Filtterit | Not started |

## Active Decisions

- v1.5: Font is Outfit (not Geist — requirements override research recommendation)
- v1.5: Pin animations use transform/opacity ONLY — never box-shadow, background, filter
- v1.5: @googlemaps/markerclusterer must NOT be activated — extend clusterPinUrl() visually only
- v1.5: /suosikit page route must survive intact (PWA deep links, auth redirects, Serwist precache)
- v1.5: sessionStorage key 'etusivu-scroll-state' gains _v: 2 field when FILTER-02 ships
- v1.5: Etusivu.tsx is the blast-radius file — Phases 24/25/26 must execute sequentially
- (carried) Map focus URL: /?id=<paikka_id> — never ?nakyma=kartta (dead param)
- (carried) Supabase Auth uses per-request createServerClient — never module-scope singleton

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS); service role key for writes
- CSS animations on AdvancedMarker: transform/opacity ONLY — no box-shadow, background, filter
- lib/lajit.ts icon field: use `import type` so app/page.tsx (Server Component) stays unaffected
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2
- NavPill expanded menu: exactly Profiili, TO DO, Kirjaudu — no Haku link (NAV-04 done)

### Blockers/Concerns

- Phase 23: Inline HTML element pins chosen (not CSS-only); SportPin.tsx uses currentColor on icon container — Phase 24 can colorize icons via CSS per sport
- Phase 24: nearCandidates computation changes nearestCardId semantics — must not regress layoutId→PaikkaSheet expand animation; test Safari 15 clip-path fallback
- Phase 25: Three existing href=/suosikit references in codebase — only the Etusivu toolbar reference changes; audit all three before shipping

## Session Continuity

Last session: 2026-06-01T00:00:00.000Z
Stopped at: Phase 23 planned — 4 plans ready to execute
Resume file: .planning/phases/23-visuaalinen-perusta/
