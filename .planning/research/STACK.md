# Stack Research

**Domain:** Server-side website scraping enhancements (multi-page crawl, image gallery extraction) + live two-pane preview UI for a multi-step onboarding wizard
**Researched:** 2026-06-16
**Confidence:** HIGH (Cheerio, Framer Motion, Sharp all verified via Context7/official docs; concurrency-control decision verified against project's existing tsconfig)

## Context: What Already Exists (do not re-architect)

This is an **additive** milestone on top of a working v2.1 pipeline:

- `lib/branding/scraper.ts` — `fetch`-only HTML scraping, regex-based extraction (no DOM parser currently), SSRF guard already in `route.ts`, 5MB response cap, 10s/5s `AbortSignal.timeout`
- `lib/branding/analyzer.ts` + `lib/branding/prompt.ts` — ONE Claude Haiku call combining vision (logo PNGs) + text (HTML snippet, 8000 chars) → structured JSON (`logo_index`, `logo_type`, `colors[]` up to 5, `prices[]`, `opening_hours[]`, `website_url`)
- `colors: string[]` already returns **up to 5 hex colors** extracted from `<meta theme-color>` + CSS `:root` vars — the "2-color palette selection" requirement is a **UI-only** change (user picks 2 of the existing N swatches), **not a new color-extraction capability**
- `sharp` already converts arbitrary image formats (SVG/AVIF/WebP) to PNG for Claude vision input
- `app/business/WizardInner.tsx` — single component, `mode: 'onboarding' | 'edit'`, plain `useState`/`useEffect`, no form library, no global state library
- Vercel Hobby `waitUntil` 10-second background-execution ceiling is a known, accepted constraint (documented in `route.ts` comments) — **multi-page crawling must respect this budget**

Given this, the stack additions below are deliberately minimal.

## Recommended Stack

### Core Technologies (new)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `cheerio` | `^1.2.0` | Parse HTML on subpages to extract `<a href>` links and `<img>` candidates (logo + gallery) | The current scraper uses hand-rolled regex for a handful of fixed patterns (favicon, og:image, theme-color). That approach does not scale to "find all internal links" or "find all content images, excluding logos/icons/nav assets" — regex-based link/attribute extraction on arbitrary real-world HTML is fragile (nested quotes, self-closing variations, attribute order) and was already showing strain (CR-05 lastIndex bug in the existing regex loop). Cheerio gives a real DOM + CSS-selector + jQuery-like `.attr()`/`.each()` API, pure JS (no native binary, no Edge Runtime conflict — same `runtime = 'nodejs'` constraint as `sharp` already requires), tiny footprint (the route already pulls in `sharp`, this adds negligible bundle weight), and is the de-facto standard for server-side HTML scraping in the Node ecosystem. It does NOT execute JS or render the page — it parses static HTML exactly like the current `fetch`-based pipeline already does, so the architecture is unchanged, just the parsing layer is upgraded from regex to a proper parser. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| *(none — no new runtime dependency for image gallery extraction)* | — | Extracting non-logo `<img>` candidates reuses Cheerio + the existing `toPngBase64`/fetch pattern in `scraper.ts` | Select `<img>` tags via `$('img')`, filter out ones already claimed as logo candidates (same URL), filter out tiny images (favicons/icons) by checking `width`/`height` attributes when present, cap to N (e.g. 8) candidates, resolve to absolute URL with `new URL(src, baseUrl)` exactly as the logo extraction already does |
| *(none — no concurrency-limiter library)* | — | Bounding parallel subpage/image fetches | The scale here is small and fixed (e.g. ≤4 extra subpages, ≤8 extra images) — use the same pattern already in `scraper.ts` (`Promise.all` over a `.slice()`-capped array with per-request `AbortSignal.timeout`). Adding `p-limit` (`^7.3.0`, pure ESM) is unnecessary complexity for a fixed small fan-out and the existing code already proves `Promise.all` + per-call timeout is the established idiom in this codebase. Revisit only if the page/image cap grows materially. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest (existing) | Unit tests for new crawler/extraction logic | `lib/branding/scraper.test.ts` already exists — extend it; mock `fetch` the same way for subpage crawl tests |

## Installation

```bash
# Core
npm install cheerio@^1.2.0

# No supporting libraries or dev dependencies needed beyond what's already installed
```

## What's Needed for Each Feature (a–d)

### (a) Multi-page crawling — same-origin link discovery with limits

**No new infra beyond Cheerio.** Implementation pattern, integrated into `lib/branding/scraper.ts`:

1. After fetching the homepage HTML (already done), parse it with `cheerio.load(html)` instead of (or alongside) the current regex logo/color extraction.
2. Extract `$('a[href]')`, resolve each to absolute URL via `new URL(href, baseUrl)`, filter to **same hostname** (`new URL(href).hostname === new URL(baseUrl).hostname`) — same-origin check the SSRF guard in `route.ts` already models.
3. Score/select candidate subpages by keyword match against the link's path/text (Finnish + English: `hinnasto|hinnat|price`, `aukiolo|tunnit|hours`, `yhteys|contact`) — this is plain string matching, no library needed.
4. Cap to **2–4 subpages max** (hard limit, not configurable by the response) to stay inside the 10s `waitUntil` budget already documented as a constraint.
5. Fetch each selected subpage with the **same** `fetch` + `AbortSignal.timeout(5000)` + 5MB-size-guard pattern already used for CSS files in `scraper.ts` — run them with `Promise.all` (bounded by the hard page cap, so no concurrency limiter needed).
6. Concatenate/label each subpage's stripped HTML snippet (reuse the existing comment/script/style-stripping regex) and pass labeled snippets into the Claude prompt (e.g. `--- Page: /hinnasto ---\n<snippet>`) so Claude can attribute extracted prices/hours to source pages if useful for debugging.
7. **Do not** introduce a crawl queue, sitemap parser, or `robots.txt` parser for this milestone — the brief is "follow homepage links to find a few specific subpages," not general-purpose crawling. Respect SSRF guard on every followed URL exactly as the homepage URL is checked today (same-origin filtering already makes this mostly moot, but re-validate each resolved URL through the same private-IP check before fetching, since a malicious homepage could link to a private-IP-resolving same-looking hostname).

**Why not Playwright/Puppeteer:** `playwright` is already a `devDependency` in this repo but is verified **unused in source** (search found it only in `package.json`/`package-lock.json`/a stale `TESTING.md` reference — Vitest is the actual active test runner per `package.json` scripts and `lib/branding/*.test.ts`). Do not promote it to a runtime dependency. A headless browser is unnecessary here — every target subpage (pricing, hours, contact) is typically server-rendered static HTML on small business sites, exactly the kind of content `fetch` already retrieves successfully for the homepage. Headless browsers add ~300MB+ deploy size, multi-second cold starts, and are flatly incompatible with the existing `waitUntil` 10-second Hobby-tier budget and the `runtime = 'nodejs'` Vercel function model already in place. If a future milestone discovers JS-rendered SPA target sites, that's a distinct, larger architectural decision — not an incremental addition here.

### (b) Extracting non-logo images reliably for a media gallery

Reuse Cheerio's `$('img')` traversal:

- Exclude any `src` already present in the logo-candidate list (string equality after URL resolution).
- Exclude tiny images: if `width`/`height` attributes are present and either is `<100`, skip (catches icons/spacers/tracking pixels).
- Exclude common non-content patterns by filename/class heuristics already proven useful for logo detection in reverse: skip if `src`/`alt`/`class` matches `icon|sprite|pixel|spinner|loader`.
- Resolve to absolute URL, dedupe, cap to a fixed number (e.g. 8) — same `.slice()` pattern as logo candidates.
- Fetch + `sharp`-convert each to PNG/WebP **only if needed for storage normalization** — note the existing pipeline only does this for logo candidates because they're sent to Claude vision. Gallery images do **not** need to go through Claude vision (no requirement to classify gallery photos), so they can be passed through as discovered URLs and copied directly into Supabase Storage (or referenced if already public) without a `sharp` round-trip, saving compute. Only convert if the original format is unsupported by `<img>` rendering (e.g. legacy `.bmp`) — rare enough to handle with the existing `toPngBase64` helper as a fallback, not a new dependency.

### (c) React pattern for two-pane live preview in Next.js 14 + Framer Motion

**Framer Motion (already installed, `^12.38.0`) is sufficient. No new library needed.** Verified via Context7 (`/grx7/framer-motion`) — note the upstream package was renamed `motion` (npm `motion`, import `motion/react`) in 2025, but `framer-motion` remains a maintained legacy-named alias and this project's CLAUDE.md/animation conventions are written against `framer-motion` imports already used throughout (`AnimatePresence`, `motion.div`, `whileHover`, `staggerChildren`). **Do not migrate the import path** in this milestone — that's an unrelated, unscoped rename with no functional benefit here.

The actual pattern needed is a **state-lifting** pattern, not a new animation or state-management library:

1. Lift form field state (or at minimum a derived "preview model" object: chosen logo URL, 2 selected colors, pricing rows, hours, contact info) up into `WizardInner` (already the shared parent across all 6 steps per the `mode: 'onboarding' | 'edit'` consolidation done in v1.9).
2. Each `Step*.tsx` component receives `value` + `onChange` props (or a single `onPreviewUpdate(partial)` callback) instead of owning fully isolated local state — this is a small refactor of the existing `useState`-per-step pattern, not an architecture change. (`StepHinnasto`, `StepMediat`, etc. already accept `initialDraft`/`initialPaikka` as props and call `onSaveSuccess` callbacks upward — extending this with a live "preview model" callback is consistent with the existing prop-drilling convention, no Context API or external store required given only 6 steps and one parent.)
3. Render `DiagonaalKortti` (already brand-color-aware with YIQ contrast, per v2.1) directly inside the preview pane, fed by the lifted state — this component already exists and already does exactly the rendering job needed; no new preview-renderer component required.
4. Desktop layout: CSS Grid/Flex two-column (`md:grid md:grid-cols-2`), no animation library involvement — this is pure Tailwind layout.
5. Mobile layout: toggle between edit/preview panes using the **same `AnimatePresence mode="wait"` crossfade pattern already mandated in CLAUDE.md** for lista/kartta view switches (`opacity`-only, `duration: 0.2`, stable `key` prop) — this is a direct reuse of an existing, documented animation convention, not a new pattern.
6. For the live update itself (preview re-rendering as the user types), this is just React re-render on lifted state change — no debouncing library needed at this form scale (a handful of text/select inputs), though a simple `useDeferredValue` (built into React 18, already in use) can be applied to the preview-feeding state if typing-induced re-renders of `DiagonaalKortti` ever feel janky. This is a built-in React 18 hook, not a new dependency.

**What NOT to add:** no Zustand/Jotai/Redux (6 steps, one parent component, prop-drilling is already the established and sufficient pattern per `WizardInner`/`Step*` props); no React Hook Form (the codebase has zero form-library usage today — every step uses raw `useState` for fields — introducing one now for live-preview alone would be inconsistent and unnecessary since the live-preview requirement is satisfied by lifting plain state).

### (d) Logo contrast / checkerboard backdrop for transparency visibility

**Pure CSS — no library.** This is a well-known pattern (same one Photoshop/Figma use for transparent layers):

```css
.logo-checkerboard-backdrop {
  background-image:
    linear-gradient(45deg, #80808022 25%, transparent 25%),
    linear-gradient(-45deg, #80808022 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #80808022 75%),
    linear-gradient(-45deg, transparent 75%, #80808022 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
```

Implementation notes specific to this project:
- Render the logo `<img>`/`<Image>` inside a small container with this checkerboard background, OR offer a light/dark toggle behind the logo (two solid swatches, e.g. `#ffffff` and `#111111` — the project's own foreground-primary token from CLAUDE.md) so the user can manually verify visibility against both extremes, in addition to the checkerboard which reveals transparency itself.
- Recommend **checkerboard as the default backdrop** (reveals transparency unambiguously) with a small toggle to preview against the *actual selected background color* (one of the 2 chosen palette colors from requirement 4) — this directly serves the bug being fixed (white logo invisible on white preview background) by letting the user see the logo against the real background color they picked, not just a generic white card.
- No new npm package — this is ~10 lines of CSS plus a boolean toggle state, consistent with the project's existing glassmorphism utility-class convention (`globals.css`) of defining reusable primitives there rather than inline styles. Add a `.checkerboard` utility class to `app/globals.css` alongside `.glass`/`.glass-hover` per existing convention.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Cheerio for HTML parsing | `node-html-parser` | Slightly faster/lighter for very simple selector needs, but lacks Cheerio's jQuery-style `.attr()`/`.each()`/manipulation ergonomics and has a smaller ecosystem; not worth the tradeoff for this use case |
| Cheerio for HTML parsing | `linkedom` | Closer to a full DOM (supports more DOM APIs), used when code needs `document.querySelector`-style APIs or is shared with browser code; this project has no such cross-environment requirement, so Cheerio's purpose-built scraping API is the better fit |
| Plain `Promise.all` + `.slice()` cap for fan-out fetches | `p-limit` (`^7.3.0`) | Use if the subpage/image cap grows beyond a small fixed number (e.g. dynamic discovery of 20+ pages) where uncontrolled parallel fetches could overwhelm the target server or blow the 10s budget — not needed at the 2–4 page / ≤8 image scale specified here |
| Lifted `useState` in `WizardInner` for live preview | React Hook Form + Context | Use if the wizard grows significantly more complex (cross-field validation, large dynamic field arrays) — at 6 fixed steps with simple field shapes, the overhead and inconsistency with the existing zero-form-library codebase isn't justified |
| CSS checkerboard backdrop | `react-checkerboard` / canvas-based pattern libraries | Never needed here — these exist for canvas/WebGL contexts (e.g. image editors with zoom/pan); a static CSS background covers this project's "preview a logo" use case completely |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Playwright / Puppeteer for crawling | Already a devDependency but unused in source; headless browsers add huge cold-start latency and deploy size, and are incompatible with the documented 10s `waitUntil` Hobby-tier budget that the multi-page crawl must still fit inside | `fetch` + Cheerio (static HTML parsing), exactly extending the existing `scraper.ts` approach |
| `p-limit`/`p-queue` for this milestone's fetch fan-out | Adds a pure-ESM dependency for a problem (bounding ~4 parallel fetches) the codebase already solves inline with `Promise.all` + per-call `AbortSignal.timeout` | Keep using the existing inline `Promise.all` pattern from `scraper.ts` |
| `node-vibrant` / `sharp-vibrant` (image-based color extraction) | The milestone's "2-color palette" requirement operates on the **already-extracted** `colors: string[]` (from HTML/CSS, by explicit prompt design — "Do NOT extract colors from images") — adding image-based palette extraction would contradict the existing, deliberate prompt instruction and pipeline design; it's also not asked for (the brief is "user picks 2 of the extracted colors," not "extract colors from images") | Reuse existing `colors[]` array from `analyzeWithClaude`; build a 2-of-N swatch picker UI only |
| Zustand/Redux/Jotai for live-preview state | No global/cross-route state-sharing need exists — the wizard is a single component tree (`WizardInner` → `Step*`) already using lifted props successfully | Lift preview-relevant state into `WizardInner`, pass down via props |
| react-hook-form (for this milestone specifically) | Zero existing usage in the codebase; introducing it only for live-preview would create an inconsistent two-pattern codebase (some steps raw `useState`, others RHF) for no functional gain — live preview only needs state lifting, not validation/schema features | Keep raw `useState` lifted to the parent, same as the rest of the wizard |
| `framer-motion` → `motion` package rename | Out of scope; the rename is cosmetic (same API, new import path `motion/react`) and every existing component/CLAUDE.md convention in this repo is written against `framer-motion` — migrating mid-milestone for an unrelated feature set adds churn with zero benefit | Continue using `framer-motion@^12.38.0` exactly as already installed |

## Stack Patterns by Variant

**If subpage discovery via link-text keyword matching finds zero confident matches (e.g. a single-page site with no separate pricing/hours pages):**
- Fall back to homepage-only analysis exactly as today — this is not a regression, it's the existing v2.1 behavior preserved as a fallback path.
- Because: the milestone goal is "better data when subpages exist," not "force a crawl" — Claude's existing single-call analysis of the homepage alone remains a fully valid result.

**If a discovered subpage fails to fetch (timeout, 404, non-HTML content-type):**
- Skip it silently (same `try/catch`-and-continue idiom already used for logo-candidate fetches in `scraper.ts`) and proceed with whatever subpages did succeed, even if that's zero.
- Because: one flaky subpage must never fail the entire analysis — this mirrors the existing per-candidate error handling philosophy already in the codebase.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `cheerio@^1.2.0` | Next.js 14.2.35, Node.js runtime (`runtime = 'nodejs'`) | Pure JS, no native bindings — safe alongside `sharp` (native) in the same Node.js-runtime-only API route; do not import in any file reachable by the Edge Runtime |
| `cheerio@^1.2.0` | TypeScript 5.x strict mode | Ships its own types; `import * as cheerio from 'cheerio'` per current ESM-first API (v1.x's documented API surface, confirmed via Context7 docs example) |
| `framer-motion@^12.38.0` (existing, unchanged) | React 18, Next.js 14 App Router | No version bump needed for this milestone's two-pane preview work; `AnimatePresence`/`motion.div` patterns already proven in this codebase (Kartta/Lista crossfade) directly reusable |

## Sources

- Context7 `/cheeriojs/cheerio` — load/selecting/attribute-extraction API confirmed current (`cheerio.load`, `.attr()`, `$.extract()`)
- Context7 `/grx7/framer-motion` — confirmed `AnimatePresence`/layout animation API surface unchanged from what's already used in this codebase
- WebSearch, verified against npm — Cheerio latest `1.2.0` (Jan 2026 release) — MEDIUM-HIGH confidence (single search source, but corroborated by Context7 docs reflecting the same v1.x API)
- WebSearch — Framer Motion → Motion rename (2025, package `motion`, import `motion/react`) — MEDIUM confidence (multiple corroborating sources: motion.dev official upgrade guide, npm); decision to NOT migrate is a project-fit judgment, not a contested fact
- WebSearch — `p-limit@7.3.0`, pure ESM — MEDIUM confidence (npm package page); decision to avoid it is based on direct codebase inspection (`tsconfig.json` `moduleResolution: bundler` would support it technically, but it's unneeded complexity at this fan-out scale)
- Direct codebase inspection (HIGH confidence, no external source needed): `lib/branding/scraper.ts`, `lib/branding/analyzer.ts`, `lib/branding/prompt.ts`, `app/api/business/analyze-website/route.ts`, `app/business/WizardInner.tsx`, `app/business/onboarding/StepMediat.tsx`, `app/business/onboarding/StepEsikatselu.tsx`, `package.json`, `tsconfig.json` — confirmed existing pipeline shape, confirmed Playwright is an unused devDependency, confirmed `colors[]` already extracts up to 5 HTML/CSS-sourced hex values, confirmed zero form-library usage, confirmed `bundler` module resolution

---
*Stack research for: Onboarding-AI scraping/preview enhancements (v2.2 milestone)*
*Researched: 2026-06-16*
