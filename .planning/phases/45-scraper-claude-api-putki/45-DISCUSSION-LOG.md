# Phase 45: Scraper & Claude API -putki - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 45-Scraper & Claude API -putki
**Areas discussed:** Logo URL persistence, Request/response pattern, Claude model & SDK

---

## Logo URL persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Source URL (pass-through) | Store original logo URL from website. Simple, no Storage needed. URL may expire. | |
| Upload to Supabase Storage | Convert to PNG, upload to business-media bucket, store public Storage URL. Durable. | ✓ |
| Store as data URL | Base64 in TEXT column. Bad practice — too heavy. | |

**User's choice:** Upload to Supabase Storage

**Storage setup follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| Create bucket in Phase 45 | Add migration to create business-media bucket. Self-contained phase. | ✓ |
| Assume bucket exists | Rely on manual bucket creation. Risk: breaks on fresh clone. | |

**User's choice:** Create bucket in Phase 45

---

## Request/response pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Async fire-and-forget + polling | POST returns 200 immediately, pipeline runs via waitUntil, Phase 46 polls GET endpoint. | ✓ |
| Synchronous — wait for result | Route waits for full pipeline, returns result. Risks Vercel 10s timeout. | |

**User's choice:** Async fire-and-forget + polling

**Background mechanism follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| waitUntil from @vercel/functions | Official Vercel mechanism. Registers promise to complete after response. Clean. | ✓ |
| Detached Promise (no-await) | No new package. Unofficially supported. May be killed on cold start. | |

**User's choice:** waitUntil (add @vercel/functions package)

---

## Claude model & SDK

| Option | Description | Selected |
|--------|-------------|----------|
| claude-haiku-4-5 | Fastest, cheapest (~15x cheaper than Opus). Good vision quality for logo/color tasks. ~3–5s pipeline. | ✓ |
| claude-sonnet-4-6 | Toteutusohje default. More capable, 3–5x Haiku cost. ~10–20s pipeline. | |
| claude-opus-4-8 | Most powerful, ~15–20x Haiku cost. Overkill for logo/color extraction. | |

**User's choice:** claude-haiku-4-5

**SDK follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| @anthropic-ai/sdk | Official TypeScript SDK. Type-safe, handles vision content arrays cleanly. | ✓ |
| Raw fetch to api.anthropic.com | No new dependency. Matches existing Google Places pattern. More verbose. | |

**User's choice:** @anthropic-ai/sdk

**Image size follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| 512px max dimension | Good balance of detail vs. token cost. Claude identifies logos reliably at this size. | ✓ |
| Original size (no resize) | Maximum detail. HiDPI images can be 1200x630+ — wasteful. | |

**User's choice:** 512px max dimension

---

## Claude's Discretion

- Scraper timeout values: 10s for HTML fetch, 5s per external CSS file — Claude chose these as reasonable defaults
- Max logo candidates: 5 — Claude chose based on token economy
- Max external CSS files: 3 — Claude chose to limit parallel fetch scope

## Deferred Ideas

- Logo manual replacement / color correction: Phase 46 scope (esikatselussa muokkaus)
- Re-analysis after onboarding completion (edit flow): deferred post-v2.1
- Deep nested CSS variable parsing: deferred — theme-color + :root top-level is sufficient
