# Project Research Summary

**Project:** Liikuntahakemisto — v2.2 Onboarding-tekoälyn parannukset
**Domain:** AI-assisted business onboarding wizard (website-to-brand-kit extraction + multi-step form with live preview) for a Finnish sports-venue directory
**Researched:** 2026-06-16
**Confidence:** HIGH

## Executive Summary

This milestone extends a working v2.1 AI-onboarding pipeline (single Claude Haiku vision+text call against homepage HTML, single logo pick, single brand color) into a richer, more user-controlled flow: multi-page crawling for pricing/hours/contact data, a media gallery prefilled from scraped images, multi-candidate logo and 2-color selection UIs, a fixed preview-component bug, a logo-contrast bug fix, a reordered wizard flow with a quick-accept shortcut, and — as the capstone — a live two-pane preview that updates as the user edits any step. All four research tracks agree this is an **additive** milestone on a well-understood, already-instrumented codebase: no framework changes, one new dependency (`cheerio@^1.2.0` for real DOM parsing instead of regex), and every architectural extension point (JSONB columns, existing SSRF guard, existing `Promise.all` fetch pattern, existing `AnimatePresence` crossfade convention, existing YIQ contrast utility) already exists and should be reused rather than replaced.

The recommended approach sequences work by **risk and dependency, not by feature-list order**: ship the highest-risk, most-testable-in-isolation pipeline changes first (schema migration, then scraper multi-page crawl, then prompt/analyzer changes, then route handler), verify them via existing API contracts and test suites before any UI consumes them, then layer the UI features (logo/color selection, gallery, preview-component fix, contrast fix) on top of the now-stable data shape, and build the live-preview pane last since it is the most complex piece and depends on every other feature's final data contract. Quick-accept and the StepPaikka reorder are coupled to a real architectural fact uncovered in research: `paikka_id` is already created **before** the onboarding wizard ever mounts (via `/business`'s `ClaimSearchForm`), so the reorder itself is presentation-only and low-risk — but `business_branding` is keyed only by `business_account_id`, which silently breaks for multi-venue businesses the moment the team's mental model shifts toward "analyze per venue," a risk the reorder surfaces even though it doesn't cause it.

The dominant risks are security and cost, not UX: following links to subpages multiplies the SSRF attack surface (the existing guard only validates the single entry URL — every discovered link and every redirect must be re-validated), and concatenating multi-page HTML into one Claude call risks both token-cost blowup and silent truncation of exactly the subpage that contains the data being requested. A second cluster of risk is state-shape churn: logo selection and 2-color selection both change `business_branding`'s persisted shape from singular (`logo_url`, `colors[0]`) to plural/role-based (`logo_candidates[]`, `selected_background_color` + `selected_accent_color`), and the live-preview pane is the single biggest consumer of that final shape — building it before the shape settles means rework. Both risk clusters have clear, codebase-grounded mitigations documented in PITFALLS.md and ARCHITECTURE.md and should gate phase completion, not be treated as polish.

## Key Findings

### Recommended Stack

The only new runtime dependency needed across all 8 target features is `cheerio@^1.2.0`, replacing the current ad-hoc regex-based HTML extraction with a real DOM parser capable of reliably finding `<a href>` links and `<img>` candidates at scale — regex was already showing strain (a known `lastIndex` bug) and does not scale to "find all internal links" or "find all non-logo content images." Everything else needed is either already installed (`sharp` for image conversion, `framer-motion@^12.38.0` for the live-preview crossfade, Vitest for tests) or deliberately not needed: no concurrency-limiter library (the existing `Promise.all` + `.slice()`-cap + per-request `AbortSignal.timeout` pattern already handles the small, fixed fan-out of 2-4 subpages / up to ~8-15 images), no headless browser (Playwright is an unused devDependency — target subpages are static server-rendered HTML, and a headless browser is incompatible with the documented Vercel Hobby `waitUntil` 10-second budget), no state-management library (React Context + reducer, scoped to the wizard tree, is sufficient for live-preview — Zustand/Redux/Jotai are explicitly rejected), and no form library (the codebase has zero existing form-library usage; introducing one now for live-preview alone would be inconsistent).

