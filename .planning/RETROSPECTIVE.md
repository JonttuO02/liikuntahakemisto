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

## Milestone: v2.2 — Onboarding-tekoälyn parannukset

**Shipped:** 2026-06-21
**Phases:** 6 (phases 47–51.1) | **Plans:** 22 | **Timeline:** 3 days (2026-06-16 → 2026-06-19)

### What Was Built
- Multi-page scraper crawl (homepage + up to 4 keyword-matched subpages) with a redirect-revalidating SSRF guard, replacing the single-page v2.1 pipeline
- Plural branding schema: `logo_candidates`/`image_urls`/separate background+accent color columns, re-keyed UNIQUE constraint to `(business_account_id, paikka_id)`
- Logo + 2-color selection UI with a validated `PATCH /api/business/branding` autosave route, gallery picker prefilling the Mediat step
- Quick-accept path: AI results map into the existing `onboarding_draft` and reuse the unmodified submit route — no parallel write path
- Step 6 preview swapped to `CalloutCard` + a shared `ContrastSafeLogo` primitive (fixes white/transparent logo invisibility)
- `StepPaikka` moved to a pre-phase before URL analysis; wizard renumbered to 5 steps
- Shared `LivePreviewProvider` context: every wizard step dispatches live updates, rendered via desktop split-view / mobile toggle, in both onboarding and EditMode — extended in a gap-closure sub-phase (51.1) to the pre-wizard AnalysoiSivusto results screen

### What Worked
- Sequencing live preview (Phase 51) last, after the data shape from Phases 47–49 settled — avoided rebuilding it mid-milestone
- Gap-closure plans inserted directly into Phase 48 (48-04) and Phase 51 (51-05/06/07) caught verification-found regressions without renumbering
- Shared `isUrlSafe` + redirect-revalidating fetch wrapper reused across every outbound fetch (page/subpage/CSS/logo) — one SSRF guard instead of N inline checks

### What Was Inefficient
- Two single-expression regressions shipped in Phase 48 (step-skip on confirm, array-position color fallback) and needed a same-day follow-up plan (48-04)
- Live preview needed three separate gap-closure rounds in Phase 51 (CR-01 blob staleness, WR-01 EditMode stale-unmount, second CR-01 branding-path overlay) — the branding-path overlay gap specifically was only caught because a user tested an AI-onboarded venue, not by automated verification
- Phase 51.1 itself exists because Phase 51's CONTEXT.md scoped out the AnalysoiSivusto results screen by mistake, despite that screen already having the branding data available

### Patterns Established
- `fetchWithSsrfGuard` wrapper re-validates every 3xx redirect hop against `isUrlSafe`, capped at 2 hops — the standard shape for any future outbound fetch in the scraping pipeline
- React Context + reducer (no new state library) is sufficient for cross-step live-preview state at this scale
- `cheerio` for DOM-based link/image discovery, replacing regex extraction

### Key Lessons
1. When a feature depends on the final shape of upstream data, sequence it last even if it delays visible progress — Phase 51 building live preview after 47-49 avoided a rebuild
2. A verification report with `status: gaps_found` is not optional follow-up — Phase 48 and Phase 51 both got same-phase 04+/05+ gap-closure plans before moving on; Phases 23 and 30 (from earlier milestones) show what happens when that follow-up doesn't happen — both still carry unfixed `gaps_found` reports at v2.2 close
3. Scope a sub-phase's CONTEXT.md by checking what data is actually available at each screen, not just by the screen's nominal place in the flow — Phase 51.1 only existed because Phase 51 assumed the pre-wizard screen lacked branding data it actually had
4. Re-keying a UNIQUE constraint to include the correct scoping column (`paikka_id`) is worth doing as schema work before building selection UI on top of it — retrofitting later means a migration plus a backfill

### Cost Observations
- Model mix: Sonnet 4.6 throughout
- Sessions: 3 days, multiple sessions per day during execution
- Notable: 211 commits across 6 phases/22 plans — a higher commit-to-plan ratio than v1.7, driven by the gap-closure cycles in Phases 48 and 51

---

## Milestone: v3.0 — Oma tietokanta (Google Places -irtautuminen)

**Shipped:** 2026-06-24
**Phases:** 6 (phases 52–57) | **Plans:** 13 | **Timeline:** 2 days (2026-06-22 → 2026-06-24)
**Files changed:** 120 | **Lines:** +13,468 / -1,765

