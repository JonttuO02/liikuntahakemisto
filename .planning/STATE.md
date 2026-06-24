---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: UX/UI-korjaukset & business-parannukset
status: roadmap_ready
last_updated: "2026-06-24T00:00:00.000Z"
last_activity: 2026-06-24
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-24)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v3.1 roadmap ready — Phases 58–64 defined, awaiting first phase planning

## Current Position

Phase: Not started (roadmap created)
Plan: —
Status: Roadmap ready — 25/25 v3.1 requirements mapped across 7 phases (58–64)
Last activity: 2026-06-24 — v3.1 roadmap created

Next: `/gsd-plan-phase 58` (or `58` / `59` / `61` — all parallel-safe starting points)

## v3.1 Roadmap Summary

| Phase | Goal | Requirements |
|-------|------|---------------|
| 58. Admin-pääsy & kartta-QA | Operaattori pääsee /admin-sivulle; hyväksyttyjen paikkojen sijainnit näkyvät kartalla oikein (diagnoosi ensin, root cause unknown) | ADMIN-06, QA-01 |
| 59. Multi-company-skeemamigraatio | companies-taulu + role-sarake + löysennetty UNIQUE + RLS-rewrite; pre-migration backup -gate | ACCESS-01, ACCESS-02 |
| 60. Hallintaoikeuspyynnöt — backend & sähköposti | business_access_requests, Route Handlers (concurrency-safe), 2 Resend-senderiä, RLS-tason pääsynesto | ACCESS-03, ACCESS-05, ACCESS-06 |
| 61. Onboarding-vaiheiden uudelleenjärjestys | Nimi+URL ensin (AI taustalla), sijainti, AI-tarkastelu, preview-step pois, contact-stepistä URL pois, PREVIEW→SUBMIT | ONBOARD-18..24 |
| 62. Venuepage-konsolidaatio | app/paikat/[id] poistettu; sisältö+navigointi yhdistetty PaikkaSheetiin; vanha reitti 404 | VENUEPAGE-01..04 |
| 63. Business-dashboardin & preview-näkymien uudistus | DiagonaalKortti-dashboard + ikonipainikkeet; CalloutCard-preview; venuepage live-previewssä; previewt visuaalisia | BIZPANEL-06, BIZPANEL-07, PREV-04, LIVEPREV-05, PREV-05 |
| 64. Hallintaoikeuspyynnöt — dashboard-UI | Päähallitsija hyväksyy/hylkää pyynnöt + poistaa sub-managerit uudistetussa dashboardissa | ACCESS-04, ACCESS-07 |

**Dependency order:**
- Phase 58 (admin/QA) — independent, parallel-safe, start anytime
- Phase 61 (onboarding reorder) — independent code path, parallel-safe
- Phase 59 (schema) → Phase 60 (access backend) → Phase 64 (access UI)
- Phase 62 (venuepage) → Phase 63 (dashboard redesign) → Phase 64 (access UI)
- Critical path: 59 → 60 → 64 and 62 → 63 → 64 converge at Phase 64

**Sequencing rationale (from research + instructions):**
- ACCESS-01/02 schema MUST be its own gating phase with explicit pre-migration backup (Phase 53 precedent: unbacked migration → unrecoverable data loss; this one is auth-adjacent)
- ACCESS dashboard UI (64) sequenced AFTER dashboard redesign (63) — both touch `app/business/page.tsx`; building access UI against the old list layout would be throwaway
- VENUEPAGE consolidation (62) before LIVEPREV-05 (63) — LIVEPREV-05 needs the consolidated venuepage feature-complete
- PREV-04/PREV-05 (lightweight) ride along in Phase 63 with BIZPANEL-06/07 and LIVEPREV-05
- ADMIN-06 + QA-01 (58) and ONBOARD-18..24 (61) independent of everything else

## Open Product Decisions (resolve before relevant phase)

