# Phase 47: Skeema & monisivuinen scraper-putki - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure backend extension of the v2.1 scraper/analyzer/route pipeline: crawl 3-5 same-origin subpages (not just the homepage), re-validate every followed link/redirect against the SSRF guard, send Claude a labeled multi-page prompt (with a homepage screenshot for color analysis) instead of one flat 8000-char slice, extract general page images for gallery prefill, and reshape `business_branding` to store plural results (multiple logo candidates, multiple images, separate bg/accent color selections) keyed correctly per venue instead of per business account.

</domain>

<decisions>
## Implementation Decisions

### Color/logo analysis prompt (supersedes v2.1 prompt)
- **D-01:** Adopt the user-authored replacement `BRANDING_ANALYSIS_PROMPT` verbatim (full text in `<specifics>` below). Key differences from the v2.1 prompt:
  - `logos` becomes an array (deduplicated, every distinct logo variant) instead of a single `logo_index` — aligns with BRDDB-03's new `logo_candidates` column.
  - `colors` becomes an array of `{hex, role}` objects (role: background/primary/secondary/accent/text/unknown) instead of a flat hex array.
  - `prices` and `opening_hours` each gain a `source_page` field naming which labeled page they came from.
  - Explicit "only use content belonging to this company" instruction to ignore third-party embeds and mismatched labeled pages.
- **D-02:** Claude's input now includes a full-page screenshot of the homepage (in addition to labeled multi-page HTML sections and logo candidate images) specifically to improve color extraction accuracy beyond what CSS/meta-tag regex parsing can find.

### Homepage screenshot capture (new capability — supersedes REQUIREMENTS.md "Out of Scope: headless browser")
- **D-03:** Capture a screenshot of the homepage ONLY (not the other 3-5 crawled subpages) using self-hosted Playwright + `@sparticuz/chromium` (lightweight serverless Chromium build) within the existing `waitUntil` pipeline.
- **D-04:** This requires the user to upgrade the Vercel plan from Hobby to Pro — Hobby's `waitUntil` 10-second ceiling was the original reason headless-browser scraping was ruled out in REQUIREMENTS.md. **This is an out-of-band account action the user must take separately; it is not something the implementation can do.** Planner/executor should flag this as a deployment prerequisite, not attempt to work around it in code.
- **D-05:** Original REQUIREMENTS.md "Out of Scope" line for Playwright is now superseded for this narrow case (homepage screenshot only). Full multi-page screenshot capture remains out of scope — only the homepage gets one.

### Subpage discovery
- **D-06:** Scraper selects subpages to crawl via keyword matching: link text/href matched against Finnish + English terms for pricing (hinnasto, hinnat, pricing), hours (aukioloajat, hours), and contact (yhteystiedot, contact, yhteys). Falls back to first-N same-origin links if no keyword matches are found. This choice follows directly from the new prompt's expectation of labeled sections like `[PAGE: pricing]` — the scraper must categorize links by content type to produce those labels, and keyword matching is the only practical way to do that without rendering every page.
- **D-07:** Capped at 3-5 total pages crawled (homepage + up to 4 subpages), per ROADMAP.md success criteria.

