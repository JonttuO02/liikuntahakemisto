# Phase 47: Skeema & monisivuinen scraper-putki - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 47-skeema-monisivuinen-scraper-putki
**Areas discussed:** Branding analysis prompt rework, homepage screenshot capture, scope of headless browser usage

---

## Branding analysis prompt rework

| Option | Description | Selected |
|--------|-------------|----------|
| Iterate on the prompt directly in this session | Discuss specific phrasing/structure changes interactively in the terminal | |
| Take the current prompt to claude.ai externally, improve it there, bring back the result | User copies current `BRANDING_ANALYSIS_PROMPT`, explains observed failures (incomplete color extraction) to Claude externally, returns with a finished replacement | ✓ |

**User's choice:** User asked for a copy of the current `lib/branding/prompt.ts` content, took it to claude.ai externally along with a description of what went wrong with color extraction in the v2.1 version, and returned with a complete rewritten prompt to adopt as-is.
**Notes:** The rewritten prompt assumes the scraper now sends full-page screenshots in addition to logo candidate images and labeled multi-page HTML — this single artifact implicitly answered most of the "what should the multi-page prompt structure look like" gray area, so no separate structured discussion was held for prompt field-by-field design. User explicit instruction: "Isnt these things told good enough in the prompt I sent? I want you to use it." — meaning further structured questioning about prompt internals was declined in favor of adopting the artifact directly.

---

## Homepage screenshot capture / headless browser scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keep scraping fetch-only, no screenshots, no Playwright | Preserves original REQUIREMENTS.md "Out of Scope" decision; color accuracy stays limited to CSS/meta-tag regex parsing | |
| Add full Playwright-based screenshot capture for all crawled subpages | Maximizes visual fidelity for every page, but multiplies serverless execution time/cost across 3-5 pages | |
| Add Playwright screenshot capture for the homepage only, contingent on a Vercel Pro upgrade | Captures the single highest-value screenshot (color/logo source) while keeping execution budget bounded; requires the user to upgrade Vercel plan since Hobby's 10s `waitUntil` budget was the original reason headless browsers were excluded | ✓ |

**User's choice:** Homepage-only screenshot via self-hosted Playwright + `@sparticuz/chromium`, contingent on upgrading to Vercel Pro.
**Notes:** User initially asked why I (Claude) was resistant to enabling screenshot capture, since the externally-drafted prompt kept recommending it. I explained the underlying constraint was the original Hobby-tier `waitUntil` 10-second execution budget noted in REQUIREMENTS.md's Out of Scope table. User responded directly: "Vercel Pro -tason päivitys, ja screenshot vain etusivulle" (Vercel Pro upgrade, and screenshot for the homepage only) — resolving the conflict by removing the constraint (plan upgrade) rather than working around it in code.

---

## Claude's Discretion

- Exact gallery image count cap for SCRAP-09 extraction.
- Exact dimension/size thresholds for filtering noise images (icons, spacers) out of gallery extraction.
- Whether `paikka_id` is passed to `analyze-website` route via request body or query param.

## Deferred Ideas

- Frontend consumption of the new array-based `logos`/`colors` shape (multi-candidate picker UI) — explicitly Phase 48 scope (ONBOARD-14, ONBOARD-15).
- `selected_background_color`/`selected_accent_color` being populated by user choice — Phase 48 scope; this phase only adds the columns.
- Full multi-page screenshot capture (all 3-5 crawled pages) — considered and explicitly scoped down to homepage-only.
- Forcing re-analysis of existing approved businesses after the BRDDB-05 migration — not required; backfill preserves existing data without forcing re-analysis.
