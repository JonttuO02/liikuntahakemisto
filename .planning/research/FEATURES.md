# Feature Research

**Domain:** AI-assisted business onboarding wizard — website-to-brand-kit extraction + multi-step form with live preview (Finnish sports-venue directory business portal)
**Researched:** 2026-06-16
**Milestone:** v2.2 Onboarding-tekoälyn parannukset
**Confidence:** MEDIUM (codebase analysis is HIGH confidence; external ecosystem patterns are MEDIUM — WebSearch-verified across multiple sources but no single authoritative spec exists for this niche combination of features)

## Context: What Already Exists (v2.1 baseline)

Before categorizing the 8 target features, the current pipeline matters because every feature either extends or risks breaking it:

- `AnalysoiSivusto.tsx` — pre-wizard state machine (`checking → url-input → analyzing → preview/error/timeout`), polls `GET /api/business/analyze-website` every 2s up to 30 tries (~60s cap)
- `scrapeWebsite()` (`lib/branding/scraper.ts`) — fetches **homepage HTML only**, regex-extracts theme-color + `:root` CSS vars (colors), and up to 5 logo candidates (favicon → og:image → `<img>` with "logo" in src/alt/class), converts each to PNG via `sharp`
- `analyzeWithClaude()` (`lib/branding/analyzer.ts` + `prompt.ts`) — **single** Claude vision+text call returns `{ logo_index (one int), logo_type, colors[] (read-only list, first one used as bg), prices[], opening_hours[], website_url }`
- Result stored in `business_branding` table (one row per `business_account_id`, status state machine `pending→analyzing→analyzed→failed`)
- `WizardInner.tsx` renders steps in fixed order 1 Paikka → 2 Mediat → 3 Hinnasto → 4 Aukioloajat → 5 Yhteystiedot → 6 Esikatselu; `OnboardingWizardPage` runs `AnalysoiSivusto` *before* `WizardInner` even mounts (step 1/Paikka is never visible until after analysis or skip)
- `StepEsikatselu.tsx` (step 6) currently renders `PaikkaKortti` + `DiagonaalKortti` + `PaikkaSheet` — **not** `CalloutCard`, which is what's actually used in production (per target feature 1)
- `buildBrandingPreview()` only ever uses `colors[0]` as a single `brandColor`; logo is whatever index Claude picked, with no white/transparent contrast handling
- Submission only happens via the full step-6 `handleSubmit` → `POST /api/business/onboarding/submit`; there is no quick-accept path that skips wizard steps 2–5
- No live-preview mechanism exists in any step today — `StepMediat`, `StepHinnasto`, etc. only show a preview on step 6, and `PreviewModal` (edit mode) is an on-demand modal, not continuously live

## Feature Landscape

### Table Stakes (Users Expect These)

