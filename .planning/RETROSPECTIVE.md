# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-21
**Phases:** 5 | **Plans:** 25 | **Timeline:** 3 days

### What Was Built
- Security foundation: RLS, API auth, URL routing, error pages
- Interactive GPS map with sport pins and distance display
- Data pipeline: Google Places aukioloajat, manual pricing, 7+ sport categories
- Opening hours & price UI with "Auki nyt" badge and filter
- AI weather widget: Claude Haiku + Open-Meteo, non-blocking, sessionStorage-cached

### What Worked
- lib/aukiolo.ts TDD approach: writing tests first caught edge cases early
- sessionStorage caching pattern: solved AI re-fetch problem cleanly

### What Was Inefficient
- Manual price entry for top 20 venues — time-consuming, no automation path

### Patterns Established
- Server components for data fetching, client components for interactivity
- lib/ directory as single source of truth (aukiolo.ts, lajit.ts)
- Explicit Supabase SELECT column lists — never `select('*')`

### Key Lessons
1. TDD for utility functions pays off immediately — lib/aukiolo.ts bugs found before ship
2. sessionStorage cache scope matters: key must include date to prevent stale data

---

## Milestone: v1.1 — Käyttäjät, Kartta & Laatu

**Shipped:** 2026-05-27
**Phases:** 6 (phases 6–11) | **Plans:** 23 | **Timeline:** 6 days

### What Was Built
- Card UI polish: Sponsoroitu-badge, price-at-top, "vain jäsenyys", city filter, sport dropdown, GDPR page
- AdvancedMarker migration + day/night mapId switching + RecenterButton
- Map features: GPS accuracy ring, zoom-based pin→mini-card, in-app map focus; Etusivu bottom sheet architecture
- Full auth stack: Supabase Auth (email + Google OAuth), HeartButton, cross-device favorites, AI personalization
- City expansion: Helsinki + Turku via parameterized sync route; city-aware AI widget with debounce
- PWA: Serwist service worker with offline caching, Web App Manifest, offline page; build verified

### What Worked
- Bottom sheet architecture refactor (sheetPhase state machine) — clean replacement of kartaAuki boolean
- Per-request `createServerClient` pattern for Supabase Auth — no shared state bugs
- Worktree isolation for parallel plan execution — prevented merge conflicts
- City-aware AI cache with count suffix in sessionStorage key — elegant solution to personalization cache-busting

### What Was Inefficient
- REQUIREMENTS.md checkboxes not updated during execution — discovered gap at milestone close
- sync-paikat script hardcodes Tampere kaupunki — required manual fix before Helsinki/Turku runs
- Serwist library research: took multiple iterations to find correct @serwist/next@9.5.11 API (swTsconfigPath removed)

### Patterns Established
- Supabase Auth: per-request `createServerClient`, `getUser()` on each mutation, middleware.ts for session refresh
- AI route: GET for anonymous, POST with context for signed-in; cache key includes context fingerprint
- HeartButton as standalone client component with own subscription lifecycle
- Map focus URL: `/?id=<paikka_id>` — no ?nakyma=kartta (CLAUDE.md dead param rule)
- PWA: Serwist only; themeColor in viewport export; offline page uses `<a href>` not `<Link>`

### Key Lessons
1. Auth state in components: always call getUser() fresh per interaction, never rely on closure state
2. PWA library choice matters — always verify maintenance status; Serwist is the only maintained option
3. Keep REQUIREMENTS.md checkboxes in sync during execution — don't leave this for milestone close
4. City-scoped caching needs a fingerprint in the cache key, not just date

### Cost Observations
- Model mix: primarily Sonnet (execution), Opus (planning/discussion)
- Notable: worktree isolation paid off for multi-plan phases

---

## Milestone: v1.2 — UI-uudistus & Arvostelut

**Shipped:** 2026-05-28
**Phases:** 4 (phases 12–15) | **Plans:** 14 | **Timeline:** 2 days

