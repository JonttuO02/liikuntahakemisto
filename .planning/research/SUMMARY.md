# Research Summary — v1.8 Yritysportaali v2

**Project:** AKTIIVI — Liikuntahakemisto
**Domain:** Finnish sports venue directory with dual consumer/business portal
**Researched:** 2026-06-11
**Confidence:** HIGH

## Executive Summary

v1.8 is a finishing milestone, not a greenfield build. All three themes (tech debt cleanup, business data publication, and business user UX) operate entirely on the existing stack (Next.js 14, Supabase, Tailwind v3, Framer Motion). Zero new npm packages are required. The work is SQL migrations, Route Handler extensions, and React component restructuring of code that was deliberately left incomplete in v1.7.

The recommended approach is to build in strict dependency order: (1) close the business_managed data integrity gap before touching publication logic, (2) add the Postgres trigger for atomic approval and publication, (3) add the verification badge as a purely additive UI layer, and (4) implement business-user routing and UX last because it touches the most sensitive components (Etusivu, middleware, wizards). The single highest-risk item is extracting KarttatYdin from the 1700-line Etusivu component for the stripped business map; this should come last after all other pieces are verified.

The top three risks are: (a) partial write atomicity when approving a venue — if published=true succeeds but business_managed=true fails, business-entered data gets silently overwritten by the sync script; (b) the existing claim-paikka route not setting business_managed=true at claim time, which leaves a sync window between claim submission and onboarding completion; (c) losing Supabase token refresh cookies when adding any redirect logic to middleware.ts. All three are concrete, codebase-specific bugs with known one-line or one-function fixes documented in the research.

---

## Key Findings

### Recommended Stack

No new dependencies. All v1.8 capabilities are achievable with the existing stack. The one SQL artifact needed is a single migration file: 20260612000000_business_approval_trigger.sql, which creates a SECURITY DEFINER PL/pgSQL function and an AFTER UPDATE trigger on business_paikka_links. Two TypeScript additions: is_claimed and business_managed added to the Liikuntapaikka type in lib/types.ts.

**Core technologies (unchanged):**
- @supabase/ssr + @supabase/supabase-js: Server Components auth guard in app/business/layout.tsx (RSC), supabaseAdmin for privileged Route Handler writes
- Next.js 14 App Router: RSC layout as auth guard — the canonical pattern for protecting route segments without middleware
- Tailwind v3 + existing glassmorphism classes: verification badge UI, business dashboard layout

### Expected Features

**Tech Debt — must fix before new features:**
- Wizard auth refactor — delete auth useEffect from both wizards once business/layout.tsx RSC guard is in place (no shared hook needed)
- claim-paikka route: add business_managed: true to the liikuntapaikat UPDATE — 1-line fix that closes the Google Places sync overwrite window
- /admin middleware protection — extend middleware.ts to path-check /admin and /business using getUser() only (no DB query); real admin role check stays in the Route Handler
- onboarding_completed cleanup — delete column or remove writes; never read it in v1.8 routing decisions

**Publication pipeline — table stakes:**
- Admin approval sets published=true AND business_managed=true atomically — Postgres trigger is the correct mechanism (SECURITY DEFINER, fires AFTER UPDATE on business_paikka_links)
- business_managed=true must be set for ALL approval paths (both link_type=claim and link_type=created); currently only link_type=created is handled by the Route Handler
- Verification checkmark in PaikkaKortti, DiagonaalKortti, and PaikkaSheet when is_claimed=true — indigo color (text-indigo-600), not amber (reserved for Sponsoroitu)

**Business UX — should have:**
- app/business/layout.tsx RSC auth guard — replaces all client-side useEffect guards in wizards and business panel
- Server-side redirect in app/page.tsx (not middleware) for business users landing on /
- Avaa kartta link from business dashboard — dedicated /business/map route using extracted KarttatYdin component; NOT a link to / (would cause redirect loop per Pitfall 12)
- /profiili hides kiinnostukset/kotikaupunki sections for business accounts

**Defer to future milestone:**
- Analytics/metrics on business dashboard (no meaningful data yet)
- Business notification email when listing goes live
- Paid upgrade flow for businesses

