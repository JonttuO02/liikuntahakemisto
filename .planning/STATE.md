# Project State

## Current Status
Phase: Not started
Last updated: 2026-05-19

## Project Reference
See: .planning/PROJECT.md (updated 2026-05-19)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 1 — Foundation & Security

## Phase Progress
| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Foundation & Security | Not started | |
| Phase 2 — Map & GPS | Not started | Blocked until Phase 1 done |
| Phase 3 — Data Enrichment | Not started | Blocked until Phase 1 done |
| Phase 4 — Service Information UI | Not started | Blocked until Phase 3 done |
| Phase 5 — AI Weather Widget | Not started | Blocked until Phase 4 done |

## Active Decisions
(none yet)

## Accumulated Context

### Key Constraints
- Phase 2 and Phase 3 can run in parallel after Phase 1 completes
- Phase 4 depends specifically on Phase 3 (needs aukioloajat + hinta data in DB)
- Phase 5 depends on Phase 4 (AI widget is only useful when venue data is rich)
- ADS-01 is delivered as part of Phase 1 DATA-04 schema migration (featured boolean column)
- `GOOGLE_PLACES_API_KEY` is server-only — never expose to client bundle

### Architecture Notes
- Supabase anon key = read-only after Phase 1 RLS is applied
- Map library migration (MAP-03) is a prerequisite for GPS work (MAP-01, MAP-02)
- sessionStorage cache (AI-03) scoped to same calendar day, not 24h rolling window

## Performance Metrics
- Requirements total: 19
- Requirements mapped: 19/19
- Phases: 5

## Session Continuity
- Start next session: Read .planning/ROADMAP.md to confirm current phase, then run /gsd:plan-phase 1
