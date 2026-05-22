---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Phases
status: active
last_updated: "2026-05-22T12:00:00.000Z"
last_activity: 2026-05-22 — Phase 6 UAT complete; 9/12 tests passed, 1 inline fix (city filter threshold), 2 skipped (no featured venues yet)
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 33
---

# Project State

## Current Position

Phase: 7 — Map Infrastructure (not started — ready to plan)
Plan: —
Status: active
Last activity: 2026-05-22 — Phase 6 verified and marked complete

## Project Reference

See: .planning/PROJECT.md

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.1 — Käyttäjät, Kartta & Laatu

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 6. UI Polish & Data Foundation | ✅ Complete | UAT passed; 1 inline fix (city filter sentinel off-by-one) |
| 7. Map Infrastructure | Not started | Requires mapId env var + AdvancedMarker — start here |
| 8. Map Features | Not started | Built on Phase 7 AdvancedMarker foundation |
| 9. Auth & Favorites | Not started | Highest systemic risk; LEGAL-01 now live (Phase 6) |
| 10. City Expansion | Not started | Fix sync-paikat hardcoded Tampere first |
| 11. PWA | Not started | Must be last — needs complete API surface |

## Active Decisions

(inherited from v1.0)

- APIProvider placed in layout.tsx so Maps JS API loads once at app startup
- useGPS auto-requests location on mount; status starts as 'requesting' not 'idle'
- lib/aukiolo.ts is single source of truth for open-status + grouped-hours logic
- sessionStorage cache key scoped to calendar day (YYYY-MM-DD)
- ANTHROPIC_API_KEY is server-only env var — SDK reads it automatically, never NEXT_PUBLIC_

(v1.1 additions)

- LEGAL-01 ships in Phase 6 — must be live before auth (Phase 9) goes out ✅ DONE
- AdvancedMarker migration is a discrete Phase 7 prerequisite; no map features before it
- Supabase Auth uses per-request createServerClient — never the existing module-scope singleton
- middleware.ts does not exist yet — first deliverable of Phase 9
- Map focus URL: /?nakyma=kartta&id=<paikka_id> — full Link navigation
- PWA must use Serwist (@serwist/next + serwist) — next-pwa and @ducanh2912/next-pwa are abandoned
- Service worker must exclude _rsc requests and be disabled in dev mode
- useGPS now takes { autoRequest?: boolean } param (default false) — Etusivu passes true, LiikuntapaikatLista uses default

## Accumulated Context

### Key Constraints

- Supabase Auth v1.1: suosikit vaativat tilin, muu toimii anonyymisti
- AdvancedMarker requires NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID env var + mapId on both Map instances
- supabase.auth.getUser() server-side — never getSession() (reads unvalidated cookie)
- RLS INSERT needs WITH CHECK not USING for favorites table
- sync-paikat hardcodes Tampere in kaupunki column — fix before running Helsinki/Turku syncs
- AUTH-03 token budget: include max 5–10 favorites in Claude Haiku prompt
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2, not > 1

### Architecture Notes

- Supabase anon key = read-only (RLS v1.0:sta)
- v1.1 adds Supabase Auth + favorites table (user_id → paikka_id)
- kaupunki column needs verification in live Supabase DB before DATA-05/06
- 3 new npm packages total: @supabase/ssr, @serwist/next, serwist
- All other v1.1 features use already-installed packages
- lib/urlUtils.ts added in Phase 6 — isSafeUrl() guards all varauslinkki href renders

### Open Questions (before Phase 7)

- mapId: Create Map ID in Google Cloud Console, add NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID to .env.local

### Open Questions (before Phase 9)

- Google OAuth: Configure callback URL in Google Cloud Console + Supabase dashboard redirect URL

### Open Questions (before Phase 11)

- PWA icons: Generate public/icon-192x192.png and public/icon-512x512.png from acta-symbol.svg
- Confirm next dev (not --turbo) is standard — Serwist requires webpack

## Performance Metrics

- Requirements total: 19 (v1.1)
- Requirements mapped: 19/19
- Phases: 6 (phases 6–11)

## Session Continuity

- Last session: Phase 6 complete — code review fixed 14 findings, UAT passed
- Stopped at: Phase 7 ready to plan
- Start next session: /gsd:discuss-phase 7 or /gsd:plan-phase 7