### Architecture Approach

The central architectural decision is where role detection lives. Middleware cannot query business_accounts (Edge Runtime has no persistent DB connection; service key must never reach the edge). The correct pattern is app/business/layout.tsx as an async Server Component: createServerSupabase(cookieStore) then getUser() then business_accounts lookup then redirect() before streaming. Homepage redirect for business users is a single early-return added to app/page.tsx — not middleware.

For the stripped business map, the architectural seam is a route boundary (/business/map), not a prop toggle on Etusivu. Etusivu is a 1700-line component with GPS hooks, AI widget, and deeply coupled state — do not fork it or add conditional props. Extract KarttatYdin (map, pins, GPS pan, PaikkaSheet on click) into a shared component; Etusivu wraps it with the consumer overlay; business/map/page.tsx uses it directly.

**Major components (new or significantly modified):**
1. app/business/layout.tsx — new RSC auth guard for all /business/* routes
2. Postgres trigger on_link_approved on business_paikka_links — atomic publication on approval
3. lib/types.ts — add is_claimed and business_managed to Liikuntapaikka
4. app/components/KarttatYdin.tsx — map core extracted from Etusivu (highest-risk item)
5. app/business/map/page.tsx — business-facing map using KarttatYdin without consumer overlay
6. app/api/admin/approve/route.ts — add business_managed=true write for claim-type venues

### Critical Pitfalls

1. **Partial write atomicity on approval (Pitfall 4)** — Two separate .update() calls in the Route Handler (published=true then business_managed=true) have no rollback. If the second fails, the venue goes live with unprotected data. Prevention: use a Postgres trigger (single atomic DB transaction) or a supabaseAdmin.rpc() call to a Postgres function. Do NOT sequence two .update() calls for these two flags.

2. **claim-paikka missing business_managed=true (Pitfall 3)** — The claim-paikka Route Handler does not set business_managed=true at claim time. Only onboarding/submit sets it. If admin approves before onboarding submit completes, the sync script can overwrite business data during the pending window. Fix: add business_managed: true to the liikuntapaikat UPDATE in claim-paikka/route.ts. One line.

3. **Middleware cookie forwarding lost on redirect (Pitfall 10)** — Returning a plain NextResponse.redirect() from middleware discards the Set-Cookie headers from supabaseResponse where the token refresh was written. Pattern: copy supabaseResponse.cookies.getAll() onto the redirect response before returning. Every middleware change in v1.8 must follow this or token refresh silently breaks for affected users.

---

## Implications for Roadmap

Suggested three-phase structure for v1.8:

### Phase 37: Tech Debt Foundation
**Rationale:** Closes data integrity gaps before publication features are built on top of them. The claim-paikka business_managed fix is a prerequisite for safe publication — fixing it after would require emergency patching a live system.
**Delivers:** business_managed=true written at claim time; business/layout.tsx RSC guard replacing client-side auth useEffect in both wizards and business panel; middleware.ts extended with path-based unauthenticated redirect for /admin and /business; onboarding_completed column removed or writes removed
**Addresses:** All four tech debt items from FEATURES.md
**Avoids:** Pitfall 3 (sync race window), Pitfall 6 (dead column routing), Pitfall 7 (getSession regression)

### Phase 38: Business Data Publication
**Rationale:** Core value delivery of v1.8. Depends on Phase 37 (business_managed fix must be in place before adding the trigger).
**Delivers:** Postgres trigger on_link_approved setting published=true and business_managed=true atomically; lib/types.ts updated with is_claimed and business_managed; verification checkmark in PaikkaKortti, DiagonaalKortti, PaikkaSheet; app/page.tsx SELECT includes both fields
**Addresses:** Publication pipeline table stakes from FEATURES.md
**Avoids:** Pitfall 4 (partial write atomicity), Pitfall 3 (sync race condition)

### Phase 39: Business User UX
**Rationale:** Comes last because it touches the most components. Requires Phase 37 business/layout.tsx to be verified working before stripping auth useEffect from wizards. KarttatYdin extraction is highest-risk and should be deferred to last within the phase.
**Delivers:** Server-side homepage redirect for business users in app/page.tsx; business dashboard UX polish (prominent Lisää paikka, pending state copy, Avaa kartta button); /profiili business variant hiding consumer fields; /business/map stripped map route
**Addresses:** Business UX table stakes and differentiators from FEATURES.md
**Avoids:** Pitfall 2 (flash of wrong UI), Pitfall 8 (consumer homepage broken), Pitfall 10 (cookie forwarding), Pitfall 12 (business map redirect loop)

### Phase Ordering Rationale

- Tech debt first because business_managed at claim time is a prerequisite for safe publication; the publication trigger assumes this fix is in place
- Publication before UX because the verification badge depends on is_claimed being in lib/types.ts and the SELECT — this must land before the dashboard is finalized
- UX last because business/layout.tsx must be verified working before any auth useEffect is deleted from wizards

### Research Flags

All three phases use standard, well-documented patterns — no additional research-phase needed:
- **Phase 37:** All four tech debt items confirmed by direct code inspection; changes are mechanical 1-liners or small function additions
- **Phase 38:** Postgres trigger pattern is standard; the exact migration SQL is drafted in STACK.md; badge is a Tailwind conditional render
- **Phase 39:** Architecture decisions are documented; the only uncertain item is KarttatYdin extraction scope from the 1700-line Etusivu — mitigate by building business/map/page.tsx as a standalone first

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages; decisions based on official Supabase/Next.js docs and direct codebase inspection |
| Features | HIGH | All four tech debt items and publication features confirmed by direct code inspection of v1.7 migration files and Route Handlers |
| Architecture | HIGH | All architectural questions answered by direct code inspection; KarttatYdin extraction boundary is MEDIUM (Etusivu scope uncertain until planning time) |
| Pitfalls | HIGH | All critical pitfalls identified from direct code inspection + Supabase/Next.js documented limitations |

**Overall confidence:** HIGH

### Gaps to Address

- **KarttatYdin extraction scope:** Etusivu is 1700 lines. The exact boundary between map core and consumer overlay should be confirmed during Phase 39 planning. Recommendation: build business/map/page.tsx as a temporary standalone first, then extract as polish.
- **Verification badge timing:** is_claimed=true is set at claim submission time, not at approval. The badge will appear on pending and rejected venues. Requirements definition for Phase 38 should decide: badge on claim (no change) or badge on approval only (needs column change).
- **onboarding_draft delete clause (Pitfall 11):** Delete in onboarding/submit/route.ts uses only business_account_id — could delete the wrong draft for multi-venue users. Fix: add .eq(paikka_id, draft.paikka_id) to the delete call. Scope to Phase 37.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- middleware.ts, app/business/page.tsx, app/admin/page.tsx, app/api/admin/approve/route.ts
- app/api/business/claim-paikka/route.ts, app/api/business/onboarding/submit/route.ts
- app/components/Etusivu.tsx, app/business/onboarding/OnboardingWizardInner.tsx, app/business/[id]/EditWizardInner.tsx
- lib/types.ts, lib/supabaseSSR.ts
- Migration files: 20260605000000_business_accounts.sql, 20260605000001_business_managed.sql, 20260605000004_published_is_claimed.sql
- .planning/v1.7-MILESTONE-AUDIT.md

### Primary (HIGH confidence — official docs)
- Supabase Next.js SSR auth middleware pattern: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Postgres Triggers + SECURITY DEFINER: https://supabase.com/docs/guides/database/postgres/triggers
- Supabase getUser vs getSession security: https://github.com/orgs/supabase/discussions/23224
- Supabase middleware DB lookup limitation: https://github.com/orgs/supabase/discussions/29482
- Next.js App Router middleware docs: https://nextjs.org/docs/14/app/building-your-application/routing/middleware

### Secondary (MEDIUM confidence — industry patterns)
- Airbnb dual-mode routing, Google Business Profile verification badge, Yelp claimed badge, Tripadvisor Management Centre: industry precedents for role-based UX and verified listing indicators

---
*Research completed: 2026-06-11*
*Ready for roadmap: yes*