These match what any modern "scan my website → prefill my profile" or website-builder onboarding flow offers as baseline. Missing them makes the AI onboarding feel broken or untrustworthy relative to category leaders (Wix ADI, Squarespace Blueprint, Brandfetch-style brand-kit tools).

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Esikatselu preview shows the real card component (Feature 1)** | Users judge "is this what my listing will look like" by comparing the preview to what they've seen elsewhere in the product (the map CalloutCard). A wrong/unused component breaks trust in the whole onboarding output. | LOW | Pure swap: `StepEsikatselu.tsx` imports `PaikkaKortti`/`DiagonaalKortti` instead of `CalloutCard`. Already has `draftAsPaikka` + `brandColor` computed — `CalloutCard` likely needs same `Liikuntapaikka` shape (verify props match; CalloutCard may expect map-context props like position/zoom it won't have here — needs a "static/preview" variant or prop subset). |
| **Logo visible against its actual background (Feature 7 — bug fix)** | Every brand-kit tool (Brandfetch, Wix Logo Maker) renders extracted logos on a checkerboard or contrasting backdrop specifically because white/transparent logos are extremely common (most company logos ship as transparent PNG/SVG with a wordmark in dark or white). Showing it on a plain white card is a known, well-documented failure mode. | LOW | Needs either (a) a neutral/checkerboard backdrop behind the logo thumbnail in preview, or (b) using the extracted brand background color as the logo's container background (ties to Feature 6 — 2-color pick gives a natural "use accent/bg color as logo backdrop" solution). Cheapest fix: container `bg-[rgba(0,0,0,0.05)]` checkerboard or border; better fix ties into Feature 6. |
| **Single-call AI prefill of structured fields (already shipped)** | Baseline expectation once you've shipped "Analysoi sivustosi" — not new for v2.2, but Features 3–5 extend the *scope* of what's extracted (subpages, multiple images), which IS table stakes once competitors (Wix ADI, Squarespace Blueprint) all crawl more than the homepage. | — | Context only — not new in this milestone. |
| **Following internal links to pricing/hours/contact subpages (Feature 3)** | Real Finnish sports venues very commonly put hinnasto/aukioloajat/yhteystiedot on dedicated subpages, not the homepage. Every competing "site analyzer" (Wix ADI, brand-kit extractors, SEO crawlers) follows at least same-domain links 1 level deep for exactly this reason — homepage-only scraping is considered the naive/incomplete version of this feature category. | MEDIUM | This is the single highest-risk feature for cost/latency/security blast-radius — see Pitfalls below. Requires: link discovery (regex or HTML parse for `<a href>` with Finnish keywords "hinnasto", "hinnat", "aukioloajat", "yhteystiedot", "yhteys", "contact"), same-origin enforcement (reuse existing SSRF guard — apply to EVERY followed link, not just the seed URL), a hard cap on number of pages fetched (e.g. 3–5) and total combined HTML size, and extending `analyzeWithClaude`'s prompt to accept multiple HTML snippets labeled by page type. |
| **Multiple photos prefilled into Mediat gallery (Feature 4)** | Once you're already scraping for logos, collecting "other images on the page" (hero images, facility photos) for the gallery step is the obvious next step and matches what users expect from "smart" import tools — they expect to not re-upload photos that already exist on their own site. | MEDIUM | `StepMediat` already supports a `media_urls.photos` array (max 5) and an `existingPhotoUrls` UI for delete/replace — the slot exists. New work: scraper needs an "other images" candidate list (distinct from logo candidates — likely `<img>` NOT matching "logo" heuristic, filtered by min dimensions to exclude icons/spacers), then those need to be fetched server-side, converted/validated, and stored in Supabase Storage (or referenced by external URL until user confirms) before populating `media_urls.photos`. Costs note: each extra image = another fetch + sharp conversion in the background job, increasing waitUntil duration risk (Hobby tier 10s cap, already flagged as an accepted limitation in this codebase). |

### Differentiators (Competitive Advantage)

