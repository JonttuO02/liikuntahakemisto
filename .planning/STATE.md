---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Phases
status: active
last_updated: "2026-05-22T18:00:00.000Z"
last_activity: 2026-05-22 — Phase 8 planned; 3/3 plans created (08-01, 08-02, 08-03); ready to execute
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 14
  completed_plans: 9
  percent: 50
---

# Project State

## Current Position

Phase: 8 — Map Features (planned — ready to execute)
Plan: 08-01 ✅, 08-02 ✅, 08-03 ⏳
Status: active
Last activity: 2026-05-22 — Phase 8 executing; 08-02 complete (pin→mini-card + 90vh bottom sheet)

## Project Reference

See: .planning/PROJECT.md

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.1 — Käyttäjät, Kartta & Laatu

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 6. UI Polish & Data Foundation | ✅ Complete | UAT passed; 1 inline fix (city filter sentinel off-by-one) |
| 7. Map Infrastructure | ✅ Complete | 2/2 plans done; 4 manual UAT checks pending (GPS + day/night + preview button absent) |
| 8. Map Features | 🗂 Planned | 3 plans ready (GPS ring, zoom cards, URL focus) |
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
- AdvancedMarker migration complete ✅ DONE — Phase 8 map features now unblocked
- Supabase Auth uses per-request createServerClient — never the existing module-scope singleton
- middleware.ts does not exist yet — first deliverable of Phase 9
- Map focus URL: /?nakyma=kartta&id=<paikka_id> — full Link navigation
- PWA must use Serwist (@serwist/next + serwist) — next-pwa and @ducanh2912/next-pwa are abandoned
- Service worker must exclude _rsc requests and be disabled in dev mode
- useGPS now takes { autoRequest?: boolean } param (default false) — Etusivu passes true, LiikuntapaikatLista uses default

## Accumulated Context

### Key Constraints

- Supabase Auth v1.1: suosikit vaativat tilin, muu toimii anonyymisti
- AdvancedMarker requires NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID env var + mapId on both Map instances ✅ DONE
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
- RecenterButton uses useMap() outside <Map> subtree but resolves correctly (preview/fullscreen maps are mutually exclusive via AnimatePresence)

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

- Last session: Phase 8 planned — 3 plans created and verified
- Stopped at: Phase 8 ready to execute; Phase 7 manual UAT still pending (4 checks)
- Phase 7 manual UAT still needed:
  1. Tap re-center button with GPS active → map pans to user position
  2. Tap re-center with GPS denied → silent no-op (no error/toast)
  3. Toggle day/night → Cloud Console map styles switch correctly
  4. Confirm no re-center button on 3D preview map
- Start next session: /gsd:execute-phase 8