### What Was Built
- Cleanup phase verified i18n coverage and fixed an AuthModal error-precedence bug, with a regression test guarding it
- `/api/admin/sync-paikat` removed entirely; all Google Places-origin venue rows deleted from `liikuntapaikat` (operator chose a full 327/327 wipe over the planned provenance-preserving delete)
- New onboarding Sijainti step: map-pin placement + address autocomplete, persisting only lat/lng + the user-typed address (no `place_id` or raw Places response)
- AI site analysis now suggests a sport category from `lib/lajit.ts`'s taxonomy; user must explicitly confirm or change it before it's written
- Claim/create flow reworked to create-only: separate company/branch name fields with shared normalization (`lib/normalizeNimi.ts`), old claim-search route deleted
- `/business` no longer auto-redirects to onboarding; per-venue "Kesken" badge + "Jatka" resume CTA replaces the single boolean redirect, with a `submitted_at` precedence gap caught and fixed during the human-verify checkpoint

### What Worked
- Sequencing Phase 57 (dashboard/redirect) last, after Phase 56's claim/create rework landed — avoided building the Kesken-resume UI against an entry point that was about to change (PITFALLS Pitfall 9 paid off)
- Cleanup-first phase (52) caught that two carried-forward gaps (P30-GAP, P30-BUG) were already resolved — re-verifying before re-fixing saved wasted work
- `AutocompleteSuggestion.fetchAutocompleteSuggestions()` fallback found quickly via the `visgl/react-google-maps` maintainer's own guidance after `PlaceAutocompleteElement` crashed in live browser verification — research caught the blocker before it became a stuck plan

### What Was Inefficient
- Phase 53's irreversible full-database wipe deviated from the planned provenance-preserving delete (322/327) without a pre-migration `pg_dump`; 2 business accounts lost their claimed venue as a result, with no follow-up outreach run
- Phase 57's human-verify checkpoint found a `submitted_at` precedence bug (created-but-never-submitted venues showed the wrong Kesken state) — a gap that better upfront state-machine design (explicit timestamp from the start) would have avoided

### Patterns Established
- `deriveVenueStatus` precedence helper, unit-tested, as the single source of truth for per-venue dashboard state — avoids ad-hoc boolean checks scattered across the UI
- Explicit `submitted_at` timestamp on `business_paikka_links`, set at `onboarding/submit` and `reapply` — distinguishes "draft, never submitted" from "submitted, pending" instead of inferring it from other fields
- Two separate name fields (`yritysNimi` required, `toimipisteNimi` optional) normalized through one shared helper, written to both `business_accounts.company_name` and `liikuntapaikat.nimi`

### Key Lessons
1. An irreversible destructive migration (full-table wipe) deserves a pre-migration backup even when the operator accepts the data-loss risk verbally — the 2 orphaned business accounts had no recovery path and no tracked follow-up
2. When a Google-recommended/maintainer-recommended web component is alpha/beta-only, verify in a live browser before committing a plan to it — the crash was reproducible on both default and beta channels, not an edge case
3. Status fields inferred from a combination of other columns (no explicit timestamp) are a recurring source of precedence bugs — Phase 57 hit this for the second time this project (cf. v1.6 AuthModal precedence bug) — prefer an explicit state column when a screen needs to distinguish more than two states

### Cost Observations
- Model mix: Sonnet 4.6 throughout
- Sessions: 2 days, multiple sessions per day
- Notable: lowest plans-per-phase ratio yet (13 plans / 6 phases ≈ 2.2) — three of six phases (52, 55-frontend, 57) closed in a single plan or wave, reflecting smaller, well-scoped surgical changes rather than greenfield builds

---

## Milestone: v3.1 — UX/UI-korjaukset & business-parannukset

**Shipped:** 2026-07-02
**Phases:** 7 (phases 58–64) | **Plans:** 33 | **Timeline:** 8 days (2026-06-24 → 2026-07-02)
**Files changed:** 68 | **Lines:** +5,375 / -1,366 (excl. worktree/planning artifacts) | **Commits:** 297