These go beyond what most generic "analyze my website" tools do, and align with the project's core differentiator of making business onboarding nearly frictionless for small Finnish sports venues with weak/no web presence skills.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Quick-accept path: skip straight to admin queue (Feature 2, part B)** | Most onboarding products (Airtable, Wix ADI) still force users through every step once an AI draft exists; letting a confident user submit the AI's first guess directly to admin review is a meaningfully lower-friction path than competitors offer, especially for venues whose owner has very limited time/digital literacy — a strong fit for this product's Finnish small-business audience. | MEDIUM | Needs: a new "Hyväksy ja lähetä" CTA on the `AnalysoiSivusto` preview phase (before `WizardInner` ever mounts) that (a) creates/links the `paikka_id` from whatever `StepPaikka` would have collected — but Feature 2 part A moves `StepPaikka` BEFORE the URL step, so by the time analysis preview renders, `paikka_id` already exists; (b) writes branding result directly into `onboarding_draft` fields (hinnasto, aukioloajat, yhteystiedot/website) bypassing steps 2–5 entirely, since Mediat (logo/photos) and the new multi-pick UIs (Features 5–6) still need *some* minimal interaction — open question whether quick-accept skips those too or forces at least a logo/color confirmation click; (c) calls the same `/api/business/onboarding/submit` endpoint used by step 6. Risk: submit endpoint may assume all draft fields are present/validated — needs auditing for partial-draft submission. |
| **StepPaikka moved before URL analysis (Feature 2, part A)** | Lets the system resolve `paikka_id` first, which (a) enables tying the analysis run + quick-accept directly to a known venue row instead of an account-level `business_branding` row, and (b) gives the scraper/Claude prompt the venue's existing `laji` (sport type) and city as context, which could improve subpage-link heuristics and price/hours extraction accuracy (e.g. disambiguating multi-location chains). | MEDIUM | Structural reorder in `WizardInner`/`OnboardingWizardPage`: today `AnalysoiSivusto` renders standalone before `WizardInner` mounts at all, so `paikkaId` doesn't exist yet when analysis starts. Moving Paikka first means either (a) lifting `StepPaikka` out of `WizardInner` into the page-level flow before `AnalysoiSivusto`, or (b) restructuring `business_branding`'s key from `business_account_id` (1 row per account) to `paikka_id`-scoped, which is a bigger schema change since a business can own multiple venues (`business_paikka_links` already supports many-to-one). **This is the most architecturally invasive of the 8 features** — touches DB schema/RLS (`business_branding` FK), the route handler's UPSERT `onConflict` key, and both onboarding/edit entry points. |
| **Multi-logo selection UI (Feature 5)** | Wix's AI Logo Maker, Brandfetch, and most brand-kit extractors that find >1 plausible logo present a small picker grid rather than silently auto-selecting — auto-pick is a known source of "wrong logo chosen" complaints (e.g. picking a partner/sponsor logo instead of the venue's own). Letting the user choose converts an occasionally-wrong AI guess into a fast, low-friction confirm step. | MEDIUM | Scraper already collects up to 5 logo candidates and converts all to PNG (`logoBuffers`) — the raw materials already exist! Today only `result.logo_index` (Claude's single pick) is uploaded via `uploadLogo()`; the other 4 candidate buffers are discarded. New work: (a) upload ALL candidate buffers to Storage (or a temp/staging path) so the user can render a picker grid of real images, not just Claude's pick; (b) `analyzeWithClaude` should still return a *ranked* `logo_index` as the default/highlighted choice, but the UI must allow override; (c) the chosen index needs to flow into `media_urls.logo` / `business_branding.logo_url` on confirm. Standard interaction model from research: a horizontal/grid thumbnail picker with the AI's top pick pre-highlighted/selected, single-select (radio-button semantics, not checkboxes). |
| **2-color palette selection (Feature 6)** | Squarespace Blueprint and similar tools present a small swatch picker (3–6 extracted colors) and let the user assign roles (background vs. accent) rather than auto-applying the first extracted color. This is more sophisticated than this project's current v2.1 implementation (`colors[0]` always = background, no accent at all) and directly fixes the Feature 7 white-logo bug by giving users an explicit way to choose a *visible* background. | MEDIUM | `scraper.ts` and the prompt already return up to 5 colors as a flat ranked array (`colors: string[]`) — the data exists. New work: (a) UI swatch grid where user picks 2 roles from the palette (could also allow a manual hex override / "pick custom color" escape hatch since auto-extracted palettes are sometimes irrelevant, e.g. picked up a CSS framework's accent rather than true brand color); (b) extend `BrandingResult`/`business_branding` schema from `colors: string[]` to an explicit `{ background: string, accent: string }` selection persisted separately from the raw extracted list (raw list stays in `raw_analysis` for audit/regenerate); (c) `buildBrandingPreview()` and `DiagonaalKortti`/`CalloutCard` need a second color prop threaded through (today only `brandColor` singular is passed). Standard interaction model: tap/click first swatch → assign "Tausta", tap second → assign "Korostus", with a visual preview chip showing both colors together (often shown as a small two-tone pill or split swatch). |
| **Live preview while editing, with desktop split-view / mobile toggle (Feature 8)** | This is the strongest differentiator of the 8 — Airbnb's listing editor and Squarespace's site editor are the closest reference patterns, both showing real-time updates as the user types/uploads, specifically to reduce "I'll find out what it looks like at the end" anxiety. Currently this wizard ONLY shows a preview at step 6, which is the single biggest UX gap relative to category leaders. | HIGH | This is the most invasive feature for the *existing component architecture*: every Step component (`StepMediat`, `StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`) currently manages local form state independently and only persists to Supabase on "Next"/"Save" — there's no shared/lifted state that a sibling preview pane could read from while a step is still being edited. Implementing this requires either (a) lifting ALL step form state up into `WizardInner` (a large refactor touching 4 step components + draft-loading logic), or (b) each step emitting an `onChange` callback (not just `onNext`) that WizardInner uses to update a shared "live draft" object the preview pane reads — less invasive than (a) but still touches every step's internals. Desktop: two-column layout (edit form left/right, preview right/left) replacing the current single-centered-column `max-w-xl` step layout — a layout change for the whole wizard shell, not just step 6. Mobile: a toggle/tab control (segmented control "Muokkaa / Esikatselu") swapping which pane is visible, consistent with `AnimatePresence` crossfade patterns already used elsewhere in the app (per CLAUDE.md animation principles — no y-movement, opacity-only crossfade). **Recommend scoping this as its own phase, last, after Features 1–7 stabilize the preview component and color/logo model it needs to render live.** |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| **Full recursive site crawl (>1 link depth, sitemap.xml ingestion, unlimited pages)** | "Better scraping" (Feature 3) could be over-interpreted as "crawl the whole site like a search engine" to maximize data found. | Massively increases SSRF/cost/latency risk on a server that already has a documented Hobby-tier 10s `waitUntil` cap; most small Finnish venue sites have <10 pages total, so diminishing returns are immediate; widens prompt-injection attack surface (more attacker-controllable HTML reaching the Claude prompt) per existing `CR-03`/`CR-04`/`WR-02` mitigations already in this codebase. | Cap at homepage + N (3–5) same-origin links matched by keyword heuristics (hinnasto/hinnat, aukioloajat/aukiolo, yhteystiedot/yhteys/contact) found in the homepage's own nav/footer links — bounded, predictable cost, addresses the actual user need (subpages, not the whole site). |
| **Auto-applying full extracted palette (5 colors) across the entire site theme** | "Let users use the brand colors everywhere" sounds appealing as a natural extension of Feature 6. | This project has a fixed glassmorphism design system (CLAUDE.md: `.glass`, fixed neutral palette, sport-type colors in `lib/lajit.ts`) — applying arbitrary scraped colors site-wide would conflict with brand consistency rules already established and risks accessibility (contrast) issues outside the narrow, already-YIQ-checked DiagonaalKortti/CalloutCard usage. | Keep 2-color selection scoped to the venue's own card/preview components only (current pattern), not the wizard chrome or rest of the app. |
| **Real-time live preview implemented via continuous Supabase writes on every keystroke** | "Live" could be naively implemented as "save to DB on every onChange" to keep the preview and persisted draft always in sync. | Hammers the DB with writes on every keystroke (price input, hours input), risking rate limits/cost and race conditions with the existing debounced/explicit-save pattern already used by `StepHinnasto`/`StepAukioloajat`; also reintroduces the same kind of TOCTOU concern flagged elsewhere in this project's history (`WR-03`: TOCTOU approve). | Keep persistence on explicit Next/Save as today; live preview reads from **local component state** (or a lifted in-memory draft object), not from a round-tripped Supabase read — DB writes stay exactly as frequent as they are now. |
| **Letting Claude pick colors AND logo AND crop/recolor images automatically with no extracted-candidate transparency** | Tempting to "let the AI just decide" to minimize new UI work for Features 5–6. | Directly contradicts the stated v2.2 goal (user sees/approves results in real time with less manual work, but also more control) and is the literal current behavior (auto-pick) that targets 5 and 6 exist specifically to replace. Continuing single auto-pick is the status quo being fixed, not a feature. | Multi-candidate picker UIs as scoped in Features 5 and 6, with AI's top pick pre-selected as the default (best of both: zero-click for users who trust the AI, override available for ones who don't). |