### SSRF re-validation & redirects
- **D-08:** Extract the existing inline SSRF check (currently duplicated logic inline in `route.ts`'s POST handler — protocol allowlist + private-IP-range blocklist) into a shared, exported validator function (e.g. `lib/branding/ssrfGuard.ts`).
- **D-09:** Call this validator on every subpage link before fetching it, not just the entry URL submitted by the user.
- **D-10:** Switch logo/page/CSS fetches from default auto-redirect-following to `redirect: 'manual'`, manually re-validating each redirect's `Location` header against the same SSRF validator before following it. Cap at 2 redirect hops; abandon the fetch if exceeded.

### Gallery image extraction (SCRAP-09)
- **D-11:** Extract general `<img>` tags from crawled pages (beyond the existing logo-candidate detection) for `image_urls`. Filter out likely non-photo noise via dimension/size heuristics (skip very small images — icons, spacers, tracking pixels). Cap the stored count at a reasonable gallery size (planner to pick exact number, e.g. 10-15).

### Schema (BRDDB-03/04/05)
- **D-12:** `business_branding` gains `logo_candidates` (jsonb array, following the same pattern as the existing `colors` jsonb column), `image_urls` (jsonb array of strings), `selected_background_color` (text, nullable — set by user in Phase 48), `selected_accent_color` (text, nullable — set by user in Phase 48).
- **D-13:** Fix `logo_type` CHECK constraint — current migration allows `('icon', 'icon_with_text', 'text_only')` but the analyzer's actual enum is `'wordmark' | 'icon' | 'combination' | 'unknown'` (confirmed by reading `lib/branding/analyzer.ts` line 22 and the new prompt's `type` field for each logo entry). Update CHECK to match the real enum values. Verified: only `'icon'` currently overlaps between the constraint and the actual values ever written — this is a real, currently-silent bug (any non-`'icon'` logo_type value fails the UPDATE/INSERT).
- **D-14:** Re-key `business_branding`'s `UNIQUE(business_account_id)` constraint to `UNIQUE(business_account_id, paikka_id)` (or equivalent), adding a `paikka_id` column with FK to `liikuntapaikat`. Confirmed need: `business_accounts` can manage multiple venues via `business_paikka_links` (one tili, useita paikkoja — see PROJECT.md), and the current single-column UNIQUE means analyzing site B's branding silently overwrites venue A's branding row when both belong to the same business account.
- **D-15:** Migration backfill for existing rows: for each existing `business_branding` row, look up that `business_account_id`'s `business_paikka_links` and backfill `paikka_id` from the first (or only) linked venue. Accepted tradeoff for multi-venue accounts: pre-Phase-47 data was already conflated across venues anyway, so assigning to one venue is not a regression.
- **D-16:** All downstream code that queries/writes `business_branding` by `business_account_id` alone (route.ts POST/GET, the UPSERT calls) must be updated to scope by `(business_account_id, paikka_id)` once the column exists — `analyze-website` route needs to accept/receive `paikka_id` (likely as a request body field or query param, following the existing pattern of `paikka_id` as a URL param in the onboarding/edit wizard per PROJECT.md Phase 36 decision).

### Claude's Discretion
- Exact gallery image count cap (D-11).
- Exact dimension/size thresholds for filtering noise images out of gallery extraction.
- Whether `paikka_id` is passed to `analyze-website` route via request body or query param — follow whichever existing convention is more consistent with sibling business routes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §SCRAP-06–09, §BRDDB-03–05 — exact requirement text for this phase
- `.planning/ROADMAP.md` §"Phase 47: Skeema & monisivuinen scraper-putki" — success criteria and phase goal
- `.planning/REQUIREMENTS.md` §"Out of Scope" — note the Playwright exclusion is superseded for homepage-screenshot-only per D-03–D-05; still applies to full multi-page screenshot capture

### Prior phase context (v2.1 scraper pipeline this phase extends)
- `.planning/phases/44-brandidata-tietokantaperusta/44-CONTEXT.md` — original `business_branding` schema decisions (D-01–D-14), now being extended/fixed by BRDDB-03/04/05
- `.planning/phases/45-scraper-claude-api-putki/45-CONTEXT.md` — scraper/analyzer/route architecture decisions (D-01–D-17) this phase builds on
- `.planning/phases/46-pre-vaihe-ui-velhointegraatio/46-CONTEXT.md` — how the frontend consumes `BrandingResult`; relevant because the shape returned by GET will change

### Existing code (read before modifying)
- `lib/branding/scraper.ts` — current single-page scraper; comment on line 2 confirms SSRF validation currently lives entirely in the caller (`route.ts`), not here
- `lib/branding/analyzer.ts` — current single-logo-index analyzer; needs reshaping to return the new array-based `logos`/`colors` shape
- `lib/branding/prompt.ts` — current `BRANDING_ANALYSIS_PROMPT`; replace with the new prompt text in `<specifics>` below
- `lib/branding/brandingResult.ts` — client-safe `BrandingResult` type and `buildBrandingPreview` — will need shape updates to match new analyzer output (array-based logos/colors)
- `app/api/business/analyze-website/route.ts` — POST/GET handlers; contains the inline SSRF guard (lines 103-133) that needs extracting, and the UPSERT calls that need `paikka_id` scoping
- `supabase/migrations/20260615000001_business_branding.sql` — current schema; this phase adds a new migration on top, does not edit this file in place

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Inline SSRF check in `app/api/business/analyze-website/route.ts` lines 103-133 — extract this logic verbatim into a shared function rather than rewriting it.
- `colors jsonb` column pattern from the existing migration — reuse the same jsonb-array approach for the new `logo_candidates` and `image_urls` columns for consistency.

