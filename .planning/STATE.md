---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Visuaalinen elävöitys & UX-hienosäätö
status: complete
stopped_at: Phase 26 complete — all plans done
last_updated: "2026-06-02T16:00:00.000Z"
last_activity: "2026-06-02 — Phase 26 Plan 02 complete (carousel filter pills, FILTER-03)"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 100
---

# Project State

## Current Position

Phase: 26 of 26 (Filtterit) — Complete (all plans done)
Status: v1.5 milestone complete — Phase 26 finished
Last activity: 2026-06-02 — Phase 26 Plan 02 complete (carousel filter pills, FILTER-03)

Progress: [██████████] 100%

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-31)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.5 — Phase 26: Filtterit

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 23 | Visuaalinen perusta | ✅ Complete |
| 24 | Callout-kortti & ikonit | ✅ Complete |
| 25 | TO DO overlay | ✅ Complete |
| 26 | Filtterit | ✅ Complete |

## Active Decisions

- v1.5: Font is Outfit (not Geist — requirements override research recommendation)
- v1.5: Pin animations use transform/opacity ONLY — never box-shadow, background, filter
- v1.5: @googlemaps/markerclusterer must NOT be activated — extend clusterPinUrl() visually only
- v1.5: /suosikit page route must survive intact (PWA deep links, auth redirects, Serwist precache)
- v1.5: sessionStorage key 'etusivu-scroll-state' _v: 2 SHIPPED (Plan 26-01) — old sessions rejected
- v1.5: Etusivu.tsx is the blast-radius file — Phases 24/25/26 must execute sequentially
- v1.5: CalloutCard on neliö 160×160px, pystysuuntainen layout, kirjain kerrallaan slide-animaatio
- (carried) Map focus URL: /?id=<paikka_id> — never ?nakyma=kartta (dead param)
- (carried) Supabase Auth uses per-request createServerClient — never module-scope singleton

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS); service role key for writes
- CSS animations on AdvancedMarker: transform/opacity ONLY — no box-shadow, background, filter
- lib/lajit.ts icon field: use `import type` so app/page.tsx (Server Component) stays unaffected
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2
- NavPill expanded menu: exactly Profiili, TO DO, Kirjaudu — no Haku link (NAV-04 done)
- CalloutCard zIndex=5 (muut pinnit 1) — ei piilotu muiden alle

### Blockers/Concerns

- Phase 25: href=/suosikit audit covered in 25-01 Plan Task 1 — only the nav-pill entry in Etusivu.tsx changes; /suosikit route untouched

## Session Continuity

Last session: 2026-06-02T16:00:00.000Z
Stopped at: Phase 26 complete — v1.5 milestone done
Resume: N/A — milestone complete