## Feature Dependencies

```
StepPaikka-before-URL-analysis (Feature 2A)
    └──requires──> business_branding scoped to paikka_id, not just business_account_id
                       └──affects──> Quick-accept path (Feature 2B) — needs paikka_id to exist before analysis starts
                       └──affects──> Multi-page scraping (Feature 3) — venue laji/city context can improve subpage heuristics

Quick-accept path (Feature 2B)
    └──requires──> StepPaikka-before-URL-analysis (Feature 2A) — paikka_id must exist first
    └──requires──> Multi-logo selection (Feature 5) OR an explicit decision to skip logo confirmation in quick-accept
    └──requires──> 2-color selection (Feature 6) OR an explicit decision to skip color confirmation in quick-accept
    └──requires──> /api/business/onboarding/submit to accept partial/AI-only drafts

Multi-page scraping (Feature 3)
    └──enhances──> Image discovery (Feature 4) — following subpages surfaces more candidate photos (e.g. gallery pages)
    └──enhances──> Multi-logo selection (Feature 5) — more pages = more logo candidate sightings
    └──conflicts-risk──> existing SSRF/prompt-injection guards — every new followed URL must re-run the same hostname/private-IP checks as the seed URL

Multi-logo selection (Feature 5)
    └──requires──> scraper already returns logoBuffers[] (exists today) — needs all candidates uploaded, not just the chosen one
    └──helps-fix──> White/transparent logo bug (Feature 7) — letting user pick avoids picking an obviously-broken candidate, but doesn't fully fix contrast

2-color selection (Feature 6)
    └──requires──> scraper colors[] already exists — needs UI + schema change to store 2 roles instead of "colors[0] = bg"
    └──fixes──> White/transparent logo bug (Feature 7) — chosen background color becomes the logo's contrasting backdrop

White/transparent logo bug (Feature 7)
    └──blocks──> CalloutCard preview fix (Feature 1) looking correct for any venue with a white/transparent logo — must ship together or the new preview will visibly reproduce the same bug

CalloutCard preview fix (Feature 1)
    └──independent — no hard dependency on other features, but should land before Live preview (Feature 8) since Feature 8 will repeatedly re-render whichever preview component is chosen

Live preview while editing (Feature 8)
    └──requires──> CalloutCard preview fix (Feature 1) — must render the correct component before making it "live"
    └──requires──> 2-color selection (Feature 6) + Multi-logo selection (Feature 5) state shape finalized — live preview needs a stable shape to read from for logo/colors, not the old single-logo/single-color shape
    └──requires──> lifting form state out of each Step component (StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot) into a shared draft object WizardInner/page can pass to a preview pane
```

