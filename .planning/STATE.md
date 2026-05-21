---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-21T10:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 60
---

# Project State

## Current Status

Phase: Phase 3 — complete (both plans executed)
Last updated: 2026-05-21

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-19)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 1 — Foundation & Security

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Foundation & Security | Complete | All 11 UAT tests passed; schema migration applied in Supabase |
| Phase 2 — Map & GPS | Complete | All 3 plans done; @vis.gl migration, GPS, distance strings |
| Phase 3 — Data Enrichment | Complete | Both plans executed; run sync + seed scripts to populate DB |
| Phase 4 — Service Information UI | Not started | Blocked until Phase 3 done |
| Phase 5 — AI Weather Widget | Not started | Blocked until Phase 4 done |

## Active Decisions

- APIProvider placed in layout.tsx so Maps JS API loads once at app startup (02-01)
- useGPS auto-requests location on mount; status starts as 'requesting' not 'idle' (02-01)
- @react-google-maps/api removed in Plan 03; codebase fully on @vis.gl/react-google-maps (02-03)
- distancesMap keyed by venue id, recomputed on GPS coords change via useMemo (02-03)
- SimplePin (plain SVG) used in Etusivu; SportPin (animated) used in Kartta.tsx (02-03)

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

- Last session: Executed Phase 3 — ingestion routes upgraded (opening hours + multi-sport), seed script created
- Start next session: Run /gsd:discuss-phase 4 or /gsd:plan-phase 4 — Phase 4 (Service Information UI) is next
- Data ops still needed: call /api/admin/sync-paikat (with Bearer token) to populate DB, then run npx tsx scripts/seed-hinnat.ts