**Core technologies:**
- `cheerio@^1.2.0` — parse subpage HTML for link/image discovery — pure JS, no native binary, safe in the same `runtime = 'nodejs'` API route as `sharp`, de-facto standard for server-side scraping
- React Context + reducer (no new package) — tree-scoped live-preview state shared across 6 wizard steps — matches existing codebase conventions, avoids prop-drilling sprawl that a 6-step `EditMode`-style drilling pattern would create
- CSS-only checkerboard backdrop (no package) — logo transparency visibility fix — ~10 lines added to `globals.css` alongside existing `.glass` utilities
- Reuse existing `Promise.all` + `AbortSignal.timeout` fetch pattern — bounding subpage/image fan-out — already proven in `scraper.ts`, no `p-limit` needed at this scale

### Expected Features

Eight target features split cleanly into a P1 core (delivers the milestone's stated goal at acceptable risk) and deferred work. Two features are explicitly identified as architecturally invasive and should NOT be treated as simple UI additions: the StepPaikka/quick-accept reorder (schema re-keying risk) and live preview (largest refactor, touches every step component).

**Must have (P1 — table stakes / core milestone goal):**
- CalloutCard preview fix (step 6 currently renders the wrong/unused component — cheap, visibly broken today)
- Multi-page scraping, homepage + 3-5 same-origin subpages (the actual "better data" half of the milestone; bounded scope keeps cost/risk manageable)
- Multi-logo selection (raw candidates already exist in the pipeline as discarded buffers — high value-to-effort)
- 2-color selection (raw palette already exists — high value-to-effort, also unblocks the logo-contrast fix)
- White/transparent logo contrast fix (small, visible bug; best fixed once the 2-color model exists, or with a quick checkerboard fix first)

**Should have (P2 — sequence into v2.2 if P1 lands cleanly, else v2.3):**
- Image discovery for the Mediat gallery (natural follow-on once multi-page fetch exists; adds Storage cost and background-job duration risk — validate Feature 3's latency first)
- StepPaikka-before-URL-analysis reorder + quick-accept shortcut (valuable, lower friction for the target audience, but the most architecturally invasive — schema re-key risk for `business_branding`)

**Defer (v3+):**
- Live preview with desktop split-view / mobile toggle — explicitly the highest-complexity item; depends on every other feature's final data shape; building it early means rework once logo/color selection shapes change

### Architecture Approach

The architecture stays additive throughout: `business_branding` gains new JSONB-friendly columns (`logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color`) via one migration that also fixes a pre-existing `logo_type` CHECK constraint mismatch; the scraper's `ScrapeResult` shape changes from a single `htmlSnippet` string to a `pages` array of `{url, htmlSnippet}`; the Claude response shape changes `logo_index` (pick one) to `logo_candidates` (rank/filter many, let the user choose); and a new `WizardPreviewContext` wraps the *existing* `WizardInner` tree without replacing its step-switch/routing logic, so each step keeps its local `useState` and additionally calls one `updatePreview()` function on field change.

**Major components:**
1. **Pipeline layer** (`lib/branding/scraper.ts`, `prompt.ts`, `analyzer.ts`, `route.ts`) — multi-page crawl, plural logo/image candidates, SSRF-guard extension to every followed URL; highest technical risk, fully testable via existing GET/POST contracts before any UI depends on it
2. **Schema layer** (`supabase/migrations/`) — additive JSONB/TEXT columns on `business_branding`, must land first since every downstream change writes to it
3. **Selection UI layer** (`AnalysoiSivusto.tsx`, new `PATCH /api/business/branding`) — logo picker, 2-color swatch picker, server-validated against the business's own stored analysis result (never accept arbitrary client-supplied URLs/colors)
4. **Live-preview layer** (`WizardPreviewContext.tsx`, `WizardLivePreview.tsx`, `app/business/onboarding/page.tsx`) — in-memory cross-step state, desktop split / mobile toggle, sequenced last so it's built against the final data shape once

### Critical Pitfalls

1. **SSRF surface multiplies when following subpage links** — the existing guard only validates the user-submitted entry URL; every discovered `<a href>` and every fetch redirect must be re-validated against the same hostname/private-IP check, restricted to exact same-hostname matches, with `redirect: 'manual'` or post-fetch `res.url` re-validation. This must gate the merge of "follow links," not ship as a follow-up.
2. **Multi-page HTML concatenation causes token-cost blowup and silent truncation** — the current flat `8000`-char slice applied to N concatenated pages risks cutting off exactly the subpage containing the requested data (e.g., pricing). Apply per-page truncation budgets before concatenation, label each page with a source delimiter, and log `response.usage` to catch cost regressions before the bill does.
3. **Reordering StepPaikka exposes a latent multi-venue data-loss bug** — `business_branding` is keyed only by `business_account_id`; reordering encourages an "analyze per venue" mental model the schema doesn't support, so a second venue's analysis silently overwrites the first's. Decide explicitly whether to re-key to `paikka_id` in the same migration as the reorder — don't ship them separately.
4. **Quick-accept must not become a second, unvalidated write path** — the existing `submit/route.ts` carries load-bearing invariants (ownership check, retry-safe draft deletion, XSS guard on `varauslinkki`). Reuse it with a `submission_type: 'quick'` flag rather than building a parallel write path that duplicates none of those protections.
5. **Live-preview prop-drilling/re-render storm** — naively extending the existing save-then-refetch pattern (or the `EditMode` prop-drilling precedent) to 6 steps + a preview pane causes either DB-hammering on every keystroke or a re-render blast radius across the whole wizard tree. Use a dedicated Context for preview state, separate from persisted draft state, with `useMemo`/`React.memo` around preview-consuming components.

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Schema migration + multi-page scraper pipeline
**Rationale:** Every downstream feature (logo selection, color selection, gallery, live preview) depends on this layer's final data shape. It is also the highest-technical-risk component and is fully testable in isolation via existing `analyzer.test.ts`/`scraper.test.ts` fixtures and the existing GET/POST Route Handler contracts — verify thoroughly before any UI consumes it.
**Delivers:** `business_branding` migration (logo_candidates, image_urls, selected_background_color, selected_accent_color columns + logo_type CHECK fix); `lib/branding/scraper.ts` multi-page link-following with re-validated SSRF guard on every followed URL; `lib/branding/prompt.ts` + `analyzer.ts` updated for labeled multi-page input and `logo_candidates` array semantics; per-page truncation budget with total ceiling and `response.usage` logging.
**Addresses:** Feature 3 (multi-page scraping), foundational data for Features 4/5/6
**Avoids:** Pitfall 4 (SSRF expansion), Pitfall 5 (token-cost blowup / truncation)

### Phase 2: Logo, color, and gallery selection UI
**Rationale:** Once the pipeline reliably returns plural candidates and image URLs, the UI work to let users choose (rather than auto-accept Claude's single pick) is comparatively low-risk and high value-to-effort — the raw data already exists, this phase is mostly UI + a dedicated validated write path.
**Delivers:** Multi-logo picker grid (radio semantics, AI's top pick pre-highlighted); 2-color swatch picker (background + accent roles, not positional indexing); new `PATCH /api/business/branding` route with server-side validation that selections came from that business's own stored analysis (never accept arbitrary client-supplied URLs/colors); gallery image candidates proxied through Supabase Storage (never hotlinked), correctly resolved against their source page's base URL.
**Addresses:** Features 4, 5, 6
**Avoids:** Pitfall 6 (gallery hotlinking/format/size pitfalls), Pitfall 7 (single-value assumptions breaking on plural data)

### Phase 3: Preview-component fix + logo-contrast fix (shared primitive)
**Rationale:** Both are cheap, visible bugs independent of the pipeline/selection work, but the contrast fix specifically must be extracted as a single shared `LogoSwatch`/`LogoPreview` primitive used everywhere `logo_url` renders — patching only one component (e.g. `DiagonaalKortti`) leaves the bug reproducible in `AnalysoiSivusto`'s preview and (critically) the new live-preview pane being built in Phase 4. Best sequenced after Phase 2 so the contrast fix can use the user-selected background color, not just a generic neutral backdrop.
**Delivers:** `StepEsikatselu.tsx` swaps `PaikkaKortti` for `CalloutCard` with a nullable-coordinates guard/fallback; shared logo-display primitive (checkerboard or fixed light-gray chip) applied consistently across all logo render sites.
**Addresses:** Features 1, 7
**Avoids:** Pitfall 8 (contrast fix patched in only one component)

### Phase 4: StepPaikka reorder + quick-accept shortcut
**Rationale:** Architecturally invasive but presentation-only at its core (research confirms `paikka_id` already exists before the wizard mounts) — the real risk is the coupled schema decision (re-key `business_branding` to include `paikka_id`, or explicitly accept the multi-venue limitation) and the `current_step` skip-guard breaking for in-flight drafts created under the old step order. Sequence after Phases 1-3 so quick-accept can read the final, stable `BrandingResult` shape.
**Delivers:** 3-phase onboarding page state machine (paikka -> pre -> wizard); migration adding `paikka_id` to `business_branding`'s unique constraint (or documented decision not to); one-time migration resetting `current_step` for pre-deploy drafts; quick-accept route reusing `submit/route.ts`'s ownership-check and retry-safe commit pattern via a `submission_type` flag, not a parallel write path.
**Addresses:** Feature 2 (A+B)
**Avoids:** Pitfall 1 (multi-venue branding overwrite), Pitfall 2 (skip-guard breaking for old drafts), Pitfall 3 (quick-accept bypassing commit invariants)

### Phase 5: Live preview pane (desktop split / mobile toggle)
**Rationale:** Correctly the most complex and highest-rework-risk if built early — it is the primary consumer of every prior phase's final data shape (logo selection, color selection, fixed preview component, fixed contrast). Sequencing it last means it's built once against a settled contract instead of being rebuilt as Phases 1-4 land.
**Delivers:** `WizardPreviewContext` + reducer wrapping the existing `WizardInner` tree (not replacing its step-switch logic); each of the 5 remaining step components gains one additive `updatePreview()` call in existing `onChange` handlers; new `WizardLivePreview.tsx` pane rendering `CalloutCard`/`DiagonaalKortti` from context state; responsive layout (desktop two-column grid, mobile `AnimatePresence` crossfade toggle reusing the existing lista/kartta convention); `useMemo`/`React.memo` around preview-consuming components to prevent re-render storms.
**Addresses:** Feature 8
**Avoids:** Pitfall 9 (prop-drilling sprawl / re-render storm), reinforces Pitfall 8's shared-primitive requirement for the new render site

### Phase Ordering Rationale

- **Risk-first, not feature-list order:** the pipeline (Phase 1) and the reorder/quick-accept (Phase 4) are sequenced by data-integrity and security risk, not by the milestone description's listed order — PITFALLS.md and ARCHITECTURE.md both independently arrive at "schema/pipeline first, live preview last."
- **Data-shape stability gates UI work:** Phases 2 and 3 are sequenced before Phase 5 specifically because live preview depends on the *final* shape of logo candidates, color roles, and the corrected preview component — building it earlier means rebuilding it once those shapes change.
- **Security pitfalls gate phase completion:** Pitfall 4 (SSRF) and Pitfall 3 (quick-accept bypass) are explicitly called out in PITFALLS.md as things that "should gate merge," not follow-up tickets — Phase 1 and Phase 4 should not be considered done until their respective security tests pass.
- **The reorder's real risk is schema, not UI:** ARCHITECTURE.md's ground-truth trace (section 0) shows the StepPaikka reorder itself carries zero data-dependency risk; PITFALLS.md's Pitfall 1 shows the *coupled* schema decision is where the real risk lives. Both research files agree this must be one migration, not split across phases.

### Research Flags

Needs research during planning:
- **Phase 1 (multi-page scraper):** SSRF-safe fetch wrapper patterns and exact Vercel `waitUntil` 10s budget tuning for N parallel subpage fetches — flagged MEDIUM confidence in both STACK.md and ARCHITECTURE.md as needing empirical load-testing during implementation, not assumed from research alone.
- **Phase 4 (reorder + quick-accept):** the `business_branding` re-keying decision (add `paikka_id` to the unique constraint vs. explicitly document the multi-venue limitation) is a product decision, not just an implementation detail — needs explicit confirmation before migration design.
- **Phase 5 (live preview):** exact Context/reducer shape and which fields require `useMemo` boundaries should be validated against the real `StepMediat`/`StepHinnasto` field count once Phases 1-2 land and the data model is final.

Phases with standard, well-documented patterns (skip deep research-phase):
- **Phase 2 (selection UI):** swatch/picker UI patterns are well-established (Brandfetch/Wix-style multi-candidate pickers); Cheerio API surface is stable and Context7-verified.
- **Phase 3 (preview/contrast fix):** pure CSS + component-swap work with an existing YIQ contrast utility (`getContrastColor`) already proven in the codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Cheerio, Framer Motion, Sharp all verified via Context7/official docs; decision to avoid new dependencies (concurrency limiter, form library, state library) verified directly against the existing codebase's `tsconfig.json` and current usage patterns |
| Features | MEDIUM | Codebase analysis of the current pipeline and wizard is HIGH confidence; competitive/ecosystem patterns (Wix ADI, Squarespace Blueprint, Brandfetch) are MEDIUM — WebSearch-verified across multiple sources but no single authoritative spec exists for this niche feature combination |
| Architecture | HIGH | Based on direct inspection of the exact files this milestone will modify (migrations, route handlers, wizard components), not inference. Single MEDIUM-confidence sub-area: the precise Vercel `waitUntil` 10s budget impact of multi-page fetching has not been empirically load-tested |
| Pitfalls | HIGH for architecture/schema pitfalls (codebase-verified); MEDIUM for general web-scraping/SSRF/prompt-cost pitfalls (cross-checked against current code plus general security practice, not independently re-verified against current OWASP/Anthropic docs this session) |

**Overall confidence:** HIGH

### Gaps to Address

- **Multi-venue `business_branding` scoping decision:** research surfaces the gap clearly (Pitfall 1, ARCHITECTURE.md section 2) but does not make the product decision for the team — must be resolved explicitly before Phase 4's migration is written, not deferred implicitly.
- **Vercel Hobby `waitUntil` 10s budget under multi-page fetch load:** flagged as MEDIUM confidence by both STACK.md and ARCHITECTURE.md — recommend empirical testing (timing logs across realistic subpage counts) early in Phase 1 rather than assuming the suggested 3-5 page cap is safe by inspection alone.
- **Quick-accept minimum-viable-draft shape:** PITFALLS.md (Pitfall 3) flags that "what counts as good enough to submit" is an undefined product decision, not an implementation detail — needs explicit definition before Phase 4 begins.
- **SSRF-safe fetch wrapper / DNS-rebinding mitigation depth:** PITFALLS.md explicitly recommends a follow-up phase-specific research pass on SSRF-safe fetch wrappers before implementing Phase 1's "follow links" capability, since this session's research was cross-checked against general practice rather than current OWASP guidance directly.
- **`PreviewModal.tsx` consistency:** ARCHITECTURE.md flags that `PreviewModal` (used in `EditMode`, not just onboarding) renders the same `PaikkaKortti`/`DiagonaalKortti` trio Feature 1 fixes in `StepEsikatselu` — out of explicit milestone scope, but likely to look inconsistent once Phase 3 ships; flag for a scope-confirmation conversation before Phase 3, not a silent omission.

## Sources

### Primary (HIGH confidence)
- Context7 `/cheeriojs/cheerio` — load/selecting/attribute-extraction API
- Context7 `/grx7/framer-motion` — AnimatePresence/layout animation API surface
- Direct codebase inspection — `lib/branding/{scraper,analyzer,prompt,brandingResult}.ts`, `app/api/business/analyze-website/route.ts`, `app/api/business/onboarding/{submit,save-step}/route.ts`, `app/business/WizardInner.tsx`, `app/business/onboarding/{page,AnalysoiSivusto,StepPaikka,StepMediat,StepEsikatselu}.tsx`, `app/business/page.tsx`, `app/api/business/{claim-paikka,create-paikka,register}/route.ts`, `app/components/{CalloutCard,DiagonaalKortti,PreviewModal}.tsx`, `supabase/migrations/{20260606000000_onboarding,20260615000001_business_branding}.sql`, `package.json`, `tsconfig.json`, `.planning/PROJECT.md`

### Secondary (MEDIUM confidence)
- WebSearch, verified against npm — Cheerio latest `1.2.0` release
- WebSearch — Framer Motion to Motion package rename (2025), decision to not migrate is a project-fit judgment
- WebSearch — `p-limit@7.3.0`, decision to avoid is based on direct codebase inspection
- Chrome Web Store listings (Brand Kit Extractor, Brandfetch, Branding Capture) — ecosystem patterns for multi-logo/color extraction
- Wix AI Logo Maker review, Wix vs Squarespace AI builder comparison — live-preview and multi-option-suggestion patterns
- Firecrawl Glossary — crawl-boundary best practices (depth limit, URL pattern matching)
- General security/engineering practice — SSRF via redirect-following/DNS rebinding as a known bug class; multi-document RAG-style prompting (source labeling, per-source truncation) as standard practice

---
*Research completed: 2026-06-16*
*Ready for roadmap: yes*