### Dependency Notes

- **Feature 2A (StepPaikka reorder) requires a `business_branding` schema/key change:** today `business_branding` has one row per `business_account_id` (UPSERT `onConflict: 'business_account_id'`). If a business owns multiple venues (already supported via `business_paikka_links`), reordering so Paikka comes first and ties analysis to a specific venue likely means re-keying this table to `paikka_id` (or a composite key). This is a migration + RLS policy change, not just a UI reorder — flag for its own implementation step.
- **Feature 2B (quick-accept) requires 2A first:** the quick-accept CTA needs a resolved `paikka_id` to write hinnasto/aukioloajat/yhteystiedot into `onboarding_draft` and to call `/api/business/onboarding/submit`. It cannot exist before the reorder lands.
- **Feature 3 (multi-page scraping) is the highest security-review-risk item:** the existing SSRF guard (private-IP blocklist, protocol check) in `route.ts` only runs once, on the user-submitted seed URL. Every link discovered and followed on the homepage must pass through the *same* guard before fetching — Claude-suggested or HTML-extracted URLs are attacker-influenceable input (the existing `WR-02` "only trust Claude's URL if same hostname" pattern is the right model to replicate here).
- **Feature 5 (multi-logo) and Feature 6 (2-color) both change persisted data shape**, which Feature 8 (live preview) then depends on. Sequencing these before Feature 8 avoids building the live-preview data plumbing twice.
- **Feature 7 (white logo bug) is cheapest to fix as a standalone CSS/contrast change** (checkerboard or neutral backdrop on logo thumbnails) but is *more completely* solved once Feature 6 exists (use the user-chosen background color as the logo's preview backdrop, matching what it will look like in the live card).
- **Feature 8 (live preview) is correctly the most complex and should be sequenced last** — it depends on the final shape of every other feature's output (correct preview component, fixed logo contrast, 2-color model, multi-logo selection) and requires the largest structural refactor (lifting state out of 4 step components).

## MVP Definition

### Launch With (v2.2 core)

Minimum set that delivers the milestone's stated goal ("AI analysis produces better data via broader site search, user sees/approves results in real time, with less manual work") without requiring the full live-preview refactor:

- [ ] **Feature 1 — CalloutCard preview fix** — cheap, fixes a visibly broken/wrong preview; should not ship another milestone with the wrong component showing
- [ ] **Feature 7 — White/transparent logo contrast fix** — small, visible bug; cheap relative to value once Feature 6's color model exists (sequence after Feature 6, or ship a quick backdrop-only fix first if Feature 6 slips)
- [ ] **Feature 3 — Multi-page scraping (homepage + N same-origin subpages)** — this is the actual "better data" half of the milestone goal; bounded scope (3–5 pages, keyword-matched links) keeps cost/risk manageable
- [ ] **Feature 5 — Multi-logo selection** — raw candidates already exist in the pipeline (`logoBuffers`); mostly a UI + upload-all-candidates change, high value-to-effort ratio
- [ ] **Feature 6 — 2-color selection** — raw palette already exists in the pipeline (`colors[]`); mostly a UI + schema change, also high value-to-effort ratio and unblocks Feature 7's proper fix

### Add After Validation (v2.x)

- [ ] **Feature 4 — Image discovery for Mediat gallery** — natural follow-on once Feature 3's multi-page fetch exists (more pages = more candidate photos found), but adds Storage cost and background-job duration risk — validate Feature 3's latency/cost first
- [ ] **Feature 2 (A+B) — Flow reorder + quick-accept** — valuable but the most architecturally invasive (schema re-key); worth its own focused phase once the data the quick-accept path would submit (logo, colors, subpages) is stable from Features 3/5/6

### Future Consideration (v3+)

- [ ] **Feature 8 — Live preview with desktop split/mobile toggle** — explicitly the highest-complexity item; depends on every other feature's final data shape being settled, and requires lifting state out of 4 step components plus a wizard-shell layout change. Defer until Features 1, 3, 5, 6, 7 have shipped and stabilized the preview data model; building live preview against a still-changing data shape means rework.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 1. CalloutCard preview fix | MEDIUM | LOW | P1 |
| 2A. StepPaikka before URL analysis | MEDIUM | MEDIUM | P2 |
| 2B. Quick-accept to admin queue | HIGH | MEDIUM | P2 |
| 3. Multi-page scraping | HIGH | MEDIUM | P1 |
| 4. Image discovery for Mediat | MEDIUM | MEDIUM | P2 |
| 5. Multi-logo selection | HIGH | MEDIUM | P1 |
| 6. 2-color selection | HIGH | MEDIUM | P1 |
| 7. White/transparent logo bug fix | MEDIUM | LOW | P1 |
| 8. Live preview (split/toggle) | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.2 — delivers the stated milestone goal (better data, real-time approve, less manual work) at acceptable cost
- P2: Should have, sequence into v2.2 if P1 lands cleanly, otherwise v2.3
- P3: Nice to have, defer to its own milestone — highest complexity, depends on P1/P2 data shapes settling first

## Competitor Feature Analysis

| Feature | Wix ADI / Squarespace Blueprint | Brandfetch-style brand-kit extractors | Our Approach |
|---------|----------------------------------|----------------------------------------|--------------|
| Logo extraction | AI-generated or single best-guess logo suggestion from a brief, not scraped from an existing site (different use case — building a new site, not importing an existing one) | Extracts and lists ALL logo variants found (favicon, wordmark, icon) and lets user pick/download any | Already scrapes multiple candidates (`logoBuffers`); v2.2 adds the missing picker UI to match the brand-kit-extractor pattern (Feature 5) |
| Color palette | Presents a small set of curated palette options matched to a style/mood the user selects; live preview updates as palettes are swapped | Extracts a ranked list of hex colors found in CSS/meta tags with no role assignment | v2.2's 2-color picker is closer to the brand-kit-extractor model (raw extracted palette) but adds Wix/Squarespace's "live preview as you pick" sensibility by assigning explicit roles (bg/accent) rather than just listing colors |
| Subpage crawling | Wix ADI ingests an existing Facebook/website link and crawls multiple pages of the source to build site content — multi-page is the norm, not the exception, for this category | N/A (most brand-kit tools are single-page extractors) | v2.2's Feature 3 brings this project in line with the AI-website-builder norm (Wix/Squarespace), bounded to a few same-origin pages rather than full-site ingestion |
| Live preview while editing | Core differentiator of both Wix ADI and Squarespace Blueprint — every selection (palette, layout, copy) updates a visible preview immediately | N/A — brand-kit extractors are one-shot exports, not editing tools | Feature 8 directly targets parity with this pattern but is correctly scoped as the largest, last-sequenced piece of work given this project's current step-isolated form architecture |

## Sources

- Codebase analysis (HIGH confidence): `app/business/WizardInner.tsx`, `app/business/onboarding/{StepPaikka,StepMediat,StepEsikatselu,AnalysoiSivusto}.tsx`, `app/api/business/analyze-website/route.ts`, `lib/branding/{scraper,analyzer,brandingResult,prompt}.ts`, `.planning/PROJECT.md` (v2.1 shipped summary + v2.2 target list)
- [Brand Kit Extractor — Chrome Web Store](https://chromewebstore.google.com/detail/brand-kit-extractor/mcegfbolimgfafdlblnnfkpfjdohccad) — MEDIUM confidence, ecosystem pattern for one-click brand asset extraction
- [Brandfetch — Chrome Web Store](https://chromewebstore.google.com/detail/brandfetch/ecbhicmbbeeckcmhgoaiemddbfcgphhj?hl=en) — MEDIUM confidence, multi-logo/color/font extraction pattern reference
- [Branding Capture — Chrome Web Store](https://chromewebstore.google.com/detail/branding-capture/lkgghfingfogkbogcgkmhahbdneikafd) — MEDIUM confidence, color extraction/categorization pattern
- Wix AI Logo Maker review (websitebuilderexpert.com) — MEDIUM confidence, color-suggestion + multi-option pattern
- Wix vs Squarespace AI builder comparison (lokuma.ai) — MEDIUM confidence, "live preview updates as user picks options" pattern (Squarespace Blueprint)
- [Is there a scraper that can navigate subpages and find all links for me? — Firecrawl Glossary](https://www.firecrawl.dev/glossary/web-crawling-apis/scraper-to-navigate-subpages-find-all-links) — MEDIUM confidence, crawl-boundary best practices (depth limit, URL pattern matching, breadth-first for site-mapping)
- Pluralsight scraping best-practices guide — MEDIUM confidence, ethical/rate-limit crawling guidance
- Userguiding.com onboarding wizard examples (Airbnb/Upwork live-preview pattern) — MEDIUM confidence, live-preview-while-editing reference pattern

---
*Feature research for: AI-assisted business onboarding wizard, website-to-brand-kit extraction*
*Researched: 2026-06-16*
