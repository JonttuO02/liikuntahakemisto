---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: — Active Milestone
current_phase: 61
current_phase_name: Onboarding-vaiheiden uudelleenjärjestys
status: executing
stopped_at: context exhaustion at 75% (2026-06-26)
last_updated: "2026-06-26T05:23:01.047Z"
last_activity: 2026-06-26
last_activity_desc: Phase 61 execution started
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-25)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 61 — Onboarding-vaiheiden uudelleenjärjestys

## Current Position

Phase: 61 (Onboarding-vaiheiden uudelleenjärjestys) — EXECUTING
Plan: 1 of 4
Status: Executing Phase 61
Last activity: 2026-06-26 — Phase 61 execution started

Next: `/gsd-plan-phase 61` or `/gsd-plan-phase 58` (both parallel-safe; 61 is the canonical next in sequence)

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

- **Phase 62 (VENUEPAGE-02):** Audit which unique content on `app/paikat/[id]` is NOT yet on PaikkaSheet and must migrate before deletion.

**Resolved in Phase 60:**

- ACCESS-03 venue lookup UX: shared deep link (invite URL with `paikka_id`) confirmed — no venue search UI needed for the requester in Phase 60; Phase 64 (dashboard UI) handles the approve/reject side.

**Resolved in Phase 59:**

- Migration safety mechanism: Supabase PITR confirmed as the backup/rollback mechanism (no pg_dump/down-migration by design, D-01/D-03/D-04). Migration applied directly to the project's single Supabase instance (no separate staging exists) with explicit operator sign-off, given no real users yet.
- Audit log: NOT included — `companies` table stayed minimal (id, name, created_at per D-06). If Phase 60/64 need an access-change audit trail, it's a new addition, not something already present.
- RLS perf (EXPLAIN ANALYZE on the EXISTS-subquery pattern): not separately verified — `current_company_id()` is a `STABLE` SQL function the planner can inline, matching the existing `set_business_managed_on_approval()` precedent; revisit if Phase 60/64 sees real query-plan issues.

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
- **v3.1**: No new runtime dependencies — companies/role/access-requests are pure Postgres DDL + Supabase RLS + existing Resend; avoid CASL/Oso/Cerbos/Clerk/WorkOS
- **v3.1**: Co-management model confirmed (multiple employees per venue), single päähallitsija (owner) approves/removes; ARCHITECTURE.md's hand-off design discarded
- **v3.1**: `current_company_id()` SECURITY DEFINER helper shipped in Phase 59 (`STABLE`, `SET search_path = public`, explicit `GRANT EXECUTE`) — avoids same-table RLS recursion, same pattern as existing `set_business_managed_on_approval()`
- **v3.1 (research)**: Replicate `admin/approve` route's `UPDATE ... WHERE status='pending'` + `count:'exact'` concurrency pattern for peer approval — do not reinvent
- **v3.1**: column-level `REVOKE UPDATE (col) ... FROM authenticated` does NOT work in this codebase's Supabase setup — a pre-existing table-wide GRANT overrides it. Always use `REVOKE UPDATE ON table FROM authenticated` + explicit `GRANT UPDATE (allow-list)` instead. Affects any future column-lockdown work (Phase 59 fixed 5 instances, including a pre-existing `profiles.is_admin` self-elevation hole)

## Carry-Forward (open items from prior milestones)

- P23-GAP: `AktiiviLogo.tsx` redesigned but orphaned — not imported in `Etusivu.tsx`; bottom sheet still renders old static SVG watermark. Wiring reverted once in Phase 16.
- CR-01: `app/business/[id]/page.tsx` reads venue data without ownership check (pre-existing since Phase 38) — relevant if Phase 63 touches business page rendering
- CR-02: `app/api/business/onboarding/submit/route.ts` doesn't filter by `paikka_id` (pre-existing since Phase 38)
- P53-FOLLOWUP: 2 business accounts (`0f0e024d-...`, `ac22a395-...`) lost claimed venue in the full liikuntapaikat wipe; dashboard degrades gracefully, no re-claim/outreach flow run
- P57-FOLLOWUP: Consider removing `StepPaikka` intro screen so onboarding starts at AI-analysis — NOTE: now largely subsumed by Phase 61 (ONBOARD-18 removes PaikkaStep entirely); resolve within Phase 61 discuss
- P59-FOLLOWUP: `liikuntapaikat` row-level RLS write policies (`"Kirjautunut voi kirjoittaa"`, `authenticated_update`, `authenticated_delete`) use `USING (true)` — any authenticated user can write/delete ANY venue row, not just the columns Phase 59 touched. Pre-existing, surfaced (not introduced) during Phase 59's security audit. Needs its own dedicated security phase; not blocking, but real once users exist.

## Deferred Items

Pre-existing verification/UAT gaps from phases 20-44 (mostly `human_needed` manual checkpoints, low priority unless related area is touched). Full table preserved in prior STATE history and PROJECT.md Cleanup candidates. Key live ones:

| Category | Item | Status |
|----------|------|--------|
| verification_gap | Phase 23: 23-VERIFICATION.md | gaps_found (P23-GAP, AktiiviLogo orphan) |
| verification_gap | Phases 20-22, 25-27, 32, 34, 38-40, 44 | human_needed (unconfirmed manual checkpoints) |
| uat_gap | Phases 02, 04, 20, 32, 33, 39 | partial / in_progress |

## Session Continuity

Last session: 2026-06-26T05:23:01.039Z
Stopped at: context exhaustion at 75% (2026-06-26)
Resume file: .planning/phases/61-onboarding-vaiheiden-uudelleenj-rjestys/61-UI-SPEC.md

## Operator Next Steps

- `/gsd-execute-phase 61` — **next** (plans ready: 4 plans, 3 waves, pure frontend refactor)
- `/gsd-plan-phase 58` — parallel-safe alternative (admin access + map QA)
- Consider scheduling a dedicated security phase for the `liikuntapaikat` wide-open RLS finding (P59-FOLLOWUP above) before real users arrive

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 60 P01 | 20min | 2 tasks | 1 files |
| Phase 60 P06 | 1min | 1 tasks | 1 files |

## Decisions

- **v3.1 (Phase 60)**: `isPublicBusinessPath` in middleware.ts extended to include `/business/liity` — public deep-link invite landing page; its `useEffect` handles the unauthenticated redirect to `/business/rekisteroidy`
- **v3.1 (Phase 60)**: `invite: true` flag in `/api/business/register` skips companies INSERT, creates `business_accounts` with `company_id=null, role='member'` — for invite-link signup path (D-09a)
- **v3.1 (Phase 60)**: Partial UNIQUE index `(requester_id, paikka_id) WHERE status='pending'` on `business_access_requests` — idempotent duplicate-submission handling at DB layer (D-08)