### What Was Built
- Hakukenttä etusivulle: left toolbar search overlay, real-time card list, LiikuntapaikatLista deleted
- DiagonaalKortti diagonal split: clip-path + Google Static Maps 200×128 snapshot
- /profiili page: Supabase profiles table, kotikaupunki persistence
- AI kotona/reissussa: buildReissuKonteksti injects home city + current city into /api/saasuositus prompt
- Reviews system: TDD reviewUtils helpers (9 tests), reviews table + RLS, StarPicker, ReviewForm with upsert (composite UNIQUE), ReviewSection on venue page

### What Worked
- TDD for reviewUtils: resolveDisplayName + computeAvgRating helpers tested before wiring to UI — caught edge cases (empty string anon, non-integer average)
- Worktree isolation for Phase 15 plans (15-02, 15-03, 15-04) — enabled parallel execution without merge conflicts
- Verify scripts per plan: regex guard for `user_id` in reviews SELECT (T-15-02 defense in depth)
- Composite UNIQUE constraint enforced at DB level (not just app level) — max 1 review per user per place is reliable

### What Was Inefficient
- Phase 12 and 13 executed without SUMMARY.md generation — gaps discovered at milestone close
- buildReissuKonteksti live AI test skipped due to missing Claude API credits — unit test coverage is good but E2E unverified
- REQUIREMENTS.md checkboxes not ticked during execution (same issue as v1.1) — only PROJECT.md was updated

### Patterns Established
- Privacy-by-default for user data in SELECT: always list columns explicitly; verify scripts can guard specific exclusions (T-15-02 pattern)
- RLS policy for public data: `SELECT USING(true)` is explicit and intentional — document divergence from private-read pattern
- kotikaupunki in a separate `profiles` table (not auth.users metadata) — clean separation, browser client can write with RLS
- computeAvgRating: return raw float, round at render time — testable with exact equality, no rounding decisions in utility layer

### Key Lessons
1. Always generate SUMMARY.md files after plan execution — they're the source for milestone accomplishments
2. Review REQUIREMENTS.md during execution, not just at milestone close — prevents the "all Pending" gap at archive time
3. For AI features: budget API credits for E2E verification, or document the gap explicitly at verification time
4. Composite UNIQUE constraints at the DB level are more reliable than app-layer enforcement alone — prefer DB constraints for business rules like "1 review per user per place"

### Cost Observations
- Model mix: primarily Sonnet (execution), Opus (planning/discussion)
- Sessions: ~2 sessions over 2 days
- Notable: 148 files changed with +11,524/-14,298 lines across 4 phases — high churn ratio due to removing LiikuntapaikatLista and refactoring Etusivu

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 | 5 | 25 | 3 days | Foundation: security + data + AI |
| v1.1 | 6 | 23 | 6 days | Added auth, map arch, PWA |
| v1.2 | 4 | 14 | 2 days | UI overhaul: search integration, new card model, reviews, AI personalization |

### Cumulative Quality

| Milestone | Tests | Key Libs Tested | New Packages |
|-----------|-------|-----------------|--------------|
| v1.0 | lib/aukiolo.ts 100% | aukiolo, priceUtils | 0 major |
| v1.1 | lib/priceUtils + lib/cityFilter | priceUtils, cityFilter | @supabase/ssr, @serwist/next, serwist |
| v1.2 | lib/reviewUtils 9 tests (TDD) | reviewUtils (resolveDisplayName, computeAvgRating) | 0 major |

### Top Lessons (Verified Across Milestones)

1. TDD for utility functions: always write tests for lib/ functions before wiring to UI
2. Cache key design: include all dimensions that affect the result (date + city + user context)
3. Single source of truth in lib/: prevents duplicate logic across components
4. Generate SUMMARY.md after every plan execution — missing summaries create gaps at milestone close
5. DB-level constraints beat app-level enforcement for business rules (composite UNIQUE for reviews)
