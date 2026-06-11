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

## Milestone: v1.3 — AKTIIVI Redesign & Polish

**Shipped:** 2026-05-30
**Phases:** 3 (phases 16–18) | **Plans:** 8 | **Timeline:** 1 day

### What Was Built
- AKTIIVI rebrand: name, meta-tags, PWA manifest
- AktiiviLogo animated SVG watermark with 5 sport color gradients per-open
- Unified toolbar: Search+Filter pill + separate LayoutList toggle
- Unified red SVG sport pins (#ef4444); same-address clustering; clusterPinUrl
- CalloutCard clip-path spike + PaikkaSheet layoutId expansion animation

### What Worked
- clip-path spike approach: ResizeObserver measures height, calculates path — no separate elements
- layoutId animation required isolating translateX into a wrapper div — discovered constraint about conflicting transforms
- Record<string,T[]> workaround for TS 5.9.3 Map<K,V> generic regression — surfaced quickly

### What Was Inefficient
- TS 5.9.3 regression in Map<K,V> generics required a workaround; discovered during execution

### Patterns Established
- Pin color unification: laji differentiated by icon, not color — visual consistency
- layoutId: element must not own conflicting CSS transforms; use wrapper div for translateX
- Cluster markers: same-address grouping by ±0.0001° coordinate proximity

### Key Lessons
1. Framer Motion layoutId conflicts: the animated element cannot own conflicting transforms — wrap instead
2. TypeScript minor versions can introduce regressions; always check before upgrading

---

## Milestone: v1.4 — UX-parannukset & Profiili

**Shipped:** 2026-05-31
**Phases:** 4 (phases 19–22) | **Plans:** 11 | **Timeline:** 1 day

### What Was Built
- Kertakäynti OK filter; DiagonaalKortti pin button for map focus; image_url from Supabase
- Back-scroll restoration; "Näytä kartalla" coordinates focus; bottom sheet auto-open on load
- TODO list: suosikit renamed, heart → bookmark icon; /suosikit page shows TODO items
- Profile interests (multi-select sports); AI personalization uses interests

### What Worked
- sessionStorage scroll position: simple `key + url` fingerprint, restored on back navigation
- Interests as string[] in profiles table: flexible, no separate table needed for MVP
- Auto-open bottom sheet on mount: simple useEffect, no URL param needed

### What Was Inefficient
- /suosikit page added in v1.4 only to be removed in v1.6 — short-lived feature

### Key Lessons
1. Plan for feature lifecycle: /suosikit page was added and removed within 3 milestones
2. Scroll restoration needs a stable key — URL + component name works well

---

## Milestone: v1.5 — Visuaalinen elävöitys & UX-hienosäätö

**Shipped:** 2026-06-02
**Phases:** 4 (phases 23–26) | **Plans:** 9 | **Timeline:** 2 days

### What Was Built
- Outfit font via CSS variable abstraction (zero downstream changes)
- AktiiviLogo blue sweep animation (auto-loop, 32px)
- SportPin: blue gradient (#38bdf8→#0284c7) + @keyframes spinOrbit orbit glow
- CalloutCard: 160×160px, vertical layout, letter-by-letter slide animation (22ms stagger)
- TO DO overlay: glassmorphism panel over Etusivu, scale animation, stagger list, inline review prompt
- FilterCarouselPill: carousel animation for active selections; ambient cycle when no selections

### What Worked
- CSS variable font abstraction: swapping Inter→Outfit with zero component changes
- spinOrbit animation: transform/opacity only (no box-shadow) — AdvancedMarker constraint respected
- Inline review in TODO overlay: keeps user in context vs navigating to venue page

### What Was Inefficient
- MAP-15 partial: DiagonaalKortti sport icon not updated in v1.5 (done in v1.6 Phase 28)

### Key Lessons
1. CSS variable abstraction for fonts: the correct level of indirection — changes at one point
2. AdvancedMarker CSS constraint (transform/opacity only) must be front-of-mind for all pin animations

---

## Milestone: v1.6 — Kielituki, Ikonit & Sheet-redesign

**Shipped:** 2026-06-04
**Phases:** 4 (phases 27–30) | **Plans:** 15 | **Timeline:** 2 days
**Commits:** ~126 | **Files:** 108 changed | **Lines:** +13,608 / -2,255

### What Was Built
- Phase 27 cleanup: /suosikit removed, TODO toolbar button removed, filter pill ghost fix, cluster zoom, sheet fade overlay + height cap + tap delay fix
- Phase 28 SVG icons: lib/sportIcons.tsx single registry; Lucide removed from lib/lajit.ts; all 5 consumers migrated; tsc clean
- Phase 29 redesign: PaikkaSheet 16:9 hero carousel + gradient overlay + pricing row + collapsible reviews; DiagonaalKortti placeholders; PaikkaKortti marquee price row
- Phase 30 i18n: next-intl without-routing; NEXT_LOCALE cookie; LanguageToggle on /profiili; all UI translated; compile-time key coverage assertion; UAT 8/8

### What Worked
- next-intl without-routing: cleanest way to add i18n without touching URL structure
- Compile-time assertion for translation coverage (IN-05): caught missing keys at build time, not runtime
- `zoomRef.current` fast path for SHEET-06: synchronous ref avoids React async state timing issues
- Path-string approach for SVG icons: no webpack plugin, Turbopack-compatible from day one
- Single registry (lib/sportIcons.tsx) with clear consumer list: migration was mechanical and verifiable

### What Was Inefficient
- UAT found sport name translations missing after Phase 30 UAT — required 5 additional fix commits
- REQUIREMENTS.md checkboxes still not updated during execution (recurring pattern)

### Patterns Established
- i18n namespace per component: `useTranslations('NavPill')`, `getTranslations('PaikkaSheet')` — clear ownership
- Compile-time translation coverage: compile-time assertion over unit test — fails build, not test run
- SVG as compile-time path strings in a typed registry — `SPORT_ICONS: Record<LajiId, string>`

### Key Lessons
1. UAT should include language-switch smoke test from the start — sport names were missed because they weren't in a component-namespaced translation key
2. Compile-time key coverage assertion is better than a separate test file — it's always in the critical path
3. Recurring pattern: REQUIREMENTS.md checkboxes not updated during execution — either automate or accept that archive is the canonical "done" record
4. SVG icon migration: list all render sites before starting; verify each with grep — five sites, no surprise sixth

---

## Milestone: v1.7 — Yritysportaali

**Shipped:** 2026-06-11
**Phases:** 6 (phases 31–36) | **Plans:** 44 | **Timeline:** 7 days

### What Was Built
- Complete Supabase DB schema: business_accounts, business_paikka_links, business-media Storage bucket + SECURITY DEFINER RLS
- Business registration flow: /business/rekisteroidy + JWT-verified /api/business/register + AuthModal business redirect
- Claim & create venue: search or create; published=false until admin approval; is_claimed flag
- 6-step onboarding wizard with draft persistence, image/logo upload to Supabase Storage, step-forward URL guard
- Admin approval system: Resend email notifications, /admin panel list + detail, approve/reject with emails, reapply flow
- Full business control panel: venue list with status badges, complete edit wizard for all data, per-step preview modal

### What Worked
- Resend for transactional email: simple API, fast to set up, zero infrastructure
- Draft-based wizard architecture: onboarding_draft table as source of truth survives page reloads and tab closes
- Per-request supabaseAdmin.auth.getUser(token) pattern: JWT verification at every Route Handler boundary
- Gap-closure plan approach: inserting 34-11, 34-12, 35-10, 35-11 mid-phase caught UAT issues without disrupting original phase numbering
- Audit-before-close workflow: the pre-merge audit surfaced the two blockers (update-paikka 403, URL step-skip) that would have affected real users

### What Was Inefficient
- Two wizard orchestrators (OnboardingWizardInner + EditWizardInner) duplicated all routing/guard/draft-fetch logic — every bug needed two fixes
- REQUIREMENTS.md checkboxes still not updated during execution (recurring pattern — now 7 milestones in a row)
- Phase 33 and Phase 36 completed without running gsd-verifier — missing VERIFICATION.md discovered at audit time
- Supabase Storage RLS research: SECURITY DEFINER approach only discovered after initial direct policy attempts failed

### Patterns Established
- JWT verification at Route Handler boundary: `supabaseAdmin.auth.getUser(token)` before trusting any client-supplied user_id
- Storage RLS on hosted Supabase requires SECURITY DEFINER function in public schema (storage schema is forbidden)
- Draft table as wizard state: `onboarding_draft` rows scoped by `business_account_id + paikka_id` — supports multi-venue accounts
- paikka_id in URL for wizard routing: enables resuming and prevents cross-venue contamination when querying drafts
- Reapply pattern: UPDATE existing rejected row to pending (not INSERT new row — avoids composite UNIQUE constraint violation)

### Key Lessons
1. Two orchestrators for one flow is a maintenance debt trap — the second time you fix a bug in both is the time to merge them
2. Run gsd-verifier immediately after UAT, not at milestone close — missing VERIFICATION.md creates audit gaps
3. Hosted Supabase Storage RLS: you cannot write policies that reference the storage schema directly; SECURITY DEFINER in public schema is the required pattern
4. Audit-before-close is worth the time: both blockers found (URL step-skip + update-paikka 403) were silent failures visible to users, not just dev-only edge cases
5. REQUIREMENTS.md checkboxes: at 7 milestones of non-compliance, accept that the archive + VERIFICATION.md are the canonical "done" records — not worth fixing the workflow

### Cost Observations
- Model mix: Sonnet 4.6 (execution and this session), Opus used for heavier planning phases
- Sessions: ~7 days, multiple sessions per day during execution
- Notable: 6 parallel phases with many cross-phase dependencies; gap-closure plans kept execution clean without disrupting phase numbering

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 | 5 | 25 | 3 days | Foundation: security + data + AI |
| v1.1 | 6 | 23 | 6 days | Added auth, map arch, PWA |
| v1.2 | 4 | 14 | 2 days | UI overhaul: search integration, new card model, reviews, AI personalization |
| v1.3 | 3 | 8 | 1 day | AKTIIVI rebrand, animated logo, unified toolbar, SVG pins, layoutId expansion |
| v1.4 | 4 | 11 | 1 day | Kertakäynti filter, scroll restore, TODO list, profile interests + AI personalization |
| v1.5 | 4 | 9 | 2 days | Outfit font, blue sport pins + orbit glow, CalloutCard letter animation, TODO overlay, FilterCarouselPill |
| v1.6 | 4 | 15 | 2 days | i18n FI/EN, SVG icon registry, PaikkaSheet hero redesign, nav/filter/sheet bugfixes |
| v1.7 | 6 | 44 | 7 days | Full business portal: DB schema, registration, claim/create, 6-step wizard, admin approval, control panel |

### Cumulative Quality

| Milestone | Tests | Key Libs Tested | New Packages |
|-----------|-------|-----------------|--------------|
| v1.0 | lib/aukiolo.ts 100% | aukiolo, priceUtils | 0 major |
| v1.1 | lib/priceUtils + lib/cityFilter | priceUtils, cityFilter | @supabase/ssr, @serwist/next, serwist |
| v1.2 | lib/reviewUtils 9 tests (TDD) | reviewUtils (resolveDisplayName, computeAvgRating) | 0 major |
| v1.3–v1.5 | no new lib tests | — | framer-motion patterns only |
| v1.6 | lib/i18nUtils tests, compile-time key coverage assertion | i18nUtils | next-intl |
| v1.7 | lib/onboardingUtils tests (Wave 0) | onboardingUtils | resend |

### Top Lessons (Verified Across Milestones)

1. TDD for utility functions: always write tests for lib/ functions before wiring to UI
2. Cache key design: include all dimensions that affect the result (date + city + user context)
3. Single source of truth in lib/: prevents duplicate logic across components
4. Generate SUMMARY.md after every plan execution — missing summaries create gaps at milestone close
5. DB-level constraints beat app-level enforcement for business rules (composite UNIQUE for reviews)
6. Compile-time assertions beat unit tests for coverage invariants (translation key coverage in v1.6)
7. Recurring gap: REQUIREMENTS.md checkboxes not updated during execution — accept archive as canonical "done"