### Established Patterns
- Regex-based HTML parsing throughout `scraper.ts` (no DOM parser/cheerio) — continue this pattern for new link-discovery and image-extraction logic; do not introduce a DOM parser dependency.
- `paikka_id` as a URL/request parameter — already established in the onboarding/edit wizard (PROJECT.md Phase 36 decision: "paikka_id URL-parametrina edit/onboarding-velhossa") — follow this convention when scoping `analyze-website` by venue.
- UPSERT with `onConflict` — used throughout `route.ts`; the `onConflict` target string needs to change once the UNIQUE constraint is re-keyed.

### Integration Points
- `GET /api/business/analyze-website` response shape changes (array-based `logos`/`colors` instead of `logo_url`/single colors array) — Phase 46's frontend code (`brandingResult.ts`, `buildBrandingPreview`) currently expects the old shape and will need updates, but that update is Phase 48/49 scope (multi-candidate picker UI), not this phase. This phase only needs to make the new shape available; do not redesign the frontend consumption here.
- Phase 48 (Logo-, väri- ja galleriavalinta) directly depends on this phase's `logo_candidates`/`image_urls`/color columns existing.

</code_context>

<specifics>
## Specific Ideas

### Replacement prompt (verbatim — write directly into `lib/branding/prompt.ts`)

```ts
// lib/branding/prompt.ts
//
// HUOM ennen käyttöä: tämä prompti olettaa että scraper lähettää nyt:
//   1. Yhden tai useamman koko sivun SCREENSHOTIN (väri- ja logoanalyysiä varten)
//   2. Logokandidaattikuvat erikseen (numeroitu 0:sta)
//   3. Useita LABELOITUJA sivuosioita HTML:nä (homepage, pricing, hours, jne.)
// Jos scraper ei vielä lähetä screenshotteja, värianalyysi EI parane pelkällä
// tällä promptilla — se on pakollinen muutos scraperin puolelle (SCRAP-08).

export const BRANDING_ANALYSIS_PROMPT = `You are a branding analyst. You analyze a company's own website material and extract its visual identity and key business information.

== INPUT ==
You may receive any combination of the following:
1. One or more FULL-PAGE SCREENSHOTS of the website, each labeled with the page it shows (e.g. [SCREENSHOT: homepage], [SCREENSHOT: pricing]).
2. Zero or more LOGO CANDIDATE IMAGES, provided separately and numbered from 0 in the order given. The first logo image is index 0.
3. One or more LABELED HTML SECTIONS, each marked with its source page, e.g.:
   [PAGE: homepage] ...html...
   [PAGE: pricing] ...html...
   [PAGE: hours] ...html...
Each HTML section may be truncated. Not every input type is always present.

== SCOPE: only use content that belongs to THIS company ==
Use only material that clearly belongs to the company being analyzed. IGNORE and do NOT extract anything from:
- Third-party or embedded content: social media feeds, ad widgets, chat/popup widgets, cookie/consent banners, review-platform embeds, partner badges.
- Any labeled page whose content clearly does not belong to this company (e.g. an external domain that slipped into the input, a generic blog aggregator, an unrelated landing page).
If a labeled section looks like it does not belong to this company, skip it entirely. Wrong data is worse than missing data.

== TASK ==
Return ONLY a valid JSON object — no markdown code fences, no explanation, no commentary. Return only the raw JSON, with this exact shape:

{
  "logos": [
    { "index": <integer 0-based index into the logo images array>, "type": "wordmark" | "icon" | "combination" }
  ],
  "colors": [
    { "hex": "#rrggbb", "role": "background" | "primary" | "secondary" | "accent" | "text" | "unknown" }
  ],
  "prices": [
    { "label": <string>, "price": <string>, "source_page": <string label of the page it was found on> }
  ],
  "opening_hours": [
    { "day": <string>, "open": "HH:MM", "close": "HH:MM", "source_page": <string label of the page it was found on> }
  ],
  "website_url": <string canonical URL, or "">
}