### What Was Built
- Multi-company data model: `companies` table + `business_accounts.company_id`/`role`, owner backfill in one transaction, `business_paikka_links` UNIQUE loosened to `(business_account_id, paikka_id)`, RLS rewritten with a `current_company_id()` SECURITY DEFINER helper
- Full hallintaoikeuspyyntö (access-request) lifecycle: `business_access_requests` table, Resend owner-notification + requester-decision emails, concurrency-safe approve/reject Route Handlers, RLS-level access gating (not just UI), invite-link deep-link signup path
- `TeamManagementPopup` dashboard-UI: owner approves/rejects pending requests and removes sub-managers, with a hard server-side self-removal block
- Onboarding reordered: name+URL step first (AI analysis fires in background), location step second, separate Preview step removed entirely, "SUBMIT" replaces "PREVIEW" milestone
- Separate venue page (`app/paikat/[id]`) deleted entirely; all content and navigation consolidated into PaikkaSheet (venuepage), old route now 404s
- `/business` dashboard redesigned around DiagonaalKortti cards with hover/tap-revealed icon-button controls; every preview surface (dashboard modal, edit/onboarding live-preview) now purely visual and includes the consolidated venuepage

### What Worked
- Running independent phases in parallel (58 admin-map and 61 onboarding-reorder touched disjoint code paths from the 59→60→64 and 62→63→64 critical-path chains) kept the 7-phase milestone to 8 days
- Worktree-based execution (`use_worktrees: true`) for wave-parallel plans within a phase, visible in the large number of `chore: merge executor worktree` commits — let independent plan waves land without manual branch juggling
- Gap-closure plans caught real regressions cheaply: Phase 62's onOpen handlers unmounting the overlay underneath PaikkaSheet (62-04) and Phase 64's stale "Pending"→"Current team" list (64-05) were both one-render-pass fixes once UAT surfaced them

### What Was Inefficient
- Two phases (61, 63) needed a second round of gap-closure plans after their first UAT pass — Phase 61's ROADMAP wording ("AI results as their own step") didn't match what UAT approved (background AI, straight to wizard), and Phase 63 needed 63-06/63-07 for dashboard-grid and analysis-pipeline reliability fixes not caught in the original plan
- At milestone close, the pre-close audit flagged 3 "open" items that were actually already resolved in code — a debug session (`paikkasheet-dismisses-search-todo-overlay`) whose fix landed in 62-04 but whose own status field was never updated, and a Phase 61 UAT file stuck at `status: diagnosed` despite VERIFICATION.md scoring 12/12 passed. Neither blocked anything, but both cost a manual cross-check at close time that closing the loop mid-phase would have avoided
- Phase 59's column-level `REVOKE UPDATE (col) ... FROM authenticated` silently failed to restrict anything because a pre-existing table-wide GRANT overrode it — cost a dedicated investigation to discover, and turned out to affect 5 pre-existing instances including a `profiles.is_admin` self-elevation hole

### Patterns Established
- `current_company_id()` STABLE SECURITY DEFINER helper with explicit `SET search_path = public` + `GRANT EXECUTE` — the standard way to avoid same-table RLS recursion in this codebase, reusing the `set_business_managed_on_approval()` precedent
- `REVOKE UPDATE ON table FROM authenticated` + explicit `GRANT UPDATE (allow-list)` is the only pattern that actually restricts column writes here — column-level REVOKE alone does nothing when a table-wide GRANT exists
- onOpen callback contract for DiagonaalKortti instances: select the venue only (`setValittu`), never clear an overlay's own visibility flag in the same handler — z-index stacking (PaikkaSheet 65/66 > overlays 59/62) does the layering, not conditional (un)mounting

### Key Lessons
1. A debug session or UAT file's `status:` frontmatter needs to be updated the moment its fix lands elsewhere in the codebase — otherwise it resurfaces as a false-positive blocker at the next milestone-close audit, costing a manual re-investigation to confirm it's actually resolved
2. Before adding a column-level `REVOKE`/`GRANT` restriction, check for a pre-existing table-wide `GRANT` — Postgres semantics mean the wider grant silently wins, and this pattern has now bitten the project twice in the same migration (Phase 59 found and fixed 5 instances)
3. When a ROADMAP success criterion is written before UAT reveals a better UX (e.g., "AI results as their own step" vs. "AI runs in background, straight to wizard"), treat the UAT-approved behavior as the source of truth and update the ROADMAP text at gap-closure time, not just the code — stale success-criteria wording otherwise reads as an unresolved gap at verification/audit time

### Cost Observations
- Model mix: Sonnet 4.6/5 throughout, adaptive model profile
- Sessions: 8 days, multiple sessions per day, heavy use of parallel worktree execution for wave-based plans
- Notable: highest commit-to-plan ratio yet (297 commits / 33 plans ≈ 9) — reflects the worktree-merge overhead (one merge commit per wave/plan) rather than actual churn; the excl.-worktree diff stat (+5,375/-1,366 across 68 files) is a more honest measure of shipped code size

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
