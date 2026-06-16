# Phase 47: Skeema & monisivuinen scraper-putki - Research

**Researched:** 2026-06-16
**Domain:** Server-side multi-page web scraping (SSRF-hardened), Vercel serverless background pipelines, headless Chromium on serverless, Postgres/Supabase schema migration
**Confidence:** HIGH (codebase patterns, Vercel limits, package registry data all verified; a few items LOW pending user/ops confirmation — see Assumptions Log)

## Summary

This phase extends an already-working v2.1 scraper → analyzer → route pipeline (`lib/branding/scraper.ts`, `lib/branding/analyzer.ts`, `app/api/business/analyze-website/route.ts`) rather than building anything from scratch. The work splits into three independent tracks that the planner can parallelize across waves: (1) multi-page crawling with re-validated SSRF guards and a manual-redirect-following fetch wrapper, (2) one narrowly-scoped headless-browser capability (homepage screenshot only, via Playwright + `@sparticuz/chromium`) gated on a Vercel plan upgrade that is an out-of-band human action, and (3) additive schema changes to `business_branding` plus a composite-key re-keying migration that has direct precedent already in this codebase (`onboarding_draft`'s `UNIQUE(business_account_id, paikka_id)`).

Two facts materially change the phase's scope versus what CONTEXT.md assumes. First, **BRDDB-04 (the `logo_type` CHECK constraint fix) is already shipped** — migration `20260615000002_fix_logo_type_constraint.sql` (commit `c28cdcb`) already updated the constraint to `('wordmark', 'icon', 'combination', 'unknown')`, matching the analyzer's real enum. The planner should verify this is genuinely a no-op for BRDDB-04 rather than re-doing it. Second, **CONTEXT.md's D-03–D-05 (Playwright for homepage screenshot) directly contradicts this project's own prior milestone-level research** (`.planning/research/STACK.md`), which explicitly recommended against any headless browser and explained why `fetch`+regex (not even cheerio) was sufficient. CONTEXT.md is the authoritative, later decision (made deliberately to supersede that stance for this one narrow case) — the planner should follow CONTEXT.md, but should NOT pull in cheerio for HTML parsing in this phase; CONTEXT.md's `<code_context>` section explicitly says to continue the existing regex pattern, not introduce a DOM parser.

**Primary recommendation:** Build the multi-page crawl, SSRF re-validation, and schema changes as fully independent, regex-based extensions of the existing pipeline (no new parsing dependency); treat the Playwright/`@sparticuz/chromium` screenshot capability as a separately-gated, optionally-skippable feature behind a Vercel-Pro-only code path, since the Vercel plan upgrade is a human prerequisite the implementation cannot satisfy itself.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Same-origin subpage discovery & crawl | API / Backend (`lib/branding/scraper.ts`) | — | Pure server-side HTTP fetch + regex parsing, no client involvement |
| SSRF re-validation on every link/redirect | API / Backend (new `lib/branding/ssrfGuard.ts`) | — | Security boundary must live server-side, shared between entry-URL check and subpage/redirect checks |
| Homepage screenshot capture | API / Backend (background `waitUntil` worker) | — | Headless Chromium only runs in a Node.js serverless function; never client-side |
| Multi-page labeled prompt construction | API / Backend (`lib/branding/analyzer.ts`) | — | Claude API call happens server-side only (API key never exposed to client) |
| Gallery image extraction & noise filtering | API / Backend (`lib/branding/scraper.ts`) | — | Same fetch+regex pipeline as logo extraction |
| `business_branding` schema (columns, constraints, keys) | Database / Storage | API / Backend (UPSERT scoping) | Schema lives in Postgres; backend code must be updated in lockstep once columns/keys change |
| `paikka_id` scoping of analyze-website route | API / Backend | — | Request param handling + UPSERT `onConflict` target, no client logic change beyond passing the param |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Color/logo analysis prompt (supersedes v2.1 prompt)**
- D-01: Adopt the user-authored replacement `BRANDING_ANALYSIS_PROMPT` verbatim — `logos` becomes an array, `colors` becomes `{hex, role}[]`, `prices`/`opening_hours` gain `source_page`, explicit "only use content belonging to this company" instruction.
- D-02: Claude's input now includes a full-page screenshot of the homepage in addition to labeled multi-page HTML and logo candidate images, to improve color extraction beyond CSS/meta-tag regex.

**Homepage screenshot capture (new capability — supersedes REQUIREMENTS.md "Out of Scope: headless browser")**
- D-03: Capture a screenshot of the homepage ONLY using self-hosted Playwright + `@sparticuz/chromium` within the existing `waitUntil` pipeline.
- D-04: Requires the user to upgrade Vercel Hobby → Pro. This is an out-of-band account action — not something the implementation can do. Planner/executor must flag as a deployment prerequisite, not work around in code.
- D-05: Original "Out of Scope" Playwright line is superseded only for this narrow case (homepage screenshot only). Full multi-page screenshot capture remains out of scope.

**Subpage discovery**
- D-06: Select subpages via keyword matching (Finnish + English: hinnasto/hinnat/pricing, aukioloajat/hours, yhteystiedot/contact/yhteys). Fall back to first-N same-origin links if no keyword matches.
- D-07: Capped at 3-5 total pages crawled (homepage + up to 4 subpages).

**SSRF re-validation & redirects**
- D-08: Extract the existing inline SSRF check (currently in `route.ts` POST handler, lines 103-133) into a shared exported validator (e.g. `lib/branding/ssrfGuard.ts`).
- D-09: Call this validator on every subpage link before fetching, not just the entry URL.
- D-10: Switch all fetches to `redirect: 'manual'`, manually re-validating each redirect's `Location` header against the same validator before following. Cap at 2 redirect hops; abandon if exceeded.

**Gallery image extraction (SCRAP-09)**
- D-11: Extract general `<img>` tags beyond logo-candidate detection for `image_urls`. Filter noise via dimension/size heuristics. Cap stored count at a reasonable gallery size (planner picks exact number, e.g. 10-15).

**Schema (BRDDB-03/04/05)**
- D-12: `business_branding` gains `logo_candidates` (jsonb array), `image_urls` (jsonb array of strings), `selected_background_color` (text, nullable), `selected_accent_color` (text, nullable).
- D-13: Fix `logo_type` CHECK constraint to match analyzer's real enum `'wordmark' | 'icon' | 'combination' | 'unknown'`. **[RESEARCH FINDING: this is already done — see Open Questions / Don't Hand-Roll below. CONTEXT.md's premise that the constraint still allows the old values is stale.]**
- D-14: Re-key `UNIQUE(business_account_id)` to `UNIQUE(business_account_id, paikka_id)`, adding `paikka_id` column with FK to `liikuntapaikat`.
- D-15: Migration backfill: for each existing row, look up `business_account_id`'s `business_paikka_links` and backfill `paikka_id` from the first/only linked venue. Accepted tradeoff: pre-Phase-47 data was already conflated across venues.
- D-16: All downstream code querying/writing `business_branding` by `business_account_id` alone must be updated to scope by `(business_account_id, paikka_id)`. `analyze-website` route needs to accept/receive `paikka_id`.

### Claude's Discretion
- Exact gallery image count cap (D-11).
- Exact dimension/size thresholds for filtering noise images out of gallery extraction.
- Whether `paikka_id` is passed to `analyze-website` route via request body or query param — follow whichever existing convention is more consistent with sibling business routes.

### Deferred Ideas (OUT OF SCOPE)
- Frontend consumption of the new array-based `logos`/`colors` shape (multi-candidate picker UI) — Phase 48 scope (ONBOARD-14, ONBOARD-15).
- `selected_background_color`/`selected_accent_color` being populated by user choice — Phase 48 scope; this phase only adds the columns.
- Full multi-page screenshot capture (all 3-5 crawled pages) — scoped down to homepage-only per D-03.
- Re-running analysis for existing approved businesses after the BRDDB-05 migration — not required; backfill preserves existing data without forcing re-analysis.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRAP-06 | Scraper follows same-origin links from homepage to pricing/hours/contact subpages (capped 3-5 pages) | See "Subpage Discovery & Crawl Pattern" below; keyword-match + same-origin filter, reuse existing `Promise.all`+`AbortSignal.timeout` idiom |
| SCRAP-07 | Every followed link and fetch redirect re-validated against SSRF guard before fetching | See "SSRF Re-validation & Manual Redirect Following" — concrete `redirect: 'manual'` code pattern below |
| SCRAP-08 | Claude prompt receives labeled multi-page content with per-page truncation budgets, not one flat 8000-char slice | See "Code Examples — Labeled Multi-Page Prompt Assembly"; budget math against Claude Haiku context and `max_tokens` |
| SCRAP-09 | Scraper extracts general page images (not just logo candidates) for gallery prefill | See "Gallery Image Noise-Filtering Heuristics" — regex-based (not cheerio) width/extension/data-URI heuristics |
| BRDDB-03 | `business_branding` gains `logo_candidates`, `image_urls`, `selected_background_color`, `selected_accent_color` columns | See "Schema Migration Patterns" — additive jsonb/text columns, same pattern as existing `colors` column |
| BRDDB-04 | `logo_type` CHECK constraint fixed to match analyzer's actual enum values | **Already shipped** in `20260615000002_fix_logo_type_constraint.sql` — see "Don't Hand-Roll" / Open Questions; planner must verify-not-reimplement |
| BRDDB-05 | Unique constraint re-keyed to include `paikka_id` (fixes silent multi-venue overwrite) | See "Schema Migration Patterns" — exact precedent: `onboarding_draft_unique_business_paikka` in `20260606000000_onboarding.sql` |

## Project Constraints (from CLAUDE.md)

CLAUDE.md's directives relevant to this phase (backend-only, no UI):
- Supabase writes: service role key only; anon key is read-only after RLS — already followed via `supabaseAdmin` throughout `route.ts`; no change needed.
- No new directives in CLAUDE.md govern scraping/SSRF/migrations specifically — CLAUDE.md is primarily a frontend design-system guide (colors, typography, animation, card structure) which this backend-only phase does not touch. No conflicts identified.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `playwright-core` | `1.61.0` [VERIFIED: npm registry — `npm view playwright-core version`] | Headless Chromium driver for homepage screenshot only (D-03) | `playwright-core` (not full `playwright`) excludes bundled browser binaries — required to keep function bundle under Vercel's 250MB uncompressed limit when paired with `@sparticuz/chromium`'s separately-shipped binary |
| `@sparticuz/chromium` | `149.0.0` [VERIFIED: npm registry — `npm view @sparticuz/chromium version`] | Serverless-optimized Chromium binary (~130MB uncompressed, ~33MB Brotli-compressed) with `executablePath()` for Playwright/Puppeteer | De-facto standard for running Chromium inside AWS-Lambda-shaped serverless functions (Vercel Node.js functions run on Lambda); avoids the ~280MB+ size of a standard Playwright-bundled Chromium [CITED: github.com/Sparticuz/chromium] |

**Note on existing devDependency:** `playwright` `^1.60.0` is already a devDependency in `package.json` (used for... nothing currently — `.planning/research/STACK.md` confirms it is unused in source). Registry latest is `1.61.0`. The planner should decide whether to (a) bump `playwright` and add `playwright-core` (redundant — `playwright` already includes `playwright-core` as a dependency), or (b) add `playwright-core` as its own explicit production dependency and leave the existing `playwright` devDependency alone (cleaner separation: full `playwright` stays dev/test-only, `playwright-core` becomes the production runtime import). Option (b) is recommended — do not import `playwright` (the full package) into the production background-pipeline code, only `playwright-core`.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| *(none new)* | — | Subpage link discovery, image extraction, redirect handling all reuse existing `fetch`/regex/`URL` primitives already in `lib/branding/scraper.ts` | Per CONTEXT.md `<code_context>`: continue the regex pattern; do not introduce cheerio or any DOM parser in this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `playwright-core` + `@sparticuz/chromium` | `puppeteer-core` + `@sparticuz/chromium` | Puppeteer is equally supported by `@sparticuz/chromium`'s docs (its primary documented example is actually Puppeteer, not Playwright); Playwright is the right choice here only because the project's existing devDependency is Playwright-flavored (test conventions, `playwright.config` if any) — no functional reason to prefer one over the other for a single `goto()`+`screenshot()` call |
| Regex-based `<img>`/link extraction (locked by CONTEXT.md) | `cheerio` DOM parsing | Project's own `.planning/research/STACK.md` recommended cheerio for exactly this reason (regex fragility on nested quotes/attribute order), but CONTEXT.md explicitly overrides this for Phase 47 to avoid introducing a new dependency mid-pipeline-rewrite — planner must follow CONTEXT.md, not STACK.md, for this phase |

**Installation:**
```bash
npm install playwright-core@1.61.0 @sparticuz/chromium@149.0.0
```

**Version verification:** Confirmed via `npm view <package> version` against the live npm registry on 2026-06-16. Both packages also passed `slopcheck install <pkg>` ([OK] verdict — see Package Legitimacy Audit below).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|--------------|-----------|-------------|
| `@sparticuz/chromium` | npm | ~3.7 yrs (created 2022-09-27) | high (de-facto standard for serverless Chromium; exact weekly count not queried) | github.com/Sparticuz/chromium | [OK] | Approved |
| `playwright-core` | npm | ~6.4 yrs (created 2020-01-17) | very high (sub-package of Microsoft's official Playwright) | github.com/microsoft/playwright | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Both packages passed `slopcheck install @sparticuz/chromium playwright-core`, which queries npm metadata directly (no local `npm install` was executed — the underlying `npm install` subprocess step in slopcheck's CLI failed in this Windows/Git-Bash environment after the scan already completed and printed `[OK]` for both packages; the scan result itself is unaffected). No `postinstall` scripts were found on either package (`npm view <pkg> scripts.postinstall` returned empty for both). Both have long-established, well-known official GitHub source repositories — these are package-name-discovery-via-training-data candidates that ARE independently verifiable against an authoritative source (Sparticuz's own GitHub README, Microsoft's Playwright monorepo), so they are tagged `[VERIFIED: npm registry]` per the provenance rule, not `[ASSUMED]`.

## Architecture Patterns

### System Architecture Diagram

```
POST /api/business/analyze-website { url, paikka_id }
        │
        ▼
  [JWT verify] → [SSRF guard: entry URL] → [ownership: business_paikka_links has (user, paikka_id)?]
        │
        ▼
  UPSERT business_branding (business_account_id, paikka_id) status='analyzing'  ──► response sent to client
        │
        ▼ waitUntil() background continues independently of the HTTP response
        │
  ┌─────┴──────────────────────────────────────────────────────────┐
  │ runAnalysis(url, businessAccountId, paikkaId)                    │
  │                                                                   │
  │  1. fetchWithRedirectGuard(homepageUrl)  ──► SSRF-revalidate each │
  │     redirect hop (max 2), abandon if exceeded                    │
  │                                                                   │
  │  2. scrapeWebsite(homepageHtml)                                  │
  │       ├─ extract logo candidates (existing regex)                │
  │       ├─ extract gallery <img> candidates (NEW — noise-filtered) │
  │       ├─ extract same-origin <a href> links (NEW — regex)        │
  │       └─ keyword-match links → {pricing?, hours?, contact?} URLs │
  │                         │                                         │
  │                         ▼ (each link re-validated via SSRF guard) │
  │  3. Promise.all([fetch subpage 1..4 via fetchWithRedirectGuard])  │
  │       └─ skip silently on timeout/404/non-HTML (existing idiom)  │
  │                                                                   │
  │  4. [Vercel Pro only] captureHomepageScreenshot(homepageUrl)      │
  │       via playwright-core + @sparticuz/chromium executablePath() │
  │       └─ if unavailable/fails: continue without screenshot        │
  │                                                                   │
  │  5. analyzeWithClaude({                                          │
  │       screenshot?, logoBuffers[], labeledHtmlSections[] })        │
  │       └─ ONE Claude Haiku vision+text call (unchanged pattern)   │
  │                                                                   │
  │  6. uploadLogo(s) + upload gallery images to business-media       │
  │                                                                   │
  │  7. UPSERT business_branding                                     │
  │       onConflict: 'business_account_id,paikka_id'  (NEW)         │
  └───────────────────────────────────────────────────────────────┘
        │
        ▼
GET /api/business/analyze-website?paikka_id=... → reads current row by (account, paikka_id)
```

### Recommended Project Structure
```
lib/branding/
├── scraper.ts          # extended: crawl(), gallery image extraction, link discovery
├── ssrfGuard.ts         # NEW — extracted validator, exported, used by route.ts AND scraper.ts
├── fetchSafe.ts         # NEW (or inline in scraper.ts) — redirect:'manual' + hop-cap wrapper
├── screenshot.ts        # NEW — playwright-core + @sparticuz/chromium homepage capture, isolated module
├── analyzer.ts          # extended: array-based logos/colors, screenshot content block
├── prompt.ts            # replaced verbatim per D-01
└── storage.ts           # extended: upload gallery images (reuse uploadLogo pattern)

supabase/migrations/
└── 2026XXXXXXXXXX_business_branding_plural_and_paikka_scoping.sql   # NEW migration, additive
```

### Pattern 1: Shared SSRF Validator (D-08/D-09)
**What:** Extract `route.ts` lines 103-133 into `lib/branding/ssrfGuard.ts`, exporting a pure function `isUrlSafe(url: string): boolean` (or throws). Call it from `route.ts` (entry URL), `scraper.ts` (every discovered subpage link before fetch), and the redirect-following wrapper (every `Location` header).
**When to use:** Any place a URL is about to be fetched, regardless of where that URL came from (user input, page content, redirect header).
**Example:**
```typescript
// lib/branding/ssrfGuard.ts
// Source: extracted verbatim from existing app/api/business/analyze-website/route.ts (lines 103-133)
export function isUrlSafe(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()
  const parts = hostname.split('.')
  const oct1 = parseInt(parts[0] ?? '', 10)
  const oct2 = parseInt(parts[1] ?? '', 10)
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::]' ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fc') ||
    (oct1 === 172 && oct2 >= 16 && oct2 <= 31) ||
    (oct1 === 100 && oct2 >= 64 && oct2 <= 127)
  return !isPrivate
}
```
**Known limitation (carried forward, not fixed by this phase):** Hostname-string checks happen BEFORE DNS resolution — DNS rebinding (a hostname that resolves to a private IP at fetch-time) is NOT caught by this check. This is `P45-DNS` in STATE.md's Carry-Forward list, explicitly noted as "relevant to Phase 47's SSRF re-validation work" but deferred. The planner should decide whether to scope a DNS-rebinding fix into this phase or explicitly re-defer it — CONTEXT.md does not address this gap.

### Pattern 2: Manual Redirect Following with Re-validation (D-10)
**What:** Replace default-redirect-following `fetch()` calls with `redirect: 'manual'` and a loop that re-validates each hop.
**When to use:** Every outbound fetch in the pipeline (homepage, subpages, CSS, logo images, gallery images) — D-10 says "switch logo/page/CSS fetches", which is effectively all of them.
**Example:**
```typescript
// Source: pattern verified via WebSearch (MDN fetch redirect modes + documented SSRF
// mitigation pattern — re-validate Location header before following, cap hop count)
const MAX_REDIRECT_HOPS = 2

async function fetchWithSsrfGuard(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let currentUrl = url
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    if (!isUrlSafe(currentUrl)) {
      throw new Error(`SSRF guard rejected URL: ${currentUrl}`)
    }
    const res = await fetch(currentUrl, { ...init, redirect: 'manual' })

    // Opaque redirect (type === 'opaqueredirect') happens when redirect:'manual'
    // is used and the response IS a 3xx — status is 0 and Location is NOT readable
    // in browser fetch, but Node.js's `undici`-based fetch DOES expose status+headers
    // for same-process manual redirects. Verify this against the Node version in use
    // (project runs Node v24 — undici fetch; confirm Location header readability in
    // a smoke test rather than assuming, since browser-fetch semantics differ).
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new Error('Redirect with no Location header')
      currentUrl = new URL(location, currentUrl).href
      continue // loop re-validates currentUrl at top before next fetch
    }
    return res
  }
  throw new Error(`Exceeded ${MAX_REDIRECT_HOPS} redirect hops`)
}
```
**Pitfall:** Node.js's native `fetch` (undici) behavior for `redirect: 'manual'` differs subtly from browser `fetch` — in browsers, a manual redirect yields an "opaque" response (`status: 0`, headers not readable, `type: 'opaqueredirect'`) for security reasons tied to cross-origin response exposure. Node's server-side `fetch` has no such cross-origin restriction (there's no "page origin" concept), so `res.status` and `res.headers.get('location')` should be directly readable — but this must be confirmed empirically against the exact Node/undici version Vercel's Node.js runtime ships (verified Node v24.15.0 locally; Vercel's runtime Node version should be checked against `package.json` engines or Vercel project settings) [LOW confidence — recommend a quick smoke test task in the plan rather than assuming].

### Pattern 3: Subpage Discovery via Keyword Matching (D-06)
**What:** Regex-extract `<a href="...">...</a>` pairs from homepage HTML, resolve to absolute same-origin URLs, score against keyword lists.
**Example:**
```typescript
// Extends existing regex idiom already in scraper.ts (imgTagRegex pattern)
const KEYWORDS = {
  pricing: /hinnasto|hinnat|pricing|prices/i,
  hours:   /aukioloajat|aukiolo|hours|opening/i,
  contact: /yhteystiedot|yhteys|contact/i,
}

function discoverSubpages(html: string, baseUrl: string): Record<string, string> {
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const baseHost = new URL(baseUrl).hostname
  const found: Record<string, string> = {}
  let match: RegExpExecArray | null
  while ((match = anchorRegex.exec(html)) !== null) {
    const [, href, linkText] = match
    let abs: URL
    try { abs = new URL(href, baseUrl) } catch { continue }
    if (abs.hostname !== baseHost) continue // same-origin only
    const haystack = href + ' ' + linkText
    for (const [category, re] of Object.entries(KEYWORDS)) {
      if (!found[category] && re.test(haystack)) {
        found[category] = abs.href
      }
    }
  }
  return found // e.g. { pricing: '...', hours: '...' } — contact may be absent
}
```
**Fallback (D-06):** If zero keyword matches found, take the first N same-origin links (N = remaining page budget) as a last resort, per the existing project decision that "homepage-only is a valid fallback, not a failure."

### Anti-Patterns to Avoid
- **Introducing cheerio or any DOM parser in this phase:** CONTEXT.md explicitly locks this phase to the regex pattern. Even though the project's own milestone-level STACK.md research recommended cheerio, CONTEXT.md is the later, deliberate, scoped decision for Phase 47 — do not silently "upgrade" the parsing approach mid-plan.
- **Letting the default `fetch()` auto-follow redirects anywhere in the pipeline:** D-10 requires `redirect: 'manual'` + re-validation universally, not just on the entry URL.
- **Capturing screenshots of subpages:** D-05 explicitly limits screenshot capture to the homepage only.
- **Re-implementing the `logo_type` CHECK constraint fix:** It already exists (see Don't Hand-Roll below) — re-running an equivalent `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` is harmless (idempotent `DROP CONSTRAINT IF EXISTS`) but wasted planning effort if treated as net-new work.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Headless Chromium binary for serverless | A custom-compiled/stripped Chromium build | `@sparticuz/chromium` | Solves exactly this problem (Lambda/Vercel-shaped function size constraints) and is the ecosystem-standard answer; rolling your own risks the exact `libnspr4.so`-style missing-shared-library failures the community has already debugged extensively |
| `logo_type` CHECK constraint fix (BRDDB-04) | A new migration re-deriving the same constraint | **Nothing — already done.** Migration `20260615000002_fix_logo_type_constraint.sql` (git commit `c28cdcb`, "fix(45-04): align logo_type constraint with analyzer + surface DB errors") already sets `CHECK (logo_type IN ('wordmark', 'icon', 'combination', 'unknown'))`, exactly matching `analyzer.ts`'s `VALID_LOGO_TYPES`. Planner should add a verification task (read the live constraint, confirm it matches) rather than a migration task. | Avoids a redundant migration and avoids planner/executor confusion about why "fixing" an already-correct constraint produces a no-op diff |
| Composite-key re-keying with backfill (BRDDB-05) | A bespoke ad-hoc migration pattern | Mirror `20260606000000_onboarding.sql`'s exact precedent: `BIGINT NOT NULL REFERENCES liikuntapaikat(id) ON DELETE CASCADE` + `UNIQUE(business_account_id, paikka_id)` | This exact shape (UUID business account + BIGINT paikka_id + composite UNIQUE) already exists once in this codebase for `onboarding_draft` — reuse it verbatim rather than inventing new column types or constraint naming conventions |
| Redirect-loop / SSRF-bypass-via-redirect protection | A custom URL-rewriting proxy or allowlist-only fetch wrapper | `redirect: 'manual'` + loop re-validating `Location` header against the existing `isUrlSafe()`, capped at N hops | This is the documented, minimal mitigation for the exact CVE-class vulnerability (SSRF via redirect) already cited in security literature (e.g. the LangChain loader SSRF advisory pattern found during research) — no library needed, just discipline in the fetch wrapper |
| Image "is this a real photo not an icon" classification | Pulling in `sharp`'s actual pixel decode, or a vision-classification call, just to filter gallery noise | Cheap regex/string heuristics: skip `data:` URIs, skip `width=`/`height=` attribute values below a threshold (e.g. <100px) when present, skip filenames/classes matching `icon|sprite|pixel|spinner|loader|favicon`, dedupe against logo-candidate URLs | The phase has no image-processing dependency requirement and CONTEXT.md doesn't ask for accurate classification — only "reasonable gallery prefill," so heuristic-based false-positive tolerance is acceptable; `sharp` is already a dependency but invoking it per-candidate just to read dimensions is wasted network+CPU for images that will mostly be filtered by cheaper string checks first |

**Key insight:** Every "don't hand-roll" item in this phase either has a direct precedent already in the codebase (composite UNIQUE pattern) or is already solved by an existing decision (logo_type constraint, SSRF base check) — the actual net-new work is glue code (calling existing validators in new places) plus one genuinely new capability (headless screenshot) that should use the ecosystem-standard tool rather than a custom Chromium packaging solution.

## Common Pitfalls

### Pitfall 1: Next.js 14.2 config key mismatch for externalizing serverless-incompatible packages
**What goes wrong:** Most current web examples/blog posts for deploying `playwright-core`+`@sparticuz/chromium` on Vercel show `serverExternalPackages` at the root of `next.config.ts` — but that key only exists starting in **Next.js 15**. This project runs **Next.js 14.2.35**.
**Why it happens:** The config was renamed/stabilized from `experimental.serverComponentsExternalPackages` (Next 14.x) to `serverExternalPackages` (Next 15+) [VERIFIED: nextjs.org/docs/14/app/api-reference/next-config-js/serverComponentsExternalPackages vs nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages]. Copy-pasting a Next 15-targeted example into this project's `next.config.mjs` will silently no-op (no error, but the package gets bundled incorrectly).
**How to avoid:** In `next.config.mjs`, add:
```js
experimental: {
  serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
}
```
**Warning signs:** Function works locally (`next dev`) but fails on Vercel with a missing-binary or "Cannot find module" error specifically for the chromium binary path.

### Pitfall 2: Chromium binary directory missing from Vercel's traced output
**What goes wrong:** Even with the package externalized, Vercel's file-tracing step may not automatically include `node_modules/@sparticuz/chromium/bin/` in the deployed function bundle, producing a "bin directory missing"/executable-not-found error at runtime only (not at build time) [CITED: community.vercel.com/t/resolving-sparticuz-chromium-bin-directory-missing-error-on-vercel/35415].
**Why it happens:** Next.js's output file tracing (used to determine which files ship with each serverless function) doesn't always detect dynamically-resolved binary paths the way `@sparticuz/chromium`'s `executablePath()` loads them.
**How to avoid:** Add `outputFileTracingIncludes` mapping the `analyze-website` route to the chromium bin directory:
```js
experimental: {
  outputFileTracingIncludes: {
    'app/api/business/analyze-website/route': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
}
```
Note: per Next.js docs, `outputFileTracingIncludes` historically required `output: 'standalone'` to take effect in some Next.js versions — verify this project's deployment mode (Vercel manages this automatically for most Next.js deployments, but the interaction between Vercel's own tracing and Next's `outputFileTracingIncludes` should be smoke-tested in a preview deployment before relying on it).
**Warning signs:** Screenshot capture works in local dev (where node_modules is fully present) but fails specifically in the deployed Vercel environment with an ENOENT-style error mentioning the chromium binary path.

### Pitfall 3: Treating the Vercel Pro upgrade as a code-solvable problem
**What goes wrong:** A planner or executor might try to "work around" the Hobby `waitUntil` 10-second ceiling in code (e.g., splitting the pipeline into multiple chained requests, polling, queueing) instead of recognizing this is gated on an account-level plan change.
**Why it happens:** Most technical problems in a coding agent's experience are code-solvable; a billing/plan upgrade is not.
**How to avoid:** CONTEXT.md D-04 is explicit and final on this point — flag the Pro upgrade as a deployment prerequisite checkpoint, do not write code that tries to fit screenshot capture into a 10-second budget. The relevant constraint instead becomes Pro's actual limits (see Validation Architecture/Open Questions below): default 300s, configurable to 800s via `maxDuration`, which comfortably fits 3-5 page fetches + 1 screenshot + 1 Claude call.
**Warning signs:** Any task description containing language like "ensure the pipeline completes within 10 seconds" after this phase ships — that ceiling no longer applies once Pro is active with an appropriately configured `maxDuration`.

### Pitfall 4: `onConflict` target string drift after the UNIQUE constraint changes
**What goes wrong:** `route.ts` currently UPSERTs with `{ onConflict: 'business_account_id' }` in three places (status='analyzing' UPSERT, final-result UPSERT, failure-path UPSERT). If the constraint is re-keyed to `(business_account_id, paikka_id)` but even one of these three call sites is missed, that UPSERT will either fail (if Supabase validates the conflict target against existing constraints) or — worse — silently fall back to an INSERT that violates the new UNIQUE constraint, surfacing as a runtime DB error mid-pipeline.
**Why it happens:** `onConflict` is a plain string in the Supabase JS client — there's no compile-time check that it matches an actual constraint.
**How to avoid:** Grep for every `onConflict:` occurrence touching `business_branding` before considering the route.ts changes complete; D-16 already flags this as required downstream work.
**Warning signs:** Errors like `there is no unique or exclusion constraint matching the ON CONFLICT specification` from Postgres.

### Pitfall 5: GET route response shape silently breaking Phase 46's frontend before Phase 48 ships
**What goes wrong:** CONTEXT.md's Integration Points section explicitly flags that changing `GET /api/business/analyze-website`'s response shape (array-based `logos`/`colors`) will not match what Phase 46's `brandingResult.ts`/`buildBrandingPreview` currently expects, but says fixing that consumption is Phase 48 scope, not this phase's.
**Why it happens:** Shipping Phase 47 alone (before Phase 48 lands) could leave the currently-deployed frontend broken against the new shape if both phases don't ship together.
**How to avoid:** The planner should explicitly note this as a sequencing/deployment risk — either (a) Phase 47 and 48 must ship together (not independently deployable), or (b) Phase 47's GET response should be additive (new fields alongside old ones, not a breaking rename) so the old frontend keeps working until Phase 48 replaces it. CONTEXT.md does not resolve which approach to take — flagged as an Open Question below.
**Warning signs:** Phase 46-era UI showing blank/broken logo or color sections in production after Phase 47 deploys alone.

## Code Examples

### Vercel-safe Playwright + @sparticuz/chromium homepage screenshot
```typescript
// lib/branding/screenshot.ts
// Source: pattern verified via Sparticuz/chromium official README (github.com/Sparticuz/chromium)
// and corroborated by multiple Vercel-deployment guides (ZenRows, DEV Community)
import chromium from '@sparticuz/chromium'
import { chromium as playwrightChromium } from 'playwright-core'

export async function captureHomepageScreenshot(url: string): Promise<Buffer | null> {
  let browser
  try {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    const buffer = await page.screenshot({ type: 'png', fullPage: false })
    return buffer
  } catch (err) {
    console.error('[branding/screenshot] capture error:', err)
    return null // non-fatal: pipeline continues without screenshot (D-02 says "in addition to", not "required")
  } finally {
    await browser?.close()
  }
}
```

### Gallery image noise-filtering (regex-based, per CONTEXT.md's no-DOM-parser constraint)
```typescript
// Extends lib/branding/scraper.ts — same imgTagRegex idiom already used for logo detection
const NOISE_PATTERN = /icon|sprite|pixel|spinner|loader|favicon|tracking|1x1/i
const MIN_DIMENSION = 100 // px — only enforced when width/height attrs are present

function extractGalleryImages(html: string, baseUrl: string, excludeUrls: Set<string>): string[] {
  const imgTagRegex = /<img[^>]+>/gi
  const found: string[] = []
  let match: RegExpExecArray | null
  while ((match = imgTagRegex.exec(html)) !== null && found.length < 20) {
    const tag = match[0]
    const src = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1] ?? ''
    if (!src || src.startsWith('data:')) continue // skip inline data-URI images (often tracking/spacer)

    const widthAttr = /\bwidth=["']?(\d+)/i.exec(tag)?.[1]
    const heightAttr = /\bheight=["']?(\d+)/i.exec(tag)?.[1]
    if (widthAttr && parseInt(widthAttr, 10) < MIN_DIMENSION) continue
    if (heightAttr && parseInt(heightAttr, 10) < MIN_DIMENSION) continue

    const alt = /\balt=["']([^"']*)["']/i.exec(tag)?.[1] ?? ''
    const cls = /\bclass=["']([^"']*)["']/i.exec(tag)?.[1] ?? ''
    if (NOISE_PATTERN.test(src) || NOISE_PATTERN.test(alt) || NOISE_PATTERN.test(cls)) continue

    try {
      const abs = new URL(src, baseUrl).href
      if (excludeUrls.has(abs)) continue // already a logo candidate
      if (!found.includes(abs)) found.push(abs)
    } catch { continue }
  }
  return found.slice(0, 15) // D-11: planner-chosen cap, 15 suggested as a reasonable gallery size
}
```
**Caveat (LOW confidence):** This heuristic has no fallback for images with no `width`/`height` attributes AND no telltale filename/class noise pattern — many real-world sites lazy-load images via `data-src` (not `src`) with CSS-driven sizing, which this regex will simply miss (not false-positive, just under-extract). This is an acceptable gap for "gallery prefill" (best-effort) but should not be presented as comprehensive image discovery.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Single flat HTML snippet (homepage only, 8000 chars) to Claude | Labeled multi-page sections with per-page truncation budgets | This phase (SCRAP-08) | Claude can attribute `source_page` per extracted fact, enabling the new prompt's per-field provenance |
| `logo_index: number` (single pick) | `logos: Array<{index, type}>` (all distinct variants) | This phase (D-01, ONBOARD-14 downstream) | Defers final selection to the user in Phase 48 instead of auto-picking |
| `colors: string[]` (flat hex list) | `colors: Array<{hex, role}>` | This phase (D-01) | Enables background/accent role-aware selection in Phase 48 (ONBOARD-15) |
| Default-redirect-following `fetch()` | `redirect: 'manual'` + re-validated hop loop | This phase (D-10, SCRAP-07) | Closes an SSRF bypass vector (redirect to private IP after passing entry-URL check) |
| `UNIQUE(business_account_id)` | `UNIQUE(business_account_id, paikka_id)` | This phase (D-14, BRDDB-05) | Multi-venue business accounts no longer silently overwrite sibling venues' branding rows |

**Deprecated/outdated:**
- The flat single-page scrape (`htmlSnippet: string`) return shape in `ScrapeResult` — superseded by a multi-page, labeled structure. The planner should treat `ScrapeResult`'s interface as needing a breaking internal change (it's not a public API, only consumed by `route.ts`'s `runAnalysis`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Vercel's Node.js runtime (the actual deployed function runtime, not local dev) ships a Node version whose `fetch` (undici) exposes `status`/`headers.get('location')` transparently for `redirect: 'manual'` server-side fetches, the same as local Node v24.15.0 tested here | Pattern 2 (Manual Redirect Following) | If Vercel's runtime behaves differently (e.g. treats it as opaque), the redirect-following loop silently breaks and all redirecting subpages get treated as failed fetches (degraded, not crashing — but contradicts SCRAP-07's intent) |
| A2 | `outputFileTracingIncludes` works correctly for a Vercel-deployed (not self-hosted) Next.js 14.2 App Router API route without requiring `output: 'standalone'` in this project's config | Pitfall 2 | If wrong, screenshot capture works in preview/local but fails in production with a missing-binary error that only surfaces after deploy |
| A3 | `playwright-core@1.61.0` is compatible with whatever Chromium build version `@sparticuz/chromium@149.0.0` ships (Sparticuz's docs say version-pairing is based on Chromium compatibility, not strict semver matching to a specific Playwright version) | Standard Stack | If incompatible, `chromium.launch()` may fail outright or produce protocol-mismatch errors at runtime — should be smoke-tested against a real Vercel Pro deployment before relying on it in production |
| A4 | The existing `business_paikka_links` table has at most one row per `business_account_id` in the common case, making D-15's "backfill from the first/only linked venue" deterministic enough to not need a tie-breaking rule | Schema Migration / D-15 | If a business account already has multiple linked venues with an existing `business_branding` row, the backfill's "first" choice is arbitrary (no explicit ORDER BY specified in CONTEXT.md) — should pick a deterministic rule (e.g. earliest `created_at`) in the migration, not leave it to whatever order Postgres happens to return rows |

**If this table is empty:** N/A — see entries above.

## Open Questions (RESOLVED)

1. **Is BRDDB-04 actually fully closed, or does CONTEXT.md know something this research missed?**
   - **RESOLVED:** see Plan 47-01 Task 3 (live-constraint verification task).
   - What we know: `20260615000002_fix_logo_type_constraint.sql` already sets the CHECK constraint to exactly `('wordmark', 'icon', 'combination', 'unknown')`, matching `analyzer.ts`'s `VALID_LOGO_TYPES` exactly. Git log confirms this shipped in commit `c28cdcb`.
   - What's unclear: CONTEXT.md's D-13 describes this as a live bug ("current migration allows... a real, currently-silent bug"), which appears to be stale information from before the fix migration was written, OR there's a reason the fix migration didn't actually get applied to the live database (e.g. migration drift between local files and deployed Supabase project).
   - Recommendation: Planner should add an explicit verification task — query the live Supabase project's actual constraint definition (`SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'business_branding'::regclass`) before deciding whether BRDDB-04 needs any migration work at all in this phase.

2. **Should this phase's GET response change be additive or breaking, given Phase 48 isn't shipping simultaneously?**
   - **RESOLVED:** see Plan 47-05 Task 2 (additive GET response shape).
   - What we know: CONTEXT.md says frontend consumption updates are explicitly Phase 48 scope, and that Phase 47 "only needs to make the new shape available."
   - What's unclear: Whether "available" means the GET route changes its response shape now (breaking Phase 46's currently-deployed consumer) or whether old fields should remain present alongside new ones until Phase 48 ships.
   - Recommendation: Default to additive (keep `logo_url`/flat `colors` fields populated from `logos[0]`/derived values alongside the new array fields) unless the user confirms Phase 47+48 will deploy together as one release. Flag this explicitly for `/gsd:discuss-phase` follow-up if not already resolved.

3. **What is the actual current Vercel plan and is the Pro upgrade already done?**
   - **RESOLVED (updated 2026-06-16, post-planning):** Confirmed there is no Vercel project at all yet — no `.vercel/vercel.json` in the local repo, and zero deployments/check-runs/commit-statuses on the `JonttuO02/liikuntahakemisto` GitHub repo (checked via `gh api repos/.../deployments`, `/hooks`, `/commits/HEAD/check-runs`, `/commits/HEAD/status`, all empty). D-04's original framing ("upgrade Hobby to Pro") assumed an existing deployment that does not exist. The actual prerequisite chain is: create Vercel account/project → import the GitHub repo → first deploy (lands on Hobby by default) → upgrade to Pro. Plan 47-01's and 47-04's `user_setup` blocks and Plan 47-05 Task 3's checkpoint have been updated to reflect this three-step chain instead of a single upgrade step.
   - What we know: CONTEXT.md D-04 says this is "an out-of-band account action the user must take separately."
   - What's unclear: Whether the user will complete all three steps before Plan 47-05's checkpoint, which determines whether the screenshot capability can be tested end-to-end during this phase or must be built defensively (feature-detected/gracefully degraded) without ever running against production.
   - Recommendation: Plan 47-05 Task 3's checkpoint:human-verify now asks the developer to state which of three states applies (no project / Hobby / Pro) rather than a binary Hobby-vs-Pro check.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| `playwright-core` | Homepage screenshot (D-03) | ✗ (not yet installed) | latest: 1.61.0 [VERIFIED: npm registry] | None — screenshot capability is additive/non-fatal (D-02: "in addition to", color extraction still has CSS/meta-tag regex fallback) |
| `@sparticuz/chromium` | Homepage screenshot (D-03) | ✗ (not yet installed) | latest: 149.0.0 [VERIFIED: npm registry] | None — same as above |
| Vercel Pro plan | `waitUntil` budget for 3-5 page fetch + screenshot + Claude call (D-04) | ✗ (unconfirmed — out-of-band human action per D-04) | — | None — D-04 explicitly states this cannot be worked around in code; gate the screenshot capability behind a runtime check/flag so the rest of the pipeline (multi-page crawl, schema work) functions on Hobby too |
| Node.js (Vercel runtime) | `fetch` `redirect: 'manual'` semantics (Pattern 2) | ✓ (locally: v24.15.0) | Vercel's actual deployed Node version not directly queryable from this research session | Smoke-test in a preview deployment before relying on Location-header readability assumptions (see A1) |
| `npm`/registry access | Installing new packages | ✓ | npm 10.x (bundled with Node v24) | — |

**Missing dependencies with no fallback:**
- Vercel Pro plan upgrade — blocks the screenshot capability specifically, but does NOT block SCRAP-06/07/09 or BRDDB-03/04/05, which are plan-independent. The planner should structure waves so schema + crawl + SSRF work can ship and be verified even if the Pro upgrade is still pending.

**Missing dependencies with fallback:**
- `playwright-core`/`@sparticuz/chromium` not yet installed — straightforward `npm install`, no fallback needed beyond the install step itself.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.7` |
| Config file | `vitest.config.ts` (`include: ['lib/**/*.test.ts', 'app/**/__tests__/*.test.ts', 'tests/**/*.test.ts']`) |
| Quick run command | `npx vitest run lib/branding/scraper.test.ts lib/branding/analyzer.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| SCRAP-06 | Same-origin subpage discovery + 3-5 page cap | unit | `npx vitest run lib/branding/scraper.test.ts -t "SCRAP-06"` | ❌ Wave 0 — extend `scraper.test.ts` |
| SCRAP-07 | SSRF re-validation on every link/redirect; manual redirect hop cap | unit | `npx vitest run lib/branding/ssrfGuard.test.ts` | ❌ Wave 0 — new file, mirrors `scraper.test.ts` mock-`fetch` style |
| SCRAP-08 | Labeled multi-page prompt sections with per-page truncation | unit | `npx vitest run lib/branding/analyzer.test.ts -t "SCRAP-08"` | ❌ Wave 0 — extend `analyzer.test.ts` |
| SCRAP-09 | Gallery image extraction + noise filtering | unit | `npx vitest run lib/branding/scraper.test.ts -t "SCRAP-09"` | ❌ Wave 0 — extend `scraper.test.ts` |
| BRDDB-03 | New columns exist with correct types/defaults | integration (migration apply + `\d business_branding` or `information_schema` query) | manual via `supabase db push` + `psql`/Supabase SQL editor — no Vitest equivalent for schema-only checks in this codebase's existing patterns | ❌ Wave 0 — no precedent for automated migration-assertion tests in this repo; manual-only is consistent with existing practice |
| BRDDB-04 | `logo_type` CHECK constraint matches analyzer enum | manual (verify-only, see Open Question 1) | `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'business_branding_logo_type_check'` | N/A — verification task, not a new test |
| BRDDB-05 | Composite UNIQUE prevents cross-venue overwrite; backfill correctness | integration (insert two rows same business_account_id different paikka_id; attempt duplicate; assert backfill populated paikka_id for pre-existing rows) | manual SQL verification post-migration (consistent with this repo's existing migration-verification practice — no automated DB-integration test harness exists for migrations) | ❌ Wave 0 — manual SQL checklist, not a Vitest file |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/branding/` (scoped to the branding module under active change)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus manual SQL verification checklist for BRDDB-03/04/05 (this repo has no automated migration-testing harness — manual `psql`/Supabase SQL editor checks are the existing convention, not a gap introduced by this phase)

### Wave 0 Gaps
- [ ] `lib/branding/ssrfGuard.test.ts` — new file, covers SCRAP-07 (extracted validator + redirect-hop-cap loop); mock `fetch` the same way `scraper.test.ts` already does
- [ ] Extend `lib/branding/scraper.test.ts` — covers SCRAP-06 (subpage discovery/cap) and SCRAP-09 (gallery extraction/noise filtering)
- [ ] Extend `lib/branding/analyzer.test.ts` — covers SCRAP-08 (labeled multi-page input shape) and the new array-based `logos`/`colors` parsing/validation (D-01 runtime guards, same style as existing `VALID_LOGO_TYPES`/`WR-04` color-filtering checks)
- [ ] No test file for `lib/branding/screenshot.ts` (Playwright/Chromium capture) — recommend a smoke-test-only approach (mock `playwright-core`'s `chromium.launch` to avoid actually launching a browser in CI) since spinning up real Chromium in Vitest would be slow/flaky and this repo has no existing precedent for browser-launching tests
- [ ] Manual SQL verification checklist for BRDDB-03/04/05 — no Vitest equivalent exists in this codebase's conventions for schema/migration assertions; this is consistent with existing practice, not a new gap

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|---------------------|
| V2 Authentication | yes (pre-existing, unchanged) | JWT verification via `supabaseAdmin.auth.getUser(token)` at route boundary — already implemented, not modified by this phase |
| V3 Session Management | no | No session changes in this phase |
| V4 Access Control | yes | RLS policies scoped to `auth.uid() = business_account_id`; this phase adds `paikka_id` scoping on top — planner must verify RLS policies still correctly restrict access after the schema change (RLS policies don't automatically need updates for an added column, but ownership-check logic in `route.ts`'s POST handler does need to verify `paikka_id` belongs to the authenticated business account via `business_paikka_links`, not just trust the request body) |
| V5 Input Validation | yes | URL validation (protocol allowlist), `paikka_id` type/ownership validation (NEW — must verify the business account actually owns this `paikka_id` before scoping a write to it) |
| V6 Cryptography | no | Not applicable to this phase |
| V10 Malicious/Unexpected Functionality (SSRF specifically — ASVS V10/V12 server-side request categories depending on ASVS version) | yes | Shared `ssrfGuard.ts` validator + `redirect: 'manual'` re-validation loop — this IS the core security work of SCRAP-07 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| SSRF via initial URL (e.g. `http://169.254.169.254/`) | Tampering / Information Disclosure | Existing hostname/IP-range blocklist in `ssrfGuard.ts` (extracted from current `route.ts`) |
| SSRF via redirect (legitimate-looking entry URL 302s to a private IP) | Tampering / Information Disclosure | D-10's `redirect: 'manual'` + re-validate-every-hop pattern — this is the exact gap SCRAP-07 closes |
| SSRF via DNS rebinding (hostname resolves to public IP at validation time, private IP at fetch time) | Tampering | **Not closed by this phase** — carried forward as `P45-DNS` in STATE.md; hostname-string checks happen pre-DNS-resolution. Flagged as an explicit known gap, not silently ignored. |
| IDOR via unvalidated `paikka_id` in request body (a business account submitting a `paikka_id` belonging to a venue it doesn't own) | Tampering / Elevation of Privilege | Route handler must verify `(business_account_id, paikka_id)` exists in `business_paikka_links` with an approved `claim_status` before accepting the analyze-website request — this is NEW validation logic this phase must add (D-16 implies the scoping but doesn't explicitly call out the ownership check; planner should make this explicit) |
| Prompt injection via scraped page content reaching Claude (malicious page content trying to override the system prompt) | Tampering | Existing HTML comment/script/style stripping (`strippedHtml` in `scraper.ts`) + new D-01 prompt instruction "only use content that belongs to THIS company" — partial mitigation, not a complete guarantee; this is consistent with the existing accepted risk posture (CR-03 partial mitigation noted in current code comments) |

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `lib/branding/scraper.ts`, `lib/branding/analyzer.ts`, `lib/branding/storage.ts`, `app/api/business/analyze-website/route.ts`, `supabase/migrations/*.sql` (all relevant files read in full), `package.json`, `vitest.config.ts`, `.planning/config.json`
- `npm view @sparticuz/chromium version` / `npm view playwright-core version` / `npm view <pkg> time.created` / `npm view <pkg> repository.url` / `npm view <pkg> scripts.postinstall` — direct npm registry queries
- `python -m slopcheck install @sparticuz/chromium playwright-core` — both `[OK]`
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) — official docs, fetched directly, dated 2026-06-02 (current)
- [Next.js 14 serverComponentsExternalPackages docs](https://nextjs.org/docs/14/app/api-reference/next-config-js/serverComponentsExternalPackages) and [Next.js current serverExternalPackages docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) — confirms the Next 14 vs 15 config-key split

### Secondary (MEDIUM confidence)
- [github.com/Sparticuz/chromium](https://github.com/Sparticuz/chromium) — official repo, WebFetch-summarized (binary size, executablePath usage, version-pairing guidance)
- [Resolving @sparticuz/chromium bin directory missing error on Vercel — Vercel Community](https://community.vercel.com/t/resolving-sparticuz-chromium-bin-directory-missing-error-on-vercel/35415) — community thread, WebFetch-summarized, corroborates a known/documented failure mode rather than a one-off report
- [How to Deploy Playwright on Vercel - ZenRows](https://www.zenrows.com/blog/playwright-vercel) and related WebSearch results — `serverExternalPackages`/`outputFileTracingIncludes` pattern, cross-checked against official Next.js docs for version applicability

### Tertiary (LOW confidence)
- WebSearch result summarizing Node.js `fetch redirect: 'manual'` semantics and SSRF-via-redirect mitigation generally — concept is well-established (multiple corroborating sources: MDN, OWASP-style SSRF guidance, a cited LangChain SSRF advisory pattern) but the specific claim about Node/undici `redirect: 'manual'` exposing `status`/`headers` transparently (vs. browser opaque-redirect behavior) was not verified against Node's own official `fetch`/undici documentation in this session — flagged as Assumption A1, recommend empirical smoke test

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both packages verified directly against npm registry with version, age, repo, and slopcheck `[OK]` confirmed
- Architecture: HIGH — built directly on existing, fully-read codebase files and CONTEXT.md's already-locked decisions; no speculative architecture introduced
- Pitfalls: MEDIUM-HIGH — Vercel/Next.js config pitfalls verified against official docs; the Node `fetch` redirect-semantics pitfall (Pattern 2) is flagged LOW and explicitly called out as needing a smoke test rather than presented as settled fact

**Research date:** 2026-06-16
**Valid until:** 30 days (stable domain — Postgres/Supabase migration patterns and the existing codebase don't change quickly; the one fast-moving risk is `@sparticuz/chromium`/`playwright-core` version pairing, which the Sparticuz project has historically updated frequently to track new Chromium releases — re-verify exact versions immediately before the implementation wave that installs them, not just at research time)
