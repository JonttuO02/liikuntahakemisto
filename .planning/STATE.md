---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: archived
last_updated: "2026-05-21T19:30:00Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# Project State

## Current Status

Phase: Milestone v1.0 — ARCHIVED 2026-05-21
Last updated: 2026-05-21

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-19)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.0 archived — run /gsd:new-milestone for v1.1

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Foundation & Security | Complete | All 11 UAT tests passed; schema migration applied in Supabase |
| Phase 2 — Map & GPS | Complete | All 3 plans done; @vis.gl migration, GPS, distance strings |
| Phase 3 — Data Enrichment | Complete | Both plans executed; run sync + seed scripts to populate DB |
| Phase 4 — Service Information UI | Complete | All 4 plans executed; lib/aukiolo.ts + badges + filter + profile hours |
| Phase 5 — AI Weather Widget | Complete | Both plans done; /api/saasuositus Route Handler + Etusivu.tsx sessionStorage-cached widget |

## Active Decisions

- APIProvider placed in layout.tsx so Maps JS API loads once at app startup (02-01)
- useGPS auto-requests location on mount; status starts as 'requesting' not 'idle' (02-01)
- @react-google-maps/api removed in Plan 03; codebase fully on @vis.gl/react-google-maps (02-03)
- distancesMap keyed by venue id, recomputed on GPS coords change via useMemo (02-03)
- SimplePin (plain SVG) used in Etusivu; SportPin (animated) used in Kartta.tsx (02-03)
- lib/aukiolo.ts is single source of truth for open-status + grouped-hours logic (04-01)
- "Auki nyt" filter is lenient: null aukioloajat passes through, shows "Aukioloajat tuntematon" (04-03 D-08)
- HoursTable.tsx is a 'use client' island — today-highlighting uses browser local time not server UTC (04-04)
- ANTHROPIC_API_KEY is server-only env var — SDK reads it automatically, never NEXT_PUBLIC_ (05-01)
- Open-Meteo failure defaults to temp=15, code=0 so Claude still runs with sensible values (05-01)
- Claude failure returns time-based Finnish fallback — widget is always non-blocking HTTP 200 (05-01)
- aiTeksti initialized as null — widget text area is empty on first render, no flash of stale text (05-02)
- sessionStorage cache key scoped to calendar day (YYYY-MM-DD); .catch() caches fallback so no same-day retry (05-02)

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

- Last session: 05-02 executed — Etusivu.tsx AI widget wired with sessionStorage cache to /api/saasuositus (2026-05-21)
- Stopped at: Phase 5 complete — all 12 plans across 5 phases executed
- Start next session: /gsd:verify-work 5 — smoke test AI widget (widget empty on load, shows text after ~2s, cached on reload)
- Data ops still recommended: /api/admin/sync-paikat + npx tsx scripts/seed-hinnat.ts to populate Phase 4 UI live data