== FIELD RULES ==

logos:
- Return EVERY DISTINCT logo you find across the candidate images. The user will choose the right one later, so be inclusive of genuinely different variants.
- DEDUPLICATE: if the same logo appears more than once (e.g. the identical mark in the header and the footer, or the same image at two sizes), include it only ONCE.
- Different VARIANTS are different logos and should each be included: e.g. a horizontal wordmark vs. a standalone icon mark vs. a stacked combination version are three separate entries.
- type for each logo:
  - "wordmark"   = text only: the company name as styled text, no symbol.
  - "icon"       = symbol/mark only, no company name.
  - "combination"= a symbol/mark together with the company name.
- If no usable logo images are provided, return an empty array [].

colors:
- Extract colors PRIMARILY by visually inspecting the provided full-page screenshot(s). This is the most reliable source. Only fall back to CSS/inline styles in the HTML if no screenshot is available.
- Find ALL visually DOMINANT and prominent brand colors — do NOT stop at one. Inspect at minimum:
  - large background fills / page background,
  - the header or navigation bar (its background color is often THE brand color),
  - primary headings and large display text,
  - call-to-action buttons and highlighted elements,
  - prominent accent text.
- Concrete reminders of past mistakes to avoid:
  - A page with a deep-blue background AND bright red headings/buttons has at LEAST blue, red, and white — return all of them, not just the blue.
  - A page with an ORANGE header bar must include that orange, even if the body content is otherwise black/white/grey. Do not return only black and white when a strong accent color is clearly present.
- Rank by visual prominence: the most dominant color first. Max 6 entries.
- Assign a "role" to each color where you reasonably can (background / primary / secondary / accent / text). Use "unknown" only if you truly cannot tell.
- Format hex as "#rrggbb" (6-digit lowercase preferred).

prices:
- Extract pricing from ANY labeled page (most commonly the pricing page). Examples: membership prices, single-entry fees, class prices.
- Keep label and price in the SOURCE LANGUAGE and format as found (e.g. Finnish "Aikuinen", "12 €").
- Set source_page to the label of the page the price was found on (e.g. "pricing").
- Return [] if none found.

opening_hours:
- Extract from any labeled page (most commonly the hours/contact page).
- Use short Finnish day abbreviations: Ma, Ti, Ke, To, Pe, La, Su.
- Times in 24h "HH:MM" format.
- Set source_page to the label of the page the hours were found on.
- Return [] if none found.

website_url:
- Look for the canonical URL in <link rel="canonical"> or <meta property="og:url"> in any HTML section.
- If neither is present, return "".

== OUTPUT RULES ==
- Respond ONLY with the JSON object. No markdown, no code fences, no explanation.
- All field KEYS must be in English exactly as specified.
- Extracted VALUES (price labels, day names, etc.) stay in the source language.
- If you genuinely find nothing for an array field, return an empty array [] — never invent data.`;
```

This prompt change requires `analyzeWithClaude` in `lib/branding/analyzer.ts` to be reshaped to: build and send a screenshot content block, parse the new `logos`/`colors` array shapes (replacing `logo_index`/single `colors` array), and validate the new per-entry fields (`type`, `role`, `source_page`) at runtime the same way existing fields are validated (see CR-02/WR-04 runtime-validation patterns already in the file).

</specifics>

<deferred>
## Deferred Ideas

- Frontend consumption of the new array-based `logos`/`colors` shape (multi-candidate picker UI) — Phase 48 scope (ONBOARD-14, ONBOARD-15), not this phase.
- `selected_background_color`/`selected_accent_color` being populated by user choice — Phase 48 scope; this phase only adds the columns.
- Full multi-page screenshot capture (all 3-5 crawled pages, not just homepage) — explicitly scoped down to homepage-only per D-03; revisit only if homepage-only color extraction proves insufficient in practice.
- Re-running analysis for existing approved businesses after the BRDDB-05 migration — not required; backfill (D-15) preserves existing data without forcing re-analysis.

</deferred>

---

*Phase: 47-Skeema & monisivuinen scraper-putki*
*Context gathered: 2026-06-16*