- **Phase 60/64 (ACCESS-03):** Venue lookup UX for the requester — venue name search vs. shared deep link? Confirm during `/gsd-discuss-phase` for Phase 60 (research Gap).
- **Phase 59 (audit log):** Confirm whether an append-only action log ships in Phase 59's schema or is deferred to a fast-follow — recommended "should have," cheap either way (research Gap).
- **Phase 59 (migration safety):** Confirm exact pre-migration backup/rollback mechanism (Supabase point-in-time recovery vs. manual pg_dump) operationally BEFORE writing the migration (research Flag).
- **Phase 59 (RLS perf):** Verify with EXPLAIN ANALYZE that the composite index is actually used by the EXISTS-subquery RLS pattern, not just assumed (research Flag).
- **Phase 62 (VENUEPAGE-02):** Audit which unique content on `app/paikat/[id]` is NOT yet on PaikkaSheet and must migrate before deletion.

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
- **v2.0**: /business/map is a standalone route — does NOT modify Etusivu.tsx
- **v2.1**: One Claude API call per analysis; `waitUntil` fire-and-forget
- **v3.0**: liikuntapaikat fully wiped (327/327) on Google Places exit; create-only flow (no claim search), yritysNimi + toimipisteNimi → combined `liikuntapaikat.nimi`
- **v3.1 (research)**: No new runtime dependencies — companies/role/access-requests are pure Postgres DDL + Supabase RLS + existing Resend; avoid CASL/Oso/Cerbos/Clerk/WorkOS
- **v3.1 (research)**: Co-management model confirmed (multiple employees per venue), single päähallitsija (owner) approves/removes; ARCHITECTURE.md's hand-off design discarded
- **v3.1 (research)**: `current_company_id()` SECURITY DEFINER helper avoids same-table RLS recursion (same pattern as existing `set_business_managed_on_approval()`)
- **v3.1 (research)**: Replicate `admin/approve` route's `UPDATE ... WHERE status='pending'` + `count:'exact'` concurrency pattern for peer approval — do not reinvent

## Carry-Forward (open items from prior milestones)

- P23-GAP: `AktiiviLogo.tsx` redesigned but orphaned — not imported in `Etusivu.tsx`; bottom sheet still renders old static SVG watermark. Wiring reverted once in Phase 16.
- CR-01: `app/business/[id]/page.tsx` reads venue data without ownership check (pre-existing since Phase 38) — relevant if Phase 63 touches business page rendering
- CR-02: `app/api/business/onboarding/submit/route.ts` doesn't filter by `paikka_id` (pre-existing since Phase 38)
- P53-FOLLOWUP: 2 business accounts (`0f0e024d-...`, `ac22a395-...`) lost claimed venue in the full liikuntapaikat wipe; dashboard degrades gracefully, no re-claim/outreach flow run
- P57-FOLLOWUP: Consider removing `StepPaikka` intro screen so onboarding starts at AI-analysis — NOTE: now largely subsumed by Phase 61 (ONBOARD-18 removes PaikkaStep entirely); resolve within Phase 61 discuss

## Deferred Items

Pre-existing verification/UAT gaps from phases 20-44 (mostly `human_needed` manual checkpoints, low priority unless related area is touched). Full table preserved in prior STATE history and PROJECT.md Cleanup candidates. Key live ones:

| Category | Item | Status |
|----------|------|--------|
| verification_gap | Phase 23: 23-VERIFICATION.md | gaps_found (P23-GAP, AktiiviLogo orphan) |
| verification_gap | Phases 20-22, 25-27, 32, 34, 38-40, 44 | human_needed (unconfirmed manual checkpoints) |
| uat_gap | Phases 02, 04, 20, 32, 33, 39 | partial / in_progress |

## Session Continuity

Last session: 2026-06-24 — v3.1 roadmap created
Stopped at: ROADMAP.md + STATE.md written, REQUIREMENTS.md traceability filled
Resume file: .planning/ROADMAP.md (v3.1 — Active Milestone section)

## Operator Next Steps

- Review the v3.1 roadmap (`.planning/ROADMAP.md` → "v3.1 — Active Milestone")
- Start planning: `/gsd-plan-phase 58` (admin/QA), `58`/`59`/`61` are all parallel-safe entry points
- Phase 59 needs the pre-migration backup mechanism confirmed before its migration is written
